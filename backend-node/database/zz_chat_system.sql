-- Nafaka Hub Chat System Migration
-- Extends existing conversations/messages tables and adds offers, moderation, reports, restrictions
-- This file sorts AFTER schema.sql so ALTER targets existing base tables.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS conversation_type ENUM(
    'PRODUCT_INQUIRY','NEGOTIATION','ORDER','DELIVERY','GENERAL_BUSINESS','SUPPORT'
  ) DEFAULT 'GENERAL_BUSINESS',
  ADD COLUMN IF NOT EXISTS product_id INT NULL,
  ADD COLUMN IF NOT EXISTS order_id INT NULL,
  ADD COLUMN IF NOT EXISTS seller_id INT NULL,
  ADD COLUMN IF NOT EXISTS buyer_id INT NULL,
  ADD COLUMN IF NOT EXISTS created_by INT NULL,
  ADD COLUMN IF NOT EXISTS status ENUM('active','archived','closed') DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS requested_quantity INT NULL,
  ADD INDEX IF NOT EXISTS idx_type (conversation_type),
  ADD INDEX IF NOT EXISTS idx_product (product_id),
  ADD INDEX IF NOT EXISTS idx_order (order_id),
  ADD INDEX IF NOT EXISTS idx_seller (seller_id),
  ADD INDEX IF NOT EXISTS idx_buyer (buyer_id);

ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS role ENUM('buyer','seller','logistics','warehouse','support','admin') DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP NULL,
  ADD INDEX IF NOT EXISTS idx_blocked (blocked_at);

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS message_type ENUM('text','system','offer','order_update','delivery_update') DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS reply_to_message_id INT NULL,
  ADD COLUMN IF NOT EXISTS product_id INT NULL,
  ADD COLUMN IF NOT EXISTS order_id INT NULL,
  ADD COLUMN IF NOT EXISTS offer_id INT NULL,
  ADD COLUMN IF NOT EXISTS status ENUM('SENDING','SENT','DELIVERED','READ','BLOCKED','DELETED') DEFAULT 'SENT',
  ADD INDEX IF NOT EXISTS idx_type (message_type),
  ADD INDEX IF NOT EXISTS idx_status (status),
  ADD INDEX IF NOT EXISTS idx_reply (reply_to_message_id);

-- ============ OFFERS ============
CREATE TABLE IF NOT EXISTS offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  product_id INT NULL,
  order_id INT NULL,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(14,2) NOT NULL,
  delivery_location VARCHAR(255) NULL,
  delivery_date DATE NULL,
  note TEXT NULL,
  status ENUM('pending','accepted','rejected','countered','expired','cancelled') DEFAULT 'pending',
  parent_offer_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (seller_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_conversation (conversation_id),
  INDEX idx_buyer (buyer_id),
  INDEX idx_seller (seller_id),
  INDEX idx_status (status),
  INDEX idx_parent (parent_offer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ CHAT MODERATION EVENTS ============
CREATE TABLE IF NOT EXISTS chat_moderation_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NULL,
  user_id INT NOT NULL,
  conversation_id INT NULL,
  violation_type ENUM(
    'PHONE_NUMBER','EMAIL','SOCIAL_MEDIA','WHATSAPP','TELEGRAM',
    'EXTERNAL_URL','PAYMENT_ACCOUNT','BANK_ACCOUNT','MOBILE_MONEY',
    'CRYPTO_WALLET','NFT_MARKETPLACE','QR_CODE','OFF_PLATFORM_TRANSACTION','SPAM','HARASSMENT'
  ) NOT NULL,
  severity ENUM('low','medium','high') DEFAULT 'medium',
  detection_method VARCHAR(100) NULL,
  action_taken ENUM('blocked','warned','restricted','reported') DEFAULT 'blocked',
  original_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_violation (violation_type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ CHAT RESTRICTIONS ============
CREATE TABLE IF NOT EXISTS chat_restrictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reason TEXT NULL,
  restricted_until TIMESTAMP NULL,
  is_permanent TINYINT(1) DEFAULT 0,
  lifted_by INT NULL,
  lifted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (lifted_by) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_until (restricted_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ MESSAGE REPORTS ============
CREATE TABLE IF NOT EXISTS message_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL,
  reporter_id INT NOT NULL,
  conversation_id INT NULL,
  category ENUM('spam','scam','harassment','fraud','suspicious_payment','prohibited_contact','inappropriate','other') NOT NULL,
  description TEXT NULL,
  status ENUM('pending','reviewed','action_taken','dismissed') DEFAULT 'pending',
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_message (message_id),
  INDEX idx_reporter (reporter_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ USER BLOCKS ============
CREATE TABLE IF NOT EXISTS user_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  blocker_id INT NOT NULL,
  blocked_id INT NOT NULL,
  conversation_id INT NULL,
  reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_block (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_blocker (blocker_id),
  INDEX idx_blocked (blocked_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ CHAT MODERATION SETTINGS ============
CREATE TABLE IF NOT EXISTS chat_moderation_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NULL,
  description TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO chat_moderation_settings (setting_key, setting_value, description) VALUES
  ('contact_protection_enabled', '1', 'Enable contact information detection'),
  ('url_protection_enabled', '1', 'Enable external URL detection'),
  ('payment_protection_enabled', '1', 'Enable payment information detection'),
  ('max_message_length', '2000', 'Maximum characters per message'),
  ('messages_per_minute', '30', 'Rate limit messages per minute'),
  ('warning_threshold', '2', 'Warnings before restriction'),
  ('restriction_threshold', '5', 'Warnings before temporary restriction'),
  ('restriction_duration_hours', '24', 'Default restriction duration in hours'),
  ('allowed_domains', 'nafakahub.co.tz,nafakahub.com', 'Whitelisted external domains'),
  ('allowed_file_types', 'image/jpeg,image/png,image/webp,image/gif', 'Allowed attachment MIME types'),
  ('max_attachment_size_mb', '10', 'Maximum attachment size in MB');

-- ============ MESSAGE ATTACHMENTS ============
CREATE TABLE IF NOT EXISTS message_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  width INT NULL,
  height INT NULL,
  is_image TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  INDEX idx_message (message_id),
  INDEX idx_mime (mime_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ CHAT USER STATS (warning/restriction tracking) ============
CREATE TABLE IF NOT EXISTS chat_user_stats (
  user_id INT PRIMARY KEY,
  warning_count INT DEFAULT 0,
  restriction_count INT DEFAULT 0,
  last_violation_at TIMESTAMP NULL,
  moderation_status ENUM('good','warned','restricted','suspended') DEFAULT 'good',
  restricted_until TIMESTAMP NULL,
  restriction_reason TEXT NULL,
  FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;