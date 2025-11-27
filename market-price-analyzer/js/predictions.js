// Predictions page JavaScript

// ============================================
// PREDICTIONS STATE
// ============================================

let currentProduct = null;
let predictionData = null;
let weeklyChart = null;
let priceAlerts = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializePredictionsPage();
    setupEventListeners();
    loadInitialData();
});

function initializePredictionsPage() {
    console.log('Initializing predictions page...');
    
    // Load price alerts from localStorage
    priceAlerts = MarketAnalyzer.loadFromLocalStorage('priceAlerts', []);
    
    // Check URL parameters for product selection
    const urlParams = new URLSearchParams(window.location.search);
    const productParam = urlParams.get('product');
    
    if (productParam) {
        const productSelect = document.getElementById('product-select');
        if (productSelect) {
            productSelect.value = productParam;
            currentProduct = productParam;
        }
    }
    
    // Initialize Chart.js defaults for dark theme
    initializeChartDefaults();
}

function setupEventListeners() {
    // Product selection
    const productSelect = document.getElementById('product-select');
    if (productSelect) {
        productSelect.addEventListener('change', handleProductChange);
    }

    // Market selection
    const marketSelect = document.getElementById('market-select');
    if (marketSelect) {
        marketSelect.addEventListener('change', handleMarketChange);
    }

    // Generate prediction button
    const generateBtn = document.getElementById('generate-prediction-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGeneratePrediction);
    }

    // Chart controls
    const chartButtons = document.querySelectorAll('.chart-btn');
    chartButtons.forEach(btn => {
        btn.addEventListener('click', handleChartToggle);
    });

    // Price alerts
    const addAlertBtn = document.getElementById('add-alert-btn');
    if (addAlertBtn) {
        addAlertBtn.addEventListener('click', () => {
            MarketAnalyzer.openModal('alert-modal');
        });
    }

    // Alert form
    const alertForm = document.getElementById('alert-form');
    if (alertForm) {
        alertForm.addEventListener('submit', handleAddAlert);
    }

    // Alert modal close
    const alertModalClose = document.getElementById('alert-modal-close');
    if (alertModalClose) {
        alertModalClose.addEventListener('click', () => {
            MarketAnalyzer.closeModal('alert-modal');
        });
    }

    const cancelAlert = document.getElementById('cancel-alert');
    if (cancelAlert) {
        cancelAlert.addEventListener('click', () => {
            MarketAnalyzer.closeModal('alert-modal');
        });
    }
}

// ============================================
// DATA LOADING
// ============================================

async function loadInitialData() {
    try {
        // Load available products for selection
        await loadProductOptions();
        
        // If a product is selected, generate prediction
        if (currentProduct) {
            await generatePrediction(currentProduct);
        } else {
            showDefaultPredictionState();
        }
        
        // Render existing alerts
        renderPriceAlerts();
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        MarketAnalyzer.showNotification('Failed to load prediction data', 'error');
    }
}

async function loadProductOptions() {
    try {
        const response = await MarketAnalyzer.getMarketPrices();
        
        if (response.success && response.data) {
            populateProductSelect(response.data);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        MarketAnalyzer.showNotification('Failed to load products. Please check your connection.', 'error');
        
        // Set empty data
        populateProductSelect([]);
    }
}

function populateProductSelect(products) {
    const productSelect = document.getElementById('product-select');
    if (!productSelect) return;

    // Group products by category
    const vegetables = products.filter(p => p.category === 'vegetables');
    const fruits = products.filter(p => p.category === 'fruits');

    let options = '<option value="">Choose a product...</option>';
    
    if (vegetables.length > 0) {
        options += '<optgroup label="Vegetables">';
        vegetables.forEach(product => {
            options += `<option value="${product.id}">${product.name}</option>`;
        });
        options += '</optgroup>';
    }
    
    if (fruits.length > 0) {
        options += '<optgroup label="Fruits">';
        fruits.forEach(product => {
            options += `<option value="${product.id}">${product.name}</option>`;
        });
        options += '</optgroup>';
    }

    productSelect.innerHTML = options;
}

// ============================================
// EVENT HANDLERS
// ============================================

function handleProductChange(event) {
    currentProduct = event.target.value;
    
    if (currentProduct) {
        generatePrediction(currentProduct);
    } else {
        showDefaultPredictionState();
    }
}

function handleMarketChange(event) {
    // Regenerate prediction with new market filter
    if (currentProduct) {
        generatePrediction(currentProduct);
    }
}

function handleGeneratePrediction() {
    if (!currentProduct) {
        MarketAnalyzer.showNotification('Please select a product first', 'warning');
        return;
    }
    
    generatePrediction(currentProduct);
}

function handleChartToggle(event) {
    // Remove active class from all buttons
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    // Update chart based on selection
    const chartType = event.target.dataset.chart;
    updateChart(chartType);
}

function handleAddAlert(event) {
    event.preventDefault();
    
    const productId = document.getElementById('alert-product').value;
    const condition = document.getElementById('alert-condition').value;
    const price = parseFloat(document.getElementById('alert-price').value);
    
    if (!productId || !condition || !price) {
        MarketAnalyzer.showNotification('Please fill all fields', 'warning');
        return;
    }
    
    const alert = {
        id: Date.now().toString(),
        productId,
        condition,
        price,
        triggered: false,
        created: new Date().toISOString()
    };
    
    priceAlerts.push(alert);
    MarketAnalyzer.saveToLocalStorage('priceAlerts', priceAlerts);
    
    renderPriceAlerts();
    MarketAnalyzer.closeModal('alert-modal');
    document.getElementById('alert-form').reset();
    
    MarketAnalyzer.showNotification('Price alert added successfully', 'success');
}

// ============================================
// PREDICTION GENERATION
// ============================================

async function generatePrediction(productId) {
    try {
        showPredictionLoading(true);
        
        const response = await MarketAnalyzer.getPricePredictions(productId, 7);
        
        if (response.success && response.data) {
            predictionData = response.data;
            displayPredictionResults();
            updateWeeklyChart();
            updateAnalysisCards();
        } else {
            throw new Error('Failed to generate prediction');
        }
    } catch (error) {
        console.error('Error generating prediction:', error);
        MarketAnalyzer.showNotification('Failed to generate prediction. Please try again.', 'error');
        
        // Clear prediction data
        predictionData = null;
        clearPredictionResults();
    } finally {
        showPredictionLoading(false);
    }
}

function displayPredictionResults() {
    if (!predictionData) return;

    // Update tomorrow's prediction
    updateTomorrowPrediction();
    
    // Update prediction factors
    updatePredictionFactors();
    
    // Show prediction sections
    showPredictionSections(true);
}

function updateTomorrowPrediction() {
    const tomorrowPrediction = predictionData.predictions[1]; // Tomorrow's data
    const currentPrice = predictionData.currentPrice;
    const predictedPrice = tomorrowPrediction.price;
    const change = predictedPrice - currentPrice;
    const changePercent = (change / currentPrice) * 100;
    
    // Update date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = document.getElementById('tomorrow-date');
    if (tomorrowDate) {
        tomorrowDate.innerHTML = `
            <i class="fas fa-calendar-day"></i>
            <span>${MarketAnalyzer.formatDate(tomorrow)}</span>
        `;
    }
    
    // Update prices
    const currentPriceEl = document.getElementById('current-price');
    const predictedPriceEl = document.getElementById('predicted-price');
    const priceChangeEl = document.getElementById('price-change');
    
    if (currentPriceEl) {
        currentPriceEl.textContent = MarketAnalyzer.formatCurrency(currentPrice);
    }
    
    if (predictedPriceEl) {
        predictedPriceEl.textContent = MarketAnalyzer.formatCurrency(predictedPrice);
    }
    
    if (priceChangeEl) {
        const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        const changeSign = change > 0 ? '+' : '';
        priceChangeEl.className = `change ${changeClass}`;
        priceChangeEl.textContent = `${changeSign}${MarketAnalyzer.formatCurrency(Math.abs(change))} (${changeSign}${changePercent.toFixed(1)}%)`;
    }
    
    // Update confidence
    const confidence = tomorrowPrediction.confidence;
    updateConfidenceMeter(confidence);
}

function updateConfidenceMeter(confidence) {
    const confidenceFill = document.getElementById('confidence-fill');
    const confidenceValue = document.getElementById('confidence-value');
    
    if (confidenceFill) {
        confidenceFill.style.width = `${confidence}%`;
        
        // Change color based on confidence level
        if (confidence >= 80) {
            confidenceFill.style.background = 'var(--gradient-secondary)';
        } else if (confidence >= 60) {
            confidenceFill.style.background = 'var(--gradient-warning)';
        } else {
            confidenceFill.style.background = 'var(--gradient-danger)';
        }
    }
    
    if (confidenceValue) {
        confidenceValue.textContent = `${Math.round(confidence)}%`;
    }
}

function updatePredictionFactors() {
    const factorsContainer = document.getElementById('prediction-factors');
    if (!factorsContainer || !predictionData.factors) return;
    
    factorsContainer.innerHTML = predictionData.factors.map(factor => {
        const iconClass = factor.impact === 'positive' ? 'fa-arrow-up' : 
                         factor.impact === 'negative' ? 'fa-arrow-down' : 'fa-minus';
        
        return `
            <div class="factor-item ${factor.impact}">
                <i class="fas ${iconClass}"></i>
                <span>${factor.factor}</span>
            </div>
        `;
    }).join('');
}

// ============================================
// CHART MANAGEMENT
// ============================================

function initializeChartDefaults() {
    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#e2e8f0';
        Chart.defaults.borderColor = '#334155';
        Chart.defaults.backgroundColor = 'rgba(79, 70, 229, 0.1)';
    }
}

function updateWeeklyChart() {
    const ctx = document.getElementById('weekly-chart');
    if (!ctx || !predictionData) return;

    // Prepare data
    const labels = predictionData.predictions.map(p => {
        const date = new Date(p.date);
        return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    });
    
    const priceData = predictionData.predictions.map(p => p.price);
    const confidenceData = predictionData.predictions.map(p => p.confidence);

    // Destroy existing chart
    if (weeklyChart) {
        weeklyChart.destroy();
    }

    // Create new chart
    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Predicted Prices',
                    data: priceData,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4f46e5',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'Confidence Level',
                    data: confidenceData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // We have custom legend
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: '#4f46e5',
                    borderWidth: 1,
                    callbacks: {
                        title: function(context) {
                            return `Date: ${context[0].label}`;
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `Price: ${MarketAnalyzer.formatCurrency(context.parsed.y)}`;
                            } else {
                                return `Confidence: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#e2e8f0'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: '#334155'
                    },
                    ticks: {
                        color: '#e2e8f0',
                        callback: function(value) {
                            return MarketAnalyzer.formatCurrency(value);
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#e2e8f0',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    min: 0,
                    max: 100
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function updateChart(chartType) {
    if (!weeklyChart || !predictionData) return;

    // This function can be extended to show different chart views
    // For now, we'll just update the existing chart
    console.log(`Updating chart to show: ${chartType}`);
}

// ============================================
// ANALYSIS CARDS UPDATE
// ============================================

function updateAnalysisCards() {
    if (!predictionData) return;

    // Update trend analysis
    updateTrendAnalysis();
    
    // Update supply & demand (mock data for now)
    updateSupplyDemand();
    
    // Update weather impact (mock data for now)
    updateWeatherImpact();
    
    // Update historical comparison (mock data for now)
    updateHistoricalComparison();
}

function updateTrendAnalysis() {
    const trendDescription = document.getElementById('trend-description');
    if (trendDescription) {
        const avgChange = predictionData.predictions.reduce((acc, p, i) => {
            if (i === 0) return 0;
            return acc + (p.price - predictionData.predictions[i-1].price);
        }, 0) / (predictionData.predictions.length - 1);
        
        const trend = avgChange > 2 ? 'upward' : avgChange < -2 ? 'downward' : 'stable';
        const reason = trend === 'upward' ? 'increasing demand and seasonal factors' :
                      trend === 'downward' ? 'oversupply and reduced demand' :
                      'balanced supply and demand conditions';
        
        trendDescription.textContent = `Prices showing ${trend} trend due to ${reason}.`;
    }
}

function updateSupplyDemand() {
    // Mock supply and demand data
    const supply = Math.random() * 40 + 50; // 50-90%
    const demand = Math.random() * 30 + 60; // 60-90%
    
    const supplyBar = document.querySelector('.supply-bar');
    const demandBar = document.querySelector('.demand-bar');
    
    if (supplyBar) {
        supplyBar.style.width = `${supply}%`;
        supplyBar.nextElementSibling.textContent = `${Math.round(supply)}%`;
    }
    
    if (demandBar) {
        demandBar.style.width = `${demand}%`;
        demandBar.nextElementSibling.textContent = `${Math.round(demand)}%`;
    }
}

function updateWeatherImpact() {
    // Mock weather impact data
    const weatherItems = document.querySelectorAll('.weather-item');
    weatherItems.forEach(item => {
        const impact = item.querySelector('.impact');
        if (impact) {
            const randomImpact = (Math.random() - 0.5) * 6; // -3% to +3%
            const sign = randomImpact >= 0 ? '+' : '';
            impact.textContent = `${sign}${randomImpact.toFixed(1)}%`;
            impact.className = `impact ${randomImpact >= 0 ? 'positive' : 'negative'}`;
        }
    });
}

function updateHistoricalComparison() {
    // Fetch real historical data from database
    const currentPrice = predictionData.currentPrice;
    
    // Try to get real historical data from API
    MarketAnalyzer.getHistoricalPrices(predictionData.productId)
        .then(historicalData => {
            if (historicalData && historicalData.length > 0) {
                const statItems = document.querySelectorAll('.historical-stats .stat-item');
                
                // Get prices for different periods
                const prices = [
                    historicalData.lastWeek || null,
                    historicalData.lastMonth || null,
                    historicalData.lastYear || null
                ];
                
                statItems.forEach((item, index) => {
                    const valueEl = item.querySelector('.stat-value');
                    const changeEl = item.querySelector('.stat-change');
                    
                    if (valueEl && changeEl) {
                        const price = prices[index];
                        
                        if (price && price > 0) {
                            const change = ((currentPrice - price) / price) * 100;
                            const sign = change >= 0 ? '+' : '';
                            
                            valueEl.textContent = MarketAnalyzer.formatCurrency(price);
                            changeEl.textContent = `${sign}${change.toFixed(1)}%`;
                            changeEl.className = `stat-change ${change >= 0 ? 'positive' : 'negative'}`;
                        } else {
                            // No historical data available
                            valueEl.textContent = 'No data';
                            changeEl.textContent = 'N/A';
                            changeEl.className = 'stat-change neutral';
                        }
                    }
                });
            } else {
                // No historical data available - show message
                const statItems = document.querySelectorAll('.historical-stats .stat-item');
                statItems.forEach(item => {
                    const valueEl = item.querySelector('.stat-value');
                    const changeEl = item.querySelector('.stat-change');
                    
                    if (valueEl && changeEl) {
                        valueEl.textContent = 'No data';
                        changeEl.textContent = 'N/A';
                        changeEl.className = 'stat-change neutral';
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error fetching historical data:', error);
            // Show error state
            const statItems = document.querySelectorAll('.historical-stats .stat-item');
            statItems.forEach(item => {
                const valueEl = item.querySelector('.stat-value');
                const changeEl = item.querySelector('.stat-change');
                
                if (valueEl && changeEl) {
                    valueEl.textContent = 'Error';
                    changeEl.textContent = 'N/A';
                    changeEl.className = 'stat-change error';
                }
            });
        });
}

// ============================================
// PRICE ALERTS MANAGEMENT
// ============================================

function renderPriceAlerts() {
    const alertsList = document.getElementById('alerts-list');
    if (!alertsList) return;

    if (priceAlerts.length === 0) {
        alertsList.innerHTML = `
            <div class="no-alerts">
                <i class="fas fa-bell-slash"></i>
                <p>No price alerts set</p>
                <p>Create alerts to get notified when prices reach your target.</p>
            </div>
        `;
        return;
    }

    alertsList.innerHTML = priceAlerts.map(alert => createAlertItem(alert)).join('');
}

function createAlertItem(alert) {
    const productName = getProductName(alert.productId);
    const conditionText = alert.condition === 'above' ? 'above' : 'below';
    
    return `
        <div class="alert-item">
            <div class="alert-info">
                <span class="alert-product">${productName}</span>
                <span class="alert-condition">Price ${conditionText} ${MarketAnalyzer.formatCurrency(alert.price)}</span>
            </div>
            <div class="alert-actions">
                <button class="btn-icon" onclick="editAlert('${alert.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteAlert('${alert.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function getProductName(productId) {
    // Try to get product name from loaded products first
    if (window.loadedProducts) {
        const product = window.loadedProducts.find(p => p.id == productId || p.name.toLowerCase() === productId.toLowerCase());
        if (product) {
            return product.name;
        }
    }
    
    // Fallback to API call if not in loaded products
    return MarketAnalyzer.getProducts()
        .then(products => {
            const product = products.find(p => p.id == productId || p.name.toLowerCase() === productId.toLowerCase());
            return product ? product.name : productId;
        })
        .catch(error => {
            console.error('Error fetching product name:', error);
            return productId; // Return ID as fallback
        });
}

function editAlert(alertId) {
    // For now, just show a notification
    MarketAnalyzer.showNotification('Edit functionality coming soon', 'info');
}

function deleteAlert(alertId) {
    priceAlerts = priceAlerts.filter(alert => alert.id !== alertId);
    MarketAnalyzer.saveToLocalStorage('priceAlerts', priceAlerts);
    renderPriceAlerts();
    MarketAnalyzer.showNotification('Alert deleted successfully', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showDefaultPredictionState() {
    showPredictionSections(false);
    
    const predictionDisplay = document.getElementById('tomorrow-prediction');
    if (predictionDisplay) {
        predictionDisplay.innerHTML = `
            <div class="no-prediction">
                <i class="fas fa-chart-line"></i>
                <h3>Select a Product</h3>
                <p>Choose a product from the dropdown to view price predictions and trends.</p>
            </div>
        `;
    }
}

function showPredictionSections(show) {
    const sections = [
        'tomorrow-prediction',
        'weekly-trends',
        'price-analysis'
    ];
    
    sections.forEach(sectionClass => {
        const elements = document.getElementsByClassName(sectionClass);
        Array.from(elements).forEach(el => {
            el.style.display = show ? 'block' : 'none';
        });
    });
}

function showPredictionLoading(show) {
    const generateBtn = document.getElementById('generate-prediction-btn');
    if (generateBtn) {
        if (show) {
            generateBtn.classList.add('loading');
            generateBtn.disabled = true;
        } else {
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
        }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function clearPredictionResults() {
    // Clear tomorrow's prediction
    const tomorrowPrice = document.getElementById('tomorrow-price');
    const tomorrowChange = document.getElementById('tomorrow-change');
    const tomorrowConfidence = document.getElementById('tomorrow-confidence');
    
    if (tomorrowPrice) tomorrowPrice.textContent = '--';
    if (tomorrowChange) {
        tomorrowChange.textContent = '--';
        tomorrowChange.className = 'price-change';
    }
    if (tomorrowConfidence) tomorrowConfidence.textContent = '--';
    
    // Clear charts
    if (weeklyChart) {
        weeklyChart.destroy();
        weeklyChart = null;
    }
    
    // Clear analysis cards
    const analysisCards = document.querySelectorAll('.analysis-value');
    analysisCards.forEach(card => {
        card.textContent = '--';
    });
}

// Add custom styles for predictions page
const predictionsStyles = document.createElement('style');
predictionsStyles.textContent = `
    .no-prediction {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-2xl);
        text-align: center;
        color: var(--text-muted);
    }
    
    .no-prediction i {
        font-size: 3rem;
        margin-bottom: var(--spacing-md);
        color: var(--text-disabled);
    }
    
    .no-prediction h3 {
        font-size: 1.5rem;
        margin-bottom: var(--spacing-sm);
        color: var(--text-secondary);
    }
    
    .no-alerts {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-xl);
        text-align: center;
        color: var(--text-muted);
    }
    
    .no-alerts i {
        font-size: 2rem;
        margin-bottom: var(--spacing-md);
        color: var(--text-disabled);
    }
    
    .supply-demand-chart {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }
    
    .chart-item {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        font-size: 0.9rem;
    }
    
    .chart-item span:first-child {
        min-width: 60px;
        color: var(--text-secondary);
    }
    
    .chart-item span:last-child {
        min-width: 40px;
        text-align: right;
        font-weight: 600;
        color: var(--text-primary);
    }
    
    .bar-container {
        flex: 1;
        height: 8px;
        background: var(--bg-tertiary);
        border-radius: var(--radius-sm);
        overflow: hidden;
    }
    
    .bar {
        height: 100%;
        border-radius: var(--radius-sm);
        transition: var(--transition-normal);
    }
    
    .supply-bar {
        background: var(--gradient-secondary);
    }
    
    .demand-bar {
        background: var(--gradient-warning);
    }
    
    .weather-factors {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    .weather-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-sm);
        background: var(--bg-tertiary);
        border-radius: var(--radius-sm);
    }
    
    .weather-item i {
        margin-right: var(--spacing-sm);
        color: var(--accent-blue);
    }
    
    .impact {
        font-weight: 600;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
    }
    
    .impact.positive {
        background: rgba(16, 185, 129, 0.2);
        color: var(--accent-green);
    }
    
    .impact.negative {
        background: rgba(239, 68, 68, 0.2);
        color: var(--accent-red);
    }
    
    .historical-stats {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }
    
    .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-sm);
        background: var(--bg-tertiary);
        border-radius: var(--radius-sm);
    }
    
    .stat-label {
        color: var(--text-secondary);
        font-size: 0.9rem;
    }
    
    .stat-value {
        color: var(--text-primary);
        font-weight: 600;
        margin-right: var(--spacing-sm);
    }
    
    .stat-change {
        font-size: 0.8rem;
        font-weight: 600;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
    }
    
    .stat-change.positive {
        background: rgba(16, 185, 129, 0.2);
        color: var(--accent-green);
    }
    
    .stat-change.negative {
        background: rgba(239, 68, 68, 0.2);
        color: var(--accent-red);
    }
    
    .analysis-note {
        margin-top: var(--spacing-md);
        font-size: 0.85rem;
        color: var(--text-muted);
        font-style: italic;
    }
`;
document.head.appendChild(predictionsStyles);
