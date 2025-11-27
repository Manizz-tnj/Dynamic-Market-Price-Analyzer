<?php
/**
 * Free SMS API Providers Configuration
 * Multiple free SMS services for testing and development
 */

return [
    // TextBelt - Free SMS API (1 SMS per day per phone number)
    'textbelt' => [
        'name' => 'TextBelt',
        'api_url' => 'https://textbelt.com/text',
        'free_quota' => '1 SMS per day per number',
        'api_key' => 'textbelt', // Free tier uses 'textbelt' as key
        'method' => 'POST',
        'format' => 'form'
    ],
    
    // SMS.to - Free tier (testing)
    'sms_to' => [
        'name' => 'SMS.to',
        'api_url' => 'https://api.sms.to/sms/send',
        'free_quota' => 'Test credits available',
        'api_key' => '', // Requires registration
        'method' => 'POST',
        'format' => 'json'
    ],
    
    // Twilio Trial - Free credits for testing
    'twilio_trial' => [
        'name' => 'Twilio Trial',
        'api_url' => 'https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages.json',
        'free_quota' => '$15 trial credits',
        'account_sid' => '', // Your Twilio Account SID
        'auth_token' => '', // Your Twilio Auth Token
        'from_number' => '', // Your Twilio phone number
        'method' => 'POST',
        'format' => 'form'
    ],
    
    // Nexmo/Vonage - Free trial credits
    'vonage' => [
        'name' => 'Vonage (Nexmo)',
        'api_url' => 'https://rest.nexmo.com/sms/json',
        'free_quota' => '€2 trial credits',
        'api_key' => '', // Your Vonage API key
        'api_secret' => '', // Your Vonage API secret
        'method' => 'POST',
        'format' => 'form'
    ],
    
    // SMSLib - Free SMS for India
    'smslib' => [
        'name' => 'SMSLib',
        'api_url' => 'https://www.smslib.com/httpapi.php',
        'free_quota' => 'Limited free SMS',
        'username' => '', // Your SMSLib username
        'password' => '', // Your SMSLib password
        'method' => 'GET',
        'format' => 'url'
    ],
    
    // Way2SMS - Free SMS for India (requires web scraping)
    'way2sms' => [
        'name' => 'Way2SMS',
        'api_url' => 'https://www.way2sms.com/',
        'free_quota' => 'Unlimited free SMS',
        'username' => '', // Your Way2SMS username
        'password' => '', // Your Way2SMS password
        'method' => 'WEB_SCRAPING',
        'format' => 'html'
    ]
];
?>