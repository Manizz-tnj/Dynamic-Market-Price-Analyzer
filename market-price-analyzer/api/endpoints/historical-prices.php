<?php
// API endpoint for historical price data
require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Only GET method allowed');
    }
    
    $productId = $_GET['product_id'] ?? null;
    
    if (!$productId) {
        throw new Exception('Product ID is required');
    }
    
    // Get current date
    $currentDate = date('Y-m-d');
    $lastWeekDate = date('Y-m-d', strtotime('-7 days'));
    $lastMonthDate = date('Y-m-d', strtotime('-30 days'));
    $lastYearDate = date('Y-m-d', strtotime('-365 days'));
    
    // Query for historical prices at different time periods
    $historicalPrices = [];
    
    // Last week price (closest to 7 days ago)
    $stmt = $db->prepare("
        SELECT price, date 
        FROM prices 
        WHERE product_id = ? 
        AND date <= ? 
        ORDER BY date DESC 
        LIMIT 1
    ");
    $stmt->execute([$productId, $lastWeekDate]);
    $lastWeekPrice = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Last month price (closest to 30 days ago)
    $stmt = $db->prepare("
        SELECT price, date 
        FROM prices 
        WHERE product_id = ? 
        AND date <= ? 
        ORDER BY date DESC 
        LIMIT 1
    ");
    $stmt->execute([$productId, $lastMonthDate]);
    $lastMonthPrice = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Last year price (closest to 365 days ago)
    $stmt = $db->prepare("
        SELECT price, date 
        FROM prices 
        WHERE product_id = ? 
        AND date <= ? 
        ORDER BY date DESC 
        LIMIT 1
    ");
    $stmt->execute([$productId, $lastYearDate]);
    $lastYearPrice = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Format response
    $response = [
        'success' => true,
        'data' => [
            'lastWeek' => $lastWeekPrice ? floatval($lastWeekPrice['price']) : null,
            'lastWeekDate' => $lastWeekPrice ? $lastWeekPrice['date'] : null,
            'lastMonth' => $lastMonthPrice ? floatval($lastMonthPrice['price']) : null,
            'lastMonthDate' => $lastMonthPrice ? $lastMonthPrice['date'] : null,
            'lastYear' => $lastYearPrice ? floatval($lastYearPrice['price']) : null,
            'lastYearDate' => $lastYearPrice ? $lastYearPrice['date'] : null
        ]
    ];
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'data' => null
    ]);
}
?>