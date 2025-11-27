<?php
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Get nearby markets based on lat/lng and radius
            $lat = isset($_GET['lat']) ? (float)$_GET['lat'] : null;
            $lng = isset($_GET['lng']) ? (float)$_GET['lng'] : null;
            $radius = isset($_GET['radius']) ? (float)$_GET['radius'] : 5;
            
            if ($lat && $lng) {
                // Calculate distance using Haversine formula
                $query = "SELECT *, 
                         (6371 * acos(cos(radians(?)) * cos(radians(latitude)) 
                         * cos(radians(longitude) - radians(?)) + sin(radians(?)) 
                         * sin(radians(latitude)))) AS distance 
                         FROM markets 
                         HAVING distance < ? 
                         ORDER BY distance ASC";
                
                $stmt = $db->prepare($query);
                $stmt->execute([$lat, $lng, $lat, $radius]);
            } else {
                // Get all markets if no location provided
                $query = "SELECT *, 0 as distance FROM markets ORDER BY name ASC";
                $stmt = $db->prepare($query);
                $stmt->execute();
            }
            
            $markets = $stmt->fetchAll();
            
            // Parse products JSON
            foreach ($markets as &$market) {
                $market['products'] = json_decode($market['products'], true) ?: [];
                $market['distance'] = round((float)$market['distance'], 2);
            }
            
            echo json_encode([
                'success' => true,
                'data' => $markets
            ]);
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            $required_fields = ['name', 'address'];
            foreach ($required_fields as $field) {
                if (!isset($input[$field]) || empty($input[$field])) {
                    throw new Exception("Missing required field: $field");
                }
            }
            
            $query = "INSERT INTO markets (name, address, latitude, longitude, phone, hours, products) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)";
            
            $products_json = isset($input['products']) ? json_encode($input['products']) : '[]';
            
            $stmt = $db->prepare($query);
            $stmt->execute([
                $input['name'],
                $input['address'],
                $input['latitude'] ?? null,
                $input['longitude'] ?? null,
                $input['phone'] ?? null,
                $input['hours'] ?? null,
                $products_json
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Market added successfully',
                'id' => $db->lastInsertId()
            ]);
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
