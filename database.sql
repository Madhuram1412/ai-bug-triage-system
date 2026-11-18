-- ========================================================
-- AI Bug Triage System v1.0 - MySQL Database Schema & Seed Data
-- ========================================================

CREATE DATABASE IF NOT EXISTS `ai_bug_triage` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ai_bug_triage`;

SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables if existing
DROP TABLE IF EXISTS `ai_feedback`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `status_history`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `ai_analyses`;
DROP TABLE IF EXISTS `attachments`;
DROP TABLE IF EXISTS `bugs`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `teams`;

-- 1. Development Teams Table
CREATE TABLE `teams` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `color` VARCHAR(20) DEFAULT '#6366f1',
  `lead_id` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users Table
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `hashed_password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'developer',
  `team_id` INT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `avatar_color` VARCHAR(20) DEFAULT '#3b82f6',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Bugs Table
CREATE TABLE `bugs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bug_code` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `language` VARCHAR(50) DEFAULT 'Java',
  `framework` VARCHAR(100) NULL,
  `steps_to_reproduce` TEXT NULL,
  `expected_behavior` TEXT NULL,
  `actual_behavior` TEXT NULL,
  `error_trace` TEXT NULL,
  `environment_info` TEXT NULL,
  `code_snippet` MEDIUMTEXT NULL,
  `severity` VARCHAR(10) DEFAULT 'P2',
  `original_severity` VARCHAR(10) DEFAULT 'P2',
  `severity_override_reason` TEXT NULL,
  `status` VARCHAR(50) DEFAULT 'Submitted',
  `reporter_id` INT NOT NULL,
  `assigned_team_id` INT NULL,
  `assigned_developer_id` INT NULL,
  `resolution_notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_developer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. AI Analysis Results Table
CREATE TABLE `ai_analyses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bug_id` INT NOT NULL UNIQUE,
  `summary` TEXT NOT NULL,
  `bug_type` VARCHAR(100) NOT NULL,
  `root_cause` TEXT NOT NULL,
  `line_numbers` VARCHAR(100) NULL,
  `trigger_conditions` TEXT NULL,
  `is_hypothesis` BOOLEAN DEFAULT TRUE,
  `recommended_severity` VARCHAR(10) NOT NULL,
  `severity_reasoning` TEXT NOT NULL,
  `severity_evidence` TEXT NOT NULL,
  `solution_steps` MEDIUMTEXT NOT NULL,
  `recommended_code_diff` MEDIUMTEXT NULL,
  `original_snippet` MEDIUMTEXT NULL,
  `patched_snippet` MEDIUMTEXT NULL,
  `fix_explanation` TEXT NOT NULL,
  `suggested_unit_tests` TEXT NULL,
  `potential_side_effects` TEXT NULL,
  `recommended_team_name` VARCHAR(100) NOT NULL,
  `team_routing_reason` TEXT NOT NULL,
  `required_expertise` VARCHAR(255) NULL,
  `suggested_priority` VARCHAR(50) NULL,
  `confidence_score` FLOAT DEFAULT 0.94,
  `model_name` VARCHAR(100) DEFAULT 'Cyber AI Triage Engine v1.0',
  `is_demo_mode` BOOLEAN DEFAULT TRUE,
  `helpful_count` INT DEFAULT 0,
  `unhelpful_count` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Attachments Table
CREATE TABLE `attachments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bug_id` INT NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `file_size` INT NOT NULL,
  `file_type` VARCHAR(100) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `uploaded_by_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Comments Table
CREATE TABLE `comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bug_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `message` TEXT NOT NULL,
  `is_technical` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Status History Table
CREATE TABLE `status_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bug_id` INT NOT NULL,
  `user_id` INT NULL,
  `old_status` VARCHAR(50) NOT NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Audit Logs Table
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` VARCHAR(50) NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(50) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Notifications Table
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `bug_id` INT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `notification_type` VARCHAR(50) DEFAULT 'info',
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. AI Feedback Table
CREATE TABLE `ai_feedback` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `bug_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `is_helpful` BOOLEAN NOT NULL,
  `feedback_text` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed Teams
INSERT INTO `teams` (`id`, `name`, `slug`, `description`, `color`) VALUES
(1, 'Backend API Team', 'backend-api', 'Handles REST/GraphQL APIs, business logic, authentication services, and microservices.', '#3b82f6'),
(2, 'Database Engineering Team', 'database', 'Specializes in relational & NoSQL databases, ORM models, SQL queries, transactions, migrations, and indexing.', '#10b981'),
(3, 'Frontend Engineering Team', 'frontend', 'Builds user interfaces, DOM components, CSS styles, client-side state, React, Vue, and cross-browser experiences.', '#8b5cf6'),
(4, 'DevOps & Infrastructure Team', 'devops-infra', 'Manages cloud infrastructure, Docker containers, Kubernetes, CI/CD pipelines, SSL certificates, and deployments.', '#f59e0b'),
(5, 'Security Engineering Team', 'security', 'Investigates vulnerabilities, authorization bypasses, XSS, CSRF, SQL injections, sanitization, and cryptographic issues.', '#ef4444'),
(6, 'AI/ML Engineering Team', 'ai-ml', 'Responsible for machine learning pipelines, LLM inference, embeddings, PyTorch, model latency, and prompt engineering.', '#ec4899'),
(7, 'Performance & Reliability Team', 'performance-reliability', 'Focuses on high memory consumption, CPU spikes, latency bottlenecks, caching (Redis), race conditions, and load limits.', '#06b6d4'),
(8, 'General Engineering Team', 'general-engineering', 'Triages cross-cutting bugs, utility libraries, general algorithmic logic, and unclassified software defects.', '#64748b');

-- Seed Users (Passwords: AdminPass123!, ReporterPass123!, DevPass123!)
INSERT INTO `users` (`id`, `email`, `full_name`, `hashed_password`, `role`, `team_id`, `avatar_color`) VALUES
(1, 'admin@bugtriage.io', 'Alex Rivera', '$2b$12$uhgro/sfJpHflhZFsLWF/ugT.c4UzTNejSwn4be8lDJAp5NQnsMJW', 'admin', 8, '#ef4444'),
(2, 'reporter@bugtriage.io', 'Sarah Chen', '$2b$12$uhgro/sfJpHflhZFsLWF/ugT.c4UzTNejSwn4be8lDJAp5NQnsMJW', 'reporter', NULL, '#10b981'),
(3, 'dev@bugtriage.io', 'Marcus Vance', '$2b$12$uhgro/sfJpHflhZFsLWF/ugT.c4UzTNejSwn4be8lDJAp5NQnsMJW', 'developer', 1, '#3b82f6');

-- Set Team Leads
UPDATE `teams` SET `lead_id` = 3 WHERE `id` = 1;
UPDATE `teams` SET `lead_id` = 1 WHERE `id` = 8;

-- Seed Sample Bug Matching Screenshot
INSERT INTO `bugs` (`id`, `bug_code`, `title`, `description`, `language`, `framework`, `steps_to_reproduce`, `expected_behavior`, `actual_behavior`, `error_trace`, `environment_info`, `code_snippet`, `severity`, `original_severity`, `status`, `reporter_id`, `assigned_team_id`, `assigned_developer_id`) VALUES
(1, 'BUG-1001', 'Critical NullPointerException on userData Object at Line 42', 'Unhandled null pointer on userData object during contract initialization in AI_BUG_STK3_R1.', 'Java', 'Spring Boot / Microservices', '1. Call feierest() with empty userData payload.\n2. Access property without defensive null guard.\n3. Runtime crash at line 42.', 'Gracefully return null or default user data.', 'CRITICAL ERROR: NullPointerException at line 42', 'java.lang.NullPointerException: Cannot read field \"userData\" because \"userDate\" is null\n    at AI_BUG_STK3_R1.inteERoctect(AI_BUG_STK3_R1.java:42)', 'Production Cluster | Java 21 | Spring 3.2', 'public feierest(uR)() {\n    Discorte.tick.singopogreNott();\n}\n\n// RiceFeest type acle rldt\npublic inteERoctect = llace(anOotelor ->\n    teton = av cnelonCages.wne();\n    if (vetrost == QI) {\n        return = dtldCooToct("rapmtn([*o "oliat"o, isl*, rorl");\n        return.Slaune(CocintCromemt = BigHatiCkraiss);\n    }\n\npublic Shamoment for = sCrgesBenck() {\n    Typo: Bog_triage.tocpolom("ollo, Delpo- llasertIlle" of sese);\n    restFect(orret = recturm.TecteNd);\n}\n\n// Critical defect location:\nif (userDate != null) {\n    userDate = null;\n    userDate = 0;\n}', 'P0', 'P0', 'Triaged', 2, 1, 3);

-- Seed AI Analysis for Screenshot Bug
INSERT INTO `ai_analyses` (`bug_id`, `summary`, `bug_type`, `root_cause`, `line_numbers`, `trigger_conditions`, `is_hypothesis`, `recommended_severity`, `recommended_severity_evidence`, `recommended_severity_reasoning`, `solution_steps`, `original_snippet`, `patched_snippet`, `fix_explanation`, `recommended_team_name`, `team_routing_reason`, `required_expertise`, `suggested_priority`, `confidence_score`, `model_name`, `is_demo_mode`) VALUES
(1, 'Issue: Unhandled null pointer on \'userData\' object.', 'Runtime Error', 'Defective property dereferencing without preceding null condition check on userData pointer.', 'Line 42', 'Triggers when userDate parameter arrives uninitialized or empty in contract payload.', FALSE, 'P0', 'Unhandled NullPointerException in critical production contract execution pathway.', 'P0 – Critical: Service disruption potential during user session initialization.', '["1. Implement null check before accessing properties.", "2. Guard userData object boundary with defensive nil assertions.", "3. Apply suggested patch and verify regression test suite."]', 'if (userDate != null) {\n    userDate = null;\n    userDate = 0;\n}', 'if (userData != null) {\n    (userData = null;\n    recont null));\n}', 'Implement null check before accessing properties to prevent null pointer dereferencing.', 'Backend API Team', 'Exception stack trace points to core contract microservice failure.', 'Java 21, Null Safety, Defensive Programming', 'P0 – Immediate Hotfix', 0.98, 'Cyber AI Diagnosis Engine v1.0', FALSE);

SET FOREIGN_KEY_CHECKS = 1;
