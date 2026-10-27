/**
 * nTZS error model.
 *
 * Errors come in three shapes per the partner API docs:
 *   1. Machine code in `error`  → { error: 'insufficient_balance', message: '…' }
 *   2. Machine code in `code`   → { error: 'A NIDA number is required…', code: 'kyc_required' }
 *   3. No machine code          → { error: 'Missing or invalid Authorization header…' } (401)
 *
 * Always branch on `code ?? error` and always keep the HTTP status. Reading
 * `error` alone silently mis-handles roughly a third of the catalogue.
 *
 * Each code also carries a retry policy:
 *   no     — deterministic. Fix the request and resend; resending unchanged
 *            returns the same answer.
 *   backoff — transient. Retry with exponential backoff.
 *   verify — the outcome is genuinely unknown. Query the resource before
 *            retrying; an idempotency key makes the retry safe.
 */

const RETRY = {
  NO: 'no',
  BACKOFF: 'backoff',
  VERIFY: 'verify',
};

/**
 * Retry policy per machine code, taken from the published error reference.
 * Anything absent falls back to the status-class default in `retryPolicyFor`.
 */
const CODE_RETRY_POLICY = {
  // Request validation — deterministic, never retryable.
  missing_required_fields: RETRY.NO,
  // A misconfigured holder fails the same way every time until it is fixed.
  collection_holder_unknown: RETRY.NO,
  invalid_amount: RETRY.NO,
  amount_too_large: RETRY.NO,
  invalid_address: RETRY.NO,
  invalid_token: RETRY.NO,
  invalid_transfer: RETRY.NO,
  invalid_phone: RETRY.NO,
  invalid_external_reference: RETRY.NO,
  phone_required: RETRY.NO,
  phone_invalid: RETRY.NO,
  invalid_country: RETRY.NO,
  payload_required: RETRY.NO,
  invalid_entry: RETRY.NO,
  invalid_utility_ref: RETRY.NO,
  unknown_biller: RETRY.NO,
  invalid_idempotency_key: RETRY.NO,
  bank_amount_unsupported: RETRY.NO,

  // Auth / access — deterministic.
  ip_not_allowed: RETRY.NO,
  capability_required: RETRY.NO,
  kyb_required: RETRY.NO,
  capability_not_held: RETRY.NO,
  agent_credential_revoked: RETRY.NO,
  agent_credential_expired: RETRY.NO,
  agent_credential_partner_inactive: RETRY.NO,
  agent_per_txn_cap_exceeded: RETRY.NO,
  agent_daily_cap_exceeded: RETRY.NO,
  merchant_unavailable: RETRY.NO,
  wallet_frozen: RETRY.NO,
  treasury_account_frozen: RETRY.NO,
  endpoint_retired: RETRY.NO,
  not_available_in_test_mode: RETRY.NO,
  test_mode_only: RETRY.NO,
  already_test: RETRY.NO,

  // Identity / KYC.
  kyc_required: RETRY.NO,
  kyc_failed: RETRY.NO,
  kyc_already_decided: RETRY.NO,
  kyc_reliance_not_granted: RETRY.NO,
  identity_already_registered: RETRY.NO,
  nida_already_registered: RETRY.NO,
  identity_mismatch: RETRY.NO,

  // Quotes — a stale quote is answered with a new quote, not a retry.
  quote_required: RETRY.NO,
  quote_mismatch: RETRY.NO,
  invalid_quote: RETRY.NO,
  quote_stale: RETRY.NO,

  // Balance / wallet state.
  insufficient_balance: RETRY.NO,
  treasury_not_provisioned: RETRY.NO,
  funding_source_required: RETRY.NO,
  lender_controls_settlement: RETRY.NO,
  user_not_found: RETRY.NO,
  wallet_not_provisioned: RETRY.BACKOFF,

  // Conflicts / duplicates.
  duplicate_withdrawal: RETRY.NO,
  idempotency_key_used: RETRY.NO,
  transfer_in_flight: RETRY.BACKOFF,

  // Compliance.
  compliance_screening_blocked: RETRY.NO,

  // Rails / availability.
  rate_limited: RETRY.BACKOFF,
  relayer_unavailable: RETRY.BACKOFF,
  network_error: RETRY.BACKOFF,
  database_error: RETRY.BACKOFF,
  configuration_error: RETRY.NO,
  bank_rail_unavailable: RETRY.BACKOFF,
  spend_disabled: RETRY.BACKOFF,
  spend_kind_disabled: RETRY.NO,
  ramp_unavailable: RETRY.BACKOFF,
  ramp_not_provisioned: RETRY.NO,
  ramp_spend_disabled: RETRY.NO,
  wakala_float_disabled: RETRY.NO,
  signup_disabled: RETRY.NO,
  migration_pending: RETRY.BACKOFF,
  kyc_unavailable: RETRY.BACKOFF,
  token_paused: RETRY.BACKOFF,
  compliance_screening_unavailable: RETRY.BACKOFF,
  not_provisioned: RETRY.NO,

  // Outcome unknown — read the resource back before retrying.
  initiation_failed: RETRY.VERIFY,
  initiation_uncertain: RETRY.VERIFY,
  till_network_required: RETRY.VERIFY,

  // Market maker / chain.
  CHAIN_UNAVAILABLE: RETRY.BACKOFF,
};

/**
 * Resolve the retry policy for a code/status pair.
 * Falls back to the status class when the code is unknown to us.
 */
function retryPolicyFor(code, status) {
  if (code && CODE_RETRY_POLICY[code]) return CODE_RETRY_POLICY[code];
  if (status === 429) return RETRY.BACKOFF;
  if (status === 502) return RETRY.VERIFY;
  if (status === 503) return RETRY.BACKOFF;
  if (status >= 500) return RETRY.BACKOFF;
  return RETRY.NO;
}

/**
 * A normalized nTZS API failure.
 *
 * @property {number} status  HTTP status — always meaningful, keep it.
 * @property {string|null} code  Machine code (`code ?? error`), null when the
 *   API returned prose only (401s).
 * @property {string} retry  'no' | 'backoff' | 'verify'.
 * @property {boolean} uncertain  True when the outcome may already have
 *   happened (502 initiation_uncertain / till_network_required). The caller
 *   must read the resource back before retrying.
 */
class NtzsError extends Error {
  constructor({ status, code, message, retry, raw, retryAfterSeconds, uncertain }) {
    super(message || code || `nTZS request failed (${status})`);
    this.name = 'NtzsError';
    this.status = status || 500;
    this.code = code || null;
    this.retry = retry || retryPolicyFor(code, status);
    this.raw = raw || {};
    this.uncertain = Boolean(uncertain);
    if (retryAfterSeconds != null) this.retryAfterSeconds = retryAfterSeconds;
    if (this.raw && this.raw.details) this.details = this.raw.details;
  }

  toJSON() {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
      retry: this.retry,
      uncertain: this.uncertain,
      ...(this.retryAfterSeconds != null ? { retry_after: this.retryAfterSeconds } : {}),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

/**
 * Turn a non-2xx nTZS response into an NtzsError, whatever shape it arrived in.
 */
function parseErrorResponse(status, data, headers) {
  const body = data && typeof data === 'object' ? data : {};
  // Identity/KYC paths invert the fields: `error` is prose, `code` is machine.
  const code = body.code || (typeof body.error === 'string' ? body.error : null) || null;
  const message =
    body.message ||
    (typeof body.error === 'string' && !body.code ? body.error : null) ||
    (typeof body.error === 'string' ? body.error : null) ||
    'nTZS API error';

  const retry = retryPolicyFor(code, status);
  const retryAfterHeader =
    headers && typeof headers.get === 'function' ? headers.get('retry-after') : null;
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) || null : null;

  return new NtzsError({
    status,
    code,
    message,
    retry,
    raw: body,
    retryAfterSeconds,
    uncertain: status === 502 && (code === 'initiation_uncertain' || code === 'till_network_required'),
  });
}

module.exports = {
  RETRY,
  CODE_RETRY_POLICY,
  NtzsError,
  retryPolicyFor,
  parseErrorResponse,
};