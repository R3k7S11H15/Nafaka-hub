import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

vi.stubGlobal('fetch', vi.fn());

const svc = require('../services/payments');

/**
 * mysql2 returns [rows, fields]. Our mock helpers wrap results accordingly.
 */
function mockPool() {
  const conn = {
    query: vi.fn(),
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  };
  return {
    query: vi.fn(),
    getConnection: vi.fn().mockResolvedValue(conn),
    _conn: conn,
  };
}

describe('payments.normalizeMethod', () => {
  const services = svc({});

  it('maps NTZS method variants', () => {
    expect(services.normalizeMethod('mpesa')).toBe('mobile_money');
    expect(services.normalizeMethod('M-Pesa')).toBe('mobile_money');
    expect(services.normalizeMethod('m-pesa')).toBe('mobile_money');
    expect(services.normalizeMethod('mobile_money')).toBe('mobile_money');
    expect(services.normalizeMethod('mobile money')).toBe('mobile_money');
    expect(services.normalizeMethod('airtel')).toBe('mobile_money');
    expect(services.normalizeMethod('tigo')).toBe('mobile_money');
    expect(services.normalizeMethod('bank')).toBe('bank_transfer');
    expect(services.normalizeMethod('bank_transfer')).toBe('bank_transfer');
    expect(services.normalizeMethod('card')).toBe('card');
    expect(services.normalizeMethod('credit_card')).toBe('card');
    expect(services.normalizeMethod('lipa_namba')).toBe('lipa_namba');
    expect(services.normalizeMethod('lipa')).toBe('lipa_namba');
  });

  it('keeps cash on delivery as cash', () => {
    expect(services.normalizeMethod('cash')).toBe('cash');
    expect(services.normalizeMethod('cash_on_delivery')).toBe('cash');
    expect(services.normalizeMethod('cod')).toBe('cash');
  });

  it('defaults to cash for unknown or undefined', () => {
    expect(services.normalizeMethod(undefined)).toBe('cash');
    expect(services.normalizeMethod('nonsense')).toBe('cash');
  });
});

describe('payments.normalizeProviderStatus', () => {
  const services = svc({});

  it('maps submitted statuses', () => {
    expect(services.normalizeProviderStatus('submitted')).toBe('submitted');
    expect(services.normalizeProviderStatus('pending')).toBe('submitted');
    expect(services.normalizeProviderStatus('processing')).toBe('submitted');
  });

  it('maps completed statuses', () => {
    expect(services.normalizeProviderStatus('completed')).toBe('completed');
    expect(services.normalizeProviderStatus('success')).toBe('completed');
    expect(services.normalizeProviderStatus('confirmed')).toBe('completed');
    expect(services.normalizeProviderStatus('paid')).toBe('completed');
  });

  it('maps failed and cancelled', () => {
    expect(services.normalizeProviderStatus('failed')).toBe('failed');
    expect(services.normalizeProviderStatus('error')).toBe('failed');
    expect(services.normalizeProviderStatus('cancelled')).toBe('cancelled');
    expect(services.normalizeProviderStatus('reversed')).toBe('cancelled');
  });
});

describe('payments.getLocalStatus', () => {
  const services = svc({});

  it('maps provider statuses to payment_transactions status enum', () => {
    expect(services.getLocalStatus('submitted')).toBe('pending');
    expect(services.getLocalStatus('completed')).toBe('completed');
    expect(services.getLocalStatus('failed')).toBe('failed');
    expect(services.getLocalStatus('cancelled')).toBe('reversed');
    expect(services.getLocalStatus('pending')).toBe('pending');
    expect(services.getLocalStatus('unknown')).toBe('pending');
  });
});

describe('payments.PROVIDERS', () => {
  let originalKey;
  const services = svc({})

   beforeEach(() => {
    originalKey = process.env.NTZS_API_KEY;
    process.env.NTZS_API_KEY = 'ntzs_live_test_real_key';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.NTZS_API_KEY;
    else process.env.NTZS_API_KEY = originalKey;
  });

  it('ntzs provider returns a provider_ref via real API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ntzs_real_123',
        depositId: 'ntzs_real_123',
        status: 'submitted',
        amountTzs: 10000,
        paymentMethod: 'mobile_money',
        instructions: 'Please complete the M-Pesa STK push to +255712345678.',
      }),
    }));

    const result = await services.PROVIDERS.ntzs.call({
      amount: 10000,
      order_id: 1,
      externalId: 'ntzs_user_real',
      payment_method: 'mobile_money',
      phone: '+255712345678',
    });
    expect(result.ok).toBe(true);
    expect(result.provider).toBe('ntzs');
    expect(result.provider_ref).toBe('ntzs_real_123');
    expect(result.next_action).toBeTruthy();
  });

  it('ntzs provider card returns a payment_url via real API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ntzs_card_123',
        status: 'submitted',
        amountTzs: 50000,
        paymentMethod: 'card',
        paymentUrl: 'https://pay.ntzs.co.tz/card/abc123',
      }),
    }));

    const result = await services.PROVIDERS.ntzs.call({
      amount: 50000,
      order_id: 1,
      externalId: 'ntzs_user_real',
      payment_method: 'card',
      redirect_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    });
    expect(result.ok).toBe(true);
    expect(result.payment_url).toMatch(/https:\/\/pay\.ntzs\.co\.tz/);
  });

  it('ntzs provider bank_transfer returns a reference via real API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ntzs_bank_123',
        depositId: 'ntzs_bank_123',
        status: 'submitted',
        amountTzs: 250000,
        paymentMethod: 'bank_transfer',
        reference: 'NTZ-BANKREF',
        instructions: {
          institution: 'SELCOM MICROFINANCE BANK',
          accountNumber: '5529000000000',
          accountName: 'NEDA LABS LIMITED',
        },
      }),
    }));

    const result = await services.PROVIDERS.ntzs.call({
      amount: 250000,
      order_id: 1,
      externalId: 'ntzs_user_real',
      payment_method: 'bank_transfer',
    });
    expect(result.ok).toBe(true);
    expect(result.reference).toBe('NTZ-BANKREF');
    expect(result.instructions).toBeTruthy();
  });

  it('ntzs provider lipa_namba includes phone in next_action via real API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ntzs_lipa_123',
        status: 'submitted',
        amountTzs: 10000,
        paymentMethod: 'lipa_namba',
      }),
    }));

    const result = await services.PROVIDERS.ntzs.call({
      amount: 10000,
      order_id: 1,
      externalId: 'ntzs_user_real',
      payment_method: 'lipa_namba',
      phone: '0712345678',
    });
    expect(result.ok).toBe(true);
    expect(result.next_action.phone).toContain('+255');
  });

  it('ntzs provider maps mpesa to mobile_money via real API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ntzs_mpesa_123',
        status: 'submitted',
        amountTzs: 10000,
        paymentMethod: 'mobile_money',
      }),
    }));

    const result = await services.PROVIDERS.ntzs.call({
      amount: 10000,
      order_id: 1,
      externalId: 'ntzs_user_real',
      payment_method: 'mpesa',
      phone: '0712345678',
    });
    expect(result.ok).toBe(true);
    expect(result.next_action.type).toBe('ntzs_mobile_money_prompt');
  });

  it('ntzs provider collects into the treasury when no user identifier is available', async () => {
    // No `wallets` capability: omitting userId is the treasury path, so a
    // checkout with no nTZS user reference must still work.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ntzs_treasury_deposit',
        status: 'submitted',
        amountTzs: 10000,
        paymentMethod: 'mobile_money',
      }),
    }));

    const result = await services.PROVIDERS.ntzs.call({
      amount: 10000,
      order_id: 1,
      payment_method: 'mobile_money',
      phone: '+255712345678',
    });
    expect(result.ok).toBe(true);
    expect(JSON.parse(fetch.mock.calls[0][1].body).userId).toBeUndefined();
  });

  it('ntzs provider uses customer_id as fallback for externalId', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
         id: 'ntzs_real_cust_fallback',
         depositId: 'ntzs_real_cust_fallback',
        status: 'submitted',
        amountTzs: 10000,
        paymentMethod: 'mobile_money',
        instructions: 'Check your phone for the mobile money payment prompt',
      }),
    }));

    const result = await services.PROVIDERS.ntzs.call({
      amount: 10000,
      order_id: 1,
      customer_id: 'cust_123',
      payment_method: 'mobile_money',
      phone: '+255712345678',
    });
    expect(result.ok).toBe(true);
    expect(result.next_action.type).toBe('ntzs_mobile_money_prompt');
  });

  it('ntzs provider returns error when API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Invalid phone number' }),
    }));

    const result = await services.PROVIDERS.ntzs.call({
      amount: 10000,
      order_id: 1,
      externalId: 'ntzs_user_real',
      payment_method: 'mobile_money',
      phone: '+255712345678',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid phone number');
  });

  it('cash provider returns cod_await_approval next_action', async () => {
    const result = await services.PROVIDERS.cash.call();
    expect(result.ok).toBe(true);
    expect(result.provider).toBe('cash');
    expect(result.next_action.type).toBe('cod_await_approval');
  });
});

describe('payments.initPayment', () => {
  let originalKey;
  let originalHolder;

  beforeEach(() => {
    originalKey = process.env.NTZS_API_KEY;
    process.env.NTZS_API_KEY = 'ntzs_live_test_real_key';
    // Pinned, not inherited: setup.js loads the developer's .env, and every
    // payment here depends on a receiving holder being configured.
    originalHolder = process.env.NTZS_COLLECTION_USER_ID;
    process.env.NTZS_COLLECTION_USER_ID = 'collection-holder-test';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.NTZS_API_KEY;
    else process.env.NTZS_API_KEY = originalKey;
    if (originalHolder === undefined) delete process.env.NTZS_COLLECTION_USER_ID;
    else process.env.NTZS_COLLECTION_USER_ID = originalHolder;
  });

  it('rejects when order not found', async () => {
    const pool = mockPool();
    const services = svc(pool);
    pool.query.mockResolvedValue([[]]);

    const auth = { customerId: 1, role: 'customer' };
    const result = await services.initPayment(pool, auth, {
      order_id: 999,
      amount: 10000,
      method: 'mpesa',
      idempotency_key: 'key1',
      phone: '0712345678',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(404);
  });

  it('returns existing payment idempotently', async () => {
    const pool = mockPool();
    const services = svc(pool);

    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders')) {
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      }
      if (sql.includes('WHERE idempotency_key = ?')) {
        return [
          [
            {
              id: 42,
              provider_ref: 'ntzs_existing',
              status: 'pending',
              next_action: JSON.stringify({
                type: 'ntzs_mobile_money_prompt',
                phone: '+255712345678',
              }),
              order_id: 1,
              provider: 'ntzs',
            },
          ],
        ];
      }
      return [[]];
    });

    const auth = { customerId: 1, role: 'customer' };
    const result = await services.initPayment(pool, auth, {
      order_id: 1,
      amount: 10000,
      method: 'mpesa',
      idempotency_key: 'key1',
      phone: '0712345678',
    });

    expect(result.success).toBe(true);
    expect(result.idempotent).toBe(true);
    expect(result.payment_id).toBe(42);
  });

  it('rejects amounts below minimum', async () => {
    const pool = mockPool();
    const services = svc(pool);
    pool.query.mockResolvedValue([[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]]);

    const auth = { customerId: 1, role: 'customer' };
    const result = await services.initPayment(pool, auth, {
      order_id: 1,
      amount: 100,
      method: 'mpesa',
      idempotency_key: 'key2',
      phone: '0712345678',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toContain('500');
  });

  it('rejects missing phone for mobile_money', async () => {
    const pool = mockPool();
    const services = svc(pool);
    pool.query.mockResolvedValue([[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]]);

    const auth = { customerId: 1, role: 'customer' };
    const result = await services.initPayment(pool, auth, {
      order_id: 1,
      amount: 10000,
      method: 'mpesa',
      idempotency_key: 'key3',
      phone: '',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toContain('phone number');
  });

  it('rejects card without redirect_url', async () => {
    const pool = mockPool();
    const services = svc(pool);
    pool.query.mockResolvedValue([[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]]);

    const auth = { customerId: 1, role: 'customer' };
    const result = await services.initPayment(pool, auth, {
      order_id: 1,
      amount: 5000,
      method: 'card',
      idempotency_key: 'key4',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toContain('redirect_url');
  });

  it('identifies the payer with our own reference, not a receiving holder', async () => {
    const pool = mockPool();
    const conn = pool._conn;
    const services = svc(pool);

    let body = null;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (...args) => {
      body = JSON.parse(args[1].body);
      return {
        ok: true,
        json: async () => ({ id: 'dep-eu', status: 'submitted', amountTzs: 10000, collectToTreasury: true }),
      };
    }));

    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders'))
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      if (sql.includes('WHERE idempotency_key = ?')) return [[]];
      if (sql.includes('INSERT INTO payment_transactions')) return [{ insertId: 94 }];
      if (sql.includes('UPDATE payment_transactions SET receipt_url')) return [[]];
      return [[]];
    });
    conn.query.mockResolvedValue([[]]);

    await services.initPayment(
      pool,
      { customerId: 53, role: 'customer' },
      { order_id: 1, amount: 10000, method: 'mpesa', idempotency_key: 'key-enduser', phone: '0712345678' }
    );

    // v1.28.0: no receiving holder at all — the treasury is tied to the API
    // key — and the payer is named by our own stable customer id, which comes
    // back on deposit.completed so the webhook can be matched.
    expect(body).not.toHaveProperty('userId');
    expect(body.endUser).toEqual({ reference: '53' });
  });

  it('passes a genuine provider rejection through instead of guessing', async () => {
    const pool = mockPool();
    const services = svc(pool);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'invalid_amount', message: 'Amount is below the minimum' }),
    }));

    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders'))
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      if (sql.includes('WHERE idempotency_key = ?')) return [[]];
      return [[]];
    });

    const result = await services.initPayment(
      pool,
      { customerId: 53, role: 'customer' },
      { order_id: 1, amount: 10000, method: 'mpesa', idempotency_key: 'key-badamount', phone: '0712345678' }
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.code).toBe('invalid_amount');
  });

  it('keeps an uncertain 502 a verify outcome, never a config error', async () => {
    const pool = mockPool();
    const services = svc(pool);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ code: 'initiation_uncertain', message: 'delivery unconfirmed' }),
    }));

    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders'))
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      if (sql.includes('WHERE idempotency_key = ?')) return [[]];
      if (sql.includes('INSERT INTO payment_transactions')) return [{ insertId: 79 }];
      if (sql.includes('UPDATE payment_transactions SET receipt_url')) return [[]];
      return [[]];
    });
    const conn = pool._conn;
    conn.query.mockResolvedValue([[]]);

    const result = await services.initPayment(
      pool,
      { customerId: 1, role: 'customer' },
      { order_id: 1, amount: 10000, method: 'mpesa', idempotency_key: 'key-uncertain-holder', phone: '0712345678' }
    );

    // Rewriting this into a config error would invite a retry into a double charge.
    expect(result.code).toBe('initiation_uncertain');
    expect(result.retry).toBe('verify');
  });

  it('collects in spec form — no userId — when no holder is configured', async () => {
    const pool = mockPool();
    const conn = pool._conn;
    const services = svc(pool);
    const holder = process.env.NTZS_COLLECTION_USER_ID;

    let body = null;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (...args) => {
      body = JSON.parse(args[1].body);
      return { ok: true, json: async () => ({ id: 'dep-treasury', status: 'submitted' }) };
    }));

    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders'))
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      if (sql.includes('WHERE idempotency_key = ?')) return [[]];
      if (sql.includes('INSERT INTO payment_transactions')) return [{ insertId: 93 }];
      if (sql.includes('UPDATE payment_transactions SET receipt_url')) return [[]];
      return [[]];
    });
    conn.query.mockResolvedValue([[]]);

    process.env.NTZS_COLLECTION_USER_ID = '';
    let result;
    try {
      result = await services.initPayment(
        pool,
        { customerId: 1, role: 'customer' },
        { order_id: 1, amount: 10000, method: 'mpesa', idempotency_key: 'key-treasury', phone: '0712345678' }
      );
    } finally {
      if (holder === undefined) delete process.env.NTZS_COLLECTION_USER_ID;
      else process.env.NTZS_COLLECTION_USER_ID = holder;
    }

    // "Omit userId to collect into your treasury" is the documented path for an
    // account without `wallets`, so it must not be pre-empted locally.
    expect(body).not.toHaveProperty('userId');
    expect(result.success).toBe(true);
    expect(result.provider_ref).toBe('dep-treasury');
  });

  it('sends the payer reference on the treasury collection path', async () => {
    const pool = mockPool();
    const conn = pool._conn;
    const services = svc(pool);

    let body = null;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (...args) => {
      body = JSON.parse(args[1].body);
      return { ok: true, json: async () => ({ id: 'dep-t', status: 'submitted', collectToTreasury: true }) };
    }));

    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders'))
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      if (sql.includes('WHERE idempotency_key = ?')) return [[]];
      if (sql.includes('INSERT INTO payment_transactions')) return [{ insertId: 95 }];
      if (sql.includes('UPDATE payment_transactions SET receipt_url')) return [[]];
      return [[]];
    });
    conn.query.mockResolvedValue([[]]);

    await services.initPayment(
      pool,
      { customerId: 53, role: 'customer' },
      { order_id: 1, amount: 10000, method: 'mpesa', idempotency_key: 'key-treasury2', phone: '0712345678' }
    );

    expect(body.endUser).toEqual({ reference: '53' });
    expect(body).not.toHaveProperty('userId');
  });

  it('creates NTZS payment via real API', async () => {
    const pool = mockPool();
    const conn = pool._conn;
    const services = svc(pool);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ntzs_real_55',
        depositId: 'ntzs_real_55',
        status: 'submitted',
        amountTzs: 10000,
        paymentMethod: 'mobile_money',
        instructions: 'Please complete the M-Pesa STK push to +255712345678.',
        reference: 'NTZ-test-ref',
      }),
    }));

    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders'))
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      if (sql.includes('WHERE idempotency_key = ?')) return [[]];
      if (sql.includes('INSERT INTO payment_transactions')) return [{ insertId: 55 }];
      if (sql.includes('UPDATE payment_transactions SET receipt_url')) return [[]];
      return [[]];
    });
    conn.query.mockImplementation((sql) => {
      if (sql.includes('INSERT INTO order_tracking')) return [{ insertId: 1 }];
      return [[]];
    });

    const auth = { customerId: 1, role: 'customer' };
    const result = await services.initPayment(pool, auth, {
      order_id: 1,
      amount: 10000,
      method: 'mpesa',
      idempotency_key: 'key5',
      phone: '0712345678',
    });

    expect(result.success).toBe(true);
    expect(result.payment_id).toBe(55);
    expect(result.provider).toBe('mobile_money');
    expect(result.provider_ref).toBe('ntzs_real_55');
    expect(result.next_action).toBeTruthy();
    expect(result.instructions).toBeTruthy();
  });

  it('creates COD payment without NTZS call', async () => {
    const pool = mockPool();
    const conn = pool._conn;
    const services = svc(pool);

    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders'))
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      if (sql.includes('WHERE idempotency_key = ?')) return [[]];
      if (sql.includes('INSERT INTO payment_transactions')) return [{ insertId: 56 }];
      if (sql.includes('UPDATE payment_transactions SET receipt_url')) return [[]];
      return [[]];
    });
    conn.query.mockImplementation((sql) => {
      if (sql.includes('INSERT INTO order_tracking')) return [{ insertId: 1 }];
      return [[]];
    });

    const auth = { customerId: 1, role: 'customer' };
    const result = await services.initPayment(pool, auth, {
      order_id: 1,
      amount: 10000,
      method: 'cash',
      idempotency_key: 'key6',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('cash');
    expect(result.next_action.type).toBe('cod_await_approval');
  });

  it('records an uncertain initiation so the buyer has a payment to come back to', async () => {
    const pool = mockPool();
    const conn = pool._conn;
    const services = svc(pool);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ code: 'initiation_uncertain', message: 'delivery unconfirmed' }),
    }));

    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders'))
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      if (sql.includes('WHERE idempotency_key = ?')) return [[]];
      if (sql.includes('INSERT INTO payment_transactions')) return [{ insertId: 77 }];
      if (sql.includes('UPDATE payment_transactions SET receipt_url')) return [[]];
      return [[]];
    });
    conn.query.mockResolvedValue([[]]);

    const result = await services.initPayment(
      pool,
      { customerId: 1, role: 'customer' },
      { order_id: 1, amount: 10000, method: 'mpesa', idempotency_key: 'key7', phone: '0712345678' }
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe(202);
    expect(result.code).toBe('initiation_uncertain');
    expect(result.retry).toBe('verify');
    // Without this the buyer is told to verify a payment that does not exist.
    expect(result.payment_id).toBe(77);
  });

  it('re-issues the request when a prior attempt for the key was never confirmed', async () => {
    const pool = mockPool();
    const conn = pool._conn;
    const services = svc(pool);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'ntzs_real_78', status: 'submitted' }),
    }));

    const updates = [];
    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders'))
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      if (sql.includes('WHERE idempotency_key = ?'))
        return [[{
          id: 78,
          provider_ref: null,
          status: 'pending',
          next_action: null,
          order_id: 1,
          provider: 'ntzs',
          metadata: JSON.stringify({ initiation_uncertain: true }),
        }]];
      if (sql.includes('UPDATE payment_transactions') && sql.includes('provider_ref = ?')) {
        updates.push(sql);
        return [[]];
      }
      if (sql.includes('INSERT INTO payment_transactions')) return [{ insertId: 999 }];
      if (sql.includes('UPDATE payment_transactions SET receipt_url')) return [[]];
      return [[]];
    });
    conn.query.mockResolvedValue([[]]);

    const result = await services.initPayment(
      pool,
      { customerId: 1, role: 'customer' },
      { order_id: 1, amount: 10000, method: 'mpesa', idempotency_key: 'key8', phone: '0712345678' }
    );

    expect(result.success).toBe(true);
    // Same row promoted with the confirmed ref, not a second row on a unique key.
    expect(result.payment_id).toBe(78);
    expect(result.provider_ref).toBe('ntzs_real_78');
    expect(updates.length).toBe(1);
  });

  it('passes an upstream rejection status and code through instead of flattening it', async () => {
    const pool = mockPool();
    const services = svc(pool);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'userId and amountTzs are required' }),
    }));

    pool.query.mockImplementation((sql) => {
      if (sql.includes('SELECT * FROM orders'))
        return [[{ id: 1, order_number: 'ORD-001', status: 'pending_payment' }]];
      if (sql.includes('WHERE idempotency_key = ?')) return [[]];
      return [[]];
    });

    const result = await services.initPayment(
      pool,
      { customerId: 1, role: 'customer' },
      { order_id: 1, amount: 10000, method: 'mpesa', idempotency_key: 'key9', phone: '0712345678' }
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.code).toBe('userId and amountTzs are required');
  });
});

describe('payments.handleWebhook', () => {
  let originalKey, originalSecret;

  beforeEach(() => {
    originalKey = process.env.NTZS_API_KEY;
    originalSecret = process.env.NTZS_WEBHOOK_SECRET;
    process.env.NTZS_API_KEY = 'ntzs_live_webhook_test_key';
    process.env.NTZS_WEBHOOK_SECRET = 'test_secret_123';
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.NTZS_API_KEY;
    else process.env.NTZS_API_KEY = originalKey;
    if (originalSecret === undefined) delete process.env.NTZS_WEBHOOK_SECRET;
    else process.env.NTZS_WEBHOOK_SECRET = originalSecret;
  });

  function signWebhook(bodyString, secret = 'test_secret_123') {
    const crypto = require('crypto');
    const timestamp = '1234567890';
    const signedPayload = `${timestamp}.${bodyString}`;
    const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    return { signature, timestamp };
  }

  it('rejects unknown provider', async () => {
    const pool = mockPool();
    const services = svc(pool);
    const result = await services.handleWebhook(pool, 'unknown', {}, '{}', {});
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it('rejects when webhook secret not configured', async () => {
    delete process.env.NTZS_WEBHOOK_SECRET;

    const pool = mockPool();
    const services = svc(pool);
    const body = JSON.stringify({ id: 'x', status: 'completed' });
    const result = await services.handleWebhook(
      pool,
      'ntzs',
      { id: 'x', status: 'completed' },
      body,
      { 'x-webhook-signature': 'sig', 'x-webhook-timestamp': '123' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it('returns idempotent success for unknown payment ref', async () => {
    const pool = mockPool();
    const conn = pool._conn;
    const services = svc(pool);
    pool.query.mockResolvedValue([[]]);
    conn.query.mockResolvedValue([[]]);

    const body = JSON.stringify({ id: 'unknown123', status: 'completed' });
    const { signature, timestamp } = signWebhook(body);

    const result = await services.handleWebhook(
      pool,
      'ntzs',
      { id: 'unknown123', status: 'completed' },
      body,
      { 'x-webhook-signature': signature, 'x-webhook-timestamp': timestamp }
    );

    expect(result.ok).toBe(true);
    expect(result.idempotent).toBe(true);
  });

  it('updates payment status on completed payment (no escrow release)', async () => {
    const pool = mockPool();
    const conn = pool._conn;
    const services = svc(pool);

    pool.query.mockImplementation((sql) => {
      if (
        sql.includes('SELECT id, order_id') &&
        sql.includes('payment_transactions WHERE provider_ref')
      ) {
        return [
          [
            {
              id: 1,
              order_id: 10,
              customer_id: 5,
              amount: 10000,
              status: 'pending',
              provider: 'ntzs',
            },
          ],
        ];
      }
      if (sql.includes('UPDATE payment_transactions SET status')) return [[]];
      return [[]];
    });
    conn.query.mockImplementation((sql) => {
      if (sql.includes('UPDATE payment_transactions SET status')) return [[]];
      return [[]];
    });

    const body = JSON.stringify({ id: 'ntzs_123', status: 'completed', amountTzs: 10000 });
    const { signature, timestamp } = signWebhook(body);

    const result = await services.handleWebhook(
      pool,
      'ntzs',
      { id: 'ntzs_123', status: 'completed', amountTzs: 10000 },
      body,
      { 'x-webhook-signature': signature, 'x-webhook-timestamp': timestamp }
    );

    expect(result.ok).toBe(true);
    expect(result.updated_status).toBe('completed');
  });

  it('skips if payment already completed (idempotent)', async () => {
    const pool = mockPool();
    const services = svc(pool);

    pool.query.mockImplementation((sql) => {
      if (
        sql.includes('SELECT id, order_id') &&
        sql.includes('payment_transactions WHERE provider_ref')
      ) {
        return [
          [
            {
              id: 1,
              order_id: 10,
              customer_id: 5,
              amount: 10000,
              status: 'completed',
              provider: 'ntzs',
            },
          ],
        ];
      }
      return [[]];
    });

    const body = JSON.stringify({ id: 'ntzs_123', status: 'completed' });
    const { signature, timestamp } = signWebhook(body);

    const result = await services.handleWebhook(
      pool,
      'ntzs',
      { id: 'ntzs_123', status: 'completed' },
      body,
      { 'x-webhook-signature': signature, 'x-webhook-timestamp': timestamp }
    );

    expect(result.ok).toBe(true);
    expect(result.idempotent).toBe(true);
  });

  it('verifies HMAC signature with raw Buffer body', async () => {
    const crypto = require('crypto');
    const body = JSON.stringify({ id: 'ntzs_123', status: 'completed', amountTzs: 10000 });
    const timestamp = '1234567890';
    const signedPayload = `${timestamp}.${body}`;
    const signature = crypto.createHmac('sha256', 'test_secret_123').update(signedPayload).digest('hex');

    const pool = mockPool();
    const conn = pool._conn;
    const services = svc(pool);

    pool.query.mockImplementation((sql) => {
      if (
        sql.includes('SELECT id, order_id') &&
        sql.includes('payment_transactions WHERE provider_ref')
      ) {
        return [
          [
            {
              id: 1,
              order_id: 10,
              customer_id: 5,
              amount: 10000,
              status: 'pending',
              provider: 'ntzs',
            },
          ],
        ];
      }
      if (sql.includes('UPDATE payment_transactions SET status')) return [[]];
      return [[]];
    });
    conn.query.mockImplementation((sql) => {
      if (sql.includes('UPDATE payment_transactions SET status')) return [[]];
      return [[]];
    });

    const result = await services.handleWebhook(
      pool,
      'ntzs',
      { id: 'ntzs_123', status: 'completed', amountTzs: 10000 },
      Buffer.from(body, 'utf8'),
      { 'x-webhook-signature': signature, 'x-webhook-timestamp': timestamp }
    );

    expect(result.ok).toBe(true);
    expect(result.updated_status).toBe('completed');
  });

  it('rejects invalid HMAC signature', async () => {
    const body = JSON.stringify({ id: 'ntzs_123', status: 'completed' });

    const pool = mockPool();
    const services = svc(pool);

    const result = await services.handleWebhook(
      pool,
      'ntzs',
      { id: 'ntzs_123', status: 'completed' },
      Buffer.from(body, 'utf8'),
      { 'x-webhook-signature': 'invalid_signature', 'x-webhook-timestamp': '1234567890' }
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });
});

describe('payments.pollPaymentStatus', () => {
  it('returns 404 when payment not found', async () => {
    const pool = mockPool();
    const services = svc({});
    pool.query.mockResolvedValue([[]]);

    const auth = { customerId: 1, role: 'customer' };
    const result = await services.pollPaymentStatus(pool, auth, 999);

    expect(result.success).toBe(false);
    expect(result.status).toBe(404);
  });

  it('returns cash payment status (COD without NTZS call)', async () => {
    const pool = mockPool();
    const services = svc({});
    pool.query.mockResolvedValue([
      [
        {
          id: 1,
          order_id: 10,
          amount: 5000,
          payment_method: 'cash',
          provider_ref: 'COD_ABC',
          status: 'pending',
        },
      ],
    ]);

    const auth = { customerId: 1, role: 'customer' };
    const result = await services.pollPaymentStatus(pool, auth, 1);

    expect(result.success).toBe(true);
    expect(result.method).toBe('cash');
  });
});

describe('payments.approveCodPayment', () => {
  it('rejects non-finance roles', async () => {
    const pool = mockPool();
    const services = svc({});
    const auth = { customerId: 1, role: 'customer' };
    const result = await services.approveCodPayment(pool, auth, 1);
    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
  });

  it('returns 404 when COD payment not found', async () => {
    const pool = mockPool();
    const services = svc({});
    pool.query.mockResolvedValue([[]]);
    const auth = { customerId: 1, role: 'finance_admin' };
    const result = await services.approveCodPayment(pool, auth, 999);
    expect(result.success).toBe(false);
    expect(result.status).toBe(404);
  });
});

describe('payments.getReceipt', () => {
  it('returns 404 when payment not found', async () => {
    const pool = mockPool();
    const services = svc({});
    pool.query.mockResolvedValue([[]]);
    const result = await services.getReceipt(pool, 999);
    expect(result.success).toBe(false);
    expect(result.status).toBe(404);
  });

  it('returns receipt when found', async () => {
    const pool = mockPool();
    const services = svc({});
    pool.query.mockResolvedValue([
      [
        {
          id: 1,
          order_id: 10,
          amount: 10000,
          payment_method: 'mobile_money',
          transaction_ref: 'ntzs_123',
          provider_ref: 'ntzs_123',
          provider: 'ntzs',
          status: 'completed',
          created_at: new Date(),
          metadata: '{}',
          order_number: 'ORD-001',
          total_amount: 10000,
          shipping_address: '123 Main St',
          customer_name: 'John',
          customer_email: 'j@e.com',
        },
      ],
    ]);

    const result = await services.getReceipt(pool, 1);
    expect(result.success).toBe(true);
    expect(result.receipt.id).toBe(1);
    expect(result.receipt.provider).toBe('ntzs');
  });
});

describe('payments.getStatus', () => {
  it('returns 404 when payment not found', async () => {
    const pool = mockPool();
    const services = svc({});
    pool.query.mockResolvedValue([[]]);
    const result = await services.getStatus(pool, 999, 1);
    expect(result.success).toBe(false);
    expect(result.status).toBe(404);
  });

  it('returns status when found', async () => {
    const pool = mockPool();
    const services = svc({});
    pool.query.mockResolvedValue([
      [
        {
          id: 1,
          order_id: 10,
          amount: 10000,
          payment_method: 'mobile_money',
          provider_ref: 'ntzs_123',
          status: 'pending',
          next_action: JSON.stringify({ type: 'ntzs_mobile_money_prompt', phone: '+255712345678' }),
        },
      ],
    ]);

    const result = await services.getStatus(pool, 1, 1);
    expect(result.success).toBe(true);
    expect(result.payment_id).toBe(1);
    expect(result.method).toBe('mobile_money');
    expect(result.next_action.type).toBe('ntzs_mobile_money_prompt');
  });
});
