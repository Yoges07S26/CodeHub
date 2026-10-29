-- ==============================================================
-- CodeHub Database Schema (9 Isolated Tables for Strict Relational Integrity)
-- Utility & User Space (1-7), Administrative & Override Monitoring (8-9)
-- ==============================================================

CREATE DATABASE IF NOT EXISTS codehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE codehub;

-- 1. users
-- Implements base authentication and email verification tracking status metrics.
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NULL,
    username VARCHAR(60) NULL,
    bio TEXT NULL,
    organization VARCHAR(150) NULL,
    avatar_url LONGTEXT NULL,
    location VARCHAR(150) NULL,
    website_url VARCHAR(255) NULL,
    two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
    email_notifications TINYINT(1) NOT NULL DEFAULT 1,
    security_alerts TINYINT(1) NOT NULL DEFAULT 1,
    code_review_notifications TINYINT(1) NOT NULL DEFAULT 1,
    theme_preference VARCHAR(20) NOT NULL DEFAULT 'system',
    role_type ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    email_verified_status TINYINT(1) NOT NULL DEFAULT 0,
    verification_token VARCHAR(128) NULL,
    account_status ENUM('active', 'suspended', 'blocked', 'deletion_pending') NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 1b. personal_access_tokens
CREATE TABLE IF NOT EXISTS personal_access_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2. repositories
-- Tracks code workspaces. Foreign Key (user_id) references users(id) ON DELETE CASCADE
CREATE TABLE IF NOT EXISTS repositories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    visibility ENUM('public', 'private') NOT NULL DEFAULT 'public',
    google_drive_folder_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_repo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. branches
-- Foreign Key (repo_id) references repositories(id) ON DELETE CASCADE
CREATE TABLE IF NOT EXISTS branches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    repo_id BIGINT NOT NULL,
    branch_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_repo_branch UNIQUE (repo_id, branch_name),
    CONSTRAINT fk_branch_repo FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. repository_commits
-- Tracks history of updates/saves made to the repository. Foreign Keys point to repositories, branches, and users (ON DELETE CASCADE)
CREATE TABLE IF NOT EXISTS repository_commits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    repo_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    commit_message VARCHAR(255) NOT NULL,
    sha_hash CHAR(40) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_commit_repo FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_commit_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_commit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. repository_files
-- Maps current file structures to branches. Foreign Keys reference repositories and branches (ON DELETE CASCADE)
CREATE TABLE IF NOT EXISTS repository_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    repo_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    current_google_drive_file_id VARCHAR(255) NOT NULL,
    size BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_repo_branch_path UNIQUE (repo_id, branch_id, file_path),
    CONSTRAINT fk_file_repo FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. file_version_history
-- Tracks chronological snapshots of specific files. Foreign Key (file_id) references repository_files(id) ON DELETE CASCADE
CREATE TABLE IF NOT EXISTS file_version_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    file_id BIGINT NOT NULL,
    commit_id BIGINT NOT NULL,
    google_drive_file_id VARCHAR(255) NOT NULL,
    version_number INT NOT NULL,
    size BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_file_version UNIQUE (file_id, version_number),
    CONSTRAINT fk_version_file FOREIGN KEY (file_id) REFERENCES repository_files(id) ON DELETE CASCADE,
    CONSTRAINT fk_version_commit FOREIGN KEY (commit_id) REFERENCES repository_commits(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. issues_and_pulls
-- Direct communication vectors. Foreign Keys link to repositories and users
CREATE TABLE IF NOT EXISTS issues_and_pulls (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    repo_id BIGINT NOT NULL,
    creator_id BIGINT NOT NULL,
    type ENUM('issue', 'pull_request') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status ENUM('open', 'closed', 'merged') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_issue_repo FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_issue_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. admin_account_action_requests
-- Admin-scoped operational pipeline table tracking incoming cancellation and hard delete user requests
CREATE TABLE IF NOT EXISTS admin_account_action_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    request_type ENUM('account_deletion', 'data_export') NOT NULL,
    reason_text TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reviewed_by_admin_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_action_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_action_reviewer FOREIGN KEY (reviewed_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 9. admin_system_activity_logs
-- Isolated admin tracking audit ledger recording sensitive authorization changes, email verification notifications, etc.
CREATE TABLE IF NOT EXISTS admin_system_activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    repo_id BIGINT NULL,
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_log_repo FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 10. user_contacts
-- Dedicated contact table containing username, full name, and email address (mail id)
CREATE TABLE IF NOT EXISTS user_contacts (
    username VARCHAR(60) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    mail_id VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;
