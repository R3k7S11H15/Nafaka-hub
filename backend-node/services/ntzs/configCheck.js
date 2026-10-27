/**
 * nTZS configuration check.
 *
 * The failure modes this catches are the ones that are invisible until money is
 * involved: a live key where a sandbox key was meant to be, a missing funding
 * holder, or a webhook secret that silently rejects every inbound event.
 *
 * Read-only: nothing here calls the API or mutates configuration.
 */

const LEVELS = { ERROR: 'error', WARN: 'warn', INFO: 'info' };

/**
 * An EVM address (`0x` + 40 hex chars) is not the shape nTZS issues holders in
 * — dashboard user ids are. An address here is therefore unverified: the
 * provider publishes a contract address as its supply identity, so this is a
 * deliberate configuration, but nothing confirms the provider will accept it as
 * the `userId` on a deposit. Reported, never blocked on; a wrong holder fails
 * fast as `collection_holder_unknown`.
 */
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/**
 * The published contract types a deposit's `userId` as a UUID, so anything else
 * is a value the provider will reject — verified live: the provider's own
 * contract address, our settlement address and the API key all draw a bare 500.
 * Catching it at boot costs nothing; catching it at checkout costs a buyer.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @returns {{ ok: boolean, live: boolean, test: boolean, issues: Array<{level: string, code: string, message: string}> }}
 */
function checkConfiguration(env = process.env) {
  const issues = [];
  const key = env.NTZS_API_KEY || '';
  const isPlaceholder = !key || key.includes('YOUR_') || key.length < 20;
  const live = key.startsWith('ntzs_live_');
  const test = key.startsWith('ntzs_test_');
  const isProduction = env.NODE_ENV === 'production';

  if (isPlaceholder) {
    issues.push({
      level: LEVELS.ERROR,
      code: 'missing_api_key',
      message: 'NTZS_API_KEY is not configured. Every nTZS call will fail with configuration_error.',
    });
  }

  if (live) {
    issues.push({
      level: isProduction ? LEVELS.WARN : LEVELS.ERROR,
      code: 'live_key',
      message: isProduction
        ? 'NTZS_API_KEY is a live key — every call moves real money.'
        : 'NTZS_API_KEY is a live key while NODE_ENV is not production. A test key mirrors the same lifecycle with no money and no chain.',
    });
  }

  if (test && isProduction) {
    issues.push({
      level: LEVELS.ERROR,
      code: 'test_key_in_production',
      message: 'NTZS_API_KEY is a test key in production — no money will ever move.',
    });
  }

  if (!env.NTZS_WEBHOOK_SECRET) {
    issues.push({
      level: LEVELS.ERROR,
      code: 'missing_webhook_secret',
      message: 'NTZS_WEBHOOK_SECRET is not set. Inbound nTZS webhooks are refused rather than trusted unsigned.',
    });
  }

  /*
   * As of API v1.28.0 no holder ids are required: the treasury is tied to the
   * API key, collections carry `endUser`, and outbound movements pay from the
   * treasury float. The holder variables are optional overrides, so only a
   * malformed one is worth reporting — and only once a real key is present.
   */
  if (live || test) {
    for (const [name, code] of [
      ['NTZS_COLLECTION_USER_ID', 'address_collection_holder'],
      ['NTZS_FUNDING_USER_ID', 'address_funding_holder'],
    ]) {
      const value = (env[name] || '').trim();
      if (value && EVM_ADDRESS.test(value)) {
        issues.push({
          level: LEVELS.WARN,
          code,
          message: `${name} is set to an EVM address (${value}). Holders are nTZS user ids, and this value was rejected by the provider. Leave it empty to use the API key's treasury.`,
        });
      }
    }

    for (const [name, code] of [
      ['NTZS_COLLECTION_USER_ID', 'malformed_collection_holder'],
      ['NTZS_FUNDING_USER_ID', 'malformed_funding_holder'],
    ]) {
      const value = (env[name] || '').trim();
      if (value && !UUID.test(value) && !EVM_ADDRESS.test(value)) {
        issues.push({
          level: LEVELS.WARN,
          code,
          message: `${name} is not a UUID. Holders are UUID user ids — confirm this is one from nTZS, not a key or a label. Leave it empty if you do not need an override.`,
        });
      }
    }
  }

  return {
    ok: !issues.some((issue) => issue.level === LEVELS.ERROR),
    live,
    test,
    issues,
  };
}

/**
 * Report the configuration once at boot. Never exits: a payments misconfiguration
 * should not take the marketplace down, but it must be loud.
 */
function logConfiguration(env = process.env) {
  const result = checkConfiguration(env);
  if (result.issues.length === 0) {
    console.warn(`[ntzs] configured (${result.live ? 'live' : 'test'} key)`);
    return result;
  }
  for (const issue of result.issues) {
    const line = `[ntzs] ${issue.code}: ${issue.message}`;
    if (issue.level === LEVELS.ERROR) console.error(line);
    else console.warn(line);
  }
  return result;
}

module.exports = { checkConfiguration, logConfiguration, LEVELS };
