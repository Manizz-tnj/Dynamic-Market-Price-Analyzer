<?php
// API endpoint for products
require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all products
        $stmt = $db->prepare("SELECT id, name, unit, category FROM products ORDER BY name");
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $products
        ]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Add new product
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['name']) || empty($input['name'])) {
            throw new Exception('Product name is required');
        }
        
        $name = trim($input['name']);
        $unit = $input['unit'] ?? 'kg';
        $category = $input['category'] ?? 'Other';
        
        // Check if product already exists
        $stmt = $db->prepare("SELECT id FROM products WHERE LOWER(name) = LOWER(?)");
        $stmt->execute([$name]);
        
        if ($stmt->fetch()) {
            throw new Exception('Product already exists');
        }
        
        // Insert new product
        $stmt = $db->prepare("INSERT INTO products (name, unit, category) VALUES (?, ?, ?)");
        $stmt->execute([$name, $unit, $category]);
        
        $productId = $db->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $productId,
                'name' => $name,
                'unit' => $unit,
                'category' => $category
            ],
            'message' => 'Product added successfully'
        ]);
        
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'data' => null
    ]);
}
?>