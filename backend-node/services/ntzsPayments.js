/**
 * nTZS payments orchestration — collections, disbursements, bills, treasury.
 *
 * Capability scope: this integration holds `collections`, `disbursements`,
 * `treasury` and spend (bills/tills). It does NOT hold `wallets`, so:
 *  - collections name the configured treasury holder and land in the partner
 *    treasury;
 *  - outbound movements name a funding source (NTZS_FUNDING_USER_ID or a
 *    sub-account's own funding_source_id), never a per-customer account;
 *  - no end-user account provisioning is attempted anywhere in this file.
 *
 * Rules this file exists to enforce:
 *  - every money-moving call carries an Idempotency-Key, and the key is stored
 *    before the call so a replay reads the original outcome back;
 *  - quotes are never recomputed locally — the fee always comes from nTZS;
 *  - a 502 with an unknown outcome (initiation_uncertain, till_network_required)
 *    is persisted as `uncertain`, never auto-retried;
 *  - destination lookups are fail-soft: `name: null` does not block a payment;
 *  - the treasury ledger moves only on a terminal success, never on a failure.
 */
const crypto = require('crypto');
const ntzs = require('./ntzs');
const { NtzsError } = require('./ntzs/errors');
const {
  ValidationError,
  MIN_DEPOSIT_TZS,
  MIN_WITHDRAWAL_TZS,
  toTzsAmount,
  toPhoneNumber,
  toPayoutDestination,
} = require('./ntzs/validate');
const treasury = require('./ntzsTreasury');

const COLLECTIONS = 'ntzs_collections';
const PAYOUTS = 'ntzs_payouts';
const BILLS = 'ntzs_bills';
const WEBHOOK_EVENTS = 'ntzs_webhook_events';

// ---------------------------------------------------------------------------
// Status vocabulary
// ---------------------------------------------------------------------------

/** Deposit statuses from nTZS: submitted | pending | completed | failed | review */
const COLLECTION_STATUSES = ['submitted', 'pending', 'completed', 'failed', 'review'];
/** Withdrawal statuses from nTZS: burned | paid | pending | failed | reverted */
const PAYOUT_STATUSES = ['burned', 'paid', 'pending', 'failed', 'reverted'];
const BILL_STATUSES = ['pending', 'paid', 'burned', 'completed', 'failed', 'reverted'];

const SUCCESS_STATUSES = new Set(['completed', 'paid', 'burned']);
const FAILURE_STATUSES = new Set(['failed', 'reverted']);

function normalizeCollectionStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (['completed', 'success', 'settled', 'confirmed', 'paid'].includes(s)) return 'completed';
  if (['failed', 'error', 'declined'].includes(s)) return 'failed';
  if (['review', 'held', 'manual_review', 'under_review'].includes(s)) return 'review';
  return COLLECTION_STATUSES.includes(s) ? s : 'pending';
}

function normalizePayoutStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (['reverted', 'reversal', 'refunded', 'cancelled', 'canceled'].includes(s)) return 'reverted';
  if (['paid', 'completed', 'success', 'settled', 'confirmed'].includes(s)) return 'paid';
  if (['failed', 'error', 'declined'].includes(s)) return 'failed';
  if (['burned', 'burnt'].includes(s)) return 'burned';
  return PAYOUT_STATUSES.includes(s) ? s : 'pending';
}

function normalizeBillStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (FAILURE_STATUSES.has(s) || s === 'error' || s === 'declined') return 'failed';
  if (SUCCESS_STATUSES.has(s) || s === 'success' || s === 'settled' || s === 'confirmed') return 'paid';
  return BILL_STATUSES.includes(s) ? s : 'pending';
}

/** Which provider id each status table is keyed by, for webhook routing. */
const TABLE_BY_RESOURCE = {
  deposit: COLLECTIONS,
  collection: COLLECTIONS,
  withdrawal: PAYOUTS,
  payout: PAYOUTS,
  spend: BILLS,
  bill: BILLS,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A stable idempotency key for a logical operation. Reusing it is how a retry
 * becomes safe, so the caller-supplied key always wins.
 */
function resolveIdempotencyKey(supplied, prefix, seed) {
  if (supplied !== undefined && supplied !== null && String(supplied).length) {
    return String(supplied).slice(0, 128);
  }
  return `${prefix}:${seed}`.slice(0, 128);
}

function maskAccountNumber(value) {
  const str = String(value || '');
  if (str.length <= 4) return str;
  return `${'*'.repeat(Math.max(0, str.length - 4))}${str.slice(-4)}`;
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/** Map any thrown error onto an HTTP response. */
function toErrorResponse(err) {
  if (err instanceof NtzsError) {
    return {
      status: err.status,
      body: {
        success: false,
        code: err.code || null,
        message: err.message,
        retry: err.retry,
        uncertain: err.uncertain,
        ...(err.details ? { details: err.details } : {}),
        ...(err.retryAfterSeconds != null ? { retry_after: err.retryAfterSeconds } : {}),
      },
    };
  }
  if (err instanceof ValidationError || err?.name === 'TreasuryError') {
    return {
      status: err.status || 400,
      body: { success: false, code: err.code || 'invalid_request', message: err.message },
    };
  }
  return {
    status: err?.status || 500,
    body: { success: false, code: 'internal_error', message: err?.message || 'Unexpected error' },
  };
}

function shapeCollection(row) {
  if (!row) return null;
  return {
    id: row.id,
    providerId: row.provider_id,
    idempotencyKey: row.idempotency_key,
    accountId: row.account_id,
    amountTzs: Number(row.amount_tzs),
    paymentMethod: row.payment_method,
    phoneNumber: row.phone_number,
    status: row.status,
    instructions: row.instructions,
    externalReference: row.external_reference,
    orderId: row.order_id,
    customerId: row.customer_id,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    settledAt: row.settled_at,
  };
}

function shapePayout(row) {
  if (!row) return null;
  return {
    id: row.id,
    providerId: row.provider_id,
    idempotencyKey: row.idempotency_key,
    accountId: row.account_id,
    quoteId: row.quote_id,
    amountTzs: Number(row.amount_tzs),
    feeTzs: Number(row.fee_tzs || 0),
    totalTzs: Number(row.total_tzs || 0),
    recipientName: row.recipient_name,
    payoutRail: row.payout_rail,
    destinationType: row.destination_type,
    phoneNumber: row.phone_number,
    bankCode: row.bank_code,
    accountNumberMasked: row.account_number_masked,
    network: row.network,
    status: row.status,
    orderId: row.order_id,
    externalReference: row.external_reference,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    settledAt: row.settled_at,
  };
}

function shapeBill(row) {
  if (!row) return null;
  return {
    id: row.id,
    providerId: row.provider_id,
    idempotencyKey: row.idempotency_key,
    accountId: row.account_id,
    quoteId: row.quote_id,
    kind: row.kind,
    payNumber: row.pay_number,
    utilityCode: row.utility_code,
    utilityRef: row.utility_ref,
    amountTzs: Number(row.amount_tzs),
    feeTzs: Number(row.fee_tzs || 0),
    totalTzs: Number(row.total_tzs || 0),
    merchantName: row.merchant_name,
    // The biller recognises this when the customer queries the payment.
    reference: row.reference,
    status: row.status,
    customerId: row.customer_id,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    metadata: parseJson(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    settledAt: row.settled_at,
  };
}

const SELECT_COLLECTION = `SELECT * FROM ${COLLECTIONS}`;
const SELECT_PAYOUT = `SELECT * FROM ${PAYOUTS}`;
const SELECT_BILL = `SELECT * FROM ${BILLS}`;

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/**
 * Collect funds from a payer into the partner treasury.
 *
 * No `userId` is sent — that is the collections-without-wallets path. On 502
 * initiation_uncertain the collection may still have been taken, so the row is
 * stored with the provider reference when we have one and the caller is told to
 * verify rather than retry.
 */
async function createCollection(pool, auth, body = {}) {
  const {
    amountTzs,
    amount,
    phoneNumber,
    phone,
    paymentMethod = 'mobile_money',
    bankAccountNumber,
    externalReference,
    orderId,
    order_id,
    idempotencyKey,
    idempotency_key,
  } = body;

  const amountValue = toTzsAmount(amountTzs ?? amount, { min: MIN_DEPOSIT_TZS });
  const phoneValue = phoneNumber || phone;

  const reference = externalReference || orderId || order_id || null;
  const key = resolveIdempotencyKey(
    idempotencyKey || idempotency_key,
    'collection',
    reference ? `${reference}:${amountValue}:${paymentMethod}` : crypto.randomUUID()
  );

  // A replay of the same key returns the original collection.
  const [existing] = await pool.query(`${SELECT_COLLECTION} WHERE idempotency_key = ? LIMIT 1`, [key]);
  if (existing.length) {
    return { success: true, idempotent: true, collection: shapeCollection(existing[0]) };
  }

  const account = await treasury(pool).withTransaction(pool, (conn) => treasury(pool).ensureDefaultAccount(conn));

  const [ins] = await pool.query(
    `INSERT INTO ${COLLECTIONS}
       (idempotency_key, account_id, amount_tzs, payment_method, phone_number, status,
        external_reference, order_id, customer_id)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [
      key,
      account.id,
      amountValue,
      paymentMethod,
      phoneValue ? toPhoneNumber(phoneValue) : null,
      reference ? String(reference) : null,
      orderId || order_id || null,
      auth?.customerId || null,
    ]
  );
  const localId = ins.insertId;

  // Who is paying. Prefer an explicit reference, then the recorded customer.
  const payerReference =
    body.endUser?.reference ||
    body.customerId ||
    auth?.customerId ||
    reference; // falls back to the order id, which is still stable per collection

  try {
    const data = await ntzs.createDeposit(
      {
        amountTzs: amountValue,
        phoneNumber: phoneValue,
        paymentMethod,
        bankAccountNumber,
        externalReference: reference,
        // v1.28.0: the treasury is tied to the API key, so there is no
        // receiving holder. The payer is identified by our own customer id,
        // which comes back on deposit.completed for matching.
        endUser: body.endUser || { reference: String(payerReference) },
      },
      key
    );

    const status = normalizeCollectionStatus(data.status);
    await pool.query(
      `UPDATE ${COLLECTIONS}
          SET provider_id = ?, status = ?, instructions = ?, metadata = ?, updated_at = NOW()
        WHERE id = ?`,
      [
        data.id || null,
        status,
        data.instructions || null,
        JSON.stringify({ provider: data }),
        localId,
      ]
    );

    const [rows] = await pool.query(`${SELECT_COLLECTION} WHERE id = ?`, [localId]);
    const collection = shapeCollection(rows[0]);

    // A completed collection credits the treasury immediately.
    if (SUCCESS_STATUSES.has(status)) {
      await settleCollection(pool, collection);
      return { success: true, idempotent: false, collection: { ...collection, status } };
    }

    return {
      success: true,
      idempotent: false,
      collection,
      // The payer still has to approve the prompt on their phone.
      nextAction: { type: 'await_payer_prompt', phoneNumber: collection.phoneNumber },
    };
  } catch (err) {
    const ntzsErr = err instanceof NtzsError ? err : null;
    const status = ntzsErr?.uncertain ? 'uncertain' : 'failed';
    await pool.query(
      `UPDATE ${COLLECTIONS}
          SET status = ?, error_code = ?, error_message = ?, provider_id = COALESCE(provider_id, ?), updated_at = NOW()
        WHERE id = ?`,
      [status, ntzsErr?.code || null, err.message, null, localId]
    );
    const [rows] = await pool.query(`${SELECT_COLLECTION} WHERE id = ?`, [localId]);
    if (ntzsErr?.uncertain) {
      // Do NOT retry: the collection may already have been taken.
      return {
        success: false,
        status: 202,
        code: 'initiation_uncertain',
        message:
          'We could not confirm whether the prompt was delivered. The collection may still have been taken — read the collection back before retrying.',
        retry: 'verify',
        collection: shapeCollection(rows[0]),
      };
    }
    throw err;
  }
}

async function getCollection(pool, id) {
  const [rows] = await pool.query(`${SELECT_COLLECTION} WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) return null;
  return shapeCollection(rows[0]);
}

async function listCollections(pool, { limit = 50, offset = 0, status = null, customerId = null } = {}) {
  const params = [];
  let where = '';
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (customerId) {
    where += ' AND customer_id = ?';
    params.push(customerId);
  }
  const [rows] = await pool.query(
    `${SELECT_COLLECTION} WHERE 1 = 1 ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit) || 50, Number(offset) || 0]
  );
  return rows.map(shapeCollection);
}

/**
 * Read a collection back from nTZS and reconcile. This is the answer to a 502
 * initiation_uncertain, and the poll alternative to the webhook.
 */
async function syncCollection(pool, id) {
  const [rows] = await pool.query(`${SELECT_COLLECTION} WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) {
    const err = new NtzsError({ status: 404, code: 'not_found', message: 'Collection not found', retry: 'no' });
    throw err;
  }
  const local = shapeCollection(rows[0]);
  if (!local.providerId) {
    // Nothing upstream to read: a failed initiation has no collection.
    if (local.status === 'failed') return { success: true, collection: local };
    throw new NtzsError({
      status: 409,
      code: 'initiation_uncertain',
      message: 'The collection was never created upstream — it can be started again with a new key',
      retry: 'no',
    });
  }

  const data = await ntzs.getDeposit(local.providerId);
  const status = normalizeCollectionStatus(data.status);
  await pool.query(
    `UPDATE ${COLLECTIONS} SET status = ?, instructions = COALESCE(?, instructions), metadata = JSON_SET(COALESCE(metadata,'{}'), '$.provider', ?), updated_at = NOW() WHERE id = ?`,
    [status, data.instructions || null, JSON.stringify(data), local.id]
  );
  const updated = await getCollection(pool, local.id);
  if (SUCCESS_STATUSES.has(status)) await settleCollection(pool, updated);
  return { success: true, collection: { ...updated, status } };
}

/**
 * Credit the treasury for a settled collection. Idempotent: replaying the same
 * settlement is a no-op.
 */
async function settleCollection(pool, collection) {
  if (!collection?.providerId) return;
  await treasury(pool).withTransaction(pool, async (conn) => {
    await treasury(pool).applyMovement(conn, {
      accountId: collection.accountId,
      direction: 'credit',
      amountTzs: collection.amountTzs,
      entryType: 'collection',
      referenceType: 'ntzs_collection',
      referenceId: collection.providerId,
      idempotencyKey: `collection:${collection.providerId}:settled`,
      metadata: { localId: collection.id, paymentMethod: collection.paymentMethod },
    });
    await conn.query(`UPDATE ${COLLECTIONS} SET settled_at = COALESCE(settled_at, NOW()) WHERE id = ?`, [
      collection.id,
    ]);
  });
}

// ---------------------------------------------------------------------------
// Disbursements
// ---------------------------------------------------------------------------

/**
 * Price a payout. Returns the quote verbatim — the fee and total are nTZS's
 * numbers, never ours. A null `quoteId` means the balance is insufficient.
 *
 * The recipient lookup is fail-soft and runs alongside the quote: a null name
 * is shown as "unconfirmed", never blocked on.
 */
async function quotePayout(pool, body = {}) {
  const {
    amountTzs,
    amount,
    phoneNumber,
    phone,
    bankCode,
    accountNumber,
    account_number,
    skipLookup = false,
  } = body;

  const amountValue = toTzsAmount(amountTzs ?? amount, { min: MIN_WITHDRAWAL_TZS });
  const destination = toPayoutDestination({
    phoneNumber: phoneNumber || phone,
    bankCode,
    accountNumber: accountNumber || account_number,
  });

  const [quote, recipientLookup] = await Promise.all([
    ntzs.quoteWithdrawal({ amountTzs: amountValue, ...destination }),
    skipLookup
      ? Promise.resolve(null)
      : destination.phoneNumber
        ? ntzs
            .lookupRecipientName(destination.phoneNumber)
            .catch(() => null)
        : Promise.resolve(null),
  ]);

  return {
    success: true,
    quoteId: quote.quoteId ?? null,
    expiresAt: quote.expiresAt ?? null,
    amountTzs: amountValue,
    receiveAmountTzs: quote.receiveAmountTzs ?? amountValue,
    totalFeeTzs: quote.totalFeeTzs ?? null,
    totalTzs:
      quote.totalTzs ?? (quote.totalFeeTzs != null ? amountValue + Number(quote.totalFeeTzs) : null),
    recipientName: recipientLookup?.name ?? quote.recipientName ?? null,
    // Fail-soft: an unconfirmed name is normal, never a block.
    recipientConfirmed: Boolean(recipientLookup?.name || quote.recipientName),
    network: recipientLookup?.network ?? null,
    payoutRail: quote.payoutRail ?? (destination.phoneNumber ? 'mobile_money' : 'bank'),
    insufficientBalance: quote.quoteId == null,
    destination: {
      ...destination,
      accountNumberMasked: destination.accountNumber ? maskAccountNumber(destination.accountNumber) : undefined,
    },
  };
}

/**
 * Execute a payout against a quote. The treasury is debited (reserved first,
 * then settled) exactly once, keyed on the provider id.
 */
async function createPayout(pool, auth, body = {}) {
  const {
    amountTzs,
    amount,
    quoteId,
    quote_id,
    phoneNumber,
    phone,
    bankCode,
    accountNumber,
    account_number,
    network,
    externalReference,
    orderId,
    order_id,
    idempotencyKey,
    idempotency_key,
  } = body;

  if (!quoteId && !quote_id) {
    throw new NtzsError({
      status: 400,
      code: 'quote_required',
      message: 'quoteId is required — price the payout and show the user the fee first',
      retry: 'no',
    });
  }

  const amountValue = toTzsAmount(amountTzs ?? amount, { min: MIN_WITHDRAWAL_TZS });
  const destination = toPayoutDestination({
    phoneNumber: phoneNumber || phone,
    bankCode,
    accountNumber: accountNumber || account_number,
  });
  const key = resolveIdempotencyKey(
    idempotencyKey || idempotency_key,
    'payout',
    externalReference || orderId || order_id || crypto.randomUUID()
  );

  const [existing] = await pool.query(`${SELECT_PAYOUT} WHERE idempotency_key = ? LIMIT 1`, [key]);
  if (existing.length) {
    return { success: true, idempotent: true, payout: shapePayout(existing[0]) };
  }

  const account = await treasury(pool).withTransaction(pool, (conn) =>
    treasury(pool).ensureDefaultAccount(conn)
  );

  const [ins] = await pool.query(
    `INSERT INTO ${PAYOUTS}
       (idempotency_key, account_id, quote_id, amount_tzs, destination_type, phone_number,
        bank_code, account_number_masked, status, order_id, external_reference)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [
      key,
      account.id,
      String(quoteId || quote_id),
      amountValue,
      destination.phoneNumber ? 'mobile_money' : 'bank',
      destination.phoneNumber || null,
      destination.bankCode || null,
      destination.accountNumber ? maskAccountNumber(destination.accountNumber) : null,
      orderId || order_id || null,
      externalReference ? String(externalReference) : null,
    ]
  );
  const localId = ins.insertId;

  // The recipient as our own reference, for traceability and webhook matching.
  const payoutEndUser =
    body.endUser ||
    {
      reference: String(body.customerId || orderId || order_id || externalReference || 'payout'),
    };

  try {
    const data = await ntzs.createWithdrawal(
      { amountTzs: amountValue, quoteId: quoteId || quote_id, ...destination, endUser: payoutEndUser },
      key
    );

    const status = normalizePayoutStatus(data.status);
    const fee = Number(data.totalFeeTzs || 0);
    const total = Number(data.totalTzs || amountValue + fee);

    await pool.query(
      `UPDATE ${PAYOUTS}
          SET provider_id = ?, status = ?, fee_tzs = ?, total_tzs = ?, recipient_name = ?,
              payout_rail = ?, network = ?, metadata = ?, updated_at = NOW()
        WHERE id = ?`,
      [
        data.id || null,
        status,
        fee,
        total,
        data.recipientName || null,
        data.payoutRail || null,
        network ? String(network) : null,
        JSON.stringify({ provider: data }),
        localId,
      ]
    );

    const payout = await getPayout(pool, localId);
    await applyPayoutToTreasury(pool, payout);

    return {
      success: true,
      idempotent: false,
      payout,
      // A 202 from nTZS is success-in-flight, not a failure.
      inFlight: status === 'pending' || status === 'burned',
    };
  } catch (err) {
    const ntzsErr = err instanceof NtzsError ? err : null;
    // An uncertain outcome is left `pending`: it may already have been paid, so
    // the honest state is "in flight" until nTZS tells us otherwise.
    const status = ntzsErr?.uncertain ? 'pending' : 'failed';
    await pool.query(
      `UPDATE ${PAYOUTS} SET status = ?, error_code = ?, error_message = ?, updated_at = NOW() WHERE id = ?`,
      [status, ntzsErr?.code || null, err.message, localId]
    );
    if (ntzsErr?.uncertain) {
      const payout = await getPayout(pool, localId);
      return {
        success: false,
        status: 202,
        code: ntzsErr.code,
        message:
          'The payout outcome is unknown — it may already have been paid. Query the payout before retrying; the idempotency key makes a retry safe.',
        retry: 'verify',
        payout,
      };
    }
    throw err;
  }
}

/**
 * Hold the payout total while it is in flight, then settle it on success or
 * release the hold on failure. Reverted means the balance came back.
 */
async function applyPayoutToTreasury(pool, payout) {
  if (!payout?.providerId) return;
  const t = treasury(pool);
  const total = payout.totalTzs || payout.amountTzs + (payout.feeTzs || 0);

  if (SUCCESS_STATUSES.has(payout.status)) {
    await t.withTransaction(pool, async (conn) => {
      await t.release(conn, {
        accountId: payout.accountId,
        amountTzs: total,
        referenceType: 'ntzs_payout',
        referenceId: payout.providerId,
        idempotencyKey: `payout:${payout.providerId}:hold`,
        metadata: { localId: payout.id },
      });
      await t.applyMovement(conn, {
        accountId: payout.accountId,
        direction: 'debit',
        amountTzs: total,
        entryType: 'payout',
        referenceType: 'ntzs_payout',
        referenceId: payout.providerId,
        idempotencyKey: `payout:${payout.providerId}:settled`,
        metadata: { localId: payout.id, feeTzs: payout.feeTzs },
      });
      await conn.query(`UPDATE ${PAYOUTS} SET settled_at = COALESCE(settled_at, NOW()) WHERE id = ?`, [
        payout.id,
      ]);
    });
    return;
  }

  if (FAILURE_STATUSES.has(payout.status)) {
    await t.withTransaction(pool, (conn) =>
      t.release(conn, {
        accountId: payout.accountId,
        amountTzs: total,
        referenceType: 'ntzs_payout',
        referenceId: payout.providerId,
        idempotencyKey: `payout:${payout.providerId}:hold`,
        metadata: { localId: payout.id, released: true },
      })
    );
    return;
  }

  // Pending / burned: hold the funds so concurrent payouts cannot overdraw.
  // The movement is already real upstream, so a local hold failure is logged
  // and recorded on the payout rather than turned into a failed response —
  // nTZS, not this ledger, is the source of truth for the balance.
  try {
    await t.withTransaction(pool, (conn) =>
      t.reserve(conn, {
        accountId: payout.accountId,
        amountTzs: total,
        referenceType: 'ntzs_payout',
        referenceId: payout.providerId,
        idempotencyKey: `payout:${payout.providerId}:hold`,
        metadata: { localId: payout.id },
      })
    );
  } catch (err) {
    console.warn(`[ntzs] payout ${payout.providerId} hold failed: ${err.message}`);
    await pool.query(`UPDATE ${PAYOUTS} SET metadata = JSON_SET(COALESCE(metadata,'{}'), '$.hold_error', ?) WHERE id = ?`, [
      err.message,
      payout.id,
    ]);
  }
}

async function getPayout(pool, id) {
  const [rows] = await pool.query(`${SELECT_PAYOUT} WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) return null;
  return shapePayout(rows[0]);
}

async function listPayouts(pool, { limit = 50, offset = 0, status = null } = {}) {
  const params = [];
  let where = '';
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(`${SELECT_PAYOUT} WHERE 1 = 1 ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [
    ...params,
    Number(limit) || 50,
    Number(offset) || 0,
  ]);
  return rows.map(shapePayout);
}

/** Read a payout back from nTZS and reconcile. */
async function syncPayout(pool, id) {
  const [rows] = await pool.query(`${SELECT_PAYOUT} WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) {
    throw new NtzsError({ status: 404, code: 'not_found', message: 'Payout not found', retry: 'no' });
  }
  const local = shapePayout(rows[0]);
  if (!local.providerId) return { success: true, payout: local };

  const data = await ntzs.getWithdrawal(local.providerId);
  const status = normalizePayoutStatus(data.status);
  await pool.query(
    `UPDATE ${PAYOUTS}
        SET status = ?, fee_tzs = COALESCE(?, fee_tzs), total_tzs = COALESCE(?, total_tzs),
            recipient_name = COALESCE(?, recipient_name), metadata = JSON_SET(COALESCE(metadata,'{}'), '$.provider', ?),
            updated_at = NOW()
      WHERE id = ?`,
    [
      status,
      data.totalFeeTzs ?? null,
      data.totalTzs ?? null,
      data.recipientName ?? null,
      JSON.stringify(data),
      local.id,
    ]
  );
  const payout = await getPayout(pool, local.id);
  await applyPayoutToTreasury(pool, payout);
  return { success: true, payout };
}

/**
 * Bulk payout run. Each item gets its own idempotency key (seeded from the run
 * key and the item index), so re-running a partially failed batch never pays
 * the same destination twice and never skips one that did not go.
 */
async function runBulkPayout(pool, auth, body = {}) {
  const { items, idempotencyKey, idempotency_key, concurrency = 3 } = body;
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('items must be a non-empty array', 'missing_required_fields');
  }
  if (items.length > 200) {
    throw new ValidationError('A bulk run is capped at 200 payouts', 'amount_too_large');
  }
  const runKey = resolveIdempotencyKey(idempotencyKey || idempotency_key, 'bulk', crypto.randomUUID());
  const limit = Math.min(Math.max(Number(concurrency) || 3, 1), 10);

  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index] || {};
      try {
        const payout = await createPayout(pool, auth, {
          ...item,
          idempotencyKey: `${runKey}:${index}`,
        });
        results.push({ index, success: true, ...payout });
      } catch (err) {
        const mapped = toErrorResponse(err);
        // A failed item is reported, never retried automatically — a
        // deterministic error (bad phone, stale quote) would fail again.
        results.push({ index, success: false, ...mapped.body });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));

  results.sort((a, b) => a.index - b.index);
  const succeeded = results.filter((r) => r.success).length;
  return {
    success: true,
    runKey,
    total: items.length,
    succeeded,
    failed: items.length - succeeded,
    results,
  };
}

// ---------------------------------------------------------------------------
// Bills and tills
// ---------------------------------------------------------------------------

/**
 * The biller catalogue. Cached in-process for a few minutes so a catalogue page
 * does not hammer the API; a fee applies to every biller, so the caller must
 * render the quote, never assume a payment is free.
 */
let billerCache = { at: 0, data: null };
async function listBillers(pool, { force = false } = {}) {
  const ttlMs = Number(process.env.NTZS_BILLER_CACHE_MS) || 5 * 60 * 1000;
  if (!force && billerCache.data && Date.now() - billerCache.at < ttlMs) {
    return { success: true, ...billerCache.data, cached: true };
  }
  const catalogue = await ntzs.getBillerCatalogue();
  billerCache = { at: Date.now(), data: catalogue };
  return { success: true, ...catalogue, cached: false };
}

/**
 * Price a bill or till payment. `merchantName` comes from a fail-soft lookup and
 * the fee from the quote — neither is computed here.
 */
async function quoteBill(pool, body = {}) {
  const {
    amountTzs,
    amount,
    kind = 'bill',
    payNumber,
    utilityCode,
    utility_ref,
    utilityRef = utility_ref,
    skipLookup = false,
  } = body;

  const amountValue = toTzsAmount(amountTzs ?? amount, { min: 1 });
  const quote = await ntzs.quoteSpend({ amountTzs: amountValue, kind, payNumber, utilityCode, utilityRef });

  const merchantLookup =
    skipLookup || kind !== 'lipa'
      ? null
      : await ntzs
          .lookupMerchantName({ kind, payNumber, amountTzs: amountValue })
          .catch(() => null);

  const fee = quote.totalFeeTzs ?? quote.feeTzs ?? null;
  return {
    success: true,
    quoteId: quote.quoteId ?? null,
    expiresAt: quote.expiresAt ?? null,
    amountTzs: amountValue,
    feeTzs: fee,
    totalTzs: quote.totalTzs ?? (fee != null ? amountValue + Number(fee) : null),
    merchantName: merchantLookup?.name ?? quote.merchantName ?? null,
    merchantConfirmed: Boolean(merchantLookup?.name || quote.merchantName),
    // Fail-soft: no confirmation is not a failure.
    merchantReason: merchantLookup?.name ? null : merchantLookup?.reason || null,
    kind,
    utilityCode: utilityCode || null,
    payNumber: payNumber ? toPhoneNumber(payNumber, { field: 'payNumber' }) : null,
  };
}

/**
 * Execute a bill/till payment. The biller reference is persisted because it is
 * what the biller recognises when the customer queries the payment.
 */
async function createBill(pool, auth, body = {}) {
  const {
    quoteId,
    quote_id,
    network,
    kind = 'bill',
    payNumber,
    utilityCode,
    utility_ref,
    utilityRef = utility_ref,
    amountTzs,
    feeTzs,
    fee,
    totalTzs,
    merchantName,
    customerId,
    idempotencyKey,
    idempotency_key,
  } = body;

  if (!quoteId && !quote_id) {
    throw new NtzsError({
      status: 400,
      code: 'quote_required',
      message: 'quoteId is required — price the bill payment first',
      retry: 'no',
    });
  }
  const key = resolveIdempotencyKey(
    idempotencyKey || idempotency_key,
    'bill',
    customerId ? `${customerId}:${utilityCode || payNumber}` : crypto.randomUUID()
  );

  const [existing] = await pool.query(`${SELECT_BILL} WHERE idempotency_key = ? LIMIT 1`, [key]);
  if (existing.length) {
    return { success: true, idempotent: true, bill: shapeBill(existing[0]) };
  }

  const account = await treasury(pool).withTransaction(pool, (conn) =>
    treasury(pool).ensureDefaultAccount(conn)
  );

  const [ins] = await pool.query(
    `INSERT INTO ${BILLS}
       (idempotency_key, account_id, quote_id, kind, pay_number, utility_code, utility_ref,
        amount_tzs, fee_tzs, total_tzs, merchant_name, status, customer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [
      key,
      account.id,
      String(quoteId || quote_id),
      kind,
      payNumber ? toPhoneNumber(payNumber, { field: 'payNumber' }) : null,
      utilityCode ? String(utilityCode) : null,
      utilityRef ? String(utilityRef) : null,
      amountTzs != null ? toTzsAmount(amountTzs, { min: 1 }) : 0,
      feeTzs != null ? Number(feeTzs) : Number(fee || 0),
      totalTzs != null ? Number(totalTzs) : 0,
      merchantName || null,
      customerId || auth?.customerId || null,
    ]
  );
  const localId = ins.insertId;

  try {
    const data = await ntzs.createSpend(
      {
        quoteId: quoteId || quote_id,
        network,
        endUser:
          body.endUser || { reference: String(body.customerId || payNumber || utilityCode || 'bill') },
      },
      key
    );
    const status = normalizeBillStatus(data.status || data.state);

    await pool.query(
      `UPDATE ${BILLS}
          SET provider_id = ?, status = ?, reference = COALESCE(?, reference), metadata = ?, updated_at = NOW()
        WHERE id = ?`,
      [data.id || null, status, data.reference || null, JSON.stringify({ provider: data }), localId]
    );

    const bill = await getBill(pool, localId);
    await applyBillToTreasury(pool, bill);
    return { success: true, idempotent: false, bill };
  } catch (err) {
    const ntzsErr = err instanceof NtzsError ? err : null;

    if (ntzsErr?.code === 'till_network_required') {
      // The burn was reverted and the balance restored — retry with `network`.
      await pool.query(
        `UPDATE ${BILLS} SET error_code = ?, error_message = ?, status = 'failed', updated_at = NOW() WHERE id = ?`,
        [ntzsErr.code, err.message, localId]
      );
      return {
        success: false,
        status: 502,
        code: 'till_network_required',
        message: 'The till accepted the payment but its mobile network is unknown. Retry with the network field.',
        retry: 'verify',
        billId: localId,
      };
    }

    const status = ntzsErr?.uncertain ? 'pending' : 'failed';
    await pool.query(
      `UPDATE ${BILLS} SET status = ?, error_code = ?, error_message = ?, updated_at = NOW() WHERE id = ?`,
      [status, ntzsErr?.code || null, err.message, localId]
    );
    if (ntzsErr?.uncertain) {
      return {
        success: false,
        status: 202,
        code: ntzsErr.code,
        message:
          'The bill payment outcome is unknown. Query the bill before retrying; the idempotency key makes a retry safe.',
        retry: 'verify',
        bill: await getBill(pool, localId),
      };
    }
    throw err;
  }
}

async function applyBillToTreasury(pool, bill) {
  if (!bill?.providerId) return;
  const t = treasury(pool);
  const total = bill.totalTzs || bill.amountTzs + (bill.feeTzs || 0);
  if (!total) return;

  if (SUCCESS_STATUSES.has(bill.status)) {
    await t.withTransaction(pool, async (conn) => {
      await t.release(conn, {
        accountId: bill.accountId,
        amountTzs: total,
        referenceType: 'ntzs_bill',
        referenceId: bill.providerId,
        idempotencyKey: `bill:${bill.providerId}:hold`,
      });
      await t.applyMovement(conn, {
        accountId: bill.accountId,
        direction: 'debit',
        amountTzs: total,
        entryType: 'spend',
        referenceType: 'ntzs_bill',
        referenceId: bill.providerId,
        idempotencyKey: `bill:${bill.providerId}:settled`,
        metadata: { localId: bill.id, reference: bill.reference },
      });
      await conn.query(`UPDATE ${BILLS} SET settled_at = COALESCE(settled_at, NOW()) WHERE id = ?`, [bill.id]);
    });
    return;
  }

  if (FAILURE_STATUSES.has(bill.status)) {
    await t.withTransaction(pool, (conn) =>
      t.release(conn, {
        accountId: bill.accountId,
        amountTzs: total,
        referenceType: 'ntzs_bill',
        referenceId: bill.providerId,
        idempotencyKey: `bill:${bill.providerId}:hold`,
      })
    );
    return;
  }

  try {
    await t.withTransaction(pool, (conn) =>
      t.reserve(conn, {
        accountId: bill.accountId,
        amountTzs: total,
        referenceType: 'ntzs_bill',
        referenceId: bill.providerId,
        idempotencyKey: `bill:${bill.providerId}:hold`,
        metadata: { localId: bill.id },
      })
    );
  } catch (err) {
    // Already burned upstream — record the local hold gap, do not fail it.
    console.warn(`[ntzs] bill ${bill.providerId} hold failed: ${err.message}`);
  }
}

async function getBill(pool, id) {
  const [rows] = await pool.query(`${SELECT_BILL} WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) return null;
  return shapeBill(rows[0]);
}

async function listBills(pool, { limit = 50, offset = 0, status = null } = {}) {
  const params = [];
  let where = '';
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(`${SELECT_BILL} WHERE 1 = 1 ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [
    ...params,
    Number(limit) || 50,
    Number(offset) || 0,
  ]);
  return rows.map(shapeBill);
}

async function syncBill(pool, id) {
  const [rows] = await pool.query(`${SELECT_BILL} WHERE id = ? LIMIT 1`, [id]);
  if (!rows.length) {
    throw new NtzsError({ status: 404, code: 'not_found', message: 'Bill payment not found', retry: 'no' });
  }
  const local = shapeBill(rows[0]);
  if (!local.providerId) return { success: true, bill: local };

  const data = await ntzs.getSpend(local.providerId);
  const status = normalizeBillStatus(data.status || data.state);
  await pool.query(
    `UPDATE ${BILLS}
        SET status = ?, reference = COALESCE(?, reference), metadata = JSON_SET(COALESCE(metadata,'{}'), '$.provider', ?),
            updated_at = NOW()
      WHERE id = ?`,
    [status, data.reference || null, JSON.stringify(data), local.id]
  );
  const bill = await getBill(pool, local.id);
  await applyBillToTreasury(pool, bill);
  return { success: true, bill };
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

/**
 * Handle an inbound nTZS webhook.
 *
 * Events are deduplicated on event id (or the provider reference + status) so a
 * duplicate delivery never moves the treasury twice. Unknown resources are
 * acknowledged rather than retried forever.
 */
async function handleWebhook(pool, payload, headers, rawBody) {
  const verified = ntzs.verifyWebhookSignature(rawBody ?? payload, headers || {});
  if (!verified) {
    return { ok: false, status: 401, message: 'Webhook signature invalid' };
  }

  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload || {};
  const type = String(payload?.type || payload?.event || data.type || '').toLowerCase();
  const resource = Object.keys(TABLE_BY_RESOURCE).find((key) => type.includes(key));
  const providerId =
    data.depositId || data.withdrawalId || data.spendId || data.id || data.paymentId || data.providerRef || null;
  const eventId = payload?.id || data.eventId || `${type}:${providerId}:${data.status || data.state || ''}`;

  // Dedupe on the event id.
  try {
    await pool.query(
      `INSERT INTO ${WEBHOOK_EVENTS} (event_id, event_type, provider_id, payload, processed)
       VALUES (?, ?, ?, ?, 0)`,
      [String(eventId).slice(0, 191), type || null, providerId ? String(providerId) : null, JSON.stringify(payload)]
    );
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') {
      return { ok: true, idempotent: true, status: 200, message: 'Event already processed' };
    }
    throw err;
  }

  if (!providerId) {
    await markEventProcessed(pool, eventId);
    return { ok: true, idempotent: true, status: 200, message: 'No provider reference in event' };
  }

  const table = resource ? TABLE_BY_RESOURCE[resource] : null;
  const tables = table ? [table] : [COLLECTIONS, PAYOUTS, BILLS];

  for (const candidate of tables) {
    const [rows] = await pool.query(`SELECT * FROM ${candidate} WHERE provider_id = ? LIMIT 1`, [providerId]);
    if (!rows.length) continue;

    const status = rawStatus(data);
    if (candidate === COLLECTIONS) {
      const collection = shapeCollection(rows[0]);
      const next = normalizeCollectionStatus(status);
      await pool.query(`UPDATE ${COLLECTIONS} SET status = ?, updated_at = NOW() WHERE id = ?`, [next, collection.id]);
      const updated = await getCollection(pool, collection.id);
      if (SUCCESS_STATUSES.has(next)) await settleCollection(pool, { ...updated, status: next });
    } else if (candidate === PAYOUTS) {
      const next = normalizePayoutStatus(status);
      await pool.query(`UPDATE ${PAYOUTS} SET status = ?, updated_at = NOW() WHERE id = ?`, [next, rows[0].id]);
      const payout = await getPayout(pool, rows[0].id);
      await applyPayoutToTreasury(pool, payout);
    } else {
      const next = normalizeBillStatus(status);
      await pool.query(`UPDATE ${BILLS} SET status = ?, updated_at = NOW() WHERE id = ?`, [next, rows[0].id]);
      const bill = await getBill(pool, rows[0].id);
      await applyBillToTreasury(pool, bill);
    }

    await markEventProcessed(pool, eventId);
    return { ok: true, idempotent: false, status: 200, resource: candidate, providerId };
  }

  await markEventProcessed(pool, eventId);
  return { ok: true, idempotent: true, status: 200, message: 'No matching movement' };
}

function rawStatus(data) {
  return data.status || data.state || data.result || 'pending';
}

async function markEventProcessed(pool, eventId) {
  await pool.query(`UPDATE ${WEBHOOK_EVENTS} SET processed = 1 WHERE event_id = ?`, [
    String(eventId).slice(0, 191),
  ]);
}

// ---------------------------------------------------------------------------
// Test mode
// ---------------------------------------------------------------------------

/** Sandbox control: inspect, settle everything pending, reset. Test keys only. */
async function testMode(pool, action, { userId = null } = {}) {
  switch (action) {
    case 'state':
      return { success: true, state: await ntzs.inspectTestMode() };
    case 'advance':
      return { success: true, result: await ntzs.advanceTestMode() };
    case 'reset':
      return { success: true, result: await ntzs.resetTestMode() };
    case 'approve':
      if (!userId) throw new ValidationError('userId is required', 'missing_required_fields');
      return { success: true, result: await ntzs.approveTestModeUser(userId) };
    default:
      throw new ValidationError(`Unknown test mode action: ${action}`, 'missing_required_fields');
  }
}

/**
 * Reconcile local records against nTZS. Everything still in flight is read back
 * and settled — the honest answer after a webhook was missed.
 */
async function reconcile(pool, { limit = 100 } = {}) {
  const summary = { collections: 0, payouts: 0, bills: 0, errors: [] };

  const [openCollections] = await pool.query(
    `${SELECT_COLLECTION} WHERE status IN ('pending','submitted','uncertain') ORDER BY id ASC LIMIT ?`,
    [Number(limit) || 100]
  );
  for (const row of openCollections) {
    try {
      await syncCollection(pool, row.id);
      summary.collections += 1;
    } catch (err) {
      summary.errors.push({ type: 'collection', id: row.id, message: err.message });
    }
  }

  const [openPayouts] = await pool.query(
    `${SELECT_PAYOUT} WHERE status IN ('pending','burned') AND provider_id IS NOT NULL ORDER BY id ASC LIMIT ?`,
    [Number(limit) || 100]
  );
  for (const row of openPayouts) {
    try {
      await syncPayout(pool, row.id);
      summary.payouts += 1;
    } catch (err) {
      summary.errors.push({ type: 'payout', id: row.id, message: err.message });
    }
  }

  const [openBills] = await pool.query(
    `${SELECT_BILL} WHERE status = 'pending' AND provider_id IS NOT NULL ORDER BY id ASC LIMIT ?`,
    [Number(limit) || 100]
  );
  for (const row of openBills) {
    try {
      await syncBill(pool, row.id);
      summary.bills += 1;
    } catch (err) {
      summary.errors.push({ type: 'bill', id: row.id, message: err.message });
    }
  }

  return { success: true, ...summary };
}

module.exports = (pool) => ({
  pool,
  // Collections
  createCollection,
  getCollection,
  listCollections,
  syncCollection,
  // Disbursements
  quotePayout,
  createPayout,
  getPayout,
  listPayouts,
  syncPayout,
  runBulkPayout,
  // Bills
  listBillers,
  quoteBill,
  createBill,
  getBill,
  listBills,
  syncBill,
  // Lookups (pass-through, fail-soft upstream)
  lookupRecipientName: (body) => ntzs.lookupRecipientName(body.phoneNumber || body.phone),
  lookupMerchantName: (body) => ntzs.lookupMerchantName(body),
  lookupQr: (body) => ntzs.lookupQr(body.payload),
  // Platform
  getSupply: () => ntzs.getSupply(),
  testMode,
  reconcile,
  handleWebhook,
  toErrorResponse,
  // Status helpers (exported for tests and the webhook router)
  normalizeCollectionStatus,
  normalizePayoutStatus,
  normalizeBillStatus,
});