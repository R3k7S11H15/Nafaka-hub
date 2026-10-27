-- Seed data for content tables (replaces hardcoded frontend arrays)
-- Only inserts if the table is empty (safe to re-run)

-- ============ SITE CATEGORIES ============
INSERT INTO site_categories (name, slug, description, image_url, sort_order)
SELECT * FROM (SELECT 'Rice' AS name, 'rice' AS slug, 'Premium rice varieties including Pishori, Super, and local types' AS description, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop' AS image_url, 1 AS sort_order) t
WHERE NOT EXISTS (SELECT 1 FROM site_categories WHERE slug='rice');
INSERT INTO site_categories (name, slug, description, image_url, sort_order)
SELECT * FROM (SELECT 'Maize' AS name, 'maize' AS slug, 'White and yellow maize for milling and consumption' AS description, 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop' AS image_url, 2 AS sort_order) t
WHERE NOT EXISTS (SELECT 1 FROM site_categories WHERE slug='maize');
INSERT INTO site_categories (name, slug, description, image_url, sort_order)
SELECT * FROM (SELECT 'Wheat' AS name, 'wheat' AS slug, 'Organic and conventional wheat varieties' AS description, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop' AS image_url, 3 AS sort_order) t
WHERE NOT EXISTS (SELECT 1 FROM site_categories WHERE slug='wheat');
INSERT INTO site_categories (name, slug, description, image_url, sort_order)
SELECT * FROM (SELECT 'Sorghum' AS name, 'sorghum' AS slug, 'Nutritious sorghum for flour and feed' AS description, 'https://images.unsplash.com/photo-1533935267725-10dfbc6c9193?w=400&h=300&fit=crop' AS image_url, 4 AS sort_order) t
WHERE NOT EXISTS (SELECT 1 FROM site_categories WHERE slug='sorghum');
INSERT INTO site_categories (name, slug, description, image_url, sort_order)
SELECT * FROM (SELECT 'Beans' AS name, 'beans' AS slug, 'Red beans, kidney beans, and more' AS description, 'https://images.unsplash.com/photo-1515543237350-a3eca2f194f2?w=400&h=300&fit=crop' AS image_url, 5 AS sort_order) t
WHERE NOT EXISTS (SELECT 1 FROM site_categories WHERE slug='beans');
INSERT INTO site_categories (name, slug, description, image_url, sort_order)
SELECT * FROM (SELECT 'Groundnuts' AS name, 'groundnuts' AS slug, 'Fresh groundnuts for oil and snacks' AS description, 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=400&h=300&fit=crop' AS image_url, 6 AS sort_order) t
WHERE NOT EXISTS (SELECT 1 FROM site_categories WHERE slug='groundnuts');
INSERT INTO site_categories (name, slug, description, image_url, sort_order)
SELECT * FROM (SELECT 'Millet' AS name, 'millet' AS slug, 'Drought-resistant millet for porridge and flour' AS description, 'https://images.unsplash.com/photo-1568157771786-0a5ad22c5591?w=400&h=300&fit=crop' AS image_url, 7 AS sort_order) t
WHERE NOT EXISTS (SELECT 1 FROM site_categories WHERE slug='millet');
INSERT INTO site_categories (name, slug, description, image_url, sort_order)
SELECT * FROM (SELECT 'Certified Seeds' AS name, 'seeds' AS slug, 'High-quality certified seeds for all major crops' AS description, 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&h=300&fit=crop' AS image_url, 8 AS sort_order) t
WHERE NOT EXISTS (SELECT 1 FROM site_categories WHERE slug='seeds');
INSERT INTO site_categories (name, slug, description, image_url, sort_order)
SELECT * FROM (SELECT 'Fertilizers' AS name, 'fertilizers' AS slug, 'Organic and chemical fertilizers for crop improvement' AS description, 'https://images.unsplash.com/photo-1592982537447-7440770faae9?w=400&h=300&fit=crop' AS image_url, 9 AS sort_order) t
WHERE NOT EXISTS (SELECT 1 FROM site_categories WHERE slug='fertilizers');
INSERT INTO site_categories (name, slug, description, image_url, sort_order)
SELECT * FROM (SELECT 'Farm Equipment' AS name, 'equipment' AS slug, 'Tractors, plows, harvesters, and farm tools' AS description, 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=400&h=300&fit=crop' AS image_url, 10 AS sort_order) t
WHERE NOT EXISTS (SELECT 1 FROM site_categories WHERE slug='equipment');

-- ============ SITE STATS (uses computed live values) ============
INSERT INTO site_stats (label, value, icon, sort_order) VALUES
  ('Happy Customers', '5,000+', 'Users', 1),
  ('Products', '500+', 'Package', 2),
  ('Verified Sellers', '200+', 'Shield', 3),
  ('Regions Covered', '26', 'MapPin', 4)
ON DUPLICATE KEY UPDATE label=VALUES(label);

-- ============ SITE SETTINGS ============
INSERT INTO site_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
  ('site_name', 'Nafaka Hub', 'string', 'Platform display name', 1),
  ('site_description', 'GrainMart Tanzania - Agricultural Marketplace', 'string', 'Meta description', 1),
  ('maintenance_mode', '0', 'boolean', 'Enable maintenance mode', 0),
  ('registration_open', '1', 'boolean', 'Allow new user registration', 1),
  ('commission_rate', '3.0', 'number', 'Default platform commission rate (%)', 0),
  ('currency', 'TZS', 'string', 'Display currency', 1),
  ('default_payment_method', 'mpesa', 'string', 'Default payment method', 0),
  ('max_order_items', '50', 'number', 'Maximum items per order', 0),
  ('support_email', 'support@nafakahub.co.tz', 'string', 'Support contact email', 0),
  ('support_phone', '+255 123 456 789', 'string', 'Support contact phone', 1)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- ============ TESTIMONIALS ============
INSERT INTO testimonials (name, role, location, text, avatar_initials, rating, sort_order) VALUES
('Mwamba John', 'Farmer', 'Morogoro', 'Nafaka Hub has transformed how I sell my rice. I get fair prices and reach buyers across Tanzania.', 'MJ', 5, 1),
('Sarah Kimaro', 'Trader', 'Dar es Salaam', 'The escrow payment system gives me confidence when buying in bulk. Quality products and reliable delivery.', 'SK', 5, 2),
('David Mushi', 'Company Owner', 'Mbeya', 'We source all our grain through Nafaka Hub now. The quality verification and tracking are excellent.', 'DM', 5, 3),
('Asha Mwakanyemba', 'Agronomist', 'Iringa', 'The market price data has helped my cooperative make better selling decisions. Highly recommended.', 'AM', 5, 4),
('Peter Massawe', 'Wholesaler', 'Arusha', 'Logistics integration saved us weeks of coordination. The platform is reliable and the team is responsive.', 'PM', 5, 5);

-- ============ PARTNERS ============
INSERT INTO partners (name, sort_order) VALUES
('Tanzania Agricultural Development Bank', 1),
('Tanzania Tea Board', 2),
('Tanzania Coffee Board', 3),
('SAGCOT Initiative', 4),
('IFAD Tanzania', 5),
('USAID Feed the Future', 6),
('Tanzania Bureau of Standards', 7),
('Ministry of Agriculture', 8)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============ FAQS ============
INSERT INTO faqs (question, answer, category, sort_order) VALUES
('How do I register as a seller on Nafaka Hub?', 'Click "Register", choose the "Seller" role, complete your profile, and verify your business details. Once approved, you can list products immediately.', 'general', 1),
('What payment methods are supported?', 'We support M-Pesa, Tigo Pesa, Airtel Money, bank transfer, and cash on delivery for verified buyers.', 'payments', 2),
('How does escrow protection work?', 'When you place an order, payment is held in escrow. Funds are only released to the seller after you confirm receipt and quality of goods.', 'payments', 3),
('What are the fees for selling on Nafaka Hub?', 'Sellers pay a 3% commission per sale. Subscription plans offer reduced rates starting from the Basic plan.', 'selling', 4),
('How is product quality verified?', 'Our quality inspection team checks moisture, grade, and packaging. Verified products display a quality badge.', 'quality', 5),
('Can I track my order in real time?', 'Yes. Active deliveries appear in your dashboard with live location updates and estimated arrival time.', 'shipping', 6),
('What regions do you deliver to?', 'We deliver across all 26 regions of mainland Tanzania plus Zanzibar. Remote areas may take 2 extra days.', 'shipping', 7),
('How do I become a verified seller?', 'Submit your business registration, TIN, and product samples. Verification takes 3-5 business days.', 'selling', 8);

-- ============ BLOG POSTS ============
INSERT INTO blog_posts (slug, title, excerpt, content, author, category, is_published, published_at) VALUES
('rice-prices-q3-2026', 'Rice Prices in Tanzania: Q3 2026 Outlook', 'A look at the factors driving rice prices across major markets this quarter.', 'Full market analysis covering Mbeya, Morogoro, and Iringa price movements, weather impacts, and supply chain factors. Subscribe to our weekly market report for updates.', 'Market Research Team', 'Market Reports', 1, NOW()),
('escrow-best-practices', 'How Escrow Protects Tanzanian Grain Traders', 'Why escrow is the safest way to transact large agricultural orders.', 'When trading in bulk, payment risk is real. This article explains how Nafaka Hub escrow works step-by-step, from order placement to fund release.', 'Operations Team', 'Trading Tips', 1, NOW()),
('storage-cost-savings', '5 Ways to Reduce Post-Harvest Losses', 'Practical storage tips that can save smallholders up to 30% of their harvest.', 'From hermetic bags to community warehouses, these interventions are proven to cut losses. Nafaka Hub connects you to certified storage providers in your region.', 'Agronomy Team', 'Farming', 1, NOW()),
('mobile-trading-boom', 'Mobile Grain Trading: A Trend on the Rise', 'How smartphones are reshaping agricultural commerce in rural Tanzania.', 'Over 60% of Nafaka Hub trades now originate on mobile. We look at the data, user stories, and what it means for the future of the sector.', 'Editorial', 'Industry News', 1, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- ============ JOBS ============
INSERT INTO jobs (title, department, location, type, description, requirements) VALUES
('Senior Backend Engineer', 'Engineering', 'Dar es Salaam (Hybrid)', 'full-time', 'Build the platform that powers Tanzania''s grain trade.', 'Node.js, MySQL, 4+ years experience.'),
('Market Research Analyst', 'Research', 'Dar es Salaam', 'full-time', 'Produce weekly market intelligence reports for our users.', 'Agricultural economics background, strong writing skills.'),
('Mobile Developer (React Native)', 'Engineering', 'Remote (TZ)', 'full-time', 'Extend our mobile app with new features and offline support.', 'React Native, 3+ years, published apps.'),
('Field Operations Coordinator', 'Operations', 'Mbeya', 'full-time', 'Onboard farmers and manage warehouse relationships.', '5+ years in agricultural extension, fluent Swahili.'),
('Customer Support Specialist', 'Support', 'Dar es Salaam', 'contract', 'Provide phone and chat support to buyers and sellers.', 'Fluent Swahili and English, customer-first attitude.');

-- ============ AUCTIONS ============
INSERT INTO auctions (title, description, product_id, starting_price, current_bid, quantity, unit, region, starts_at, ends_at, status) VALUES
('Bulk Pishori Rice - 5 tonnes', 'Premium Pishori rice from Mbeya, vacuum-sealed bags.', 1, 220000, 235000, 5000, 'kg', 'Mbeya', NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY), 'live'),
('Yellow Maize Lot - 10 tonnes', 'Grade A yellow maize, low moisture, ideal for milling.', 2, 290000, 305000, 10000, 'kg', 'Iringa', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), 'live'),
('Wheat Flour Premium - 2 tonnes', 'Stone-ground wheat flour, 50kg bags.', 6, 85000, 85000, 2000, 'kg', 'Arusha', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 10 DAY), 'scheduled'),
('Sorghum White - 3 tonnes', 'Clean white sorghum suitable for flour production.', 4, 120000, 132000, 3000, 'kg', 'Dodoma', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY), 'live');

-- ============ COOPERATIVES ============
INSERT INTO cooperatives (name, description, region, district, leader_id, member_count, founded_year) VALUES
('Mbeya Rice Growers Cooperative', 'A union of smallholder rice farmers in Mbeya region focused on Pishori and Super rice.', 'Mbeya', 'Mbeya City', 2, 145, 2018),
('Iringa Maize Farmers Society', 'Collective marketing and input sourcing for maize farmers in Iringa.', 'Iringa', 'Iringa Municipal', 3, 220, 2015),
('Morogoro Sorghum Producers', 'Sorghum growers specializing in drought-resistant varieties.', 'Morogoro', 'Mvomero', 4, 87, 2020),
('Dodoma Grain Cooperative', 'Mixed grain cooperative covering millet, sorghum, and beans.', 'Dodoma', 'Dodoma Urban', 5, 165, 2017);

INSERT IGNORE INTO cooperative_members (cooperative_id, customer_id, role) VALUES
(1, 1, 'chairman'), (1, 6, 'secretary'),
(2, 7, 'treasurer'), (2, 8, 'member'),
(3, 1, 'advisor'), (4, 1, 'chairman');

INSERT INTO cooperative_announcements (cooperative_id, author_id, title, body) VALUES
(1, 2, 'Q3 Harvest Planning Meeting', 'All members are invited to the Q3 planning meeting on the 15th at the cooperative office.'),
(1, 2, 'New Pishori Buyer Confirmed', 'A bulk buyer from Dar es Salaam has been confirmed for the next harvest.'),
(2, 3, 'Input Subsidy Application Open', 'Members can apply for the government input subsidy until month end.');

-- ============ LOAN PRODUCTS ============
INSERT INTO loan_products (name, description, provider, interest_rate, max_amount, min_amount, term_months, requirements) VALUES
('Harvest Advance Loan', 'Short-term loan against expected harvest, disbursed at planting time.', 'Nafaka Hub Partner Bank', 12.0, 5000000, 100000, 6, 'Active seller account, 1 harvest history.'),
('Cooperative Input Loan', 'Group lending for input purchase, distributed to cooperative members.', 'TADB', 8.5, 50000000, 1000000, 12, 'Registered cooperative with audited books.'),
('Truck Acquisition Loan', 'Financing for transport providers to acquire new vehicles.', 'CRDB Bank', 15.0, 100000000, 10000000, 48, 'Registered transport business, 2 years financials.'),
('Working Capital Loan', 'Flexible working capital for active sellers with proven sales history.', 'NMB Bank', 14.0, 20000000, 500000, 12, 'Verified seller, 3 months sales history.');

-- ============ INSURANCE POLICIES ============
INSERT INTO insurance_policies (name, description, provider, premium_rate, coverage_amount, crop_types) VALUES
('Drought Cover Basic', 'Compensation for crop failure due to prolonged drought.', 'Tanzania Insurance Regulatory Authority Partners', 5.0, 5000000, 'Maize,Sorghum,Millet'),
('Flood Protection Plus', 'Coverage against excess rainfall and flooding damage.', 'NIC Tanzania', 6.5, 10000000, 'Rice,Maize'),
('Pest & Disease Shield', 'Covers losses from common pests and crop diseases.', 'Alliance Insurance', 4.5, 3000000, 'All crops'),
('Multi-Peril Cover', 'Comprehensive cover against drought, flood, pests, and market price drops.', 'Jubilee Insurance', 8.0, 20000000, 'Maize,Rice,Wheat');

-- ============ CONTRACTS (sample forward contracts) ============
INSERT INTO contracts (title, description, buyer_id, seller_id, product_id, quantity, unit, price_per_unit, delivery_date, status) VALUES
('Mbeya Rice Forward Contract', 'Forward sale of Pishori rice to a Dar wholesaler.', 2, 6, 1, 2000, 'kg', 4600, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'active'),
('Iringa Maize Bulk Order', 'Bulk maize contract for school feeding program.', 3, 7, 2, 5000, 'kg', 3100, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'pending'),
('Sorghum Export Lot', 'Sorghum destined for Kenya export market.', 4, 8, 4, 1500, 'kg', 1800, DATE_ADD(CURDATE(), INTERVAL 20 DAY), 'active');

-- ============ SUSTAINABILITY ============
INSERT INTO sustainability_practices (slug, name, description, impact) VALUES
('organic', 'Organic Farming', 'No synthetic pesticides or fertilizers.', 'Reduces chemical runoff and improves soil health.'),
('rotation', 'Crop Rotation', 'Alternating crop families each season.', 'Breaks pest cycles and replenishes soil nutrients.'),
('water', 'Water Conservation', 'Drip irrigation and rainwater harvesting.', 'Cuts water use by up to 60%.'),
('tree', 'Agroforestry', 'Integrating trees into crop land.', 'Sequesters carbon and provides shade.'),
('compost', 'Composting', 'Turning farm waste into natural fertilizer.', 'Replaces chemical fertilizers and recycles nutrients.'),
('ipm', 'Integrated Pest Management', 'Biological and cultural pest control.', 'Reduces pesticide use by 40-60%.');

INSERT INTO certifications (name, issuing_body, description) VALUES
('Organic Tanzania', 'Tanzania Organic Agriculture Movement (TOAM)', 'Certified organic production for domestic and export markets.'),
('Fair Trade', 'Fairtrade Africa', 'Fair pricing and labour conditions for smallholders.'),
('GlobalGAP', 'GLOBALG.A.P.', 'Good agricultural practices recognized in 80+ countries.'),
('Kilimo Hai', 'Ministry of Agriculture', 'National sustainable agriculture standard.');

INSERT INTO carbon_projects (name, description, region, co2_offset_tons, status, start_date, end_date) VALUES
('Mbeya Soil Carbon Pilot', 'Soil carbon sequestration across 500 hectares of smallholder farms.', 'Mbeya', 1200, 'active', '2025-01-15', '2028-01-15'),
('Coastal Mangrove Restoration', 'Replanting mangroves along the Rufiji delta.', 'Pwani', 8500, 'active', '2024-06-01', '2029-06-01'),
('Iringa Cookstove Program', 'Distribution of efficient cookstoves to reduce firewood use.', 'Iringa', 450, 'active', '2025-09-01', '2027-09-01');

-- ============ WEATHER DATA ============
INSERT INTO weather_data (region, district, temperature, humidity, rainfall_mm, conditions, forecast_date) VALUES
('Mbeya', 'Mbeya City', 22.5, 65, 2.4, 'Partly Cloudy', CURDATE()),
('Morogoro', 'Mvomero', 28.1, 78, 6.2, 'Light Rain', CURDATE()),
('Iringa', 'Iringa Municipal', 21.3, 60, 0.8, 'Sunny', CURDATE()),
('Dodoma', 'Dodoma Urban', 29.7, 55, 0.0, 'Hot & Dry', CURDATE()),
('Arusha', 'Arusha City', 19.8, 70, 4.1, 'Cloudy', CURDATE()),
('Mwanza', 'Mwanza City', 25.4, 72, 8.5, 'Thunderstorms', CURDATE()),
('Dar es Salaam', 'Kinondoni', 30.2, 82, 12.1, 'Heavy Rain', CURDATE()),
('Tanga', 'Tanga City', 28.9, 80, 7.0, 'Light Rain', CURDATE());

INSERT INTO weather_alerts (region, alert_type, severity, message, starts_at, ends_at) VALUES
('Mwanza', 'Flood Watch', 'high', 'Heavy rainfall expected over the next 48 hours. Farmers in low-lying areas should prepare.', NOW(), DATE_ADD(NOW(), INTERVAL 2 DAY)),
('Dar es Salaam', 'Heavy Rain', 'medium', 'Localized flooding possible. Plan harvests and transport accordingly.', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY)),
('Dodoma', 'Drought Watch', 'medium', 'Below-average rainfall forecast for the next 3 weeks. Consider drought-resistant varieties.', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY));

INSERT INTO planting_calendar (region, crop, planting_month, harvest_month, notes) VALUES
('Mbeya', 'Rice', 'November', 'April', 'Main season planting aligned with rainy season.'),
('Iringa', 'Maize', 'October', 'March', 'Plant after first substantial rains.'),
('Morogoro', 'Sorghum', 'November', 'April', 'Drought-tolerant variety recommended.'),
('Mwanza', 'Rice', 'December', 'May', 'Lake region planting.'),
('Dodoma', 'Millet', 'December', 'May', 'Drought-resistant crop for central region.'),
('Arusha', 'Wheat', 'March', 'August', 'Cooler highland planting.');

-- ============ LOYALTY ============
INSERT INTO loyalty_levels (name, min_points, cashback_rate, benefits, sort_order) VALUES
('Bronze', 0, 1.0, '1% cashback on all purchases, birthday discount.', 1),
('Silver', 1000, 2.0, '2% cashback, priority support, free delivery on orders > TZS 50,000.', 2),
('Gold', 5000, 3.5, '3.5% cashback, dedicated account manager, early access to auctions.', 3),
('Platinum', 15000, 5.0, '5% cashback, free logistics on bulk orders, premium concierge.', 4);

INSERT INTO rewards (name, description, points_cost) VALUES
('TZS 5,000 Voucher', 'Redeem for shopping on the platform.', 500),
('Free Delivery Coupon', 'Free delivery on your next order.', 300),
('Premium Membership Trial', '30 days of premium seller benefits.', 2000),
('TZS 25,000 Voucher', 'Larger voucher for high-value redemptions.', 2500);

-- ============ ADMIN / OPS (sample) ============
INSERT INTO vendor_applications (customer_id, business_name, business_type, region, tin_number, status, notes) VALUES
(8, 'Greenfield Grains Ltd', 'Wholesaler', 'Mbeya', '100-200-300', 'pending', 'Submitted business registration and TIN.'),
(1, 'Sunrise Agro', 'Cooperative', 'Iringa', '100-200-301', 'approved', 'Verified and active.');

INSERT INTO support_tickets (customer_id, subject, message, status, priority) VALUES
(8, 'Order not received', 'My order ORD-123456 was marked delivered but I never received it.', 'open', 'high'),
(7, 'Cannot update product', 'Getting 500 error when trying to update my product price.', 'in_progress', 'medium');

INSERT INTO transport_routes (name, origin_region, destination_region, distance_km, estimated_time_hrs, base_price, is_active) VALUES
('Dar - Dodoma', 'Dar es Salaam', 'Dodoma', 450, 6.5, 350000, 1),
('Dar - Mbeya', 'Dar es Salaam', 'Mbeya', 830, 11.0, 650000, 1),
('Mwanza - Dar', 'Mwanza', 'Dar es Salaam', 1130, 14.5, 850000, 1),
('Arusha - Mwanza', 'Arusha', 'Mwanza', 620, 9.0, 480000, 1),
('Mbeya - Iringa', 'Mbeya', 'Iringa', 320, 4.5, 250000, 1);

INSERT INTO drivers (name, phone, license_number, region) VALUES
('John Mwakasege', '+255700000001', 'TZ-DL-100001', 'Dar es Salaam'),
('Grace Mtui', '+255700000002', 'TZ-DL-100002', 'Mbeya'),
('Hassan Juma', '+255700000003', 'TZ-DL-100003', 'Mwanza'),
('Salma Rashid', '+255700000004', 'TZ-DL-100004', 'Arusha');

INSERT INTO advertisements (title, image_url, target_url, placement, is_active) VALUES
('Premium Seller Plan', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=300&fit=crop', '/subscription-plans', 'homepage', 1),
('Harvest Loans Available', 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800&h=300&fit=crop', '/credit-financing', 'homepage', 1),
('Download the Mobile App', 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=300&fit=crop', '/mobile', 'sidebar', 1);

INSERT INTO saved_addresses (customer_id, label, region, district, street, is_default) VALUES
(8, 'Home', 'Dar es Salaam', 'Kinondoni', 'Bagamoyo Road, House 12', 1),
(7, 'Office', 'Mbeya', 'Mbeya City', 'Sokoine Drive, Plot 45', 0);

INSERT INTO payment_methods (customer_id, type, provider, account_label, account_number_masked, is_default) VALUES
(8, 'mobile_money', 'M-Pesa', 'Personal', '+2557*****001', 1),
(7, 'bank', 'CRDB', 'Business Account', '****1234', 0);

INSERT INTO inventory (warehouse_id, product_id, quantity, unit, min_threshold)
SELECT 1, id, FLOOR(50 + RAND()*200), weight, 20 FROM products WHERE id <= 8
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);

INSERT INTO inward_outward (type, warehouse_id, product_id, quantity, reference, notes)
SELECT 'inward', 1, id, FLOOR(50 + RAND()*150), CONCAT('PO-', id), 'Stock replenishment' FROM products WHERE id <= 5;
