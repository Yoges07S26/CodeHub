-- ==============================================================
-- CodeHub Database Migration: 002_create_user_contacts_table.sql
-- Table: user_contacts
-- Contains: username, full_name, and mail_id only
-- ==============================================================

USE codehub;

CREATE TABLE IF NOT EXISTS user_contacts (
    username VARCHAR(60) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    mail_id VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;
