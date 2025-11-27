<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../config/database.php';
require_once '../config/sms_service.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Auto-fix missing columns in sms_history table
    try {
        // Check if recipient_count column exists
        $checkColumn = $db->prepare("SHOW COLUMNS FROM sms_history LIKE 'recipient_count'");
        $checkColumn->execute();
        
        if ($checkColumn->rowCount() == 0) {
            // Add missing columns
            $db->exec("ALTER TABLE sms_history ADD COLUMN recipient_count INT DEFAULT 1 AFTER message");
            $db->exec("ALTER TABLE sms_history ADD COLUMN recipients JSON AFTER recipient_count");
            $db->exec("ALTER TABLE sms_history ADD COLUMN cost DECIMAL(10, 2) DEFAULT 0.00 AFTER recipients");
        }
    } catch (Exception $e) {
        // If auto-fix fails, log but continue (columns might already exist)
        error_log("SMS table auto-fix warning: " . $e->getMessage());
    }
    
    $smsService = new SMSService($db);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Service initialization failed: ' . $e->getMessage()
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'POST':
            $action = $_GET['action'] ?? 'send';
            
            switch ($action) {
                case 'send':
                    $input = json_decode(file_get_contents('php://input'), true);
                    
                    if (!isset($input['message']) || !isset($input['recipients'])) {
                        throw new Exception('Missing required fields: message and recipients');
                    }
                    
                    $message = $input['message'];
                    $recipients = $input['recipients'];
                    $schedule_time = $input['schedule_time'] ?? null;
                    $template_id = $input['template_id'] ?? null;
                    
                    // If template is used, process it
                    if ($template_id && isset($input['template_variables'])) {
                        $processed = $smsService->processTemplate($template_id, $input['template_variables']);
                        $message = $processed['message'];
                    }
                    
                    $result = $smsService->sendSMS($message, $recipients, $schedule_time, $template_id);
                    echo json_encode($result);
                    break;
                    
                case 'send_template':
                    $input = json_decode(file_get_contents('php://input'), true);
                    
                    if (!isset($input['template_id']) || !isset($input['recipients'])) {
                        throw new Exception('Missing required fields: template_id and recipients');
                    }
                    
                    $template_id = $input['template_id'];
                    $recipients = $input['recipients'];
                    $variables = $input['variables'] ?? [];
                    $schedule_time = $input['schedule_time'] ?? null;
                    
                    $processed = $smsService->processTemplate($template_id, $variables);
                    $result = $smsService->sendSMS($processed['message'], $recipients, $schedule_time, $template_id);
                    echo json_encode($result);
                    break;
                    
                case 'bulk_farmers':
                    $input = json_decode(file_get_contents('php://input'), true);
                    
                    if (!isset($input['message'])) {
                        throw new Exception('Message is required');
                    }
                    
                    // Get all farmer phone numbers
                    $farmers_query = "SELECT phone FROM farmers WHERE phone IS NOT NULL AND phone != ''";
                    $farmers_stmt = $db->prepare($farmers_query);
                    $farmers_stmt->execute();
                    $farmers = $farmers_stmt->fetchAll();
                    
                    $recipients = array_column($farmers, 'phone');
                    
                    if (empty($recipients)) {
                        throw new Exception('No farmer phone numbers found');
                    }
                    
                    $message = $input['message'];
                    $schedule_time = $input['schedule_time'] ?? null;
                    
                    $result = $smsService->sendSMS($message, $recipients, $schedule_time);
                    echo json_encode($result);
                    break;
                    
                case 'price_alert':
                    $input = json_decode(file_get_contents('php://input'), true);
                    
                    if (!isset($input['product']) || !isset($input['market'])) {
                        throw new Exception('Product and market are required');
                    }
                    
                    // Get latest price for the product
                    $price_query = "SELECT * FROM prices WHERE product_name = ? AND market_name = ? ORDER BY date_recorded DESC LIMIT 1";
                    $price_stmt = $db->prepare($price_query);
                    $price_stmt->execute([$input['product'], $input['market']]);
                    $price_data = $price_stmt->fetch();
                    
                    if (!$price_data) {
                        throw new Exception('Price data not found for the specified product and market');
                    }
                    
                    // Get farmers interested in this product
                    $farmers_query = "SELECT phone FROM farmers WHERE JSON_CONTAINS(crops, ?)";
                    $farmers_stmt = $db->prepare($farmers_query);
                    $farmers_stmt->execute(['"' . $input['product'] . '"']);
                    $farmers = $farmers_stmt->fetchAll();
                    
                    $recipients = array_column($farmers, 'phone');
                    
                    if (empty($recipients)) {
                        throw new Exception('No farmers found for this product');
                    }
                    
                    // Use price alert template
                    $variables = [
                        'name' => 'Farmer',
                        'product' => $price_data['product_name'],
                        'price' => $price_data['price'],
                        'unit' => $price_data['unit'],
                        'market' => $price_data['market_name']
                    ];
                    
                    $processed = $smsService->processTemplate(1, $variables); // Assuming template ID 1 is price alert
                    $result = $smsService->sendSMS($processed['message'], $recipients);
                    echo json_encode($result);
                    break;
                    
                default:
                    throw new Exception('Invalid action');
            }
            break;
            
        case 'GET':
            $action = $_GET['action'] ?? 'history';
            
            switch ($action) {
                case 'history':
                    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
                    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
                    $status = $_GET['status'] ?? null;
                    
                    $result = $smsService->getSMSHistory($page, $limit, $status);
                    echo json_encode([
                        'success' => true,
                        'data' => $result['data'],
                        'pagination' => $result['pagination']
                    ]);
                    break;
                    
                case 'templates':
                    $category = $_GET['category'] ?? null;
                    $templates = $smsService->getTemplates($category);
                    echo json_encode([
                        'success' => true,
                        'data' => $templates
                    ]);
                    break;
                    
                case 'template':
                    if (!isset($_GET['id'])) {
                        throw new Exception('Template ID is required');
                    }
                    
                    $template_id = $_GET['id'];
                    $query = "SELECT * FROM sms_templates WHERE id = ? AND is_active = 1";
                    $stmt = $db->prepare($query);
                    $stmt->execute([$template_id]);
                    $template = $stmt->fetch();
                    
                    if (!$template) {
                        throw new Exception('Template not found');
                    }
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $template
                    ]);
                    break;
                    
                case 'stats':
                    // Get SMS statistics
                    $stats_query = "
                        SELECT 
                            COUNT(*) as total_sms,
                            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_sms,
                            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_sms,
                            SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_sms,
                            SUM(recipient_count) as total_recipients,
                            SUM(cost) as total_cost,
                            COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_sms
                        FROM sms_history
                    ";
                    $stats_stmt = $db->prepare($stats_query);
                    $stats_stmt->execute();
                    $stats = $stats_stmt->fetch();
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $stats
                    ]);
                    break;
                    
                default:
                    throw new Exception('Invalid action');
            }
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
