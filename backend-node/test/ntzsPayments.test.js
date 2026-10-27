/**
 * nTZS orchestration tests — collections, disbursements, bills, treasury.
 *
 * These run against a fake pool and a stubbed fetch, so the lifecycle can be
 * driven to completion with no money and no chain, exactly like the sandbox.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
import { createFakePool } from './helpers/fakePool';

const require = createRequire(import.meta.url);

vi.stubGlobal('fetch', vi.fn());

process.env.NTZS_API_BASE = 'https://sandbox.ntzs.test/api/v1';
process.env.NTZS_API_KEY = 'ntzs_test_0123456789abcdefghijklmnop';
process.env.NTZS_FUNDING_USER_ID = '11111111-2222-3333-4444-555555555555';

const UNIQUE_KEYS = {
  ntzs_collections: ['idempotency_key'],
  ntzs_payouts: ['idempotency_key'],
  ntzs_bills: ['idempotency_key'],
  ntzs_webhook_events: ['event_id'],
  ntzs_treasury_ledger: ['idempotency_key'],
};

function jsonResponse(status, body, headers = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => lower[name.toLowerCase()] ?? null },
    text: async () => JSON.stringify(body),
  };
}

/** Respond by URL suffix so a test can drive a whole lifecycle in order. */
function respondByPath(routes) {
  fetch.mockImplementation(async (...args) => {
    const [url, options = {}] = args;
    // Vitest's own teardown can poke the stubbed global with no arguments;
    // only a real call has a URL to route.
    if (typeof url !== 'string') return jsonResponse(204, {});
    const key = Object.keys(routes).find((suffix) => url.endsWith(suffix));
    if (!key) throw new Error(`unexpected nTZS call: ${url}`);
    const handler = routes[key];
    const body = typeof handler === 'function' ? handler(options) : handler;
    return jsonResponse(body.status || 200, body.body ?? body, body.headers);
  });
}

function newPool() {
  return createFakePool({ uniqueKeys: UNIQUE_KEYS });
}

function load(pool) {
  delete require.cache[require.resolve('../services/ntzsPayments')];
  return require('../services/ntzsPayments')(pool);
}

function treasuryOf(pool) {
  return require('../services/ntzsTreasury')(pool);
}

async function treasuryBalance(pool) {
  const t = treasuryOf(pool);
  const account = await t.ensureDefaultAccount(pool);
  return Number(account.balance_tzs || 0);
}

describe('collections', () => {
  // These tests assert on the deposit body, so the holder must not depend on
  // whatever a developer's local .env happens to say (setup.js loads it).
  const realCollectionHolder = process.env.NTZS_COLLECTION_USER_ID;

  beforeEach(() => {
    fetch.mockReset();
    process.env.NTZS_COLLECTION_USER_ID = '';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (realCollectionHolder === undefined) delete process.env.NTZS_COLLECTION_USER_ID;
    else process.env.NTZS_COLLECTION_USER_ID = realCollectionHolder;
  });

  it('collects into the treasury without a userId and stores the provider reference', async () => {
    respondByPath({
      '/deposits': { status: 201, body: { id: 'dep-1', status: 'submitted', amountTzs: 25000, instructions: 'Approve on your phone' } },
    });
    const pool = newPool();
    const svc = load(pool);

    const result = await svc.createCollection(pool, { customerId: 7 }, {
      amountTzs: 25000,
      phoneNumber: '0712345678',
      idempotencyKey: 'order-42-collect',
    });

    const call = fetch.mock.calls[0];
    expect(JSON.parse(call[1].body).userId).toBeUndefined();
    expect(call[1].headers['Idempotency-Key']).toBe('order-42-collect');
    expect(result.collection.providerId).toBe('dep-1');
    // 'submitted' means the prompt is out and awaiting the payer.
    expect(result.collection.status).toBe('submitted');
    expect(result.collection.instructions).toBe('Approve on your phone');
  });

  it('names the configured holder on the deposit when one is set', async () => {
    respondByPath({
      '/deposits': { status: 201, body: { id: 'dep-2', status: 'submitted', amountTzs: 25000 } },
    });
    process.env.NTZS_COLLECTION_USER_ID = 'collection-holder-abc';
    const pool = newPool();
    const svc = load(pool);

    await svc.createCollection(pool, { customerId: 7 }, {
      amountTzs: 25000,
      phoneNumber: '0712345678',
      idempotencyKey: 'k-holder-sent',
    });

    // The deployed API rejects a deposit with no userId, so it must be sent.
    expect(JSON.parse(fetch.mock.calls[0][1].body).userId).toBe('collection-holder-abc');
  });

  it('replaying an idempotency key returns the original collection and calls nothing', async () => {
    respondByPath({
      '/deposits': { status: 201, body: { id: 'dep-1', status: 'submitted', amountTzs: 25000 } },
    });
    const pool = newPool();
    const svc = load(pool);

    const first = await svc.createCollection(pool, { customerId: 7 }, { amountTzs: 25000, phoneNumber: '0712345678', idempotencyKey: 'k1' });
    fetch.mockClear();
    const second = await svc.createCollection(pool, { customerId: 7 }, { amountTzs: 25000, phoneNumber: '0712345678', idempotencyKey: 'k1' });

    expect(second.idempotent).toBe(true);
    expect(second.collection.id).toBe(first.collection.id);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a 502 initiation_uncertain is persisted and reported as verify, never retried', async () => {
    respondByPath({
      '/deposits': { status: 502, body: { code: 'initiation_uncertain', message: 'delivery unconfirmed' } },
    });
    const pool = newPool();
    const svc = load(pool);

    const result = await svc.createCollection(pool, { customerId: 7 }, {
      amountTzs: 25000,
      phoneNumber: '0712345678',
      idempotencyKey: 'k-uncertain',
    });

    expect(result.status).toBe(202);
    expect(result.code).toBe('initiation_uncertain');
    expect(result.retry).toBe('verify');
  });

  it('names an unusable collection holder instead of leaking an opaque 500', async () => {
    respondByPath({
      '/deposits': { status: 500, body: { error: 'Internal Server Error' } },
    });
    process.env.NTZS_COLLECTION_USER_ID = '0xF476BA983DE2F1AD532380630e2CF1D1b8b10688';
    const pool = newPool();
    const svc = load(pool);

    // The provider 500s on a userId it does not recognise, which is otherwise
    // indistinguishable from an outage and only visible when a buyer pays.
    await expect(
      svc.createCollection(
        pool,
        { customerId: 7 },
        { amountTzs: 25000, phoneNumber: '0712345678', idempotencyKey: 'k-holder' }
      )
    ).rejects.toMatchObject({ code: 'collection_holder_unknown', retry: 'no' });
  });

  it('settles once when the collection completes, and never twice', async () => {
    respondByPath({
      '/deposits': { status: 201, body: { id: 'dep-1', status: 'pending', amountTzs: 25000 } },
      '/deposits/dep-1': { status: 200, body: { id: 'dep-1', status: 'completed', amountTzs: 25000 } },
    });
    const pool = newPool();
    const svc = load(pool);

    const created = await svc.createCollection(pool, { customerId: 7 }, {
      amountTzs: 25000,
      phoneNumber: '0712345678',
      idempotencyKey: 'k-settle',
    });
    expect(await treasuryBalance(pool)).toBe(0);

    const synced = await svc.syncCollection(pool, created.collection.id);
    expect(synced.collection.status).toBe('completed');
    expect(await treasuryBalance(pool)).toBe(25000);

    // A second sync (or a duplicate webhook) must not double-count.
    await svc.syncCollection(pool, created.collection.id);
    expect(await treasuryBalance(pool)).toBe(25000);
  });

  it('does not credit the treasury when the collection fails', async () => {
    respondByPath({
      '/deposits': { status: 201, body: { id: 'dep-2', status: 'pending', amountTzs: 5000 } },
      '/deposits/dep-2': { status: 200, body: { id: 'dep-2', status: 'failed', amountTzs: 5000 } },
    });
    const pool = newPool();
    const svc = load(pool);
    const created = await svc.createCollection(pool, {}, { amountTzs: 5000, phoneNumber: '0712345678', idempotencyKey: 'k-fail' });
    await svc.syncCollection(pool, created.collection.id);
    expect(await treasuryBalance(pool)).toBe(0);
  });
});

describe('disbursements', () => {
  beforeEach(() => fetch.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it('returns the quote verbatim with the recipient name from the fail-soft lookup', async () => {
    respondByPath({
      '/withdrawals/quote': {
        status: 200,
        body: { quoteId: 'q-1', expiresAt: '2026-10-02T00:00:00Z', receiveAmountTzs: 50000, totalFeeTzs: 1500, payoutRail: 'mobile_money' },
      },
      '/lookup/recipient-name': { status: 200, body: { phone: '255712345678', network: 'vodacom', name: 'JOHN DOE' } },
    });
    const pool = newPool();
    const svc = load(pool);

    const quote = await svc.quotePayout(pool, { amountTzs: 50000, phoneNumber: '0712345678' });
    expect(quote.quoteId).toBe('q-1');
    expect(quote.totalFeeTzs).toBe(1500);
    expect(quote.totalTzs).toBe(51500);
    expect(quote.recipientName).toBe('JOHN DOE');
    expect(quote.recipientConfirmed).toBe(true);
  });

  it('a null quoteId is reported as insufficient balance, not an error to retry', async () => {
    respondByPath({
      '/withdrawals/quote': { status: 200, body: { quoteId: null, receiveAmountTzs: 50000, totalFeeTzs: 1500 } },
      '/lookup/recipient-name': { status: 200, body: { name: null } },
    });
    const pool = newPool();
    const svc = load(pool);
    const quote = await svc.quotePayout(pool, { amountTzs: 50000, phoneNumber: '0712345678' });
    expect(quote.insufficientBalance).toBe(true);
    expect(quote.recipientName).toBeNull();
    expect(quote.recipientConfirmed).toBe(false);
  });

  it('never takes a funding source from the request — the treasury funds it', async () => {
    const sent = [];
    respondByPath({
      '/withdrawals/quote': (options) => {
        sent.push(JSON.parse(options.body).userId);
        return { status: 200, body: { quoteId: 'q-x', receiveAmountTzs: 50000, totalFeeTzs: 1500 } };
      },
      '/lookup/recipient-name': { status: 200, body: { name: null } },
    });
    const pool = newPool();
    const svc = load(pool);

    await svc.quotePayout(pool, { amountTzs: 50000, phoneNumber: '0712345678', fundingSource: 'usr-victim-999' });

    // A caller-supplied id would spend a balance belonging to someone else.
    expect(sent).toEqual([process.env.NTZS_FUNDING_USER_ID]);
  });

  it('a stale quote is a hard failure with no treasury movement', async () => {
    respondByPath({
      '/withdrawals': { status: 409, body: { error: 'quote_stale', message: 'Pricing moved since the quote was issued' } },
    });
    const pool = newPool();
    const svc = load(pool);
    await expect(
      svc.createPayout(pool, { customerId: 1 }, { amountTzs: 50000, quoteId: 'q-old', phoneNumber: '0712345678', idempotencyKey: 'p-stale' })
    ).rejects.toMatchObject({ code: 'quote_stale', status: 409 });
    expect(await treasuryBalance(pool)).toBe(0);
  });

  it('holds funds while in flight and debits the treasury when paid', async () => {
    respondByPath({
      // Fund the treasury with a completed collection.
      '/deposits': { status: 201, body: { id: 'dep-9', status: 'completed', amountTzs: 100000 } },
      '/withdrawals/wd-1': { status: 200, body: { id: 'wd-1', status: 'paid', totalFeeTzs: 1500 } },
      '/withdrawals': { status: 202, body: { id: 'wd-1', status: 'pending', totalFeeTzs: 1500, recipientName: 'JOHN DOE' } },
    });
    const pool = newPool();
    const svc = load(pool);

    await svc.createCollection(pool, {}, { amountTzs: 100000, phoneNumber: '0712345678', idempotencyKey: 'fund' });
    expect(await treasuryBalance(pool)).toBe(100000);

    const payout = await svc.createPayout(pool, { customerId: 1 }, {
      amountTzs: 50000,
      quoteId: 'q-1',
      phoneNumber: '0712345678',
      idempotencyKey: 'p-1',
    });
    expect(payout.payout.status).toBe('pending');
    expect(payout.inFlight).toBe(true);
    // Funds are held, not yet spent.
    expect(await treasuryBalance(pool)).toBe(100000);

    await svc.syncPayout(pool, payout.payout.id);
    // 50,000 net + 1,500 fee = 51,500 debited.
    expect(await treasuryBalance(pool)).toBe(48500);
  });

  it('releases the hold when a payout is reverted', async () => {
    respondByPath({
      '/deposits': { status: 201, body: { id: 'dep-9', status: 'completed', amountTzs: 100000 } },
      '/withdrawals': { status: 202, body: { id: 'wd-2', status: 'pending', totalFeeTzs: 1000 } },
      '/withdrawals/wd-2': { status: 200, body: { id: 'wd-2', status: 'reverted', totalFeeTzs: 1000 } },
    });
    const pool = newPool();
    const svc = load(pool);
    await svc.createCollection(pool, {}, { amountTzs: 100000, phoneNumber: '0712345678', idempotencyKey: 'fund2' });

    const payout = await svc.createPayout(pool, { customerId: 1 }, {
      amountTzs: 50000,
      quoteId: 'q-2',
      phoneNumber: '0712345678',
      idempotencyKey: 'p-2',
    });
    await svc.syncPayout(pool, payout.payout.id);
    expect(await treasuryBalance(pool)).toBe(100000);
  });

  it('a bulk run prices nothing itself and reports per-item outcomes', async () => {
    respondByPath({
      '/deposits': { status: 201, body: { id: 'dep-bulk', status: 'completed', amountTzs: 500000 } },
    });
    const pool = newPool();
    const svc = load(pool);
    await svc.createCollection(pool, {}, { amountTzs: 500000, phoneNumber: '0712345678', idempotencyKey: 'fund-bulk' });

    respondByPath({
      '/withdrawals': (options) => {
        const body = JSON.parse(options.body);
        return body.phoneNumber === '255700000000'
          ? { status: 400, body: { error: 'invalid_phone', message: 'not routable' } }
          : { status: 202, body: { id: `wd-${body.quoteId}`, status: 'pending', totalFeeTzs: 500 } };
      },
    });

    const run = await svc.runBulkPayout(pool, { customerId: 1 }, {
      idempotencyKey: 'run-1',
      items: [
        { quoteId: 'q-a', amountTzs: 10000, phoneNumber: '0712000001' },
        { quoteId: 'q-b', amountTzs: 10000, phoneNumber: '0700000000' },
      ],
    });

    expect(run.total).toBe(2);
    expect(run.succeeded + run.failed).toBe(2);
    expect(run.results.map((r) => r.index)).toEqual([0, 1]);
    // A deterministic per-item failure is reported, never silently retried.
    const failed = run.results.find((r) => !r.success);
    expect(failed.code).toBe('invalid_phone');
  });
});

describe('bills', () => {
  beforeEach(() => fetch.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it('prices a till payment and never assumes a fee of zero', async () => {
    respondByPath({
      '/spend/quote': { status: 200, body: { quoteId: 'sq-1', amountTzs: 10000, totalFeeTzs: 500, totalTzs: 10500 } },
    });
    const pool = newPool();
    const svc = load(pool);
    const quote = await svc.quoteBill(pool, { kind: 'lipa', payNumber: '0712345678', amountTzs: 10000 });
    expect(quote.feeTzs).toBe(500);
    expect(quote.totalTzs).toBe(10500);
  });

  it('persists the biller reference, which is what the biller recognises', async () => {
    respondByPath({
      '/deposits': { status: 201, body: { id: 'dep-1', status: 'completed', amountTzs: 50000 } },
      '/spend': { status: 201, body: { id: 'sp-1', status: 'paid', reference: 'LIPA-REF-9988' } },
    });
    const pool = newPool();
    const svc = load(pool);
    await svc.createCollection(pool, {}, { amountTzs: 50000, phoneNumber: '0712345678', idempotencyKey: 'fund-bills' });

    const bill = await svc.createBill(pool, { customerId: 3 }, {
      quoteId: 'sq-1',
      kind: 'lipa',
      payNumber: '0712345678',
      amountTzs: 10000,
      feeTzs: 500,
      totalTzs: 10500,
      idempotencyKey: 'bill-1',
    });

    expect(bill.bill.reference).toBe('LIPA-REF-9988');
    expect(bill.bill.status).toBe('paid');
    expect(await treasuryBalance(pool)).toBe(39500);
  });

  it('till_network_required asks for the network — the burn was reverted', async () => {
    respondByPath({
      '/spend': { status: 502, body: { error: 'till_network_required', message: 'till network unknown' } },
    });
    const pool = newPool();
    const svc = load(pool);
    const result = await svc.createBill(pool, {}, { quoteId: 'sq-2', kind: 'lipa', payNumber: '0712345678', idempotencyKey: 'bill-2' });
    expect(result.status).toBe(502);
    expect(result.code).toBe('till_network_required');
  });
});

describe('treasury ledger', () => {
  beforeEach(() => fetch.mockReset());

  it('applies a movement exactly once per idempotency key', async () => {
    const pool = newPool();
    const t = treasuryOf(pool);
    await t.withTransaction(pool, (conn) => t.ensureDefaultAccount(conn));

    await t.withTransaction(pool, (conn) =>
      t.applyMovement(conn, {
        accountId: 1,
        direction: 'credit',
        amountTzs: 20000,
        entryType: 'adjustment',
        idempotencyKey: 'adj-1',
      })
    );
    await t.withTransaction(pool, (conn) =>
      t.applyMovement(conn, {
        accountId: 1,
        direction: 'credit',
        amountTzs: 20000,
        entryType: 'adjustment',
        idempotencyKey: 'adj-1',
      })
    );

    expect(await treasuryBalance(pool)).toBe(20000);
    const entries = await t.listLedger(pool, {});
    expect(entries).toHaveLength(1);
  });

  it('refuses to overdraw and reports the shortfall', async () => {
    const pool = newPool();
    const t = treasuryOf(pool);
    await t.withTransaction(pool, (conn) => t.ensureDefaultAccount(conn));
    await t.withTransaction(pool, (conn) =>
      t.applyMovement(conn, { accountId: 1, direction: 'credit', amountTzs: 1000, entryType: 'adjustment', idempotencyKey: 'a' })
    );

    await expect(
      t.withTransaction(pool, (conn) =>
        t.applyMovement(conn, { accountId: 1, direction: 'debit', amountTzs: 5000, entryType: 'payout', idempotencyKey: 'b' })
      )
    ).rejects.toMatchObject({ code: 'insufficient_balance' });
    expect(await treasuryBalance(pool)).toBe(1000);
  });

  it('creates a sub-account with an opening balance and its own funding source', async () => {
    const pool = newPool();
    const t = treasuryOf(pool);
    const account = await t.withTransaction(pool, (conn) =>
      t.createSubAccount(conn, { label: 'Mwanza branch', fundingSourceId: 'fund-uuid', openingBalanceTzs: 250000 })
    );
    expect(account.kind).toBe('sub_account');
    expect(account.balanceTzs).toBe(250000);
    expect(account.fundingSourceId).toBe('fund-uuid');
  });
});

describe('webhooks', () => {
  beforeEach(() => fetch.mockReset());
  afterEach(() => vi.restoreAllMocks());

  function signedHeaders(payload) {
    const crypto = require('crypto');
    const body = JSON.stringify(payload);
    const timestamp = '1700000000';
    const signature = crypto
      .createHmac('sha256', process.env.NTZS_WEBHOOK_SECRET)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    return { body, headers: { 'x-webhook-timestamp': timestamp, 'x-webhook-signature': signature } };
  }

  it('rejects an unsigned webhook', async () => {
    process.env.NTZS_WEBHOOK_SECRET = 'whsec_test';
    const pool = newPool();
    const svc = load(pool);
    const result = await svc.handleWebhook(pool, { type: 'deposit.completed' }, {}, '{}');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it('settles a completed collection and ignores a duplicate delivery', async () => {
    process.env.NTZS_WEBHOOK_SECRET = 'whsec_test';
    respondByPath({
      '/deposits': { status: 201, body: { id: 'dep-7', status: 'pending', amountTzs: 30000 } },
    });
    const pool = newPool();
    const svc = load(pool);
    await svc.createCollection(pool, {}, { amountTzs: 30000, phoneNumber: '0712345678', idempotencyKey: 'k-hook' });

    const payload = { id: 'evt-1', type: 'deposit.completed', data: { depositId: 'dep-7', status: 'completed', amountTzs: 30000 } };
    const { body, headers } = signedHeaders(payload);

    const first = await svc.handleWebhook(pool, payload, headers, body);
    expect(first.ok).toBe(true);
    expect(first.idempotent).toBe(false);
    expect(await treasuryBalance(pool)).toBe(30000);

    const second = await svc.handleWebhook(pool, payload, headers, body);
    expect(second.idempotent).toBe(true);
    expect(await treasuryBalance(pool)).toBe(30000);
  });

  it('acknowledges an event for an unknown movement instead of retrying forever', async () => {
    process.env.NTZS_WEBHOOK_SECRET = 'whsec_test';
    const pool = newPool();
    const svc = load(pool);
    const payload = { id: 'evt-unknown', type: 'deposit.completed', data: { depositId: 'dep-nope', status: 'completed' } };
    const { body, headers } = signedHeaders(payload);
    const result = await svc.handleWebhook(pool, payload, headers, body);
    expect(result.ok).toBe(true);
    expect(result.message).toBe('No matching movement');
  });
});

describe('reconcile', () => {
  beforeEach(() => fetch.mockReset());

  it('reads every in-flight movement back and settles it', async () => {
    respondByPath({
      '/deposits': { status: 201, body: { id: 'dep-r', status: 'pending', amountTzs: 15000 } },
      '/deposits/dep-r': { status: 200, body: { id: 'dep-r', status: 'completed', amountTzs: 15000 } },
    });
    const pool = newPool();
    const svc = load(pool);
    await svc.createCollection(pool, {}, { amountTzs: 15000, phoneNumber: '0712345678', idempotencyKey: 'k-rec' });
    expect(await treasuryBalance(pool)).toBe(0);

    const summary = await svc.reconcile(pool);
    expect(summary.collections).toBe(1);
    expect(await treasuryBalance(pool)).toBe(15000);
  });
});

describe('status normalization', () => {
  it('maps provider statuses onto the local vocabulary', () => {
    const svc = load(newPool());
    expect(svc.normalizeCollectionStatus('success')).toBe('completed');
    expect(svc.normalizeCollectionStatus('manual_review')).toBe('review');
    expect(svc.normalizeCollectionStatus('submitted')).toBe('submitted');
    expect(svc.normalizePayoutStatus('reversal')).toBe('reverted');
    expect(svc.normalizePayoutStatus('settled')).toBe('paid');
    expect(svc.normalizeBillStatus('completed')).toBe('paid');
    expect(svc.normalizeBillStatus('nonsense')).toBe('pending');
  });
});