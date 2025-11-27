<?php
// Fix SMS History Table - Add Missing Columns
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $results = [];
    
    // Check if recipient_count column exists
    $checkColumn = "SHOW COLUMNS FROM sms_history LIKE 'recipient_count'";
    $stmt = $db->prepare($checkColumn);
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        // Add recipient_count column
        $addColumn = "ALTER TABLE sms_history ADD COLUMN recipient_count INT DEFAULT 1 AFTER message";
        $stmt = $db->prepare($addColumn);
        $stmt->execute();
        $results[] = "Added recipient_count column to sms_history table";
    } else {
        $results[] = "recipient_count column already exists";
    }
    
    // Check if recipients column exists
    $checkColumn = "SHOW COLUMNS FROM sms_history LIKE 'recipients'";
    $stmt = $db->prepare($checkColumn);
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        // Add recipients column
        $addColumn = "ALTER TABLE sms_history ADD COLUMN recipients JSON AFTER recipient_count";
        $stmt = $db->prepare($addColumn);
        $stmt->execute();
        $results[] = "Added recipients column to sms_history table";
    } else {
        $results[] = "recipients column already exists";
    }
    
    // Check if cost column exists
    $checkColumn = "SHOW COLUMNS FROM sms_history LIKE 'cost'";
    $stmt = $db->prepare($checkColumn);
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        // Add cost column
        $addColumn = "ALTER TABLE sms_history ADD COLUMN cost DECIMAL(10, 2) DEFAULT 0.00 AFTER recipients";
        $stmt = $db->prepare($addColumn);
        $stmt->execute();
        $results[] = "Added cost column to sms_history table";
    } else {
        $results[] = "cost column already exists";
    }
    
    // Check current table structure
    $showColumns = "DESCRIBE sms_history";
    $stmt = $db->prepare($showColumns);
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Database table updated successfully',
        'results' => $results,
        'current_structure' => $columns
    ], JSON_PRETTY_PRINT);
    
} catch(PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>