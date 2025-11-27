<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    require_once '../config/database.php';
    
    echo json_encode(['status' => 'Database class loaded']);
    
    $database = new Database();
    echo json_encode(['status' => 'Database instance created']);
    
    $db = $database->getConnection();
    echo json_encode(['status' => 'Connection method called']);
    
    if (!$db) {
        throw new Exception('Database connection returned null');
    }
    
    // Test query
    $stmt = $db->query('SELECT DATABASE() as db_name');
    $result = $stmt->fetch();
    
    echo json_encode([
        'success' => true,
        'message' => 'Database connection successful',
        'database' => $result['db_name']
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
