<?php
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Check if file was uploaded
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No file uploaded or upload error');
    }

    $file = $_FILES['file'];
    $type = $_POST['type'] ?? '';
    
    if (!in_array($type, ['markets', 'products', 'farmers', 'prices'])) {
        throw new Exception('Invalid data type');
    }

    // Read file content
    $fileContent = file_get_contents($file['tmp_name']);
    $fileName = $file['name'];
    $fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    $data = [];
    $processed = 0;

    // Parse file based on extension
    if ($fileExt === 'csv') {
        $data = parseCSV($fileContent);
    } elseif ($fileExt === 'json') {
        $data = json_decode($fileContent, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON format');
        }
    } elseif ($fileExt === 'sql') {
        // Execute SQL file directly
        $processed = executeSQLFile($db, $fileContent, $type);
        echo json_encode([
            'success' => true,
            'message' => "SQL file executed successfully",
            'processed' => $processed
        ]);
        exit;
    } else {
        throw new Exception('Unsupported file format. Use CSV, JSON, or SQL files.');
    }

    if (empty($data)) {
        throw new Exception('No data found in file');
    }

    // Process data based on type
    switch ($type) {
        case 'markets':
            $processed = processMarkets($db, $data);
            break;
        case 'products':
            $processed = processProducts($db, $data);
            break;
        case 'farmers':
            $processed = processFarmers($db, $data);
            break;
        case 'prices':
            $processed = processPrices($db, $data);
            break;
    }

    echo json_encode([
        'success' => true,
        'message' => ucfirst($type) . ' data uploaded successfully',
        'processed' => $processed,
        'type' => $type
    ]);

} catch (Exception $e) {
    error_log("Upload error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// Helper functions
function parseCSV($content) {
    $lines = explode("\n", $content);
    $data = [];
    $headers = null;

    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line)) continue;

        // Parse CSV line (handle quoted values)
        $row = str_getcsv($line);
        
        if ($headers === null) {
            $headers = array_map('trim', $row);
            continue;
        }

        if (count($row) === count($headers)) {
            $data[] = array_combine($headers, array_map('trim', $row));
        }
    }

    return $data;
}

function processMarkets($db, $data) {
    $processed = 0;
    
    foreach ($data as $row) {
        try {
            // Validate required fields
            if (empty($row['name'])) {
                continue;
            }

            // Prepare products JSON
            $products = [];
            if (!empty($row['products'])) {
                if (is_string($row['products'])) {
                    $products = array_map('trim', explode(',', $row['products']));
                } elseif (is_array($row['products'])) {
                    $products = $row['products'];
                }
            }

            $query = "INSERT INTO markets (name, location, address, latitude, longitude, contact_phone, phone, hours, products) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                     location = VALUES(location),
                     address = VALUES(address),
                     latitude = VALUES(latitude),
                     longitude = VALUES(longitude),
                     contact_phone = VALUES(contact_phone),
                     phone = VALUES(phone),
                     hours = VALUES(hours),
                     products = VALUES(products)";

            $stmt = $db->prepare($query);
            $stmt->execute([
                $row['name'],
                $row['location'] ?? $row['address'] ?? null,
                $row['address'] ?? $row['location'] ?? null,
                !empty($row['latitude']) ? (float)$row['latitude'] : null,
                !empty($row['longitude']) ? (float)$row['longitude'] : null,
                $row['contact_phone'] ?? $row['phone'] ?? null,
                $row['phone'] ?? $row['contact_phone'] ?? null,
                $row['hours'] ?? 'Mon-Sun: 6:00 AM - 8:00 PM',
                json_encode($products)
            ]);

            $processed++;
        } catch (Exception $e) {
            error_log("Error processing market row: " . $e->getMessage());
            continue;
        }
    }

    return $processed;
}

function processProducts($db, $data) {
    $processed = 0;
    
    foreach ($data as $row) {
        try {
            if (empty($row['name'])) {
                continue;
            }

            $query = "INSERT INTO products (name, category, unit, description) 
                     VALUES (?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                     category = VALUES(category),
                     unit = VALUES(unit),
                     description = VALUES(description)";

            $stmt = $db->prepare($query);
            $stmt->execute([
                $row['name'],
                $row['category'] ?? 'General',
                $row['unit'] ?? 'kg',
                $row['description'] ?? null
            ]);

            $processed++;
        } catch (Exception $e) {
            error_log("Error processing product row: " . $e->getMessage());
            continue;
        }
    }

    return $processed;
}

function processFarmers($db, $data) {
    $processed = 0;
    
    foreach ($data as $row) {
        try {
            if (empty($row['name']) || empty($row['phone'])) {
                continue;
            }

            // Prepare crops JSON
            $crops = [];
            if (!empty($row['crops'])) {
                if (is_string($row['crops'])) {
                    $crops = array_map('trim', explode(',', $row['crops']));
                } elseif (is_array($row['crops'])) {
                    $crops = $row['crops'];
                }
            }

            $query = "INSERT INTO farmers (name, phone, location, crops, latitude, longitude) 
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                     name = VALUES(name),
                     location = VALUES(location),
                     crops = VALUES(crops),
                     latitude = VALUES(latitude),
                     longitude = VALUES(longitude)";

            $stmt = $db->prepare($query);
            $stmt->execute([
                $row['name'],
                $row['phone'],
                $row['location'] ?? null,
                json_encode($crops),
                !empty($row['latitude']) ? (float)$row['latitude'] : null,
                !empty($row['longitude']) ? (float)$row['longitude'] : null
            ]);

            $processed++;
        } catch (Exception $e) {
            error_log("Error processing farmer row: " . $e->getMessage());
            continue;
        }
    }

    return $processed;
}

function processPrices($db, $data) {
    $processed = 0;
    
    foreach ($data as $row) {
        try {
            if (empty($row['product_name']) || empty($row['price'])) {
                continue;
            }

            $query = "INSERT INTO prices (product_name, price, unit, market_name, location, date_recorded) 
                     VALUES (?, ?, ?, ?, ?, ?)";

            $stmt = $db->prepare($query);
            $stmt->execute([
                $row['product_name'],
                (float)$row['price'],
                $row['unit'] ?? 'kg',
                $row['market_name'] ?? null,
                $row['location'] ?? null,
                $row['date_recorded'] ?? date('Y-m-d')
            ]);

            $processed++;
        } catch (Exception $e) {
            error_log("Error processing price row: " . $e->getMessage());
            continue;
        }
    }

    return $processed;
}

function executeSQLFile($db, $content, $type) {
    $processed = 0;
    
    try {
        // Split SQL content into individual statements
        $statements = explode(';', $content);
        
        foreach ($statements as $statement) {
            $statement = trim($statement);
            if (empty($statement) || strpos($statement, '--') === 0) {
                continue;
            }

            $db->exec($statement);
            $processed++;
        }
    } catch (Exception $e) {
        throw new Exception("SQL execution error: " . $e->getMessage());
    }

    return $processed;
}
?>
