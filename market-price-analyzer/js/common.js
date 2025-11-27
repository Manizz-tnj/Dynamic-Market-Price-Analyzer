// Common JavaScript functions and utilities

// ============================================
// GLOBAL VARIABLES
// ============================================

const API_BASE_URL = 'http://localhost/market-price-analyzer/api/endpoints'; // XAMPP API URL
const SMS_API_KEY = 'your-sms-api-key'; // Replace with your SMS API key
const MAPS_API_KEY = 'AIzaSyD4J6IfHnCL1UXZ9HPe7ztkuVldGrte_50'; // Replace with your Google Maps API key

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Format currency
function formatCurrency(amount, currency = '₹') {
    return `${currency}${parseFloat(amount).toFixed(2)}`;
}

// Format percentage
function formatPercentage(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format time
function formatTime(date) {
    return new Date(date).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show notification
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        background: var(--bg-card);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border-primary);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        box-shadow: 0 10px 30px var(--shadow-primary);
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;

    // Add notification-specific styling
    switch (type) {
        case 'success':
            notification.style.borderLeft = '4px solid var(--accent-green)';
            break;
        case 'error':
            notification.style.borderLeft = '4px solid var(--accent-red)';
            break;
        case 'warning':
            notification.style.borderLeft = '4px solid var(--accent-orange)';
            break;
        default:
            notification.style.borderLeft = '4px solid var(--accent-blue)';
    }

    // Add to document
    document.body.appendChild(notification);

    // Auto remove
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);

    // Manual close
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    });
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Add CSS animations for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        color: var(--text-primary);
    }
    
    .notification-close {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: var(--spacing-xs);
        border-radius: var(--radius-sm);
        margin-left: auto;
        transition: var(--transition-fast);
    }
    
    .notification-close:hover {
        color: var(--text-primary);
        background: var(--bg-tertiary);
    }
`;
document.head.appendChild(notificationStyles);

// ============================================
// API FUNCTIONS
// ============================================

// Generic API request function
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        }
    };

    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        showNotification('Network error. Please try again.', 'error');
        throw error;
    }
}

// Get products
async function getProducts() {
    try {
        return await apiRequest('/products.php');
    } catch (error) {
        return { success: false, data: [], error: 'Failed to load products' };
    }
}

// Get market prices
async function getMarketPrices(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = `/prices.php${queryParams ? `?${queryParams}` : ''}`;
        return await apiRequest(endpoint);
    } catch (error) {
        return { success: false, data: [], error: 'Failed to load market prices' };
    }
}

// Get price predictions
async function getPricePredictions(productId, days = 7) {
    try {
        return await apiRequest(`/predictions.php?product_id=${productId}&days=${days}`);
    } catch (error) {
        return { success: false, data: null, error: 'Failed to load predictions' };
    }
}

// Get historical prices for comparison
async function getHistoricalPrices(productId) {
    try {
        return await apiRequest(`/historical-prices.php?product_id=${productId}`);
    } catch (error) {
        console.error('Failed to load historical prices:', error);
        return null;
    }
}

// Get nearby markets
async function getNearbyMarkets(latitude, longitude, radius = 5) {
    try {
        return await apiRequest(`/markets.php?lat=${latitude}&lng=${longitude}&radius=${radius}`);
    } catch (error) {
        return { success: false, data: [], error: 'Failed to load nearby markets' };
    }
}

// Get farmers
async function getFarmers(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = `/farmers.php${queryParams ? `?${queryParams}` : ''}`;
        return await apiRequest(endpoint);
    } catch (error) {
        return { success: false, data: [], error: 'Failed to load farmers' };
    }
}

// Add farmer
async function addFarmer(farmerData) {
    try {
        return await apiRequest('/farmers.php', {
            method: 'POST',
            body: JSON.stringify(farmerData)
        });
    } catch (error) {
        return { success: false, error: 'Failed to add farmer' };
    }
}

// Update farmer
async function updateFarmer(farmerId, farmerData) {
    try {
        return await apiRequest('/farmers.php', {
            method: 'PUT',
            body: JSON.stringify({ id: farmerId, ...farmerData })
        });
    } catch (error) {
        return { success: false, error: 'Failed to update farmer' };
    }
}

// Delete farmer
async function deleteFarmer(farmerId) {
    try {
        return await apiRequest('/farmers.php', {
            method: 'DELETE',
            body: JSON.stringify({ id: farmerId })
        });
    } catch (error) {
        return { success: false, error: 'Failed to delete farmer' };
    }
}

// Add price data
async function addPrice(priceData) {
    try {
        return await apiRequest('/prices.php', {
            method: 'POST',
            body: JSON.stringify(priceData)
        });
    } catch (error) {
        return { success: false, error: 'Failed to add price data' };
    }
}

// Send SMS
async function sendSMS(recipients, message, scheduled = false, scheduleTime = null) {
    try {
        const payload = {
            message: message,
            recipients: recipients
        };
        
        // Use the new simplified SMS endpoint
        const response = await fetch(`${API_BASE_URL}/simple_sms.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        // Return error for SMS sending
        return {
            success: false,
            error: 'Failed to send SMS: ' + error.message
        };
    }
}

// Get SMS history
async function getSMSHistory(page = 1, limit = 10) {
    try {
        const response = await fetch(`${API_BASE_URL}/simple_sms.php?action=history&limit=${limit}`);
        const result = await response.json();
        return result;
    } catch (error) {
        return { success: false, data: [], error: 'Failed to load SMS history: ' + error.message };
    }
}

// ============================================
// LOCAL STORAGE FUNCTIONS
// ============================================

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

// Mobile navigation toggle
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function initializeModals() {
    // Close modal when clicking on close button or outside modal
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeModal(modal.id);
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                closeModal(modal.id);
            });
        }
    });
}

// ============================================
// SEARCH AND FILTER FUNCTIONS
// ============================================

function createSearchFilter(inputId, targetSelector, searchFunction) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const debouncedSearch = debounce(() => {
        const query = input.value.toLowerCase().trim();
        const items = document.querySelectorAll(targetSelector);
        
        items.forEach(item => {
            const isMatch = searchFunction(item, query);
            item.style.display = isMatch ? '' : 'none';
        });
    }, 300);

    input.addEventListener('input', debouncedSearch);
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportToCSV(data, filename = 'market_data.csv') {
    if (!data || data.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Data exported successfully', 'success');
    }
}

// ============================================
// GEOLOCATION FUNCTIONS
// ============================================

function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            error => {
                let message = 'Location access denied';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out';
                        break;
                }
                reject(new Error(message));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize common functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeModals();
    
    // Add loading states to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.classList.contains('loading')) {
                this.classList.add('loading');
                setTimeout(() => this.classList.remove('loading'), 2000);
            }
        });
    });
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// ============================================
// PERFORMANCE MONITORING
// ============================================

// Simple performance monitoring
function logPerformance(label, startTime) {
    const endTime = performance.now();
    console.log(`${label}: ${(endTime - startTime).toFixed(2)}ms`);
}

// Error reporting
window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
    // You can send error reports to your analytics service here
});

// ============================================
// EXPORTS
// ============================================

// Make functions available globally
window.MarketAnalyzer = {
    formatCurrency,
    formatPercentage,
    formatDate,
    formatTime,
    showNotification,
    apiRequest,
    getProducts,
    getMarketPrices,
    getPricePredictions,
    getHistoricalPrices,
    getNearbyMarkets,
    getFarmers,
    addFarmer,
    updateFarmer,
    deleteFarmer,
    addPrice,
    sendSMS,
    getSMSHistory,
    saveToLocalStorage,
    loadFromLocalStorage,
    openModal,
    closeModal,
    exportToCSV,
    getCurrentLocation,
    debounce
};
