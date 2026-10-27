/**
 * nTZS partner API — collections, disbursements, bills and treasury.
 *
 * Mirrors backend-node/routes/ntzs.js. Three rules this client exists to hold:
 *
 *  1. Whole shillings only. Amounts are integers; a decimal is a bug, not a
 *     rounding opportunity.
 *  2. Quotes are mandatory where they exist. Price it, show the recipient name
 *     and the fee, then execute with the quoteId. Never compute a fee here.
 *  3. A money-moving call always carries an Idempotency-Key. A 502 may mean the
 *     payment was taken — read the resource back instead of retrying blindly.
 *
 * Capabilities: collections, disbursements, treasury, spend. No `wallets`: there
 * is no per-customer nTZS account, so collections land in the partner treasury
 * and payouts are funded from a treasury account.
 */
import api from './api';

/** Stable key per logical operation — the same retry must reuse it. */
function idempotencyKey(scope, seed) {
  return `${scope}:${seed}`;
}

function newKey(scope) {
  const random =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return idempotencyKey(scope, random);
}

/**
 * POST with the CSRF header the backend expects, plus an optional
 * Idempotency-Key. Tokens are single-use, so one is fetched per call.
 */
async function post(endpoint, body = {}, { key } = {}) {
  const { data } = await api.getCSRFToken();
  return api.request(endpoint, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': data?.csrf_token || '',
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    body,
  });
}

export const ntzs = {
  // -------------------------------------------------------------------------
  // Collections — money in, payer → partner treasury
  // -------------------------------------------------------------------------

  /** Minimum 500 TZS. The payer gets a prompt on their phone. */
  async createCollection({ amountTzs, phoneNumber, paymentMethod = 'mobile_money', orderId, key }) {
    return post(
      '/ntzs/collections',
      { amountTzs, phoneNumber, paymentMethod, externalReference: orderId },
      { key: key || newKey('collection') }
    );
  },

  async getCollection(id) {
    return api.request(`/ntzs/collections/${id}`);
  },

  /**
   * Read a collection back from the rail. This — not a retry — is the answer to
   * a 202/502 `initiation_uncertain`.
   */
  async syncCollection(id) {
    return post(`/ntzs/collections/${id}/sync`);
  },

  async listCollections({ status, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.set('status', status);
    return api.request(`/ntzs/collections?${params.toString()}`);
  },

  // -------------------------------------------------------------------------
  // Lookups — confirm before you pay. Fail-soft: name === null is normal.
  // -------------------------------------------------------------------------

  /** `Sending to: JOHN DOE`. Never block on a null name. */
  async lookupRecipientName(phoneNumber) {
    return post('/ntzs/lookup/recipient-name', { phoneNumber });
  },

  /** Bill validation is amount-aware — pass amountTzs when known. */
  async lookupMerchantName({ kind = 'bill', payNumber, utilityCode, utilityRef, amountTzs }) {
    return post('/ntzs/lookup/merchant-name', { kind, payNumber, utilityCode, utilityRef, amountTzs });
  },

  /** Resolve a scanned TANQR payload. */
  async lookupQr(payload) {
    return post('/ntzs/lookup/qr', { payload });
  },

  // -------------------------------------------------------------------------
  // Disbursements — money out, treasury → phone or bank
  // -------------------------------------------------------------------------

  /**
   * Price a payout. amountTzs is NET to the recipient, minimum 5,000 TZS.
   * Show `recipientName` and `totalFeeTzs` before the user confirms; a null
   * `quoteId` means the balance is insufficient — stop.
   */
  async quotePayout({ amountTzs, phoneNumber, bankCode, accountNumber }) {
    return api.request('/ntzs/payouts/quote', {
      method: 'POST',
      body: { amountTzs, phoneNumber, bankCode, accountNumber },
    });
  },

  /** Execute against the quote. Terms must match it exactly. */
  async createPayout({ quoteId, amountTzs, phoneNumber, bankCode, accountNumber, orderId, key }) {
    return post(
      '/ntzs/payouts',
      { quoteId, amountTzs, phoneNumber, bankCode, accountNumber, externalReference: orderId },
      { key: key || newKey('payout') }
    );
  },

  /** Bulk run. One idempotency key per item, derived from the run key. */
  async runBulkPayouts({ items, key, concurrency = 3 }) {
    return post('/ntzs/payouts/bulk', { items, concurrency }, { key: key || newKey('bulk') });
  },

  async getPayout(id) {
    return api.request(`/ntzs/payouts/${id}`);
  },

  async syncPayout(id) {
    return post(`/ntzs/payouts/${id}/sync`);
  },

  async listPayouts({ status, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.set('status', status);
    return api.request(`/ntzs/payouts?${params.toString()}`);
  },

  // -------------------------------------------------------------------------
  // Bills and tills — a fee applies to every payment
  // -------------------------------------------------------------------------

  async listBillers({ refresh = false } = {}) {
    return api.request(`/ntzs/billers${refresh ? '?refresh=1' : ''}`);
  },

  /**
   * Price a bill or till payment. Never render a biller as free, and never
   * compute the fee locally — it comes from the quote.
   */
  async quoteBill({ kind = 'bill', amountTzs, payNumber, utilityCode, utilityRef }) {
    return api.request('/ntzs/bills/quote', {
      method: 'POST',
      body: { kind, amountTzs, payNumber, utilityCode, utilityRef },
    });
  },

  /** Persist the returned reference — the biller recognises it. */
  async createBill({ quoteId, network, key }) {
    return post('/ntzs/bills', { quoteId, network }, { key: key || newKey('bill') });
  },

  async getBill(id) {
    return api.request(`/ntzs/bills/${id}`);
  },

  async syncBill(id) {
    return post(`/ntzs/bills/${id}/sync`);
  },

  async listBills({ status, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.set('status', status);
    return api.request(`/ntzs/bills?${params.toString()}`);
  },

  // -------------------------------------------------------------------------
  // Treasury — balances, sub-accounts and the audit ledger
  // -------------------------------------------------------------------------

  /** Whether this deployment can move money: live vs test key, missing holders. */
  async getConfigStatus() {
    return api.request('/ntzs/config');
  },

  async getTreasury() {
    return api.request('/ntzs/treasury');
  },

  async getTreasuryLedger({ accountId, entryType, limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (accountId) params.set('accountId', accountId);
    if (entryType) params.set('entryType', entryType);
    return api.request(`/ntzs/treasury/ledger?${params.toString()}`);
  },

  /** A sub-account is a labelled slice of the treasury with its own funding source. */
  async createSubAccount({ label, fundingSourceId, openingBalanceTzs }) {
    return post('/ntzs/treasury/sub-accounts', { label, fundingSourceId, openingBalanceTzs });
  },

  /** Platform supply context — not an account statement. */
  async getSupply() {
    return api.request('/ntzs/treasury/supply');
  },

  // -------------------------------------------------------------------------
  // Operations
  // -------------------------------------------------------------------------

  /** Read every in-flight movement back and settle it. */
  async reconcile() {
    return post('/ntzs/reconcile');
  },

  /**
   * Sandbox control: `state` | `advance` | `reset` | `approve`.
   * `advance` settles every pending simulated transaction immediately, which is
   * why the whole lifecycle can be built against a test key.
   */
  async testMode(action, { userId } = {}) {
    return post(`/ntzs/testmode/${action}`, { userId });
  },
};

export default ntzs;