@echo off
echo ============================================
echo 🚀 Market Price Analyzer - Quick Setup
echo ============================================
echo.

echo 📋 This script will help you set up the project with MySQL
echo.

echo Step 1: Download and Install XAMPP
echo ================================
echo 1. Go to: https://www.apachefriends.org/
echo 2. Download XAMPP for Windows
echo 3. Install with Apache, MySQL, and PHP
echo.
pause

echo Step 2: Start XAMPP Services
echo ============================
echo 1. Open XAMPP Control Panel
echo 2. Click START for Apache
echo 3. Click START for MySQL
echo 4. Both should show green "Running" status
echo.
pause

echo Step 3: Create Database
echo =======================
echo 1. Open browser and go to: http://localhost/phpmyadmin
echo 2. Click "New" on the left side
echo 3. Database name: market_analyzer
echo 4. Click "Create"
echo.
pause

echo Step 4: Copy Project to XAMPP
echo ==============================
echo 1. Copy this entire project folder to: C:\xampp\htdocs\
echo 2. Rename to: market-price-analyzer
echo 3. Final path: C:\xampp\htdocs\market-price-analyzer\
echo.
pause

echo Step 5: Import Database Tables
echo ==============================
echo 1. Go to: http://localhost/phpmyadmin
echo 2. Click on "market_analyzer" database
echo 3. Click "Import" tab
echo 4. Choose file: api\setup\create_tables.sql
echo 5. Click "Go"
echo.
pause

echo Step 6: Test Connection
echo =======================
echo Opening test page...
start http://localhost/market-price-analyzer/api/test-connection.php
echo.
echo If you see "Database connected successfully!", you're ready!
echo If not, check the troubleshooting steps in the test page.
echo.

echo Step 7: Access Your Application
echo ===============================
echo 📊 Dashboard: http://localhost/market-price-analyzer/index.html
echo 👨‍💼 Admin Panel: http://localhost/market-price-analyzer/admin.html
echo 📍 Map View: http://localhost/market-price-analyzer/map.html
echo 📈 Predictions: http://localhost/market-price-analyzer/predictions.html
echo.

echo ✅ Setup Complete!
echo ==================
echo Your Market Price Analyzer is now connected to MySQL!
echo.
pause