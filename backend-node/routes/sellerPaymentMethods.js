const express = require('express');
const { csrfProtection } = require('../middleware/csrf');
const { validateRequired } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

/**
 * Seller payment methods routes.
 *
 * Allows sellers to manage their payment destination methods (mobile money,
 * bank transfer, lipa namba) that buyers pay directly into.
 *
 * Base: /api/seller/payment-methods
 */
module.exports = (pool) => {
  const router = express.Router();

  function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  }

  // GET /api/seller/payment-methods
  // List the seller's configured payment methods.
  router.get(
    '/',
    requireAuth,
    requireRole('seller', 'superadmin', 'marketplace_admin', 'vendor_admin'),
    asyncHandler(async (req, res) => {
      const [rows] = await pool.query(
        `SELECT id, seller_id, payment_method, provider, account_name, phone_number,
                bank_name, bank_account_number, lipa_number,
                is_enabled, is_default, created_at, updated_at
         FROM seller_payment_methods
         WHERE seller_id = ?
         ORDER BY is_default DESC, created_at DESC`,
        [req.user.customerId]
      );
      // Mask sensitive fields for display.
      const methods = rows.map((m) => ({
        id: m.id,
        seller_id: m.seller_id,
        payment_method: m.payment_method,
        provider: m.provider,
        account_name: m.account_name,
        phone_number: m.phone_number,
        bank_name: m.bank_name,
        bank_account_number: m.bank_account_number
          ? m.bank_account_number.replace(/^(\d{0,4})\d+/, '$1****')
          : null,
        lipa_number: m.lipa_number
          ? m.lipa_number.replace(/^(\d{0,4})\d+/, '$1****')
          : null,
        is_enabled: Boolean(m.is_enabled),
        is_default: Boolean(m.is_default),
        created_at: m.created_at,
        updated_at: m.updated_at,
      }));
      res.json({ success: true, methods });
    })
  );

  // GET /api/seller/payment-methods/default
  // Get the seller's default (or first enabled) payment method.
  router.get(
    '/default',
    requireAuth,
    requireRole('seller', 'superadmin', 'marketplace_admin', 'vendor_admin'),
    asyncHandler(async (req, res) => {
      const [rows] = await pool.query(
        `SELECT id, seller_id, payment_method, provider, account_name, phone_number,
                bank_name, bank_account_number, lipa_number,
                is_enabled, is_default, created_at, updated_at
         FROM seller_payment_methods
         WHERE seller_id = ? AND is_enabled = 1
         ORDER BY is_default DESC, created_at ASC
         LIMIT 1`,
        [req.user.customerId]
      );
      if (!rows.length) {
        return res.json({ success: true, method: null });
      }
      const m = rows[0];
      const method = {
        id: m.id,
        seller_id: m.seller_id,
        payment_method: m.payment_method,
        provider: m.provider,
        account_name: m.account_name,
        phone_number: m.phone_number,
        bank_name: m.bank_name,
        bank_account_number: m.bank_account_number,
        lipa_number: m.lipa_number,
        is_enabled: Boolean(m.is_enabled),
        is_default: Boolean(m.is_default),
        created_at: m.created_at,
        updated_at: m.updated_at,
      };
      res.json({ success: true, method });
    })
  );

  // POST /api/seller/payment-methods
  // Create a new payment method for the seller.
  router.post(
    '/',
    csrfProtection,
    requireAuth,
    requireRole('seller', 'superadmin', 'marketplace_admin', 'vendor_admin'),
    asyncHandler(async (req, res) => {
      const {
        payment_method, provider, account_name, phone_number,
        bank_name, bank_account_number, lipa_number, is_enabled, is_default,
      } = req.body;

      if (!payment_method) {
        return res.status(400).json({ success: false, message: 'payment_method is required' });
      }

      const allowedMethods = ['mobile_money', 'bank_transfer', 'lipa_namba'];
      if (!allowedMethods.includes(payment_method)) {
        return res.status(400).json({
          success: false,
          message: `Invalid payment_method. Must be one of: ${allowedMethods.join(', ')}`,
        });
      }

      let conn;
      try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // If this is the first enabled method or is_default is explicitly true,
        // clear other defaults for this seller.
        const isDefault = Boolean(is_default);
        if (isDefault) {
          await conn.query(
            'UPDATE seller_payment_methods SET is_default = FALSE WHERE seller_id = ?',
            [req.user.customerId]
          );
        }

        const [ins] = await conn.query(
          `INSERT INTO seller_payment_methods
             (seller_id, payment_method, provider, account_name, phone_number,
              bank_name, bank_account_number, lipa_number, is_enabled, is_default)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.customerId,
            payment_method,
            provider || null,
            account_name || null,
            phone_number || null,
            bank_name || null,
            bank_account_number || null,
            lipa_number || null,
            is_enabled !== false ? 1 : 0,
            isDefault ? 1 : 0,
          ]
        );

        await conn.commit();
        res.json({ success: true, message: 'Payment method added', id: ins.insertId });
      } catch (err) {
        if (conn) try { await conn.rollback(); } catch (_) {}
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ success: false, message: 'Default payment method already exists' });
        }
        throw err;
      } finally {
        if (conn) conn.release();
      }
    })
  );

  // PUT /api/seller/payment-methods/:id
  // Update a payment method.
  router.put(
    '/:id',
    csrfProtection,
    requireAuth,
    requireRole('seller', 'superadmin', 'marketplace_admin', 'vendor_admin'),
    asyncHandler(async (req, res) => {
      const paymentMethodId = parseInt(req.params.id, 10);
      const {
        provider, account_name, phone_number,
        bank_name, bank_account_number, lipa_number, is_enabled, is_default,
      } = req.body;

      const [existing] = await pool.query(
        'SELECT id FROM seller_payment_methods WHERE id = ? AND seller_id = ?',
        [paymentMethodId, req.user.customerId]
      );
      if (!existing.length) {
        return res.status(404).json({ success: false, message: 'Payment method not found' });
      }

      let conn;
      try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const setClauses = [];
        const setValues = [];
        if (provider !== undefined) { setClauses.push('provider = ?'); setValues.push(provider); }
        if (account_name !== undefined) { setClauses.push('account_name = ?'); setValues.push(account_name); }
        if (phone_number !== undefined) { setClauses.push('phone_number = ?'); setValues.push(phone_number); }
        if (bank_name !== undefined) { setClauses.push('bank_name = ?'); setValues.push(bank_name); }
        if (bank_account_number !== undefined) { setClauses.push('bank_account_number = ?'); setValues.push(bank_account_number); }
        if (lipa_number !== undefined) { setClauses.push('lipa_number = ?'); setValues.push(lipa_number); }
        if (is_enabled !== undefined) { setClauses.push('is_enabled = ?'); setValues.push(is_enabled ? 1 : 0); }

        if (is_default === true) {
          await conn.query(
            'UPDATE seller_payment_methods SET is_default = FALSE WHERE seller_id = ? AND id != ?',
            [req.user.customerId, paymentMethodId]
          );
          setClauses.push('is_default = ?');
          setValues.push(1);
        } else if (is_default === false) {
          setClauses.push('is_default = ?');
          setValues.push(0);
        }

        if (setClauses.length > 0) {
          setValues.push(paymentMethodId);
          await conn.query(
            `UPDATE seller_payment_methods SET ${setClauses.join(', ')} WHERE id = ? AND seller_id = ?`,
            [...setValues, paymentMethodId]
          );
        }

        await conn.commit();
        res.json({ success: true, message: 'Payment method updated' });
      } catch (err) {
        if (conn) try { await conn.rollback(); } catch (_) {}
        throw err;
      } finally {
        if (conn) conn.release();
      }
    })
  );

  // DELETE /api/seller/payment-methods/:id
  // Delete a payment method (cannot delete the last one).
  router.delete(
    '/:id',
    csrfProtection,
    requireAuth,
    requireRole('seller', 'superadmin', 'marketplace_admin', 'vendor_admin'),
    asyncHandler(async (req, res) => {
      const paymentMethodId = parseInt(req.params.id, 10);

      const [count] = await pool.query(
        'SELECT COUNT(*) as total FROM seller_payment_methods WHERE seller_id = ?',
        [req.user.customerId]
      );
      if (count.total <= 1) {
        return res.status(400).json({ success: false, message: 'You must keep at least one payment method' });
      }

      const [result] = await pool.query(
        'DELETE FROM seller_payment_methods WHERE id = ? AND seller_id = ?',
        [paymentMethodId, req.user.customerId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Payment method not found' });
      }

      res.json({ success: true, message: 'Payment method deleted' });
    })
  );

  return router;
};
