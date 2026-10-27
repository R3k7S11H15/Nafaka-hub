-- Nafaka Hub - Logistics Schema Additions
-- Safe to run on existing databases (uses IF NOT EXISTS and ALTER TABLE IGNORE)

-- ============ FIX transport_providers ============

ALTER TABLE transport_providers ADD COLUMN IF NOT EXISTS owner_id INT DEFAULT NULL AFTER id,
  ADD INDEX idx_owner (owner_id);
ALTER TABLE transport_providers ADD CONSTRAINT fk_provider_owner
  FOREIGN KEY (owner_id) REFERENCES customers(id) ON DELETE SET NULL;

-- ============ FIX active_deliveries ============

ALTER TABLE active_deliveries ADD COLUMN IF NOT EXISTS transport_provider_id INT DEFAULT NULL AFTER driver_id,
  ADD COLUMN IF NOT EXISTS delivery_cost DECIMAL(10,2) DEFAULT 0 AFTER transport_provider_id,
  ADD COLUMN IF NOT EXISTS delivery_distance DECIMAL(10,2) DEFAULT 0 AFTER delivery_cost,
  ADD COLUMN IF NOT EXISTS vehicle_id INT DEFAULT NULL AFTER delivery_distance,
  ADD COLUMN IF NOT EXISTS pickup_location VARCHAR(255) DEFAULT NULL AFTER vehicle_id,
  ADD COLUMN IF NOT EXISTS destination_location VARCHAR(255) DEFAULT NULL AFTER pickup_location,
  ADD COLUMN IF NOT EXISTS cargo_type VARCHAR(100) DEFAULT NULL AFTER destination_location,
  ADD COLUMN IF NOT EXISTS cargo_weight DECIMAL(10,2) DEFAULT NULL AFTER cargo_type,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER cargo_weight;
ALTER TABLE active_deliveries ADD INDEX IF NOT EXISTS idx_provider (transport_provider_id);
ALTER TABLE active_deliveries ADD CONSTRAINT fk_delivery_provider
  FOREIGN KEY (transport_provider_id) REFERENCES transport_providers(id) ON DELETE SET NULL;

-- ============ LOGISTICS DOCUMENTS ============

CREATE TABLE IF NOT EXISTS logistics_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_url VARCHAR(500) NOT NULL,
    document_number VARCHAR(100),
    issued_date DATE,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP NULL,
    verified_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES transport_providers(id) ON DELETE CASCADE,
    INDEX idx_provider (provider_id),
    INDEX idx_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ LOGISTICS RATINGS ============

CREATE TABLE IF NOT EXISTS logistics_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    customer_id INT NOT NULL,
    order_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES transport_providers(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_provider (provider_id),
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ LOGISTICS EARNINGS ============

CREATE TABLE IF NOT EXISTS logistics_earnings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    order_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status ENUM('available','withdrawn','pending') DEFAULT 'available',
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES transport_providers(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_provider (provider_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ LOGISTICS PROFILES ============

CREATE TABLE IF NOT EXISTS logistics_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL UNIQUE,
    description TEXT,
    operating_regions TEXT,
    operating_hours VARCHAR(255),
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    is_featured BOOLEAN DEFAULT FALSE,
    featured_until DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES transport_providers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ LOGISTICS SUBSCRIPTIONS ============

CREATE TABLE IF NOT EXISTS logistics_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    plan_slug VARCHAR(50) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    period_start DATE,
    period_end DATE,
    payment_status ENUM('pending','completed','failed','cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES transport_providers(id) ON DELETE CASCADE,
    INDEX idx_provider (provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
