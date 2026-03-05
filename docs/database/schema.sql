-- Project RM: Event Management System
-- Database Schema for MySQL

CREATE DATABASE IF NOT EXISTS event_db;
USE event_db;

-- ปิดการตรวจสอบ Foreign Key ชั่วคราวเพื่อให้ Drop Table ได้ง่าย
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS activity_benefits;
DROP TABLE IF EXISTS activity_conditions;
DROP TABLE IF EXISTS activity_tags;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Table: users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    student_id VARCHAR(20) DEFAULT NULL, -- เฉพาะนักศึกษา
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'organizer', 'admin') NOT NULL DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: activities
CREATE TABLE activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizer_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    status ENUM('open', 'closed', 'completed') DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_organizer FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: activity_tags
CREATE TABLE activity_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    CONSTRAINT fk_activity_tags FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: activity_conditions
CREATE TABLE activity_conditions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    condition_text TEXT NOT NULL,
    CONSTRAINT fk_activity_conditions FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: activity_benefits
CREATE TABLE activity_benefits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    benefit_text TEXT NOT NULL,
    CONSTRAINT fk_activity_benefits FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table: registrations
CREATE TABLE registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    student_id INT NOT NULL,
    register_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    attendance ENUM('attended', 'absent') DEFAULT 'absent',
    check_in_time DATETIME DEFAULT NULL,
    CONSTRAINT fk_reg_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    CONSTRAINT fk_reg_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table: certificates
CREATE TABLE certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL,
    issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    certificate_url VARCHAR(255) NOT NULL,
    CONSTRAINT fk_cert_registration FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
