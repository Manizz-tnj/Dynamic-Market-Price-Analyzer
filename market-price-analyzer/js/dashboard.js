// Dashboard page JavaScript

// ============================================
// DASHBOARD STATE
// ============================================

let currentProducts = [];
let filteredProducts = [];
let currentFilters = {
    category: 'all',
    location: 'all',
    search: '',
    sort: 'name'
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
    loadDashboardData();
});

function initializeDashboard() {
    console.log('Initializing dashboard...');
    
    // Show loading spinner
    showLoadingSpinner(true);
    
    // Initialize filters
    initializeFilters();
    
    // Load saved filters from localStorage
    const savedFilters = MarketAnalyzer.loadFromLocalStorage('dashboardFilters');
    if (savedFilters) {
        currentFilters = { ...currentFilters, ...savedFilters };
        applyFiltersToUI();
    }
}

function setupEventListeners() {
    // Filter controls
    const categoryFilter = document.getElementById('category-filter');
    const locationFilter = document.getElementById('location-filter');
    const searchInput = document.getElementById('search-input');
    const sortFilter = document.getElementById('sort-filter');

    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleCategoryFilter);
    }

    if (locationFilter) {
        locationFilter.addEventListener('change', handleLocationFilter);
    }

    if (searchInput) {
        const debouncedSearch = MarketAnalyzer.debounce(handleSearchFilter, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', handleSortFilter);
    }

    // Export data button
    window.exportData = handleExportData;
    
    // Auto-refresh data every 5 minutes
    setInterval(refreshDashboardData, 5 * 60 * 1000);
}

// ============================================
// DATA LOADING
// ============================================

async function loadDashboardData() {
    try {
        showLoadingSpinner(true);
        
        // Try to load market prices from API
        try {
            const response = await MarketAnalyzer.getMarketPrices();
            
            if (response.success && response.data) {
                currentProducts = response.data;
                populateLocationFilter();
                updateStatistics();
                applyFiltersAndRender();
                MarketAnalyzer.showNotification('Data loaded successfully', 'success');
                return;
            }
        } catch (apiError) {
            console.log('API connection failed:', apiError);
            MarketAnalyzer.showNotification('Unable to connect to database. Please check your connection.', 'error');
            currentProducts = [];
            populateLocationFilter();
            updateStatistics();
            applyFiltersAndRender();
            return;
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        MarketAnalyzer.showNotification('Failed to load market data. Please check your connection.', 'error');
        
        // Set empty data
        currentProducts = [];
        updateStatistics();
        applyFiltersAndRender();
    } finally {
        showLoadingSpinner(false);
    }
}

async function refreshDashboardData() {
    try {
        const response = await MarketAnalyzer.getMarketPrices();
        
        if (response.success && response.data) {
            const oldProducts = [...currentProducts];
            currentProducts = response.data;
            
            // Repopulate location filter with new data
            populateLocationFilter();
            
            // Check for significant price changes
            checkPriceAlerts(oldProducts, currentProducts);
            
            updateStatistics();
            applyFiltersAndRender();
            
            // Update timestamp
            updateLastRefreshTime();
        }
    } catch (error) {
        console.error('Error refreshing data:', error);
    }
}

// ============================================
// STATISTICS UPDATE
// ============================================

function updateStatistics() {
    const vegetables = currentProducts.filter(p => p.category === 'vegetables');
    const fruits = currentProducts.filter(p => p.category === 'fruits');
    const totalPriceUpdates = currentProducts.length;

    // Update stat cards
    updateStatCard('total-vegetables', vegetables.length);
    updateStatCard('total-fruits', fruits.length);
    updateStatCard('price-updates', totalPriceUpdates.toLocaleString());
}

function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        // Animate the number change
        animateNumber(element, parseInt(element.textContent.replace(/,/g, '')) || 0, value);
    }
}

function animateNumber(element, start, end, duration = 1000) {
    const range = end - start;
    const increment = range / (duration / 16); // 60 FPS
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString();
    }, 16);
}

// ============================================
// FILTERING AND SORTING
// ============================================

function initializeFilters() {
    // Set up category filter options based on available data
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.innerHTML = `
            <option value="all">All Categories</option>
            <option value="vegetables">Vegetables</option>
            <option value="fruits">Fruits</option>
        `;
    }
    
    // Initialize location filter (will be populated when data loads)
    populateLocationFilter();
}

function populateLocationFilter() {
    const locationFilter = document.getElementById('location-filter');
    if (!locationFilter || !currentProducts.length) {
        console.log('Location filter not found or no products available');
        return;
    }
    
    // Get unique locations from current products (handle multiple possible field names)
    const locations = [...new Set(currentProducts.map(product => {
        const location = product.location || 
                        product.market_location || 
                        product.city || 
                        product.market_name ||
                        product.place ||
                        'Unknown';
        return location;
    }).filter(location => location && location !== 'Unknown' && location.trim() !== ''))].sort();
    
    console.log('Found locations:', locations);
    
    locationFilter.innerHTML = `
        <option value="all">All Locations</option>
        ${locations.map(location => {
            const displayName = location.charAt(0).toUpperCase() + location.slice(1);
            return `<option value="${location.toLowerCase()}">${displayName}</option>`;
        }).join('')}
    `;
    
    // Show notification about available locations
    if (locations.length > 0) {
        console.log(`Location filter populated with ${locations.length} locations: ${locations.join(', ')}`);
    } else {
        console.warn('No locations found in the data');
    }
}

function handleCategoryFilter(event) {
    currentFilters.category = event.target.value;
    saveFiltersToLocalStorage();
    applyFiltersAndRender();
}

function handleLocationFilter(event) {
    currentFilters.location = event.target.value;
    console.log('Location filter changed to:', event.target.value);
    console.log('Total products before filtering:', currentProducts.length);
    saveFiltersToLocalStorage();
    applyFiltersAndRender();
    console.log('Filtered products after location filter:', filteredProducts.length);
}

function handleSearchFilter(event) {
    currentFilters.search = event.target.value.toLowerCase().trim();
    saveFiltersToLocalStorage();
    applyFiltersAndRender();
}

function handleSortFilter(event) {
    currentFilters.sort = event.target.value;
    console.log('Sort changed to:', event.target.value);
    
    // Show notification about sorting
    const sortLabels = {
        'name': 'Name (A-Z)',
        'price-low': 'Price (Low to High)',
        'price-high': 'Price (High to Low)',
        'change': 'Price Change',
        'location': 'Location (A-Z)',
        'date': 'Date Updated (Newest First)'
    };
    
    if (window.MarketAnalyzer && window.MarketAnalyzer.showNotification) {
        MarketAnalyzer.showNotification(`Sorted by: ${sortLabels[event.target.value] || event.target.value}`, 'info', 2000);
    }
    
    saveFiltersToLocalStorage();
    applyFiltersAndRender();
}

function applyFiltersToUI() {
    const categoryFilter = document.getElementById('category-filter');
    const locationFilter = document.getElementById('location-filter');
    const searchInput = document.getElementById('search-input');
    const sortFilter = document.getElementById('sort-filter');

    if (categoryFilter) categoryFilter.value = currentFilters.category;
    if (locationFilter) locationFilter.value = currentFilters.location;
    if (searchInput) searchInput.value = currentFilters.search;
    if (sortFilter) sortFilter.value = currentFilters.sort;
}

function applyFiltersAndRender() {
    // Apply filters
    filteredProducts = currentProducts.filter(product => {
        // Category filter
        if (currentFilters.category !== 'all' && product.category !== currentFilters.category) {
            return false;
        }
        
        // Location filter
        if (currentFilters.location !== 'all') {
            const productLocation = (product.location || 
                                   product.market_location || 
                                   product.city || 
                                   product.market_name ||
                                   product.place ||
                                   '').toLowerCase().trim();
            
            const filterLocation = currentFilters.location.toLowerCase().trim();
            
            // Debug logging
            console.log(`Comparing: "${productLocation}" with filter: "${filterLocation}"`);
            
            // More flexible matching - check if either contains the other
            if (!productLocation.includes(filterLocation) && !filterLocation.includes(productLocation)) {
                return false;
            }
        }

        // Search filter
        if (currentFilters.search && !product.name.toLowerCase().includes(currentFilters.search)) {
            return false;
        }

        return true;
    });

    // Apply sorting
    filteredProducts.sort((a, b) => {
        switch (currentFilters.sort) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            case 'change':
                return Math.abs(b.change) - Math.abs(a.change);
            case 'location':
                const locationA = (a.location || a.market_location || a.city || a.market_name || a.place || '').toLowerCase().trim();
                const locationB = (b.location || b.market_location || b.city || b.market_name || b.place || '').toLowerCase().trim();
                // Sort alphabetically, with empty locations at the end
                if (locationA === '' && locationB === '') return 0;
                if (locationA === '') return 1;
                if (locationB === '') return -1;
                return locationA.localeCompare(locationB);
            case 'date':
                const dateA = new Date(a.created_at || a.date_recorded || a.lastUpdated || 0);
                const dateB = new Date(b.created_at || b.date_recorded || b.lastUpdated || 0);
                return dateB - dateA; // Most recent first
            default:
                return 0;
        }
    });

    renderProducts();
    
    // Show filter status
    showFilterStatus();
}

function showFilterStatus() {
    let statusMessage = `Showing ${filteredProducts.length} of ${currentProducts.length} products`;
    
    const activeFilters = [];
    if (currentFilters.category !== 'all') {
        activeFilters.push(`Category: ${currentFilters.category}`);
    }
    if (currentFilters.location !== 'all') {
        activeFilters.push(`Location: ${currentFilters.location}`);
    }
    if (currentFilters.search) {
        activeFilters.push(`Search: "${currentFilters.search}"`);
    }
    
    // Add sort information
    const sortLabels = {
        'name': 'Name (A-Z)',
        'price-low': 'Price (Low→High)',
        'price-high': 'Price (High→Low)',
        'change': 'Price Change',
        'location': 'Location (A-Z)',
        'date': 'Date (Newest First)'
    };
    const sortLabel = sortLabels[currentFilters.sort] || currentFilters.sort;
    
    if (activeFilters.length > 0) {
        statusMessage += ` (Filters: ${activeFilters.join(', ')}, Sort: ${sortLabel})`;
    } else {
        statusMessage += ` (Sort: ${sortLabel})`;
    }
    
    console.log('🔍 Filter Status:', statusMessage);
}

function saveFiltersToLocalStorage() {
    MarketAnalyzer.saveToLocalStorage('dashboardFilters', currentFilters);
}

// ============================================
// PRODUCT RENDERING
// ============================================

function renderProducts() {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;

    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms.</p>
            </div>
        `;
        return;
    }

    productsGrid.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
    
    // Add fade-in animation
    productsGrid.querySelectorAll('.product-card').forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in-up');
    });
}

function createProductCard(product) {
    const changeClass = product.change > 0 ? 'positive' : product.change < 0 ? 'negative' : 'neutral';
    const changeIcon = product.change > 0 ? 'fa-arrow-up' : product.change < 0 ? 'fa-arrow-down' : 'fa-minus';
    const categoryColor = product.category === 'vegetables' ? 'var(--accent-green)' : 'var(--accent-orange)';
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-header">
                <h3 class="product-name">${product.name || product.product_name}</h3>
                <span class="product-category" style="background: ${categoryColor}">
                    ${(product.category || 'vegetables').charAt(0).toUpperCase() + (product.category || 'vegetables').slice(1)}
                </span>
            </div>
            <div class="product-price">
                ${MarketAnalyzer.formatCurrency(product.price)}
                <span class="price-unit">/${product.unit || 'kg'}</span>
            </div>
            <div class="price-change ${changeClass}">
                <i class="fas ${changeIcon}"></i>
                <span>${MarketAnalyzer.formatPercentage(product.change || 0)}</span>
            </div>
            <div class="product-meta">
                <span class="product-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${product.location || 'N/A'}
                </span>
                <span class="last-updated">
                    <i class="fas fa-clock"></i>
                    ${getTimeAgo(product.created_at || product.lastUpdated || new Date())}
                </span>
            </div>
            <div class="product-actions">
                <button class="btn-icon btn-danger" onclick="deletePrice('${product.id}')" title="Remove Price">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="btn-icon" onclick="viewProductDetails('${product.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `;
}

// ============================================
// PRODUCT ACTIONS
// ============================================

async function deletePrice(priceId) {
    if (!confirm('Are you sure you want to delete this price entry?')) {
        return;
    }
    
    try {
        const response = await fetch(`http://localhost/market-price-analyzer/api/endpoints/prices.php?id=${priceId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            MarketAnalyzer.showNotification('Price deleted successfully', 'success');
            // Reload dashboard data
            await loadDashboardData();
        } else {
            throw new Error(result.message || 'Failed to delete price');
        }
    } catch (error) {
        console.error('Error deleting price:', error);
        MarketAnalyzer.showNotification('Failed to delete price: ' + error.message, 'error');
    }
}

function viewProductDetails(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;

    // Create and show product details modal
    const modal = createProductDetailsModal(product);
    document.body.appendChild(modal);
    MarketAnalyzer.openModal(modal.id);
}

function createProductDetailsModal(product) {
    const modalId = `product-modal-${product.id}`;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = modalId;
    
    const changeClass = product.change > 0 ? 'positive' : product.change < 0 ? 'negative' : 'neutral';
    const changeIcon = product.change > 0 ? 'fa-arrow-up' : product.change < 0 ? 'fa-arrow-down' : 'fa-minus';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${product.name} Details</h3>
                <button class="modal-close" onclick="closeProductModal('${modalId}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="product-details">
                    <div class="detail-row">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Current Price:</span>
                        <span class="detail-value price-large">${MarketAnalyzer.formatCurrency(product.price)}/${product.unit}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Price Change:</span>
                        <span class="detail-value price-change ${changeClass}">
                            <i class="fas ${changeIcon}"></i>
                            ${MarketAnalyzer.formatPercentage(product.change)}
                        </span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Last Updated:</span>
                        <span class="detail-value">${MarketAnalyzer.formatDate(product.lastUpdated || new Date())}</span>
                    </div>
                </div>
                <div class="product-actions-modal">
                    <button class="btn btn-primary" onclick="viewPriceTrend('${product.id}')">
                        <i class="fas fa-chart-line"></i>
                        View Price Trend
                    </button>
                    <button class="btn btn-secondary" onclick="findNearbyMarkets('${product.id}')">
                        <i class="fas fa-map-marker-alt"></i>
                        Find Markets
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return modal;
}

function closeProductModal(modalId) {
    MarketAnalyzer.closeModal(modalId);
    setTimeout(() => {
        const modal = document.getElementById(modalId);
        if (modal) modal.remove();
    }, 300);
}

function addToWatchlist(productId) {
    const watchlist = MarketAnalyzer.loadFromLocalStorage('watchlist', []);
    
    if (!watchlist.includes(productId)) {
        watchlist.push(productId);
        MarketAnalyzer.saveToLocalStorage('watchlist', watchlist);
        MarketAnalyzer.showNotification('Added to watchlist', 'success');
    } else {
        MarketAnalyzer.showNotification('Already in watchlist', 'info');
    }
}

function viewPriceTrend(productId) {
    // Redirect to predictions page with product selected
    window.location.href = `predictions.html?product=${productId}`;
}

function findNearbyMarkets(productId) {
    // Redirect to map page with product filter
    window.location.href = `map.html?product=${productId}`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getTimeAgo(date) {
    const now = new Date();
    const updatedDate = new Date(date);
    const diffInMinutes = Math.floor((now - updatedDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
}

function showLoadingSpinner(show) {
    const spinner = document.getElementById('loading-spinner');
    const productsGrid = document.getElementById('products-grid');
    
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
    
    if (productsGrid) {
        productsGrid.style.display = show ? 'none' : 'grid';
    }
}

function updateLastRefreshTime() {
    const now = new Date();
    const timeString = MarketAnalyzer.formatTime(now);
    
    // You can add a refresh indicator to the UI here
    console.log(`Data refreshed at ${timeString}`);
}

// ============================================
// PRICE ALERTS
// ============================================

function checkPriceAlerts(oldProducts, newProducts) {
    const priceAlerts = MarketAnalyzer.loadFromLocalStorage('priceAlerts', []);
    
    newProducts.forEach(newProduct => {
        const oldProduct = oldProducts.find(p => p.id === newProduct.id);
        if (!oldProduct) return;
        
        const priceChange = Math.abs(newProduct.price - oldProduct.price);
        const percentageChange = (priceChange / oldProduct.price) * 100;
        
        // Check if price change exceeds threshold (5%)
        if (percentageChange > 5) {
            const direction = newProduct.price > oldProduct.price ? 'increased' : 'decreased';
            MarketAnalyzer.showNotification(
                `${newProduct.name} price ${direction} by ${MarketAnalyzer.formatPercentage(newProduct.change)}`,
                'warning',
                5000
            );
        }
        
        // Check custom alerts
        priceAlerts.forEach(alert => {
            if (alert.productId === newProduct.id) {
                const conditionMet = alert.condition === 'above' 
                    ? newProduct.price > alert.price 
                    : newProduct.price < alert.price;
                    
                if (conditionMet && !alert.triggered) {
                    MarketAnalyzer.showNotification(
                        `Alert: ${newProduct.name} is ${alert.condition} ${MarketAnalyzer.formatCurrency(alert.price)}`,
                        'info',
                        5000
                    );
                    alert.triggered = true;
                }
            }
        });
    });
    
    MarketAnalyzer.saveToLocalStorage('priceAlerts', priceAlerts);
}

// ============================================
// EXPORT FUNCTIONALITY
// ============================================

function handleExportData() {
    if (filteredProducts.length === 0) {
        MarketAnalyzer.showNotification('No data to export', 'warning');
        return;
    }
    
    const exportData = filteredProducts.map(product => ({
        Name: product.name,
        Category: product.category,
        Price: product.price,
        Unit: product.unit,
        'Price Change (%)': product.change,
        'Last Updated': MarketAnalyzer.formatDate(product.lastUpdated || new Date())
    }));
    
    const filename = `market_prices_${new Date().toISOString().split('T')[0]}.csv`;
    MarketAnalyzer.exportToCSV(exportData, filename);
}

// ============================================
// ============================================
// DATABASE-ONLY MODE - NO SAMPLE DATA
// App now connects exclusively to MySQL database
// ============================================

// Add custom styles for product details modal
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    .product-details {
        margin-bottom: var(--spacing-lg);
    }
    
    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-sm) 0;
        border-bottom: 1px solid var(--border-primary);
    }
    
    .detail-row:last-child {
        border-bottom: none;
    }
    
    .detail-label {
        font-weight: 600;
        color: var(--text-secondary);
    }
    
    .detail-value {
        color: var(--text-primary);
    }
    
    .price-large {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--accent-green);
    }
    
    .product-actions-modal {
        display: flex;
        gap: var(--spacing-md);
        margin-top: var(--spacing-lg);
    }
    
    .no-results {
        grid-column: 1 / -1;
        text-align: center;
        padding: var(--spacing-2xl);
        color: var(--text-muted);
    }
    
    .no-results i {
        font-size: 3rem;
        margin-bottom: var(--spacing-md);
        color: var(--text-disabled);
    }
    
    .no-results h3 {
        font-size: 1.5rem;
        margin-bottom: var(--spacing-sm);
        color: var(--text-secondary);
    }
    
    @media (max-width: 768px) {
        .product-actions-modal {
            flex-direction: column;
        }
    }
`;
document.head.appendChild(modalStyles);
