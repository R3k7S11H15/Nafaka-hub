import { vi } from 'vitest';

/**
 * A very small in-memory MySQL stand-in for the nTZS integration tests.
 *
 * It models only the shapes the nTZS services actually issue:
 *   SELECT … FROM <table> WHERE <col> = ? | <col> IN (?, ?) [LIMIT ?] [OFFSET ?]
 *   INSERT INTO <table> (cols…) VALUES (?, …)   (with unique-key enforcement)
 *   UPDATE <table> SET col = ? … WHERE <col> = ?
 *
 * Anything else throws, so an unmodelled query fails loudly instead of silently
 * returning no rows.
 */

function normalize(sql) {
  return sql.trim().replace(/\s+/g, ' ');
}

function tableFrom(sql, keyword) {
  const match = new RegExp(`${keyword}\\s+(\\w+)`, 'i').exec(sql);
  return match ? match[1] : null;
}

function insertColumns(sql) {
  const match = /INSERT INTO\s+\w+\s*\(([^)]+)\)/i.exec(sql);
  return match ? match[1].split(',').map((c) => c.trim()) : [];
}

/** Split a VALUES tuple on top-level commas, keeping quoted strings intact. */
function splitTuple(tuple) {
  const parts = [];
  let current = '';
  let inString = false;
  for (const ch of tuple) {
    if (ch === "'") inString = !inString;
    if (ch === ',' && !inString) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Map an INSERT's columns to values, honouring literals in the VALUES list. */
function insertedRow(sql, params) {
  const columns = insertColumns(sql);
  const valuesAt = sql.toUpperCase().lastIndexOf('VALUES');
  if (valuesAt === -1) throw new Error(`fakePool: INSERT without VALUES → ${sql}`);

  const after = sql.slice(valuesAt + 'VALUES'.length).trim();
  const open = after.indexOf('(');
  const tuple = after.slice(open + 1, after.lastIndexOf(')'));
  const items = splitTuple(tuple);

  const row = {};
  let cursor = 0;
  columns.forEach((column, index) => {
    const item = items[index];
    if (item === '?') {
      row[column] = params[cursor];
      cursor += 1;
    } else if (/^NULL$/i.test(item)) row[column] = null;
    else if (/^'/.test(item)) row[column] = item.slice(1, -1);
    else if (/^-?\d+(\.\d+)?$/.test(item)) row[column] = Number(item);
    else row[column] = item;
  });
  return row;
}

/**
 * Walk a WHERE clause, pairing each predicate with its value(s).
 * Placeholders (`?`) consume bound params; quoted literals are taken as-is;
 * `IN (…)` lists may mix both.
 */
function whereMatcher(whereSql, params, startIndex) {
  const checks = [];
  let cursor = startIndex;
  const pattern = /(\w+)\s*(?:=|\bIN\b)\s*(\([^)]*\)|'[^']*'|\?)/gi;

  for (const m of whereSql.matchAll(pattern)) {
    const column = m[1];
    const expression = m[2];

    if (expression === '?') {
      const value = params[cursor];
      cursor += 1;
      checks.push((row) => String(row[column]) === String(value));
      continue;
    }

    if (expression.startsWith("'")) {
      const literal = expression.slice(1, -1);
      checks.push((row) => String(row[column]) === literal);
      continue;
    }

    const list = expression
      .slice(1, -1)
      .split(',')
      .map((part) => {
        const token = part.trim();
        if (token === '?') {
          const value = params[cursor];
          cursor += 1;
          return String(value);
        }
        return token.replace(/^'|'$/g, '');
      });
    checks.push((row) => list.includes(String(row[column])));
  }

  // LIMIT ? / OFFSET ? consume params without filtering.
  const tail = whereSql.slice(whereSql.search(/(?:LIMIT|OFFSET)\s+\?/i) === -1 ? whereSql.length : whereSql.search(/(?:LIMIT|OFFSET)\s+\?/i));
  cursor += (tail.match(/(?:LIMIT|OFFSET)\s+\?/gi) || []).length;

  return { match: (row) => checks.every((check) => check(row)), consumed: cursor - startIndex };
}

/** Split on commas that are not inside parentheses or quotes. */
function splitTopLevel(text) {
  const parts = [];
  let current = '';
  let depth = 0;
  let inString = false;
  for (const ch of text) {
    if (ch === "'") inString = !inString;
    if (!inString && ch === '(') depth += 1;
    if (!inString && ch === ')') depth -= 1;
    if (ch === ',' && depth === 0 && !inString) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function setAssignments(sql, params) {
  const setAt = sql.search(/\bSET\b/i);
  const whereAt = sql.search(/\bWHERE\b/i);
  if (setAt === -1) return { assignments: [], consumed: 0 };
  const clause = sql.slice(setAt + 3, whereAt === -1 ? undefined : whereAt);

  const assignments = [];
  let cursor = 0;
  for (const part of splitTopLevel(clause)) {
    const [rawColumn, ...rest] = part.split('=');
    const column = rawColumn.trim();
    const expression = rest.join('=').trim();
    if (!column) continue;
    if (expression === '?') {
      const value = params[cursor];
      assignments.push((row) => {
        row[column] = value;
      });
      cursor += 1;
    } else if (/\?/.test(expression)) {
      // e.g. JSON_SET(COALESCE(metadata,'{}'), '$.provider', ?) — the last
      // placeholder is the bound value; earlier ones are literals.
      const placeholders = (expression.match(/\?/g) || []).length;
      const value = params[cursor + placeholders - 1];
      assignments.push((row) => {
        row[column] = value;
      });
      cursor += placeholders;
    } else if (/NOW\(\)/i.test(expression) || /COALESCE\(/i.test(expression)) {
      assignments.push((row) => {
        row[column] = new Date().toISOString();
      });
    }
  }
  return { assignments, consumed: cursor };
}

function createFakePool(options = {}) {
  const tables = new Map();
  const queryLog = [];
  let nextId = options.startId || 1;

  const rows = (name) => {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name);
  };

  async function runQuery(sql, params = []) {
    const stmt = normalize(sql);
    const upper = stmt.toUpperCase();
    queryLog.push({ sql: stmt, params });

    if (upper.startsWith('INSERT')) {
      const name = tableFrom(stmt, 'INTO');
      const columns = insertColumns(stmt);
      const row = insertedRow(stmt, params);

      for (const unique of options.uniqueKeys?.[name] || []) {
        const index = columns.indexOf(unique);
        if (index === -1) continue;
        const value = row[unique];
        if (value === undefined || value === null) continue;
        const conflict = rows(name).find((existing) => String(existing[unique]) === String(value));
        if (conflict) {
          const err = new Error(`Duplicate entry '${value}' for key '${name}.${unique}'`);
          err.code = 'ER_DUP_ENTRY';
          throw err;
        }
      }

      row.id = nextId;
      nextId += 1;
      rows(name).push(row);
      return [{ insertId: row.id, affectedRows: 1 }];
    }

    if (upper.startsWith('SELECT')) {
      const name = tableFrom(stmt, 'FROM');
      const whereAt = stmt.search(/\bWHERE\b/i);
      const whereSql = whereAt === -1 ? '' : stmt.slice(whereAt + 5);
      const { match } = whereMatcher(whereSql, params, 0);
      let result = rows(name).map((row) => ({ ...row })).filter(match);
      if (/ORDER BY\s+id\s+DESC/i.test(stmt)) result.sort((a, b) => b.id - a.id);
      else if (/ORDER BY\s+id\s+ASC/i.test(stmt)) result.sort((a, b) => a.id - b.id);
      return [result];
    }

    if (upper.startsWith('UPDATE')) {
      const name = tableFrom(stmt, 'UPDATE');
      const { assignments, consumed } = setAssignments(stmt, params);
      const whereAt = stmt.search(/\bWHERE\b/i);
      const whereSql = whereAt === -1 ? '' : stmt.slice(whereAt + 5);
      const { match } = whereMatcher(whereSql, params, consumed);
      const targets = rows(name).filter(match);
      for (const row of targets) assignments.forEach((apply) => apply(row));
      return [{ affectedRows: targets.length }];
    }

    if (upper.startsWith('DELETE')) {
      const name = tableFrom(stmt, 'FROM');
      const whereAt = stmt.search(/\bWHERE\b/i);
      const { match } = whereMatcher(whereAt === -1 ? '' : stmt.slice(whereAt + 5), params, 0);
      const remaining = rows(name).filter((row) => !match(row));
      tables.set(name, remaining);
      return [{ affectedRows: rows(name).length - remaining.length }];
    }

    throw new Error(`fakePool: unsupported query → ${stmt}`);
  }

  const conn = {
    query: async (sql, params = []) => runQuery(sql, params),
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
  };

  return {
    query: vi.fn(runQuery),
    getConnection: async () => ({ ...conn, query: vi.fn(runQuery) }),
    tables,
    queryLog,
  };
}

module.exports = { createFakePool };