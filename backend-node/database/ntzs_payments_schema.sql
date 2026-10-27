-- nTZS Partner API integration (collections, disbursements, bills, treasury).
--
-- Scope: the `collections`, `disbursements`, `treasury` and spend capabilities.
-- No `wallets` capability is used — collections land in the partner treasury
-- and outbound movements name a funding source, never a customer wallet.
--
-- Amounts are whole Tanzanian shillings (BIGINT). Never DECIMAL.
--
-- Apply with:
--   mysql -u root jumla_rice_trading < ntzs_payments_schema.sql

CREATE TABLE IF NOT EXISTS ntzs_treasury_accounts (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  label             VARCHAR(120) NOT NULL,
  kind              ENUM('treasury','sub_account') NOT NULL DEFAULT 'sub_account',
  -- The nTZS holder used to fund payouts and bills from this account.
  funding_source_id VARCHAR(64) NULL,
  balance_tzs       BIGINT NOT NULL DEFAULT 0,
  reserved_tzs      BIGINT NOT NULL DEFAULT 0,
  status            ENUM('active','frozen') NOT NULL DEFAULT 'active',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ntzs_treasury_label (label),
  KEY idx_ntzs_treasury_kind (kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ntzs_treasury_ledger (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_id      INT NOT NULL,
  direction       ENUM('credit','debit','reserve','release') NOT NULL,
  amount_tzs      BIGINT NOT NULL,
  balance_after   BIGINT NOT NULL,
  entry_type      ENUM('collection','payout','spend','reserve','release','adjustment','transfer') NOT NULL,
  reference_type  VARCHAR(40) NULL,
  reference_id    VARCHAR(64) NULL,
  -- One logical movement, one key. Replaying it can never double-count.
  idempotency_key VARCHAR(128) NOT NULL,
  metadata        JSON NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ntzs_ledger_idem (idempotency_key),
  KEY idx_ntzs_ledger_account (account_id, id),
  CONSTRAINT fk_ntzs_ledger_account FOREIGN KEY (account_id)
    REFERENCES ntzs_treasury_accounts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ntzs_collections (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  provider_id         VARCHAR(64) NULL,
  idempotency_key     VARCHAR(128) NOT NULL,
  account_id          INT NULL,
  amount_tzs          BIGINT NOT NULL,
  payment_method      VARCHAR(32) NOT NULL DEFAULT 'mobile_money',
  phone_number        VARCHAR(20) NULL,
  status              VARCHAR(24) NOT NULL DEFAULT 'pending',
  instructions        TEXT NULL,
  external_reference  VARCHAR(128) NULL,
  order_id            INT NULL,
  customer_id         INT NULL,
  error_code          VARCHAR(64) NULL,
  error_message       VARCHAR(255) NULL,
  metadata            JSON NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  settled_at          TIMESTAMP NULL,
  UNIQUE KEY uniq_ntzs_collection_idem (idempotency_key),
  UNIQUE KEY uniq_ntzs_collection_provider (provider_id),
  KEY idx_ntzs_collection_status (status, id),
  KEY idx_ntzs_collection_customer (customer_id, id),
  KEY idx_ntzs_collection_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ntzs_payouts (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  provider_id           VARCHAR(64) NULL,
  idempotency_key       VARCHAR(128) NOT NULL,
  account_id            INT NULL,
  quote_id              VARCHAR(128) NULL,
  -- amount_tzs is NET to the recipient; total_tzs is amount + fee as quoted.
  amount_tzs            BIGINT NOT NULL,
  fee_tzs               BIGINT NOT NULL DEFAULT 0,
  total_tzs             BIGINT NOT NULL DEFAULT 0,
  recipient_name        VARCHAR(160) NULL,
  payout_rail           VARCHAR(32) NULL,
  destination_type      VARCHAR(20) NOT NULL DEFAULT 'mobile_money',
  phone_number          VARCHAR(20) NULL,
  bank_code             VARCHAR(32) NULL,
  account_number_masked VARCHAR(40) NULL,
  network               VARCHAR(20) NULL,
  status                VARCHAR(24) NOT NULL DEFAULT 'pending',
  order_id              INT NULL,
  external_reference    VARCHAR(128) NULL,
  error_code            VARCHAR(64) NULL,
  error_message         VARCHAR(255) NULL,
  metadata              JSON NULL,
  created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  settled_at            TIMESTAMP NULL,
  UNIQUE KEY uniq_ntzs_payout_idem (idempotency_key),
  UNIQUE KEY uniq_ntzs_payout_provider (provider_id),
  KEY idx_ntzs_payout_status (status, id),
  KEY idx_ntzs_payout_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ntzs_bills (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  provider_id    VARCHAR(64) NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  account_id     INT NULL,
  quote_id       VARCHAR(128) NULL,
  kind           VARCHAR(16) NOT NULL DEFAULT 'bill',
  pay_number     VARCHAR(20) NULL,
  utility_code   VARCHAR(64) NULL,
  utility_ref    VARCHAR(128) NULL,
  amount_tzs     BIGINT NOT NULL DEFAULT 0,
  fee_tzs        BIGINT NOT NULL DEFAULT 0,
  total_tzs      BIGINT NOT NULL DEFAULT 0,
  merchant_name  VARCHAR(160) NULL,
  -- What the biller recognises when the customer queries the payment.
  reference      VARCHAR(128) NULL,
  status         VARCHAR(24) NOT NULL DEFAULT 'pending',
  customer_id    INT NULL,
  error_code     VARCHAR(64) NULL,
  error_message  VARCHAR(255) NULL,
  metadata       JSON NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  settled_at     TIMESTAMP NULL,
  UNIQUE KEY uniq_ntzs_bill_idem (idempotency_key),
  UNIQUE KEY uniq_ntzs_bill_provider (provider_id),
  KEY idx_ntzs_bill_status (status, id),
  KEY idx_ntzs_bill_customer (customer_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ntzs_webhook_events (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id     VARCHAR(191) NOT NULL,
  event_type   VARCHAR(64) NULL,
  provider_id  VARCHAR(64) NULL,
  payload      JSON NULL,
  processed    TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_ntzs_event (event_id),
  KEY idx_ntzs_event_processed (processed, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
