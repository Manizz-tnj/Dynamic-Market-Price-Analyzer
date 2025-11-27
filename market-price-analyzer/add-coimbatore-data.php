<?php
require_once 'api/config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Sample price data for Coimbatore
    $coimbatoreData = [
        ['Tomato', 40, 'kg', 'Coimbatore Central Market', 'Coimbatore'],
        ['Onion', 30, 'kg', 'Coimbatore Vegetable Market', 'Coimbatore'],
        ['Potato', 25, 'kg', 'Coimbatore Central Market', 'Coimbatore'],
        ['Carrot', 35, 'kg', 'Coimbatore Farmers Market', 'Coimbatore'],
        ['Cabbage', 20, 'kg', 'Coimbatore Central Market', 'Coimbatore'],
        ['Beans', 50, 'kg', 'Coimbatore Vegetable Market', 'Coimbatore'],
        ['Apple', 120, 'kg', 'Coimbatore Fruit Market', 'Coimbatore'],
        ['Banana', 40, 'kg', 'Coimbatore Farmers Market', 'Coimbatore'],
        ['Mango', 80, 'kg', 'Coimbatore Fruit Market', 'Coimbatore'],
        ['Orange', 60, 'kg', 'Coimbatore Central Market', 'Coimbatore']
    ];
    
    $query = "INSERT INTO prices (product_name, price, unit, market_name, location, date_recorded) 
              VALUES (?, ?, ?, ?, ?, CURDATE())";
    
    $stmt = $db->prepare($query);
    
    foreach ($coimbatoreData as $item) {
        $stmt->execute($item);
        echo "Added: {$item[0]} - ₹{$item[1]}/{$item[2]} at {$item[3]}, {$item[4]}\n";
    }
    
    echo "\nSuccessfully added " . count($coimbatoreData) . " price records for Coimbatore!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>