-- Create database
CREATE DATABASE IF NOT EXISTS temple_booking;
USE temple_booking;

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    slot_number INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    place VARCHAR(100) NOT NULL,
    mobile VARCHAR(10) NOT NULL,
    booking_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_slot (section_id, slot_number, booking_date),
    INDEX idx_booking_date (booking_date),
    INDEX idx_section_slot (section_id, slot_number)
);

-- Create archive table for old bookings
CREATE TABLE IF NOT EXISTS booking_archive (
    id INT PRIMARY KEY,
    section_id INT NOT NULL,
    slot_number INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    place VARCHAR(100) NOT NULL,
    mobile VARCHAR(10) NOT NULL,
    booking_date DATETIME NOT NULL,
    created_at TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_archived_date (archived_at)
);