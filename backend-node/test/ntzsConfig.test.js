/**
 * nTZS configuration guard tests.
 *
 * The point of the guard is that these misconfigurations are invisible until
 * money is involved, so they have to be caught at boot, not at checkout.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { checkConfiguration, LEVELS } = require('../services/ntzs/configCheck');

const HEALTHY = {
  NODE_ENV: 'test',
  NTZS_API_KEY: 'ntzs_test_0123456789abcdefghij',
  NTZS_WEBHOOK_SECRET: 'whsec_test',
  // UUIDs, because that is the shape nTZS issues holders in.
  NTZS_COLLECTION_USER_ID: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  NTZS_FUNDING_USER_ID: '11111111-2222-3333-4444-555555555555',
};

const codes = (result) => result.issues.map((issue) => issue.code);

describe('nTZS configuration guard', () => {
  it('passes cleanly with a sandbox key and both holders configured', () => {
    const result = checkConfiguration(HEALTHY);
    expect(result.ok).toBe(true);
    expect(result.test).toBe(true);
    expect(result.live).toBe(false);
    expect(result.issues).toHaveLength(0);
  });

  it('shouts about a live key outside production — that is the default failure', () => {
    const result = checkConfiguration({ ...HEALTHY, NODE_ENV: 'development', NTZS_API_KEY: 'ntzs_live_0123456789abcdefgh' });
    expect(result.live).toBe(true);
    expect(codes(result)).toContain('live_key');
    const issue = result.issues.find((i) => i.code === 'live_key');
    expect(issue.level).toBe(LEVELS.ERROR);
  });

  it('only warns about a live key in production, where it is intended', () => {
    const result = checkConfiguration({ ...HEALTHY, NODE_ENV: 'production', NTZS_API_KEY: 'ntzs_live_0123456789abcdefgh' });
    const issue = result.issues.find((i) => i.code === 'live_key');
    expect(issue.level).toBe(LEVELS.WARN);
  });

  it('refuses a test key in production', () => {
    const result = checkConfiguration({ ...HEALTHY, NODE_ENV: 'production' });
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain('test_key_in_production');
  });

  it('flags a missing API key as an error', () => {
    const result = checkConfiguration({ ...HEALTHY, NTZS_API_KEY: 'ntzs_test_YOUR_REAL_TEST_KEY' });
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain('missing_api_key');
  });

  it('flags a missing webhook secret — unsigned webhooks are refused, not trusted', () => {
    const result = checkConfiguration({ ...HEALTHY, NTZS_WEBHOOK_SECRET: '' });
    expect(result.ok).toBe(false);
    expect(codes(result)).toContain('missing_webhook_secret');
  });

  it('says nothing about empty holder vars — they are optional overrides now', () => {
    const result = checkConfiguration({ ...HEALTHY, NTZS_COLLECTION_USER_ID: '', NTZS_FUNDING_USER_ID: '' });

    // v1.28.0 ties the treasury to the API key, so an unset holder is the normal
    // configuration, not a gap to report.
    expect(codes(result)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('does not invent holder warnings when there is no key at all', () => {
    const result = checkConfiguration({ NODE_ENV: 'test' });
    expect(codes(result)).toEqual(['missing_api_key', 'missing_webhook_secret']);
  });

  it('reports an EVM address used as a holder id instead of a dashboard userId', () => {
    const address = '0xF476BA983DE2F1AD532380630e2CF1D1b8b10688';
    const result = checkConfiguration({
      ...HEALTHY,
      NTZS_COLLECTION_USER_ID: address,
      NTZS_FUNDING_USER_ID: address,
    });

    expect(codes(result)).toEqual(expect.arrayContaining(['address_collection_holder', 'address_funding_holder']));
    // A deliberate provider-side configuration is reported, not blocked on:
    // whether the provider accepts it is only knowable from a live call.
    for (const code of ['address_collection_holder', 'address_funding_holder']) {
      expect(result.issues.find((i) => i.code === code).level).toBe(LEVELS.WARN);
    }
    expect(result.ok).toBe(true);
  });

  it('accepts the same value in the settlement address slot', () => {
    const result = checkConfiguration({
      ...HEALTHY,
      NTZS_TREASURY_SETTLEMENT_ADDRESS: '0xF44A0b9812064de033cf4CcA9aED21d4c2494eA8',
    });
    expect(result.ok).toBe(true);
  });

  it('flags a holder that is not a UUID, such as an API key', () => {
    const result = checkConfiguration({
      ...HEALTHY,
      NTZS_COLLECTION_USER_ID: 'ntzs_live_80d72f887b6dfc4698cf7f3885f93f6c0b18eb65',
    });

    // nTZS types a deposit holder as a UUID; a bearer token is not one, and
    // this value was rejected by the provider when tried live.
    expect(codes(result)).toContain('malformed_collection_holder');
    expect(result.ok).toBe(true);
  });

  it('accepts a UUID holder without complaint', () => {
    const uuid = '11111111-2222-3333-4444-555555555555';
    const result = checkConfiguration({
      ...HEALTHY,
      NTZS_COLLECTION_USER_ID: uuid,
      NTZS_FUNDING_USER_ID: uuid,
    });
    expect(result.issues).toHaveLength(0);
  });
});
