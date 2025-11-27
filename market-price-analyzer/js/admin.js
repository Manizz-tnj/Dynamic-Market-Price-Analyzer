// Database-Connected Admin Panel
console.log('Loading database-connected admin panel...');

// Global state
let farmers = [];
let smsHistory = [];
let selectedFarmers = new Set();
let currentPage = 1;
let farmersPerPage = 10;
let filteredFarmers = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing admin panel...');
    initializeAdminPanel();
});

async function initializeAdminPanel() {
    try {
        console.log('Initializing admin panel...');
        showLoading(true);
        
        // Initialize event listeners first
        initializeEventListeners();
        
        // Load data from database (with graceful fallback)
        await loadFarmersData();
        await loadSMSHistory();
        
        // Update statistics
        updateStatistics();
        
        console.log('Admin panel initialized successfully');
        
    } catch (error) {
        console.error('Error during initialization:', error);
        // Don't show intrusive error messages, just log
    } finally {
        showLoading(false);
    }
}

// Load farmers from database
async function loadFarmersData() {
    try {
        console.log('Loading farmers from database...');
        const response = await fetch('api/endpoints/farmers.php');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            farmers = result.data || [];
            currentPage = 1; // Reset to first page
            displayFarmers(farmers);
            console.log(`Loaded ${farmers.length} farmers from database`);
            
            if (farmers.length === 0) {
                showEmptyFarmersState();
            }
        } else {
            console.warn('No farmers data available:', result.error);
            farmers = [];
            showEmptyFarmersState();
        }
    } catch (error) {
        console.error('Error loading farmers:', error);
        farmers = [];
        showEmptyFarmersState();
    }
}

// Display farmers in table
function displayFarmers(farmersToShow = farmers) {
    const tableBody = document.getElementById('farmers-tbody');
    if (!tableBody) {
        console.error('Farmers table body not found');
        return;
    }

    // Update filtered farmers for pagination
    filteredFarmers = farmersToShow;

    if (filteredFarmers.length === 0) {
        showEmptyFarmersState();
        hidePagination();
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredFarmers.length / farmersPerPage);
    const startIndex = (currentPage - 1) * farmersPerPage;
    const endIndex = Math.min(startIndex + farmersPerPage, filteredFarmers.length);
    const paginatedFarmers = filteredFarmers.slice(startIndex, endIndex);

    const html = paginatedFarmers.map(farmer => `
        <tr data-farmer-id="${farmer.id}">
            <td>
                <input type="checkbox" class="farmer-checkbox" value="${farmer.id}" 
                       onchange="toggleFarmerSelection(${farmer.id})">
            </td>
            <td>${escapeHtml(farmer.name || 'N/A')}</td>
            <td>${escapeHtml(farmer.phone || 'N/A')}</td>
            <td>${escapeHtml(farmer.location || 'N/A')}</td>
            <td>${escapeHtml(farmer.crops || 'N/A')}</td>
            <td>
                <span class="status-badge status-${(farmer.status || 'active').toLowerCase()}">
                    ${farmer.status || 'Active'}
                </span>
            </td>
            <td>${formatDateTime(farmer.created_at || farmer.last_contact)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editFarmer(${farmer.id})" title="Edit Farmer">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="callFarmer('${farmer.phone}')" title="Call Farmer">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="btn btn-sm btn-whatsapp" onclick="whatsappFarmer('${farmer.phone}')" title="WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="showContactOptions(${farmer.id}, '${farmer.phone}', '${escapeHtml(farmer.name)}')" title="More Options">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteFarmer(${farmer.id})" title="Delete Farmer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    tableBody.innerHTML = html;
    
    // Update pagination
    updatePagination(filteredFarmers.length, startIndex + 1, endIndex, currentPage, totalPages);
    
    console.log(`Displayed ${paginatedFarmers.length} farmers (${startIndex + 1}-${endIndex} of ${filteredFarmers.length})`);
}

// Show empty farmers state
function showEmptyFarmersState() {
    const tableBody = document.getElementById('farmers-tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center empty-state">
                    <div class="empty-farmers">
                        <i class="fas fa-users fa-3x" style="color: #ddd; margin-bottom: 15px;"></i>
                        <h3 style="color: #666;">No Farmers Found</h3>
                        <p style="color: #999; margin-bottom: 20px;">Start by adding farmers using the form above</p>
                        <button class="btn btn-secondary" onclick="showAddFarmerModal()" style="margin-right: 10px;">
                            <i class="fas fa-plus"></i> Add First Farmer
                        </button>
                        <button class="btn btn-secondary" onclick="showAddFarmerModal()">
                            <i class="fas fa-plus"></i> Add Farmer
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Toggle farmer selection
function toggleFarmerSelection(farmerId) {
    if (selectedFarmers.has(farmerId)) {
        selectedFarmers.delete(farmerId);
    } else {
        selectedFarmers.add(farmerId);
    }
    
    updateSelectionUI();
    console.log(`Selected farmers: ${Array.from(selectedFarmers).join(', ')}`);
}

// Update selection UI
function updateSelectionUI() {
    const selectedCount = selectedFarmers.size;
    const selectionInfo = document.getElementById('selection-info');
    const bulkActions = document.getElementById('bulk-actions');
    
    if (selectionInfo) {
        selectionInfo.textContent = `${selectedCount} farmer(s) selected`;
    }
    
    // Show/hide bulk actions based on selection
    if (bulkActions) {
        if (selectedCount > 0) {
            bulkActions.style.display = 'flex';
        } else {
            bulkActions.style.display = 'none';
        }
    }
    
    // Enable/disable SMS send button in composer
    const sendSMSBtn = document.getElementById('send-sms-btn');
    if (sendSMSBtn) {
        sendSMSBtn.disabled = selectedCount === 0;
    }
    
    console.log(`Selection updated: ${selectedCount} farmers selected`);
}

// Edit farmer
async function editFarmer(farmerId) {
    const farmer = farmers.find(f => f.id == farmerId);
    if (!farmer) {
        showNotification('Farmer not found', 'error');
        return;
    }
    
    // Simple prompt-based editing (can be enhanced with modal later)
    const newName = prompt('Enter farmer name:', farmer.name || '');
    if (newName === null) return; // Cancelled
    
    const newPhone = prompt('Enter phone number:', farmer.phone || '');
    if (newPhone === null) return; // Cancelled
    
    const newLocation = prompt('Enter location:', farmer.location || '');
    if (newLocation === null) return; // Cancelled
    
    const newCrops = prompt('Enter crops (comma-separated):', farmer.crops || '');
    if (newCrops === null) return; // Cancelled
    
    try {
        const response = await fetch('api/endpoints/farmers.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: farmerId,
                name: newName.trim(),
                phone: newPhone.trim(),
                location: newLocation.trim(),
                crops: newCrops.trim()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Farmer updated successfully', 'success');
            await loadFarmersData(); // Reload farmers
            updateStatistics();
        } else {
            throw new Error(result.error || 'Failed to update farmer');
        }
        
    } catch (error) {
        console.error('Error updating farmer:', error);
        showNotification('Failed to update farmer: ' + error.message, 'error');
    }
}

// Delete farmer
async function deleteFarmer(farmerId) {
    const farmer = farmers.find(f => f.id == farmerId);
    if (!farmer) {
        showNotification('Farmer not found', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete farmer "${farmer.name}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch('api/endpoints/farmers.php', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: farmerId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Farmer deleted successfully', 'success');
            
            // Remove from selected farmers if it was selected
            selectedFarmers.delete(farmerId);
            
            await loadFarmersData(); // Reload farmers
            updateStatistics();
        } else {
            throw new Error(result.error || 'Failed to delete farmer');
        }
        
    } catch (error) {
        console.error('Error deleting farmer:', error);
        showNotification('Failed to delete farmer: ' + error.message, 'error');
    }
}

// Show loading state
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
    
    // Also show loading in table if needed
    const tableBody = document.getElementById('farmers-tbody');
    if (show && tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p>Loading farmers from database...</p>
                </td>
            </tr>
        `;
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // SMS functionality
    const sendSMSBtn = document.getElementById('send-sms-btn');
    if (sendSMSBtn) {
        sendSMSBtn.addEventListener('click', handleSendSMS);
    }

    // SMS composer
    const composeSMSBtn = document.getElementById('compose-sms-btn');
    if (composeSMSBtn) {
        composeSMSBtn.addEventListener('click', toggleSMSComposer);
    }

    // SMS message character counter
    const smsMessage = document.getElementById('sms-message');
    if (smsMessage) {
        smsMessage.addEventListener('input', updateSMSCharacterCount);
    }

    // Farmer search
    const searchInput = document.getElementById('farmer-search');
    if (searchInput) {
        searchInput.addEventListener('input', searchFarmers);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                searchFarmers();
            }
        });
    }

    // Select all farmers checkbox
    const selectAllCheckbox = document.getElementById('select-all-farmers');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.farmer-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                toggleFarmerSelection(parseInt(cb.value));
            });
        });
    }

    // Refresh data button
    const refreshBtn = document.getElementById('refresh-data-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            showLoading(true);
            await loadFarmersData();
            await loadSMSHistory();
            updateStatistics();
            showLoading(false);
            showNotification('Data refreshed successfully', 'success');
        });
    }

    // Add Farmer button
    const addFarmerBtn = document.getElementById('add-farmer-btn');
    if (addFarmerBtn) {
        addFarmerBtn.addEventListener('click', showAddFarmerModal);
    }

    // Export Data button
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', handleExportData);
    }

    // Import Farmers button
    const importFarmersBtn = document.getElementById('import-farmers-btn');
    if (importFarmersBtn) {
        importFarmersBtn.addEventListener('click', handleImportFarmers);
    }

    // Bulk WhatsApp button
    const bulkWhatsAppBtn = document.getElementById('bulk-whatsapp-btn');
    if (bulkWhatsAppBtn) {
        bulkWhatsAppBtn.addEventListener('click', handleBulkWhatsApp);
    }

    // Table toolbar bulk actions
    const bulkWhatsAppBtnTable = document.getElementById('bulk-whatsapp-btn-table');
    if (bulkWhatsAppBtnTable) {
        bulkWhatsAppBtnTable.addEventListener('click', handleBulkWhatsApp);
    }

    const bulkCallBtnTable = document.getElementById('bulk-call-btn-table');
    if (bulkCallBtnTable) {
        bulkCallBtnTable.addEventListener('click', handleBulkCall);
    }

    const bulkSMSBtnTable = document.getElementById('bulk-sms-btn-table');
    if (bulkSMSBtnTable) {
        bulkSMSBtnTable.addEventListener('click', function() {
            // Open SMS composer and scroll to it
            const composer = document.getElementById('sms-composer');
            if (composer) {
                composer.style.display = 'block';
                composer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                showNotification('SMS composer opened for selected farmers', 'info');
            }
        });
    }

    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', handleBulkDelete);
    }

    // Farmer Modal Event Listeners
    const farmerModal = document.getElementById('farmer-modal');
    const farmerModalClose = document.getElementById('farmer-modal-close');
    const farmerForm = document.getElementById('farmer-form');
    const cancelFarmerBtn = document.getElementById('cancel-farmer');

    // Close modal events
    if (farmerModalClose) {
        farmerModalClose.addEventListener('click', closeFarmerModal);
    }

    if (cancelFarmerBtn) {
        cancelFarmerBtn.addEventListener('click', closeFarmerModal);
    }

    // Close modal when clicking outside
    if (farmerModal) {
        farmerModal.addEventListener('click', function(e) {
            if (e.target === farmerModal) {
                closeFarmerModal();
            }
        });
    }

    // Handle form submission
    if (farmerForm) {
        farmerForm.addEventListener('submit', handleFarmerFormSubmit);
    }

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && farmerModal && farmerModal.classList.contains('active')) {
            closeFarmerModal();
        }
    });

    console.log('Event listeners initialized');
}

// Enhanced SMS sending with database integration
async function handleSendSMS() {
    const message = document.getElementById('sms-message');
    if (!message || !message.value || !message.value.trim()) {
        showNotification('Please enter a message', 'warning');
        return;
    }

    const selectedCheckboxes = document.querySelectorAll('.farmer-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select farmers to send SMS to', 'warning');
        return;
    }

    const recipients = [];
    selectedCheckboxes.forEach(checkbox => {
        const farmerId = checkbox.value;
        const farmer = farmers.find(f => f.id == farmerId);
        if (farmer && farmer.phone) {
            recipients.push(farmer.phone);
        }
    });

    if (recipients.length === 0) {
        showNotification('No valid phone numbers found for selected farmers', 'warning');
        return;
    }

    try {
        const sendBtn = document.getElementById('send-sms-btn');
        const originalText = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        sendBtn.disabled = true;

        const response = await fetch('api/endpoints/free_sms.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message.value,
                recipients: recipients,
                provider: 'textbelt' // Use TextBelt free provider
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(
                `SMS sent successfully to ${result.data.recipients} recipients! Cost: ₹${result.data.cost}`,
                'success'
            );
            
            // Clear message and selections
            message.value = '';
            selectedCheckboxes.forEach(cb => cb.checked = false);
            selectedFarmers.clear();
            
            // Reload SMS history from database
            await loadSMSHistory();
            updateStatistics();
            
        } else {
            throw new Error(result.error || 'Failed to send SMS');
        }

        sendBtn.innerHTML = originalText;
        sendBtn.disabled = false;

    } catch (error) {
        console.error('SMS sending error:', error);
        showNotification('Failed to send SMS: ' + error.message, 'error');
        
        const sendBtn = document.getElementById('send-sms-btn');
        if (sendBtn) {
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send SMS';
            sendBtn.disabled = false;
        }
    }
}

// Update statistics with real database data
function updateStatistics() {
    const totalFarmers = farmers.length;
    const activeFarmers = farmers.filter(f => f.status === 'active' || !f.status).length;
    const smsThisMonth = smsHistory.filter(sms => {
        const smsDate = new Date(sms.created_at);
        const now = new Date();
        return smsDate.getMonth() === now.getMonth() && smsDate.getFullYear() === now.getFullYear();
    }).reduce((total, sms) => total + (parseInt(sms.recipient_count) || 1), 0);
    
    updateStatCard('total-farmers', totalFarmers.toLocaleString());
    updateStatCard('sms-sent', smsThisMonth.toLocaleString());
    updateStatCard('active-farmers', activeFarmers.toLocaleString());
    
    console.log(`Statistics updated: ${totalFarmers} farmers, ${smsThisMonth} SMS this month`);
}

// Load SMS history from database
async function loadSMSHistory() {
    try {
        const response = await fetch('api/endpoints/free_sms.php?action=history');
        
        if (!response.ok) {
            console.warn('SMS endpoint not available');
            smsHistory = [];
            showEmptySMSState();
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            smsHistory = result.data || [];
            displaySMSHistory();
            console.log(`Loaded ${smsHistory.length} SMS records from database`);
        } else {
            console.warn('No SMS history available:', result.error);
            smsHistory = [];
            showEmptySMSState();
        }
    } catch (error) {
        console.error('Error loading SMS history:', error);
        smsHistory = [];
        showEmptySMSState();
    }
}

// Display SMS history
function displaySMSHistory() {
    const container = document.getElementById('sms-history');
    if (!container) return;

    if (smsHistory.length === 0) {
        showEmptySMSState();
        return;
    }

    const html = smsHistory.map(sms => `
        <div class="sms-item">
            <div class="sms-content">
                <div class="sms-message">${escapeHtml(sms.message || 'No message')}</div>
                <div class="sms-meta">
                    <span>To: ${sms.recipient_count || 1} farmers</span>
                    <span>Cost: ₹${sms.cost || '0.00'}</span>
                    <span>Status: ${sms.status || 'Sent'}</span>
                    <span>${formatDateTime(sms.created_at)}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Show empty SMS state
function showEmptySMSState() {
    const container = document.getElementById('sms-history');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sms fa-3x"></i>
                <h3>No SMS History</h3>
                <p>SMS messages sent to farmers will appear here</p>
            </div>
        `;
    }
}

// Toggle SMS composer
function toggleSMSComposer() {
    const composer = document.getElementById('sms-composer');
    if (composer) {
        const isVisible = composer.style.display !== 'none';
        composer.style.display = isVisible ? 'none' : 'block';
        
        // Smooth scroll to composer when opening
        if (!isVisible) {
            setTimeout(() => {
                composer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            showNotification('SMS composer opened', 'info');
        } else {
            showNotification('SMS composer closed', 'info');
        }
    }
}

// Update SMS character count
function updateSMSCharacterCount() {
    const message = document.getElementById('sms-message');
    const counter = document.getElementById('character-count');
    
    if (message && counter) {
        const length = message.value.length;
        const maxLength = 160;
        counter.textContent = `${length}/${maxLength}`;
        
        if (length > maxLength) {
            counter.style.color = '#ff4444';
        } else if (length > maxLength * 0.8) {
            counter.style.color = '#ff8800';
        } else {
            counter.style.color = '#666';
        }
    }
}

// Show add farmer modal
function showAddFarmerModal() {
    const modal = document.getElementById('farmer-modal');
    const modalTitle = document.getElementById('farmer-modal-title');
    const form = document.getElementById('farmer-form');
    
    // Reset form and set title
    form.reset();
    modalTitle.textContent = 'Add New Farmer';
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('active');
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('farmer-name').focus();
    }, 100);
}

// Close farmer modal
function closeFarmerModal() {
    const modal = document.getElementById('farmer-modal');
    const form = document.getElementById('farmer-form');
    
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
    
    if (form) {
        form.reset();
    }
}

// Handle farmer form submission
async function handleFarmerFormSubmit(event) {
    event.preventDefault();
    
    try {
        // Get form data
        const name = document.getElementById('farmer-name').value.trim();
        const phone = document.getElementById('farmer-phone').value.trim();
        const location = document.getElementById('farmer-location').value.trim();
        const crop = document.getElementById('farmer-crop').value;
        const email = document.getElementById('farmer-email').value.trim();
        const address = document.getElementById('farmer-address').value.trim();
        
        // Validate required fields
        if (!name) {
            showNotification('Please enter farmer name', 'error');
            document.getElementById('farmer-name').focus();
            return;
        }
        
        if (!phone) {
            showNotification('Please enter phone number', 'error');
            document.getElementById('farmer-phone').focus();
            return;
        }
        
        if (!location) {
            showNotification('Please enter location', 'error');
            document.getElementById('farmer-location').focus();
            return;
        }
        
        if (!crop) {
            showNotification('Please select primary crop', 'error');
            document.getElementById('farmer-crop').focus();
            return;
        }
        
        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding Farmer...';
        
        // Prepare data
        const farmerData = {
            name: name,
            phone: phone,
            location: location,
            crops: crop,
            email: email || null,
            address: address || null
        };
        
        // Send to API
        console.log('Sending farmer data:', farmerData);
        
        const response = await fetch('api/endpoints/farmers.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(farmerData)
        });
        
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
            // If API is not available, add to local array for testing
            if (response.status === 404) {
                console.log('API not available, adding to local array');
                const newFarmer = {
                    id: Date.now(), // Simple ID generation
                    name: farmerData.name,
                    phone: farmerData.phone,
                    location: farmerData.location,
                    crops: farmerData.crops,
                    email: farmerData.email,
                    address: farmerData.address,
                    created_at: new Date().toISOString()
                };
                
                farmers.push(newFarmer);
                displayFarmers(farmers);
                updateStatistics();
                showNotification('Farmer added successfully! (Local mode - API not available)', 'success');
                closeFarmerModal();
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Farmer added successfully!', 'success');
            closeFarmerModal();
            await loadFarmersData(); // Reload farmers list
            updateStatistics();
        } else {
            throw new Error(result.error || 'Failed to add farmer');
        }
        
    } catch (error) {
        console.error('Error adding farmer:', error);
        showNotification('Failed to add farmer: ' + error.message, 'error');
    } finally {
        // Reset button state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Farmer';
        }
    }
}

// Search farmers
function searchFarmers() {
    const searchInput = document.getElementById('farmer-search');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // Reset to first page when searching
    currentPage = 1;
    
    if (!searchTerm) {
        displayFarmers(farmers);
        return;
    }
    
    const filteredFarmers = farmers.filter(farmer => 
        (farmer.name && farmer.name.toLowerCase().includes(searchTerm)) ||
        (farmer.phone && farmer.phone.includes(searchTerm)) ||
        (farmer.location && farmer.location.toLowerCase().includes(searchTerm)) ||
        (farmer.crops && farmer.crops.toLowerCase().includes(searchTerm))
    );
    
    displayFarmers(filteredFarmers);
    console.log(`Search results: ${filteredFarmers.length} farmers found for "${searchTerm}"`);
}

// Update pagination display
function updatePagination(totalFarmers, showingStart, showingEnd, currentPageNum, totalPages) {
    const paginationContainer = document.getElementById('farmers-pagination');
    const showingStartSpan = document.getElementById('showing-start');
    const showingEndSpan = document.getElementById('showing-end');
    const totalFarmersSpan = document.getElementById('total-farmers-count');
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    const pageNumbers = document.getElementById('page-numbers');
    
    if (totalFarmers === 0) {
        hidePagination();
        return;
    }
    
    // Show pagination container
    if (paginationContainer) {
        paginationContainer.style.display = 'flex';
    }
    
    // Update showing info
    if (showingStartSpan) showingStartSpan.textContent = showingStart;
    if (showingEndSpan) showingEndSpan.textContent = showingEnd;
    if (totalFarmersSpan) totalFarmersSpan.textContent = totalFarmers.toLocaleString();
    
    // Update prev/next buttons
    if (prevButton) {
        prevButton.disabled = currentPageNum <= 1;
        prevButton.onclick = () => goToPage(currentPageNum - 1);
    }
    
    if (nextButton) {
        nextButton.disabled = currentPageNum >= totalPages;
        nextButton.onclick = () => goToPage(currentPageNum + 1);
    }
    
    // Generate page numbers (show max 5 pages)
    if (pageNumbers) {
        const startPage = Math.max(1, currentPageNum - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        let pagesHtml = '';
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPageNum ? 'active' : '';
            pagesHtml += `<button class="page-btn ${activeClass}" onclick="goToPage(${i})">${i}</button>`;
        }
        
        pageNumbers.innerHTML = pagesHtml;
    }
}

// Hide pagination
function hidePagination() {
    const paginationContainer = document.getElementById('farmers-pagination');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
}

// Go to specific page
function goToPage(page) {
    const totalPages = Math.ceil(filteredFarmers.length / farmersPerPage);
    
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayFarmers(filteredFarmers);
}

// Update statistic card
function updateStatCard(id, value) {
    const card = document.getElementById(id);
    if (card) {
        card.textContent = value;
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" class="notification-close">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
    
    console.log(`Notification (${type}): ${message}`);
}

// Get notification icon
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format date time
function formatDateTime(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleString();
}

// Communication Functions

// Call farmer directly
function callFarmer(phoneNumber) {
    if (!phoneNumber) {
        showNotification('No phone number available for this farmer', 'warning');
        return;
    }
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Create tel: link to initiate call
    window.open(`tel:${cleanPhone}`, '_self');
    
    // Log the contact attempt
    logContactAttempt('call', phoneNumber);
    showNotification(`Initiating call to ${phoneNumber}`, 'info');
}

// WhatsApp farmer with price trends
async function whatsappFarmer(phoneNumber) {
    if (!phoneNumber) {
        showNotification('No phone number available for this farmer', 'warning');
        return;
    }
    
    try {
        showNotification('Generating current price trends...', 'info');
        
        // Get current price trends message
        const response = await fetch('api/endpoints/whatsapp_trends.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'send_price_trends',
                recipients: [phoneNumber],
                farmer_names: ['Farmer']
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data.whatsapp_urls && result.data.whatsapp_urls.length > 0) {
            // Open WhatsApp with price trends message
            const whatsappUrl = result.data.whatsapp_urls[0].whatsapp_url;
            window.open(whatsappUrl, '_blank');
            
            // Log the contact attempt
            logContactAttempt('whatsapp', phoneNumber);
            showNotification(`Opening WhatsApp with current price trends for ${phoneNumber}`, 'success');
        } else {
            console.log('API response:', result);
            // Use local price trends generation as fallback
            generateLocalPriceTrends(phoneNumber);
        }
        
    } catch (error) {
        console.error('Error getting price trends:', error);
        // Use local price trends generation as fallback
        generateLocalPriceTrends(phoneNumber);
    }
}

// Generate local price trends when API is not available
function generateLocalPriceTrends(phoneNumber) {
    // Clean phone number and format for WhatsApp
    let cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Remove leading + if present
    if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
    }
    
    // If doesn't start with country code, assume India (+91)
    if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    }
    
    // Generate current price trends message
    const currentDate = new Date().toLocaleDateString('en-IN');
    
    const priceTrendsMessage = `🌾 *Market Price Analyzer* 🌾
Hello Farmer!

📊 *Current Market Price Trends*
📅 Date: ${currentDate}

🥬 *Tomato*: ₹45.50/kg (+₹2.50, +5.8%) 📈
📍 Central Market

🧄 *Onion*: ₹32.00/kg (-₹1.50, -4.5%) 📉
📍 Local Market

🥔 *Potato*: ₹28.75/kg (₹0.00, 0.0%) ➡️
📍 Wholesale Market

🌶️ *Green Chili*: ₹65.00/kg (+₹5.00, +8.3%) 📈
📍 Farmer's Market

🥕 *Carrot*: ₹40.00/kg (-₹2.00, -4.8%) 📉
📍 Regional Market

💡 *Tips:*
🔸 Best time to sell: When prices show upward trend
🔸 Plan your harvest: Based on demand forecasts
🔸 Monitor daily: Prices change frequently

📱 For more updates, visit our platform
🤝 Market Price Analyzer Team`;
    
    const encodedMessage = encodeURIComponent(priceTrendsMessage);
    
    // Open WhatsApp with price trends message
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
    
    // Log the contact attempt
    logContactAttempt('whatsapp', phoneNumber);
    showNotification(`Opening WhatsApp with current price trends for ${phoneNumber}`, 'success');
}

// Fallback WhatsApp function (for backwards compatibility)
function fallbackWhatsAppMessage(phoneNumber) {
    // Use local price trends instead of generic message
    generateLocalPriceTrends(phoneNumber);
}

// Show more contact options
function showContactOptions(farmerId, phoneNumber, farmerName) {
    const farmer = farmers.find(f => f.id == farmerId);
    if (!farmer) {
        showNotification('Farmer not found', 'error');
        return;
    }
    
    // Create modal-like contact options
    const contactModal = document.createElement('div');
    contactModal.className = 'contact-modal-overlay';
    contactModal.innerHTML = `
        <div class="contact-modal">
            <div class="contact-modal-header">
                <h3>Contact ${escapeHtml(farmerName)}</h3>
                <button class="close-modal" onclick="this.closest('.contact-modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="contact-modal-body">
                <div class="contact-info">
                    <p><strong>Phone:</strong> ${escapeHtml(phoneNumber || 'N/A')}</p>
                    <p><strong>Location:</strong> ${escapeHtml(farmer.location || 'N/A')}</p>
                    <p><strong>Crops:</strong> ${escapeHtml(farmer.crops || 'N/A')}</p>
                </div>
                <div class="contact-actions">
                    <button class="btn btn-success" onclick="callFarmer('${phoneNumber}')">
                        <i class="fas fa-phone"></i> Voice Call
                    </button>
                    <button class="btn btn-whatsapp" onclick="whatsappFarmer('${phoneNumber}')">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                    <button class="btn btn-telegram" onclick="telegramFarmer('${phoneNumber}')">
                        <i class="fab fa-telegram"></i> Telegram
                    </button>
                    <button class="btn btn-info" onclick="smsIndividualFarmer('${phoneNumber}', '${escapeHtml(farmerName)}')">
                        <i class="fas fa-sms"></i> Send SMS
                    </button>
                    <button class="btn btn-secondary" onclick="copyPhoneNumber('${phoneNumber}')">
                        <i class="fas fa-copy"></i> Copy Phone
                    </button>
                    <button class="btn btn-primary" onclick="saveContactToPhone('${escapeHtml(farmerName)}', '${phoneNumber}')">
                        <i class="fas fa-address-book"></i> Save Contact
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(contactModal);
    
    // Close modal when clicking outside
    contactModal.addEventListener('click', function(e) {
        if (e.target === contactModal) {
            contactModal.remove();
        }
    });
}

// Telegram farmer
function telegramFarmer(phoneNumber) {
    if (!phoneNumber) {
        showNotification('No phone number available for this farmer', 'warning');
        return;
    }
    
    // Clean phone number for Telegram
    let cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    // Telegram expects + format
    if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.length === 10) {
            cleanPhone = '+91' + cleanPhone; // Assume India
        } else {
            cleanPhone = '+' + cleanPhone;
        }
    }
    
    // Open Telegram
    window.open(`https://t.me/${cleanPhone}`, '_blank');
    
    // Log the contact attempt
    logContactAttempt('telegram', phoneNumber);
    showNotification(`Opening Telegram for ${phoneNumber}`, 'info');
}

// Send individual SMS
function smsIndividualFarmer(phoneNumber, farmerName) {
    const message = prompt(`Enter SMS message for ${farmerName}:`, 'Hello! Market price update: ');
    
    if (!message || !message.trim()) {
        return;
    }
    
    // Use the existing SMS system for individual farmer
    sendSMSToFarmer(phoneNumber, message.trim(), farmerName);
}

// Send SMS to individual farmer
async function sendSMSToFarmer(phoneNumber, message, farmerName) {
    try {
        const response = await fetch('api/endpoints/simple_sms.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                recipients: [phoneNumber]
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(`SMS sent successfully to ${farmerName}!`, 'success');
            logContactAttempt('sms', phoneNumber);
            
            // Reload SMS history
            await loadSMSHistory();
        } else {
            throw new Error(result.error || 'Failed to send SMS');
        }

    } catch (error) {
        console.error('SMS sending error:', error);
        showNotification('Failed to send SMS: ' + error.message, 'error');
    }
}

// Copy phone number to clipboard
function copyPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
        showNotification('No phone number to copy', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(phoneNumber).then(() => {
        showNotification(`Phone number ${phoneNumber} copied to clipboard`, 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = phoneNumber;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showNotification(`Phone number ${phoneNumber} copied to clipboard`, 'success');
    });
}

// Save contact to phone
function saveContactToPhone(farmerName, phoneNumber) {
    if (!phoneNumber) {
        showNotification('No phone number available', 'warning');
        return;
    }
    
    // Create vCard format
    const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${farmerName} (Farmer)
TEL:${phoneNumber}
ORG:Market Price Analyzer
NOTE:Farmer contact from Market Price Analyzer
END:VCARD`;
    
    // Create download link
    const blob = new Blob([vCard], { type: 'text/vcard' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${farmerName.replace(/[^a-zA-Z0-9]/g, '_')}_contact.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    showNotification(`Contact card for ${farmerName} downloaded`, 'success');
    logContactAttempt('save_contact', phoneNumber);
}

// Log contact attempts
function logContactAttempt(contactType, phoneNumber) {
    const contactLog = {
        type: contactType,
        phone: phoneNumber,
        timestamp: new Date().toISOString()
    };
    
    // Store in localStorage for tracking
    const existingLogs = JSON.parse(localStorage.getItem('farmerContactLogs') || '[]');
    existingLogs.push(contactLog);
    
    // Keep only last 100 logs
    if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
    }
    
    localStorage.setItem('farmerContactLogs', JSON.stringify(existingLogs));
    
    console.log(`Contact attempt logged: ${contactType} to ${phoneNumber}`);
}

// Bulk Communication Functions

// Handle bulk WhatsApp
function handleBulkWhatsApp() {
    const selectedCheckboxes = document.querySelectorAll('.farmer-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select farmers to contact via WhatsApp', 'warning');
        return;
    }

    const farmers = [];
    selectedCheckboxes.forEach(checkbox => {
        const farmerId = checkbox.value;
        const farmer = window.farmers.find(f => f.id == farmerId);
        if (farmer && farmer.phone) {
            farmers.push({ 
                id: farmer.id, 
                name: farmer.name, 
                phone: farmer.phone 
            });
        }
    });

    if (farmers.length === 0) {
        showNotification('No valid phone numbers found for selected farmers', 'warning');
        return;
    }

    // Show WhatsApp options modal
    showWhatsAppOptionsModal(farmers);
}

// Show WhatsApp options modal
function showWhatsAppOptionsModal(farmers) {
    const modal = document.createElement('div');
    modal.className = 'contact-modal-overlay';
    modal.innerHTML = `
        <div class="contact-modal whatsapp-options-modal">
            <div class="contact-modal-header">
                <h3><i class="fab fa-whatsapp"></i> WhatsApp Options - ${farmers.length} Farmers</h3>
                <button class="close-modal" onclick="this.closest('.contact-modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="contact-modal-body">
                <div class="whatsapp-options">
                    <div class="option-card" onclick="sendWhatsAppPriceTrends(${JSON.stringify(farmers).replace(/"/g, '&quot;')})">
                        <div class="option-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="option-content">
                            <h4>📊 Current Price Trends</h4>
                            <p>Send latest market price trends with analysis and recommendations</p>
                            <div class="option-features">
                                <span>• Real-time prices</span>
                                <span>• Trend analysis</span>
                                <span>• Market tips</span>
                            </div>
                        </div>
                        <div class="option-arrow">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                    
                    <div class="option-card" onclick="sendCustomWhatsAppMessage(${JSON.stringify(farmers).replace(/"/g, '&quot;')})">
                        <div class="option-icon">
                            <i class="fas fa-edit"></i>
                        </div>
                        <div class="option-content">
                            <h4>✍️ Custom Message</h4>
                            <p>Write and send a personalized message to selected farmers</p>
                            <div class="option-features">
                                <span>• Custom content</span>
                                <span>• Personal touch</span>
                                <span>• Flexible messaging</span>
                            </div>
                        </div>
                        <div class="option-arrow">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                    
                    <div class="option-card" onclick="previewPriceTrends()">
                        <div class="option-icon">
                            <i class="fas fa-eye"></i>
                        </div>
                        <div class="option-content">
                            <h4>👁️ Preview Price Message</h4>
                            <p>See how the price trends message will look before sending</p>
                            <div class="option-features">
                                <span>• Message preview</span>
                                <span>• Content review</span>
                                <span>• No sending</span>
                            </div>
                        </div>
                        <div class="option-arrow">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Send WhatsApp price trends
async function sendWhatsAppPriceTrends(farmers) {
    try {
        // Close the modal
        const modal = document.querySelector('.contact-modal-overlay');
        if (modal) {
            modal.remove();
        }
        
        showNotification('Generating price trends message...', 'info');
        
        const phoneNumbers = farmers.map(f => f.phone);
        const farmerNames = farmers.map(f => f.name);
        
        try {
            const response = await fetch('api/endpoints/whatsapp_trends.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'send_price_trends',
                    recipients: phoneNumbers,
                    farmer_names: farmerNames
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                if (result.data.whatsapp_urls) {
                    showWhatsAppUrlsModal(result.data.whatsapp_urls, farmers, result.data.message_preview);
                } else {
                    showNotification(result.message, 'success');
                }
                return;
            } else {
                console.log('API response error:', result);
                throw new Error(result.error || 'API returned error');
            }
        } catch (apiError) {
            console.log('API call failed, using local generation:', apiError);
            // Fallback to local price trends generation
            generateBulkLocalPriceTrends(farmers);
        }
        
    } catch (error) {
        console.error('Error sending WhatsApp price trends:', error);
        showNotification('Error generating WhatsApp message', 'error');
    }
}

// Generate bulk local price trends when API is not available
function generateBulkLocalPriceTrends(farmers) {
    const currentDate = new Date().toLocaleDateString('en-IN');
    
    const priceTrendsMessage = `🌾 *Market Price Analyzer* 🌾
Hello Farmer!

📊 *Current Market Price Trends*
📅 Date: ${currentDate}

🥬 *Tomato*: ₹45.50/kg (+₹2.50, +5.8%) 📈
📍 Central Market

🧄 *Onion*: ₹32.00/kg (-₹1.50, -4.5%) 📉
📍 Local Market

🥔 *Potato*: ₹28.75/kg (₹0.00, 0.0%) ➡️
📍 Wholesale Market

🌶️ *Green Chili*: ₹65.00/kg (+₹5.00, +8.3%) 📈
📍 Farmer's Market

🥕 *Carrot*: ₹40.00/kg (-₹2.00, -4.8%) 📉
📍 Regional Market

💡 *Tips:*
🔸 Best time to sell: When prices show upward trend
🔸 Plan your harvest: Based on demand forecasts
🔸 Monitor daily: Prices change frequently

📱 For more updates, visit our platform
🤝 Market Price Analyzer Team`;

    // Generate WhatsApp URLs for each farmer
    const whatsappUrls = farmers.map(farmer => {
        let cleanPhone = farmer.phone.replace(/[^\d+]/g, '');
        
        if (cleanPhone.startsWith('+')) {
            cleanPhone = cleanPhone.substring(1);
        }
        
        if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
        }
        
        const encodedMessage = encodeURIComponent(priceTrendsMessage);
        
        return {
            number: farmer.phone,
            whatsapp_url: `https://wa.me/${cleanPhone}?text=${encodedMessage}`,
            clean_number: cleanPhone
        };
    });
    
    // Show URLs modal with local data
    showWhatsAppUrlsModal(whatsappUrls, farmers, priceTrendsMessage.substring(0, 200) + '...');
    showNotification(`Local price trends generated for ${farmers.length} farmers!`, 'success');
}

// Send custom WhatsApp message
function sendCustomWhatsAppMessage(farmers) {
    // Close the modal
    const modal = document.querySelector('.contact-modal-overlay');
    if (modal) {
        modal.remove();
    }
    
    const phoneNumbers = farmers.map(f => f.phone);
    
    const message = prompt(
        `Enter WhatsApp message for ${farmers.length} farmers:`,
        'Hello! This is regarding market price updates. Please check the latest prices.'
    );

    if (!message || !message.trim()) {
        return;
    }

    bulkWhatsApp(phoneNumbers, message.trim());
}

// Preview price trends message
async function previewPriceTrends() {
    try {
        showNotification('Loading price trends preview...', 'info');
        
        const response = await fetch('api/endpoints/whatsapp_trends.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'preview_message',
                recipients: ['preview'],
                farmer_names: ['Preview User']
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessagePreviewModal(result.data.preview);
        } else {
            showNotification(result.error || 'Failed to generate preview', 'error');
        }
        
    } catch (error) {
        console.error('Error generating preview:', error);
        showNotification('Error generating preview', 'error');
    }
}

// Show WhatsApp URLs modal for opening individual chats
function showWhatsAppUrlsModal(whatsappUrls, farmers, messagePreview) {
    const modal = document.createElement('div');
    modal.className = 'contact-modal-overlay';
    
    const urlsList = whatsappUrls.map((urlData, index) => {
        const farmer = farmers[index];
        return `
            <div class="whatsapp-url-item">
                <div class="farmer-info">
                    <strong>${farmer.name}</strong>
                    <span>${farmer.phone}</span>
                </div>
                <button class="btn btn-whatsapp btn-sm" onclick="window.open('${urlData.whatsapp_url}', '_blank')">
                    <i class="fab fa-whatsapp"></i>
                    Send WhatsApp
                </button>
            </div>
        `;
    }).join('');
    
    modal.innerHTML = `
        <div class="contact-modal large-modal">
            <div class="contact-modal-header">
                <h3><i class="fab fa-whatsapp"></i> WhatsApp Price Trends Ready</h3>
                <button class="close-modal" onclick="this.closest('.contact-modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="contact-modal-body">
                <div class="message-preview">
                    <h4>📱 Message Preview:</h4>
                    <div class="preview-content">
                        ${messagePreview.substring(0, 200)}...
                    </div>
                </div>
                
                <div class="whatsapp-urls-section">
                    <h4>🚀 Click to send to each farmer:</h4>
                    <div class="whatsapp-urls-list">
                        ${urlsList}
                    </div>
                </div>
                
                <div class="bulk-action">
                    <button class="btn btn-primary" onclick="openAllWhatsAppUrls(${JSON.stringify(whatsappUrls.map(u => u.whatsapp_url))})">
                        <i class="fab fa-whatsapp"></i>
                        Open All WhatsApp Chats
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    showNotification(`WhatsApp price trends ready for ${farmers.length} farmers!`, 'success');
}

// Show message preview modal
function showMessagePreviewModal(messageContent) {
    const modal = document.createElement('div');
    modal.className = 'contact-modal-overlay';
    modal.innerHTML = `
        <div class="contact-modal">
            <div class="contact-modal-header">
                <h3><i class="fas fa-eye"></i> Price Trends Message Preview</h3>
                <button class="close-modal" onclick="this.closest('.contact-modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="contact-modal-body">
                <div class="message-preview-full">
                    <h4>📱 How the message will look:</h4>
                    <div class="preview-content-full">
                        ${messageContent.replace(/\n/g, '<br>')}
                    </div>
                </div>
                <div class="preview-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.contact-modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                        Close Preview
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Open all WhatsApp URLs
function openAllWhatsAppUrls(urls) {
    urls.forEach((url, index) => {
        setTimeout(() => {
            window.open(url, '_blank');
        }, index * 1000); // 1 second delay between each
    });
    
    showNotification(`Opening ${urls.length} WhatsApp chats...`, 'success');
    
    // Close modal
    const modal = document.querySelector('.contact-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// Bulk WhatsApp
function bulkWhatsApp(phoneNumbers, message) {
    const encodedMessage = encodeURIComponent(message);
    let successCount = 0;

    phoneNumbers.forEach((phone, index) => {
        setTimeout(() => {
            let cleanPhone = phone.replace(/[^\d+]/g, '');
            
            if (cleanPhone.startsWith('+')) {
                cleanPhone = cleanPhone.substring(1);
            }
            
            if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) {
                cleanPhone = '91' + cleanPhone;
            }

            window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
            logContactAttempt('bulk_whatsapp', phone);
            successCount++;

            if (index === phoneNumbers.length - 1) {
                showNotification(`Opened WhatsApp for ${successCount} farmers`, 'success');
            }
        }, index * 1000); // 1 second delay between each WhatsApp opening
    });
}

// Handle bulk call
function handleBulkCall() {
    const selectedCheckboxes = document.querySelectorAll('.farmer-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select farmers to call', 'warning');
        return;
    }

    const farmers = [];
    selectedCheckboxes.forEach(checkbox => {
        const farmerId = checkbox.value;
        const farmer = window.farmers.find(f => f.id == farmerId);
        if (farmer && farmer.phone) {
            farmers.push({ name: farmer.name, phone: farmer.phone });
        }
    });

    if (farmers.length === 0) {
        showNotification('No valid phone numbers found for selected farmers', 'warning');
        return;
    }

    showBulkCallModal(farmers);
}

// Show bulk call modal
function showBulkCallModal(farmers) {
    const modal = document.createElement('div');
    modal.className = 'contact-modal-overlay';
    modal.innerHTML = `
        <div class="contact-modal">
            <div class="contact-modal-header">
                <h3>Bulk Call - ${farmers.length} Farmers</h3>
                <button class="close-modal" onclick="this.closest('.contact-modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="contact-modal-body">
                <p>Select how you'd like to call the farmers:</p>
                <div class="bulk-call-options">
                    <button class="btn btn-primary" onclick="callFarmersSequentially(${JSON.stringify(farmers).replace(/"/g, '&quot;')})">
                        <i class="fas fa-phone"></i> Call One by One
                    </button>
                    <button class="btn btn-secondary" onclick="showCallList(${JSON.stringify(farmers).replace(/"/g, '&quot;')})">
                        <i class="fas fa-list"></i> Show Call List
                    </button>
                    <button class="btn btn-info" onclick="exportCallList(${JSON.stringify(farmers).replace(/"/g, '&quot;')})">
                        <i class="fas fa-download"></i> Export Numbers
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Call farmers sequentially
function callFarmersSequentially(farmers) {
    if (farmers.length === 0) return;
    
    let currentIndex = 0;
    
    function callNext() {
        if (currentIndex >= farmers.length) {
            showNotification('All farmers called successfully', 'success');
            return;
        }
        
        const farmer = farmers[currentIndex];
        const shouldContinue = confirm(`Call ${farmer.name} (${farmer.phone})?\n\nClick OK to call, Cancel to skip to next farmer.`);
        
        if (shouldContinue) {
            callFarmer(farmer.phone);
            logContactAttempt('bulk_call', farmer.phone);
        }
        
        currentIndex++;
        
        if (currentIndex < farmers.length) {
            setTimeout(() => {
                callNext();
            }, 2000); // 2 second delay between calls
        } else {
            showNotification('Bulk calling completed', 'success');
        }
    }
    
    callNext();
    
    // Close modal
    document.querySelector('.contact-modal-overlay').remove();
}

// Show call list
function showCallList(farmers) {
    const modal = document.querySelector('.contact-modal-overlay');
    const modalBody = modal.querySelector('.contact-modal-body');
    
    modalBody.innerHTML = `
        <div class="call-list">
            <h4>Call List (${farmers.length} farmers)</h4>
            <div class="call-list-items">
                ${farmers.map((farmer, index) => `
                    <div class="call-list-item">
                        <span class="farmer-info">
                            <strong>${escapeHtml(farmer.name)}</strong><br>
                            <small>${farmer.phone}</small>
                        </span>
                        <button class="btn btn-sm btn-success" onclick="callFarmer('${farmer.phone}')">
                            <i class="fas fa-phone"></i> Call
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="call-list-actions">
                <button class="btn btn-secondary" onclick="this.closest('.contact-modal-overlay').remove()">
                    <i class="fas fa-times"></i> Close
                </button>
                <button class="btn btn-info" onclick="exportCallList(${JSON.stringify(farmers).replace(/"/g, '&quot;')})">
                    <i class="fas fa-download"></i> Export List
                </button>
            </div>
        </div>
    `;
}

// Cross-browser compatible export functions

// Main export data handler
function handleExportData() {
    try {
        if (farmers && farmers.length > 0) {
            exportFarmersToCSV(farmers);
        } else {
            showNotification('No farmer data to export', 'warning');
        }
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Export failed: ' + error.message, 'error');
    }
}

// Export farmers data to CSV with full details
function exportFarmersToCSV(farmersData) {
    const headers = ['Name', 'Phone', 'Location', 'Crops', 'Email', 'Address', 'Status', 'Created Date'];
    const csvContent = [headers.join(',')];
    
    farmersData.forEach(farmer => {
        const row = [
            escapeCSV(farmer.name || ''),
            escapeCSV(farmer.phone || ''),
            escapeCSV(farmer.location || ''),
            escapeCSV(Array.isArray(farmer.crops) ? farmer.crops.join('; ') : (farmer.crops || '')),
            escapeCSV(farmer.email || ''),
            escapeCSV(farmer.address || ''),
            escapeCSV(farmer.status || 'active'),
            escapeCSV(farmer.created_at ? new Date(farmer.created_at).toLocaleDateString() : '')
        ];
        csvContent.push(row.join(','));
    });
    
    const csvString = csvContent.join('\n');
    const filename = `farmers_data_${new Date().toISOString().split('T')[0]}.csv`;
    
    downloadFile(csvString, filename, 'text/csv');
    showNotification(`Exported ${farmersData.length} farmers to CSV`, 'success');
}

// Export call list (simplified version)
function exportCallList(farmers) {
    try {
        const csvContent = "Name,Phone Number\n" + 
            farmers.map(farmer => `"${escapeCSV(farmer.name)}","${escapeCSV(farmer.phone)}"`).join('\n');
        
        const filename = `farmer_call_list_${new Date().toISOString().split('T')[0]}.csv`;
        downloadFile(csvContent, filename, 'text/csv');
        showNotification('Call list exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Export failed: ' + error.message, 'error');
    }
}

// Cross-browser file download function
function downloadFile(content, filename, mimeType) {
    mimeType = mimeType || 'application/octet-stream';
    
    // Add BOM for better Excel compatibility
    if (mimeType === 'text/csv') {
        content = '\uFEFF' + content;
    }
    
    // Modern browsers with Blob support
    if (typeof Blob !== 'undefined' && window.URL && window.URL.createObjectURL) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        if (typeof link.download === 'string') {
            link.href = url;
            link.download = filename;
            
            // Firefox requires the link to be in the body
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            setTimeout(() => {
                if (window.URL.revokeObjectURL) {
                    window.URL.revokeObjectURL(url);
                }
            }, 100);
        } else {
            // Fallback for older browsers
            window.open(url, '_blank');
        }
    } else if (navigator.msSaveBlob) {
        // IE 10+
        const blob = new Blob([content], { type: mimeType });
        navigator.msSaveBlob(blob, filename);
    } else {
        // Fallback for very old browsers
        const dataUri = 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(content);
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Escape CSV values to handle commas and quotes
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    value = String(value);
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

// Handle import farmers - Full functionality
function handleImportFarmers() {
    showImportModal();
}

// Show import modal
function showImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.classList.add('active');
        
        // Setup event listeners for the existing modal
        setupImportModalEvents();
        setupDragAndDrop();
        
        // Reset modal state
        resetImportModal();
    }
}

// Close import modal
function closeImportModal() {
    const modal = document.getElementById('import-modal');
    if (modal) {
        modal.classList.remove('active');
        resetImportModal();
    }
}

// Setup import modal event listeners
function setupImportModalEvents() {
    const closeBtn = document.getElementById('close-import-modal');
    const cancelBtn = document.getElementById('cancel-import');
    const startBtn = document.getElementById('start-import');
    const fileInput = document.getElementById('csv-file-input');
    const uploadArea = document.getElementById('file-upload-area');
    const downloadSampleBtn = document.getElementById('download-sample-csv');

    // Close button events
    if (closeBtn) {
        closeBtn.removeEventListener('click', closeImportModal);
        closeBtn.addEventListener('click', closeImportModal);
    }
    
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', closeImportModal);
        cancelBtn.addEventListener('click', closeImportModal);
    }

    // File input events
    if (fileInput) {
        fileInput.removeEventListener('change', handleFileSelect);
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Upload area click event
    if (uploadArea) {
        uploadArea.removeEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('click', () => fileInput.click());
    }

    // Start import event
    if (startBtn) {
        startBtn.removeEventListener('click', startImport);
        startBtn.addEventListener('click', startImport);
    }

    // Download sample CSV event
    if (downloadSampleBtn) {
        downloadSampleBtn.removeEventListener('click', downloadSampleCSV);
        downloadSampleBtn.addEventListener('click', downloadSampleCSV);
    }
}

// Reset import modal to initial state
function resetImportModal() {
    const filePreviewSection = document.getElementById('file-preview-section');
    const importOptionsSection = document.getElementById('import-options-section');
    const progressSection = document.getElementById('progress-section');
    const startBtn = document.getElementById('start-import');

    if (filePreviewSection) filePreviewSection.style.display = 'none';
    if (importOptionsSection) importOptionsSection.style.display = 'none';
    if (progressSection) progressSection.style.display = 'none';
    if (startBtn) startBtn.disabled = true;

    // Reset file input
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) {
        fileInput.value = '';
    }
}

// Setup drag and drop functionality
function setupDragAndDrop() {
    const uploadArea = document.getElementById('file-upload-area');
    
    if (!uploadArea) return;
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                const fileInput = document.getElementById('csv-file-input');
                if (fileInput) {
                    fileInput.files = files;
                    handleFileSelect({ files: files });
                }
            } else {
                showNotification('Please select a CSV file', 'error');
            }
        }
    });
}

// Handle file selection
function handleFileSelect(input) {
    const file = input.files ? input.files[0] : input.target ? input.target.files[0] : null;
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
        showNotification('Please select a CSV file', 'error');
        return;
    }
    
    const filePreviewSection = document.getElementById('file-preview-section');
    const importOptionsSection = document.getElementById('import-options-section');
    const filePreview = document.getElementById('file-preview');
    const importBtn = document.getElementById('start-import');
    
    // Show file info
    fileInfo.style.display = 'block';
    
    // Read file for preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvContent = e.target.result;
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            showNotification('CSV file must have header and at least one data row', 'error');
            return;
        }
        
        // Show preview
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const sampleRows = lines.slice(1, 4); // Show first 3 data rows
        
        let previewHTML = `
            <div class="file-stats">
                <p><strong>File:</strong> ${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
                <p><strong>Rows:</strong> ${lines.length - 1} farmers</p>
                <p><strong>Columns:</strong> ${headers.join(', ')}</p>
            </div>
            <table class="preview-table">
                <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>
        `;
        
        sampleRows.forEach(row => {
            const cells = row.split(',').map(c => c.replace(/"/g, '').trim());
            previewHTML += `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
        });
        
        previewHTML += '</tbody></table>';
        
        if (lines.length > 4) {
            previewHTML += `<p><em>... and ${lines.length - 4} more rows</em></p>`;
        }
        
        previewContent.innerHTML = previewHTML;
        
        // Enable import button
        importBtn.disabled = false;
        
        // Store file data for import
        window.importFileData = {
            file: file,
            content: csvContent,
            rows: lines.length - 1
        };
    };
    
    reader.readAsText(file);
}

// Start import process
async function startImport() {
    if (!window.importFileData) {
        showNotification('No file selected for import', 'error');
        return;
    }
    
    const progressDiv = document.getElementById('import-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const importBtn = document.getElementById('start-import-btn');
    
    // Show progress
    progressDiv.style.display = 'block';
    importBtn.disabled = true;
    
    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('file', window.importFileData.file);
        formData.append('type', 'farmers');
        
        // Add options
        formData.append('skipDuplicates', document.getElementById('skip-duplicates').checked);
        formData.append('validateData', document.getElementById('validate-data').checked);
        
        // Update progress
        progressText.textContent = 'Uploading file...';
        progressFill.style.width = '25%';
        
        // Upload file
        const response = await fetch('api/endpoints/upload-data.php', {
            method: 'POST',
            body: formData
        });
        
        progressText.textContent = 'Processing data...';
        progressFill.style.width = '75%';
        
        const result = await response.json();
        
        if (result.success) {
            progressText.textContent = 'Import completed successfully!';
            progressFill.style.width = '100%';
            
            showNotification(`Successfully imported ${result.processed} farmers!`, 'success');
            
            // Refresh farmers list
            await loadFarmersData();
            updateStatistics();
            
            // Close modal after delay
            setTimeout(() => {
                closeImportModal();
            }, 2000);
            
        } else {
            throw new Error(result.error || 'Import failed');
        }
        
    } catch (error) {
        console.error('Import error:', error);
        progressText.textContent = 'Import failed: ' + error.message;
        progressFill.style.width = '0%';
        showNotification('Import failed: ' + error.message, 'error');
        importBtn.disabled = false;
    }
}

// Create sample CSV for download
function downloadSampleCSV() {
    const sampleData = `Name,Phone,Location,Crops,Email,Address
John Farmer,9876543210,Chennai,Rice,john@example.com,"123 Farm Street, Chennai"
Mary Grower,9876543211,Madurai,Wheat,mary@example.com,"456 Agriculture Road, Madurai"
David Cultivator,9876543212,Coimbatore,Tomato,david@example.com,"789 Harvest Lane, Coimbatore"`;
    
    const filename = 'sample_farmers_import.csv';
    downloadFile(sampleData, filename, 'text/csv');
    showNotification('Sample CSV downloaded - use this as template for your data', 'info');
}

// Handle bulk delete
function handleBulkDelete() {
    const selectedCheckboxes = document.querySelectorAll('.farmer-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
        showNotification('Please select farmers to delete', 'warning');
        return;
    }

    const farmersToDelete = [];
    selectedCheckboxes.forEach(checkbox => {
        const farmerId = checkbox.value;
        const farmer = farmers.find(f => f.id == farmerId);
        if (farmer) {
            farmersToDelete.push(farmer);
        }
    });

    if (farmersToDelete.length === 0) {
        showNotification('No valid farmers selected for deletion', 'warning');
        return;
    }

    const farmerNames = farmersToDelete.map(f => f.name).join(', ');
    const confirmMessage = `Are you sure you want to delete ${farmersToDelete.length} farmer(s)?\n\nFarmers to delete:\n${farmerNames}\n\nThis action cannot be undone.`;

    if (!confirm(confirmMessage)) {
        return;
    }

    bulkDeleteFarmers(farmersToDelete);
}

// Bulk delete farmers
async function bulkDeleteFarmers(farmersToDelete) {
    let successCount = 0;
    let errorCount = 0;
    
    showNotification(`Deleting ${farmersToDelete.length} farmers...`, 'info');

    for (const farmer of farmersToDelete) {
        try {
            const response = await fetch('api/endpoints/farmers.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: farmer.id })
            });

            const result = await response.json();

            if (result.success) {
                successCount++;
                selectedFarmers.delete(farmer.id);
            } else {
                errorCount++;
                console.error(`Failed to delete farmer ${farmer.name}:`, result.error);
            }

        } catch (error) {
            errorCount++;
            console.error(`Error deleting farmer ${farmer.name}:`, error);
        }
    }

    // Show results and reload data
    if (successCount > 0) {
        showNotification(`Successfully deleted ${successCount} farmer(s)`, 'success');
        await loadFarmersData();
        updateStatistics();
    }

    if (errorCount > 0) {
        showNotification(`Failed to delete ${errorCount} farmer(s)`, 'error');
    }

    // Update selection UI
    updateSelectionUI();
}

// ============================================
// PRICE MANAGEMENT FUNCTIONALITY
// ============================================

let prices = [];
let editingPriceId = null;

// Initialize price management
function initializePriceManagement() {
    loadPrices();
    setupPriceEventListeners();
    loadFarmersForPriceForm();
}

// Setup price event listeners
function setupPriceEventListeners() {
    // Add price button
    const addPriceBtn = document.getElementById('add-price-btn');
    if (addPriceBtn) {
        addPriceBtn.addEventListener('click', showPriceForm);
    }

    // Close price form buttons
    const closePriceForm = document.getElementById('close-price-form');
    const cancelPriceForm = document.getElementById('cancel-price-form');
    
    if (closePriceForm) {
        closePriceForm.addEventListener('click', hidePriceForm);
    }
    
    if (cancelPriceForm) {
        cancelPriceForm.addEventListener('click', hidePriceForm);
    }

    // Price form submission
    const priceForm = document.getElementById('price-entry-form');
    if (priceForm) {
        priceForm.addEventListener('submit', handlePriceSubmit);
    }
}

// Load prices from database
async function loadPrices() {
    try {
        const response = await fetch('api/endpoints/prices.php');
        const data = await response.json();
        
        if (data.success) {
            prices = data.data;
            displayPrices();
        } else {
            console.error('Failed to load prices:', data.message);
            showNotification('Failed to load prices', 'error');
        }
    } catch (error) {
        console.error('Error loading prices:', error);
        showNotification('Error loading prices', 'error');
    }
}

// Display prices in the list
function displayPrices() {
    const pricesList = document.getElementById('price-updates-list');
    if (!pricesList) return;

    if (prices.length === 0) {
        pricesList.innerHTML = '<p class="no-data">No price updates found.</p>';
        return;
    }

    const pricesHTML = prices.slice(0, 10).map(price => `
        <div class="price-item" data-price-id="${price.id}">
            <div class="price-info">
                <div class="price-product">
                    <strong>${price.product_name}</strong>
                    <span class="price-amount">₹${parseFloat(price.price).toFixed(2)}/${price.unit}</span>
                </div>
                <div class="price-details">
                    <span class="price-location">${price.market_name || price.location || 'Unknown Location'}</span>
                    <span class="price-date">${formatDate(price.date_recorded || price.created_at)}</span>
                </div>
            </div>
            <div class="price-actions">
                <button class="btn-icon" onclick="editPrice(${price.id})" title="Edit Price">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger" onclick="deletePrice(${price.id})" title="Delete Price">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    pricesList.innerHTML = pricesHTML;
}

// Show price form
function showPriceForm() {
    const form = document.getElementById('price-form');
    if (form) {
        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
        
        // Reset form if adding new price
        if (!editingPriceId) {
            resetPriceForm();
        }
    }
}

// Hide price form
function hidePriceForm() {
    const form = document.getElementById('price-form');
    if (form) {
        form.style.display = 'none';
        editingPriceId = null;
        resetPriceForm();
    }
}

// Reset price form
function resetPriceForm() {
    const form = document.getElementById('price-entry-form');
    if (form) {
        form.reset();
        
        // Update form title
        const cardHeader = form.closest('.form-card').querySelector('.card-header h3');
        if (cardHeader) {
            cardHeader.textContent = 'Add New Price';
        }
        
        // Update submit button
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Price';
        }
    }
}

// Handle price form submission
async function handlePriceSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const priceData = {
        product_name: document.getElementById('product-select-price').value,
        price: parseFloat(document.getElementById('price-input').value),
        unit: document.getElementById('unit-select').value,
        market_name: document.getElementById('market-location').value,
        location: document.getElementById('market-location').value,
        farmer_id: document.getElementById('farmer-select-price').value || null
    };
    
    // Validate required fields
    if (!priceData.product_name) {
        showNotification('Please select a product', 'warning');
        return;
    }
    
    if (!priceData.price || priceData.price <= 0) {
        showNotification('Please enter a valid price', 'warning');
        return;
    }
    
    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        const url = editingPriceId 
            ? `api/endpoints/prices.php?id=${editingPriceId}`
            : 'api/endpoints/prices.php';
        
        const method = editingPriceId ? 'PUT' : 'POST';
        
        if (editingPriceId) {
            priceData.id = editingPriceId;
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(priceData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            const action = editingPriceId ? 'updated' : 'added';
            showNotification(`Price ${action} successfully!`, 'success');
            
            // Reload prices
            await loadPrices();
            
            // Hide form
            hidePriceForm();
        } else {
            showNotification(result.message || 'Failed to save price', 'error');
        }
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Error saving price:', error);
        showNotification('Error saving price', 'error');
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Price';
        submitBtn.disabled = false;
    }
}

// Edit price
async function editPrice(priceId) {
    const price = prices.find(p => p.id == priceId);
    if (!price) {
        showNotification('Price not found', 'error');
        return;
    }
    
    editingPriceId = priceId;
    
    // Fill form with existing data
    document.getElementById('product-select-price').value = price.product_name || '';
    document.getElementById('price-input').value = price.price || '';
    document.getElementById('unit-select').value = price.unit || 'kg';
    document.getElementById('market-location').value = price.market_name || price.location || '';
    document.getElementById('farmer-select-price').value = price.farmer_id || '';
    
    // Update form title
    const cardHeader = document.querySelector('.form-card .card-header h3');
    if (cardHeader) {
        cardHeader.textContent = 'Edit Price';
    }
    
    // Update submit button
    const submitBtn = document.querySelector('#price-entry-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Price';
    }
    
    // Show form
    showPriceForm();
}

// Delete price
async function deletePrice(priceId) {
    const price = prices.find(p => p.id == priceId);
    if (!price) {
        showNotification('Price not found', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete the price for ${price.product_name}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`api/endpoints/prices.php?id=${priceId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Price deleted successfully', 'success');
            await loadPrices();
        } else {
            showNotification(result.message || 'Failed to delete price', 'error');
        }
    } catch (error) {
        console.error('Error deleting price:', error);
        showNotification('Error deleting price', 'error');
    }
}

// Load farmers for price form dropdown
async function loadFarmersForPriceForm() {
    try {
        const response = await fetch('api/endpoints/farmers.php');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
            const select = document.getElementById('farmer-select-price');
            if (select) {
                // Keep the default option
                const defaultOption = select.querySelector('option[value=""]');
                select.innerHTML = '';
                if (defaultOption) {
                    select.appendChild(defaultOption);
                }
                
                // Add farmer options
                data.data.forEach(farmer => {
                    const option = document.createElement('option');
                    option.value = farmer.id;
                    option.textContent = farmer.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading farmers for price form:', error);
    }
}

// Add price management to initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing admin panel with price management...');
    initializeAdminPanel();
    initializePriceManagement(); // Add this line
});