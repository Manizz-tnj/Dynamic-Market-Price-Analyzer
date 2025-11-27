-- Tamil Nadu Markets Insert Script
USE market_analyzer;

-- Clear existing markets
DELETE FROM markets;

-- Chennai Markets
INSERT INTO markets (name, location, address, latitude, longitude, contact_phone, phone, hours, products) VALUES 
('Koyambedu Wholesale Market Complex', 'Koyambedu, Chennai, Tamil Nadu', 'Koyambedu, Chennai, Tamil Nadu 600107', 13.0732, 80.1986, '+91-44-26790000', '+91-44-26790000', 'Mon-Sun: 5:00 AM - 10:00 PM', '["Vegetables", "Fruits", "Grains", "Spices"]'),
('Chennai Broadway Market', 'Broadway, George Town, Chennai, Tamil Nadu', 'Broadway, George Town, Chennai, Tamil Nadu 600001', 13.0915, 80.2911, '+91-44-25224567', '+91-44-25224567', 'Mon-Sun: 6:00 AM - 9:00 PM', '["Vegetables", "Fruits", "Fish", "Meat"]'),
('T. Nagar Ranganathan Street Market', 'T. Nagar, Chennai, Tamil Nadu', 'Ranganathan Street, T. Nagar, Chennai, Tamil Nadu 600017', 13.0421, 80.2344, '+91-44-24331234', '+91-44-24331234', 'Mon-Sun: 7:00 AM - 10:00 PM', '["Vegetables", "Fruits", "Flowers", "Groceries"]'),
('Mylapore Market', 'Mylapore, Chennai, Tamil Nadu', 'Mylapore, Chennai, Tamil Nadu 600004', 13.0339, 80.2619, '+91-44-24981567', '+91-44-24981567', 'Mon-Sun: 6:00 AM - 9:00 PM', '["Vegetables", "Fruits", "Flowers", "Traditional Items"]'),
('Periamet Market', 'Periamet, Chennai, Tamil Nadu', 'Periamet, Chennai, Tamil Nadu 600003', 13.0827, 80.2707, '+91-44-25361234', '+91-44-25361234', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Grains"]'),

-- Coimbatore Markets
('Coimbatore Market Gandhi Puram', 'Gandhi Puram, Coimbatore, Tamil Nadu', 'Gandhi Puram, Coimbatore, Tamil Nadu 641012', 11.0168, 76.9558, '+91-422-2439876', '+91-422-2439876', 'Mon-Sun: 6:00 AM - 9:00 PM', '["Vegetables", "Fruits", "Spices", "Grains"]'),
('Cross Cut Road Market', 'Cross Cut Road, Coimbatore, Tamil Nadu', 'Cross Cut Road, Coimbatore, Tamil Nadu 641001', 11.0041, 76.9675, '+91-422-2551234', '+91-422-2551234', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Flowers"]'),
('Singanallur Market', 'Singanallur, Coimbatore, Tamil Nadu', 'Singanallur, Coimbatore, Tamil Nadu 641005', 11.0266, 77.0344, '+91-422-2601567', '+91-422-2601567', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Groceries"]'),

-- Madurai Markets
('Madurai Mattuthavani Market', 'Mattuthavani, Madurai, Tamil Nadu', 'Mattuthavani, Madurai, Tamil Nadu 625020', 9.9252, 78.0877, '+91-452-2537890', '+91-452-2537890', 'Mon-Sun: 5:00 AM - 9:00 PM', '["Vegetables", "Fruits", "Grains", "Spices"]'),
('Meenakshi Amman Temple Market', 'Meenakshi Amman Temple, Madurai, Tamil Nadu', 'Meenakshi Amman Temple Area, Madurai, Tamil Nadu 625001', 9.9195, 78.1193, '+91-452-2341234', '+91-452-2341234', 'Mon-Sun: 6:00 AM - 10:00 PM', '["Vegetables", "Fruits", "Flowers", "Traditional Items"]'),
('Anna Nagar Market', 'Anna Nagar, Madurai, Tamil Nadu', 'Anna Nagar, Madurai, Tamil Nadu 625020', 9.9311, 78.121, '+91-452-2456789', '+91-452-2456789', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Groceries"]'),

-- Salem Markets
('Salem New Bus Stand Market', 'New Bus Stand, Salem, Tamil Nadu', 'New Bus Stand, Salem, Tamil Nadu 636001', 11.6643, 78.146, '+91-427-2441234', '+91-427-2441234', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Grains"]'),
('Salem Collectorate Market', 'Collectorate, Salem, Tamil Nadu', 'Collectorate, Salem, Tamil Nadu 636001', 11.6554, 78.1462, '+91-427-2455678', '+91-427-2455678', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Spices"]'),

-- Trichy Markets
('Trichy Central Bus Stand Market', 'Central Bus Stand, Tiruchirappalli, Tamil Nadu', 'Central Bus Stand, Tiruchirappalli, Tamil Nadu 620001', 10.8155, 78.7047, '+91-431-2414567', '+91-431-2414567', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Grains"]'),
('Rock Fort Market', 'Rock Fort, Tiruchirappalli, Tamil Nadu', 'Rock Fort, Tiruchirappalli, Tamil Nadu 620002', 10.8274, 78.6928, '+91-431-2425678', '+91-431-2425678', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Traditional Items"]'),

-- Tirunelveli Markets
('Tirunelveli Town Market', 'Town, Tirunelveli, Tamil Nadu', 'Town, Tirunelveli, Tamil Nadu 627001', 8.7139, 77.7567, '+91-462-2331234', '+91-462-2331234', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Grains", "Spices"]'),
('Palayamkottai Market', 'Palayamkottai, Tirunelveli, Tamil Nadu', 'Palayamkottai, Tirunelveli, Tamil Nadu 627002', 8.7226, 77.7279, '+91-462-2342345', '+91-462-2342345', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Fish"]'),

-- Erode Markets
('Erode Vegetable Market', 'Perundurai Road, Erode, Tamil Nadu', 'Perundurai Road, Erode, Tamil Nadu 638001', 11.3410, 77.7172, '+91-424-2255234', '+91-424-2255234', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Spices"]'),
('Surampatti Market', 'Surampatti, Erode, Tamil Nadu', 'Surampatti, Erode, Tamil Nadu 638009', 11.3293, 77.7085, '+91-424-2266345', '+91-424-2266345', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Grains"]'),

-- Vellore Markets
('Vellore Old Town Market', 'Old Town, Vellore, Tamil Nadu', 'Old Town, Vellore, Tamil Nadu 632001', 12.9165, 79.1325, '+91-416-2233567', '+91-416-2233567', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Grains"]'),
('Kosapet Market', 'Kosapet, Vellore, Tamil Nadu', 'Kosapet, Vellore, Tamil Nadu 632001', 12.9249, 79.1378, '+91-416-2244678', '+91-416-2244678', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Spices"]'),

-- Thanjavur Markets
('Thanjavur Big Temple Market', 'Big Temple, Thanjavur, Tamil Nadu', 'Big Temple, Thanjavur, Tamil Nadu 613001', 10.7870, 79.1378, '+91-4362-274890', '+91-4362-274890', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Traditional Items", "Flowers"]'),
('Hospital Road Market', 'Hospital Road, Thanjavur, Tamil Nadu', 'Hospital Road, Thanjavur, Tamil Nadu 613001', 10.7905, 79.1471, '+91-4362-285901', '+91-4362-285901', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Groceries"]'),

-- Additional important markets
('Kanyakumari Fish Market', 'Kanyakumari, Tamil Nadu', 'Kanyakumari, Tamil Nadu 629702', 8.0883, 77.5385, '+91-4652-246123', '+91-4652-246123', 'Mon-Sun: 5:00 AM - 7:00 PM', '["Fish", "Seafood", "Vegetables"]'),
('Nagercoil Kottar Market', 'Kottar, Nagercoil, Tamil Nadu', 'Kottar, Nagercoil, Tamil Nadu 629002', 8.1790, 77.4071, '+91-4652-257234', '+91-4652-257234', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Spices"]'),
('Dindigul Vegetable Market', 'Vegetable Market, Dindigul, Tamil Nadu', 'Vegetable Market, Dindigul, Tamil Nadu 624001', 10.3673, 77.9803, '+91-451-2424567', '+91-451-2424567', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Grains"]'),
('Karur Bus Stand Market', 'Bus Stand, Karur, Tamil Nadu', 'Bus Stand, Karur, Tamil Nadu 639001', 10.9601, 78.0766, '+91-4324-231234', '+91-4324-231234', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Textiles"]'),
('Ooty Municipal Market', 'Municipal Market, Ooty, Tamil Nadu', 'Municipal Market, Ooty, Tamil Nadu 643001', 11.4064, 76.6932, '+91-423-2443445', '+91-423-2443445', 'Mon-Sun: 7:00 AM - 7:00 PM', '["Vegetables", "Fruits", "Tea", "Spices"]'),
('Coonoor Market', 'Coonoor, Nilgiris, Tamil Nadu', 'Coonoor, Nilgiris, Tamil Nadu 643101', 11.3564, 76.7958, '+91-423-2454556', '+91-423-2454556', 'Mon-Sun: 7:00 AM - 7:00 PM', '["Vegetables", "Fruits", "Tea"]'),
('Hosur Market', 'Hosur, Krishnagiri, Tamil Nadu', 'Hosur, Krishnagiri, Tamil Nadu 635109', 12.7409, 77.8253, '+91-4344-576778', '+91-4344-576778', 'Mon-Sun: 6:00 AM - 8:00 PM', '["Vegetables", "Fruits", "Flowers"]');

SELECT COUNT(*) as total_markets_added FROM markets;
