/**
 * nTZS payments API — collections, disbursements, bills, treasury.
 *
 * Capabilities used: `collections`, `disbursements`, `treasury`, spend.
 * The `wallets` capability is deliberately NOT used: nothing here provisions
 * or references an end-user wallet.
 *
 * Mounted at /api/ntzs.
 *
 * Money-moving routes require an Idempotency-Key (header or body) because a
 * retry without one can pay twice. Reads do not.
 */
const express = require('express');
const { csrfProtection } = require('../middleware/csrf');
const { requireAuth } = require('../middleware/auth');
const { requireRole, ROLES } = require('../middleware/roleCheck');

const FINANCE_ROLES = [ROLES.SUPERADMIN, ROLES.FINANCE_ADMIN, ROLES.MARKETPLACE_ADMIN];

module.exports = (pool) => {
  const router = express.Router();
  const ntzsPayments = require('../services/ntzsPayments')(pool);
  const treasury = require('../services/ntzsTreasury')(pool);

  function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  }

  /** Translate a service error into the documented error shape. */
  function sendResult(res, result) {
    if (result.success === false) {
      return res.status(result.status || 400).json({
        success: false,
        code: result.code || null,
        message: result.message,
        ...(result.retry ? { retry: result.retry } : {}),
        ...(result.collection ? { collection: result.collection } : {}),
        ...(result.payout ? { payout: result.payout } : {}),
        ...(result.bill ? { bill: result.bill } : {}),
      });
    }
    return res.json(result);
  }

  /** Run a service call and map any thrown error onto its HTTP status. */
  async function run(res, fn) {
    try {
      return sendResult(res, await fn());
    } catch (err) {
      const mapped = ntzsPayments.toErrorResponse(err);
      return res.status(mapped.status).json(mapped.body);
    }
  }

  function idempotencyKey(req) {
    return req.get('Idempotency-Key') || req.body?.idempotencyKey || req.body?.idempotency_key || undefined;
  }

  // -------------------------------------------------------------------------
  // Collections — money in, payer → partner treasury
  // -------------------------------------------------------------------------

  // POST /api/ntzs/collections  { amountTzs, phoneNumber, paymentMethod? }
  router.post(
    '/collections',
    csrfProtection,
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await run(res, () =>
        ntzsPayments.createCollection(pool, req.user, {
          ...req.body,
          idempotencyKey: idempotencyKey(req),
        })
      );
      return result;
    })
  );

  // GET /api/ntzs/collections
  router.get(
    '/collections',
    requireAuth,
    asyncHandler(async (req, res) => {
      const collections = await ntzsPayments.listCollections(pool, {
        limit: req.query.limit,
        offset: req.query.offset,
        status: req.query.status,
        customerId: req.query.customerId,
      });
      res.json({ success: true, collections });
    })
  );

  // GET /api/ntzs/collections/:id
  router.get(
    '/collections/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const collection = await ntzsPayments.getCollection(pool, req.params.id);
      if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });
      res.json({ success: true, collection });
    })
  );

  // POST /api/ntzs/collections/:id/sync — read the collection back from nTZS.
  // This is the answer to a 502 initiation_uncertain, not a retry.
  router.post(
    '/collections/:id/sync',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await run(res, () => ntzsPayments.syncCollection(pool, req.params.id));
      return result;
    })
  );

  // -------------------------------------------------------------------------
  // Lookups — confirm the destination before paying (fail-soft upstream)
  // -------------------------------------------------------------------------

  // POST /api/ntzs/lookup/recipient-name  { phoneNumber }
  router.post(
    '/lookup/recipient-name',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const data = await ntzsPayments.lookupRecipientName(req.body);
        res.json({
          success: true,
          phone: data.phone || req.body.phoneNumber,
          network: data.network || null,
          // A null name is normal: show the raw number and continue.
          name: data.name ?? null,
          confirmed: Boolean(data.name),
        });
      } catch (err) {
        const mapped = ntzsPayments.toErrorResponse(err);
        res.status(mapped.status).json(mapped.body);
      }
    })
  );

  // POST /api/ntzs/lookup/merchant-name  { kind, payNumber | utilityCode, amountTzs? }
  router.post(
    '/lookup/merchant-name',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const data = await ntzsPayments.lookupMerchantName(req.body);
        res.json({
          success: true,
          kind: data.kind || req.body.kind,
          target: data.target || req.body.payNumber || req.body.utilityCode || null,
          name: data.name ?? null,
          reason: data.reason ?? null,
          confirmed: Boolean(data.name),
        });
      } catch (err) {
        const mapped = ntzsPayments.toErrorResponse(err);
        res.status(mapped.status).json(mapped.body);
      }
    })
  );

  // POST /api/ntzs/lookup/qr  { payload }
  router.post(
    '/lookup/qr',
    requireAuth,
    asyncHandler(async (req, res) => {
      try {
        const data = await ntzsPayments.lookupQr(req.body);
        res.json({ success: true, destination: data });
      } catch (err) {
        const mapped = ntzsPayments.toErrorResponse(err);
        res.status(mapped.status).json(mapped.body);
      }
    })
  );

  // -------------------------------------------------------------------------
  // Disbursements — money out, treasury → phone or bank
  // -------------------------------------------------------------------------

  // POST /api/ntzs/payouts/quote  { amountTzs, phoneNumber | bankCode + accountNumber }
  // Returns the quote verbatim. Show recipientName and totalFeeTzs, then pass
  // quoteId to POST /payouts. A null quoteId means insufficient balance.
  router.post(
    '/payouts/quote',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await run(res, () => ntzsPayments.quotePayout(pool, req.body));
      return result;
    })
  );

  // POST /api/ntzs/payouts  { quoteId, amountTzs, phoneNumber | bankCode + accountNumber }
  router.post(
    '/payouts',
    csrfProtection,
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      const result = await run(res, () =>
        ntzsPayments.createPayout(pool, req.user, { ...req.body, idempotencyKey: idempotencyKey(req) })
      );
      return result;
    })
  );

  // POST /api/ntzs/payouts/bulk  { items: [...] } — a batch run, one key per item.
  router.post(
    '/payouts/bulk',
    csrfProtection,
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      const result = await run(res, () =>
        ntzsPayments.runBulkPayout(pool, req.user, { ...req.body, idempotencyKey: idempotencyKey(req) })
      );
      return result;
    })
  );

  router.get(
    '/payouts',
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      const payouts = await ntzsPayments.listPayouts(pool, {
        limit: req.query.limit,
        offset: req.query.offset,
        status: req.query.status,
      });
      res.json({ success: true, payouts });
    })
  );

  router.get(
    '/payouts/:id',
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      const payout = await ntzsPayments.getPayout(pool, req.params.id);
      if (!payout) return res.status(404).json({ success: false, message: 'Payout not found' });
      res.json({ success: true, payout });
    })
  );

  router.post(
    '/payouts/:id/sync',
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      const result = await run(res, () => ntzsPayments.syncPayout(pool, req.params.id));
      return result;
    })
  );

  // -------------------------------------------------------------------------
  // Bills and tills
  // -------------------------------------------------------------------------

  // GET /api/ntzs/billers — the catalogue. A fee applies to every payment.
  router.get(
    '/billers',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await run(res, () =>
        ntzsPayments.listBillers(pool, { force: req.query.refresh === '1' })
      );
      return result;
    })
  );

  // POST /api/ntzs/bills/quote  { kind, amountTzs, payNumber | utilityCode, utilityRef? }
  router.post(
    '/bills/quote',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await run(res, () => ntzsPayments.quoteBill(pool, req.body));
      return result;
    })
  );

  // POST /api/ntzs/bills  { quoteId, network? }
  // Persist the returned reference — it is what the biller recognises.
  router.post(
    '/bills',
    csrfProtection,
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await run(res, () =>
        ntzsPayments.createBill(pool, req.user, { ...req.body, idempotencyKey: idempotencyKey(req) })
      );
      return result;
    })
  );

  router.get(
    '/bills',
    requireAuth,
    asyncHandler(async (req, res) => {
      const bills = await ntzsPayments.listBills(pool, {
        limit: req.query.limit,
        offset: req.query.offset,
        status: req.query.status,
      });
      res.json({ success: true, bills });
    })
  );

  router.get(
    '/bills/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const bill = await ntzsPayments.getBill(pool, req.params.id);
      if (!bill) return res.status(404).json({ success: false, message: 'Bill payment not found' });
      res.json({ success: true, bill });
    })
  );

  router.post(
    '/bills/:id/sync',
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await run(res, () => ntzsPayments.syncBill(pool, req.params.id));
      return result;
    })
  );

  // -------------------------------------------------------------------------
  // Treasury
  // -------------------------------------------------------------------------

  // GET /api/ntzs/config — is this deployment able to move money at all?
  router.get(
    '/config',
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      res.json({ success: true, config: require('../services/ntzs/configCheck').checkConfiguration() });
    })
  );

  // GET /api/ntzs/treasury — balances for every account.
  router.get(
    '/treasury',
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      const accounts = await treasury.listAccounts(pool);
      res.json({ success: true, accounts });
    })
  );

  // GET /api/ntzs/treasury/ledger?accountId=&limit=
  router.get(
    '/treasury/ledger',
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      const entries = await treasury.listLedger(pool, {
        accountId: req.query.accountId || null,
        limit: req.query.limit,
        offset: req.query.offset,
        entryType: req.query.entryType || null,
      });
      res.json({ success: true, entries });
    })
  );

  // POST /api/ntzs/treasury/sub-accounts  { label, fundingSourceId?, openingBalanceTzs? }
  router.post(
    '/treasury/sub-accounts',
    csrfProtection,
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      try {
        const account = await treasury.withTransaction(pool, (conn) => treasury.createSubAccount(conn, req.body));
        res.json({ success: true, account });
      } catch (err) {
        const mapped = ntzsPayments.toErrorResponse(err);
        res.status(mapped.status).json(mapped.body);
      }
    })
  );

  // GET /api/ntzs/treasury/supply — platform supply context (not a statement).
  router.get(
    '/treasury/supply',
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      try {
        const supply = await ntzsPayments.getSupply();
        res.json({ success: true, supply });
      } catch (err) {
        const mapped = ntzsPayments.toErrorResponse(err);
        res.status(mapped.status).json(mapped.body);
      }
    })
  );

  // -------------------------------------------------------------------------
  // Operations
  // -------------------------------------------------------------------------

  // POST /api/ntzs/reconcile — read every in-flight movement back from nTZS.
  router.post(
    '/reconcile',
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      const result = await run(res, () => ntzsPayments.reconcile(pool, { limit: req.body?.limit }));
      return result;
    })
  );

  // Test-mode control. Test keys only; a live key answers test_mode_only.
  router.post(
    '/testmode/:action',
    requireAuth,
    requireRole(...FINANCE_ROLES),
    asyncHandler(async (req, res) => {
      const result = await run(res, () =>
        ntzsPayments.testMode(pool, req.params.action, { userId: req.body?.userId })
      );
      return result;
    })
  );

  // POST /api/ntzs/webhooks/ntzs — inbound events. Signed with HMAC-SHA256 over
  // `timestamp.body`. Never auth'd by session: it is the partner calling us.
  router.post(
    '/webhooks/ntzs',
    asyncHandler(async (req, res) => {
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
      const result = await ntzsPayments.handleWebhook(pool, payload, req.headers, rawBody);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, message: result.message });
      }
      res.json({ success: true, ...result });
    })
  );

  return router;
};