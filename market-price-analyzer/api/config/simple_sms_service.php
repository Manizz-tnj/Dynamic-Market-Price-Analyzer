<?php
// Simplified SMS Service - No Complex Dependencies
class SimpleSMSService {
    private $db;
    private $apiKey;
    private $apiUrl;
    private $simulationMode;
    
    public function __construct($database, $apiKey, $simulationMode = false) {
        $this->db = $database;
        $this->apiKey = $apiKey;
        $this->apiUrl = 'https://www.fast2sms.com/dev/bulkV2';
        $this->simulationMode = $simulationMode;
    }
    
    /**
     * Send SMS with simplified approach
     * @param string $message SMS message content
     * @param array $phoneNumbers Array of phone numbers
     * @return array Result with success status and data
     */
    public function sendSMS($message, $phoneNumbers) {
        try {
            // Validate inputs
            if (empty($message)) {
                throw new Exception('Message cannot be empty');
            }
            
            if (empty($phoneNumbers) || !is_array($phoneNumbers)) {
                throw new Exception('Phone numbers must be a non-empty array');
            }
            
            // Clean and validate phone numbers
            $cleanNumbers = [];
            foreach ($phoneNumbers as $number) {
                $cleaned = $this->cleanPhoneNumber($number);
                if ($cleaned) {
                    $cleanNumbers[] = $cleaned;
                }
            }
            
            if (empty($cleanNumbers)) {
                throw new Exception('No valid phone numbers provided');
            }
            
            // Save SMS to database FIRST (before sending)
            // Temporarily disabled for testing
            // $smsId = $this->saveSMSToDatabase($message, $cleanNumbers, 'pending');
            
            // Estimate cost (₹0.50 per SMS)
            $estimatedCost = count($cleanNumbers) * 0.50;
            
            // Try to send SMS via API
            $apiResponse = $this->callSMSAPI($message, $cleanNumbers);
            
            if ($apiResponse['success']) {
                // Update database with success - temporarily disabled
                // $this->updateSMSStatus($smsId, 'sent', $estimatedCost, null);
                
                return [
                    'success' => true,
                    'message' => 'SMS sent successfully',
                    'data' => [
                        'recipients' => count($cleanNumbers),
                        'cost' => $estimatedCost,
                        'status' => 'sent',
                        'api_response' => $apiResponse['data']
                    ]
                ];
            } else {
                // Update database with failure - temporarily disabled
                // $this->updateSMSStatus($smsId, 'failed', 0, $apiResponse['error']);
                
                return [
                    'success' => false,
                    'error' => 'SMS sending failed: ' . $apiResponse['error'],
                    'data' => [
                        'recipients' => count($cleanNumbers),
                        'cost' => 0,
                        'status' => 'failed'
                    ]
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * Save SMS to database with basic columns only
     */
    private function saveSMSToDatabase($message, $phoneNumbers, $status) {
        $sql = "INSERT INTO sms_history (message, recipients, status, recipient_count) 
                VALUES (?, ?, ?, ?)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $message,
            json_encode($phoneNumbers),
            $status,
            count($phoneNumbers)
        ]);
        
        return $this->db->lastInsertId();
    }
    
    /**
     * Update SMS status in database
     */
    private function updateSMSStatus($smsId, $status, $cost = 0, $errorInfo = null) {
        $sql = "UPDATE sms_history 
                SET status = ?, cost = ?, error_message = ?
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$status, $cost, $errorInfo, $smsId]);
    }
    
    /**
     * Clean and validate phone number
     */
    private function cleanPhoneNumber($number) {
        // Remove all non-digits except +
        $cleaned = preg_replace('/[^\d+]/', '', $number);
        
        // If starts with +91, keep as is
        if (strpos($cleaned, '+91') === 0) {
            return $cleaned;
        }
        
        // If starts with 91, add +
        if (strpos($cleaned, '91') === 0 && strlen($cleaned) === 12) {
            return '+' . $cleaned;
        }
        
        // If 10 digits, add +91
        if (strlen($cleaned) === 10) {
            return '+91' . $cleaned;
        }
        
        // Invalid number
        return null;
    }
    
    /**
     * Call SMS API
     */
    private function callSMSAPI($message, $phoneNumbers) {
        try {
            // Check if in simulation mode
            if ($this->simulationMode) {
                return [
                    'success' => true,
                    'data' => [
                        'return' => true,
                        'message' => 'SMS sent successfully (simulation mode)',
                        'request_id' => 'sim_' . time(),
                        'sms' => count($phoneNumbers)
                    ]
                ];
            }
            
            // Prepare phone numbers for API (remove +91)
            $apiNumbers = [];
            foreach ($phoneNumbers as $number) {
                $apiNumbers[] = str_replace('+91', '', $number);
            }
            
            $postData = [
                'message' => $message,
                'numbers' => implode(',', $apiNumbers),
                'route' => 'q',
                'language' => 'english'
            ];
            
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => $this->apiUrl,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $postData,
                CURLOPT_HTTPHEADER => [
                    'authorization: ' . $this->apiKey,
                    'Content-Type: application/x-www-form-urlencoded'
                ],
                CURLOPT_TIMEOUT => 30,
                CURLOPT_SSL_VERIFYPEER => false
            ]);
            
            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $curlError = curl_error($curl);
            curl_close($curl);
            
            if ($curlError) {
                return [
                    'success' => false,
                    'error' => 'cURL Error: ' . $curlError
                ];
            }
            
            if ($httpCode !== 200) {
                return [
                    'success' => false,
                    'error' => 'HTTP Error: ' . $httpCode . ' - Response: ' . $response
                ];
            }
            
            $decoded = json_decode($response, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return [
                    'success' => false,
                    'error' => 'Invalid JSON response'
                ];
            }
            
            if (isset($decoded['return']) && $decoded['return'] === true) {
                return [
                    'success' => true,
                    'data' => $decoded
                ];
            } else {
                return [
                    'success' => false,
                    'error' => $decoded['message'] ?? 'SMS API returned failure'
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'API Exception: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get SMS history
     */
    public function getSMSHistory($limit = 50) {
        try {
            $sql = "SELECT id, message, recipients, status, 
                           cost, recipient_count, error_message
                    FROM sms_history 
                    ORDER BY id DESC 
                    LIMIT ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$limit]);
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => []
            ];
        }
    }
}
?>