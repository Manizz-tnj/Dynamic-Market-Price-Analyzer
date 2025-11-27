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
        throw new Exception('Database connection failed - check XAMPP MySQL service');
    }
    
    // Test database connection
    $db->query('SELECT 1');
    
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        case 'GET':
            // Get all farmers with filtering
            $where_conditions = [];
            $params = [];
            
            if (isset($_GET['status'])) {
                $where_conditions[] = "status = ?";
                $params[] = $_GET['status'];
            }
            
            if (isset($_GET['crop_type'])) {
                $where_conditions[] = "crop_type = ?";
                $params[] = $_GET['crop_type'];
            }
            
            if (isset($_GET['search'])) {
                $where_conditions[] = "(name LIKE ? OR phone LIKE ? OR location LIKE ?)";
                $search = '%' . $_GET['search'] . '%';
                $params[] = $search;
                $params[] = $search;
                $params[] = $search;
            }
            
            $query = "SELECT * FROM farmers";
            if (!empty($where_conditions)) {
                $query .= " WHERE " . implode(" AND ", $where_conditions);
            }
            $query .= " ORDER BY created_at DESC";
            
            // Add pagination only if explicitly requested
            if (isset($_GET['page']) && isset($_GET['limit'])) {
                $page = (int)$_GET['page'];
                $limit = (int)$_GET['limit'];
                $offset = ($page - 1) * $limit;
                
                $query .= " LIMIT ? OFFSET ?";
                $params[] = $limit;
                $params[] = $offset;
            }
            
            $stmt = $db->prepare($query);
            $stmt->execute($params);
            $farmers = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Add default status if missing and format crops
            $formatted_farmers = array_map(function($farmer) {
                return [
                    'id' => $farmer['id'],
                    'name' => $farmer['name'],
                    'phone' => $farmer['phone'],
                    'location' => $farmer['location'] ?? '',
                    'crops' => $farmer['crops'] ? json_decode($farmer['crops'], true) : [],
                    'latitude' => $farmer['latitude'],
                    'longitude' => $farmer['longitude'],
                    'status' => 'active', // Default status since table doesn't have this field
                    'created_at' => $farmer['created_at'],
                    'updated_at' => $farmer['updated_at']
                ];
            }, $farmers);
            
            if (isset($_GET['page']) && isset($_GET['limit'])) {
                // Get total count for pagination
                $count_query = "SELECT COUNT(*) FROM farmers";
                if (!empty($where_conditions)) {
                    $count_query .= " WHERE " . implode(" AND ", $where_conditions);
                    $count_params = array_slice($params, 0, -2); // Remove limit and offset
                } else {
                    $count_params = [];
                }
                
                $count_stmt = $db->prepare($count_query);
                $count_stmt->execute($count_params);
                $total = $count_stmt->fetchColumn();
                
                echo json_encode([
                    'success' => true,
                    'data' => $formatted_farmers,
                    'pagination' => [
                        'page' => $page,
                        'limit' => $limit,
                        'total' => (int)$total,
                        'total_pages' => ceil($total / $limit)
                    ]
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'data' => $formatted_farmers
                ]);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Debug logging
            error_log("Farmer POST data received: " . print_r($input, true));
            
            if (!$input) {
                throw new Exception('Invalid JSON input');
            }
            
            $required_fields = ['name', 'phone'];
            foreach ($required_fields as $field) {
                if (!isset($input[$field]) || empty($input[$field])) {
                    throw new Exception("Missing required field: $field");
                }
            }
            
            // Clean phone number (remove spaces, dashes, etc.)
            $clean_phone = preg_replace('/[^0-9+]/', '', $input['phone']);
            
            // Check if phone already exists
            $check_query = "SELECT id FROM farmers WHERE phone = ?";
            $check_stmt = $db->prepare($check_query);
            $check_stmt->execute([$clean_phone]);
            if ($check_stmt->fetch()) {
                throw new Exception('Phone number already exists');
            }
            
            // Prepare crops as JSON if provided
            $crops = null;
            if (!empty($input['crops'])) {
                if (is_array($input['crops'])) {
                    $crops = json_encode($input['crops']);
                } else {
                    $crops = json_encode([$input['crops']]);
                }
            }
            
            $query = "INSERT INTO farmers (name, phone, location, crops, latitude, longitude) 
                     VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $db->prepare($query);
            $success = $stmt->execute([
                $input['name'],
                $clean_phone,
                $input['location'] ?? '',
                $crops,
                isset($input['latitude']) ? floatval($input['latitude']) : null,
                isset($input['longitude']) ? floatval($input['longitude']) : null
            ]);
            
            if (!$success) {
                $errorInfo = $stmt->errorInfo();
                error_log("Database error: " . print_r($errorInfo, true));
                throw new Exception('Failed to save farmer to database: ' . $errorInfo[2]);
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Farmer added successfully',
                'id' => $db->lastInsertId()
            ]);
            break;
            
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                throw new Exception('Missing farmer ID');
            }
            
            $updates = [];
            $params = [];
            
            $allowed_fields = ['name', 'phone', 'email', 'location', 'crop_type', 'address', 'status'];
            foreach ($allowed_fields as $field) {
                if (isset($input[$field])) {
                    $updates[] = "$field = ?";
                    $params[] = $input[$field];
                }
            }
            
            if (empty($updates)) {
                throw new Exception('No fields to update');
            }
            
            $params[] = $input['id'];
            $query = "UPDATE farmers SET " . implode(', ', $updates) . " WHERE id = ?";
            
            $stmt = $db->prepare($query);
            $stmt->execute($params);
            
            echo json_encode([
                'success' => true,
                'message' => 'Farmer updated successfully'
            ]);
            break;
            
        case 'DELETE':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id'])) {
                throw new Exception('Missing farmer ID');
            }
            
            $query = "DELETE FROM farmers WHERE id = ?";
            $stmt = $db->prepare($query);
            $stmt->execute([$input['id']]);
            
            echo json_encode([
                'success' => true,
                'message' => 'Farmer deleted successfully'
            ]);
            break;
            
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    error_log("Farmers API Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => $e->getMessage(),
        'debug_info' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'method' => $_SERVER['REQUEST_METHOD']
        ]
    ]);
} catch (Error $e) {
    http_response_code(500);
    error_log("Farmers API Fatal Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage(),
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
