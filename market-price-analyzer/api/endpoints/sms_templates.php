<?php
require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            $category = $_GET['category'] ?? null;
            
            if ($id) {
                // Get specific template
                $query = "SELECT * FROM sms_templates WHERE id = ?";
                $stmt = $db->prepare($query);
                $stmt->execute([$id]);
                $template = $stmt->fetch();
                
                if (!$template) {
                    throw new Exception('Template not found');
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => $template
                ]);
            } else {
                // Get all templates
                $where_clause = "WHERE 1=1";
                $params = [];
                
                if ($category) {
                    $where_clause .= " AND category = ?";
                    $params[] = $category;
                }
                
                $query = "SELECT * FROM sms_templates $where_clause ORDER BY category, name";
                $stmt = $db->prepare($query);
                $stmt->execute($params);
                $templates = $stmt->fetchAll();
                
                echo json_encode([
                    'success' => true,
                    'data' => $templates
                ]);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['name']) || !isset($input['message'])) {
                throw new Exception('Name and message are required');
            }
            
            $query = "INSERT INTO sms_templates (name, subject, message, variables, category, is_active) 
                     VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $db->prepare($query);
            $stmt->execute([
                $input['name'],
                $input['subject'] ?? null,
                $input['message'],
                json_encode($input['variables'] ?? []),
                $input['category'] ?? 'general',
                isset($input['is_active']) ? $input['is_active'] : true
            ]);
            
            $template_id = $db->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'message' => 'Template created successfully',
                'id' => $template_id
            ]);
            break;
            
        case 'PUT':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception('Template ID is required');
            }
            
            $input = json_decode(file_get_contents('php://input'), true);
            
            $query = "UPDATE sms_templates SET 
                     name = ?, subject = ?, message = ?, variables = ?, 
                     category = ?, is_active = ?, updated_at = NOW() 
                     WHERE id = ?";
            
            $stmt = $db->prepare($query);
            $stmt->execute([
                $input['name'],
                $input['subject'] ?? null,
                $input['message'],
                json_encode($input['variables'] ?? []),
                $input['category'] ?? 'general',
                isset($input['is_active']) ? $input['is_active'] : true,
                $id
            ]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('Template not found or no changes made');
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Template updated successfully'
            ]);
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            if (!$id) {
                throw new Exception('Template ID is required');
            }
            
            // Soft delete - just set is_active to false
            $query = "UPDATE sms_templates SET is_active = 0, updated_at = NOW() WHERE id = ?";
            $stmt = $db->prepare($query);
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('Template not found');
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Template deleted successfully'
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