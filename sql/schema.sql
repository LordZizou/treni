CREATE DATABASE IF NOT EXISTS binario_live
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE binario_live;

CREATE TABLE IF NOT EXISTS stations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(100) DEFAULT NULL,
  lat DECIMAL(10,7) DEFAULT NULL,
  lng DECIMAL(10,7) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS search_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  station_code VARCHAR(20) NOT NULL,
  station_name VARCHAR(255) NOT NULL,
  search_type ENUM('departure','arrival','train') DEFAULT 'departure',
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_station_code (station_code),
  INDEX idx_searched_at (searched_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS train_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  hour TINYINT UNSIGNED NOT NULL,
  trains_on_time INT DEFAULT 0,
  trains_delayed INT DEFAULT 0,
  trains_cancelled INT DEFAULT 0,
  avg_delay_minutes DECIMAL(5,1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_date_hour (snapshot_date, hour)
) ENGINE=InnoDB;
