-- Apply only to employee_data_stage. Forward-only immutable order snapshots.
CREATE TABLE IF NOT EXISTS order_v1_headers (
  order_id VARCHAR(64) NOT NULL PRIMARY KEY, customer_id INT NOT NULL, company_id INT NOT NULL,
  company_name VARCHAR(255) NOT NULL DEFAULT '', company_image VARCHAR(500) NULL,
  mode VARCHAR(20) NOT NULL, table_number VARCHAR(10) NOT NULL, total_amount DECIMAL(12,2) NOT NULL,
  paid TINYINT(1) NOT NULL DEFAULT 0, delivered TINYINT(1) NOT NULL DEFAULT 0,
  cancel_requested TINYINT(1) NOT NULL DEFAULT 0,
  cancellation_status ENUM('none','requested','approved','rejected') NOT NULL DEFAULT 'none',
  created_at DATETIME NOT NULL, INDEX(customer_id,created_at), INDEX(company_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS order_v1_lines (
  line_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, order_id VARCHAR(64) NOT NULL,
  group_id INT NOT NULL, product_id INT NOT NULL, product_name VARCHAR(255) NOT NULL,
  product_description TEXT NOT NULL, unit_price DECIMAL(12,2) NOT NULL, quantity INT NOT NULL,
  line_total DECIMAL(12,2) NOT NULL, image_path VARCHAR(500) NULL, created_at DATETIME NOT NULL,
  INDEX(order_id), CONSTRAINT fk_order_v1_lines_header FOREIGN KEY(order_id) REFERENCES order_v1_headers(order_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
