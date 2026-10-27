/**
 * nTZS client tests — the rules that decide whether an integration works:
 * idempotency, error shapes, retry policy, quote discipline, and no wallets.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

vi.stubGlobal('fetch', vi.fn());

process.env.NTZS_API_BASE = 'https://sandbox.ntzs.test/api/v1';
process.env.NTZS_API_KEY = 'ntzs_test_0123456789abcdefghijklmnop';
process.env.NTZS_FUNDING_USER_ID = '11111111-2222-3333-4444-555555555555';

const ntzs = require('../services/ntzs');
const { NtzsError, retryPolicyFor, RETRY } = require('../services/ntzs/errors');
const validate = require('../services/ntzs/validate');

function jsonResponse(status, body, headers = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => lower[name.toLowerCase()] ?? null },
    text: async () => JSON.stringify(body),
  };
}

function lastCall() {
  const call = fetch.mock.calls[fetch.mock.calls.length - 1];
  return {
    url: call[0],
    options: call[1],
    body: call[1].body ? JSON.parse(call[1].body) : undefined,
    headers: call[1].headers,
  };
}

describe('nTZS client — request shape', () => {
  beforeEach(() => {
    fetch.mockReset();
    fetch.mockResolvedValue(jsonResponse(201, { id: 'dep-1', status: 'submitted', amountTzs: 5000 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends bearer auth, JSON and the Idempotency-Key', async () => {
    await ntzs.createDeposit({ amountTzs: 5000, phoneNumber: '0712345678' }, 'order-9');
    const { url, options, headers } = lastCall();
    expect(url).toBe('https://sandbox.ntzs.test/api/v1/deposits');
    expect(options.method).toBe('POST');
    expect(headers.Authorization).toBe(`Bearer ${process.env.NTZS_API_KEY}`);
    expect(headers['Idempotency-Key']).toBe('order-9');
  });

  it('never sends userId when no holder is configured — spec form, no wallets capability', async () => {
    // Pinned: setup.js loads the developer's .env, so the holder this asserts
    // on must not come from ambient configuration.
    const real = process.env.NTZS_COLLECTION_USER_ID;
    process.env.NTZS_COLLECTION_USER_ID = '';
    try {
      await ntzs.createDeposit({ amountTzs: 5000, phoneNumber: '+255 712 345 678' }, 'key-1');
      const { body } = lastCall();
      expect(body.userId).toBeUndefined();
      expect(body).toEqual({ amountTzs: 5000, paymentMethod: 'mobile_money', phoneNumber: '255712345678' });
    } finally {
      if (real === undefined) delete process.env.NTZS_COLLECTION_USER_ID;
      else process.env.NTZS_COLLECTION_USER_ID = real;
    }
  });

  it('sends the configured treasury holder as the receiving userId when set', async () => {
    // The published spec makes userId optional, but the deployed API answers
    // 400 "userId and amountTzs are required" without it — so the partner
    // treasury holder id is configurable.
    process.env.NTZS_COLLECTION_USER_ID = 'treasury-holder-uuid';
    await ntzs.createDeposit({ amountTzs: 5000, phoneNumber: '0712345678' }, 'k');
    expect(lastCall().body.userId).toBe('treasury-holder-uuid');
    delete process.env.NTZS_COLLECTION_USER_ID;
  });

  it('refuses a decimal TZS amount before it reaches the rail', async () => {
    await expect(ntzs.createDeposit({ amountTzs: 1500.5, phoneNumber: '0712345678' }, 'k')).rejects.toThrow(
      /whole Tanzanian shillings/
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('enforces the 500 TZS collection minimum', async () => {
    await expect(ntzs.createDeposit({ amountTzs: 499, phoneNumber: '0712345678' }, 'k')).rejects.toThrow(
      /at least 500/
    );
  });

  it('enforces the 5,000 TZS payout minimum (net to recipient)', async () => {
    await expect(ntzs.quoteWithdrawal({ amountTzs: 4999, phoneNumber: '0712345678' })).rejects.toThrow(
      /at least 5000/
    );
  });

  it('requires exactly one payout destination', async () => {
    await expect(
      ntzs.quoteWithdrawal({
        amountTzs: 10000,
        phoneNumber: '0712345678',
        bankCode: 'CRDB',
        accountNumber: '1234567890',
      })
    ).rejects.toThrow(/exactly one destination/);
  });
});

describe('nTZS client — quote discipline', () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  it('refuses to execute a payout without a quote', async () => {
    await expect(
      ntzs.createWithdrawal({ amountTzs: 10000, phoneNumber: '0712345678' }, 'key')
    ).rejects.toMatchObject({ code: 'quote_required' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses to execute a bill payment without a quote', async () => {
    await expect(ntzs.createSpend({}, 'key')).rejects.toMatchObject({ code: 'quote_required' });
  });

  it('names both the funding source and the recipient on a payout', async () => {
    fetch.mockResolvedValue(jsonResponse(201, { id: 'wd-1', status: 'burned', totalFeeTzs: 1000 }));
    await ntzs.createWithdrawal(
      {
        amountTzs: 10000,
        quoteId: 'q-1',
        phoneNumber: '0712345678',
        endUser: { reference: 'cust-7' },
      },
      'payout-1'
    );
    const { body } = lastCall();
    // The funding source says who pays; endUser says who it is for. endUser is
    // required on every platform-wallet execute as of v1.28.0.
    expect(body.fromTreasury !== undefined || body.userId !== undefined).toBe(true);
    expect(body.endUser).toEqual({ reference: 'cust-7' });
    expect(body.quoteId).toBe('q-1');
    expect(body.amountTzs).toBe(10000);
    expect(body.phoneNumber).toBe('255712345678');
  });

  it('refuses a payout with no end user reference', async () => {
    await expect(
      ntzs.createWithdrawal({ amountTzs: 10000, quoteId: 'q-1', phoneNumber: '0712345678' }, 'payout-2')
    ).rejects.toMatchObject({ code: 'missing_required_fields' });
    // Nothing may leave the process without a traceable recipient.
    expect(fetch).not.toHaveBeenCalled();
  });

  it('funds from the partner treasury when no holder is configured', async () => {
    const previous = process.env.NTZS_FUNDING_USER_ID;
    delete process.env.NTZS_FUNDING_USER_ID;
    fetch.mockResolvedValue(jsonResponse(200, { id: 'spend-1', status: 'completed' }));

    await ntzs.createSpend({ quoteId: 'q-1', endUser: { reference: 'cust-7' } }, 'key');
    const { body } = lastCall();

    // "fromTreasury: true — pay from your partner treasury float, no per-user
    // wallet needed." Refusing locally here would block payouts and bills for no
    // reason: this account holds no `wallets`, so it has no ids to name.
    expect(body.fromTreasury).toBe(true);
    expect(body).not.toHaveProperty('userId');
    process.env.NTZS_FUNDING_USER_ID = previous;
  });

  it('prefers a configured holder over the treasury float when one exists', async () => {
    const previous = process.env.NTZS_FUNDING_USER_ID;
    process.env.NTZS_FUNDING_USER_ID = 'holder-uuid';
    fetch.mockResolvedValue(jsonResponse(200, { id: 'spend-2', status: 'completed' }));

    await ntzs.createSpend({ quoteId: 'q-1', endUser: { reference: 'cust-7' } }, 'key');
    const { body } = lastCall();

    expect(body.userId).toBe('holder-uuid');
    expect(body).not.toHaveProperty('fromTreasury');
    process.env.NTZS_FUNDING_USER_ID = previous;
  });

  it('prices a payout from the treasury float', async () => {
    const previous = process.env.NTZS_FUNDING_USER_ID;
    delete process.env.NTZS_FUNDING_USER_ID;
    fetch.mockResolvedValue(jsonResponse(200, { quoteId: 'q-t', receiveAmountTzs: 10000, totalFeeTzs: 250 }));

    await ntzs.quoteWithdrawal({ amountTzs: 10000, phoneNumber: '0712345678' });
    const { body } = lastCall();

    expect(body.fromTreasury).toBe(true);
    expect(body).not.toHaveProperty('userId');
    process.env.NTZS_FUNDING_USER_ID = previous;
  });
});

describe('nTZS client — error shapes', () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  it('reads the machine code from `error` (the common shape)', async () => {
    fetch.mockResolvedValue(
      jsonResponse(400, { error: 'insufficient_balance', message: 'Sender has insufficient nTZS balance' })
    );
    await expect(ntzs.quoteWithdrawal({ amountTzs: 10000, phoneNumber: '0712345678' })).rejects.toMatchObject({
      status: 400,
      code: 'insufficient_balance',
      message: 'Sender has insufficient nTZS balance',
      retry: RETRY.NO,
    });
  });

  it('reads the machine code from `code` when identity paths invert the fields', async () => {
    fetch.mockResolvedValue(
      jsonResponse(400, { error: 'A NIDA number is required to create a wallet.', code: 'kyc_required' })
    );
    const err = await ntzs.request('POST', '/users', { body: {}, idempotencyKey: 'k' }).catch((e) => e);
    expect(err).toBeInstanceOf(NtzsError);
    expect(err.code).toBe('kyc_required');
    expect(err.message).toBe('A NIDA number is required to create a wallet.');
  });

  it('keeps the HTTP status when there is no machine code at all', async () => {
    fetch.mockResolvedValue(
      jsonResponse(401, { error: 'Missing or invalid Authorization header. Expected: Bearer <api_key>' })
    );
    const err = await ntzs.request('GET', '/deposits/x').catch((e) => e);
    expect(err.status).toBe(401);
    expect(err.code).toBe('Missing or invalid Authorization header. Expected: Bearer <api_key>');
  });

  it('marks 502 initiation_uncertain as an unknown outcome that must be verified', async () => {
    fetch.mockResolvedValue(jsonResponse(502, { code: 'initiation_uncertain', message: 'prompt unknown' }));
    const err = await ntzs
      .createDeposit({ amountTzs: 5000, phoneNumber: '0712345678' }, 'key')
      .catch((e) => e);
    expect(err.uncertain).toBe(true);
    expect(err.retry).toBe(RETRY.VERIFY);
  });

  it('marks 502 till_network_required as verify — the burn was reverted', async () => {
    fetch.mockResolvedValue(jsonResponse(502, { error: 'till_network_required', message: 'network unknown' }));
    const err = await ntzs.createSpend({ quoteId: 'q-1', endUser: { reference: 'cust-7' } }, 'key').catch((e) => e);
    expect(err.code).toBe('till_network_required');
    expect(err.uncertain).toBe(true);
  });

  it('surfaces Retry-After on a 429', async () => {
    fetch.mockResolvedValue(jsonResponse(429, { error: 'rate_limited' }, { 'Retry-After': '12' }));
    const err = await ntzs.listBillers().catch((e) => e);
    expect(err.status).toBe(429);
    expect(err.retry).toBe(RETRY.BACKOFF);
    expect(err.retryAfterSeconds).toBe(12);
  });

  it('treats a transport failure as an unknown outcome, not a safe retry', async () => {
    fetch.mockRejectedValue(Object.assign(new Error('socket hang up'), { name: 'TypeError' }));
    const err = await ntzs.getDeposit('dep-1').catch((e) => e);
    expect(err.retry).toBe(RETRY.VERIFY);
  });

  it('maps retry policies straight from the error catalogue', () => {
    expect(retryPolicyFor('quote_stale', 409)).toBe(RETRY.NO);
    expect(retryPolicyFor('kyc_unavailable', 503)).toBe(RETRY.BACKOFF);
    expect(retryPolicyFor('till_network_required', 502)).toBe(RETRY.VERIFY);
    expect(retryPolicyFor('wallet_not_provisioned', 400)).toBe(RETRY.BACKOFF);
    expect(retryPolicyFor(null, 503)).toBe(RETRY.BACKOFF);
    expect(retryPolicyFor(null, 429)).toBe(RETRY.BACKOFF);
    expect(retryPolicyFor(null, 400)).toBe(RETRY.NO);
  });
});

describe('nTZS biller catalogue', () => {
  beforeEach(() => fetch.mockReset());

  it('flattens the categorised catalogue the API actually returns', async () => {
    fetch.mockResolvedValue(
      jsonResponse(200, {
        enabled: true,
        note: 'Fees apply to every biller',
        categories: [
          { key: 'utility', label: 'Utilities', billers: [{ code: 'TOP', referenceLabel: 'Mobile No' }] },
          { key: 'tv', label: 'TV', billers: [{ code: 'DSTV', referenceLabel: 'Account' }] },
        ],
      })
    );
    const billers = await ntzs.listBillers();
    expect(billers).toHaveLength(2);
    expect(billers[0]).toMatchObject({ code: 'TOP', category: 'utility', categoryLabel: 'Utilities' });
  });

  it('reports whether spend is enabled at all', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { enabled: false, categories: [] }));
    const catalogue = await ntzs.getBillerCatalogue();
    expect(catalogue.enabled).toBe(false);
    expect(catalogue.billers).toEqual([]);
  });
});

describe('nTZS lookups — fail-soft by contract', () => {
  beforeEach(() => {
    fetch.mockReset();
  });

  it('returns a null name without throwing (no confirmation available)', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { phone: '255712345678', network: 'vodacom', name: null }));
    const data = await ntzs.lookupRecipientName('0712345678');
    expect(data.name).toBeNull();
    expect(data.network).toBe('vodacom');
  });

  it('rejects a malformed lookup request with 400', async () => {
    await expect(ntzs.lookupRecipientName('12345')).rejects.toMatchObject({ code: 'invalid_phone' });
  });

  it('requires a QR payload', async () => {
    await expect(ntzs.lookupQr()).rejects.toMatchObject({ code: 'payload_required' });
  });
});

describe('validate helpers', () => {
  it('normalizes every accepted phone form to digits-only international', () => {
    expect(validate.toPhoneNumber('+255712345678')).toBe('255712345678');
    expect(validate.toPhoneNumber('0712345678')).toBe('255712345678');
    expect(validate.toPhoneNumber('255 712 345 678')).toBe('255712345678');
    expect(validate.toPhoneNumber('0712 345 678')).toBe('255712345678');
  });

  it('rejects a non-Tanzanian number', () => {
    expect(() => validate.toPhoneNumber('+254712345678')).toThrow(/not a valid Tanzanian/);
  });

  it('rejects a control-character external reference', () => {
    expect(() => validate.toExternalReference('refwith-control')).toThrow(/control characters/);
  });

  it('caps an external reference at 128 characters', () => {
    expect(() => validate.toExternalReference('x'.repeat(129))).toThrow(/at most 128/);
  });
});

describe('webhook signature verification', () => {
  const crypto = require('crypto');

  it('accepts a valid HMAC over timestamp.body and rejects tampering', () => {
    const secret = 'whsec_test';
    const body = JSON.stringify({ type: 'deposit.completed', data: { id: 'dep-1', status: 'completed' } });
    const timestamp = '1700000000';
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

    expect(ntzs.verifyWebhookSignature(body, { 'x-webhook-timestamp': timestamp, 'x-webhook-signature': signature }, secret)).toBe(true);
    expect(ntzs.verifyWebhookSignature(`${body} `, { 'x-webhook-timestamp': timestamp, 'x-webhook-signature': signature }, secret)).toBe(false);
    expect(ntzs.verifyWebhookSignature(body, { 'x-webhook-timestamp': timestamp }, secret)).toBe(false);
  });

  it('refuses to verify when no secret is configured', () => {
    expect(ntzs.verifyWebhookSignature('{}', {}, undefined)).toBe(false);
  });
});