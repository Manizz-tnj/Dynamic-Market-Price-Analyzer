<?php
// WhatsApp Price Trends Endpoint
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
    
    // Initialize SMS service for WhatsApp functionality
    $simulationMode = true; // Set to false for real WhatsApp integration
    $smsService = new FreeSMSService($db, $simulationMode);
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON input');
        }
        
        $action = $input['action'] ?? 'send_price_trends';
        $recipients = $input['recipients'] ?? [];
        $farmerNames = $input['farmer_names'] ?? null;
        
        if (empty($recipients)) {
            throw new Exception('Recipients are required');
        }
        
        // Ensure recipients is an array
        if (!is_array($recipients)) {
            $recipients = [$recipients];
        }
        
        switch ($action) {
            case 'send_price_trends':
                // Send WhatsApp message with current price trends
                $result = $smsService->sendWhatsAppPriceTrend($recipients, $farmerNames);
                
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
                break;
                
            case 'preview_message':
                // Just generate and preview the message without sending
                $trends = $smsService->generatePriceTrendMessage();
                $message = $smsService->formatWhatsAppMessage($trends, $farmerNames);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Message preview generated',
                    'data' => [
                        'preview' => $message,
                        'recipients' => count($recipients),
                        'trends_count' => count($trends)
                    ]
                ]);
                break;
                
            default:
                throw new Exception('Invalid action: ' . $action);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = $_GET['action'] ?? 'get_trends';
        
        if ($action === 'get_trends') {
            // Get current price trends data
            $trends = $smsService->generatePriceTrendMessage();
            
            echo json_encode([
                'success' => true,
                'data' => $trends,
                'count' => count($trends),
                'generated_at' => date('c')
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