<?php
// Clear all sample/default data from database
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    // Clear all tables (but keep structure)
    $tables = ['prices', 'farmers', 'sms_history']; // Note: prices first due to foreign keys
    
    $cleared = [];
    foreach ($tables as $table) {
        $stmt = $db->prepare("DELETE FROM $table");
        $stmt->execute();
        $rowCount = $stmt->rowCount();
        $cleared[$table] = $rowCount;
    }
    
    // Reset auto-increment counters
    foreach ($tables as $table) {
        $db->exec("ALTER TABLE $table AUTO_INCREMENT = 1");
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'All sample data cleared successfully',
        'cleared_records' => $cleared,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error clearing data: ' . $e->getMessage()
    ]);
}
?>
