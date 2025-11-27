<?php
// Free SMS Endpoint - Multiple Provider Support
require_once '../config/database.php';
require_once '../config/free_sms_service.php';

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
    
    // Initialize free SMS service
    $simulationMode = true; // Set to false after configuring real API keys
    $smsService = new FreeSMSService($db, $simulationMode);
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Send SMS
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON input');
        }
        
        $message = $input['message'] ?? '';
        $recipients = $input['recipients'] ?? [];
        $provider = $input['provider'] ?? 'textbelt'; // Default provider
        
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
        
        // Set provider if specified
        if (!$smsService->setProvider($provider)) {
            throw new Exception('Invalid provider: ' . $provider);
        }
        
        // Send SMS using free service
        $result = $smsService->sendSMS($message, $recipients, $provider);
        
        if ($result['success']) {
            echo json_encode([
                'success' => true,
                'message' => $result['message'],
                'data' => $result['data']
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => $result['error'],
                'data' => $result['data'] ?? null
            ]);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? 'providers';
        
        if ($action === 'providers') {
            // Get available providers
            $providers = $smsService->getAvailableProviders();
            echo json_encode([
                'success' => true,
                'data' => $providers,
                'current_provider' => 'textbelt'
            ]);
        } elseif ($action === 'history') {
            // Get SMS history
            $limit = (int)($_GET['limit'] ?? 50);
            $result = $smsService->getSMSHistory($limit);
            
            echo json_encode([
                'success' => true,
                'data' => $result['data'],
                'count' => count($result['data'])
            ]);
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