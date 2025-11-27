<?php
// Simplified SMS Endpoint - No Complex Dependencies
require_once '../config/database.php';
require_once '../config/simple_sms_service.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Load SMS configuration
    $smsConfig = require_once '../config/sms_config_local.php';
    $smsApiKey = $smsConfig['fast2sms']['api_key'];
    $simulationMode = $smsConfig['simulation_mode'] ?? false;
    $smsService = new SimpleSMSService($db, $smsApiKey, $simulationMode);
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Send SMS
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON input');
        }
        
        $message = $input['message'] ?? '';
        $recipients = $input['recipients'] ?? [];
        
        if (empty($message)) {
            throw new Exception('Message is required');
        }
        
        if (empty($recipients)) {
            throw new Exception('Recipients are required');
        }
        
        // Ensure recipients is an array
        if (!is_array($recipients)) {
            $recipients = [$recipients];
        }
        
        // Send SMS using simplified service
        $result = $smsService->sendSMS($message, $recipients);
        
        if ($result['success']) {
            echo json_encode([
                'success' => true,
                'message' => 'SMS sent successfully',
                'data' => $result['data']
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => $result['error'],
                'data' => $result['data']
            ]);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get SMS history
        $action = $_GET['action'] ?? 'history';
        $limit = (int)($_GET['limit'] ?? 50);
        
        if ($action === 'history') {
            $result = $smsService->getSMSHistory($limit);
            
            if ($result['success']) {
                echo json_encode([
                    'success' => true,
                    'data' => $result['data'],
                    'count' => count($result['data'])
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => $result['error'],
                    'data' => []
                ]);
            }
        } else {
            throw new Exception('Invalid action');
        }
        
    } else {
        throw new Exception('Only GET and POST methods are allowed');
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