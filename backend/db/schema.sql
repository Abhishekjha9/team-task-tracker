-- Team Task Tracker schema
CREATE DATABASE IF NOT EXISTS task_tracker
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE task_tracker;

CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  password    VARCHAR(255) NOT NULL,          -- bcrypt hash
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT NULL,
  status       ENUM('todo','in-progress','done') NOT NULL DEFAULT 'todo',
  priority     ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  due_date     DATE NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  -- Every query is scoped by user_id; composite indexes cover the common filters + sort.
  KEY idx_tasks_user_created (user_id, created_at),
  KEY idx_tasks_user_status (user_id, status),
  KEY idx_tasks_user_priority (user_id, priority)
) ENGINE=InnoDB;
