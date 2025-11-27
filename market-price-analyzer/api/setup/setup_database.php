<?php
require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    echo "Creating database tables...\n";
    
    // Create products table
    $sql = "CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        unit VARCHAR(20) DEFAULT 'kg',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";
    $db->exec($sql);
    echo "✓ Products table created\n";
    
    // Create markets table
    $sql = "CREATE TABLE IF NOT EXISTS markets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(200),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        contact_phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";
    $db->exec($sql);
    echo "✓ Markets table created\n";
    
    // Create farmers table
    $sql = "CREATE TABLE IF NOT EXISTS farmers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        location VARCHAR(200),
        crops JSON,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";
    $db->exec($sql);
    echo "✓ Farmers table created\n";
    
    // Create prices table
    $sql = "CREATE TABLE IF NOT EXISTS prices (
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
    )";
    $db->exec($sql);
    echo "✓ Prices table created\n";
    
    // Create sms_history table
    $sql = "CREATE TABLE IF NOT EXISTS sms_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        response_data JSON,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    $db->exec($sql);
    echo "✓ SMS history table created\n";
    
    // Insert some sample data
    echo "\nInserting sample data...\n";
    
    // Sample products
    $sql = "INSERT IGNORE INTO products (name, category, unit) VALUES 
        ('Tomato', 'Vegetables', 'kg'),
        ('Onion', 'Vegetables', 'kg'),
        ('Potato', 'Vegetables', 'kg'),
        ('Rice', 'Grains', 'kg'),
        ('Wheat', 'Grains', 'kg')";
    $db->exec($sql);
    echo "✓ Sample products inserted\n";
    
    // Sample markets
    $sql = "INSERT IGNORE INTO markets (name, location, latitude, longitude) VALUES 
        ('Central Market', 'Delhi', 28.6139, 77.2090),
        ('Vegetable Mandi', 'Mumbai', 19.0760, 72.8777),
        ('Farmer Market', 'Bangalore', 12.9716, 77.5946)";
    $db->exec($sql);
    echo "✓ Sample markets inserted\n";
    
    echo "\n✅ Database setup completed successfully!\n";
    echo "You can now test the API using test-api.html\n";
    
} catch (Exception $e) {
    echo "❌ Error setting up database: " . $e->getMessage() . "\n";
}
?>
