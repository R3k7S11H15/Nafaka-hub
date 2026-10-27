/**
 * Input normalization for the nTZS API.
 *
 * Two rules drive everything here:
 *  - Amounts are WHOLE Tanzanian shillings, always integers. A decimal TZS
 *    amount is rejected before it reaches the rail.
 *  - Phone numbers are sent in the digits-only international form
 *    (`2557XXXXXXXX`); `+255…`, `0…` and spaced variants are accepted on input.
 */

const MOBILE_MONEY_NETWORKS = ['vodacom', 'airtel', 'tigo', 'halotel', 'ttcl'];

/** Minimum collection (POST /v1/deposits). */
const MIN_DEPOSIT_TZS = 500;
/** Minimum payout, net to the recipient (POST /v1/withdrawals/quote). */
const MIN_WITHDRAWAL_TZS = 5000;

class ValidationError extends Error {
  constructor(message, code = 'missing_required_fields') {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.code = code;
  }
}

/**
 * Coerce a value to a positive whole-TZS integer, or throw.
 * Decimal shillings are a hard error, not a rounding opportunity.
 */
function toTzsAmount(value, { min = 1, field = 'amountTzs' } = {}) {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${field} is required`, 'missing_required_fields');
  }
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(num)) {
    throw new ValidationError(`${field} must be a number`, 'invalid_amount');
  }
  if (!Number.isInteger(num)) {
    throw new ValidationError(
      `${field} must be whole Tanzanian shillings — decimals are not accepted`,
      'invalid_amount'
    );
  }
  if (num < min) {
    throw new ValidationError(`${field} must be at least ${min} TZS`, 'invalid_amount');
  }
  return num;
}

/**
 * Normalize a Tanzanian mobile number to digits-only international form.
 * `255712345678`, `+255712345678`, `0712345678` and spaced variants all work.
 */
function toPhoneNumber(value, { field = 'phoneNumber' } = {}) {
  if (!value) throw new ValidationError(`${field} is required`, 'phone_required');
  let digits = String(value).replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('255')) {
    // already international
  } else if (digits.startsWith('0')) {
    digits = `255${digits.slice(1)}`;
  } else if (digits.length === 9) {
    digits = `255${digits}`;
  }
  if (!/^255[67]\d{8}$/.test(digits)) {
    throw new ValidationError(`${field} is not a valid Tanzanian mobile number`, 'invalid_phone');
  }
  return digits;
}

/**
 * Exactly one destination on a payout: a phone, or a bank account.
 * Both or neither is `invalid_transfer`.
 */
function toPayoutDestination({ phoneNumber, bankCode, accountNumber }) {
  const hasPhone = Boolean(phoneNumber);
  const hasBank = Boolean(bankCode || accountNumber);
  if (hasPhone && hasBank) {
    throw new ValidationError(
      'Give exactly one destination: phoneNumber, or bankCode + accountNumber',
      'invalid_transfer'
    );
  }
  if (hasPhone) {
    return { phoneNumber: toPhoneNumber(phoneNumber) };
  }
  if (hasBank) {
    if (!bankCode || !accountNumber) {
      throw new ValidationError(
        'bankCode and accountNumber are both required for a bank payout',
        'missing_required_fields'
      );
    }
    return { bankCode: String(bankCode).trim(), accountNumber: String(accountNumber).trim() };
  }
  throw new ValidationError(
    'A destination is required: phoneNumber, or bankCode + accountNumber',
    'missing_required_fields'
  );
}

/**
 * Validate our own reference string before it is sent upstream.
 * nTZS rejects non-strings, anything over 128 characters, and control chars.
 */
function toExternalReference(value, { field = 'externalReference' } = {}) {
  if (value === undefined || value === null || value === '') return undefined;
  const str = String(value);
  if (str.length > 128) {
    throw new ValidationError(`${field} must be at most 128 characters`, 'invalid_external_reference');
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(str)) {
    throw new ValidationError(`${field} contains control characters`, 'invalid_external_reference');
  }
  return str;
}

/** Idempotency keys must be non-empty strings of at most 128 characters. */
function toIdempotencyKey(value, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError('idempotencyKey is required', 'invalid_idempotency_key');
    return undefined;
  }
  const str = String(value);
  if (!str.length || str.length > 128) {
    throw new ValidationError('idempotencyKey must be 1-128 characters', 'invalid_idempotency_key');
  }
  return str;
}


/**
 * The end-user reference nTZS requires on every platform-wallet transaction.
 *
 * As of API v1.28.0 the treasury is tied to the API key, so a collection or
 * payout no longer names a receiving holder. Instead it names *who the
 * transaction is about* — `endUser.reference` — which is our own stable
 * customer id. It is how nTZS meets regulatory traceability and how it hands
 * the same reference back on `deposit.completed` so we can match the webhook.
 *
 * A missing reference is refused locally: the provider would reject it, and it
 * is required for the webhook to be matchable at all.
 */
function toEndUser(endUser, { context = 'platform-wallet transaction' } = {}) {
  const reference = endUser && (endUser.reference ?? endUser.customerId ?? endUser.customer_id);
  if (reference === undefined || reference === null || String(reference).trim() === '') {
    throw new ValidationError(
      `endUser.reference is required for a ${context} — use your own stable customer id`,
      'missing_required_fields'
    );
  }
  const str = String(reference).trim();
  if (str.length > 128) {
    throw new ValidationError('endUser.reference must be 128 characters or fewer', 'invalid_external_reference');
  }
  const out = { reference: str };
  const name = endUser.name || endUser.full_name;
  if (name) out.name = String(name);
  const phone = endUser.phone || endUser.phoneNumber || endUser.phone_number;
  if (phone) out.phone = toPhoneNumber(phone);
  return out;
}

module.exports = {
  MOBILE_MONEY_NETWORKS,
  MIN_DEPOSIT_TZS,
  MIN_WITHDRAWAL_TZS,
  ValidationError,
  toTzsAmount,
  toPhoneNumber,
  toPayoutDestination,
  toExternalReference,
  toIdempotencyKey,
  toEndUser,
};