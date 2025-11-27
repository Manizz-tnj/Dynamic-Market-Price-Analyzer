<?php
// Database configuration for MySQL API connection
class Database {
    // Default XAMPP configuration
    private $host = 'localhost';
    private $db_name = 'market_analyzer';
    private $username = 'root';
    private $password = '';
    private $port = 3306;
    
    // Alternative configurations (uncomment as needed):
    
    // For Remote MySQL Server:
    // private $host = 'your-remote-server.com';
    // private $db_name = 'your_database_name';
    // private $username = 'your_username';
    // private $password = 'your_password';
    // private $port = 3306;
    
    // For AWS RDS:
    // private $host = 'your-rds-endpoint.amazonaws.com';
    // private $db_name = 'market_analyzer';
    // private $username = 'admin';
    // private $password = 'your-secure-password';
    // private $port = 3306;
    
    // For Google Cloud SQL:
    // private $host = 'your-cloud-sql-ip';
    // private $db_name = 'market_analyzer';
    // private $username = 'root';
    // private $password = 'your-password';
    // private $port = 3306;
    
    private $conn;

    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password);
            
            // Set PDO attributes for better error handling
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $this->conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            
        } catch(PDOException $exception) {
            error_log("Database Connection Error: " . $exception->getMessage());
            echo json_encode([
                'error' => true,
                'message' => 'Database connection failed. Please check your configuration.',
                'details' => $exception->getMessage()
            ]);
            exit();
        }
        
        return $this->conn;
    }
    
    // Test database connection
    public function testConnection() {
        try {
            $conn = $this->getConnection();
            if ($conn) {
                return [
                    'success' => true,
                    'message' => 'Database connection successful',
                    'host' => $this->host,
                    'database' => $this->db_name,
                    'port' => $this->port
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Database connection failed',
                'error' => $e->getMessage()
            ];
        }
    }
    
    // Get database info
    public function getDatabaseInfo() {
        try {
            $conn = $this->getConnection();
            $stmt = $conn->query("SELECT VERSION() as version");
            $result = $stmt->fetch();
            
            return [
                'host' => $this->host,
                'database' => $this->db_name,
                'port' => $this->port,
                'mysql_version' => $result['version'],
                'charset' => 'utf8mb4'
            ];
        } catch (Exception $e) {
            return [
                'error' => $e->getMessage()
            ];
        }
    }
}

// Enable CORS for frontend requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
