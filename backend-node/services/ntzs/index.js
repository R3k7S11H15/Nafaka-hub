/**
 * nTZS Partner API client — collections, disbursements, treasury and bills.
 *
 * Deliberately scoped to the capabilities this integration holds:
 *   collections     — POST/GET   /v1/deposits
 *   disbursements   — POST       /v1/withdrawals/quote, /v1/withdrawals, GET /v1/withdrawals/{id}
 *   spend (bills)   — GET        /v1/spend/billers, POST /v1/spend/quote, /v1/spend, GET /v1/spend/{id}
 *   lookups         — POST       /v1/lookup/recipient-name, /v1/lookup/merchant-name, /v1/lookup/qr
 *   treasury        — local ledger (see services/ntzsTreasury.js); /v1/supply for supply context
 *   test mode       — POST       /v1/testmode/* so the whole lifecycle can run without money
 *
 * No `wallets` capability is used or required: collections omit `userId` so they
 * land in the partner treasury, and every outbound movement names a funding
 * source (NTZS_FUNDING_USER_ID) rather than a per-customer wallet.
 *
 * Contract: https://www.ntzs.co.tz/openapi.json
 */
const { NtzsError, parseErrorResponse } = require('./errors');
const {
  MIN_DEPOSIT_TZS,
  MIN_WITHDRAWAL_TZS,
  toTzsAmount,
  toPhoneNumber,
  toPayoutDestination,
  toIdempotencyKey,
  toEndUser,
} = require('./validate');

const DEFAULT_API_BASE = 'https://www.ntzs.co.tz/api/v1';
const DEFAULT_TIMEOUT_MS = 20000;

/** Read config lazily so tests and runtime env changes both work. */
function config() {
  return {
    apiBase: (process.env.NTZS_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, ''),
    apiKey: process.env.NTZS_API_KEY || '',
    timeoutMs: Number(process.env.NTZS_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
    // Optional: name a specific holder to fund from. When unset, outbound
    // movements pay from the partner treasury float (`fromTreasury: true`).
    fundingUserId: process.env.NTZS_FUNDING_USER_ID || '',
    // Optional: an explicit receiving holder for collections. As of API
    // v1.28.0 the treasury is tied to the API key, so a collection normally
    // names no holder and instead carries `endUser`; this is only for
    // deployments that still want an explicit one.
    collectionUserId: process.env.NTZS_COLLECTION_USER_ID || '',
  };
}

function getApiKey() {
  const { apiKey } = config();
  if (!apiKey || apiKey.includes('YOUR_') || apiKey.length < 20) {
    const err = new NtzsError({
      status: 500,
      code: 'configuration_error',
      message: 'NTZS_API_KEY is not configured',
      retry: 'no',
    });
    throw err;
  }
  return apiKey;
}

/**
 * Resolve the funding source for an outbound movement.
 *
 * nTZS accepts two: a `userId` whose balance pays, or `fromTreasury: true` to
 * pay from the partner treasury float "no per-user wallet needed". The treasury
 * is the default here, because this integration holds no `wallets` capability
 * and therefore has no end-user ids to name. Verified live: with
 * `fromTreasury: true` both `/withdrawals/quote` and `/spend/quote` price
 * successfully, while a `userId`-only request is refused with
 * `funding_source_required`.
 *
 * A configured NTZS_FUNDING_USER_ID still wins, for deployments that fund from
 * a named holder.
 */
function resolveFunding(explicit) {
  const value = explicit || config().fundingUserId;
  if (value) return { userId: String(value) };
  return { fromTreasury: true };
}

/**
 * Perform one nTZS API call.
 *
 * @throws {NtzsError} on any non-2xx response, normalized across all three
 *   error shapes.
 */
async function request(method, path, { body, idempotencyKey, timeoutMs, apiKey } = {}) {
  const cfg = config();
  const key = apiKey || getApiKey();
  const url = `${cfg.apiBase}${path}`;
  const timeout = Number(timeoutMs || cfg.timeoutMs);

  const headers = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    // A transport failure leaves the outcome unknown: it may have been taken.
    throw new NtzsError({
      status: 502,
      code: 'network_error',
      message: err.name === 'AbortError' ? `nTZS request timed out after ${timeout}ms` : err.message,
      retry: 'verify',
    });
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  if (typeof res.text === 'function') {
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
  } else if (typeof res.json === 'function') {
    // Tolerate a json-only response object (some mocks and older clients).
    data = await res.json();
  }

  if (!res.ok) throw parseErrorResponse(res.status, data, res.headers);
  return data ?? {};
}

// ---------------------------------------------------------------------------
// Collections — money in (payer → partner treasury)
// ---------------------------------------------------------------------------

/**
 * Collect funds from a payer.
 *
 * `userId` names the nTZS holder that receives the money. It is only sent when
 * one is configured (NTZS_COLLECTION_USER_ID, the partner treasury holder):
 * per the spec it is optional and omission means "collect into the treasury",
 * while the current deployment rejects an absent userId. Either way this is a
 * treasury-level holder — no end-user wallet is involved, so the `wallets`
 * capability is not needed.
 */
async function createDeposit(
  {
    amountTzs,
    phoneNumber,
    paymentMethod = 'mobile_money',
    bankAccountNumber,
    externalReference,
    userId,
    endUser,
  } = {},
  idempotencyKey
) {
  const amount = toTzsAmount(amountTzs, { min: MIN_DEPOSIT_TZS });
  const payload = { amountTzs: amount, paymentMethod };

  // v1.28.0: the treasury is tied to the API key, so a collection no longer
  // names a receiving holder. It names the end user instead, and the funds land
  // in the platform wallet. `userId` is accepted only for deployments that
  // still require an explicit receiving holder.
  const receivingUser = userId || config().collectionUserId;
  if (receivingUser) payload.userId = String(receivingUser);
  else if (endUser) payload.endUser = toEndUser(endUser);

  if (paymentMethod === 'mobile_money' || paymentMethod === 'lipa_namba') {
    payload.phoneNumber = toPhoneNumber(phoneNumber);
  }
  if (paymentMethod === 'bank_transfer') {
    if (!phoneNumber && !bankAccountNumber) {
      throw new NtzsError({
        status: 400,
        code: 'phone_required',
        message: 'A payer phone or account number is required for a bank transfer',
        retry: 'no',
      });
    }
    payload.phoneNumber = toPhoneNumber(phoneNumber || bankAccountNumber);
  }
  if (externalReference) payload.externalReference = String(externalReference);

  try {
    return await request('POST', '/deposits', {
      body: payload,
      idempotencyKey: toIdempotencyKey(idempotencyKey),
    });
  } catch (err) {
    /*
     * nTZS rejects a receiving holder it does not recognise as 404 "User not
     * found", or as an opaque 5xx for some values. Both mean the same thing and
     * neither is retryable, so both collapse to one code. This path is
     * finance-only, so naming the offending value is useful here.
     *
     * `initiation_uncertain` is left alone: that 502 means the collection may
     * have landed, so it stays a verify outcome rather than becoming a config
     * error that invites a retry into a double charge.
     */
    const detail = String(err.message || '').toLowerCase();

    /*
     * Omitting `userId` is the documented treasury path. A deployment that
     * rejects it answers 400 "userId and amountTzs are required" — name that
     * plainly rather than surfacing a bare validation sentence.
     */
    if (
      !receivingUser &&
      err instanceof NtzsError &&
      err.status === 400 &&
      (detail.includes('userid') || err.code === 'missing_required_fields')
    ) {
      throw new NtzsError({
        status: 503,
        code: 'collection_holder_required',
        message:
          'This nTZS deployment requires a receiving userId. Set NTZS_COLLECTION_USER_ID to the holder user id issued for this account.',
        retry: 'no',
      });
    }

    const holderUnknown =
      receivingUser &&
      err instanceof NtzsError &&
      err.code !== 'initiation_uncertain' &&
      (err.status === 404 || detail.includes('user not found') || err.status >= 500);

    if (holderUnknown) {
      throw new NtzsError({
        status: 502,
        code: 'collection_holder_unknown',
        message: `The configured collection holder (NTZS_COLLECTION_USER_ID = ${receivingUser}) was rejected by nTZS. A holder must be a user id nTZS issued, not a locally configured value.`,
        retry: 'no',
      });
    }
    throw err;
  }
}

/** Read a deposit. Also used to resolve a 502 initiation_uncertain outcome. */
async function getDeposit(id) {
  return request('GET', `/deposits/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------------
// Disbursements — money out (treasury → phone or bank)
// ---------------------------------------------------------------------------

/**
 * Price a payout. `amountTzs` is NET to the recipient; the quote returns the
 * fee and the total. Never recompute the fee locally.
 *
 * A null `quoteId` in the response means the balance is insufficient — that is
 * the caller stopping, not an error to retry.
 */
async function quoteWithdrawal({ amountTzs, phoneNumber, bankCode, accountNumber, fundingSource } = {}) {
  const amount = toTzsAmount(amountTzs, { min: MIN_WITHDRAWAL_TZS });
  const destination = toPayoutDestination({ phoneNumber, bankCode, accountNumber });

  return request('POST', '/withdrawals/quote', {
    body: {
      ...resolveFunding(fundingSource),
      amountTzs: amount,
      ...destination,
    },
  });
}

/**
 * Execute a payout against a quote. Amount and destination must match the
 * quote exactly (`quote_mismatch`); an expired quote is `quote_stale`, which is
 * answered with a new quote rather than a retry.
 */
async function createWithdrawal(
  { amountTzs, phoneNumber, bankCode, accountNumber, quoteId, fundingSource, endUser } = {},
  idempotencyKey
) {
  if (!quoteId) {
    throw new NtzsError({
      status: 400,
      code: 'quote_required',
      message: 'quoteId is required — price the payout first and show the user the fee',
      retry: 'no',
    });
  }
  const amount = toTzsAmount(amountTzs, { min: MIN_WITHDRAWAL_TZS });
  const destination = toPayoutDestination({ phoneNumber, bankCode, accountNumber });

  return request('POST', '/withdrawals', {
    body: {
      ...resolveFunding(fundingSource),
      // Required on every platform-wallet execute, and the same reference comes
      // back on the webhook so the payout can be matched.
      endUser: toEndUser(endUser, { context: 'payout' }),
      amountTzs: amount,
      quoteId,
      ...destination,
    },
    idempotencyKey: toIdempotencyKey(idempotencyKey),
  });
}

async function getWithdrawal(id) {
  return request('GET', `/withdrawals/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------------
// Spend — bills and tills
// ---------------------------------------------------------------------------

/**
 * The biller catalogue. Each entry carries its reference label and validation
 * rules. The API groups them under `categories`; they are flattened here so
 * callers get one list, each entry tagged with its category.
 */
async function listBillers() {
  const { billers } = await getBillerCatalogue();
  return billers;
}

/** The raw catalogue, including whether spend is enabled at all. */
async function getBillerCatalogue() {
  const data = await request('GET', '/spend/billers');
  if (Array.isArray(data)) return { enabled: true, note: null, billers: data };
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const billers = categories.flatMap((category) =>
    (category.billers || []).map((biller) => ({
      category: category.key || null,
      categoryLabel: category.label || null,
      ...biller,
    }))
  );
  return { enabled: data?.enabled !== false, note: data?.note || null, billers };
}

/**
 * Price a bill or till payment. A fee applies to EVERY payment — never render
 * a biller as free, and never compute the fee locally.
 */
async function quoteSpend({
  amountTzs,
  kind = 'bill',
  payNumber,
  utilityCode,
  utilityRef,
  fundingSource,
} = {}) {
  const amount = toTzsAmount(amountTzs, { min: 1, field: 'amountTzs' });
  if (kind !== 'lipa' && kind !== 'bill') {
    throw new NtzsError({ status: 400, code: 'invalid_transfer', message: 'kind must be lipa or bill', retry: 'no' });
  }
  // Quotes need no endUser; the execute call does.
  const payload = { ...resolveFunding(fundingSource), amountTzs: amount, kind };
  if (kind === 'lipa') {
    payload.payNumber = toPhoneNumber(payNumber, { field: 'payNumber' });
  } else {
    if (!utilityCode) {
      throw new NtzsError({
        status: 400,
        code: 'unknown_biller',
        message: 'utilityCode is required — see GET /v1/spend/billers',
        retry: 'no',
      });
    }
    payload.utilityCode = String(utilityCode);
    if (utilityRef) payload.utilityRef = String(utilityRef);
  }
  return request('POST', '/spend/quote', { body: payload });
}

/**
 * Execute a bill/till payment against a quote. The returned reference must be
 * persisted — it is what the biller recognises when the customer queries the
 * payment.
 *
 * On 502 till_network_required the burn was reverted and the balance restored:
 * retry with `network`, not with a new amount.
 */
async function createSpend({ quoteId, network, fundingSource, endUser } = {}, idempotencyKey) {
  if (!quoteId) {
    throw new NtzsError({
      status: 400,
      code: 'quote_required',
      message: 'quoteId is required — price the payment first',
      retry: 'no',
    });
  }
  const body = { ...resolveFunding(fundingSource), endUser: toEndUser(endUser, { context: 'bill payment' }), quoteId };
  if (network) body.network = String(network);

  return request('POST', '/spend', {
    body,
    idempotencyKey: toIdempotencyKey(idempotencyKey),
  });
}

async function getSpend(id) {
  return request('GET', `/spend/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------------
// Lookups — confirm the destination before paying. Fail-soft by design.
// ---------------------------------------------------------------------------

/** Resolve the registered name behind a mobile number. `name: null` is normal. */
async function lookupRecipientName(phoneNumber) {
  return request('POST', '/lookup/recipient-name', { body: { phoneNumber: toPhoneNumber(phoneNumber) } });
}

/**
 * Resolve the trading name behind a till or bill account. Fail-soft.
 * Upstream can take ~25s, so debounce and never call this per keystroke.
 * Send `amountTzs` when known — bill validation is amount-aware.
 */
async function lookupMerchantName({ kind = 'bill', payNumber, utilityCode, utilityRef, amountTzs } = {}) {
  const payload = { kind };
  if (kind === 'lipa') payload.payNumber = toPhoneNumber(payNumber, { field: 'payNumber' });
  if (utilityCode) payload.utilityCode = String(utilityCode);
  if (utilityRef) payload.utilityRef = String(utilityRef);
  if (amountTzs != null && amountTzs !== '') payload.amountTzs = toTzsAmount(amountTzs);
  return request('POST', '/lookup/merchant-name', { body: payload });
}

/** Resolve a scanned TANQR payload to a destination. */
async function lookupQr(payload) {
  if (!payload) {
    throw new NtzsError({ status: 400, code: 'payload_required', message: 'payload is required', retry: 'no' });
  }
  return request('POST', '/lookup/qr', { body: { payload: String(payload) } });
}

// ---------------------------------------------------------------------------
// Platform / test mode
// ---------------------------------------------------------------------------

/** Total nTZS in circulation. Context only — not an account statement. */
async function getSupply() {
  return request('GET', '/supply');
}

/** Inspect the sandbox state for this key. */
async function inspectTestMode() {
  return request('GET', '/testmode');
}

/** Settle every pending simulated transaction now. Test keys only. */
async function advanceTestMode() {
  return request('POST', '/testmode/advance');
}

/** Wipe every simulated user and transaction on this key. Test keys only. */
async function resetTestMode() {
  return request('POST', '/testmode/reset');
}

/** Clear a simulated manual KYC review (NIDA ending 0000 forces one). */
async function approveTestModeUser(userId) {
  return request('POST', `/testmode/users/${encodeURIComponent(userId)}/approve`);
}

/**
 * Verify an inbound nTZS webhook signature (HMAC-SHA256 over `timestamp.body`).
 * Returns false when the secret is unset rather than throwing — a missing
 * secret must not silently accept unsigned webhooks.
 */
function verifyWebhookSignature(rawBody, headers, secret = process.env.NTZS_WEBHOOK_SECRET) {
  if (!secret) return false;
  const signature = headers['x-webhook-signature'] || headers['X-Webhook-Signature'];
  const timestamp = headers['x-webhook-timestamp'] || headers['X-Webhook-Timestamp'];
  if (!signature || !timestamp) return false;

  const bodyString = Buffer.isBuffer(rawBody)
    ? rawBody.toString('utf8')
    : typeof rawBody === 'string'
      ? rawBody
      : JSON.stringify(rawBody || {});

  const expected = require('crypto')
    .createHmac('sha256', secret)
    .update(`${timestamp}.${bodyString}`)
    .digest('hex');

  const a = Buffer.from(String(signature), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return require('crypto').timingSafeEqual(a, b);
}

module.exports = {
  DEFAULT_API_BASE,
  config,
  request,
  resolveFunding,
  // Collections
  createDeposit,
  getDeposit,
  // Disbursements
  quoteWithdrawal,
  createWithdrawal,
  getWithdrawal,
  // Spend / bills
  listBillers,
  getBillerCatalogue,
  quoteSpend,
  createSpend,
  getSpend,
  // Lookups
  lookupRecipientName,
  lookupMerchantName,
  lookupQr,
  // Platform / test mode
  getSupply,
  inspectTestMode,
  advanceTestMode,
  resetTestMode,
  approveTestModeUser,
  verifyWebhookSignature,
  // Errors (re-exported for callers that catch them)
  NtzsError,
};