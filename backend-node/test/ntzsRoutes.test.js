/**
 * nTZS route wiring tests.
 *
 * These exist because of a bug the service-level tests could not see: the
 * sub-account route called `treasury.createSubWallet` after the function was
 * renamed, so every service test passed and the endpoint still returned
 * `treasury.createSubWallet is not a function`. Nothing checked the route
 * handler itself.
 *
 * So these mount the real router — real auth, role and CSRF middleware — against
 * a fake pool on an ephemeral port, and call it over HTTP. That covers the seam
 * between a route and the service function it calls, which is exactly where a
 * rename breaks. No live nTZS call and no fixed port, so it cannot collide with
 * a running dev server.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import express from 'express';
import { createFakePool } from './helpers/fakePool';

const require = createRequire(import.meta.url);
const jwt = require('jsonwebtoken');
const { generateCSRFToken } = require('../middleware/csrf');

const UNIQUE_KEYS = {
  ntzs_collections: ['idempotency_key'],
  ntzs_payouts: ['idempotency_key'],
  ntzs_bills: ['idempotency_key'],
  ntzs_webhook_events: ['event_id'],
  ntzs_treasury_ledger: ['idempotency_key'],
};

let server;
let base;
let token;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-route-wiring';
  token = jwt.sign({ customerId: 1, role: 'superadmin' }, process.env.JWT_SECRET, { expiresIn: '5m' });

  const app = express();
  app.use(express.json());
  app.use('/api/ntzs', require('../routes/ntzs')(createFakePool({ uniqueKeys: UNIQUE_KEYS })));

  // Port 0: never collides with a dev server or another test file.
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api/ntzs`;
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

const post = (path, body) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': generateCSRFToken(),
    },
    body: JSON.stringify(body),
  });

describe('nTZS route wiring', () => {
  it('creates a sub-account through the route, calling the service by its real name', async () => {
    const res = await post('/treasury/sub-accounts', {
      label: 'Mwanza branch',
      openingBalanceTzs: 25000,
    });
    const body = await res.json();

    // A stale method name on `treasury` fails here, not silently in a unit test.
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.account).toMatchObject({
      label: 'Mwanza branch',
      kind: 'sub_account',
      balanceTzs: 25000,
      availableTzs: 25000,
    });
  });

  it('no longer answers the old sub-wallet path', async () => {
    const res = await post('/treasury/sub-wallets', { label: 'stale path' });
    expect(res.status).toBe(404);
  });

  it('refuses a caller that is not a finance role', async () => {
    const customer = jwt.sign(
      { customerId: 2, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    const res = await fetch(`${base}/treasury/sub-accounts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customer}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': generateCSRFToken(),
      },
      body: JSON.stringify({ label: 'nope' }),
    });

    expect(res.status).toBe(403);
  });

  it('refuses a request with no CSRF token', async () => {
    const res = await fetch(`${base}/treasury/sub-accounts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'nope' }),
    });

    expect(res.status).toBe(403);
  });

  it('reports treasury reads for the caller without reaching nTZS', async () => {
    const res = await fetch(`${base}/treasury`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body.accounts)).toBe(true);
  });
});
