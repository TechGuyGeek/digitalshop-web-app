-- Apply only to employee_data_stage.
CREATE TABLE IF NOT EXISTS order_payment_qr_tokens (
 token_hash BINARY(32) NOT NULL PRIMARY KEY, order_id VARCHAR(64) NOT NULL,
 customer_id INT NOT NULL, company_id INT NOT NULL, created_at DATETIME NOT NULL,
 expires_at DATETIME NOT NULL, revoked_at DATETIME NULL,
 INDEX idx_qr_order(order_id), INDEX idx_qr_expiry(expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
