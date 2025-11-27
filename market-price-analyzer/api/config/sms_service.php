<?php
require_once __DIR__ . '/sms_config.php';

/**
 * SMS Service Class
 * Handles SMS sending through various providers
 */
class SMSService {
    private $db;
    private $config;
    private $provider;
    
    public function __construct($database_connection) {
        $this->db = $database_connection;
        $this->config = SMSConfig::getProviderConfig();
        
        // Get the current provider name
        $local_config_file = __DIR__ . '/sms_config_local.php';
        if (file_exists($local_config_file)) {
            $local_config = require $local_config_file;
            $this->provider = $local_config['provider'] ?? SMSConfig::SERVICE_PROVIDER;
        } else {
            $this->provider = SMSConfig::SERVICE_PROVIDER;
        }
    }
    
    /**
     * Send SMS to single or multiple recipients
     */
    public function sendSMS($message, $recipients, $schedule_time = null, $template_id = null) {
        try {
            // Validate inputs
            if (empty($message) || empty($recipients)) {
                throw new Exception('Message and recipients are required');
            }
            
            // Ensure recipients is an array
            if (!is_array($recipients)) {
                $recipients = [$recipients];
            }
            
            // Validate and normalize phone numbers
            $valid_recipients = [];
            foreach ($recipients as $phone) {
                $normalized_phone = SMSConfig::validatePhoneNumber($phone);
                if ($normalized_phone) {
                    $valid_recipients[] = $normalized_phone;
                } else {
                    error_log("Invalid phone number: $phone");
                }
            }
            
            if (empty($valid_recipients)) {
                throw new Exception('No valid phone numbers provided');
            }
            
            // Calculate cost
            $cost = count($valid_recipients) * SMSConfig::SMS_COST;
            
            // Determine status
            $status = $schedule_time ? 'scheduled' : 'pending';
            $schedule_timestamp = $schedule_time ? date('Y-m-d H:i:s', strtotime($schedule_time)) : null;
            
            // Check which columns exist in the table
            $columnsCheck = $this->db->prepare("SHOW COLUMNS FROM sms_history");
            $columnsCheck->execute();
            $existingColumns = array_column($columnsCheck->fetchAll(PDO::FETCH_ASSOC), 'Field');
            
            // Build dynamic insert query based on available columns
            $columns = ['message'];
            $values = [$message];
            
            if (in_array('recipient_count', $existingColumns)) {
                $columns[] = 'recipient_count';
                $values[] = count($valid_recipients);
            }
            
            if (in_array('recipients', $existingColumns)) {
                $columns[] = 'recipients';
                $values[] = json_encode($valid_recipients);
            }
            
            if (in_array('cost', $existingColumns)) {
                $columns[] = 'cost';
                $values[] = $cost;
            }
            
            if (in_array('status', $existingColumns)) {
                $columns[] = 'status';
                $values[] = $status;
            }
            
            if (in_array('schedule_time', $existingColumns) && $schedule_timestamp) {
                $columns[] = 'schedule_time';
                $values[] = $schedule_timestamp;
            }
            
            if (in_array('template_id', $existingColumns) && $template_id) {
                $columns[] = 'template_id';
                $values[] = $template_id;
            }
            
            $placeholders = str_repeat('?,', count($values) - 1) . '?';
            $query = "INSERT INTO sms_history (" . implode(', ', $columns) . ") VALUES ($placeholders)";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute($values);
            
            $sms_id = $this->db->lastInsertId();
            
            // If not scheduled, send immediately
            if (!$schedule_time) {
                return $this->processSMS($sms_id, $message, $valid_recipients);
            }
            
            return [
                'success' => true,
                'message' => 'SMS scheduled successfully',
                'sms_id' => $sms_id,
                'recipients' => count($valid_recipients),
                'cost' => $cost,
                'scheduled_for' => $schedule_timestamp
            ];
            
        } catch (Exception $e) {
            error_log("SMS Error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Process SMS sending through the configured provider
     */
    private function processSMS($sms_id, $message, $recipients) {
        try {
            $results = [];
            $total_sent = 0;
            $total_failed = 0;
            
            foreach ($recipients as $phone) {
                // Insert recipient record
                $recipient_query = "INSERT INTO sms_recipients (sms_history_id, phone, status) VALUES (?, ?, 'pending')";
                $recipient_stmt = $this->db->prepare($recipient_query);
                $recipient_stmt->execute([$sms_id, $phone]);
                $recipient_id = $this->db->lastInsertId();
                
                // Send SMS based on provider
                $result = $this->sendSingleSMS($phone, $message);
                
                if ($result['success']) {
                    $total_sent++;
                    $this->updateRecipientStatus($recipient_id, 'sent', $result);
                } else {
                    $total_failed++;
                    $this->updateRecipientStatus($recipient_id, 'failed', $result);
                }
                
                $results[] = [
                    'phone' => $phone,
                    'status' => $result['success'] ? 'sent' : 'failed',
                    'message' => $result['message'] ?? null,
                    'response' => $result['response'] ?? null
                ];
            }
            
            // Update SMS history status
            $final_status = $total_failed == 0 ? 'sent' : ($total_sent == 0 ? 'failed' : 'partial');
            $this->updateSMSStatus($sms_id, $final_status, [
                'total_sent' => $total_sent,
                'total_failed' => $total_failed,
                'details' => $results
            ]);
            
            return [
                'success' => $total_sent > 0,
                'message' => "SMS processed: $total_sent sent, $total_failed failed",
                'sms_id' => $sms_id,
                'sent' => $total_sent,
                'failed' => $total_failed,
                'details' => $results
            ];
            
        } catch (Exception $e) {
            $this->updateSMSStatus($sms_id, 'failed', ['error' => $e->getMessage()]);
            throw $e;
        }
    }
    
    /**
     * Send SMS through specific provider
     */
    private function sendSingleSMS($phone, $message) {
        switch ($this->provider) {
            case 'textlocal':
                return $this->sendTextLocalSMS($phone, $message);
            case 'twilio':
                return $this->sendTwilioSMS($phone, $message);
            case 'msg91':
                return $this->sendMSG91SMS($phone, $message);
            case 'fast2sms':
                return $this->sendFast2SMS($phone, $message);
            default:
                // Simulation mode for testing
                return $this->simulateSMS($phone, $message);
        }
    }
    
    /**
     * TextLocal SMS Implementation
     */
    private function sendTextLocalSMS($phone, $message) {
        try {
            $data = [
                'apikey' => $this->config['api_key'],
                'numbers' => $phone,
                'message' => $message,
                'sender' => $this->config['sender']
            ];
            
            $ch = curl_init($this->config['api_url']);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            $result = json_decode($response, true);
            
            if ($http_code == 200 && isset($result['status']) && $result['status'] == 'success') {
                return [
                    'success' => true,
                    'message' => 'SMS sent successfully',
                    'response' => $result
                ];
            } else {
                return [
                    'success' => false,
                    'message' => $result['errors'][0]['message'] ?? 'Failed to send SMS',
                    'response' => $result
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'response' => null
            ];
        }
    }
    
    /**
     * Twilio SMS Implementation
     */
    private function sendTwilioSMS($phone, $message) {
        try {
            $url = "https://api.twilio.com/2010-04-01/Accounts/" . $this->config['account_sid'] . "/Messages.json";
            
            $data = [
                'From' => $this->config['from_number'],
                'To' => $phone,
                'Body' => $message
            ];
            
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_USERPWD, $this->config['account_sid'] . ':' . $this->config['auth_token']);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            $result = json_decode($response, true);
            
            if ($http_code == 201) {
                return [
                    'success' => true,
                    'message' => 'SMS sent successfully',
                    'response' => $result
                ];
            } else {
                return [
                    'success' => false,
                    'message' => $result['message'] ?? 'Failed to send SMS',
                    'response' => $result
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'response' => null
            ];
        }
    }
    
    /**
     * MSG91 SMS Implementation
     */
    private function sendMSG91SMS($phone, $message) {
        try {
            $url = $this->config['api_url'] . "?" . http_build_query([
                'authkey' => $this->config['auth_key'],
                'mobiles' => $phone,
                'message' => $message,
                'sender' => $this->config['sender_id'],
                'route' => $this->config['route']
            ]);
            
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            $result = json_decode($response, true);
            
            if ($http_code == 200 && isset($result['type']) && $result['type'] == 'success') {
                return [
                    'success' => true,
                    'message' => 'SMS sent successfully',
                    'response' => $result
                ];
            } else {
                return [
                    'success' => false,
                    'message' => $result['message'] ?? 'Failed to send SMS',
                    'response' => $result
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'response' => null
            ];
        }
    }
    
    /**
     * Fast2SMS Implementation
     */
    private function sendFast2SMS($phone, $message) {
        try {
            // Fast2SMS API expects form data, not JSON
            $data = [
                'authorization' => $this->config['api_key'],
                'sender_id' => $this->config['sender_id'],
                'message' => $message,
                'language' => 'english',
                'route' => 'q',  // 'q' for promotional (free credits), 'p' for transactional
                'numbers' => $phone
            ];
            
            // Build query string for Fast2SMS
            $post_data = http_build_query($data);
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $this->config['api_url']);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/x-www-form-urlencoded'
            ]);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curl_error = curl_error($ch);
            curl_close($ch);
            
            // Log for debugging
            error_log("Fast2SMS Response: HTTP $http_code - $response");
            
            if ($curl_error) {
                throw new Exception("CURL Error: " . $curl_error);
            }
            
            $result = json_decode($response, true);
            
            if ($http_code == 200 && isset($result['return']) && $result['return'] == true) {
                return [
                    'success' => true,
                    'message' => 'SMS sent successfully',
                    'response' => $result
                ];
            } else {
                $error_message = 'Failed to send SMS';
                if (isset($result['message'])) {
                    if (is_array($result['message'])) {
                        $error_message = implode(', ', $result['message']);
                    } else {
                        $error_message = $result['message'];
                    }
                }
                
                return [
                    'success' => false,
                    'message' => $error_message,
                    'response' => $result,
                    'http_code' => $http_code
                ];
            }
        } catch (Exception $e) {
            error_log("Fast2SMS Exception: " . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'response' => null
            ];
        }
    }
    
    /**
     * Simulate SMS sending for testing
     */
    private function simulateSMS($phone, $message) {
        // Simulate random success/failure for testing
        $success = rand(1, 10) > 2; // 80% success rate
        
        return [
            'success' => $success,
            'message' => $success ? 'SMS sent successfully (simulated)' : 'Failed to send SMS (simulated)',
            'response' => [
                'simulated' => true,
                'phone' => $phone,
                'message_id' => 'sim_' . uniqid(),
                'timestamp' => date('Y-m-d H:i:s')
            ]
        ];
    }
    
    /**
     * Update SMS history status
     */
    private function updateSMSStatus($sms_id, $status, $response_data = null) {
        $query = "UPDATE sms_history SET status = ?, response_data = ?, sent_at = NOW(), updated_at = NOW() WHERE id = ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$status, json_encode($response_data), $sms_id]);
    }
    
    /**
     * Update recipient status
     */
    private function updateRecipientStatus($recipient_id, $status, $response_data = null) {
        $query = "UPDATE sms_recipients SET status = ?, response_data = ?, sent_at = NOW() WHERE id = ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$status, json_encode($response_data), $recipient_id]);
    }
    
    /**
     * Get SMS history with details
     */
    public function getSMSHistory($page = 1, $limit = 10, $status = null) {
        $offset = ($page - 1) * $limit;
        
        $where_clause = "";
        $params = [$limit, $offset];
        
        if ($status) {
            $where_clause = "WHERE status = ?";
            array_unshift($params, $status);
        }
        
        $query = "SELECT * FROM sms_history $where_clause ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $sms_history = $stmt->fetchAll();
        
        // Get total count
        $count_query = "SELECT COUNT(*) FROM sms_history $where_clause";
        $count_stmt = $this->db->prepare($count_query);
        if ($status) {
            $count_stmt->execute([$status]);
        } else {
            $count_stmt->execute();
        }
        $total = $count_stmt->fetchColumn();
        
        return [
            'data' => $sms_history,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => (int)$total,
                'total_pages' => ceil($total / $limit)
            ]
        ];
    }
    
    /**
     * Get SMS templates
     */
    public function getTemplates($category = null) {
        $where_clause = "WHERE is_active = 1";
        $params = [];
        
        if ($category) {
            $where_clause .= " AND category = ?";
            $params[] = $category;
        }
        
        $query = "SELECT * FROM sms_templates $where_clause ORDER BY name";
        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
    }
    
    /**
     * Process template variables
     */
    public function processTemplate($template_id, $variables = []) {
        $query = "SELECT * FROM sms_templates WHERE id = ? AND is_active = 1";
        $stmt = $this->db->prepare($query);
        $stmt->execute([$template_id]);
        $template = $stmt->fetch();
        
        if (!$template) {
            throw new Exception('Template not found');
        }
        
        $message = $template['message'];
        
        // Replace variables in the template
        foreach ($variables as $key => $value) {
            $message = str_replace('{' . $key . '}', $value, $message);
        }
        
        return [
            'subject' => $template['subject'],
            'message' => $message,
            'template' => $template
        ];
    }
}
?>