<?php
return [
    'provider' => 'fast2sms',
    'fast2sms' => [
        'api_key' => 'HnKJFzmDt8xgRLSI7pBcWUTyqfbNAEw321aZ5YXru0QPeislG6EHOzSgX0BKdsyTftFVpeGYabJI79NA',
        'sender_id' => 'FSTSMS',
        'api_url' => 'https://www.fast2sms.com/dev/bulkV2'
    ],
    'simulation_mode' => true,  // Set to false after adding ₹100 to Fast2SMS account
    'debug' => true  // Shows detailed logs for troubleshooting
];
?>