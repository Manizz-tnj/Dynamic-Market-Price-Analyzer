<?php
/**
 * Local SMS Configuration Override
 * Copy this file to sms_config_local.php and update with your actual API credentials
 * This file should not be committed to version control
 */

// Uncomment and update the configuration for your chosen SMS provider

/*
// TextLocal Configuration (Recommended for India)
class SMSConfig {
    const SERVICE_PROVIDER = 'textlocal';
    
    const TEXTLOCAL_CONFIG = [
        'api_key' => 'YOUR_ACTUAL_TEXTLOCAL_API_KEY',
        'username' => 'YOUR_TEXTLOCAL_USERNAME',
        'hash' => 'YOUR_TEXTLOCAL_HASH',
        'sender' => 'MARKET', // Your approved sender ID
        'api_url' => 'https://api.textlocal.in/send/'
    ];
}
*/

/*
// Twilio Configuration
class SMSConfig {
    const SERVICE_PROVIDER = 'twilio';
    
    const TWILIO_CONFIG = [
        'account_sid' => 'YOUR_TWILIO_ACCOUNT_SID',
        'auth_token' => 'YOUR_TWILIO_AUTH_TOKEN',
        'from_number' => 'YOUR_TWILIO_PHONE_NUMBER',
        'webhook_url' => 'https://yourdomain.com/api/endpoints/sms_webhook.php'
    ];
}
*/

/*
// MSG91 Configuration
class SMSConfig {
    const SERVICE_PROVIDER = 'msg91';
    
    const MSG91_CONFIG = [
        'auth_key' => 'YOUR_MSG91_AUTH_KEY',
        'sender_id' => 'MARKET',
        'route' => 4, // 4 for transactional SMS
        'api_url' => 'https://api.msg91.com/api/sendhttp.php'
    ];
}
*/

/*
// Fast2SMS Configuration
class SMSConfig {
    const SERVICE_PROVIDER = 'fast2sms';
    
    const FAST2SMS_CONFIG = [
        'api_key' => 'YOUR_FAST2SMS_API_KEY',
        'sender_id' => 'MARKET',
        'api_url' => 'https://www.fast2sms.com/dev/bulkV2'
    ];
}
*/
?>