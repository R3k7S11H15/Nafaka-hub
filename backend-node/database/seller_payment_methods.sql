-- Nafaka Hub Seller Payment Methods Migration
-- Removes escrow concept from marketplace orders and introduces direct
-- buyer -> seller payment destinations.
--
-- Safe to re-run (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / MODIFY).

-- 0. Expand orders.status enum to include the new marketplace lifecycle
--    (buyer_marked_paid, payment_rejected) alongside the existing lifecycle.
ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'draft',
    'pending_payment',
    'buyer_marked_paid',
    'paid',
    'payment_rejected',
    'processing',
    'ready_for_delivery',
    'out_for_delivery',
    'delivered',
    'completed',
    'awaiting_seller_confirmation',
    'seller_accepted',
    'awaiting_warehouse_allocation',
    'quality_inspection',
    'ready_for_dispatch',
    'assigned_to_logistics',
    'in_transit',
    'buyer_confirmation',
    'disputed',
    'refunded',
    'cancelled',
    'pending',
    'shipped',
    'confirmed'
  ) DEFAULT 'draft';

-- 1. Seller payment destinations table.
--    A seller can configure multiple payment methods:
--      mobile_money, bank_transfer, lipa_namba
CREATE TABLE IF NOT EXISTS seller_payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    provider VARCHAR(50) NULL,
    account_name VARCHAR(255) NULL,
    phone_number VARCHAR(20) NULL,
    bank_name VARCHAR(100) NULL,
    bank_account_number VARCHAR(50) NULL,
    lipa_number VARCHAR(50) NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_seller (seller_id),
    INDEX idx_enabled (is_enabled),
    INDEX idx_method (payment_method),
    UNIQUE KEY unique_default_per_seller (seller_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Orders: add seller payment destination snapshot columns.
--    These store the payment destination shown to the buyer at order creation.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS seller_id INT NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_method VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_provider VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_account_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_phone VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_bank_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_bank_account VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_lipa_number VARCHAR(50) NULL,
  ADD INDEX IF NOT EXISTS idx_order_seller (seller_id);

-- 3. payment_transactions: add marketplace payment lifecycle columns.
ALTER TABLE payment_transactions
  ADD COLUMN IF NOT EXISTS seller_id INT NULL,
  ADD COLUMN IF NOT EXISTS buyer_id INT NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_method VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_provider VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_account_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_phone VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_bank_name VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_bank_account VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS seller_payment_lipa_number VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS buyer_payment_reference VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS provider_proof_url VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS seller_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL,
  ADD INDEX IF NOT EXISTS idx_pt_seller (seller_id),
  ADD INDEX IF NOT EXISTS idx_pt_buyer (buyer_id),
  ADD INDEX IF NOT EXISTS idx_pt_order (order_id);

-- 4. Expand payment_transactions.status enum for marketplace payment states.
ALTER TABLE payment_transactions
  MODIFY COLUMN status ENUM(
    'pending',
    'buyer_marked_paid',
    'completed',
    'rejected',
    'cancelled',
    'failed',
    'reversed'
  ) DEFAULT 'pending';
