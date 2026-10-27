/**
 * Treasury ledger.
 *
 * The nTZS partner account gets one treasury account at signup and can hold
 * sub-accounts; there is no public HTTP surface for reading balances, so this
 * service keeps the local, auditable ledger of what the treasury holds:
 *
 *  - every completed collection credits an account
 *  - every paid payout or bill debits it
 *  - a failed or reverted movement never touches the balance
 *
 * Every movement is idempotent on `idempotency_key`, so replaying a webhook or
 * a status sync can never double-count. Amounts are whole TZS integers.
 */

const ACCOUNTS_TABLE = 'ntzs_treasury_accounts';
const LEDGER_TABLE = 'ntzs_treasury_ledger';

const DEFAULT_TREASURY_LABEL = 'Operating Treasury';

class TreasuryError extends Error {
  constructor(message, { status = 400, code = 'invalid_amount' } = {}) {
    super(message);
    this.name = 'TreasuryError';
    this.status = status;
    this.code = code;
  }
}

function wholeTzs(value, field = 'amountTzs') {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new TreasuryError(`${field} must be a positive whole TZS amount`, { code: 'invalid_amount' });
  }
  return num;
}

/**
 * Returns the default treasury account, creating it on first use.
 * Sub-accounts are created explicitly by an admin.
 */
async function ensureDefaultAccount(conn) {
  const [rows] = await conn.query(
    `SELECT id, label, kind, funding_source_id, balance_tzs, reserved_tzs, status
       FROM ${ACCOUNTS_TABLE} WHERE kind = 'treasury' ORDER BY id ASC LIMIT 1`
  );
  if (rows.length) return rows[0];

  const [ins] = await conn.query(
    `INSERT INTO ${ACCOUNTS_TABLE} (label, kind, balance_tzs, reserved_tzs) VALUES (?, 'treasury', 0, 0)`,
    [DEFAULT_TREASURY_LABEL]
  );
  return {
    id: ins.insertId,
    label: DEFAULT_TREASURY_LABEL,
    kind: 'treasury',
    funding_source_id: null,
    balance_tzs: 0,
    reserved_tzs: 0,
    status: 'active',
  };
}

async function listAccounts(conn) {
  const [rows] = await conn.query(
    `SELECT id, label, kind, funding_source_id, balance_tzs, reserved_tzs, status, created_at, updated_at
       FROM ${ACCOUNTS_TABLE} ORDER BY kind DESC, id ASC`
  );
  return rows.map(shapeAccount);
}

async function getAccount(conn, accountId) {
  const [rows] = await conn.query(
    `SELECT id, label, kind, funding_source_id, balance_tzs, reserved_tzs, status, created_at, updated_at
       FROM ${ACCOUNTS_TABLE} WHERE id = ? LIMIT 1`,
    [accountId]
  );
  if (!rows.length) return null;
  return shapeAccount(rows[0]);
}

function shapeAccount(row) {
  const balance = Number(row.balance_tzs || 0);
  const reserved = Number(row.reserved_tzs || 0);
  return {
    id: row.id,
    label: row.label,
    kind: row.kind,
    fundingSourceId: row.funding_source_id || null,
    balanceTzs: balance,
    reservedTzs: reserved,
    availableTzs: balance - reserved,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a sub-account: a labelled slice of the treasury that a specific
 * workflow (a market, a buyer cohort, a branch) can fund from.
 */
async function createSubAccount(conn, { label, fundingSourceId = null, openingBalanceTzs = 0, status = 'active' }) {
  if (!label || !String(label).trim()) {
    throw new TreasuryError('label is required', { code: 'missing_required_fields' });
  }
  const opening = openingBalanceTzs ? wholeTzs(openingBalanceTzs, 'openingBalanceTzs') : 0;

  const [ins] = await conn.query(
    `INSERT INTO ${ACCOUNTS_TABLE} (label, kind, funding_source_id, balance_tzs, reserved_tzs, status)
     VALUES (?, 'sub_account', ?, 0, 0, ?)`,
    [String(label).trim(), fundingSourceId ? String(fundingSourceId) : null, status]
  );
  const accountId = ins.insertId;

  if (opening > 0) {
    await applyMovement(conn, {
      accountId,
      direction: 'credit',
      amountTzs: opening,
      entryType: 'adjustment',
      referenceType: 'sub_account_opening',
      referenceId: String(accountId),
      idempotencyKey: `sub_account:${accountId}:opening`,
      metadata: { label: String(label).trim() },
    });
  }
  return getAccount(conn, accountId);
}

/**
 * Move value on an account. Idempotent on `idempotencyKey`: replaying the same
 * key returns the original entry and does not move money twice.
 *
 * Must run inside a transaction the caller owns.
 */
async function applyMovement(
  conn,
  {
    accountId,
    direction,
    amountTzs,
    entryType,
    referenceType = null,
    referenceId = null,
    idempotencyKey,
    metadata = null,
    allowNegative = false,
  }
) {
  const amount = wholeTzs(amountTzs, 'amountTzs');
  if (direction !== 'credit' && direction !== 'debit') {
    throw new TreasuryError('direction must be credit or debit', { code: 'invalid_transfer' });
  }
  if (!idempotencyKey) {
    throw new TreasuryError('idempotencyKey is required for a treasury movement', {
      code: 'invalid_idempotency_key',
    });
  }

  // Already applied? Return the original entry.
  const [existing] = await conn.query(
    `SELECT id, account_id, direction, amount_tzs, balance_after, entry_type, reference_type, reference_id, created_at
       FROM ${LEDGER_TABLE} WHERE idempotency_key = ? LIMIT 1`,
    [idempotencyKey]
  );
  if (existing.length) {
    return { entry: shapeEntry(existing[0]), duplicate: true };
  }

  const [accountRows] = await conn.query(
    `SELECT id, label, kind, balance_tzs, reserved_tzs, status FROM ${ACCOUNTS_TABLE} WHERE id = ? FOR UPDATE`,
    [accountId]
  );
  if (!accountRows.length) {
    throw new TreasuryError('Treasury account not found', { status: 404, code: 'not_provisioned' });
  }
  const account = accountRows[0];
  const balance = Number(account.balance_tzs || 0);
  const reserved = Number(account.reserved_tzs || 0);

  if (account.status === 'frozen') {
    throw new TreasuryError('Treasury account is frozen', { status: 403, code: 'treasury_account_frozen' });
  }

  const balanceAfter = direction === 'credit' ? balance + amount : balance - amount;
  if (direction === 'debit' && balanceAfter < 0 && !allowNegative) {
    throw new TreasuryError(
      `Insufficient treasury balance: available ${balance - reserved} TZS, requested ${amount} TZS`,
      { status: 400, code: 'insufficient_balance' }
    );
  }

  const [ins] = await conn.query(
    `INSERT INTO ${LEDGER_TABLE}
       (account_id, direction, amount_tzs, balance_after, entry_type, reference_type, reference_id, idempotency_key, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      accountId,
      direction,
      amount,
      balanceAfter,
      entryType,
      referenceType,
      referenceId === null ? null : String(referenceId),
      idempotencyKey,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  await conn.query(`UPDATE ${ACCOUNTS_TABLE} SET balance_tzs = ?, updated_at = NOW() WHERE id = ?`, [
    balanceAfter,
    accountId,
  ]);

  return {
    entry: shapeEntry({
      id: ins.insertId,
      account_id: accountId,
      direction,
      amount_tzs: amount,
      balance_after: balanceAfter,
      entry_type: entryType,
      reference_type: referenceType,
      reference_id: referenceId,
      created_at: new Date(),
    }),
    duplicate: false,
  };
}

/** Hold funds for a movement that has been accepted but not yet settled. */
async function reserve(conn, { accountId, amountTzs, referenceType, referenceId, idempotencyKey, metadata }) {
  const amount = wholeTzs(amountTzs, 'amountTzs');

  // Already held? Replaying the same key is a no-op — checked before the
  // balance test, so a duplicate can never look like an overdraw.
  const [existing] = await conn.query(`SELECT id FROM ${LEDGER_TABLE} WHERE idempotency_key = ? LIMIT 1`, [
    idempotencyKey,
  ]);
  if (existing.length) return { duplicate: true };

  const [accountRows] = await conn.query(
    `SELECT id, balance_tzs, reserved_tzs, status FROM ${ACCOUNTS_TABLE} WHERE id = ? FOR UPDATE`,
    [accountId]
  );
  if (!accountRows.length) {
    throw new TreasuryError('Treasury account not found', { status: 404, code: 'not_provisioned' });
  }
  const balance = Number(accountRows[0].balance_tzs || 0);
  const reserved = Number(accountRows[0].reserved_tzs || 0);
  if (accountRows[0].status === 'frozen') {
    throw new TreasuryError('Treasury account is frozen', { status: 403, code: 'treasury_account_frozen' });
  }
  if (balance - reserved < amount) {
    throw new TreasuryError(
      `Insufficient treasury balance: available ${balance - reserved} TZS, requested ${amount} TZS`,
      { status: 400, code: 'insufficient_balance' }
    );
  }

  await conn.query(`UPDATE ${ACCOUNTS_TABLE} SET reserved_tzs = reserved_tzs + ?, updated_at = NOW() WHERE id = ?`, [
    amount,
    accountId,
  ]);
  await conn.query(
    `INSERT INTO ${LEDGER_TABLE}
       (account_id, direction, amount_tzs, balance_after, entry_type, reference_type, reference_id, idempotency_key, metadata)
     VALUES (?, 'reserve', ?, ?, 'reserve', ?, ?, ?, ?)`,
    [
      accountId,
      amount,
      balance - reserved,
      referenceType || null,
      referenceId === null ? null : String(referenceId),
      idempotencyKey,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  return { duplicate: false };
}

/** Release a hold — the movement failed, was reverted, or never settled. */
async function release(conn, { accountId, amountTzs, referenceType, referenceId, idempotencyKey, metadata }) {
  const amount = wholeTzs(amountTzs, 'amountTzs');
  const [existing] = await conn.query(
    `SELECT id FROM ${LEDGER_TABLE} WHERE idempotency_key = ? LIMIT 1`,
    [idempotencyKey]
  );
  if (existing.length) return { duplicate: true };

  const [accountRows] = await conn.query(
    `SELECT id, balance_tzs, reserved_tzs FROM ${ACCOUNTS_TABLE} WHERE id = ? FOR UPDATE`,
    [accountId]
  );
  if (!accountRows.length) {
    throw new TreasuryError('Treasury account not found', { status: 404, code: 'not_provisioned' });
  }
  const reserved = Math.max(0, Number(accountRows[0].reserved_tzs || 0) - amount);
  await conn.query(`UPDATE ${ACCOUNTS_TABLE} SET reserved_tzs = ?, updated_at = NOW() WHERE id = ?`, [
    reserved,
    accountId,
  ]);
  await conn.query(
    `INSERT INTO ${LEDGER_TABLE}
       (account_id, direction, amount_tzs, balance_after, entry_type, reference_type, reference_id, idempotency_key, metadata)
     VALUES (?, 'release', ?, ?, 'release', ?, ?, ?, ?)`,
    [
      accountId,
      amount,
      Number(accountRows[0].balance_tzs || 0),
      referenceType || null,
      referenceId === null ? null : String(referenceId),
      idempotencyKey,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  return { duplicate: false };
}

function shapeEntry(row) {
  let metadata = null;
  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata);
    } catch {
      metadata = null;
    }
  }
  return {
    id: row.id,
    accountId: row.account_id,
    direction: row.direction,
    amountTzs: Number(row.amount_tzs),
    balanceAfterTzs: Number(row.balance_after),
    entryType: row.entry_type,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    metadata,
    createdAt: row.created_at,
  };
}

async function listLedger(conn, { accountId = null, limit = 50, offset = 0, entryType = null } = {}) {
  const params = [];
  let where = '';
  if (accountId) {
    where += ' AND l.account_id = ?';
    params.push(accountId);
  }
  if (entryType) {
    where += ' AND l.entry_type = ?';
    params.push(entryType);
  }
  const [rows] = await conn.query(
    `SELECT l.id, l.account_id, l.direction, l.amount_tzs, l.balance_after, l.entry_type,
            l.reference_type, l.reference_id, l.metadata, l.created_at, a.label AS account_label
       FROM ${LEDGER_TABLE} l
       JOIN ${ACCOUNTS_TABLE} a ON a.id = l.account_id
      WHERE 1 = 1 ${where}
      ORDER BY l.id DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit) || 50, Number(offset) || 0]
  );
  return rows.map((row) => ({ ...shapeEntry(row), accountLabel: row.account_label }));
}

async function balanceOf(conn, accountId = null) {
  const account = accountId ? await getAccount(conn, accountId) : await ensureDefaultAccount(conn);
  return account;
}

/**
 * Run `fn` inside a transaction and roll back on failure.
 * Treasury movements are all-or-nothing.
 */
async function withTransaction(pool, fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* best effort */
    }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = (pool) => ({
  pool,
  DEFAULT_TREASURY_LABEL,
  TreasuryError,
  ensureDefaultAccount,
  getAccount,
  balanceOf,
  listAccounts,
  createSubAccount,
  applyMovement,
  reserve,
  release,
  listLedger,
  withTransaction,
});