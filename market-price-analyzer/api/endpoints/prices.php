<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            // Get all prices with optional filtering
            $category = $_GET['category'] ?? null;
            $limit = $_GET['limit'] ?? 50;
            
            $query = "SELECT * FROM prices ORDER BY created_at DESC";
            
            if ($limit) {
                $query .= " LIMIT " . intval($limit);
            }
            
            $stmt = $db->prepare($query);
            $stmt->execute();
            $prices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format for dashboard display
            $formatted_prices = array_map(function($price) {
                // Determine category based on product name
                $fruits = ['Apple', 'Banana', 'Orange', 'Mango', 'Grapes', 'Pomegranate', 'Papaya', 'Watermelon'];
                $category = in_array($price['product_name'], $fruits) ? 'fruits' : 'vegetables';
                
                return [
                    'id' => $price['id'],
                    'name' => $price['product_name'],
                    'product_name' => $price['product_name'],
                    'category' => $category,
                    'price' => (float)$price['price'],
                    'unit' => $price['unit'],
                    'market_name' => $price['market_name'] ?? '',
                    'location' => $price['location'],
                    'date_recorded' => $price['date_recorded'],
                    'created_at' => $price['created_at'],
                    'change' => 0 // Will be calculated later
                ];
            }, $prices);
            
            echo json_encode([
                'success' => true,
                'data' => $formatted_prices,
                'timestamp' => date('c')
            ]);
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                throw new Exception('Invalid JSON input');
            }
            
            // Validate required fields
            $required_fields = ['product_name', 'price'];
            foreach ($required_fields as $field) {
                if (!isset($input[$field]) || empty($input[$field])) {
                    throw new Exception("Missing required field: $field");
                }
            }
            
            $product_name = $input['product_name'];
            $price = floatval($input['price']);
            $unit = $input['unit'] ?? 'kg';
            $market_name = $input['market_name'] ?? '';
            $location = $input['location'] ?? '';
            $farmer_id = !empty($input['farmer_id']) ? intval($input['farmer_id']) : null;
            $market_id = !empty($input['market_id']) ? intval($input['market_id']) : null;
            
            $query = "INSERT INTO prices (product_name, price, unit, market_name, location, farmer_id, market_id, date_recorded) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())";
            
            $stmt = $db->prepare($query);
            $stmt->execute([$product_name, $price, $unit, $market_name, $location, $farmer_id, $market_id]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Price added successfully',
                'id' => $db->lastInsertId()
            ]);
            break;
            
        case 'PUT':
            // Update existing price
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                throw new Exception('Invalid JSON input');
            }
            
            // Get price ID from URL or input
            $id = $_GET['id'] ?? $input['id'] ?? null;
            
            if (!$id) {
                throw new Exception('Price ID is required for update');
            }
            
            // Check if price exists
            $checkQuery = "SELECT id FROM prices WHERE id = ?";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->execute([$id]);
            
            if ($checkStmt->rowCount() === 0) {
                throw new Exception('Price record not found');
            }
            
            // Build update query dynamically based on provided fields
            $updateFields = [];
            $updateValues = [];
            
            if (isset($input['product_name']) && !empty($input['product_name'])) {
                $updateFields[] = "product_name = ?";
                $updateValues[] = $input['product_name'];
            }
            
            if (isset($input['price'])) {
                $updateFields[] = "price = ?";
                $updateValues[] = floatval($input['price']);
            }
            
            if (isset($input['unit'])) {
                $updateFields[] = "unit = ?";
                $updateValues[] = $input['unit'];
            }
            
            if (isset($input['market_name'])) {
                $updateFields[] = "market_name = ?";
                $updateValues[] = $input['market_name'];
            }
            
            if (isset($input['location'])) {
                $updateFields[] = "location = ?";
                $updateValues[] = $input['location'];
            }
            
            if (isset($input['farmer_id'])) {
                $updateFields[] = "farmer_id = ?";
                $updateValues[] = !empty($input['farmer_id']) ? intval($input['farmer_id']) : null;
            }
            
            if (isset($input['market_id'])) {
                $updateFields[] = "market_id = ?";
                $updateValues[] = !empty($input['market_id']) ? intval($input['market_id']) : null;
            }
            
            if (empty($updateFields)) {
                throw new Exception('No fields provided for update');
            }
            
            // Add updated timestamp
            $updateFields[] = "updated_at = NOW()";
            $updateValues[] = $id; // For WHERE clause
            
            $updateQuery = "UPDATE prices SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->execute($updateValues);
            
            // Get updated record
            $getQuery = "SELECT * FROM prices WHERE id = ?";
            $getStmt = $db->prepare($getQuery);
            $getStmt->execute([$id]);
            $updatedPrice = $getStmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'Price updated successfully',
                'data' => $updatedPrice
            ]);
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                throw new Exception('Price ID is required');
            }
            
            $query = "DELETE FROM prices WHERE id = ?";
            $stmt = $db->prepare($query);
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Price deleted successfully'
                ]);
            } else {
                throw new Exception('Price not found');
            }
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
