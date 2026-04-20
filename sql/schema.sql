-- ============================================================
-- BinarioLive - Schema del database
-- Questo file crea il database e le tabelle necessarie
-- per il funzionamento della webapp.
-- Da eseguire in phpMyAdmin o da terminale MySQL.
-- ============================================================

-- Crea il database 'binario_live' con codifica UTF-8 completa
-- (utf8mb4 supporta anche emoji e caratteri speciali)
CREATE DATABASE IF NOT EXISTS binario_live
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Seleziona il database appena creato come database attivo
USE binario_live;

-- Tabella 'stations': memorizza le stazioni cercate dall'utente.
-- Ogni stazione ha un codice univoco (es. S08409 per Roma Termini),
-- un nome, una regione opzionale e le coordinate GPS (lat/lng)
-- per la visualizzazione sulla mappa.
CREATE TABLE IF NOT EXISTS stations (
  id INT AUTO_INCREMENT PRIMARY KEY,         -- ID univoco auto-incrementante
  code VARCHAR(20) NOT NULL UNIQUE,          -- Codice stazione Trenitalia (es. S08409)
  name VARCHAR(255) NOT NULL,                -- Nome della stazione (es. "ROMA TERMINI")
  region VARCHAR(100) DEFAULT NULL,          -- Regione di appartenenza (opzionale)
  lat DECIMAL(10,7) DEFAULT NULL,            -- Latitudine GPS della stazione
  lng DECIMAL(10,7) DEFAULT NULL,            -- Longitudine GPS della stazione
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Data di inserimento automatica
) ENGINE=InnoDB;

-- Tabella 'search_log': registra ogni ricerca effettuata dall'utente.
-- Utile per statistiche di utilizzo e per suggerire stazioni popolari.
CREATE TABLE IF NOT EXISTS search_log (
  id INT AUTO_INCREMENT PRIMARY KEY,         -- ID univoco auto-incrementante
  station_code VARCHAR(20) NOT NULL,         -- Codice della stazione cercata
  station_name VARCHAR(255) NOT NULL,        -- Nome della stazione cercata
  search_type ENUM('departure','arrival','train') DEFAULT 'departure',  -- Tipo di ricerca: partenza, arrivo o treno
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Data e ora della ricerca
  INDEX idx_station_code (station_code),     -- Indice per velocizzare le query per codice stazione
  INDEX idx_searched_at (searched_at)        -- Indice per velocizzare le query per data
) ENGINE=InnoDB;

-- Tabella 'train_stats': memorizza le statistiche orarie sui treni.
-- Ogni riga rappresenta uno "snapshot" di un'ora specifica di un giorno,
-- con il conteggio dei treni in orario, in ritardo e soppressi.
CREATE TABLE IF NOT EXISTS train_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,         -- ID univoco auto-incrementante
  snapshot_date DATE NOT NULL,               -- Data dello snapshot (es. 2026-04-16)
  hour TINYINT UNSIGNED NOT NULL,            -- Ora dello snapshot (0-23)
  trains_on_time INT DEFAULT 0,              -- Numero di treni in orario
  trains_delayed INT DEFAULT 0,              -- Numero di treni in ritardo
  trains_cancelled INT DEFAULT 0,            -- Numero di treni soppressi
  avg_delay_minutes DECIMAL(5,1) DEFAULT 0,  -- Ritardo medio in minuti
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Data di inserimento
  UNIQUE KEY uk_date_hour (snapshot_date, hour)    -- Vincolo: una sola riga per ogni combinazione data/ora
) ENGINE=InnoDB;
