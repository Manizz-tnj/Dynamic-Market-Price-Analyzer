<?php
/**
 * SMS Service Configuration
 * Configure your SMS service provider settings here
 */

class SMSConfig {
    // SMS Service Provider - Options: 'twilio', 'textlocal', 'msg91', 'fast2sms'
    const SERVICE_PROVIDER = 'textlocal';
    
    // Cost per SMS (in INR)
    const SMS_COST = 0.10;
    
    // Maximum SMS length
    const MAX_SMS_LENGTH = 160;
    
    // Twilio Configuration
    const TWILIO_CONFIG = [
        'account_sid' => 'your_twilio_account_sid',
        'auth_token' => 'your_twilio_auth_token',
        'from_number' => 'your_twilio_phone_number',
        'webhook_url' => 'https://yourdomain.com/api/endpoints/sms_webhook.php'
    ];
    
    // TextLocal Configuration (Popular in India)
    const TEXTLOCAL_CONFIG = [
        'api_key' => 'your_textlocal_api_key',
        'username' => 'your_textlocal_username',
        'hash' => 'your_textlocal_hash',
        'sender' => 'MARKET', // 6 character sender ID
        'api_url' => 'https://api.textlocal.in/send/'
    ];
    
    // MSG91 Configuration
    const MSG91_CONFIG = [
        'auth_key' => 'your_msg91_auth_key',
        'sender_id' => 'MARKET',
        'route' => 4, // 1=promotional, 4=transactional
        'api_url' => 'https://api.msg91.com/api/sendhttp.php'
    ];
    
    // Fast2SMS Configuration
    const FAST2SMS_CONFIG = [
        'api_key' => 'your_fast2sms_api_key',
        'sender_id' => 'MARKET',
        'api_url' => 'https://www.fast2sms.com/dev/bulkV2'
    ];
    
    // Rate limiting settings
    const RATE_LIMIT = [
        'max_sms_per_minute' => 60,
        'max_sms_per_hour' => 1000,
        'max_sms_per_day' => 10000
    ];
    
    // Retry settings
    const RETRY_CONFIG = [
        'max_retries' => 3,
        'retry_delay' => 5, // seconds
        'retry_backoff' => 2 // exponential backoff multiplier
    ];
    
    // Webhook settings
    const WEBHOOK_CONFIG = [
        'enable_webhooks' => true,
        'webhook_secret' => 'your_webhook_secret_key'
    ];
    
    /**
     * Get configuration for the active SMS provider
     */
    public static function getProviderConfig() {
        // Check for local configuration override
        $local_config_file = __DIR__ . '/sms_config_local.php';
        if (file_exists($local_config_file)) {
            $local_config = require $local_config_file;
            
            if (isset($local_config['provider'])) {
                $provider = $local_config['provider'];
                
                switch ($provider) {
                    case 'fast2sms':
                        return $local_config['fast2sms'] ?? self::FAST2SMS_CONFIG;
                    case 'textlocal':
                        return $local_config['textlocal'] ?? self::TEXTLOCAL_CONFIG;
                    case 'msg91':
                        return $local_config['msg91'] ?? self::MSG91_CONFIG;
                    case 'twilio':
                        return $local_config['twilio'] ?? self::TWILIO_CONFIG;
                    default:
                        throw new Exception('Invalid SMS provider in local config: ' . $provider);
                }
            }
        }
        
        // Fallback to default configuration
        switch (self::SERVICE_PROVIDER) {
            case 'twilio':
                return self::TWILIO_CONFIG;
            case 'textlocal':
                return self::TEXTLOCAL_CONFIG;
            case 'msg91':
                return self::MSG91_CONFIG;
            case 'fast2sms':
                return self::FAST2SMS_CONFIG;
            default:
                throw new Exception('Invalid SMS service provider configured');
        }
    }
    
    /**
     * Validate phone number format
     */
    public static function validatePhoneNumber($phone) {
        // Remove any non-digit characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Check if it's a valid Indian mobile number
        if (preg_match('/^(\+91|91|0)?[6-9]\d{9}$/', $phone)) {
            // Normalize to +91 format
            if (strlen($phone) == 10) {
                return '+91' . $phone;
            } elseif (strlen($phone) == 11 && substr($phone, 0, 1) == '0') {
                return '+91' . substr($phone, 1);
            } elseif (strlen($phone) == 12 && substr($phone, 0, 2) == '91') {
                return '+' . $phone;
            } elseif (strlen($phone) == 13 && substr($phone, 0, 3) == '+91') {
                return $phone;
            }
        }
        
        return false;
    }
    
    /**
     * Check if SMS sending is within rate limits
     */
    public static function checkRateLimit($phone = null) {
        // This would typically check against a cache/database
        // For now, return true (implement rate limiting logic as needed)
        return true;
    }
}

// Environment-specific configuration override
if (file_exists(__DIR__ . '/sms_config_local.php')) {
    require_once __DIR__ . '/sms_config_local.php';
}
?>