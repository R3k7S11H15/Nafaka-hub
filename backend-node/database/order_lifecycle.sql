-- Nafaka Hub Order Lifecycle Migration
-- Adds the full agricultural/bulk order lifecycle to `orders` and turns
-- `order_tracking` into the immutable audit + timeline table.
--
-- Lifecycle statuses:
--   draft -> pending_payment -> paid -> awaiting_seller_confirmation
--   -> seller_accepted -> awaiting_warehouse_allocation
--   -> quality_inspection -> ready_for_dispatch -> assigned_to_logistics
--   -> in_transit -> delivered -> buyer_confirmation -> completed
--   -> disputed / refunded / cancelled
--
-- Run after multi_seller_fulfillment.sql. Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1. Expand the orders.status enum to the full lifecycle (plus legacy aliases).
ALTER TABLE orders
  MODIFY COLUMN status ENUM(
    'draft',
    'pending_payment',
    'paid',
    'awaiting_seller_confirmation',
    'seller_accepted',
    'awaiting_warehouse_allocation',
    'quality_inspection',
    'ready_for_dispatch',
    'assigned_to_logistics',
    'in_transit',
    'delivered',
    'buyer_confirmation',
    'completed',
    'disputed',
    'refunded',
    'cancelled',
    'pending',
    'processing',
    'shipped',
    'confirmed'
  ) DEFAULT 'draft';

-- 2. Operational columns used by the lifecycle.
--    Expand payment_status to include 'disputed' (set on raise_dispute).
ALTER TABLE orders
  MODIFY COLUMN payment_status ENUM('pending', 'paid', 'failed', 'refunded', 'disputed') DEFAULT 'pending';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS frozen BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assigned_warehouse_id INT NULL,
  ADD COLUMN IF NOT EXISTS assigned_logistics_provider_id INT NULL,
  ADD COLUMN IF NOT EXISTS quality_document_url VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS proof_of_delivery_url VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS payout_status ENUM('pending','paid','refunded') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS lifecycle_version INT DEFAULT 1;

ALTER TABLE orders
  ADD INDEX IF NOT EXISTS idx_frozen (frozen),
  ADD INDEX IF NOT EXISTS idx_payout (payout_status);

-- 3. Expand order_tracking into a full audit timeline.
ALTER TABLE order_tracking
  ADD COLUMN IF NOT EXISTS actor_role VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS action VARCHAR(50) NULL,
  ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50) NULL,
  ADD COLUMN IF NOT NULL metadata JSON DEFAULT (JSON_OBJECT());

ALTER TABLE order_tracking
  ADD INDEX IF NOT EXISTS idx_action (action),
  ADD INDEX IF NOT EXISTS idx_actor (actor_role, updated_by);

-- 4. Default new orders to the first lifecycle status.
--    Existing 'pending' rows are treated as 'pending_payment' by the service.
