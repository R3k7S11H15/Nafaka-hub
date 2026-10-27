-- Migration: Add status column to reviews table for moderation
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER comment;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP NULL AFTER status;
ALTER TABLE reviews ADD INDEX IF NOT EXISTS idx_status (status);