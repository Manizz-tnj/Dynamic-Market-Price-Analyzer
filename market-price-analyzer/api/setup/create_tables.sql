-- Market Price Analyzer Database Setup
-- Run this script to create all required tables

-- Create database (uncomment if needed)
-- CREATE DATABASE IF NOT EXISTS market_analyzer;
-- USE market_analyzer;

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    unit VARCHAR(20) DEFAULT 'kg',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Markets table
CREATE TABLE IF NOT EXISTS markets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Farmers table
CREATE TABLE IF NOT EXISTS farmers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    location VARCHAR(200),
    crops JSON,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Prices table
CREATE TABLE IF NOT EXISTS prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'kg',
    market_name VARCHAR(100),
    location VARCHAR(200),
    farmer_id INT,
    market_id INT,
    date_recorded DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE SET NULL,
    FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE SET NULL
);

-- SMS history table
CREATE TABLE IF NOT EXISTS sms_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT NOT NULL,
    recipient_count INT DEFAULT 1,
    recipients JSON,
    cost DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('pending', 'sent', 'failed', 'scheduled', 'cancelled') DEFAULT 'pending',
    schedule_time TIMESTAMP NULL,
    template_id INT NULL,
    response_data JSON,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- SMS templates table
CREATE TABLE IF NOT EXISTS sms_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    variables JSON,
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- SMS recipients table (for tracking individual SMS status)
CREATE TABLE IF NOT EXISTS sms_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sms_history_id INT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status ENUM('pending', 'sent', 'failed', 'delivered') DEFAULT 'pending',
    response_data JSON,
    error_message TEXT NULL,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sms_history_id) REFERENCES sms_history(id) ON DELETE CASCADE
);

-- Insert sample data
INSERT IGNORE INTO products (name, category, unit) VALUES 
    ('Tomato', 'Vegetables', 'kg'),
    ('Onion', 'Vegetables', 'kg'),
    ('Potato', 'Vegetables', 'kg'),
    ('Rice', 'Grains', 'kg'),
    ('Wheat', 'Grains', 'kg'),
    ('Apple', 'Fruits', 'kg'),
    ('Banana', 'Fruits', 'dozen'),
    ('Carrot', 'Vegetables', 'kg'),
    ('Cabbage', 'Vegetables', 'piece'),
    ('Cauliflower', 'Vegetables', 'piece');

-- Sample markets
INSERT IGNORE INTO markets (name, location, latitude, longitude, contact_phone) VALUES 
    ('Central Market', 'Delhi', 28.6139, 77.2090, '+91-11-23456789'),
    ('Vegetable Mandi', 'Mumbai', 19.0760, 72.8777, '+91-22-23456789'),
    ('Farmer Market', 'Bangalore', 12.9716, 77.5946, '+91-80-23456789'),
    ('Local Bazaar', 'Chennai', 13.0827, 80.2707, '+91-44-23456789'),
    ('Wholesale Market', 'Kolkata', 22.5726, 88.3639, '+91-33-23456789');

-- Sample farmers (commented out - add manually via admin panel)
-- INSERT IGNORE INTO farmers (name, phone, location, crops) VALUES 
--     ('Ramesh Kumar', '+91-9876543210', 'Delhi', '["Tomato", "Onion", "Potato"]'),
--     ('Suresh Patel', '+91-9876543211', 'Gujarat', '["Rice", "Wheat", "Cotton"]'),
--     ('Mahesh Singh', '+91-9876543212', 'Punjab', '["Wheat", "Rice", "Sugarcane"]');

-- Sample prices (commented out - add manually via admin panel)
-- INSERT IGNORE INTO prices (product_name, price, unit, market_name, location, date_recorded) VALUES 
--     ('Tomato', 45.00, 'kg', 'Central Market', 'Delhi', CURDATE()),
--     ('Onion', 35.00, 'kg', 'Central Market', 'Delhi', CURDATE()),
--     ('Potato', 25.00, 'kg', 'Central Market', 'Delhi', CURDATE()),
--     ('Rice', 65.00, 'kg', 'Vegetable Mandi', 'Mumbai', CURDATE()),
--     ('Wheat', 30.00, 'kg', 'Farmer Market', 'Bangalore', CURDATE());

-- Sample SMS templates
INSERT IGNORE INTO sms_templates (name, subject, message, variables, category) VALUES 
    ('Price Alert', 'Today\'s Market Prices', 'Hi {name}, Today\'s prices: {product} - Rs.{price}/{unit} at {market}. Best deals available!', '["name", "product", "price", "unit", "market"]', 'price_alert'),
    ('Weather Update', 'Weather Advisory', 'Dear Farmer, Weather update for {location}: {weather_info}. Take necessary precautions for your crops.', '["location", "weather_info"]', 'weather'),
    ('General Notification', 'Market Update', 'Hello {name}, {message}. Thank you for using our service.', '["name", "message"]', 'general'),
    ('Price Drop Alert', 'Price Drop Alert', 'Great news! {product} price dropped to Rs.{price}/{unit} at {market}. Grab this opportunity!', '["product", "price", "unit", "market"]', 'price_alert'),
    ('New Market Added', 'New Market Available', 'Hi {name}, A new market "{market}" has been added in {location}. Check latest prices now!', '["name", "market", "location"]', 'general');

-- Show created tables
SHOW TABLES;
