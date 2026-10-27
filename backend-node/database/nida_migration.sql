-- Nafaka Hub NIDA Migration
-- Adds the NIDA number to customers (Tanzanian national ID, used for KYC and
-- invoicing). Safe to re-run (uses ADD COLUMN IF NOT EXISTS).
--
-- Previously this file also added `wallet_address`. Wallets are out of scope,
-- so the column is no longer read or written by any code; the existing column
-- and its data are left in place and can be dropped separately.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS nida_number VARCHAR(20);
