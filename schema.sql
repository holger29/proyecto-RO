CREATE DATABASE IF NOT EXISTS meeting_db;
USE meeting_db;

CREATE TABLE IF NOT EXISTS meetings (
    id VARCHAR(36) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Opcional: Tabla de usuarios para futura escalabilidad
-- CREATE TABLE users (...);