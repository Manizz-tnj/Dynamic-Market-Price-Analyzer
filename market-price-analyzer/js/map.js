// Map page JavaScript

// ============================================
// MAP STATE
// ============================================

let map;
let userLocation = null;
let nearbyMarkets = [];
let markersOnMap = [];
let userMarker = null;
let searchRadius = 5; // km
let directionsService;
let directionsRenderer;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeMapPage();
    setupEventListeners();
});

function initializeMapPage() {
    console.log('Initializing map page...');
    
    // Check if Google Maps API is loaded
    if (typeof google === 'undefined') {
        showMapError('Google Maps API failed to load. Please check your API key.');
        return;
    }
    
    // Initialize map with default location (Delhi, India)
    initializeMap(28.6139, 77.2090);
    
    // Try to get user's location
    getUserLocation();
}

function setupEventListeners() {
    // Find location button
    const findLocationBtn = document.getElementById('find-location-btn');
    if (findLocationBtn) {
        findLocationBtn.addEventListener('click', handleFindLocation);
    }

    // Search location
    const searchLocationBtn = document.getElementById('search-location-btn');
    const locationSearchInput = document.getElementById('location-search');
    
    if (searchLocationBtn) {
        searchLocationBtn.addEventListener('click', handleSearchLocation);
    }
    
    if (locationSearchInput) {
        locationSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearchLocation();
            }
        });
    }

    // Search radius change
    const searchRadiusSelect = document.getElementById('search-radius');
    if (searchRadiusSelect) {
        searchRadiusSelect.addEventListener('change', handleRadiusChange);
    }

    // Modal close handlers
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            MarketAnalyzer.closeModal('market-modal');
        });
    }

    // Market action buttons
    setupMarketActionButtons();
}

function setupMarketActionButtons() {
    // Get directions button
    document.addEventListener('click', (e) => {
        if (e.target.id === 'get-directions-btn' || e.target.closest('#get-directions-btn')) {
            handleGetDirections();
        }
        
        if (e.target.id === 'call-market-btn' || e.target.closest('#call-market-btn')) {
            handleCallMarket();
        }
        
        if (e.target.id === 'view-prices-btn' || e.target.closest('#view-prices-btn')) {
            handleViewPrices();
        }
    });
}

// ============================================
// MAP INITIALIZATION
// ============================================

function initializeMap(lat, lng) {
    const mapOptions = {
        center: { lat, lng },
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: getMapStyles(), // Custom dark theme styles
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    
    // Initialize directions service
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
            strokeColor: '#4caf50',
            strokeWeight: 5,
            strokeOpacity: 0.8
        }
    });
    directionsRenderer.setMap(map);

    // Initialize places service for location search
    initializePlacesService();
    
    // Load nearby markets
    loadNearbyMarkets(lat, lng);
}

function initializePlacesService() {
    try {
        const locationSearchInput = document.getElementById('location-search');
        if (!locationSearchInput) {
            console.error('Location search input not found');
            return;
        }

        if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
            console.error('Google Maps Places API not loaded');
            return;
        }

        // Initialize Tamil Nadu markets autocomplete
        initializeTamilNaduMarketSearch(locationSearchInput);

        // Initialize general location autocomplete as fallback
        const autocomplete = new google.maps.places.Autocomplete(locationSearchInput, {
            types: ['geocode'],
            componentRestrictions: { country: 'in' } // Restrict to India
        });

        // Bind to map bounds for better suggestions
        autocomplete.bindTo('bounds', map);

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry) {
                MarketAnalyzer.showNotification('No details available for: ' + place.name, 'warning');
                return;
            }

            if (place.geometry.viewport) {
                map.fitBounds(place.geometry.viewport);
            } else {
                map.setCenter(place.geometry.location);
                map.setZoom(14);
            }

            const location = place.geometry.location;
            centerMapOnLocation(location.lat(), location.lng());
            loadNearbyMarkets(location.lat(), location.lng());
            
            const placeName = place.name || place.formatted_address || 'Selected location';
            MarketAnalyzer.showNotification(`Location found: ${placeName}`, 'success');
        });

        console.log('Google Places autocomplete initialized successfully');
    } catch (error) {
        console.error('Error initializing places service:', error);
        MarketAnalyzer.showNotification('Error initializing location search', 'error');
    }
}

// New function for Tamil Nadu market-specific search
function initializeTamilNaduMarketSearch(inputElement) {
    let marketSuggestions = [];
    let suggestionContainer = null;

    // Create suggestion container
    function createSuggestionContainer() {
        suggestionContainer = document.createElement('div');
        suggestionContainer.className = 'tn-market-suggestions';
        suggestionContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #4caf50;
            border-top: none;
            border-radius: 0 0 4px 4px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
            box-shadow: 0 2px 10px rgba(76, 175, 80, 0.2);
        `;
        
        inputElement.parentNode.style.position = 'relative';
        inputElement.parentNode.appendChild(suggestionContainer);
    }

    // Load Tamil Nadu markets for suggestions
    async function loadTamilNaduMarkets() {
        try {
            const response = await MarketAnalyzer.getNearbyMarkets(11.1271, 78.6569, 1000); // Center of Tamil Nadu with large radius
            if (response.success && response.data) {
                marketSuggestions = response.data.map(market => ({
                    name: market.name,
                    location: market.location,
                    address: market.address,
                    latitude: market.latitude,
                    longitude: market.longitude
                }));
                console.log(`Loaded ${marketSuggestions.length} Tamil Nadu markets for search`);
            }
        } catch (error) {
            console.error('Error loading Tamil Nadu markets:', error);
        }
    }

    // Filter markets based on search input
    function filterMarkets(query) {
        if (!query || query.length < 2) return [];
        
        query = query.toLowerCase();
        return marketSuggestions.filter(market => 
            market.name.toLowerCase().includes(query) ||
            market.location.toLowerCase().includes(query) ||
            market.address.toLowerCase().includes(query)
        ).slice(0, 5); // Limit to 5 suggestions
    }

    // Show suggestions
    function showSuggestions(filteredMarkets) {
        if (!suggestionContainer) createSuggestionContainer();
        
        if (filteredMarkets.length === 0) {
            suggestionContainer.style.display = 'none';
            return;
        }

        suggestionContainer.innerHTML = filteredMarkets.map(market => `
            <div class="market-suggestion" data-lat="${market.latitude}" data-lng="${market.longitude}" 
                 data-name="${market.name}" style="
                padding: 10px;
                border-bottom: 1px solid #e8f5e8;
                cursor: pointer;
                transition: background 0.2s;
            " onmouseover="this.style.background='#e8f5e8'" onmouseout="this.style.background='white'">
                <div style="font-weight: bold; color: #4caf50; margin-bottom: 2px;">${market.name}</div>
                <div style="font-size: 12px; color: #666;">${market.location}</div>
            </div>
        `).join('');

        // Add click handlers
        suggestionContainer.querySelectorAll('.market-suggestion').forEach(item => {
            item.addEventListener('click', () => {
                const lat = parseFloat(item.dataset.lat);
                const lng = parseFloat(item.dataset.lng);
                const name = item.dataset.name;
                
                // Center map on selected market
                centerMapOnLocation(lat, lng);
                loadNearbyMarkets(lat, lng);
                
                // Update input and hide suggestions
                inputElement.value = name;
                suggestionContainer.style.display = 'none';
                
                MarketAnalyzer.showNotification(`Found market: ${name}`, 'success');
            });
        });

        suggestionContainer.style.display = 'block';
    }

    // Hide suggestions
    function hideSuggestions() {
        if (suggestionContainer) {
            setTimeout(() => {
                suggestionContainer.style.display = 'none';
            }, 200); // Delay to allow clicks
        }
    }

    // Event listeners
    inputElement.addEventListener('input', (e) => {
        const query = e.target.value;
        const filteredMarkets = filterMarkets(query);
        showSuggestions(filteredMarkets);
    });

    inputElement.addEventListener('blur', hideSuggestions);
    
    inputElement.addEventListener('focus', (e) => {
        if (e.target.value.length >= 2) {
            const filteredMarkets = filterMarkets(e.target.value);
            showSuggestions(filteredMarkets);
        }
    });

    // Load markets data
    loadTamilNaduMarkets();
}

// ============================================
// LOCATION HANDLING
// ============================================

async function getUserLocation() {
    try {
        // Show loading notification
        MarketAnalyzer.showNotification('Detecting your location...', 'info', 3000);
        
        const location = await MarketAnalyzer.getCurrentLocation();
        userLocation = location;
        
        // Update map center
        centerMapOnLocation(location.latitude, location.longitude);
        
        // Add user location marker
        addUserLocationMarker(location.latitude, location.longitude);
        
        // Load nearby markets
        loadNearbyMarkets(location.latitude, location.longitude);
        
        MarketAnalyzer.showNotification('Location found! Searching for nearby markets...', 'success');
    } catch (error) {
        console.error('Error getting user location:', error);
        
        // Provide fallback options
        let fallbackMessage = error.message;
        if (error.message.includes('denied')) {
            fallbackMessage += '. You can manually search for your city or area above.';
        } else if (error.message.includes('unavailable')) {
            fallbackMessage += '. Using default location - you can search for your area above.';
            // Set default to Chennai (Tamil Nadu's major city)
            centerMapOnLocation(13.0827, 80.2707);
            loadNearbyMarkets(13.0827, 80.2707);
        } else {
            fallbackMessage += '. Please try again or search manually.';
        }
        
        MarketAnalyzer.showNotification(fallbackMessage, 'warning', 8000);
    }
}

function handleFindLocation() {
    // Update button state
    const findBtn = document.getElementById('find-location-btn');
    if (findBtn) {
        const originalText = findBtn.innerHTML;
        findBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finding...';
        findBtn.disabled = true;
        
        // Reset button after location attempt
        setTimeout(() => {
            if (findBtn) {
                findBtn.innerHTML = originalText;
                findBtn.disabled = false;
            }
        }, 5000);
    }
    
    getUserLocation();
}

function handleSearchLocation() {
    const locationInput = document.getElementById('location-search');
    const query = locationInput.value.trim();
    
    if (!query) {
        MarketAnalyzer.showNotification('Please enter a location to search', 'warning');
        return;
    }

    // Show loading
    showLoadingState(true);

    // Use Geocoder for more reliable search
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 
        address: query,
        componentRestrictions: { country: 'IN' } // Restrict to India
    }, (results, status) => {
        showLoadingState(false);
        
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            const lat = location.lat();
            const lng = location.lng();
            
            // Center map on the searched location
            centerMapOnLocation(lat, lng);
            
            // Add a search result marker
            addSearchResultMarker(lat, lng, results[0].formatted_address);
            
            // Load nearby markets for this location
            loadNearbyMarkets(lat, lng);
            
            // Clear the search input
            locationInput.value = '';
            
            MarketAnalyzer.showNotification(`Found: ${results[0].formatted_address}`, 'success');
        } else {
            MarketAnalyzer.showNotification('Location not found. Please try a different search term.', 'error');
        }
    });
}

function addSearchResultMarker(lat, lng, address) {
    // Remove existing search marker if any
    if (window.searchMarker) {
        window.searchMarker.setMap(null);
    }

    window.searchMarker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 2C10.48 2 6 6.48 6 12C6 20 16 30 16 30S26 20 26 12C26 6.48 21.52 2 16 2Z" fill="#ffeb3b" stroke="#ffffff" stroke-width="2"/>
                    <circle cx="16" cy="12" r="4" fill="#ffffff"/>
                </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 30)
        },
        title: 'Search Result',
        animation: google.maps.Animation.BOUNCE
    });

    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="color: #1b5e20; padding: 10px; max-width: 250px;">
                <h4 style="margin: 0 0 8px 0; color: #ffeb3b;">Search Result</h4>
                <p style="margin: 0; font-size: 13px; color: #388e3c;">
                    <i class="fas fa-map-marker-alt" style="margin-right: 5px;"></i>
                    ${address}
                </p>
            </div>
        `
    });

    window.searchMarker.addListener('click', () => {
        infoWindow.open(map, window.searchMarker);
    });

    // Stop bouncing after 3 seconds
    setTimeout(() => {
        if (window.searchMarker) {
            window.searchMarker.setAnimation(null);
        }
    }, 3000);
}

function useGeocoderSearch(query) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            centerMapOnLocation(location.lat(), location.lng());
            loadNearbyMarkets(location.lat(), location.lng());
            MarketAnalyzer.showNotification('Location found', 'success');
        } else {
            MarketAnalyzer.showNotification('Location not found. Please try a different search term.', 'error');
        }
    });
}

function handleRadiusChange(event) {
    searchRadius = parseInt(event.target.value);
    
    if (userLocation) {
        loadNearbyMarkets(userLocation.latitude, userLocation.longitude);
    } else {
        const center = map.getCenter();
        loadNearbyMarkets(center.lat(), center.lng());
    }
}

function centerMapOnLocation(lat, lng) {
    map.setCenter({ lat, lng });
    map.setZoom(14);
}

function addUserLocationMarker(lat, lng) {
    // Remove existing user marker
    if (userMarker) {
        userMarker.setMap(null);
    }

    userMarker = new google.maps.Marker({
        position: { lat, lng },
        map: map,
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#87ceeb" stroke="#ffffff" stroke-width="2"/>
                    <circle cx="12" cy="12" r="3" fill="#ffffff"/>
                </svg>
            `),
            scaledSize: new google.maps.Size(24, 24),
            anchor: new google.maps.Point(12, 12)
        },
        title: 'Your Location',
        animation: google.maps.Animation.DROP
    });

    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="color: #1b5e20; padding: 10px;">
                <h4 style="margin: 0 0 5px 0; color: #87ceeb;">Your Location</h4>
                <p style="margin: 0; font-size: 14px;">Current position</p>
            </div>
        `
    });

    userMarker.addListener('click', () => {
        infoWindow.open(map, userMarker);
    });
}

// ============================================
// MARKETS LOADING AND DISPLAY
// ============================================

async function loadNearbyMarkets(lat, lng) {
    try {
        showLoadingState(true);
        
        const response = await MarketAnalyzer.getNearbyMarkets(lat, lng, searchRadius);
        
        if (response.success && response.data) {
            nearbyMarkets = response.data;
            displayMarketsOnMap();
            displayMarketsInSidebar();
            updateMarketCount();
        } else {
            throw new Error('Failed to load nearby markets');
        }
    } catch (error) {
        console.error('Error loading nearby markets:', error);
        MarketAnalyzer.showNotification('Failed to load nearby markets. Please check your connection.', 'error');
        
        // Set empty markets
        nearbyMarkets = [];
        displayMarketsOnMap();
        displayMarketsInSidebar();
        updateMarketCount();
    } finally {
        showLoadingState(false);
    }
}

function displayMarketsOnMap() {
    // Clear existing markers
    markersOnMap.forEach(marker => marker.setMap(null));
    markersOnMap = [];

    nearbyMarkets.forEach(market => {
        const marker = new google.maps.Marker({
            position: { lat: market.latitude, lng: market.longitude },
            map: map,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 2C10.48 2 6 6.48 6 12C6 20 16 30 16 30S26 20 26 12C26 6.48 21.52 2 16 2Z" fill="#4caf50" stroke="#ffffff" stroke-width="2"/>
                        <circle cx="16" cy="12" r="4" fill="#ffffff"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 30)
            },
            title: market.name,
            animation: google.maps.Animation.DROP
        });

        const infoWindow = new google.maps.InfoWindow({
            content: createMarkerInfoWindow(market)
        });

        marker.addListener('click', () => {
            // Close other info windows
            markersOnMap.forEach(m => {
                if (m.infoWindow) m.infoWindow.close();
            });
            
            infoWindow.open(map, marker);
            showMarketDetails(market);
        });

        marker.infoWindow = infoWindow;
        markersOnMap.push(marker);
    });

    // Adjust map bounds to show all markers
    if (nearbyMarkets.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        
        if (userLocation) {
            bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
        }
        
        nearbyMarkets.forEach(market => {
            bounds.extend({ lat: market.latitude, lng: market.longitude });
        });
        
        map.fitBounds(bounds);
    }
}

function createMarkerInfoWindow(market) {
    // Format products array or use default if empty
    let productsDisplay = '';
    if (market.products && Array.isArray(market.products) && market.products.length > 0) {
        productsDisplay = market.products.slice(0, 3).map(product => 
            `<span style="background: #c8e6c9; color: #1b5e20; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin: 2px;">${product}</span>`
        ).join(' ');
        if (market.products.length > 3) {
            productsDisplay += `<span style="color: #666; font-size: 11px;"> +${market.products.length - 3} more</span>`;
        }
    } else {
        productsDisplay = '<span style="color: #666; font-size: 11px;">Products available</span>';
    }

    return `
        <div style="color: #1b5e20; padding: 12px; max-width: 280px; font-family: Arial, sans-serif;">
            <h4 style="margin: 0 0 8px 0; color: #4caf50; font-size: 16px;">${market.name}</h4>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #388e3c; line-height: 1.4;">
                <i class="fas fa-map-marker-alt" style="margin-right: 5px; color: #4caf50;"></i>
                ${market.address || market.location}
            </p>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #388e3c;">
                <i class="fas fa-route" style="margin-right: 5px; color: #4caf50;"></i>
                ${market.distance} km away
            </p>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #388e3c;">
                <i class="fas fa-clock" style="margin-right: 5px; color: #4caf50;"></i>
                ${market.hours || 'Mon-Sun: 6:00 AM - 8:00 PM'}
            </p>
            ${market.phone ? `
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #388e3c;">
                <i class="fas fa-phone" style="margin-right: 5px; color: #4caf50;"></i>
                ${market.phone}
            </p>` : ''}
            <div style="margin: 8px 0;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Available Products:</div>
                <div>${productsDisplay}</div>
            </div>
            <div style="text-align: center; margin-top: 10px;">
                <button onclick="showMarketDetails('${market.id}')" 
                        style="background: #4caf50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">
                    <i class="fas fa-info-circle"></i> View Details
                </button>
                ${userLocation ? `
                <button onclick="getDirectionsToMarket(${market.latitude}, ${market.longitude}, '${market.name}')" 
                        style="background: #2196f3; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    <i class="fas fa-directions"></i> Directions
                </button>` : ''}
            </div>
        </div>
    `;
}

function displayMarketsInSidebar() {
    const marketList = document.getElementById('market-list');
    if (!marketList) return;

    if (nearbyMarkets.length === 0) {
        marketList.innerHTML = `
            <div class="no-markets">
                <i class="fas fa-store-slash"></i>
                <p>No markets found in this area</p>
                <button class="btn btn-secondary" onclick="expandSearchRadius()">
                    <i class="fas fa-expand"></i>
                    Expand Search
                </button>
            </div>
        `;
        return;
    }

    marketList.innerHTML = nearbyMarkets.map(market => createMarketListItem(market)).join('');
}

function createMarketListItem(market) {
    return `
        <div class="market-item" onclick="selectMarket('${market.id}')">
            <div class="market-name">${market.name}</div>
            <div class="market-address">${market.address}</div>
            <div class="market-distance">
                <i class="fas fa-route"></i>
                ${market.distance} km away
            </div>
        </div>
    `;
}

function updateMarketCount() {
    const marketCount = document.getElementById('market-count');
    if (marketCount) {
        const count = nearbyMarkets.length;
        marketCount.textContent = `${count} market${count !== 1 ? 's' : ''} found`;
    }
}

// ============================================
// MARKET SELECTION AND DETAILS
// ============================================

function selectMarket(marketId) {
    const market = nearbyMarkets.find(m => m.id === marketId);
    if (!market) return;

    // Center map on selected market
    centerMapOnLocation(market.latitude, market.longitude);
    
    // Find and click the corresponding marker
    const marker = markersOnMap.find(m => m.title === market.name);
    if (marker) {
        google.maps.event.trigger(marker, 'click');
    }
    
    showMarketDetails(market);
}

function showMarketDetails(market) {
    if (typeof market === 'string') {
        market = nearbyMarkets.find(m => m.id === market);
    }
    
    if (!market) return;

    // Update modal content
    updateMarketModal(market);
    
    // Show modal
    MarketAnalyzer.openModal('market-modal');
}

function updateMarketModal(market) {
    const modalName = document.getElementById('modal-market-name');
    const modalAddress = document.getElementById('modal-market-address');
    const modalPhone = document.getElementById('modal-market-phone');
    const modalHours = document.getElementById('modal-market-hours');
    const modalDistance = document.getElementById('modal-market-distance');
    const modalProducts = document.getElementById('modal-products');

    if (modalName) modalName.textContent = market.name;
    if (modalAddress) modalAddress.textContent = market.address || market.location;
    if (modalPhone) modalPhone.textContent = market.phone || market.contact_phone || 'Not available';
    if (modalHours) modalHours.textContent = market.hours || 'Mon-Sun: 6:00 AM - 8:00 PM';
    if (modalDistance) modalDistance.textContent = `${market.distance} km away`;
    
    if (modalProducts) {
        if (market.products && Array.isArray(market.products) && market.products.length > 0) {
            modalProducts.innerHTML = market.products.map(product => 
                `<span class="product-tag" style="background: #4caf50; color: white; margin: 3px;">${product}</span>`
            ).join('');
        } else {
            modalProducts.innerHTML = '<span class="product-tag" style="background: #e0e0e0; color: #666;">Products available on-site</span>';
        }
    }

    // Store current market for actions
    window.currentSelectedMarket = market;
}

// ============================================
// MARKET ACTIONS
// ============================================

function getDirectionsToMarket(lat, lng, marketName) {
    if (!userLocation) {
        MarketAnalyzer.showNotification('Please enable location to get directions', 'warning');
        return;
    }

    const start = new google.maps.LatLng(userLocation.latitude, userLocation.longitude);
    const end = new google.maps.LatLng(lat, lng);

    const request = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Show route info
            const route = result.routes[0];
            const leg = route.legs[0];
            
            MarketAnalyzer.showNotification(
                `Route to ${marketName}: ${leg.distance.text}, ${leg.duration.text}`,
                'info',
                5000
            );
        } else {
            MarketAnalyzer.showNotification('Unable to calculate route to market', 'error');
        }
    });
}

function handleGetDirections() {
    const market = window.currentSelectedMarket;
    if (!market || !userLocation) {
        MarketAnalyzer.showNotification('Location not available for directions', 'warning');
        return;
    }

    getDirectionsToMarket(market.latitude, market.longitude, market.name);
    MarketAnalyzer.closeModal('market-modal');
}

function handleCallMarket() {
    const market = window.currentSelectedMarket;
    if (!market) return;

    const phone = market.phone || market.contact_phone;
    if (phone) {
        window.open(`tel:${phone}`);
    } else {
        MarketAnalyzer.showNotification('Phone number not available', 'warning');
    }
}

function handleViewPrices() {
    const market = window.currentSelectedMarket;
    if (!market) return;

    // Redirect to dashboard with market filter
    window.location.href = `index.html?market=${market.id}`;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function expandSearchRadius() {
    const radiusSelect = document.getElementById('search-radius');
    const currentRadius = parseInt(radiusSelect.value);
    const newRadius = Math.min(currentRadius * 2, 50); // Max 50km
    
    radiusSelect.value = newRadius;
    searchRadius = newRadius;
    
    if (userLocation) {
        loadNearbyMarkets(userLocation.latitude, userLocation.longitude);
    } else {
        const center = map.getCenter();
        loadNearbyMarkets(center.lat(), center.lng());
    }
}

function showLoadingState(show) {
    const marketList = document.getElementById('market-list');
    if (!marketList) return;

    if (show) {
        marketList.innerHTML = `
            <div class="loading-markets">
                <div class="spinner"></div>
                <p>Finding nearby markets...</p>
            </div>
        `;
    }
}

function showMapError(message) {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div class="map-error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Map Error</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh"></i>
                    Retry
                </button>
            </div>
        `;
    }
}

// ============================================
// MAP STYLES (GREEN/SKY BLUE THEME)
// ============================================

function getMapStyles() {
    return [
        {
            "elementType": "geometry",
            "stylers": [{"color": "#ffffff"}] // White background
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#1b5e20"}] // Dark green text
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [{"color": "#ffffff"}] // White stroke
        },
        {
            "featureType": "administrative.locality",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#4caf50"}] // Green for localities
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#2e7d32"}] // Dark green for POI
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [{"color": "#c8e6c9"}] // Light green for parks
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#1b5e20"}] // Dark green for park labels
        },
        {
            "featureType": "road",
            "elementType": "geometry",
            "stylers": [{"color": "#f5f5f5"}] // Light gray roads
        },
        {
            "featureType": "road",
            "elementType": "geometry.stroke",
            "stylers": [{"color": "#e0e0e0"}] // Gray road stroke
        },
        {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#424242"}] // Dark gray road labels
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{"color": "#ffeb3b"}] // Yellow highways
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [{"color": "#ffc107"}] // Amber highway stroke
        },
        {
            "featureType": "road.highway",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#f57f17"}] // Dark yellow highway labels
        },
        {
            "featureType": "transit",
            "elementType": "geometry",
            "stylers": [{"color": "#e1f5fe"}] // Light sky blue transit
        },
        {
            "featureType": "transit.station",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#0277bd"}] // Blue transit labels
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{"color": "#87ceeb"}] // Sky blue water
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{"color": "#01579b"}] // Dark blue water labels
        }
    ];
}

// ============================================
// GOOGLE MAPS INITIALIZATION
// ============================================

// Initialize map when Google Maps API is loaded
function initMap() {
    // This function is called by the Google Maps API
    initializeMapPage();
}

// Add custom styles for map components
const mapStyles = document.createElement('style');
mapStyles.textContent = `
    .loading-markets {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-xl);
        gap: var(--spacing-md);
        color: var(--text-muted);
    }
    
    .no-markets {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-xl);
        gap: var(--spacing-md);
        color: var(--text-muted);
        text-align: center;
    }
    
    .no-markets i {
        font-size: 2rem;
        color: var(--text-disabled);
    }
    
    .map-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: var(--spacing-xl);
        gap: var(--spacing-md);
        color: var(--text-muted);
        text-align: center;
        background: var(--bg-tertiary);
        border-radius: var(--radius-lg);
    }
    
    .map-error i {
        font-size: 3rem;
        color: var(--accent-orange);
    }
    
    .product-tag {
        display: inline-block;
        padding: var(--spacing-xs) var(--spacing-sm);
        background: var(--bg-tertiary);
        color: var(--text-primary);
        border-radius: var(--radius-sm);
        font-size: 0.8rem;
        margin: var(--spacing-xs);
        border: 1px solid var(--border-primary);
    }
    
    @media (max-width: 768px) {
        .map-container {
            grid-template-rows: 300px 1fr;
            height: 600px;
        }
    }
`;
document.head.appendChild(mapStyles);
