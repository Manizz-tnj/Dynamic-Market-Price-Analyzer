<?php
require_once 'config/database.php';

header('Content-Type: application/json');

try {
    echo "<h1>🔍 MySQL Connection Test</h1>";
    
    // Test database connection
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    echo "<p>✅ <strong>Database connected successfully!</strong></p>";
    
    // Test if tables exist
    $tables = ['farmers', 'prices', 'markets', 'products', 'sms_history'];
    
    echo "<h2>📋 Table Status:</h2>";
    echo "<ul>";
    
    foreach ($tables as $table) {
        try {
            $stmt = $db->query("SHOW TABLES LIKE '$table'");
            if ($stmt->rowCount() > 0) {
                // Count records in table
                $countStmt = $db->query("SELECT COUNT(*) as count FROM $table");
                $count = $countStmt->fetch()['count'];
                echo "<li>✅ <strong>$table</strong> - $count records</li>";
            } else {
                echo "<li>❌ <strong>$table</strong> - Table not found</li>";
            }
        } catch (Exception $e) {
            echo "<li>❌ <strong>$table</strong> - Error: " . $e->getMessage() . "</li>";
        }
    }
    
    echo "</ul>";
    
    // Test API endpoints
    echo "<h2>🔧 API Endpoint Tests:</h2>";
    echo "<ul>";
    echo "<li><a href='endpoints/farmers.php' target='_blank'>Test Farmers API</a></li>";
    echo "<li><a href='endpoints/prices.php' target='_blank'>Test Prices API</a></li>";
    echo "<li><a href='endpoints/products.php' target='_blank'>Test Products API</a></li>";
    echo "<li><a href='endpoints/markets.php' target='_blank'>Test Markets API</a></li>";
    echo "</ul>";
    
    echo "<h2>📊 Quick Stats:</h2>";
    try {
        $stmt = $db->query("SELECT 
            (SELECT COUNT(*) FROM farmers) as farmer_count,
            (SELECT COUNT(*) FROM prices) as price_count,
            (SELECT COUNT(*) FROM products) as product_count,
            (SELECT COUNT(*) FROM markets) as market_count
        ");
        $stats = $stmt->fetch();
        
        echo "<ul>";
        echo "<li><strong>Farmers:</strong> " . $stats['farmer_count'] . "</li>";
        echo "<li><strong>Prices:</strong> " . $stats['price_count'] . "</li>";
        echo "<li><strong>Products:</strong> " . $stats['product_count'] . "</li>";
        echo "<li><strong>Markets:</strong> " . $stats['market_count'] . "</li>";
        echo "</ul>";
    } catch (Exception $e) {
        echo "<p>❌ Could not fetch statistics: " . $e->getMessage() . "</p>";
    }
    
    echo "<hr>";
    echo "<p><strong>✅ Database connection is working properly!</strong></p>";
    echo "<p>🔗 <a href='../../admin.html'>Go to Admin Panel</a></p>";
    echo "<p>🔗 <a href='../../index.html'>Go to Dashboard</a></p>";
    
} catch (Exception $e) {
    echo "<h1>❌ Database Connection Failed</h1>";
    echo "<p><strong>Error:</strong> " . $e->getMessage() . "</p>";
    
    echo "<h2>🔧 Troubleshooting Steps:</h2>";
    echo "<ol>";
    echo "<li><strong>Check XAMPP:</strong> Ensure Apache and MySQL are running</li>";
    echo "<li><strong>Create Database:</strong> Go to <a href='http://localhost/phpmyadmin' target='_blank'>phpMyAdmin</a> and create 'market_analyzer' database</li>";
    echo "<li><strong>Import Tables:</strong> Import the SQL from api/setup/create_tables.sql</li>";
    echo "<li><strong>Check Config:</strong> Verify database credentials in api/config/database.php</li>";
    echo "</ol>";
    
    echo "<hr>";
    echo "<p>📋 <strong>Current Configuration:</strong></p>";
    echo "<ul>";
    echo "<li><strong>Host:</strong> localhost</li>";
    echo "<li><strong>Database:</strong> market_analyzer</li>";
    echo "<li><strong>Username:</strong> root</li>";
    echo "<li><strong>Password:</strong> (empty)</li>";
    echo "</ul>";
}
?>