@echo off
echo ============================================
echo   Market Price Analyzer - Database Setup
echo ============================================
echo.

echo Step 1: Checking if XAMPP is running...
tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I "httpd.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ Apache is running
) else (
    echo ✗ Apache is not running. Please start XAMPP Control Panel and start Apache.
    pause
    exit /b 1
)

tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I "mysqld.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ MySQL is running
) else (
    echo ✗ MySQL is not running. Please start XAMPP Control Panel and start MySQL.
    pause
    exit /b 1
)

echo.
echo Step 2: Opening phpMyAdmin to create database...
echo.
echo 📋 Please follow these steps in phpMyAdmin:
echo    1. Click "New" on the left sidebar
echo    2. Enter database name: market_analyzer
echo    3. Click "Create"
echo    4. Select the new database
echo    5. Click "Import" tab
echo    6. Choose file: api/setup/create_tables.sql
echo    7. Click "Go"
echo.
start http://localhost/phpmyadmin

echo.
echo Step 3: Waiting for you to complete the database setup...
echo Press any key after you've created the database and imported the tables...
pause >nul

echo.
echo Step 4: Testing database connection...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost/market-price-analyzer/api/test-connection.php' -UseBasicParsing; if ($response.Content -like '*successful*') { Write-Host '✓ Database connection successful!' -ForegroundColor Green } else { Write-Host '✗ Database connection failed. Please check the setup.' -ForegroundColor Red } } catch { Write-Host '✗ Error testing connection: $_' -ForegroundColor Red }"

echo.
echo Step 5: Opening your application...
start http://localhost/market-price-analyzer/index.html
start http://localhost/market-price-analyzer/admin.html

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo Your Market Price Analyzer is ready to use!
echo.
pause