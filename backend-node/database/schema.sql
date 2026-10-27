-- Nafaka Hub Database Schema
-- Run this to create/update all tables

-- ============ CORE TABLES ============

CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    shipping_address TEXT,
    role ENUM('customer', 'seller', 'admin', 'superadmin', 'marketplace_admin', 'vendor_admin', 'warehouse_manager', 'transport_manager', 'customer_support', 'finance_admin', 'logistics_company', 'warehouse') DEFAULT 'customer',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    tin_number VARCHAR(50),
    nida_number VARCHAR(20),
    wallet_address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS logistics_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    business_registration_number VARCHAR(100),
    tin_number VARCHAR(50),
    coverage_areas TEXT,
    vehicle_types TEXT,
    base_rate_per_km DECIMAL(10,2),
    commission_rate DECIMAL(5,2) DEFAULT 10.0,
    reference_contacts TEXT,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouse_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    warehouse_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    location TEXT NOT NULL,
    region VARCHAR(100) NOT NULL,
    business_registration_number VARCHAR(100),
    tin_number VARCHAR(50),
    capacity_tonnes DECIMAL(10,2),
    storage_types TEXT,
    rate_per_tonne_day DECIMAL(10,2),
    insurance_info TEXT,
    reference_contacts TEXT,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose ENUM('registration', 'password_reset', 'login') DEFAULT 'registration',
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone_otp (phone, otp_code),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ PRODUCTS & CATALOG ============

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    weight VARCHAR(50),
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    seller_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_seller (seller_id),
    INDEX idx_active (is_active),
    INDEX idx_featured (is_featured),
    FULLTEXT idx_name_description (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    customer_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ ORDERS ============

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT,
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_order_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    location VARCHAR(255),
    notes TEXT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES customers(id),
    INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ CART & WISHLIST ============

CREATE TABLE cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_cart_item (customer_id, product_id),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_wishlist_item (customer_id, product_id),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ NOTIFICATIONS ============

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('order', 'promo', 'system', 'message') DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ SUBSCRIPTIONS ============

CREATE TABLE subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    commission_discount DECIMAL(5,2) DEFAULT 0,
    product_upload_limit INT DEFAULT 10,
    has_analytics BOOLEAN DEFAULT FALSE,
    has_featured_badge BOOLEAN DEFAULT FALSE,
    has_priority_support BOOLEAN DEFAULT FALSE,
    has_api_access BOOLEAN DEFAULT FALSE,
    has_bulk_upload BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subscription_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    plan_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vendor_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    subscription_start DATE,
    subscription_end DATE,
    product_upload_limit INT DEFAULT 10,
    commission_rate DECIMAL(5,2) DEFAULT 5.00,
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    tin_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_subscription_tier (subscription_tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ COMMISSIONS & REVENUE ============

CREATE TABLE platform_commissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    seller_id INT NOT NULL,
    order_total DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    commission_type ENUM('sale', 'subscription', 'featured', 'service') DEFAULT 'sale',
    status ENUM('pending', 'paid') DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (seller_id) REFERENCES customers(id),
    INDEX idx_seller (seller_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE revenue_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    revenue_type ENUM('subscription', 'commission', 'featured_listing', 'market_intel', 'report_purchase', 'value_added_service', 'logistics', 'warehouse') NOT NULL,
    reference_id INT,
    reference_type VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    customer_id INT,
    description VARCHAR(255),
    recorded_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_revenue_type (revenue_type),
    INDEX idx_date (recorded_date),
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ FEATURED LISTINGS & ADS ============

CREATE TABLE ad_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_days INT NOT NULL,
    listing_type ENUM('search', 'homepage') DEFAULT 'search',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE featured_listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    seller_id INT NOT NULL,
    package_id INT,
    listing_type ENUM('search', 'homepage') DEFAULT 'search',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    is_active BOOLEAN DEFAULT TRUE,
    position INT DEFAULT 0,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES ad_packages(id),
    INDEX idx_seller (seller_id),
    INDEX idx_type (listing_type),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ MARKET PRICES & INTELLIGENCE ============

CREATE TABLE market_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    region VARCHAR(100) NOT NULL,
    commodity VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) DEFAULT 'kg',
    trend ENUM('up', 'down', 'stable') DEFAULT 'stable',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_region (region),
    INDEX idx_commodity (commodity),
    INDEX idx_updated (last_updated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    commodity VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    date_recorded DATE NOT NULL,
    INDEX idx_commodity_region (commodity, region),
    INDEX idx_date (date_recorded)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE price_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    commodity VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    predicted_price DECIMAL(10,2) NOT NULL,
    confidence DECIMAL(5,2),
    prediction_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prediction_date (prediction_date),
    INDEX idx_valid_until (valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE market_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    commodity VARCHAR(100),
    content TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    is_premium BOOLEAN DEFAULT FALSE,
    downloads INT DEFAULT 0,
    published_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_type (report_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE market_intel_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    plan_type ENUM('basic', 'premium', 'enterprise') DEFAULT 'basic',
    commodities VARCHAR(255) DEFAULT 'rice,maize,wheat',
    regions VARCHAR(255) DEFAULT 'all',
    frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'weekly',
    price_monthly DECIMAL(10,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ VALUE-ADDED SERVICES ============

CREATE TABLE value_added_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    provider_name VARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_id INT NOT NULL,
    customer_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_price DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    provider_response TEXT,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES value_added_services(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_service (service_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ LOGISTICS ============

CREATE TABLE transport_providers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT DEFAULT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    vehicle_types VARCHAR(255),
    coverage_areas TEXT,
    base_rate_per_km DECIMAL(10,2),
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    rating DECIMAL(3,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL,
    registration_number VARCHAR(50) NOT NULL,
    model VARCHAR(100),
    capacity_tonnes DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES transport_providers(id) ON DELETE CASCADE,
    INDEX idx_provider (provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE logistics_commissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    transport_provider_id INT,
    delivery_distance DECIMAL(10,2),
    delivery_cost DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (transport_provider_id) REFERENCES transport_providers(id),
    INDEX idx_order (order_id),
    INDEX idx_provider (transport_provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ WAREHOUSE ============

CREATE TABLE warehouse_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_name VARCHAR(255) NOT NULL,
    owner_id INT,
    location VARCHAR(255),
    region VARCHAR(100),
    capacity_tonnes DECIMAL(10,2),
    available_space DECIMAL(10,2),
    rate_per_tonne_day DECIMAL(10,2),
    services TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_region (region),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE warehouse_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT NOT NULL,
    customer_id INT NOT NULL,
    product_type VARCHAR(100),
    quantity DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    storage_fee DECIMAL(10,2),
    commission_amount DECIMAL(10,2) DEFAULT 0,
    status ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouse_services(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_warehouse (warehouse_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ PAYMENTS & ESCROW ============

CREATE TABLE escrow_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    buyer_id INT,
    seller_id INT,
    amount DECIMAL(10,2) NOT NULL,
    escrow_fee DECIMAL(10,2) DEFAULT 0,
    status ENUM('held', 'released', 'refunded') DEFAULT 'held',
    released_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (buyer_id) REFERENCES customers(id),
    FOREIGN KEY (seller_id) REFERENCES customers(id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_ref VARCHAR(100) UNIQUE,
    status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'pending',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ OTHER ============

CREATE TABLE visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45),
    user_agent TEXT,
    page_visited VARCHAR(255),
    referrer VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip (ip_address),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_message_preview VARCHAR(255),
    last_message_at TIMESTAMP NULL,
    INDEX idx_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversation_participants (
    conversation_id INT NOT NULL,
    customer_id INT NOT NULL,
    last_read_at TIMESTAMP NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, customer_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    recipient_id INT NOT NULL,
    content TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id, created_at),
    INDEX idx_recipient_unread (recipient_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ SEED DATA ============

INSERT INTO subscription_plans (slug, name, price_monthly, price_yearly, commission_discount, product_upload_limit, has_analytics, has_featured_badge, has_priority_support, has_api_access, has_bulk_upload, is_active) VALUES
('free', 'Free', 0, 0, 0, 10, 0, 0, 0, 0, 0, 1),
('basic', 'Basic', 15000, 150000, 0, 50, 1, 0, 0, 0, 0, 1),
('premium', 'Premium', 45000, 450000, 2, 200, 1, 1, 1, 0, 1, 1),
('enterprise', 'Enterprise', 120000, 1200000, 5, 9999, 1, 1, 1, 1, 1, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ad_packages (slug, name, description, price, duration_days, listing_type, is_active) VALUES
('basic_search', 'Basic Search', 'Featured placement in search results for 7 days', 15000, 7, 'search', 1),
('premium_search', 'Premium Search', 'Top placement in search results for 14 days', 35000, 14, 'search', 1),
('homepage_banner', 'Homepage Banner', 'Featured on homepage banner for 7 days', 80000, 7, 'homepage', 1),
('homepage_grid', 'Homepage Grid', 'Featured in homepage grid for 14 days', 50000, 14, 'homepage', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert default admin users (password: admin123)
-- IMPORTANT: Change these passwords in production!
INSERT INTO customers (full_name, email, phone, password_hash, role, is_verified, is_active) VALUES
('Super Admin', 'superadmin@nafaka.co.tz', '+255700000001', '$2b$10$391GpJKPcjolzL4cYisnUunbk3B.MGQMs3yFz3SjoQh.bKC4VyJwa', 'superadmin', TRUE, TRUE),
('Marketplace Admin', 'admin@nafaka.co.tz', '+255700000002', '$2b$10$391GpJKPcjolzL4cYisnUunbk3B.MGQMs3yFz3SjoQh.bKC4VyJwa', 'marketplace_admin', TRUE, TRUE),
('Vendor Admin', 'vendor@nafaka.co.tz', '+255700000003', '$2b$10$391GpJKPcjolzL4cYisnUunbk3B.MGQMs3yFz3SjoQh.bKC4VyJwa', 'vendor_admin', TRUE, TRUE),
('Warehouse Manager', 'warehouse@nafaka.co.tz', '+255700000004', '$2b$10$391GpJKPcjolzL4cYisnUunbk3B.MGQMs3yFz3SjoQh.bKC4VyJwa', 'warehouse_manager', TRUE, TRUE),
('Transport Manager', 'transport@nafaka.co.tz', '+255700000005', '$2b$10$391GpJKPcjolzL4cYisnUunbk3B.MGQMs3yFz3SjoQh.bKC4VyJwa', 'transport_manager', TRUE, TRUE),
('Customer Support', 'support@nafaka.co.tz', '+255700000006', '$2b$10$391GpJKPcjolzL4cYisnUunbk3B.MGQMs3yFz3SjoQh.bKC4VyJwa', 'customer_support', TRUE, TRUE),
('Finance Admin', 'finance@nafaka.co.tz', '+255700000007', '$2b$10$391GpJKPcjolzL4cYisnUunbk3B.MGQMs3yFz3SjoQh.bKC4VyJwa', 'finance_admin', TRUE, TRUE),
('Juma', 'juma@gmail.com', '255777888999', '$2b$10$CBLUyWN2k/KmIYoVBxLJBuGtvNvZeMkQ7gB8IfND2JUdXgGlVv2WK', 'customer', TRUE, TRUE)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), updated_at = CURRENT_TIMESTAMP;

-- Seed sample products
INSERT INTO products (name, description, type, weight, price, image_url, is_active) VALUES
('Premium Rice - 25kg', 'High quality premium rice from Mbeya region', 'rice', '25kg', 45000, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 1),
('Maize Grain - 50kg', 'Fresh maize grain suitable for milling', 'maize', '50kg', 32000, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', 1),
('Wheat - 50kg', 'Grade A wheat for flour milling', 'wheat', '50kg', 38000, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', 1),
('Sorghum - 25kg', 'Organic sorghum grain', 'sorghum', '25kg', 22000, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', 1),
('Millet - 25kg', 'Premium finger millet', 'millet', '25kg', 28000, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', 1),
('Paddy Rice - 100kg', 'Unprocessed paddy rice direct from farms', 'rice', '100kg', 75000, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400', 1),
('Maize Flour - 2kg', 'Finely ground maize flour', 'maize_flour', '2kg', 3500, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', 1),
('Wheat Flour - 2kg', 'High quality wheat flour', 'wheat_flour', '2kg', 4000, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed sample market prices
INSERT INTO market_prices (region, commodity, price, unit, trend) VALUES
('Dar es Salaam', 'Rice', 1200, 'kg', 'stable'),
('Dar es Salaam', 'Maize', 850, 'kg', 'up'),
('Dar es Salaam', 'Wheat', 1100, 'kg', 'down'),
('Arusha', 'Rice', 1150, 'kg', 'stable'),
('Arusha', 'Maize', 800, 'kg', 'up'),
('Arusha', 'Wheat', 1050, 'kg', 'stable'),
('Dodoma', 'Rice', 1180, 'kg', 'up'),
('Dodoma', 'Maize', 820, 'kg', 'stable'),
('Dodoma', 'Wheat', 1080, 'kg', 'down'),
('Mbeya', 'Rice', 1100, 'kg', 'stable'),
('Mbeya', 'Maize', 750, 'kg', 'down'),
('Mbeya', 'Wheat', 1000, 'kg', 'stable'),
('Mwanza', 'Rice', 1120, 'kg', 'up'),
('Mwanza', 'Maize', 780, 'kg', 'stable'),
('Mwanza', 'Wheat', 1020, 'kg', 'up')
ON DUPLICATE KEY UPDATE price = VALUES(price);

-- Seed sample value-added services
INSERT INTO value_added_services (name, category, provider_name, price, commission_rate, description, is_active) VALUES
('Quality Testing', 'Testing', 'Tanzania Bureau of Standards', 25000, 5, 'Comprehensive grain quality testing and certification', 1),
('Storage Service - Small', 'Storage', 'AgriStore Tanzania', 15000, 8, 'Climate-controlled storage for up to 1 tonne per month', 1),
('Storage Service - Large', 'Storage', 'AgriStore Tanzania', 80000, 8, 'Climate-controlled storage for up to 10 tonnes per month', 1),
('Transport - Local', 'Logistics', 'FastTrack Logistics', 35000, 10, 'Local delivery within 50km radius', 1),
('Transport - Regional', 'Logistics', 'FastTrack Logistics', 120000, 10, 'Regional delivery across Tanzania', 1),
('Insurance Coverage', 'Insurance', 'Tanzania Insurance', 15000, 5, 'Crop and produce insurance coverage', 1),
('Financing - Short Term', 'Financing', ' AgriFinance Tanzania', 0, 5, 'Short-term financing for working capital', 1),
('Financing - Long Term', 'Financing', 'AgriFinance Tanzania', 0, 5, 'Long-term financing for equipment and expansion', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Seed sample transport providers
INSERT INTO transport_providers (company_name, contact_person, phone, email, vehicle_types, coverage_areas, base_rate_per_km, commission_rate, rating, is_active) VALUES
('FastTrack Logistics', 'John Mwalimu', '+255712345678', 'info@fasttrack.co.tz', 'truck,van', 'Dar es Salaam, Coast', 500, 10, 4.5, 1),
('Highway Cargo', 'Jane Kimaro', '+255723456789', 'cargo@highway.co.tz', 'truck,trailer', 'All Regions', 400, 8, 4.2, 1),
('QuickMove Transport', 'Peter Lissu', '+255734567890', 'quick@move.co.tz', 'van,pickup', 'Arusha, Manyara', 600, 12, 4.0, 1),
('Dar Express', 'Mary Komba', '+255745678901', 'express@dar.co.tz', 'truck', 'Dar es Salaam, Dodoma', 450, 9, 4.3, 1)
ON DUPLICATE KEY UPDATE company_name = VALUES(company_name);

-- Seed sample warehouse services
INSERT INTO warehouse_services (warehouse_name, owner_id, location, region, capacity_tonnes, available_space, rate_per_tonne_day, services, commission_rate, is_active) VALUES
('Dar Central Warehouse', NULL, 'Kurasini, Dar es Salaam', 'Dar es Salaam', 500, 200, 2500, 'storage,inspection,packaging', 5, 1),
('Arusha Grain Storage', NULL, 'Arusha Town', 'Arusha', 300, 150, 2200, 'storage,inspection', 5, 1),
('Mbeya Storage Facility', NULL, 'Mbeya Town', 'Mbeya', 400, 180, 2000, 'storage,packaging', 4, 1),
('Dodoma Warehouse', NULL, 'Dodoma Town', 'Dodoma', 250, 100, 1800, 'storage', 4, 1)
ON DUPLICATE KEY UPDATE warehouse_name = VALUES(warehouse_name);

-- Seed sample market reports
INSERT INTO market_reports (slug, title, report_type, commodity, content, price, is_premium, published_date) VALUES
('rice-market-trends-q3-2025', 'Rice Market Trends Q3 2025', 'market_analysis', 'rice', 'Comprehensive analysis of rice market trends across Tanzania for Q3 2025...', 25000, 1, '2025-09-01'),
('maize-outlook-2025', 'Maize Market Outlook 2025', 'forecast', 'maize', 'Annual outlook for maize production, consumption, and pricing...', 15000, 1, '2025-08-15'),
('wheat-demand-forecast', 'Wheat Demand Forecast', 'forecast', 'wheat', 'Forecast of wheat demand based on population growth and consumption patterns...', 12000, 0, '2025-08-01'),
('export-opportunities-2025', 'Export Opportunities 2025', 'market_analysis', 'mixed', 'Analysis of export opportunities for Tanzanian grains in regional markets...', 50000, 1, '2025-07-20')
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Backfill new columns for existing databases
ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE AFTER is_active;
ALTER TABLE products ADD INDEX idx_featured (is_featured);
