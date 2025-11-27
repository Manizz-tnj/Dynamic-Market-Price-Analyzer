<?php
require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'POST':
            // Load Tamil Nadu markets data
            $tamilNaduMarkets = getTamilNaduMarketsData();
            $processed = 0;
            
            foreach ($tamilNaduMarkets as $market) {
                try {
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
                        $market['name'],
                        $market['location'],
                        $market['address'],
                        $market['latitude'],
                        $market['longitude'],
                        $market['phone'],
                        $market['phone'],
                        $market['hours'],
                        json_encode($market['products'])
                    ]);

                    $processed++;
                } catch (Exception $e) {
                    error_log("Error inserting market: " . $e->getMessage());
                    continue;
                }
            }

            echo json_encode([
                'success' => true,
                'message' => 'Tamil Nadu markets data loaded successfully',
                'count' => $processed
            ]);
            break;

        case 'GET':
            // Get current data counts
            $counts = [];
            
            $tables = ['markets', 'products', 'farmers', 'prices'];
            foreach ($tables as $table) {
                $query = "SELECT COUNT(*) as count FROM $table";
                $stmt = $db->prepare($query);
                $stmt->execute();
                $result = $stmt->fetch();
                $counts[$table] = $result['count'];
            }

            echo json_encode([
                'success' => true,
                'data' => $counts
            ]);
            break;

        case 'DELETE':
            // Clear all data
            $input = json_decode(file_get_contents('php://input'), true);
            $clearType = $input['type'] ?? 'all';
            
            if ($clearType === 'all') {
                $db->exec("SET FOREIGN_KEY_CHECKS = 0");
                $db->exec("DELETE FROM prices");
                $db->exec("DELETE FROM farmers");
                $db->exec("DELETE FROM markets");
                $db->exec("DELETE FROM products");
                $db->exec("SET FOREIGN_KEY_CHECKS = 1");
                
                echo json_encode([
                    'success' => true,
                    'message' => 'All data cleared successfully'
                ]);
            } else {
                $allowedTables = ['markets', 'products', 'farmers', 'prices'];
                if (in_array($clearType, $allowedTables)) {
                    $db->exec("DELETE FROM $clearType");
                    echo json_encode([
                        'success' => true,
                        'message' => ucfirst($clearType) . ' data cleared successfully'
                    ]);
                } else {
                    throw new Exception('Invalid table type');
                }
            }
            break;

        default:
            throw new Exception('Method not allowed');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function getTamilNaduMarketsData() {
    return [
        [
            'name' => 'Koyambedu Wholesale Market Complex',
            'location' => 'Koyambedu, Chennai, Tamil Nadu',
            'address' => 'Koyambedu, Chennai, Tamil Nadu 600107',
            'latitude' => 13.0732,
            'longitude' => 80.1986,
            'phone' => '+91-44-26790000',
            'hours' => 'Mon-Sun: 5:00 AM - 10:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Grains', 'Spices']
        ],
        [
            'name' => 'Chennai Broadway Market',
            'location' => 'Broadway, George Town, Chennai, Tamil Nadu',
            'address' => 'Broadway, George Town, Chennai, Tamil Nadu 600001',
            'latitude' => 13.0915,
            'longitude' => 80.2911,
            'phone' => '+91-44-25224567',
            'hours' => 'Mon-Sun: 6:00 AM - 9:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Fish', 'Meat']
        ],
        [
            'name' => 'T. Nagar Ranganathan Street Market',
            'location' => 'T. Nagar, Chennai, Tamil Nadu',
            'address' => 'Ranganathan Street, T. Nagar, Chennai, Tamil Nadu 600017',
            'latitude' => 13.0421,
            'longitude' => 80.2344,
            'phone' => '+91-44-24331234',
            'hours' => 'Mon-Sun: 7:00 AM - 10:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Flowers', 'Groceries']
        ],
        [
            'name' => 'Coimbatore Market Gandhi Puram',
            'location' => 'Gandhi Puram, Coimbatore, Tamil Nadu',
            'address' => 'Gandhi Puram, Coimbatore, Tamil Nadu 641012',
            'latitude' => 11.0168,
            'longitude' => 76.9558,
            'phone' => '+91-422-2439876',
            'hours' => 'Mon-Sun: 6:00 AM - 9:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Spices', 'Grains']
        ],
        [
            'name' => 'Madurai Mattuthavani Market',
            'location' => 'Mattuthavani, Madurai, Tamil Nadu',
            'address' => 'Mattuthavani, Madurai, Tamil Nadu 625020',
            'latitude' => 9.9252,
            'longitude' => 78.0877,
            'phone' => '+91-452-2537890',
            'hours' => 'Mon-Sun: 5:00 AM - 9:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Grains', 'Spices']
        ],
        [
            'name' => 'Salem New Bus Stand Market',
            'location' => 'New Bus Stand, Salem, Tamil Nadu',
            'address' => 'New Bus Stand, Salem, Tamil Nadu 636001',
            'latitude' => 11.6643,
            'longitude' => 78.146,
            'phone' => '+91-427-2441234',
            'hours' => 'Mon-Sun: 6:00 AM - 8:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Grains']
        ],
        [
            'name' => 'Trichy Central Bus Stand Market',
            'location' => 'Central Bus Stand, Tiruchirappalli, Tamil Nadu',
            'address' => 'Central Bus Stand, Tiruchirappalli, Tamil Nadu 620001',
            'latitude' => 10.8155,
            'longitude' => 78.7047,
            'phone' => '+91-431-2414567',
            'hours' => 'Mon-Sun: 6:00 AM - 8:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Grains']
        ],
        [
            'name' => 'Tirunelveli Town Market',
            'location' => 'Town, Tirunelveli, Tamil Nadu',
            'address' => 'Town, Tirunelveli, Tamil Nadu 627001',
            'latitude' => 8.7139,
            'longitude' => 77.7567,
            'phone' => '+91-462-2331234',
            'hours' => 'Mon-Sun: 6:00 AM - 8:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Grains', 'Spices']
        ],
        [
            'name' => 'Erode Vegetable Market',
            'location' => 'Perundurai Road, Erode, Tamil Nadu',
            'address' => 'Perundurai Road, Erode, Tamil Nadu 638001',
            'latitude' => 11.3410,
            'longitude' => 77.7172,
            'phone' => '+91-424-2255234',
            'hours' => 'Mon-Sun: 6:00 AM - 8:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Spices']
        ],
        [
            'name' => 'Vellore Old Town Market',
            'location' => 'Old Town, Vellore, Tamil Nadu',
            'address' => 'Old Town, Vellore, Tamil Nadu 632001',
            'latitude' => 12.9165,
            'longitude' => 79.1325,
            'phone' => '+91-416-2233567',
            'hours' => 'Mon-Sun: 6:00 AM - 8:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Grains']
        ],
        [
            'name' => 'Thanjavur Big Temple Market',
            'location' => 'Big Temple, Thanjavur, Tamil Nadu',
            'address' => 'Big Temple, Thanjavur, Tamil Nadu 613001',
            'latitude' => 10.7870,
            'longitude' => 79.1378,
            'phone' => '+91-4362-274890',
            'hours' => 'Mon-Sun: 6:00 AM - 8:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Traditional Items', 'Flowers']
        ],
        [
            'name' => 'Kanyakumari Fish Market',
            'location' => 'Kanyakumari, Tamil Nadu',
            'address' => 'Kanyakumari, Tamil Nadu 629702',
            'latitude' => 8.0883,
            'longitude' => 77.5385,
            'phone' => '+91-4652-246123',
            'hours' => 'Mon-Sun: 5:00 AM - 7:00 PM',
            'products' => ['Fish', 'Seafood', 'Vegetables']
        ],
        [
            'name' => 'Dindigul Vegetable Market',
            'location' => 'Vegetable Market, Dindigul, Tamil Nadu',
            'address' => 'Vegetable Market, Dindigul, Tamil Nadu 624001',
            'latitude' => 10.3673,
            'longitude' => 77.9803,
            'phone' => '+91-451-2424567',
            'hours' => 'Mon-Sun: 6:00 AM - 8:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Grains']
        ],
        [
            'name' => 'Ooty Municipal Market',
            'location' => 'Municipal Market, Ooty, Tamil Nadu',
            'address' => 'Municipal Market, Ooty, Tamil Nadu 643001',
            'latitude' => 11.4064,
            'longitude' => 76.6932,
            'phone' => '+91-423-2443445',
            'hours' => 'Mon-Sun: 7:00 AM - 7:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Tea', 'Spices']
        ],
        [
            'name' => 'Hosur Market',
            'location' => 'Hosur, Krishnagiri, Tamil Nadu',
            'address' => 'Hosur, Krishnagiri, Tamil Nadu 635109',
            'latitude' => 12.7409,
            'longitude' => 77.8253,
            'phone' => '+91-4344-576778',
            'hours' => 'Mon-Sun: 6:00 AM - 8:00 PM',
            'products' => ['Vegetables', 'Fruits', 'Flowers']
        ]
    ];
}
?>
