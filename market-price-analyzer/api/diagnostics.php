<?php
// Simple SMS diagnostic script
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    echo json_encode([
        'timestamp' => date('Y-m-d H:i:s'),
        'php_version' => phpversion(),
        'extensions' => [
            'curl' => extension_loaded('curl'),
            'pdo' => extension_loaded('pdo'),
            'pdo_mysql' => extension_loaded('pdo_mysql'),
            'json' => extension_loaded('json')
        ],
        'config_files' => [
            'database_config' => file_exists('../config/database.php'),
            'sms_config' => file_exists('../config/sms_config.php'),
            'sms_config_local' => file_exists('../config/sms_config_local.php'),
            'sms_service' => file_exists('../config/sms_service.php')
        ],
        'curl_info' => function_exists('curl_version') ? curl_version() : 'Not available'
    ]);
} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>