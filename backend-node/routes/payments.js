const express = require('express');
const { csrfProtection } = require('../middleware/csrf');
const { validateRequired } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

module.exports = (pool) => {
  const router = express.Router();
  const payments = require('../services/payments')(pool);

  function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  }

  // POST /api/payments/checkout  { order_id, amount, method, idempotency_key, ... }
  router.post(
    '/checkout',
    csrfProtection,
    requireAuth,
    validateRequired(['order_id', 'amount', 'method', 'idempotency_key']),
    asyncHandler(async (req, res) => {
      const result = await payments.initPayment(pool, req.user, req.body);
      if (!result.success && result.status) {
        // Keep the machine code and retry policy: `retry: 'verify'` means the
        // outcome is unknown and the client must poll, not resend.
        return res.status(result.status).json({
          success: false,
          code: result.code || null,
          message: result.message,
          ...(result.retry ? { retry: result.retry } : {}),
          ...(result.payment_id ? { payment_id: result.payment_id } : {}),
        });
      }
      res.json(result);
    })
  );

  // GET /api/payments/:id/poll — query provider for updated payment status
  router.get(
    '/:id/poll',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await payments.pollPaymentStatus(pool, req.user, parseInt(req.params.id, 10));
      if (!result.success)
        return res.status(result.status).json({ success: false, message: result.message });
      res.json(result);
    })
  );

  // Saved payment methods (buyer cards / mobile-billing tokens). Defined before /:id.
  router.get(
    '/payment-methods',
    requireAuth,
    asyncHandler(async (req, res) => {
      const [rows] = await pool.query(
        'SELECT id, type, provider, account_label, account_number_masked, is_default, created_at FROM payment_methods WHERE customer_id = ? ORDER BY created_at DESC',
        [req.user.customerId]
      );
      res.json({ success: true, methods: rows });
    })
  );

  router.post(
    '/payment-methods',
    csrfProtection,
    requireAuth,
    validateRequired(['type']),
    asyncHandler(async (req, res) => {
      const { type, provider, account_label, account_number_masked, is_default } = req.body;
      if (is_default) {
        await pool.query('UPDATE payment_methods SET is_default = FALSE WHERE customer_id = ?', [
          req.user.customerId,
        ]);
      }
      const [result] = await pool.query(
        'INSERT INTO payment_methods (customer_id, type, provider, account_label, account_number_masked, is_default) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.user.customerId,
          type,
          provider || null,
          account_label || null,
          account_number_masked || null,
          is_default ? 1 : 0,
        ]
      );
      res.json({ success: true, id: result.insertId, message: 'Payment method saved' });
    })
  );

  // GET /api/payments/:id  status
  router.get(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await payments.getStatus(pool, parseInt(req.params.id, 10), req.user.customerId);
      if (!result.success)
        return res.status(result.status).json({ success: false, message: result.message });
      res.json(result);
    })
  );

  // GET /api/payments/:id/receipt
  router.get(
    '/:id/receipt',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await payments.getReceipt(pool, parseInt(req.params.id, 10));
      if (!result.success)
        return res.status(result.status).json({ success: false, message: result.message });
      res.json(result);
    })
  );

  // POST /api/payments/:id/approve-cod  (finance only)
  router.post(
    '/:id/approve-cod',
    csrfProtection,
    requireAuth,
    requireRole('finance_admin', 'superadmin', 'marketplace_admin'),
    asyncHandler(async (req, res) => {
      const result = await payments.approveCodPayment(pool, req.user, parseInt(req.params.id, 10));
      if (!result.success)
        return res.status(result.status).json({ success: false, message: result.message });
      res.json(result);
    })
  );

  // POST /api/payments/mark-submitted  — buyer marks payment as submitted
  router.post(
    '/mark-submitted',
    csrfProtection,
    requireAuth,
    requireRole('customer'),
    validateRequired(['order_id']),
    asyncHandler(async (req, res) => {
      const result = await payments.markBuyerPaymentSubmitted(pool, req.user, req.body);
      if (!result.success)
        return res.status(result.status).json({ success: false, message: result.message });
      res.json(result);
    })
  );

  // POST /api/payments/confirm  — seller confirms payment receipt
  router.post(
    '/confirm',
    csrfProtection,
    requireAuth,
    requireRole('seller', 'superadmin', 'marketplace_admin'),
    validateRequired(['order_id']),
    asyncHandler(async (req, res) => {
      const result = await payments.confirmSellerPayment(pool, req.user, req.body);
      if (!result.success)
        return res.status(result.status).json({ success: false, message: result.message });
      res.json(result);
    })
  );

  // POST /api/payments/reject  — seller rejects buyer's payment
  router.post(
    '/reject',
    csrfProtection,
    requireAuth,
    requireRole('seller', 'superadmin', 'marketplace_admin'),
    validateRequired(['order_id']),
    asyncHandler(async (req, res) => {
      const result = await payments.rejectSellerPayment(pool, req.user, req.body);
      if (!result.success)
        return res.status(result.status).json({ success: false, message: result.message });
      res.json(result);
    })
  );

  // Provider webhooks — raw body captured by server.js global middleware for
  // /webhook/ntzs so HMAC signature verification can use the exact bytes.
  router.post(
    '/webhook/:provider',
    asyncHandler(async (req, res) => {
      const provider = req.params.provider;
      const rawBody = req.rawBody || req.body;
      let payload;
      try {
        payload =
          typeof rawBody === 'string'
            ? JSON.parse(rawBody)
            : Buffer.isBuffer(rawBody)
              ? JSON.parse(rawBody.toString('utf8'))
              : rawBody;
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid JSON payload' });
      }
      const result = await payments.handleWebhook(pool, provider, payload, rawBody, req.headers);
      if (!result.ok)
        return res.status(result.status).json({ success: false, message: result.message });
      res.json(result);
    })
  );

  return router;
};
