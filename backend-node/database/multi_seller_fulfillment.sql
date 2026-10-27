-- Nafaka Hub Multi-Seller Fulfillment Migration
-- Supports partial fulfillment and multi-seller fulfillment.
-- A single buyer order can be split into multiple fulfillment orders
-- behind the scenes, each allocated to a different seller/warehouse.
--
-- Example: Buyer needs 100 tonnes of maize
--   Order #NH-10025 (100 tonnes)
--     ├── Fulfillment #1 → Seller A (40 tonnes)
--     ├── Fulfillment #2 → Seller B (35 tonnes)
--     └── Fulfillment #3 → Seller C (25 tonnes)

-- 1. Add stock_quantity to products (needed for allocation)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg',
  ADD INDEX IF NOT EXISTS idx_stock (stock_quantity);

-- 2. Add seller_id to order_items (so a single order can span multiple sellers)
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS seller_id INT NULL,
  ADD COLUMN IF NOT EXISTS allocated_quantity DECIMAL(12,2) NULL,
  ADD INDEX IF NOT EXISTS idx_seller (seller_id),
  ADD INDEX IF NOT EXISTS idx_allocated (allocated_quantity);

-- 3. Add parent_order_id to orders (links child fulfillment orders to parent buyer order)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS parent_order_id INT NULL,
  ADD COLUMN IF NOT EXISTS requested_quantity DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS product_type VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS fulfillment_status ENUM(
    'pending','partially_fulfilled','fully_fulfilled','cancelled'
  ) DEFAULT 'pending',
  ADD INDEX IF NOT EXISTS idx_parent (parent_order_id),
  ADD INDEX IF NOT EXISTS idx_fulfillment (fulfillment_status);

-- 4. Order fulfillments table — the core of multi-seller allocation
CREATE TABLE IF NOT EXISTS order_fulfillments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_order_id INT NOT NULL,
  order_id INT NULL,
  seller_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(14,2) NOT NULL,
  warehouse_id INT NULL,
  delivery_location VARCHAR(255) NULL,
  delivery_date DATE NULL,
  status ENUM('allocated','confirmed','shipped','delivered','cancelled') DEFAULT 'allocated',
  tracking_number VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (seller_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_parent (parent_order_id),
  INDEX idx_seller (seller_id),
  INDEX idx_status (status),
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Inventory reservations — tracks allocated stock before actual order placement
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  seller_id INT NOT NULL,
  warehouse_id INT NULL,
  fulfillment_id INT NULL,
  order_id INT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  status ENUM('reserved','released','consumed','cancelled') DEFAULT 'reserved',
  reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at TIMESTAMP NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (fulfillment_id) REFERENCES order_fulfillments(id) ON DELETE SET NULL,
  INDEX idx_product_seller (product_id, seller_id),
  INDEX idx_status (status),
  INDEX idx_fulfillment (fulfillment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;