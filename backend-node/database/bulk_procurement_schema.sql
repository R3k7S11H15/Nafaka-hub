-- Nafaka Hub Bulk Procurement Network Migration
-- Supports bulk procurement requests where multiple sellers combine supply for one large buyer.
-- Also supports buyer group buying where multiple buyers combine demand.

-- 1. Bulk procurement requests table
CREATE TABLE IF NOT EXISTS bulk_procurement_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_number VARCHAR(50) UNIQUE NOT NULL,
  buyer_id INT NOT NULL,
  product_type VARCHAR(100) NOT NULL,
  required_quantity DECIMAL(12,2) NOT NULL,
  allocated_quantity DECIMAL(12,2) DEFAULT 0,
  quality_grade VARCHAR(50),
  delivery_location VARCHAR(255),
  delivery_date DATE,
  max_price_per_unit DECIMAL(12,2),
  fulfillment_mode ENUM('seller_supply_group', 'buyer_group_buying') DEFAULT 'seller_supply_group',
  status ENUM('open', 'partially_filled', 'fully_allocated', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired') DEFAULT 'open',
  contract_id INT NULL,
  warehouse_id INT NULL,
  quality_verified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_buyer (buyer_id),
  INDEX idx_status (status),
  INDEX idx_mode (fulfillment_mode),
  INDEX idx_product_type (product_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bulk procurement group members (sellers or buyers)
CREATE TABLE IF NOT EXISTS bulk_procurement_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  member_id INT NOT NULL,
  member_role ENUM('seller', 'buyer') NOT NULL,
  contributed_quantity DECIMAL(12,2) DEFAULT 0,
  committed_quantity DECIMAL(12,2) DEFAULT 0,
  unit_price DECIMAL(12,2),
  total_price DECIMAL(14,2),
  product_id INT NULL,
  status ENUM('invited', 'pending', 'committed', 'withdrawn', 'rejected') DEFAULT 'pending',
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES bulk_procurement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_request (request_id),
  INDEX idx_member (member_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_member (request_id, member_id, member_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bulk procurement contracts
CREATE TABLE IF NOT EXISTS bulk_procurement_contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  request_id INT NOT NULL,
  buyer_id INT NOT NULL,
  total_quantity DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  quality_standard VARCHAR(100),
  delivery_location VARCHAR(255),
  delivery_date DATE,
  payment_terms VARCHAR(255),
  payment_deadline DATE,
  escrow_id INT NULL,
  status ENUM('draft', 'active', 'partially_fulfilled', 'fulfilled', 'disputed', 'cancelled') DEFAULT 'draft',
  quality_rejection_policy TEXT,
  dispute_resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES bulk_procurement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (escrow_id) REFERENCES escrow_transactions(id) ON DELETE SET NULL,
  INDEX idx_request (request_id),
  INDEX idx_buyer (buyer_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bulk procurement quality inspections
CREATE TABLE IF NOT EXISTS bulk_procurement_inspections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  member_id INT NULL,
  product_id INT NULL,
  quantity_inspected DECIMAL(12,2),
  quantity_accepted DECIMAL(12,2),
  quantity_rejected DECIMAL(12,2),
  quality_grade VARCHAR(50),
  inspection_result ENUM('passed', 'failed', 'partial') DEFAULT 'passed',
  inspector_id INT,
  inspector_notes TEXT,
  inspection_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES bulk_procurement_contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (inspector_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_contract (contract_id),
  INDEX idx_result (inspection_result)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bulk procurement payments (tracks payments from buyer to each seller)
CREATE TABLE IF NOT EXISTS bulk_procurement_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  member_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_status ENUM('pending', 'held_in_escrow', 'released', 'refunded', 'disputed') DEFAULT 'pending',
  payment_method VARCHAR(50),
  transaction_ref VARCHAR(100),
  released_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES bulk_procurement_contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_contract (contract_id),
  INDEX idx_member (member_id),
  INDEX idx_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bulk procurement activity log / audit
CREATE TABLE IF NOT EXISTS bulk_procurement_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NULL,
  contract_id INT NULL,
  member_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES bulk_procurement_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (contract_id) REFERENCES bulk_procurement_contracts(id) ON DELETE SET NULL,
  FOREIGN KEY (member_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_request (request_id),
  INDEX idx_contract (contract_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;