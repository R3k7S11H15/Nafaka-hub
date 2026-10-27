-- Nafaka Hub Payment + Escrow Lifecycle Migration
-- Applied manually to jumla_rice_trading. Safe to re-run (ADD COLUMN IF NOT EXISTS / MODIFY).

-- 1. Extend escrow_transactions.status to the full lifecycle set so dispute/cancel/shipped
--    handlers no longer crash with ER_TRUNCATED_WRONG_VALUE_FOR_FIELD.
ALTER TABLE escrow_transactions
  MODIFY COLUMN status ENUM(
    'held','released','refunded','shipped','delivered','completed','disputed','cancelled'
  ) DEFAULT 'held';

-- 2. Orders payment/escrow operational columns (in addition to order_lifecycle.sql).
ALTER TABLE orders
  MODIFY COLUMN payment_status ENUM('pending','paid','failed','refunded','disputed') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS payment_id INT NULL,
  ADD INDEX IF NOT EXISTS idx_order_payment (payment_id);

-- 3. payment_transactions: idempotency + reconciliation + receipt.
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255) NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS provider_ref VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS order_id INT NULL,
  ADD COLUMN IF NOT EXISTS next_action JSON NULL,
  ADD COLUMN IF NOT EXISTS receipt_url VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS idx_payment_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_provider_ref ON payment_transactions(provider_ref);
CREATE INDEX IF NOT EXISTS idx_payment_idempotency ON payment_transactions(idempotency_key);
