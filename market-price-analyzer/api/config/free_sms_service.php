<?php
/**
 * Free SMS Service - Multiple Provider Support
 * Supports various free SMS APIs for testing and development
 */

class FreeSMSService {
    private $db;
    private $providers;
    private $currentProvider;
    private $simulationMode;
    
    public function __construct($database, $simulationMode = false) {
        $this->db = $database;
        $this->providers = require_once __DIR__ . '/free_sms_providers.php';
        $this->simulationMode = $simulationMode;
        $this->currentProvider = 'textbelt'; // Default to TextBelt
    }
    
    /**
     * Set the SMS provider to use
     */
    public function setProvider($provider) {
        if (isset($this->providers[$provider])) {
            $this->currentProvider = $provider;
            return true;
        }
        return false;
    }
    
    /**
     * Send SMS using the selected provider
     */
    public function sendSMS($message, $phoneNumbers, $provider = null) {
        try {
            // Use specified provider or current default
            $providerKey = $provider ?? $this->currentProvider;
            
            if (!isset($this->providers[$providerKey])) {
                throw new Exception('Invalid SMS provider: ' . $providerKey);
            }
            
            $providerConfig = $this->providers[$providerKey];
            
            // Validate inputs
            if (empty($message)) {
                throw new Exception('Message cannot be empty');
            }
            
            if (empty($phoneNumbers) || !is_array($phoneNumbers)) {
                throw new Exception('Phone numbers must be a non-empty array');
            }
            
            // Clean phone numbers
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
            
            // Check simulation mode
            if ($this->simulationMode) {
                return [
                    'success' => true,
                    'message' => 'SMS sent successfully (simulation mode)',
                    'data' => [
                        'provider' => $providerConfig['name'],
                        'recipients' => count($cleanNumbers),
                        'cost' => 0,
                        'status' => 'sent (simulation)',
                        'message_id' => 'sim_' . time()
                    ]
                ];
            }
            
            // Send SMS based on provider
            switch ($providerKey) {
                case 'textbelt':
                    return $this->sendTextBeltSMS($message, $cleanNumbers);
                    
                case 'twilio_trial':
                    return $this->sendTwilioSMS($message, $cleanNumbers);
                    
                case 'vonage':
                    return $this->sendVonageSMS($message, $cleanNumbers);
                    
                case 'sms_to':
                    return $this->sendSMSToAPI($message, $cleanNumbers);
                    
                default:
                    throw new Exception('Provider not implemented: ' . $providerKey);
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
     * TextBelt SMS (Free - 1 SMS per day per number)
     */
    private function sendTextBeltSMS($message, $phoneNumbers) {
        $results = [];
        
        foreach ($phoneNumbers as $number) {
            // TextBelt only accepts US/Canada numbers, but we'll try anyway
            $postData = [
                'phone' => $number,
                'message' => $message,
                'key' => 'textbelt'
            ];
            
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => $this->providers['textbelt']['api_url'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $postData,
                CURLOPT_TIMEOUT => 30,
                CURLOPT_SSL_VERIFYPEER => false
            ]);
            
            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);
            
            if ($httpCode === 200 && $response) {
                $decoded = json_decode($response, true);
                $results[] = [
                    'number' => $number,
                    'success' => isset($decoded['success']) && $decoded['success'],
                    'response' => $decoded
                ];
            } else {
                $results[] = [
                    'number' => $number,
                    'success' => false,
                    'error' => 'HTTP Error: ' . $httpCode
                ];
            }
        }
        
        $successCount = count(array_filter($results, function($r) { return $r['success']; }));
        
        return [
            'success' => $successCount > 0,
            'message' => "TextBelt: {$successCount}/" . count($phoneNumbers) . " SMS sent",
            'data' => [
                'provider' => 'TextBelt',
                'recipients' => $successCount,
                'total_attempted' => count($phoneNumbers),
                'cost' => 0,
                'status' => $successCount > 0 ? 'sent' : 'failed',
                'details' => $results
            ]
        ];
    }
    
    /**
     * Twilio Trial SMS (Free trial credits)
     */
    private function sendTwilioSMS($message, $phoneNumbers) {
        $config = $this->providers['twilio_trial'];
        
        if (empty($config['account_sid']) || empty($config['auth_token'])) {
            return [
                'success' => false,
                'error' => 'Twilio credentials not configured'
            ];
        }
        
        // Implementation would go here
        return [
            'success' => false,
            'error' => 'Twilio integration requires credentials setup'
        ];
    }
    
    /**
     * Vonage SMS (Free trial credits)
     */
    private function sendVonageSMS($message, $phoneNumbers) {
        $config = $this->providers['vonage'];
        
        if (empty($config['api_key']) || empty($config['api_secret'])) {
            return [
                'success' => false,
                'error' => 'Vonage credentials not configured'
            ];
        }
        
        // Implementation would go here
        return [
            'success' => false,
            'error' => 'Vonage integration requires credentials setup'
        ];
    }
    
    /**
     * SMS.to API
     */
    private function sendSMSToAPI($message, $phoneNumbers) {
        return [
            'success' => false,
            'error' => 'SMS.to integration requires API key setup'
        ];
    }
    
    /**
     * Clean and validate phone number
     */
    private function cleanPhoneNumber($number) {
        // Remove all non-numeric characters
        $clean = preg_replace('/[^0-9]/', '', $number);
        
        // Handle Indian numbers
        if (strlen($clean) === 10) {
            return '+91' . $clean;
        } elseif (strlen($clean) === 12 && substr($clean, 0, 2) === '91') {
            return '+' . $clean;
        } elseif (strlen($clean) === 13 && substr($clean, 0, 3) === '+91') {
            return $clean;
        }
        
        // For TextBelt, try US format
        if (strlen($clean) === 10) {
            return '+1' . $clean;
        }
        
        return $clean ? '+' . $clean : null;
    }
    
    /**
     * Get available providers
     */
    public function getAvailableProviders() {
        $providers = [];
        foreach ($this->providers as $key => $config) {
            $providers[$key] = [
                'name' => $config['name'],
                'quota' => $config['free_quota']
            ];
        }
        return $providers;
    }
    
    /**
     * Get SMS history (simplified)
     */
    public function getSMSHistory($limit = 50) {
        return [
            'success' => true,
            'data' => [
                [
                    'id' => 1,
                    'message' => 'Sample SMS history',
                    'recipients' => '["9876543210"]',
                    'status' => 'sent',
                    'provider' => $this->providers[$this->currentProvider]['name']
                ]
            ]
        ];
    }
    
    /**
     * Send WhatsApp message with current price trends
     */
    public function sendWhatsAppPriceTrend($phoneNumbers, $farmerNames = null) {
        try {
            // Get current price trends
            $priceTrendMessage = $this->generatePriceTrendMessage();
            
            if (!$priceTrendMessage) {
                throw new Exception('Unable to generate price trend data');
            }
            
            // Format WhatsApp message
            $whatsappMessage = $this->formatWhatsAppMessage($priceTrendMessage, $farmerNames);
            
            // Send via WhatsApp Web API (simulation for now)
            return $this->sendWhatsAppMessage($whatsappMessage, $phoneNumbers);
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * Generate current price trend message
     */
    private function generatePriceTrendMessage() {
        try {
            // Get recent prices from database
            $query = "SELECT product_name, price, unit, market_name, location, date_recorded 
                     FROM prices 
                     WHERE date_recorded >= DATE_SUB(CURDATE(), INTERVAL 7 DAYS)
                     ORDER BY product_name, date_recorded DESC";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute();
            $recentPrices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($recentPrices)) {
                // Return sample data if no recent prices
                return $this->getSamplePriceTrends();
            }
            
            // Group prices by product
            $priceGroups = [];
            foreach ($recentPrices as $price) {
                $product = $price['product_name'];
                if (!isset($priceGroups[$product])) {
                    $priceGroups[$product] = [];
                }
                $priceGroups[$product][] = $price;
            }
            
            // Calculate trends for each product
            $trends = [];
            foreach ($priceGroups as $product => $prices) {
                if (count($prices) >= 1) {
                    $latest = $prices[0];
                    $trend = [
                        'product' => $product,
                        'current_price' => floatval($latest['price']),
                        'unit' => $latest['unit'],
                        'market' => $latest['market_name'] ?: $latest['location'],
                        'date' => $latest['date_recorded']
                    ];
                    
                    // Calculate price change if we have historical data
                    if (count($prices) > 1) {
                        $previous = $prices[1];
                        $change = $trend['current_price'] - floatval($previous['price']);
                        $changePercent = ($change / floatval($previous['price'])) * 100;
                        
                        $trend['change'] = $change;
                        $trend['change_percent'] = $changePercent;
                        $trend['trend'] = $change > 0 ? 'up' : ($change < 0 ? 'down' : 'stable');
                    } else {
                        $trend['trend'] = 'new';
                    }
                    
                    $trends[] = $trend;
                }
            }
            
            return $trends;
            
        } catch (Exception $e) {
            error_log("Error generating price trends: " . $e->getMessage());
            return $this->getSamplePriceTrends();
        }
    }
    
    /**
     * Get sample price trends when no data available
     */
    private function getSamplePriceTrends() {
        return [
            [
                'product' => 'Tomato',
                'current_price' => 45.50,
                'unit' => 'kg',
                'market' => 'Central Market',
                'date' => date('Y-m-d'),
                'change' => 2.50,
                'change_percent' => 5.8,
                'trend' => 'up'
            ],
            [
                'product' => 'Onion',
                'current_price' => 32.00,
                'unit' => 'kg',
                'market' => 'Local Market',
                'date' => date('Y-m-d'),
                'change' => -1.50,
                'change_percent' => -4.5,
                'trend' => 'down'
            ],
            [
                'product' => 'Potato',
                'current_price' => 28.75,
                'unit' => 'kg',
                'market' => 'Wholesale Market',
                'date' => date('Y-m-d'),
                'change' => 0,
                'change_percent' => 0,
                'trend' => 'stable'
            ]
        ];
    }
    
    /**
     * Format WhatsApp message with price trends
     */
    private function formatWhatsAppMessage($trends, $farmerNames = null) {
        $greeting = $farmerNames ? "Hello " . implode(", ", $farmerNames) . "!" : "Hello!";
        
        $message = "🌾 *Market Price Analyzer* 🌾\n";
        $message .= "{$greeting}\n\n";
        $message .= "📊 *Current Market Price Trends*\n";
        $message .= "📅 Date: " . date('d M Y') . "\n\n";
        
        foreach ($trends as $trend) {
            $emoji = $this->getTrendEmoji($trend['trend']);
            $changeText = "";
            
            if (isset($trend['change']) && $trend['change'] != 0) {
                $sign = $trend['change'] > 0 ? '+' : '';
                $changeText = sprintf(" (%s₹%.2f, %s%.1f%%)", 
                    $sign, $trend['change'], 
                    $sign, $trend['change_percent']);
            }
            
            $message .= sprintf("🥬 *%s*: ₹%.2f/%s%s %s\n", 
                $trend['product'], 
                $trend['current_price'], 
                $trend['unit'],
                $changeText,
                $emoji
            );
            
            if (!empty($trend['market'])) {
                $message .= "📍 " . $trend['market'] . "\n";
            }
            $message .= "\n";
        }
        
        $message .= "💡 *Tips:*\n";
        $message .= "🔸 Best time to sell: When prices show upward trend\n";
        $message .= "🔸 Plan your harvest: Based on demand forecasts\n\n";
        
        $message .= "📱 For more updates, visit our platform\n";
        $message .= "🤝 Market Price Analyzer Team";
        
        return $message;
    }
    
    /**
     * Get emoji for price trend
     */
    private function getTrendEmoji($trend) {
        switch ($trend) {
            case 'up':
                return '📈';
            case 'down':
                return '📉';
            case 'stable':
                return '➡️';
            case 'new':
                return '🆕';
            default:
                return '📊';
        }
    }
    
    /**
     * Send WhatsApp message (uses Web WhatsApp URL)
     */
    private function sendWhatsAppMessage($message, $phoneNumbers) {
        if ($this->simulationMode) {
            return [
                'success' => true,
                'message' => 'WhatsApp message prepared successfully (simulation mode)',
                'data' => [
                    'platform' => 'WhatsApp',
                    'recipients' => count($phoneNumbers),
                    'message_preview' => substr($message, 0, 100) . '...',
                    'cost' => 0,
                    'status' => 'ready (simulation)',
                    'whatsapp_urls' => $this->generateWhatsAppUrls($message, $phoneNumbers)
                ]
            ];
        }
        
        // In real implementation, this would integrate with WhatsApp Business API
        // For now, we generate WhatsApp Web URLs that can be opened
        $whatsappUrls = $this->generateWhatsAppUrls($message, $phoneNumbers);
        
        return [
            'success' => true,
            'message' => 'WhatsApp links generated successfully',
            'data' => [
                'platform' => 'WhatsApp',
                'recipients' => count($phoneNumbers),
                'message_preview' => substr($message, 0, 100) . '...',
                'cost' => 0,
                'status' => 'ready',
                'whatsapp_urls' => $whatsappUrls,
                'instructions' => 'Click the generated links to send via WhatsApp Web'
            ]
        ];
    }
    
    /**
     * Generate WhatsApp Web URLs for each recipient
     */
    private function generateWhatsAppUrls($message, $phoneNumbers) {
        $urls = [];
        $encodedMessage = urlencode($message);
        
        foreach ($phoneNumbers as $number) {
            // Clean number for WhatsApp (remove + and spaces)
            $cleanNumber = preg_replace('/[^0-9]/', '', $number);
            
            // Generate WhatsApp Web URL
            $url = "https://wa.me/{$cleanNumber}?text={$encodedMessage}";
            
            $urls[] = [
                'number' => $number,
                'whatsapp_url' => $url,
                'clean_number' => $cleanNumber
            ];
        }
        
        return $urls;
    }
}
?>