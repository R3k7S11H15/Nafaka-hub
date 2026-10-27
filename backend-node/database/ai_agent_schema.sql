-- Nafaka Hub AI Agent Schema Migration
-- Run this after the main schema.sql

-- ============ AI AGENT REGISTRY ============
CREATE TABLE IF NOT EXISTS ai_agents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role VARCHAR(50) NOT NULL,
    status ENUM('active', 'disabled', 'suspended') DEFAULT 'active',
    preferences_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_agent_per_user (user_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ AI AGENT MEMORY ============
CREATE TABLE IF NOT EXISTS ai_memories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    memory_type ENUM('preference', 'behavior', 'fact', 'context') DEFAULT 'context',
    content TEXT NOT NULL,
    importance TINYINT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    INDEX idx_agent (agent_id),
    INDEX idx_type (memory_type),
    INDEX idx_importance (importance),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ AI CONVERSATIONS ============
CREATE TABLE IF NOT EXISTS ai_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    sender ENUM('user', 'ai') NOT NULL,
    tool_used VARCHAR(100),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES ai_agents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_agent_user (agent_id, user_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ AI RECOMMENDATIONS ============
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('price_alert', 'restock', 'demand', 'purchase', 'listing', 'insight') DEFAULT 'insight',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    action_data JSON,
    status ENUM('pending', 'viewed', 'acted', 'dismissed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    INDEX idx_priority (priority),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ AI TOOL PERMISSIONS ============
CREATE TABLE IF NOT EXISTS ai_tool_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_tool (role, tool_name),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ AI AGENT LOGS ============
CREATE TABLE IF NOT EXISTS ai_agent_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    tool_used VARCHAR(100),
    input_summary TEXT,
    success BOOLEAN DEFAULT TRUE,
    error TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ SEED TOOL PERMISSIONS ============
INSERT IGNORE INTO ai_tool_permissions (role, tool_name, allowed) VALUES
-- Buyer tools
('customer', 'get_my_orders', TRUE),
('customer', 'get_my_purchase_history', TRUE),
('customer', 'get_my_favorite_products', TRUE),
('customer', 'search_products', TRUE),
('customer', 'compare_prices', TRUE),
('customer', 'get_market_prices', TRUE),
('customer', 'track_my_order', TRUE),
('customer', 'get_recommendations', TRUE),
('customer', 'calculate_purchase_cost', TRUE),
('customer', 'get_my_wishlist', TRUE),
('customer', 'get_order_details', TRUE),
-- Seller tools
('seller', 'get_my_sales', TRUE),
('seller', 'get_my_products', TRUE),
('seller', 'get_my_inventory', TRUE),
('seller', 'get_my_orders', TRUE),
('seller', 'analyze_sales', TRUE),
('seller', 'recommend_price', TRUE),
('seller', 'predict_demand', TRUE),
('seller', 'identify_slow_products', TRUE),
('seller', 'generate_product_description', TRUE),
('seller', 'get_my_commissions', TRUE),
('seller', 'get_my_customers', TRUE),
('seller', 'search_products', TRUE),
('seller', 'get_market_prices', TRUE),
-- Farmer tools (same as seller for now, extendable)
('seller', 'get_demand_information', TRUE),
('seller', 'find_potential_buyers', TRUE),
-- Admin tools
('superadmin', 'get_platform_stats', TRUE),
('marketplace_admin', 'get_platform_stats', TRUE),
('finance_admin', 'get_platform_stats', TRUE);

-- ============ AUTO-CREATE AGENTS FOR EXISTING USERS ============
INSERT INTO ai_agents (user_id, role, status)
SELECT id, role, 'active' FROM customers
WHERE id NOT IN (SELECT user_id FROM ai_agents);
