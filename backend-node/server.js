const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const realtime = require('./services/realtime');
const fulfillmentAllocation = require('./services/fulfillmentAllocation');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nafaka-hub-secret-key-change-in-production';

const configuredOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map(o => o.trim()).filter(Boolean);
const allowLocalNetwork = process.env.CORS_ALLOW_LOCAL_NETWORK === 'true' || (process.env.NODE_ENV === 'development' && process.env.CORS_ALLOW_LOCAL_NETWORK !== 'false');

function isPrivateIPv4(hostname) {
    const parts = hostname.split('.').map(Number);
    if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    return parts[0] === 10
        || (parts[0] === 192 && parts[1] === 168)
        || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
        || (parts[0] === 169 && parts[1] === 254);
}

function isAllowedOrigin(origin) {
    if (!origin || configuredOrigins.includes(origin)) return true;
    if (!allowLocalNetwork) return false;

    try {
        const url = new URL(origin);
        if (!['http:', 'https:'].includes(url.protocol)) return false;
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1') return true;
        return isPrivateIPv4(url.hostname);
    } catch {
        return false;
    }
}

const corsOptions = {
    origin: function (origin, callback) {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    optionsSuccessStatus: 200,
};

const { generateCSRFToken, csrfProtection } = require('./middleware/csrf');
const { rateLimit, aiRateLimit } = require('./middleware/rateLimit');
const { requireAuth, extractAuthUser } = require('./middleware/auth');
const { requireRole } = require('./middleware/roleCheck');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { validateRequired, validateEmail, validatePhone, validateAmount, validatePositiveInt, sanitizeString } = require('./middleware/validation');
const chatModeration = require('./services/chatModerationService');

// Middleware
app.use(cors(corsOptions));
// Capture raw body for webhook signature verification (NTZS, etc.)
app.use(express.json({
  verify: (req, res, buf, type) => {
    if (req.originalUrl && (req.originalUrl.includes('/webhook/ntzs') || req.originalUrl.includes('/webhooks/ntzs'))) {
      req.rawBody = buf
    }
  }
}));

// Static file serving for uploaded images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Multer configuration for product image uploads
const productImageStorage = multer.diskStorage({
  destination: path.join(__dirname, 'public/images/products'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});
const uploadProductImage = multer({
  storage: productImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Invalid image format. Only JPG, PNG, GIF, WEBP allowed.'), false);
  }
});

// Multer configuration for message image attachments
const messageImageStorage = multer.diskStorage({
  destination: path.join(__dirname, 'public/images/messages'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'msg-' + uniqueSuffix + ext);
  }
});
const uploadMessageImage = multer({
  storage: messageImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Invalid image format. Only JPG, PNG, GIF, WEBP allowed.'), false);
  }
});

// Bypass rate limiting for SSE / long-lived connection endpoints
app.use('/api/notifications_realtime.php', (req, res, next) => next());
app.use('/api/cart_realtime.php', (req, res, next) => next());
app.use('/api/bulk_procurement_realtime.php', (req, res, next) => next());

app.use(rateLimit(60000, 500));

const adminRateLimit = rateLimit(60000, 100);
app.use('/api/superadmin', (req, res, next) => {
  if (req.path === '/realtime' || req.path === '/realtime-metrics' || req.path === '/notifications_realtime.php' || req.path === '/cart_realtime.php' || req.path === '/stats') {
    return next();
  }
  return adminRateLimit(req, res, next);
});
app.use('/api/content/admin', adminRateLimit);
app.use('/api/templates', adminRateLimit);

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'jumla_rice_trading',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Make pool available to routes
app.locals.db = pool;

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 as ok');
        res.json({ success: true, message: 'API is running', database: 'connected' });
} catch (err) { next(err) }
  });

// ============ AUTHENTICATION ============

// Handle all GET /api/auth.php requests (CSRF token, get profile)
app.get('/api/auth.php', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    if (req.query.get_csrf_token) {
        const csrfToken = generateCSRFToken();
        return res.json({ success: true, csrf_token: csrfToken });
    }

    if (req.query.action === 'get_profile') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.json({ success: false, message: 'No token provided' });
        }
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            const [customers] = await pool.query(
                'SELECT id, full_name, email, phone, role, shipping_address, is_verified, created_at, nida_number FROM customers WHERE id = ?',
                [decoded.customerId]
            );
            if (customers.length === 0) {
                return res.json({ success: false, message: 'User not found' });
            }
            return res.json({ success: true, profile: {
                id: customers[0].id,
                name: customers[0].full_name,
                email: customers[0].email,
                phone: customers[0].phone,
                role: customers[0].role,
                shipping_address: customers[0].shipping_address,
                is_verified: customers[0].is_verified,
                created_at: customers[0].created_at,
                nida_number: customers[0].nida_number
            }});
        } catch (err) {
            return res.json({ success: false, message: 'Invalid token' });
        }
    }

    return res.json({ success: false, message: 'Invalid request' });
});

// Login
app.post('/api/auth.php', csrfProtection, validateRequired(['action']), async (req, res, next) => {
    try {
        const { action } = req.body;

        if (action === 'login') {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.json({ success: false, message: 'Email and password are required' });
            }

            const [customers] = await pool.query(
                'SELECT * FROM customers WHERE email = ? OR phone = ?',
                [email, email]
            );

            if (customers.length === 0) {
                return res.json({ success: false, message: 'Invalid email or password' });
            }

            const customer = customers[0];

            if (!customer.is_active) {
                return res.json({ success: false, message: 'Account is deactivated. Contact support.' });
            }

            const isPasswordValid = await bcrypt.compare(password, customer.password_hash);
            if (!isPasswordValid) {
                return res.json({ success: false, message: 'Invalid email or password' });
            }

            const token = jwt.sign(
                { customerId: customer.id, role: customer.role },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Store session
            await pool.query(
                'INSERT INTO user_sessions (customer_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
                [customer.id, token, req.ip, req.headers['user-agent'] || '']
            );

            // Store token in localStorage for frontend
            res.json({
                success: true,
                message: 'Login successful',
                token,
                customer: {
                    id: customer.id,
                    full_name: customer.full_name,
                    email: customer.email,
                    phone: customer.phone,
                    role: customer.role,
                    shipping_address: customer.shipping_address,
                    business_name: customer.business_name,
                    is_verified: customer.is_verified,
                    nida_number: customer.nida_number
                }
            });
        } else if (action === 'logout') {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                await pool.query('DELETE FROM user_sessions WHERE token = ?', [token]);
            }
            res.json({ success: true, message: 'Logged out successfully' });
        } else if (action === 'update_profile') {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.json({ success: false, message: 'Unauthorized' });
            }
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            const { full_name, phone, shipping_address, nida_number: nidaNumber } = req.body;
            await pool.query(
                'UPDATE customers SET full_name = ?, phone = ?, shipping_address = ?, nida_number = ? WHERE id = ?',
                [full_name, phone, shipping_address, nidaNumber || null, decoded.customerId]
            );
            res.json({ success: true, message: 'Profile updated' });
        } else if (action === 'change_password') {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.json({ success: false, message: 'Unauthorized' });
            }
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            const { current_password, new_password } = req.body;
            if (!current_password || !new_password) {
                return res.json({ success: false, message: 'Current password and new password are required' });
            }
            if (new_password.length < 8) {
                return res.json({ success: false, message: 'New password must be at least 8 characters' });
            }
            const [customers] = await pool.query('SELECT password_hash FROM customers WHERE id = ?', [decoded.customerId]);
            if (customers.length === 0) {
                return res.json({ success: false, message: 'User not found' });
            }
            const isPasswordValid = await bcrypt.compare(current_password, customers[0].password_hash);
            if (!isPasswordValid) {
                return res.json({ success: false, message: 'Current password is incorrect' });
            }
            const newHash = await bcrypt.hash(new_password, 10);
            await pool.query('UPDATE customers SET password_hash = ? WHERE id = ?', [newHash, decoded.customerId]);
            res.json({ success: true, message: 'Password changed successfully' });
        } else {
            res.json({ success: false, message: 'Invalid action' });
        }
} catch (err) { next(err) }
  });

// ============ REGISTRATION ============

// Get CSRF token for registration
app.get('/api/register.php', async (req, res) => {
    if (req.query.get_csrf_token) {
         const csrfToken = generateCSRFToken();
        res.json({ success: true, csrf_token: csrfToken });
        return;
    }
    res.json({ success: false, message: 'Invalid request' });
});

// Register
app.post('/api/register.php', csrfProtection, validateRequired(['action']), async (req, res, next) => {
    try {
        const { action } = req.body;

        if (action === 'register') {
            const { full_name, phone, email, shipping_address, password, role, company_name, contact_person, business_registration_number, tin_number, coverage_areas, vehicle_types, base_rate_per_km, commission_rate, reference_contacts, warehouse_name, location, region, capacity_tonnes, storage_types, rate_per_tonne_day, insurance_info, nida_number: nidaNumber } = req.body;

            if (!full_name || !phone || !password) {
                return res.json({ success: false, message: 'Full name, phone, and password are required' });
            }

            const [existing] = await pool.query(
                'SELECT id FROM customers WHERE phone = ? OR email = ?',
                [phone, email || '']
            );

            if (existing.length > 0) {
                return res.json({ success: false, message: 'Phone number or email already registered' });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            const userRole = ['seller', 'logistics_company', 'warehouse'].includes(role) ? role : 'customer';
            const isVerified = ['customer', 'seller'].includes(userRole) ? 1 : 0;
            const businessName = userRole === 'logistics_company' ? company_name : (userRole === 'warehouse' ? warehouse_name : null);
            const businessType = userRole === 'logistics_company' ? 'Logistics Company' : (userRole === 'warehouse' ? 'Warehouse' : null);

            const [result] = await pool.query(
                'INSERT INTO customers (full_name, email, phone, password_hash, shipping_address, role, is_verified, business_name, business_type, tin_number, nida_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [full_name, email || null, phone, passwordHash, shipping_address || null, userRole, isVerified, businessName, businessType, tin_number || null, nidaNumber || null]
            );

            const token = jwt.sign(
                { customerId: result.insertId, role: userRole },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            await pool.query(
                'INSERT INTO user_sessions (customer_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
                [result.insertId, token, req.ip, req.headers['user-agent'] || '']
            );

            let applicationId = null;
            let message = 'Registration successful';

            if (userRole === 'logistics_company') {
                if (!company_name) {
                    return res.json({ success: false, message: 'Company name is required for logistics registration' });
                }
                const [appResult] = await pool.query(
                    `INSERT INTO logistics_applications (customer_id, company_name, contact_person, phone, email, business_registration_number, tin_number, coverage_areas, vehicle_types, base_rate_per_km, commission_rate, reference_contacts)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [result.insertId, company_name, contact_person || full_name, phone, email || null, business_registration_number || null, tin_number || null, coverage_areas || null, vehicle_types || null, base_rate_per_km || null, commission_rate || 10.0, reference_contacts || null]
                );
                applicationId = appResult.insertId;
                message = 'Application submitted for review. You can log in but your account will be pending approval.';
            }

            if (userRole === 'warehouse') {
                if (!warehouse_name) {
                    return res.json({ success: false, message: 'Warehouse name is required for warehouse registration' });
                }
                const [appResult] = await pool.query(
                    `INSERT INTO warehouse_applications (customer_id, warehouse_name, contact_person, phone, email, location, region, business_registration_number, tin_number, capacity_tonnes, storage_types, rate_per_tonne_day, insurance_info, reference_contacts)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [result.insertId, warehouse_name, contact_person || full_name, phone, email || null, location || null, region || null, business_registration_number || null, tin_number || null, capacity_tonnes || null, storage_types || null, rate_per_tonne_day || null, insurance_info || null, reference_contacts || null]
                );
                applicationId = appResult.insertId;
                message = 'Application submitted for review. You can log in but your account will be pending approval.';
            }

            res.json({
                success: true,
                message,
                token,
                pending_approval: !isVerified,
                application_id: applicationId,
                customer: {
                    id: result.insertId,
                    full_name,
                    email: email || null,
                    phone,
                    role: userRole,
                    shipping_address: shipping_address || null,
                    is_verified: !!isVerified,
                    nida_number: nidaNumber || null
                }
            });

        } else {
            res.json({ success: false, message: 'Invalid action' });
        }
} catch (err) { next(err) }
  });

// ============ PRODUCTS ============
app.get('/api/products.php', async (req, res) => {
    try {
        const { action, id, type, weight, search, limit } = req.query;

        if (action === 'categories') {
            const [rows] = await pool.query('SELECT DISTINCT type FROM products WHERE is_active = 1 ORDER BY type');
            return res.json({ success: true, categories: rows.map(r => r.type) });
        }

        if (action === 'stats') {
            const [[totalProducts]] = await pool.query('SELECT COUNT(*) as total FROM products WHERE is_active = 1');
            const [[totalOrders]] = await pool.query('SELECT COUNT(*) as total FROM orders');
            const [[pendingOrders]] = await pool.query("SELECT COUNT(*) as total FROM orders WHERE status = 'pending'");
            const [[totalCustomers]] = await pool.query('SELECT COUNT(*) as total FROM customers');
            const [[revenue]] = await pool.query("SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE status != 'cancelled'");
            return res.json({
                success: true,
                stats: {
                    total_products: totalProducts.total,
                    total_orders: totalOrders.total,
                    pending_orders: pendingOrders.total,
                    total_customers: totalCustomers.total,
                    revenue: revenue.revenue
                }
            });
        }

        if (action === 'get_wishlist') {
            const { user_id } = req.query;
            if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required' });
            const [rows] = await pool.query(
                `SELECT p.*, w.created_at as added_at
                 FROM wishlist w JOIN products p ON w.product_id = p.id
                 WHERE w.customer_id = ? ORDER BY w.created_at DESC`,
                [user_id]
            );
            return res.json({ success: true, wishlist: rows });
        }

        if (id) {
            const [products] = await pool.query(
                `SELECT p.*, AVG(r.rating) as average_rating, COUNT(r.id) as review_count
                 FROM products p LEFT JOIN reviews r ON p.id = r.product_id
                 WHERE p.id = ? AND p.is_active = 1 GROUP BY p.id`,
                [id]
            );
            if (products.length === 0) {
                return res.json({ success: false, message: 'Product not found' });
            }
            const [reviews] = await pool.query(
                `SELECT r.*, c.full_name FROM reviews r
                 JOIN customers c ON r.customer_id = c.id
                 WHERE r.product_id = ? ORDER BY r.created_at DESC`,
                [id]
            );
            products[0].reviews = reviews;
            return res.json({ success: true, product: products[0] });
        }

        let sql = `SELECT p.*, AVG(r.rating) as average_rating, COUNT(r.id) as review_count
                   FROM products p LEFT JOIN reviews r ON p.id = r.product_id WHERE p.is_active = 1`;
        const params = [];

        if (type && type !== 'all') {
            sql += ' AND p.type = ?';
            params.push(type);
        }
        if (weight && weight !== 'all') {
            sql += ' AND p.weight = ?';
            params.push(weight);
        }
        if (search) {
            sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

        if (limit && !isNaN(limit)) {
            sql += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const [products] = await pool.query(sql, params);
        res.json({ success: true, products });
} catch (err) { next(err) }
  });

// ============ PRODUCT CREATION (with image upload) ============
app.post('/api/products/create', uploadProductImage.array('images', 10), csrfProtection, async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        // Only sellers and admins can create products
        if (!['seller', 'superadmin', 'vendor_admin', 'marketplace_admin'].includes(auth.role)) {
            return res.status(403).json({ success: false, message: 'Only sellers can list products' });
        }

        const body = req.body;
        const {
            name,
            description = '',
            category = 'Rice',
            price,
            price_per_kg,
            quantity = '0',
            unit = 'kg',
            weight = '',
            warehouse = '',
            delivery_time = '1-2 days',
            quality_grade = 'A',
            moisture_level = '',
            region = 'Dar es Salaam',
        } = body;

        const productPrice = price || price_per_kg;
        if (!name || !productPrice) {
            return res.status(400).json({ success: false, message: 'Product name and price are required' });
        }

        // Build image URLs from uploaded files
        const imageUrls = (req.files || []).map(f => `products/${f.filename}`);
        const primaryImage = imageUrls[0] || null;

        const [result] = await pool.query(
            'INSERT INTO products (name, description, type, price, image_url, stock_quantity, unit, weight, seller_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [name, description, category, Number(productPrice), primaryImage, Number(quantity) || 0, unit, weight, auth.customerId]
        );

        // Store additional seller metadata
        if (warehouse || delivery_time || quality_grade || moisture_level || region) {
            await pool.query(
                'INSERT INTO product_seller_metadata (product_id, warehouse, delivery_time, quality_grade, moisture_level, region) VALUES (?, ?, ?, ?, ?, ?)',
                [result.insertId, warehouse, delivery_time, quality_grade, moisture_level, region]
            ).catch(() => {}); // Metadata table may not exist — non-critical
        }

        res.json({
            success: true,
            message: 'Product listed successfully',
            product_id: result.insertId,
            images: imageUrls,
            image_url: primaryImage,
        });
    } catch (err) {
        next(err);
    }
});

// ============ PRODUCT WISHLIST ============
app.post('/api/products.php', csrfProtection, validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { action, product_id, user_id } = req.body;
        const customerId = user_id || auth.customerId;

        if (action === 'add_to_wishlist' && product_id) {
            try {
                await pool.query('INSERT INTO wishlist (customer_id, product_id, created_at) VALUES (?, ?, NOW())', [customerId, product_id]);
                return res.json({ success: true, message: 'Added to wishlist' });
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.json({ success: false, message: 'Already in wishlist' });
                }
                throw err;
            }
        }

        if (action === 'remove_from_wishlist' && product_id) {
            await pool.query('DELETE FROM wishlist WHERE customer_id = ? AND product_id = ?', [customerId, product_id]);
            return res.json({ success: true, message: 'Removed from wishlist' });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ SUBSCRIPTION PLANS ============
app.get('/api/subscriptions.php', async (req, res) => {
    try {
        const { action, slug, customer_id } = req.query;

        if (action === 'plans') {
            const [plans] = await pool.query('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price_monthly ASC');
            return res.json({ success: true, plans });
        }

        if (action === 'plan' && slug) {
            const [plans] = await pool.query('SELECT * FROM subscription_plans WHERE slug = ?', [slug]);
            return res.json({ success: true, plan: plans[0] || null });
        }

        if (action === 'my_subscription' && customer_id) {
            const [profiles] = await pool.query(
                `SELECT vp.*, sp.name as plan_name, sp.slug as plan_slug, sp.has_analytics, sp.has_featured_badge, sp.has_priority_support, sp.has_api_access, sp.has_bulk_upload
                 FROM vendor_profiles vp LEFT JOIN subscription_plans sp ON vp.subscription_tier = sp.slug
                 WHERE vp.customer_id = ?`,
                [customer_id]
            );
            const [payments] = await pool.query(
                'SELECT * FROM subscription_payments WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5',
                [customer_id]
            );
            return res.json({ success: true, profile: profiles[0] || null, payments });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

app.post('/api/subscriptions.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const { action } = req.body;

        if (action === 'subscribe') {
            const { customer_id, plan_slug, period, payment_method } = req.body;

            const [plans] = await pool.query('SELECT * FROM subscription_plans WHERE slug = ?', [plan_slug]);
            if (plans.length === 0) {
                return res.json({ success: false, message: 'Plan not found' });
            }
            const plan = plans[0];
            const amount = period === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const periodStart = new Date().toISOString().split('T')[0];
            const periodEnd = new Date(Date.now() + (period === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const commissionRate = 3.0 - parseFloat(plan.commission_discount);

            // Insert payment
            const [result] = await pool.query(
                `INSERT INTO subscription_payments (customer_id, plan_id, amount, payment_method, payment_status, period_start, period_end)
                 VALUES (?, ?, ?, ?, 'completed', ?, ?)`,
                [customer_id, plan.id, amount, payment_method || 'mpesa', periodStart, periodEnd]
            );

            // Upsert vendor profile
            await pool.query(
                `INSERT INTO vendor_profiles (customer_id, subscription_tier, subscription_start, subscription_end, product_upload_limit, commission_rate)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE subscription_tier = ?, subscription_start = ?, subscription_end = ?, product_upload_limit = ?, commission_rate = ?`,
                [customer_id, plan_slug, periodStart, periodEnd, plan.product_upload_limit, commissionRate,
                 plan_slug, periodStart, periodEnd, plan.product_upload_limit, commissionRate]
            );

            // Record revenue
            await pool.query(
                `INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, customer_id, description, recorded_date)
                 VALUES ('subscription', ?, 'subscription_payment', ?, ?, ?, CURDATE())`,
                [result.insertId, amount, customer_id, `Subscription: ${plan.name} (${period})`]
            );

            return res.json({
                success: true,
                message: 'Subscription activated',
                payment_id: result.insertId,
                plan: plan.name,
                amount,
                period_end: periodEnd
            });
        }

        if (action === 'update_vendor_profile') {
            const { customer_id, business_name, business_type, tin_number } = req.body;
            await pool.query(
                `INSERT INTO vendor_profiles (customer_id, business_name, business_type, tin_number)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE business_name = ?, business_type = ?, tin_number = ?`,
                [customer_id, business_name, business_type, tin_number, business_name, business_type, tin_number]
            );
            return res.json({ success: true, message: 'Profile updated' });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ COMMISSIONS ============
app.get('/api/commissions.php', async (req, res) => {
    try {
        const { action, seller_id, status } = req.query;

        if (action === 'list') {
            let sql = `SELECT pc.*, o.order_number, c.full_name as seller_name
                       FROM platform_commissions pc
                       JOIN orders o ON pc.order_id = o.id
                       JOIN customers c ON pc.seller_id = c.id WHERE 1=1`;
            const params = [];
            if (seller_id) { sql += ' AND pc.seller_id = ?'; params.push(seller_id); }
            if (status) { sql += ' AND pc.status = ?'; params.push(status); }
            sql += ' ORDER BY pc.created_at DESC';
            const [commissions] = await pool.query(sql, params);
            return res.json({ success: true, commissions });
        }

        if (action === 'seller_summary' && seller_id) {
            const [[summary]] = await pool.query(
                `SELECT COUNT(*) as total_sales, COALESCE(SUM(order_total), 0) as total_revenue,
                        COALESCE(SUM(commission_amount), 0) as total_commission,
                        COALESCE(AVG(commission_rate), 0) as avg_rate
                 FROM platform_commissions WHERE seller_id = ? AND status = 'paid'`,
                [seller_id]
            );
            const [[pending]] = await pool.query(
                'SELECT COALESCE(SUM(commission_amount), 0) as pending_amount FROM platform_commissions WHERE seller_id = ? AND status = "pending"',
                [seller_id]
            );
            return res.json({ success: true, summary, pending: pending.pending_amount });
        }

        if (action === 'platform_overview') {
            const [[overall]] = await pool.query(
                `SELECT COUNT(*) as total_commissions, COALESCE(SUM(commission_amount), 0) as total_revenue,
                        COALESCE(AVG(commission_rate), 0) as avg_rate FROM platform_commissions WHERE status = 'paid'`
            );
            const [[pending]] = await pool.query(
                'SELECT COALESCE(SUM(commission_amount), 0) as pending_revenue FROM platform_commissions WHERE status = "pending"'
            );
            const [byType] = await pool.query(
                `SELECT commission_type, COUNT(*) as count, SUM(commission_amount) as total
                 FROM platform_commissions WHERE status = 'paid' GROUP BY commission_type`
            );
            return res.json({ success: true, overall, pending, by_type: byType });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

app.post('/api/commissions.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const { action } = req.body;

        if (action === 'calculate') {
            const { order_id, seller_id } = req.body;
            const [vendors] = await pool.query('SELECT commission_rate FROM vendor_profiles WHERE customer_id = ?', [seller_id]);
            const commissionRate = vendors.length > 0 ? parseFloat(vendors[0].commission_rate) : 3.0;
            const [orders] = await pool.query('SELECT total_amount FROM orders WHERE id = ?', [order_id]);
            if (orders.length === 0) return res.json({ success: false, message: 'Order not found' });
            const commissionAmount = parseFloat(orders[0].total_amount) * (commissionRate / 100);
            return res.json({
                success: true,
                order_total: orders[0].total_amount,
                commission_rate: commissionRate,
                commission_amount: Math.round(commissionAmount * 100) / 100
            });
        }

        if (action === 'record') {
            const { order_id, seller_id } = req.body;
            const [vendors] = await pool.query('SELECT commission_rate FROM vendor_profiles WHERE customer_id = ?', [seller_id]);
            const commissionRate = vendors.length > 0 ? parseFloat(vendors[0].commission_rate) : 3.0;
            const [orders] = await pool.query('SELECT total_amount FROM orders WHERE id = ?', [order_id]);
            const commissionAmount = parseFloat(orders[0].total_amount) * (commissionRate / 100);

            const [result] = await pool.query(
                `INSERT INTO platform_commissions (order_id, seller_id, order_total, commission_rate, commission_amount, status)
                 VALUES (?, ?, ?, ?, ?, 'pending')`,
                [order_id, seller_id, orders[0].total_amount, commissionRate, commissionAmount]
            );

            await pool.query(
                `INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, customer_id, description, recorded_date)
                 VALUES ('commission', ?, 'platform_commission', ?, ?, ?, CURDATE())`,
                [result.insertId, commissionAmount, seller_id, `Commission for order #${order_id}`]
            );

            return res.json({ success: true, commission_id: result.insertId, amount: commissionAmount });
        }

        if (action === 'mark_paid') {
            const { commission_id } = req.body;
            await pool.query("UPDATE platform_commissions SET status = 'paid', paid_at = NOW() WHERE id = ?", [commission_id]);
            return res.json({ success: true, message: 'Commission marked as paid' });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ FEATURED LISTINGS ============
app.get('/api/featured_listings.php', async (req, res) => {
    try {
        const { action, type, seller_id } = req.query;

        if (action === 'packages') {
            const [packages] = await pool.query('SELECT * FROM ad_packages WHERE is_active = 1 ORDER BY price ASC');
            return res.json({ success: true, packages });
        }

        if (action === 'active') {
            const [listings] = await pool.query(
                `SELECT fl.*, p.name as product_name, p.image_url, p.price as product_price, vp.business_name as seller_name
                 FROM featured_listings fl
                 JOIN products p ON fl.product_id = p.id
                 JOIN vendor_profiles vp ON fl.seller_id = vp.customer_id
                 WHERE fl.listing_type = ? AND fl.is_active = 1 AND fl.start_date <= CURDATE() AND fl.end_date >= CURDATE()
                 ORDER BY fl.position ASC, fl.created_at DESC LIMIT 10`,
                [type || 'search']
            );
            return res.json({ success: true, listings });
        }

        if (action === 'homepage') {
            const [banners] = await pool.query(
                `SELECT fl.*, p.name as product_name, p.image_url, p.price as product_price, vp.business_name as seller_name
                 FROM featured_listings fl
                 JOIN products p ON fl.product_id = p.id
                 JOIN vendor_profiles vp ON fl.seller_id = vp.customer_id
                 WHERE fl.listing_type = 'homepage' AND fl.is_active = 1 AND fl.start_date <= CURDATE() AND fl.end_date >= CURDATE()
                 ORDER BY fl.created_at DESC LIMIT 5`
            );
            return res.json({ success: true, banners });
        }

        if (action === 'my_listings' && seller_id) {
            const [listings] = await pool.query(
                `SELECT fl.*, p.name as product_name, ap.name as package_name
                 FROM featured_listings fl
                 JOIN products p ON fl.product_id = p.id
                 LEFT JOIN ad_packages ap ON fl.package_id = ap.id
                 WHERE fl.seller_id = ? ORDER BY fl.created_at DESC`,
                [seller_id]
            );
            return res.json({ success: true, listings });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

app.post('/api/featured_listings.php', csrfProtection, validateRequired(['action']), async (req, res, next) => {
    try {
        const { action } = req.body;

        if (action === 'purchase') {
            const { product_id, seller_id, package_slug, payment_method } = req.body;

            const [packages] = await pool.query('SELECT * FROM ad_packages WHERE slug = ? AND is_active = 1', [package_slug]);
            if (packages.length === 0) return res.json({ success: false, message: 'Package not found' });
            const pkg = packages[0];

            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + pkg.duration_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const [result] = await pool.query(
                `INSERT INTO featured_listings (product_id, seller_id, listing_type, start_date, end_date, amount, payment_status)
                 VALUES (?, ?, ?, ?, ?, ?, 'completed')`,
                [product_id, seller_id, pkg.listing_type, startDate, endDate, pkg.price]
            );

            await pool.query(
                `INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, customer_id, description, recorded_date)
                 VALUES ('featured_listing', ?, 'featured_listing', ?, ?, ?, CURDATE())`,
                [result.insertId, pkg.price, seller_id, `Featured listing: ${pkg.name}`]
            );

            return res.json({
                success: true,
                message: 'Featured listing activated',
                listing_id: result.insertId,
                end_date: endDate,
                amount: pkg.price
            });
        }

        if (action === 'track_impression') {
            const { listing_id } = req.body;
            await pool.query('UPDATE featured_listings SET impressions = impressions + 1 WHERE id = ?', [listing_id]);
            return res.json({ success: true });
        }

        if (action === 'track_click') {
            const { listing_id } = req.body;
            await pool.query('UPDATE featured_listings SET clicks = clicks + 1 WHERE id = ?', [listing_id]);
            return res.json({ success: true });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ MARKET PRICES ============
app.get('/api/market_prices.php', async (req, res) => {
    try {
        const { action, region, commodity, days, limit } = req.query;

        if (action === 'prices_by_region') {
            let sql = 'SELECT * FROM market_prices';
            const params = [];
            if (region) { sql += ' WHERE region = ?'; params.push(region); }
            sql += ' ORDER BY last_updated DESC';
            const [prices] = await pool.query(sql, params);
            return res.json({ success: true, prices });
        }

        if (action === 'all_regions') {
            const regions = ['Mbeya','Morogoro','Iringa','Songea','Dodoma','Mwanza','Arusha','Kigoma','Tanga','Mtwara','Zanzibar','Shinyanga','Singida','Manyara','Kagera','Nsimbo','Lindi','Pwani'];
            const result = {};
            for (const r of regions) {
                const [prices] = await pool.query('SELECT * FROM market_prices WHERE region = ? ORDER BY last_updated DESC', [r]);
                result[r] = prices;
            }
            return res.json({ success: true, regions, prices: result });
        }

        if (action === 'price_history') {
            const where = [];
            const params = [];
            if (commodity) { where.push('commodity = ?'); params.push(commodity); }
            if (region) { where.push('region = ?'); params.push(region); }
            where.push('date_recorded >= DATE_SUB(CURDATE(), INTERVAL ? DAY)');
            params.push(parseInt(days) || 30);
            const [history] = await pool.query(
                `SELECT * FROM price_history WHERE ${where.join(' AND ')} ORDER BY date_recorded ASC`,
                params
            );
            return res.json({ success: true, history });
        }

        if (action === 'dashboard_data') {
            const [prices] = await pool.query('SELECT * FROM market_prices ORDER BY last_updated DESC LIMIT 100');
            const [predictions] = await pool.query('SELECT * FROM price_predictions WHERE prediction_date >= CURDATE() AND valid_until >= CURDATE() ORDER BY prediction_date ASC LIMIT 30');
            const [commodities] = await pool.query('SELECT DISTINCT commodity FROM market_prices ORDER BY commodity');
            const [regions] = await pool.query('SELECT DISTINCT region FROM market_prices ORDER BY region');
            return res.json({
                success: true,
                prices,
                predictions,
                commodities: commodities.map(c => c.commodity),
                regions: regions.map(r => r.region)
            });
        }

        // Default: get all current prices
        const [prices] = await pool.query('SELECT * FROM market_prices ORDER BY last_updated DESC LIMIT ?', [parseInt(limit) || 100]);
        res.json({ success: true, prices });
} catch (err) { next(err) }
  });

// ============ MARKET PRICE ALERTS ============
app.post('/api/market_prices.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { action, commodity, target_price, direction, region } = req.body;

        if (action === 'create_alert' && commodity && target_price) {
            await pool.query(
                `INSERT INTO price_alerts (customer_id, commodity, target_price, direction, region, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [auth.customerId, commodity, target_price, direction || 'above', region || null]
            );
            return res.json({ success: true, message: 'Price alert created' });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ MARKET INTELLIGENCE ============
app.get('/api/market_intelligence.php', async (req, res) => {
    try {
        const { action, slug, customer_id, type, commodity, premium } = req.query;

        if (action === 'reports') {
            let sql = 'SELECT * FROM market_reports WHERE 1=1';
            const params = [];
            if (type) { sql += ' AND report_type = ?'; params.push(type); }
            if (commodity) { sql += ' AND commodity = ?'; params.push(commodity); }
            if (premium !== undefined && premium !== '') { sql += ' AND is_premium = ?'; params.push(premium); }
            sql += ' ORDER BY published_date DESC LIMIT 20';
            const [reports] = await pool.query(sql, params);
            return res.json({ success: true, reports });
        }

        if (action === 'report' && slug) {
            const [reports] = await pool.query('SELECT * FROM market_reports WHERE slug = ?', [slug]);
            if (reports.length > 0) {
                await pool.query('UPDATE market_reports SET downloads = downloads + 1 WHERE slug = ?', [slug]);
            }
            return res.json({ success: true, report: reports[0] || null });
        }

        if (action === 'my_subscription' && customer_id) {
            const [subs] = await pool.query(
                'SELECT * FROM market_intel_subscriptions WHERE customer_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
                [customer_id]
            );
            return res.json({ success: true, subscription: subs[0] || null });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

app.post('/api/market_intelligence.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const { action } = req.body;

        if (action === 'subscribe') {
            const { customer_id, plan_type, commodities, regions, frequency } = req.body;
            const prices = { basic: 10000, professional: 25000, enterprise: 50000 };
            const price = prices[plan_type] || 10000;
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const [result] = await pool.query(
                `INSERT INTO market_intel_subscriptions (customer_id, plan_type, commodities, regions, frequency, price_monthly, start_date, end_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [customer_id, plan_type, commodities || 'rice,maize,wheat', regions || '', frequency || 'weekly', price, startDate, endDate]
            );

            await pool.query(
                `INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, customer_id, description, recorded_date)
                 VALUES ('market_intel', ?, 'market_intel_subscription', ?, ?, ?, CURDATE())`,
                [result.insertId, price, customer_id, `Market Intelligence: ${plan_type} plan`]
            );

            return res.json({ success: true, subscription_id: result.insertId, amount: price, plan: plan_type });
        }

        if (action === 'purchase_report') {
            const { report_id, customer_id } = req.body;
            const [reports] = await pool.query('SELECT * FROM market_reports WHERE id = ?', [report_id]);
            if (reports.length === 0 || reports[0].price == 0) {
                return res.json({ success: false, message: 'Report not available for purchase' });
            }
            await pool.query(
                `INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, customer_id, description, recorded_date)
                 VALUES ('report_purchase', ?, 'market_report', ?, ?, ?, CURDATE())`,
                [report_id, reports[0].price, customer_id, `Report purchase: ${reports[0].title}`]
            );
            return res.json({ success: true, amount: reports[0].price, report: reports[0] });
        }

        if (action === 'create_report') {
            const { title, report_type, commodity, content, is_premium, price } = req.body;
            if (!title || !report_type) {
                return res.json({ success: false, message: 'Title and report type are required' });
            }
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const [result] = await pool.query(
                `INSERT INTO market_reports (title, slug, report_type, commodity, content, is_premium, price, published_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())`,
                [title, slug, report_type, commodity || null, content || '', is_premium ? 1 : 0, price || 0]
            );
            return res.json({ success: true, report_id: result.insertId, message: 'Report created' });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ VALUE-ADDED SERVICES ============
app.get('/api/value_added_services.php', async (req, res) => {
    try {
        const { action, category, customer_id } = req.query;

        if (action === 'services') {
            let sql = 'SELECT * FROM value_added_services WHERE is_active = 1';
            const params = [];
            if (category) { sql += ' AND category = ?'; params.push(category); }
            sql += ' ORDER BY category, name';
            const [services] = await pool.query(sql, params);
            return res.json({ success: true, services });
        }

        if (action === 'categories') {
            const [categories] = await pool.query('SELECT DISTINCT category FROM value_added_services WHERE is_active = 1 ORDER BY category');
            return res.json({ success: true, categories: categories.map(c => c.category) });
        }

        if (action === 'my_bookings' && customer_id) {
            const [bookings] = await pool.query(
                `SELECT sb.*, vas.name as service_name, vas.category, vas.provider_name
                 FROM service_bookings sb JOIN value_added_services vas ON sb.service_id = vas.id
                 WHERE sb.customer_id = ? ORDER BY sb.created_at DESC`,
                [customer_id]
            );
            return res.json({ success: true, bookings });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

app.post('/api/value_added_services.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const { action } = req.body;

        if (action === 'book_service') {
            const { service_id, customer_id, quantity, notes } = req.body;
            const [services] = await pool.query('SELECT * FROM value_added_services WHERE id = ?', [service_id]);
            if (services.length === 0) return res.json({ success: false, message: 'Service not found' });
            const service = services[0];
            const totalPrice = parseFloat(service.price) * (quantity || 1);
            const commissionAmount = totalPrice * (parseFloat(service.commission_rate) / 100);

            const [result] = await pool.query(
                `INSERT INTO service_bookings (service_id, customer_id, quantity, total_price, commission_amount, notes, status)
                 VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
                [service_id, customer_id, quantity || 1, totalPrice, commissionAmount, notes || '']
            );

            if (totalPrice > 0) {
                await pool.query(
                    `INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, customer_id, description, recorded_date)
                     VALUES ('value_added_service', ?, 'service_booking', ?, ?, ?, CURDATE())`,
                    [result.insertId, commissionAmount, customer_id, `Service: ${service.name}`]
                );
            }

            return res.json({
                success: true,
                booking_id: result.insertId,
                total_price: totalPrice,
                commission: commissionAmount,
                service_name: service.name
            });
        }

        if (action === 'update_status') {
            const { booking_id, status, provider_response } = req.body;
            let sql = 'UPDATE service_bookings SET status = ?, provider_response = ?';
            const params = [status, provider_response || ''];
            if (status === 'completed') { sql += ', completed_at = NOW()'; }
            sql += ' WHERE id = ?';
            params.push(booking_id);
            await pool.query(sql, params);
            return res.json({ success: true, message: 'Status updated' });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ REVENUE DASHBOARD ============
app.get('/api/revenue_dashboard.php', async (req, res) => {
    try {
        const { action, start_date, end_date } = req.query;

        if (action === 'overview') {
            const start = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
            const end = end_date || new Date().toISOString().split('T')[0];

            const [byType] = await pool.query(
                `SELECT revenue_type, COALESCE(SUM(amount), 0) as total, COUNT(*) as transactions
                 FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ? GROUP BY revenue_type ORDER BY total DESC`,
                [start, end]
            );
            const [[grandTotal]] = await pool.query(
                'SELECT COALESCE(SUM(amount), 0) as total FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ?',
                [start, end]
            );
            const [daily] = await pool.query(
                `SELECT recorded_date as date, COALESCE(SUM(amount), 0) as total
                 FROM revenue_tracking WHERE recorded_date BETWEEN ? AND ? GROUP BY recorded_date ORDER BY recorded_date`,
                [start, end]
            );
            return res.json({
                success: true,
                period: { start, end },
                grand_total: grandTotal.total,
                by_type: byType,
                daily
            });
        }

        if (action === 'projections') {
            const [[last30]] = await pool.query(
                "SELECT COALESCE(SUM(amount), 0) as total FROM revenue_tracking WHERE recorded_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
            );
            const [[last7]] = await pool.query(
                "SELECT COALESCE(SUM(amount), 0) as total FROM revenue_tracking WHERE recorded_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
            );
            const dailyAvg = last30.total / 30;
            return res.json({
                success: true,
                last_30_days: last30.total,
                last_7_days: last7.total,
                daily_average: Math.round(dailyAvg * 100) / 100,
                weekly_average: Math.round(last7.total * 100) / 100,
                monthly_projection: Math.round(dailyAvg * 30 * 100) / 100,
                yearly_projection: Math.round(dailyAvg * 365 * 100) / 100
            });
        }

        if (action === 'subscription_stats') {
            const [plans] = await pool.query(
                `SELECT sp.name, sp.slug, COUNT(vp.customer_id) as subscribers, COALESCE(SUM(sp.price_monthly), 0) as monthly_revenue
                 FROM subscription_plans sp LEFT JOIN vendor_profiles vp ON sp.slug = vp.subscription_tier
                 GROUP BY sp.id ORDER BY subscribers DESC`
            );
            const [[totals]] = await pool.query(
                "SELECT COUNT(*) as total_sellers, SUM(CASE WHEN subscription_tier != 'free' THEN 1 ELSE 0 END) as paid_sellers FROM vendor_profiles"
            );
            return res.json({ success: true, plans, totals });
        }

        if (action === 'escrow_fees') {
            const [[escrow]] = await pool.query(
                "SELECT COALESCE(SUM(escrow_fee), 0) as total_fees, COUNT(*) as transaction_count, COALESCE(AVG(escrow_fee), 0) as avg_fee FROM escrow_transactions WHERE status IN ('released', 'held')"
            );
            return res.json({ success: true, escrow });
        }

        if (action === 'commission_breakdown') {
            const [daily] = await pool.query(
                `SELECT DATE(created_at) as date, COALESCE(SUM(commission_amount), 0) as total, COUNT(*) as orders
                 FROM platform_commissions WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                 GROUP BY DATE(created_at) ORDER BY date`
            );
            return res.json({ success: true, daily });
        }

        if (action === 'top_revenue_sources') {
            const [sources] = await pool.query(
                `SELECT revenue_type, COALESCE(SUM(amount), 0) as total, COUNT(*) as transactions
                 FROM revenue_tracking GROUP BY revenue_type ORDER BY total DESC`
            );
            return res.json({ success: true, sources });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

app.post('/api/revenue_dashboard.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { action, revenue_type, amount, reference_id, reference_type, customer_id, description } = req.body;

        if (action === 'record_revenue' && revenue_type && amount) {
            await pool.query(
                `INSERT INTO revenue_tracking (revenue_type, amount, reference_id, reference_type, customer_id, description, recorded_date)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [revenue_type, amount, reference_id || null, reference_type || '', customer_id || auth.customerId, description || '']
            );
            return res.json({ success: true, message: 'Revenue recorded' });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ LOGISTICS ============
app.get('/api/logistics.php', async (req, res) => {
    try {
        const { action, region } = req.query;

        if (action === 'providers') {
            let sql = 'SELECT * FROM transport_providers WHERE is_active = 1';
            const params = [];
            if (region) { sql += ' AND coverage_areas LIKE ?'; params.push(`%${region}%`); }
            sql += ' ORDER BY rating DESC';
            const [providers] = await pool.query(sql, params);
            return res.json({ success: true, providers });
        }

        if (action === 'commissions') {
            const [commissions] = await pool.query(
                `SELECT lc.*, o.order_number, tp.company_name as provider_name
                 FROM logistics_commissions lc
                 JOIN orders o ON lc.order_id = o.id
                 LEFT JOIN transport_providers tp ON lc.transport_provider_id = tp.id
                 ORDER BY lc.created_at DESC`
            );
            return res.json({ success: true, commissions });
        }

        if (action === 'summary') {
            const [[summary]] = await pool.query(
                'SELECT COUNT(*) as total_deliveries, COALESCE(SUM(delivery_cost), 0) as total_delivery_value, COALESCE(SUM(commission_amount), 0) as total_commission FROM logistics_commissions'
            );
            return res.json({ success: true, summary });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

app.post('/api/logistics.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const { action } = req.body;

        if (action === 'book_transport') {
            const { order_id, provider_id, distance, delivery_cost } = req.body;
            const [providers] = await pool.query('SELECT commission_rate FROM transport_providers WHERE id = ?', [provider_id]);
            const commissionRate = providers.length > 0 ? parseFloat(providers[0].commission_rate) : 10.0;
            const commissionAmount = parseFloat(delivery_cost) * (commissionRate / 100);

            const [result] = await pool.query(
                `INSERT INTO logistics_commissions (order_id, transport_provider_id, delivery_distance, delivery_cost, commission_rate, commission_amount)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [order_id, provider_id, distance, delivery_cost, commissionRate, commissionAmount]
            );

            await pool.query(
                `INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, description, recorded_date)
                 VALUES ('logistics', ?, 'logistics_commission', ?, ?, CURDATE())`,
                [result.insertId, commissionAmount, `Logistics commission for order #${order_id}`]
            );

            return res.json({ success: true, commission_id: result.insertId, commission_amount: commissionAmount, rate: commissionRate });
        }

        if (action === 'add_provider') {
            const { company_name, contact_person, phone, email, vehicle_types, coverage_areas, base_rate_per_km, commission_rate } = req.body;
            const [result] = await pool.query(
                `INSERT INTO transport_providers (company_name, contact_person, phone, email, vehicle_types, coverage_areas, base_rate_per_km, commission_rate)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [company_name, contact_person, phone, email, vehicle_types, coverage_areas, base_rate_per_km, commission_rate || 10.0]
            );
            return res.json({ success: true, provider_id: result.insertId });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ WAREHOUSE ============
app.get('/api/warehouse.php', async (req, res) => {
    try {
        const { action, region, customer_id } = req.query;

        if (action === 'warehouses') {
            let sql = 'SELECT * FROM warehouse_services WHERE is_active = 1';
            const params = [];
            if (region) { sql += ' AND region = ?'; params.push(region); }
            sql += ' ORDER BY rate_per_tonne_day ASC';
            const [warehouses] = await pool.query(sql, params);
            return res.json({ success: true, warehouses });
        }

        if (action === 'bookings' && customer_id) {
            const [bookings] = await pool.query(
                `SELECT wb.*, ws.warehouse_name, ws.location, ws.region
                 FROM warehouse_bookings wb JOIN warehouse_services ws ON wb.warehouse_id = ws.id
                 WHERE wb.customer_id = ? ORDER BY wb.created_at DESC`,
                [customer_id]
            );
            return res.json({ success: true, bookings });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

app.post('/api/warehouse.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const { action } = req.body;

        if (action === 'book') {
            const { warehouse_id, customer_id, product_type, quantity, start_date, end_date } = req.body;
            const [warehouses] = await pool.query('SELECT * FROM warehouse_services WHERE id = ?', [warehouse_id]);
            if (warehouses.length === 0) return res.json({ success: false, message: 'Warehouse not found' });
            const warehouse = warehouses[0];

            const days = Math.max(1, Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)));
            const storageFee = parseFloat(quantity) * parseFloat(warehouse.rate_per_tonne_day) * days;
            const commissionAmount = storageFee * (parseFloat(warehouse.commission_rate) / 100);

            const [result] = await pool.query(
                `INSERT INTO warehouse_bookings (warehouse_id, customer_id, product_type, quantity, start_date, end_date, storage_fee, commission_amount, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
                [warehouse_id, customer_id, product_type, quantity, start_date, end_date, storageFee, commissionAmount]
            );

            await pool.query(
                `INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, customer_id, description, recorded_date)
                 VALUES ('warehouse', ?, 'warehouse_booking', ?, ?, ?, CURDATE())`,
                [result.insertId, commissionAmount, customer_id, `Warehouse referral: ${warehouse.warehouse_name}`]
            );

            return res.json({ success: true, booking_id: result.insertId, storage_fee: storageFee, commission: commissionAmount });
        }

        if (action === 'add_warehouse') {
            const { warehouse_name, owner_id, location, region, capacity_tonnes, available_space, rate_per_tonne_day, services, commission_rate } = req.body;
            const [result] = await pool.query(
                `INSERT INTO warehouse_services (warehouse_name, owner_id, location, region, capacity_tonnes, available_space, rate_per_tonne_day, services, commission_rate)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [warehouse_name, owner_id, location, region, capacity_tonnes, available_space, rate_per_tonne_day, services, commission_rate || 5.0]
            );
            return res.json({ success: true, warehouse_id: result.insertId });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ APPLICATION STATUS ============

app.get('/api/my-application.php', requireAuth, async (req, res) => {
    try {
        const userId = req.user.customerId
        const [user] = await pool.query('SELECT role, is_verified FROM customers WHERE id = ?', [userId])
        if (user.length === 0) return res.json({ success: false, message: 'User not found' })
        const userRole = user[0].role

        if (userRole === 'logistics_company') {
            const [apps] = await pool.query('SELECT * FROM logistics_applications WHERE customer_id = ? ORDER BY created_at DESC', [userId])
            return res.json({ success: true, type: 'logistics_company', is_verified: !!user[0].is_verified, applications: apps })
        }
        if (userRole === 'warehouse') {
            const [apps] = await pool.query('SELECT * FROM warehouse_applications WHERE customer_id = ? ORDER BY created_at DESC', [userId])
            return res.json({ success: true, type: 'warehouse', is_verified: !!user[0].is_verified, applications: apps })
        }
        res.json({ success: true, type: userRole, is_verified: !!user[0].is_verified, applications: [] })
} catch (err) { next(err) }
  });

// ============ USER SEARCH / DIRECTORY ============

app.get('/api/users.php', async (req, res) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        if (req.query.action === 'search') {
            const q = (req.query.q || '').toString().trim();
            const role = (req.query.role || '').toString().trim();
            if (q.length < 1) return res.json({ success: true, users: [] });

            const params = [`%${q}%`, `%${q}%`, auth.customerId];
            let sql = `SELECT id, full_name, email, phone, role, business_name, business_type, is_verified, created_at
                       FROM customers
                       WHERE (full_name LIKE ? OR email LIKE ? OR phone LIKE ?) AND id != ? AND is_active = 1`;
            if (role) {
                sql += ' AND role = ?';
                params.push(role);
            }
            sql += ' ORDER BY full_name ASC LIMIT 25';
            const [users] = await pool.query(sql, params);
            return res.json({ success: true, users });
        }

        if (req.query.action === 'profile') {
            const id = parseInt(req.query.id, 10);
            if (!id) return res.status(400).json({ success: false, message: 'id is required' });
            const [rows] = await pool.query(
                `SELECT id, full_name, email, phone, role, business_name, business_type, is_verified, created_at
                 FROM customers WHERE id = ? AND is_active = 1`,
                [id]
            );
            if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
            return res.json({ success: true, profile: rows[0] });
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ MESSAGING ============

app.get('/api/messages.php', async (req, res) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const me = auth.customerId;

        if (req.query.action === 'conversations') {
            const [rows] = await pool.query(
                `SELECT c.id AS conversation_id,
                        c.conversation_type,
                        c.last_message_preview,
                        c.last_message_at,
                        c.updated_at,
                        c.seller_id,
                        c.buyer_id,
                        c.product_id,
                        c.order_id,
                        c.status AS conv_status,
                        p.name AS product_name,
                        p.image_url AS product_image,
                        cp.last_read_at,
                        (SELECT COUNT(*) FROM messages m
                           WHERE m.conversation_id = c.id
                             AND m.recipient_id = ?
                             AND m.is_read = 0) AS unread_count,
                        other.id AS other_id,
                        other.full_name AS other_name,
                        other.role AS other_role,
                        other.business_name AS other_business,
                        other.is_verified AS other_verified,
                        (SELECT COUNT(*) FROM user_blocks
                           WHERE (blocker_id = ? AND blocked_id = other.id)
                              OR (blocker_id = other.id AND blocked_id = ?)) AS is_blocked
                 FROM conversations c
                 LEFT JOIN products p ON p.id = c.product_id
                 JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.customer_id = ?
                 JOIN conversation_participants op ON op.conversation_id = c.id AND op.customer_id != ?
                 JOIN customers other ON other.id = op.customer_id
                 ORDER BY COALESCE(c.last_message_at, c.updated_at) DESC`,
                [me, me, me, me, me]
            );
            return res.json({ success: true, conversations: rows });
        }

        if (req.query.action === 'messages') {
            const conversationId = parseInt(req.query.conversation_id, 10);
            if (!conversationId) return res.status(400).json({ success: false, message: 'conversation_id is required' });

            const [member] = await pool.query(
                'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND customer_id = ?',
                [conversationId, me]
            );
            if (member.length === 0) {
                return res.status(403).json({ success: false, message: 'Not a participant in this conversation' });
            }

            const [msgs] = await pool.query(
                `SELECT m.id, m.conversation_id, m.sender_id, m.recipient_id, m.content,
                        m.is_read, m.created_at, m.message_type, m.status, m.reply_to_message_id,
                        s.full_name AS sender_name,
                        p.id AS parent_id, p.sender_id AS parent_sender_id, p.content AS parent_content, p.sender_name AS parent_sender_name
                 FROM messages m
                 JOIN customers s ON s.id = m.sender_id
                 JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.customer_id = ?
                 LEFT JOIN messages p ON p.id = m.reply_to_message_id
                 LEFT JOIN customers ps ON ps.id = p.sender_id
                 WHERE m.conversation_id = ?
                 ORDER BY m.created_at ASC
                 LIMIT 500`,
                [me, conversationId]
            );

            await pool.query(
                'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND recipient_id = ? AND is_read = 0',
                [conversationId, me]
            );
            await pool.query(
                'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND customer_id = ?',
                [conversationId, me]
            );

            return res.json({ success: true, messages: msgs });
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

app.post('/api/messages.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const me = auth.customerId;
        const { action } = req.body;

        if (action === 'send') {
             const recipientId = parseInt(req.body.recipient_id, 10);
            const content = (req.body.content || '').toString().trim();
            const replyToId = req.body.reply_to_message_id ? parseInt(req.body.reply_to_message_id, 10) : null;
            if (!recipientId || !content) {
                return res.json({ success: false, message: 'recipient_id and content are required' });
            }
            if (recipientId === me) {
                return res.json({ success: false, message: 'You cannot message yourself' });
            }

            if (replyToId) {
                const [parentMsg] = await pool.query(
                    `SELECT id FROM messages m
                     JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.customer_id = ?
                     WHERE m.id = ?`,
                    [me, replyToId]
                );
                if (parentMsg.length === 0) {
                    return res.json({ success: false, message: 'Reply target not found or not in this conversation' });
                }
            }

            const [recipient] = await pool.query(
                'SELECT id FROM customers WHERE id = ? AND is_active = 1',
                [recipientId]
            );
            if (recipient.length === 0) {
                return res.json({ success: false, message: 'Recipient not found' });
            }

            const [blockCheck] = await pool.query(
                `SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
                [me, recipientId, recipientId, me]
            );
            if (blockCheck.length > 0) {
                return res.json({ success: false, message: 'Message blocked — you cannot message this user', code: 'BLOCKED' });
            }

            const [existing] = await pool.query(
                `SELECT c.id, c.status FROM conversations c
                 JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.customer_id = ?
                 JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.customer_id = ?
                 LIMIT 1`,
                [me, recipientId]
            );

            let conversationId;
            if (existing.length > 0) {
                conversationId = existing[0].id;
                if (existing[0].status === 'closed') {
                    return res.json({ success: false, message: 'This conversation has been closed', code: 'CLOSED' });
                }
            } else {
                const [conv] = await pool.query('INSERT INTO conversations () VALUES ()');
                conversationId = conv.insertId;
                await pool.query(
                    'INSERT INTO conversation_participants (conversation_id, customer_id) VALUES (?, ?), (?, ?)',
                    [conversationId, me, conversationId, recipientId]
                );
            }

            const mod = await chatModeration.moderateAndRecord(pool, {
                userId: me,
                conversationId,
                content,
                messageType: 'text',
            });

            if (!mod.allowed) {
                return res.json({
                    success: false,
                    message: mod.userMessage,
                    code: 'MODERATED',
                    violation_type: mod.violation_type,
                });
            }

            const preview = content.length > 240 ? content.slice(0, 240) : content;
            const [ins] = await pool.query(
                `INSERT INTO messages (conversation_id, sender_id, recipient_id, content, reply_to_message_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [conversationId, me, recipientId, content, replyToId]
            );
            await pool.query(
                `UPDATE conversations SET last_message_preview = ?, last_message_at = NOW(), updated_at = NOW()
                 WHERE id = ?`,
                [preview, conversationId]
            );

            const [[created]] = await pool.query(
                `SELECT m.id, m.conversation_id, m.sender_id, m.recipient_id, m.content,
                        m.is_read, m.created_at, m.message_type, m.status, m.reply_to_message_id,
                        s.full_name AS sender_name
                 FROM messages m
                 JOIN customers s ON s.id = m.sender_id
                 WHERE m.id = ?`,
                [ins.insertId]
            );
            // Broadcast to recipient's real-time stream (all devices)
            realtime.publishMessage(recipientId, { message: created, conversation_id: conversationId, sender_id: me })
            // Create notification for recipient so they are alerted even when not connected via SSE
            const [[sender]] = await pool.query('SELECT full_name FROM customers WHERE id = ?', [me])
            const senderName = sender?.full_name || 'Someone'
            await pool.query(
                `INSERT INTO notifications (customer_id, title, message, type, is_read)
                 VALUES (?, ?, ?, 'message', 0)`,
                [recipientId, 'New message from ' + senderName, content.length > 100 ? content.slice(0, 100) + '…' : content]
            )
            realtime.publishNotifications(recipientId, { type: 'new_message', conversation_id: conversationId, sender_id: me })
            return res.json({ success: true, conversation_id: conversationId, message: created });
        }

        if (action === 'reply') {
            const recipientId = parseInt(req.body.recipient_id, 10);
            const content = (req.body.content || '').toString().trim();
            const replyToId = parseInt(req.body.reply_to_message_id, 10);
            if (!recipientId || !content || !replyToId) {
                return res.json({ success: false, message: 'recipient_id, content and reply_to_message_id are required' });
            }
            if (recipientId === me) {
                return res.json({ success: false, message: 'You cannot message yourself' });
            }

            const [blockCheck] = await pool.query(
                `SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
                [me, recipientId, recipientId, me]
            );
            if (blockCheck.length > 0) {
                return res.json({ success: false, message: 'Message blocked — you cannot message this user', code: 'BLOCKED' });
            }

            const [existing] = await pool.query(
                `SELECT c.id, c.status FROM conversations c
                 JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.customer_id = ?
                 JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.customer_id = ?
                 LIMIT 1`,
                [me, recipientId]
            );

            let conversationId;
            if (existing.length > 0) {
                conversationId = existing[0].id;
                if (existing[0].status === 'closed') {
                    return res.json({ success: false, message: 'This conversation has been closed', code: 'CLOSED' });
                }
            } else {
                const [conv] = await pool.query('INSERT INTO conversations () VALUES ()');
                conversationId = conv.insertId;
                await pool.query(
                    'INSERT INTO conversation_participants (conversation_id, customer_id) VALUES (?, ?), (?, ?)',
                    [conversationId, me, conversationId, recipientId]
                );
            }

            const [parentMsg] = await pool.query(
                `SELECT id FROM messages m
                 JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.customer_id = ?
                 WHERE m.id = ?`,
                [me, replyToId]
            );
            if (parentMsg.length === 0) {
                return res.json({ success: false, message: 'Reply target not found or not in this conversation' });
            }

            const mod = await chatModeration.moderateAndRecord(pool, {
                userId: me,
                conversationId,
                content,
                messageType: 'text',
            });
            if (!mod.allowed) {
                return res.json({
                    success: false,
                    message: mod.userMessage,
                    code: 'MODERATED',
                    violation_type: mod.violation_type,
                });
            }

            const preview = content.length > 240 ? content.slice(0, 240) : content;
            const [ins] = await pool.query(
                `INSERT INTO messages (conversation_id, sender_id, recipient_id, content, reply_to_message_id)
                 VALUES (?, ?, ?, ?, ?)`,
                [conversationId, me, recipientId, content, replyToId]
            );
            await pool.query(
                `UPDATE conversations SET last_message_preview = ?, last_message_at = NOW(), updated_at = NOW()
                 WHERE id = ?`,
                [preview, conversationId]
            );

            const [[created]] = await pool.query(
                `SELECT m.id, m.conversation_id, m.sender_id, m.recipient_id, m.content,
                        m.is_read, m.created_at, m.message_type, m.status, m.reply_to_message_id,
                        s.full_name AS sender_name
                 FROM messages m
                 JOIN customers s ON s.id = m.sender_id
                 WHERE m.id = ?`,
                [ins.insertId]
            );
            realtime.publishMessage(recipientId, { message: created, conversation_id: conversationId, sender_id: me })
            const [[sender]] = await pool.query('SELECT full_name FROM customers WHERE id = ?', [me])
            const senderName = sender?.full_name || 'Someone'
            await pool.query(
                `INSERT INTO notifications (customer_id, title, message, type, is_read)
                 VALUES (?, ?, ?, 'message', 0)`,
                [recipientId, 'New message from ' + senderName, content.length > 100 ? content.slice(0, 100) + '…' : content]
            )
            realtime.publishNotifications(recipientId, { type: 'new_message', conversation_id: conversationId, sender_id: me })
            return res.json({ success: true, conversation_id: conversationId, message: created });
        }

        if (action === 'mark_read') {
            const conversationId = parseInt(req.body.conversation_id, 10);
            if (!conversationId) return res.json({ success: false, message: 'conversation_id is required' });
            const [readResult] = await pool.query(
                'UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND recipient_id = ? AND is_read = 0',
                [conversationId, me]
            );
            await pool.query(
                'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND customer_id = ?',
                [conversationId, me]
            );
            const [conv] = await pool.query('SELECT sender_id FROM conversations WHERE id = ?', [conversationId]);
            if (conv.length > 0) {
                const senderId = conv[0].sender_id;
                realtime.publishMessage(senderId, { type: 'read_receipt', conversation_id: conversationId, reader_id: me, count: readResult.affectedRows });
            }
             return res.json({ success: true });
         }

         if (action === 'typing') {
             const conversationId = parseInt(req.body.conversation_id, 10);
             if (!conversationId) return res.json({ success: false, message: 'conversation_id is required' });

             const [participant] = await pool.query(
                 `SELECT op.customer_id AS other_id, op.role AS other_role
                  FROM conversation_participants op
                  JOIN conversation_participants mp ON mp.conversation_id = op.conversation_id
                  WHERE mp.conversation_id = ? AND mp.customer_id = ? AND op.customer_id != ?`,
                 [conversationId, me, me]
             );
             if (participant.length === 0) {
                 return res.json({ success: false, message: 'Not a participant in this conversation' });
             }

             const otherId = participant[0].other_id;
             realtime.publishTyping(otherId, {
                 type: 'typing',
                 conversation_id: conversationId,
                 user_id: me,
             });
             return res.json({ success: true });
         }

         if (action === 'delete') {
            const messageId = parseInt(req.body.message_id, 10);
            if (!messageId) {
                return res.json({ success: false, message: 'message_id is required' });
            }

            const [msg] = await pool.query(
                `SELECT m.id, m.sender_id, m.conversation_id FROM messages m
                 JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.customer_id = ?
                 WHERE m.id = ?`,
                [me, messageId]
            );
            if (msg.length === 0) {
                return res.status(403).json({ success: false, message: 'Message not found or not authorized' });
            }

            await pool.query(
                "UPDATE messages SET status = 'DELETED', content = '[deleted]' WHERE id = ?",
                [messageId]
            );
            const convId = msg[0].conversation_id;
            await pool.query(
                'UPDATE conversations SET last_message_preview = ?, last_message_at = NOW(), updated_at = NOW() WHERE id = ?',
                ['[deleted]', convId]
            );
            realtime.publishMessage(msg[0].sender_id, { type: 'message_deleted', message_id: messageId, conversation_id: convId });
            return res.json({ success: true, message: { id: messageId, status: 'DELETED', content: '[deleted]' } });
        }

        if (action === 'edit') {
            const messageId = parseInt(req.body.message_id, 10);
            const newContent = (req.body.content || '').toString().trim();
            if (!messageId || !newContent) {
                return res.json({ success: false, message: 'message_id and content are required' });
            }

            const [msg] = await pool.query(
                `SELECT id FROM messages WHERE id = ? AND sender_id = ? AND status != 'DELETED'`,
                [messageId, me]
            );
            if (msg.length === 0) {
                return res.status(403).json({ success: false, message: 'Message not found or not authorized' });
            }

            const mod = await chatModeration.moderateAndRecord(pool, {
                userId: me,
                conversationId: null,
                content: newContent,
                messageType: 'text',
            });
            if (!mod.allowed) {
                return res.json({
                    success: false,
                    message: mod.userMessage,
                    code: 'MODERATED',
                    violation_type: mod.violation_type,
                });
            }

            await pool.query(
                'UPDATE messages SET content = ? WHERE id = ?',
                [newContent, messageId]
            );
            const [updated] = await pool.query(
                `SELECT m.id, m.conversation_id, m.sender_id, m.recipient_id, m.content,
                        m.is_read, m.created_at, m.message_type, m.status, m.reply_to_message_id,
                        s.full_name AS sender_name
                 FROM messages m
                 JOIN customers s ON s.id = m.sender_id
                 WHERE m.id = ?`,
                [messageId]
            );
            realtime.publishMessage(updated[0].recipient_id, { type: 'message_edited', message: updated[0], conversation_id: updated[0].conversation_id, sender_id: me });
            return res.json({ success: true, message: updated[0] });
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
    });

app.post('/api/messages.php/attachment', uploadMessageImage.single('image'), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const me = auth.customerId;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const conversationId = parseInt(req.body.conversation_id, 10);
        if (!conversationId) {
            return res.status(400).json({ success: false, message: 'conversation_id is required' });
        }

        // Check conversation membership
        const [member] = await pool.query(
            'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND customer_id = ?',
            [conversationId, me]
        );
        if (member.length === 0) {
            return res.status(403).json({ success: false, message: 'Not a participant in this conversation' });
        }

        // Determine recipient
        const [participants] = await pool.query(
            'SELECT customer_id FROM conversation_participants WHERE conversation_id = ? AND customer_id != ?',
            [conversationId, me]
        );
        const recipientId = participants[0]?.customer_id;

        // Run moderation on caption if provided
        const caption = (req.body.caption || '').toString().trim();
        if (caption) {
            const mod = await chatModeration.moderateAndRecord(pool, {
                userId: me,
                conversationId,
                content: caption,
                messageType: 'text',
            });
            if (!mod.allowed) {
                return res.json({ success: false, message: mod.userMessage, code: 'MODERATED', violation_type: mod.violation_type });
            }
        }

        const imageUrl = `/images/messages/${req.file.filename}`;
        const content = caption ? `${caption}\n${imageUrl}` : imageUrl;

        const [ins] = await pool.query(
            `INSERT INTO messages (conversation_id, sender_id, recipient_id, content, message_type, status)
             VALUES (?, ?, ?, ?, 'image', 'SENT')`,
            [conversationId, me, recipientId, content]
        );

        // Record attachment metadata
        const [meta] = await pool.query('SELECT 1 FROM message_attachments WHERE message_id = ?', [ins.insertId]);
        await pool.query(
            `INSERT INTO message_attachments (message_id, file_name, file_path, mime_type, file_size, width, height, is_image)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [ins.insertId, req.file.originalname, imageUrl, req.file.mimetype, req.file.size, req.file.width || null, req.file.height || null]
        );

        await pool.query(
            `UPDATE conversations SET last_message_preview = '📎 Image', last_message_at = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [conversationId]
        );

        const [[created]] = await pool.query(
            `SELECT m.id, m.conversation_id, m.sender_id, m.recipient_id, m.content,
                    m.is_read, m.created_at, m.message_type, m.status,
                    s.full_name AS sender_name
             FROM messages m
             JOIN customers s ON s.id = m.sender_id
             WHERE m.id = ?`,
            [ins.insertId]
        );

        realtime.publishMessage(recipientId, { message: created, conversation_id: conversationId, sender_id: me });
        const [[sender]] = await pool.query('SELECT full_name FROM customers WHERE id = ?', [me])
        const senderName = sender?.full_name || 'Someone'
        await pool.query(
            `INSERT INTO notifications (customer_id, title, message, type, is_read)
             VALUES (?, ?, ?, 'message', 0)`,
            [recipientId, 'New message from ' + senderName, caption ? (caption.length > 100 ? caption.slice(0, 100) + '…' : caption) : '📎 Image']
        )
        realtime.publishNotifications(recipientId, { type: 'new_message', conversation_id: conversationId, sender_id: me })
        return res.json({ success: true, message: created, attachment: { file_name: req.file.originalname, file_path: imageUrl, mime_type: req.file.mimetype, file_size: req.file.size } });
    } catch (err) { next(err) }
});

app.post('/api/conversations.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const me = auth.customerId;

        const { action } = req.body;

        if (action === 'open_or_create') {
            const sellerId = parseInt(req.body.seller_id, 10);
            const productId = parseInt(req.body.product_id || 0, 10) || null;
            const orderId = parseInt(req.body.order_id || 0, 10) || null;
            const requestedQuantity = parseInt(req.body.requested_quantity || 0, 10) || null;

            if (!sellerId) {
                return res.json({ success: false, message: 'seller_id is required' });
            }
            if (sellerId === me) {
                return res.json({ success: false, message: 'You cannot start a conversation with yourself' });
            }

            const [seller] = await pool.query(
                'SELECT id, role FROM customers WHERE id = ? AND is_active = 1',
                [sellerId]
            );
            if (seller.length === 0) {
                return res.json({ success: false, message: 'Seller not found' });
            }

            let [existing] = await pool.query(
                `SELECT c.id FROM conversations c
                 JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.customer_id = ?
                 JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.customer_id = ?
                 LIMIT 1`,
                [me, sellerId]
            );

            let conversationId;
             if (existing.length > 0) {
                conversationId = existing[0].id;
                // Update context if provided
                if (productId || orderId || requestedQuantity) {
                    await pool.query(
                        'UPDATE conversations SET product_id = COALESCE(?, product_id), order_id = COALESCE(?, order_id), requested_quantity = COALESCE(?, requested_quantity) WHERE id = ?',
                        [productId, orderId, requestedQuantity, conversationId]
                    );
                }
            } else {
                const convType = orderId ? 'ORDER' : (productId ? 'PRODUCT_INQUIRY' : 'GENERAL_BUSINESS');
                const [conv] = await pool.query(
                    'INSERT INTO conversations (conversation_type, product_id, order_id, seller_id, buyer_id, created_by, requested_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [convType, productId, orderId, sellerId, me, me, requestedQuantity]
                );
                conversationId = conv.insertId;
                await pool.query(
                    'INSERT INTO conversation_participants (conversation_id, customer_id, role) VALUES (?, ?, ?), (?, ?, ?)',
                    [conversationId, me, 'buyer', conversationId, sellerId, 'seller']
                );
            }

             res.json({ success: true, conversation_id: conversationId });
         }

          if (action === 'archive' || action === 'close') {
              const conversationId = parseInt(req.body.conversation_id, 10);
              if (!conversationId) {
                  return res.json({ success: false, message: 'conversation_id is required' });
              }

              const [member] = await pool.query(
                  'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND customer_id = ?',
                  [conversationId, me]
              );
              if (member.length === 0) {
                  return res.status(403).json({ success: false, message: 'Not a participant in this conversation' });
              }

              const newStatus = action === 'archive' ? 'archived' : 'closed';
              await pool.query('UPDATE conversations SET status = ? WHERE id = ?', [newStatus, conversationId]);

              if (newStatus === 'closed') {
                  const [participants] = await pool.query(
                      'SELECT customer_id FROM conversation_participants WHERE conversation_id = ?',
                      [conversationId]
                  );
                  const otherParticipant = participants.find(p => p.customer_id !== me);
                  if (otherParticipant) {
                      const [[sender]] = await pool.query('SELECT full_name FROM customers WHERE id = ?', [me]);
                      realtime.publishNotifications(otherParticipant.customer_id, {
                          type: 'notification',
                          title: 'Conversation closed',
                          message: (sender?.full_name || 'Someone') + ' closed this conversation',
                          related_id: conversationId,
                          related_type: 'conversation'
                      });
                  }
              }

              return res.json({ success: true, conversation_id: conversationId, status: newStatus });
          }

          if (action === 'reopen') {
              const conversationId = parseInt(req.body.conversation_id, 10);
              if (!conversationId) {
                  return res.json({ success: false, message: 'conversation_id is required' });
              }

              const [member] = await pool.query(
                  'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND customer_id = ?',
                  [conversationId, me]
              );
              if (member.length === 0) {
                  return res.status(403).json({ success: false, message: 'Not a participant in this conversation' });
              }

              const [conv] = await pool.query('SELECT status FROM conversations WHERE id = ?', [conversationId]);
              if (conv.length === 0) {
                  return res.status(404).json({ success: false, message: 'Conversation not found' });
              }
              if (conv[0].status !== 'closed') {
                  return res.json({ success: false, message: 'Conversation is not closed' });
              }

              await pool.query('UPDATE conversations SET status = ? WHERE id = ?', ['active', conversationId]);
              const [participants] = await pool.query(
                  'SELECT customer_id FROM conversation_participants WHERE conversation_id = ? AND customer_id != ?',
                  [conversationId, me]
              );
              if (participants.length > 0) {
                  realtime.publishChatEvent(participants[0].customer_id, {
                      type: 'conversation_reopened',
                      conversation_id: conversationId,
                      user_id: me
                  });
              }
              return res.json({ success: true, conversation_id: conversationId, status: 'active' });
          }

         if (action === 'context') {
            return handleConversationContext(req, res, me, pool);
        }

        if (action === 'get_detail') {
            return handleConversationDetail(req, res, me, pool);
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (err) { next(err) }
});

// GET handler for conversation context and detail (frontend uses GET for these)
app.get('/api/conversations.php', async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const me = auth.customerId;
        const { action } = req.query;
        // Reuse the same handler logic — conversation_id is read from req.query in both cases
        if (action === 'context' || action === 'get_detail') {
            // Delegate to POST handler logic by routing through the same flow
            req.body = { action, ...req.query };
            const postHandler = (await import('express')).Router();
            // Instead, replicate the minimal logic here by re-using the same queries
            if (action === 'context') {
                return handleConversationContext(req, res, me, pool);
            }
            if (action === 'get_detail') {
                return handleConversationDetail(req, res, me, pool);
            }
        }
        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (err) { next(err) }
});

// Handle conversation context (used by both GET and POST)
async function handleConversationContext(req, res, me, pool) {
    const conversationId = parseInt(req.query.conversation_id || req.body?.conversation_id, 10);
    if (!conversationId) {
        return res.json({ success: false, message: 'conversation_id is required' });
    }

    const [member] = await pool.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND customer_id = ?',
        [conversationId, me]
    );
    if (member.length === 0) {
        return res.status(403).json({ success: false, message: 'Not a participant in this conversation' });
    }

    const [[conv]] = await pool.query(
        `SELECT c.id, c.conversation_type, c.product_id, c.order_id, c.seller_id, c.buyer_id,
                c.status, c.created_at, c.updated_at, c.requested_quantity,
                p.name AS product_name, p.price AS product_price, p.image_url AS product_image,
                o.order_number, o.status AS order_status, o.total_amount AS order_total
         FROM conversations c
         LEFT JOIN products p ON p.id = c.product_id
         LEFT JOIN orders o ON o.id = c.order_id
         WHERE c.id = ?`,
        [conversationId]
    );

    const offers = await pool.query(
        `SELECT o.id, o.buyer_id, o.seller_id, o.quantity, o.unit_price, o.total_price,
                o.delivery_location, o.delivery_date, o.note, o.status, o.parent_offer_id,
                o.created_at, o.updated_at,
                b.full_name AS buyer_name, s.full_name AS seller_name
         FROM offers o
         JOIN customers b ON b.id = o.buyer_id
         JOIN customers s ON s.id = o.seller_id
         WHERE o.conversation_id = ?
         ORDER BY o.created_at DESC`,
        [conversationId]
    );

    const participants = await pool.query(
        `SELECT cp.customer_id, cp.role, c.full_name, c.is_verified
         FROM conversation_participants cp
         JOIN customers c ON c.id = cp.customer_id
         WHERE cp.conversation_id = ?`,
        [conversationId]
    );

    const [blockCheck] = await pool.query(
        `SELECT blocker_id, blocked_id FROM user_blocks
         WHERE (blocker_id = ? AND blocked_id IN (?, ?)) OR (blocked_id = ? AND blocker_id IN (?, ?))`,
        [me, participants[0]?.customer_id, participants[1]?.customer_id, me, participants[0]?.customer_id, participants[1]?.customer_id]
    );

    // Calculate fulfilled quantity from accepted offers
    let fulfilledQuantity = 0;
    const offerRows = offers[0] || [];
    for (const o of offerRows) {
        if (o.status === 'accepted') {
            fulfilledQuantity += parseFloat(o.quantity) || 0;
        }
    }

    res.json({
        success: true,
        conversation: conv[0] || null,
        offers: offerRows,
        participants: participants[0] || [],
        has_block: blockCheck.length > 0,
        fulfilled_quantity: fulfilledQuantity,
    });
}

// Handle conversation detail (used by both GET and POST)
async function handleConversationDetail(req, res, me, pool) {
    const conversationId = parseInt(req.query.conversation_id || req.body?.conversation_id, 10);
    if (!conversationId) {
        return res.json({ success: false, message: 'conversation_id is required' });
    }

    const [member] = await pool.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND customer_id = ?',
        [conversationId, me]
    );
    if (member.length === 0) {
        return res.status(403).json({ success: false, message: 'Not a participant in this conversation' });
    }

    const [[conv]] = await pool.query(
        `SELECT c.*, p.name AS product_name, p.price AS product_price, p.seller_id AS product_seller_id,
                o.order_number, o.status AS order_status
         FROM conversations c
         LEFT JOIN products p ON p.id = c.product_id
         LEFT JOIN orders o ON o.id = c.order_id
         WHERE c.id = ?`,
        [conversationId]
    );

    res.json({ success: true, conversation: conv[0] || null });
}

// ============ CHAT: OFFERS API ============

app.get('/api/offers.php', async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const me = auth.customerId;

        const conversationId = parseInt(req.query.conversation_id, 10);
        const offerId = parseInt(req.query.id, 10);

        if (offerId) {
            const [[offer]] = await pool.query(
                `SELECT o.*, b.full_name AS buyer_name, s.full_name AS seller_name
                 FROM offers o
                 JOIN customers b ON b.id = o.buyer_id
                 JOIN customers s ON s.id = o.seller_id
                 WHERE o.id = ?`,
                [offerId]
            );
            if (offer.length === 0) return res.json({ success: false, message: 'Offer not found' });

            // Verify the user is a participant in the conversation
            const [part] = await pool.query(
                `SELECT 1 FROM conversation_participants
                 WHERE conversation_id = (SELECT conversation_id FROM offers WHERE id = ?)
                 AND customer_id = ?`,
                [offerId, me]
            );
            if (part.length === 0) return res.status(403).json({ success: false, message: 'Not authorized' });

            return res.json({ success: true, offer: offer[0] });
        }

        if (conversationId) {
            const [part] = await pool.query(
                'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND customer_id = ?',
                [conversationId, me]
            );
            if (part.length === 0) return res.status(403).json({ success: false, message: 'Not a participant' });

            const [offers] = await pool.query(
                `SELECT o.id, o.buyer_id, o.seller_id, o.quantity, o.unit_price, o.total_price,
                        o.delivery_location, o.delivery_date, o.note, o.status, o.parent_offer_id,
                        o.created_at, o.updated_at,
                        b.full_name AS buyer_name, s.full_name AS seller_name
                 FROM offers o
                 JOIN customers b ON b.id = o.buyer_id
                 JOIN customers s ON s.id = o.seller_id
                 WHERE o.conversation_id = ?
                 ORDER BY o.created_at DESC`,
                [conversationId]
            );
            return res.json({ success: true, offers });
        }

        return res.status(400).json({ success: false, message: 'conversation_id or id is required' });
    } catch (err) { next(err) }
});

app.post('/api/offers.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const me = auth.customerId;
        const { action } = req.body;

        if (action === 'create') {
            const conversationId = parseInt(req.body.conversation_id, 10);
            const quantity = parseFloat(req.body.quantity);
            const unitPrice = parseFloat(req.body.unit_price);
            const deliveryLocation = (req.body.delivery_location || '').toString().trim();
            const deliveryDate = req.body.delivery_date || null;
            const note = (req.body.note || '').toString().trim();

            if (!conversationId || !quantity || !unitPrice) {
                return res.json({ success: false, message: 'conversation_id, quantity, and unit_price are required' });
            }

            const [part] = await pool.query(
                'SELECT customer_id, role FROM conversation_participants WHERE conversation_id = ? AND customer_id = ?',
                [conversationId, me]
            );
            if (part.length === 0) return res.status(403).json({ success: false, message: 'Not a participant in this conversation' });

            const conv = await pool.query('SELECT seller_id, buyer_id, product_id, order_id FROM conversations WHERE id = ?', [conversationId]);
            const convData = conv[0][0];

            // Determine seller and buyer
            let sellerId = convData.seller_id;
            let buyerId = convData.buyer_id;

            if (!sellerId || !buyerId) {
                // Fall back to participant roles
                const [participants] = await pool.query(
                    `SELECT customer_id, role FROM conversation_participants WHERE conversation_id = ?`,
                    [conversationId]
                );
                if (participants.length < 2) return res.json({ success: false, message: 'Conversation must have two participants' });

                if (!sellerId) {
                    const sellerPart = participants.find((p) => p.role === 'seller');
                    sellerId = sellerPart ? sellerPart.customer_id : null;
                }
                if (!buyerId) {
                    const buyerPart = participants.find((p) => p.role === 'buyer');
                    buyerId = buyerPart ? buyerPart.customer_id : participants.find((p) => p.customer_id !== sellerId)?.customer_id || null;
                }
            }

            if (!sellerId || !buyerId) {
                return res.json({ success: false, message: 'Could not determine buyer/seller roles' });
            }

            // The offer creator is the buyer; seller creates counter-offers
            const isBuyer = me === buyerId;
            const offerBuyerId = isBuyer ? me : buyerId;
            const offerSellerId = isBuyer ? sellerId : me;

            const totalPrice = quantity * unitPrice;
            const [result] = await pool.query(
                `INSERT INTO offers (conversation_id, product_id, order_id, buyer_id, seller_id,
                    quantity, unit_price, total_price, delivery_location, delivery_date, note, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
                [conversationId, convData.product_id, convData.order_id, offerBuyerId, offerSellerId,
                 quantity, unitPrice, totalPrice, deliveryLocation, deliveryDate, note]
            );

            // Create a system message linking to the offer
            const messageText = isBuyer
                ? `Offer: ${quantity} x TZS ${unitPrice.toLocaleString()} = TZS ${totalPrice.toLocaleString()}`
                : `Counter offer: ${quantity} x TZS ${unitPrice.toLocaleString()} = TZS ${totalPrice.toLocaleString()}`;
            const [msgIns] = await pool.query(
                'INSERT INTO messages (conversation_id, sender_id, recipient_id, content, message_type, offer_id) VALUES (?, ?, ?, ?, ?, ?)',
                [conversationId, me, offerSellerId === me ? offerBuyerId : offerSellerId, messageText, 'offer', result.insertId]
            );
            await pool.query(
                'UPDATE conversations SET last_message_preview = ?, last_message_at = NOW(), updated_at = NOW() WHERE id = ?',
                [messageText.slice(0, 240), conversationId]
            );

            realtime.publishMessage(offerSellerId === me ? offerBuyerId : offerSellerId, { type: 'offer', offer_id: result.insertId, conversation_id: conversationId, sender_id: me });
            res.json({ success: true, offer_id: result.insertId, message: messageText, message_id: msgIns.insertId });
        }

        if (action === 'update') {
            const offerId = parseInt(req.body.offer_id, 10);
            const newStatus = req.body.status;
            const counterOffer = req.body.counter_offer;

            if (!offerId || !newStatus) {
                return res.json({ success: false, message: 'offer_id and status are required' });
            }

            const [offerRows] = await pool.query(
                `SELECT o.*, c.seller_id, c.buyer_id FROM offers o JOIN conversations c ON c.id = o.conversation_id WHERE o.id = ?`,
                [offerId]
            );
            if (offerRows.length === 0) return res.json({ success: false, message: 'Offer not found' });
            const offerData = offerRows[0];

            // Authorization: buyer can only act on counter-offers, seller on pending offers
            if (me !== offerData.buyer_id && me !== offerData.seller_id) {
                return res.status(403).json({ success: false, message: 'Not authorized to update this offer' });
            }
            if (me === offerData.buyer_id && offerData.status !== 'countered') {
                return res.json({ success: false, message: 'Only pending offers (awaiting your response) can be updated' });
            }
            if (me === offerData.seller_id && offerData.status !== 'pending') {
                return res.json({ success: false, message: 'Only pending or countered offers can be updated' });
            }

            if (newStatus === 'countered' && counterOffer) {
                const [newOffer] = await pool.query(
                    `INSERT INTO offers (conversation_id, buyer_id, seller_id, quantity, unit_price, total_price,
                        delivery_location, delivery_date, note, status, parent_offer_id)
                     SELECT c.id, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?
                     FROM conversations c WHERE c.id = (SELECT conversation_id FROM offers WHERE id = ?)`,
                    [
                        me === offerData.seller_id ? offerData.buyer_id : offerData.seller_id,
                        me,
                        counterOffer.quantity, counterOffer.unit_price,
                        counterOffer.quantity * counterOffer.unit_price,
                        counterOffer.delivery_location || offerData.delivery_location,
                        counterOffer.delivery_date || offerData.delivery_date,
                        counterOffer.note || '',
                        offerId,
                    ]
                );

                await pool.query('UPDATE offers SET status = ? WHERE id = ?', ['countered', offerId]);

                const [newOfferData] = await pool.query(
                    `SELECT o.*, b.full_name AS buyer_name, s.full_name AS seller_name
                     FROM offers o JOIN customers b ON b.id = o.buyer_id JOIN customers s ON s.id = o.seller_id
                     WHERE o.id = ?`,
                    [newOffer.insertId]
                );
                const recipientId = me === offerData.seller_id ? offerData.buyer_id : offerData.seller_id;
                realtime.publishMessage(recipientId, { type: 'offer_update', offer_id: newOffer.insertId, conversation_id: offerData.conversation_id, sender_id: me, status: 'pending' });
                return res.json({ success: true, offer: newOfferData[0], original_offer_id: offerId });
            }

            await pool.query('UPDATE offers SET status = ?, updated_at = NOW() WHERE id = ?', [newStatus, offerId]);

            // Create a system message for status change
            if (newStatus === 'accepted' && offerData.product_id) {
                // Create an order from the accepted offer
                const orderNumber = 'ORD-' + Date.now().toString().slice(-6);
                const [orderResult] = await pool.query(
                    `INSERT INTO orders (order_number, customer_id, total_amount, status, payment_method, shipping_address)
                     VALUES (?, ?, ?, 'pending', 'cash_on_delivery', ?)`,
                    [orderNumber, offerData.buyer_id, offerData.total_price, offerData.delivery_location || '']
                );
                const orderId = orderResult.insertId;

                await pool.query(
                    `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
                     SELECT ?, product_id, quantity, unit_price, total_price FROM offers WHERE id = ?`,
                    [orderId, offerId]
                );

                await pool.query('UPDATE offers SET order_id = ? WHERE id = ?', [orderId, offerId]);

                // System message with order link
                await pool.query(
                    'INSERT INTO messages (conversation_id, sender_id, recipient_id, content, message_type, order_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [offerData.conversation_id, me, me === offerData.seller_id ? offerData.buyer_id : offerData.seller_id,
                     `Order #${orderNumber} created from accepted offer. Total: TZS ${Number(offerData.total_price).toLocaleString()}. Delivery to: ${offerData.delivery_location || 'TBD'}`,
                     'system', orderId]
                );

                realtime.publishOrders(offerData.buyer_id, { type: 'order_created', order_id: orderId });
                realtime.publishOrders(offerData.seller_id, { type: 'order_created', order_id: orderId });

                res.json({ success: true, message: 'Offer accepted! Order created.', order_id: orderId });
            } else {
                let msg = '';
                if (newStatus === 'rejected') {
                    msg = `Offer was rejected.`;
                } else if (newStatus === 'accepted') {
                    msg = `Offer accepted!`;
                }
                if (msg) {
                    await pool.query(
                        'INSERT INTO messages (conversation_id, sender_id, recipient_id, content, message_type) VALUES (?, ?, ?, ?, ?)',
                        [offerData.conversation_id, me, me === offerData.seller_id ? offerData.buyer_id : offerData.seller_id, msg, 'system']
                    );
                }
                realtime.publishMessage(me === offerData.seller_id ? offerData.buyer_id : offerData.seller_id, {
                    type: 'offer_update', offer_id: offerId, conversation_id: offerData.conversation_id, sender_id: me, status: newStatus
                });
                res.json({ success: true, message: 'Offer updated' });
            }
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (err) { next(err) }
});

// ============ CHAT: REPORTS API ============

app.post('/api/message_reports.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const me = auth.customerId;
        const { action } = req.body;

        if (action === 'create') {
            const messageId = parseInt(req.body.message_id, 10);
            const category = req.body.category;
            const description = (req.body.description || '').toString().trim();

            if (!messageId || !category) {
                return res.json({ success: false, message: 'message_id and category are required' });
            }

            const validCategories = ['spam', 'scam', 'harassment', 'fraud', 'suspicious_payment', 'prohibited_contact', 'inappropriate', 'other'];
            if (!validCategories.includes(category)) {
                return res.json({ success: false, message: 'Invalid category' });
            }

            // Verify the user has access to this message's conversation
            const [msg] = await pool.query(
                `SELECT m.id, m.conversation_id FROM messages m
                 JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
                 WHERE m.id = ? AND cp.customer_id = ?`,
                [messageId, me]
            );
            if (msg.length === 0) return res.status(403).json({ success: false, message: 'Message not found or not accessible' });

            await pool.query(
                `INSERT INTO message_reports (message_id, reporter_id, conversation_id, category, description, status)
                 VALUES (?, ?, ?, ?, ?, 'pending')`,
                [messageId, me, msg[0].conversation_id, category, description]
            );

            res.json({ success: true, message: 'Report submitted' });
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (err) { next(err) }
});

// ============ CHAT: BLOCKS API ============

app.get('/api/blocks.php', async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const me = auth.customerId;

        if (req.query.action === 'check') {
            const targetId = parseInt(req.query.user_id, 10);
            if (!targetId) return res.json({ success: false, message: 'user_id is required' });

            const [rows] = await pool.query(
                `SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`,
                [me, targetId, targetId, me]
            );
            return res.json({ success: true, is_blocked: rows.length > 0 });
        }

        if (req.query.action === 'list') {
            const [rows] = await pool.query(
                `SELECT b.id, b.blocked_id, b.created_at, c.full_name, c.role, c.business_name
                 FROM user_blocks b
                 JOIN customers c ON c.id = b.blocked_id
                 WHERE b.blocker_id = ?
                 ORDER BY b.created_at DESC`,
                [me]
            );
            return res.json({ success: true, blocks: rows });
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (err) { next(err) }
});

app.post('/api/blocks.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const me = auth.customerId;
        const { action } = req.body;

        if (action === 'block') {
            const blockedId = parseInt(req.body.user_id, 10);
            if (!blockedId) return res.json({ success: false, message: 'user_id is required' });
            if (blockedId === me) return res.json({ success: false, message: 'You cannot block yourself' });

            const [target] = await pool.query('SELECT id FROM customers WHERE id = ? AND is_active = 1', [blockedId]);
            if (target.length === 0) return res.json({ success: false, message: 'User not found' });

            await pool.query(
                'INSERT IGNORE INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?)',
                [me, blockedId]
            );
            return res.json({ success: true, message: 'User blocked' });
        }

        if (action === 'unblock') {
            const blockedId = parseInt(req.body.user_id, 10);
            if (!blockedId) return res.json({ success: false, message: 'user_id is required' });

            await pool.query('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?', [me, blockedId]);
            return res.json({ success: true, message: 'User unblocked' });
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (err) { next(err) }
});

// ============ ADMIN: CHAT MODERATION API ============

app.get('/api/admin/chat_moderation.php', async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { action } = req.query;

        if (!['superadmin', 'marketplace_admin', 'admin'].includes(auth.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        if (action === 'stats') {
            const [stats] = await pool.query(
                `SELECT violation_type, COUNT(*) as count, severity
                 FROM chat_moderation_events
                 WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                 GROUP BY violation_type, severity
                 ORDER BY count DESC`
            );

            const [totalBlocked] = await pool.query(
                'SELECT COUNT(*) as count FROM chat_moderation_events WHERE action_taken = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
                ['blocked']
            );

            const [restricted] = await pool.query(
                'SELECT COUNT(*) as count FROM chat_restrictions WHERE is_permanent = 0 OR restricted_until > NOW()'
            );

            const [reported] = await pool.query(
                "SELECT COUNT(*) as count FROM message_reports WHERE status = 'pending'"
            );

            return res.json({
                success: true,
                stats,
                total_blocked: totalBlocked[0]?.count || 0,
                restricted_users: restricted[0]?.count || 0,
                pending_reports: reported[0]?.count || 0,
            });
        }

        if (action === 'events') {
            const page = parseInt(req.query.page || '1', 10);
            const limit = parseInt(req.query.limit || '50', 10);
            const offset = (page - 1) * limit;

            let sql = `SELECT e.id, e.violation_type, e.severity, e.detection_method,
                              e.original_message, e.created_at,
                              u.id AS user_id, u.full_name, u.email, u.role,
                              c.id AS conversation_id
                       FROM chat_moderation_events e
                       JOIN customers u ON u.id = e.user_id
                       LEFT JOIN conversations c ON c.id = e.conversation_id
                       WHERE 1=1`;
            const params = [];

            if (req.query.violation_type) {
                sql += ' AND e.violation_type = ?';
                params.push(req.query.violation_type);
            }
            if (req.query.severity) {
                sql += ' AND e.severity = ?';
                params.push(req.query.severity);
            }

            sql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [rows] = await pool.query(sql, params);
            return res.json({ success: true, events: rows, page, limit });
        }

        if (action === 'reported_messages') {
            const page = parseInt(req.query.page || '1', 10);
            const limit = parseInt(req.query.limit || '50', 10);
            const offset = (page - 1) * limit;
            const statusFilter = req.query.status;

            let sql = `SELECT r.id, r.category, r.description, r.status, r.created_at,
                              m.id AS message_id, m.content, m.created_at AS message_created_at,
                              rep.id AS reporter_id, rep.full_name AS reporter_name,
                              tgt.id AS target_id, tgt.full_name AS target_name
                       FROM message_reports r
                       JOIN messages m ON m.id = r.message_id
                       JOIN customers rep ON rep.id = r.reporter_id
                       JOIN customers tgt ON tgt.id = m.sender_id
                       WHERE 1=1`;
            const params = [];
            if (statusFilter) {
                sql += ' AND r.status = ?';
                params.push(statusFilter);
            }
            sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [rows] = await pool.query(sql, params);
            return res.json({ success: true, reports: rows, page, limit });
        }

        if (action === 'user_warnings') {
            const userId = parseInt(req.query.user_id, 10);
            if (userId) {
                const [rows] = await pool.query(
                    `SELECT e.id, e.violation_type, e.severity, e.detection_method, e.original_message, e.created_at
                     FROM chat_moderation_events e
                     WHERE e.user_id = ?
                     ORDER BY e.created_at DESC
                     LIMIT 50`,
                    [userId]
                );
                const [stats] = await pool.query(
                    'SELECT warning_count, restriction_count, moderation_status, restricted_until FROM chat_user_stats WHERE user_id = ?',
                    [userId]
                );
                const [restrictions] = await pool.query(
                    'SELECT id, reason, restricted_until, is_permanent, created_at FROM chat_restrictions WHERE user_id = ? ORDER BY created_at DESC',
                    [userId]
                );
                return res.json({
                    success: true,
                    events: rows,
                    stats: stats[0] || null,
                    restrictions,
                });
            }

            const [rows] = await pool.query(
                `SELECT u.id, u.full_name, u.email, u.role, s.warning_count, s.restriction_count,
                        s.moderation_status, s.restricted_until, s.last_violation_at
                 FROM chat_user_stats s
                 JOIN customers u ON u.id = s.user_id
                 WHERE s.warning_count > 0 OR s.moderation_status != 'good'
                 ORDER BY s.last_violation_at DESC
                 LIMIT 100`
            );
            return res.json({ success: true, users: rows });
        }

        if (action === 'lift_restriction') {
            const userId = parseInt(req.body.user_id, 10);
            if (!userId) return res.json({ success: false, message: 'user_id is required' });

            await pool.query(
                'UPDATE chat_restrictions SET is_permanent = 0, restricted_until = NOW(), lifted_by = ? WHERE user_id = ? AND (is_permanent = 0 OR restricted_until > NOW())',
                [auth.customerId, userId]
            );
            await pool.query(
                "UPDATE chat_user_stats SET moderation_status = 'good', restricted_until = NULL, restriction_reason = NULL WHERE user_id = ?",
                [userId]
            );
            await pool.query(
                'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
                [auth.customerId, 'lifted_restriction', `Lifted chat restriction for user ${userId}`]
            );
            return res.json({ success: true, message: 'Restriction lifted' });
        }

        if (action === 'settings') {
            const [rows] = await pool.query('SELECT setting_key, setting_value FROM chat_moderation_settings ORDER BY setting_key');
            const settings = {}
            rows.forEach(r => { settings[r.setting_key] = r.setting_value })
            return res.json({ success: true, settings });
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (err) { next(err) }
});

// ============ ADMIN: CHAT MODERATION - POST (report resolution, settings) ============

app.post('/api/admin/chat_moderation.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        if (!['superadmin', 'marketplace_admin', 'admin'].includes(auth.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        const { action } = req.body;

        if (action === 'resolve_report') {
            const reportId = parseInt(req.body.report_id, 10);
            const status = req.body.status;
            const adminNotes = (req.body.admin_notes || '').toString().trim();

            const validStatuses = ['reviewed', 'action_taken', 'dismissed'];
            if (!reportId || !validStatuses.includes(status)) {
                return res.json({ success: false, message: 'report_id and valid status are required (reviewed, action_taken, dismissed)' });
            }

            const [existing] = await pool.query(
                'SELECT r.id, r.message_id, r.user_id FROM message_reports r WHERE r.id = ?',
                [reportId]
            );
            if (existing.length === 0) {
                return res.json({ success: false, message: 'Report not found' });
            }

            // If action_taken, mark the message as DELETED
            if (status === 'action_taken') {
                await pool.query("UPDATE messages SET status = 'DELETED', content = '[deleted]' WHERE id = ?", [existing[0].message_id]);
            }

            await pool.query(
                'UPDATE message_reports SET status = ?, reviewed_by = ?, reviewed_at = NOW(), admin_notes = ? WHERE id = ?',
                [status, auth.customerId, adminNotes, reportId]
            );

            await pool.query(
                'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
                [auth.customerId, 'resolve_report', `Report #${reportId} resolved: ${status}`]
            );

            return res.json({ success: true, message: 'Report resolved' });
        }

        if (action === 'update_settings') {
            const settings = req.body.settings;
            if (!settings || typeof settings !== 'object') {
                return res.json({ success: false, message: 'settings object is required' });
            }

            const validKeys = [
              'contact_protection_enabled', 'url_protection_enabled', 'payment_protection_enabled',
              'max_message_length', 'messages_per_minute', 'warning_threshold', 'restriction_threshold',
              'restriction_duration_hours', 'allowed_domains', 'allowed_file_types', 'max_attachment_size_mb',
            ];

            for (const [key, value] of Object.entries(settings)) {
                if (validKeys.includes(key)) {
                    await pool.query(
                        'UPDATE chat_moderation_settings SET setting_value = ? WHERE setting_key = ?',
                        [String(value), key]
                    );
                }
            }

            // Clear settings cache by resetting it
            require('./services/chatModerationService').loadSettings(pool);

            await pool.query(
                'INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)',
                [auth.customerId, 'update_chat_settings', 'Updated chat moderation settings']
            );

            return res.json({ success: true, message: 'Settings updated' });
        }

        return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (err) { next(err) }
});

async function ensureEscrowColumns() {
  const cols = [
    'ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS buyer_name VARCHAR(255)',
    'ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS seller_name VARCHAR(255)',
    'ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS product TEXT',
    'ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT \'TZS\'',
    'ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS notes TEXT',
    'ALTER TABLE escrow_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  ]
  for (const sql of cols) {
    try { await pool.query(sql) } catch { /* column may already exist */ }
  }
}

app.get('/api/escrow.php', async (req, res, next) => {
  try {
    const auth = extractAuthUser(req)
    if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' })

    await ensureEscrowColumns()

    const { id, status, buyer_id } = req.query
    if (id) {
      const [[rows]] = await pool.query(
        'SELECT id, order_id, buyer_id, seller_id, buyer_name, seller_name, product, amount, escrow_fee, status, currency, created_at, released_at FROM escrow_transactions WHERE id = ?',
        [id]
      )
      if (rows.length === 0) return res.json({ success: false, message: 'Escrow transaction not found' })
      return res.json({ success: true, transaction: rows[0] })
    }

    let sql = 'SELECT id, order_id, buyer_id, seller_id, buyer_name, seller_name, product, amount, escrow_fee, status, currency, created_at, released_at FROM escrow_transactions WHERE 1=1'
    const params = []
    if (status) { sql += ' AND status = ?'; params.push(status) }
    if (buyer_id) { sql += ' AND buyer_id = ?'; params.push(buyer_id) }
    if (auth.role === 'customer') { sql += ' AND (buyer_id = ? OR seller_id = ?)'; params.push(auth.customerId, auth.customerId) }
    sql += ' ORDER BY created_at DESC LIMIT 50'

    const [rows] = await pool.query(sql, params)
    res.json({ success: true, transactions: rows })
  } catch (err) { next(err) }
})

app.post('/api/escrow.php', csrfProtection, validateRequired(['action']), async (req, res, next) => {
  try {
    const auth = extractAuthUser(req)
    if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' })

    await ensureEscrowColumns()

    const { action } = req.body
    if (action === 'create') {
       const { buyer_name, seller_name, product, amount, currency = 'TZS', order_id } = req.body
       if (!buyer_name || !seller_name || !product || !amount) {
         return res.json({ success: false, message: 'Missing required fields: buyer_name, seller_name, product, amount' })
       }
       // Resolve the real seller from the order when provided; otherwise default to
       // the buyer (standalone escrow) so escrow is never credited to the buyer.
       let sellerId = auth.customerId
       if (order_id) {
         const [orderRows] = await pool.query(
           'SELECT customer_id FROM orders WHERE id = ? OR order_number = ?',
           [order_id, order_id]
         )
         if (orderRows.length > 0) sellerId = orderRows[0].customer_id
       }
       const feeRate = 0.02
       const escrowFee = Number(amount) * feeRate
       const [result] = await pool.query(
         'INSERT INTO escrow_transactions (order_id, buyer_id, seller_id, buyer_name, seller_name, product, amount, escrow_fee, currency, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
         [order_id || null, auth.customerId, sellerId, buyer_name, seller_name, product, amount, escrowFee, currency, 'held']
       )
       return res.json({ success: true, transaction_id: result.insertId, message: 'Escrow transaction created' })
    }

    return res.status(400).json({ success: false, message: 'Invalid action' })
  } catch (err) { next(err) }
})

app.post('/api/escrow.php/:id/release', csrfProtection, async (req, res, next) => {
  try {
    const auth = extractAuthUser(req)
    if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' })
    await ensureEscrowColumns()

    const { id } = req.params
    const { notes = '' } = req.body
    const [[existing]] = await pool.query('SELECT status FROM escrow_transactions WHERE id = ?', [id])
    if (existing.length === 0) return res.json({ success: false, message: 'Transaction not found' })
    if (existing[0].status !== 'held' && existing[0].status !== 'shipped') {
      return res.json({ success: false, message: `Cannot release transaction in ${existing[0].status} status` })
    }

    await pool.query(
      'UPDATE escrow_transactions SET status = ?, notes = ?, updated_at = NOW(), released_at = NOW() WHERE id = ?',
      ['released', notes, id]
    )
    res.json({ success: true, message: 'Escrow released to seller' })
  } catch (err) { next(err) }
})

app.post('/api/escrow.php/:id/refund', csrfProtection, async (req, res, next) => {
  try {
    const auth = extractAuthUser(req)
    if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' })
    await ensureEscrowColumns()

    const { id } = req.params
    const { notes = '' } = req.body
    const [[existing]] = await pool.query('SELECT status FROM escrow_transactions WHERE id = ?', [id])
    if (existing.length === 0) return res.json({ success: false, message: 'Transaction not found' })
    if (existing[0].status === 'refunded' || existing[0].status === 'completed') {
      return res.json({ success: false, message: `Cannot refund transaction in ${existing[0].status} status` })
    }

    await pool.query(
      'UPDATE escrow_transactions SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?',
      ['refunded', notes, id]
    )
    res.json({ success: true, message: 'Escrow refunded to buyer' })
  } catch (err) { next(err) }
})

app.post('/api/escrow.php/:id/dispute', csrfProtection, async (req, res, next) => {
  try {
    const auth = extractAuthUser(req)
    if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' })
    await ensureEscrowColumns()

    const { id } = req.params
    const { reason = '' } = req.body
    const [[existing]] = await pool.query('SELECT status, buyer_id FROM escrow_transactions WHERE id = ?', [id])
    if (existing.length === 0) return res.json({ success: false, message: 'Transaction not found' })
    if (existing[0].status === 'refunded' || existing[0].status === 'completed' || existing[0].status === 'cancelled') {
      return res.json({ success: false, message: `Cannot dispute transaction in ${existing[0].status} status` })
    }

    await pool.query(
      'UPDATE escrow_transactions SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?',
      ['disputed', reason, id]
    )
    res.json({ success: true, message: 'Dispute filed for escrow transaction' })
  } catch (err) { next(err) }
})

app.post('/api/escrow.php/:id/cancel', csrfProtection, async (req, res, next) => {
  try {
    const auth = extractAuthUser(req)
    if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' })
    await ensureEscrowColumns()

    const { id } = req.params
    const { reason = '' } = req.body
    const [[existing]] = await pool.query('SELECT status FROM escrow_transactions WHERE id = ?', [id])
    if (existing.length === 0) return res.json({ success: false, message: 'Transaction not found' })
    if (existing[0].status !== 'held') {
      return res.json({ success: false, message: 'Can only cancel transactions in held status' })
    }

    await pool.query(
      'UPDATE escrow_transactions SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', reason, id]
    )
    res.json({ success: true, message: 'Escrow transaction cancelled' })
  } catch (err) { next(err) }
})

// ============ SSE ENDPOINTS ============

app.get('/api/messages_realtime.php', async (req, res) => {
    const { customer_id } = req.query
    if (!customer_id) {
        return res.status(400).json({ success: false, message: 'customer_id is required' })
    }

    // Set headers + subscribe FIRST, then query DB
    realtime.setupSSE(res, [
        { channel: realtime.CHANNELS.messages(customer_id) }
    ])

    try {
        const [rows] = await pool.query(
            `SELECT m.id, m.conversation_id, m.sender_id, m.recipient_id, m.content,
                    m.is_read, m.created_at, m.message_type, m.status,
                    s.full_name AS sender_name
             FROM messages m
             JOIN customers s ON s.id = m.sender_id
             WHERE m.recipient_id = ? AND m.is_read = 0
             ORDER BY m.created_at DESC
             LIMIT 20`,
            [customer_id]
        )
        res.write(`data: ${JSON.stringify({ success: true, messages: rows, unread_count: rows.length })}\n\n`)
    } catch (err) {
        res.write(`data: ${JSON.stringify({ success: false, message: err.message })}\n\n`)
    }
})

app.get('/api/notifications_realtime.php', async (req, res) => {
    const { customer_id } = req.query
    if (!customer_id) {
        return res.status(400).json({ success: false, message: 'customer_id is required' })
    }

    realtime.setupSSE(res, [
        { channel: realtime.CHANNELS.notifications(customer_id) }
    ])

    try {
        const [notifications] = await pool.query(
            'SELECT id, title, message, type, is_read, created_at FROM notifications WHERE customer_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 10',
            [customer_id]
        )
        res.write(`data: ${JSON.stringify({ type: 'unread_count', unread_count: notifications.length, notifications })}\n\n`)
    } catch (err) {
        res.write(`data: ${JSON.stringify({ success: false, message: err.message })}\n\n`)
    }
})

app.get('/api/cart_realtime.php', async (req, res) => {
    const { customer_id } = req.query
    if (!customer_id) {
        return res.status(400).json({ success: false, message: 'customer_id is required' })
    }

    realtime.setupSSE(res, [
        { channel: realtime.CHANNELS.cart(customer_id) }
    ])

    try {
        const [cartItems] = await pool.query(
            'SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.image_url FROM cart c JOIN products p ON c.product_id = p.id WHERE c.customer_id = ?',
            [customer_id]
        )
        const [[total]] = await pool.query(
            'SELECT COALESCE(SUM(c.quantity * p.price), 0) as total FROM cart c JOIN products p ON c.product_id = p.id WHERE c.customer_id = ?',
            [customer_id]
        )
        res.write(`data: ${JSON.stringify({ type: 'cart_update', success: true, items: cartItems, totalItems: cartItems.length, totalAmount: parseFloat(total.total) })}\n\n`)
    } catch (err) {
        res.write(`data: ${JSON.stringify({ success: false, message: err.message })}\n\n`)
    }
})  // end cart_realtime.php

// ============ BULK PROCUREMENT REALTIME ============
app.get('/api/bulk_procurement_realtime.php', async (req, res) => {
  const { token, request_id } = req.query
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const channels = []

    // User-specific channel
    channels.push({ channel: `realtime:bulk_procurement:${decoded.customerId}` })

    // Request-specific channel if provided
    if (request_id) {
      channels.push({ channel: `realtime:bulk_procurement:request:${request_id}` })
    }

    realtime.setupSSE(res, channels)
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
})

// ============ CART ============

async function publishCartUpdate(customerId) {
  try {
    const [cartItems] = await pool.query(
      'SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.image_url FROM cart c JOIN products p ON c.product_id = p.id WHERE c.customer_id = ?',
      [customerId]
    )
    const [[total]] = await pool.query(
      'SELECT COALESCE(SUM(c.quantity * p.price), 0) as total FROM cart c JOIN products p ON c.product_id = p.id WHERE c.customer_id = ?',
      [customerId]
    )
    realtime.publishCart(customerId, { items: cartItems, totalItems: cartItems.length, totalAmount: parseFloat(total.total) })
  } catch (err) { console.error('publishCartUpdate error:', err.message) }
}

app.get('/api/cart.php', async (req, res) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const [items] = await pool.query(
            `SELECT c.id, c.product_id, c.quantity, p.name, p.price, p.image_url
             FROM cart c JOIN products p ON c.product_id = p.id
             WHERE c.customer_id = ? ORDER BY c.created_at DESC`,
            [auth.customerId]
        );

        const cart = items.map(item => ({
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            name: item.name,
            price: parseFloat(item.price),
            image_url: item.image_url,
        }));

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        res.json({ success: true, cart, totalItems, totalAmount });
} catch (err) { next(err) }
  });

app.post('/api/cart.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { action } = req.body;

        if (action === 'add') {
            const { product_id, quantity } = req.body;
            const [existing] = await pool.query(
                'SELECT id FROM cart WHERE customer_id = ? AND product_id = ?',
                [auth.customerId, product_id]
            );
            if (existing.length > 0) {
                await pool.query(
                    'UPDATE cart SET quantity = quantity + ? WHERE customer_id = ? AND product_id = ?',
                    [quantity || 1, auth.customerId, product_id]
                );
            } else {
                await pool.query(
                    'INSERT INTO cart (customer_id, product_id, quantity) VALUES (?, ?, ?)',
                    [auth.customerId, product_id, quantity || 1]
                );
            }
            await publishCartUpdate(auth.customerId)
            return res.json({ success: true, message: 'Added to cart' });
        }

        if (action === 'update') {
            const { product_id, quantity } = req.body;
            await pool.query(
                'UPDATE cart SET quantity = ? WHERE customer_id = ? AND product_id = ?',
                [quantity, auth.customerId, product_id]
            );
            await publishCartUpdate(auth.customerId)
            return res.json({ success: true, message: 'Cart updated' });
        }

        if (action === 'remove') {
            const { product_id } = req.body;
            await pool.query('DELETE FROM cart WHERE customer_id = ? AND product_id = ?', [auth.customerId, product_id]);
            await publishCartUpdate(auth.customerId)
            return res.json({ success: true, message: 'Removed from cart' });
        }

        if (action === 'clear') {
            await pool.query('DELETE FROM cart WHERE customer_id = ?', [auth.customerId]);
            await publishCartUpdate(auth.customerId)
            return res.json({ success: true, message: 'Cart cleared' });
        }

        res.json({ success: false, message: 'Invalid action' });
} catch (err) { next(err) }
  });

// ============ ORDERS ============

async function publishOrderUpdate(customerId, payload = {}) {
  try {
    realtime.publishOrders(customerId, payload)
  } catch (err) { console.error('publishOrderUpdate error:', err.message) }
}

app.get('/api/orders.php', async (req, res) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { action, id, order_number, customer_id, user_id } = req.query;

        if (action === 'get_user_stats' && user_id) {
            const [[totalOrders]] = await pool.query('SELECT COUNT(*) as total FROM orders WHERE customer_id = ?', [user_id]);
            const [[totalSpent]] = await pool.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE customer_id = ? AND status != 'cancelled'", [user_id]);
            const [[pendingOrders]] = await pool.query("SELECT COUNT(*) as total FROM orders WHERE customer_id = ? AND status IN ('pending', 'processing')", [user_id]);
            const [[completedOrders]] = await pool.query("SELECT COUNT(*) as total FROM orders WHERE customer_id = ? AND status = 'delivered'", [user_id]);

            return res.json({
                success: true,
                stats: {
                    total_orders: totalOrders.total,
                    total_spent: parseFloat(totalSpent.total),
                    pending_orders: pendingOrders.total,
                    completed_orders: completedOrders.total,
                }
            });
        }

        if (action === 'get_seller_stats' && user_id) {
            const [[totalProducts]] = await pool.query('SELECT COUNT(*) as total FROM products WHERE seller_id = ? AND is_active = 1', [user_id]);
            const [[totalSales]] = await pool.query(
                `SELECT COALESCE(SUM(oi.total_price), 0) as total, COUNT(DISTINCT o.id) as orders
                 FROM orders o
                 JOIN order_items oi ON o.id = oi.order_id
                 JOIN products p ON oi.product_id = p.id
                 WHERE p.seller_id = ? AND o.status != 'cancelled'`,
                [user_id]
            );
            const [[avgRating]] = await pool.query('SELECT COALESCE(AVG(rating), 0) as avg FROM reviews r JOIN products p ON r.product_id = p.id WHERE p.seller_id = ?', [user_id]);
            const [[pendingOrders]] = await pool.query(
                `SELECT COUNT(DISTINCT o.id) as total FROM orders o
                 JOIN order_items oi ON o.id = oi.order_id
                 JOIN products p ON oi.product_id = p.id
                 WHERE p.seller_id = ? AND o.status IN ('pending', 'processing')`,
                [user_id]
            );

            return res.json({
                success: true,
                stats: {
                    total_products: totalProducts.total,
                    total_sales: parseFloat(totalSales.total),
                    total_orders: totalSales.orders,
                    average_rating: parseFloat(avgRating.avg),
                    pending_orders: pendingOrders.total,
                }
            });
        }

        if (action === 'get_seller_orders' && user_id) {
            const [orders] = await pool.query(
                `SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_method, o.created_at,
                         c.full_name as customer_name
                  FROM orders o
                  JOIN order_items oi ON o.id = oi.order_id
                  JOIN products p ON oi.product_id = p.id
                  JOIN customers c ON o.customer_id = c.id
                  WHERE p.seller_id = ?
                  GROUP BY o.id
                  ORDER BY o.created_at DESC
                  LIMIT 10`,
                [user_id]
            );
            return res.json({ success: true, orders });
        }

        if (action === 'get_seller_products' && user_id) {
            const [products] = await pool.query(
                `SELECT p.id, p.name, p.price, p.image_url, p.stock_quantity,
                         COUNT(oi.id) as sales_count, COALESCE(SUM(oi.total_price), 0) as revenue
                  FROM products p
                  LEFT JOIN order_items oi ON p.id = oi.product_id
                  WHERE p.seller_id = ?
                  GROUP BY p.id
                  ORDER BY revenue DESC
                  LIMIT 10`,
                [user_id]
            );
            return res.json({ success: true, products });
        }

        if (order_number) {
            const [orders] = await pool.query(
                `SELECT o.id, o.order_number, o.customer_id, o.total_amount, o.status, o.payment_method,
                        o.payment_status, o.shipping_address, o.created_at, o.updated_at,
                        o.requested_quantity, o.product_type, o.fulfillment_status
                 FROM orders o WHERE o.order_number = ? AND o.customer_id = ?`,
                [order_number, auth.customerId]
            );
            if (orders.length === 0) return res.json({ success: false, message: 'Order not found' });

            const order = orders[0];
            const [orderItems] = await pool.query(
                `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
                        p.name, p.image_url, oi.seller_id
                 FROM order_items oi JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = orderItems;

            // Fetch fulfillments if multi-seller
            if (order.fulfillment_status && order.fulfillment_status !== 'pending') {
                const [fills] = await pool.query(
                    `SELECT f.id, f.seller_id, f.quantity, f.unit_price, f.total_price, f.status,
                            c.full_name AS seller_name
                     FROM order_fulfillments f
                     JOIN customers c ON c.id = f.seller_id
                     WHERE f.parent_order_id = ?
                     ORDER BY f.created_at ASC`,
                    [order.id]
                );
                order.fulfillments = fills;
            }
            return res.json({ success: true, order });
        }

        const cid = customer_id || auth.customerId;
        if (id) {
            const [orders] = await pool.query(
                `SELECT o.id, o.order_number, o.customer_id, o.total_amount, o.status, o.payment_method,
                        o.payment_status, o.shipping_address, o.created_at, o.updated_at,
                        o.requested_quantity, o.product_type, o.fulfillment_status
                 FROM orders o WHERE o.id = ? AND o.customer_id = ?`,
                [id, auth.customerId]
            );
            if (orders.length === 0) return res.json({ success: false, message: 'Order not found' });
            const order = orders[0];

            const [orderItems] = await pool.query(
                `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
                        p.name, p.image_url, oi.seller_id
                 FROM order_items oi JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = orderItems;

            if (order.fulfillment_status && order.fulfillment_status !== 'pending') {
                const [fills] = await pool.query(
                    `SELECT f.id, f.seller_id, f.quantity, f.unit_price, f.total_price, f.status,
                            c.full_name AS seller_name
                     FROM order_fulfillments f
                     JOIN customers c ON c.id = f.seller_id
                     WHERE f.parent_order_id = ?
                     ORDER BY f.created_at ASC`,
                    [order.id]
                );
                order.fulfillments = fills;
            }
            return res.json({ success: true, order });
        }

const [rows] = await pool.query(
            `SELECT o.id, o.order_number, o.customer_id, o.total_amount, o.status, o.payment_method,
                    o.payment_status, o.shipping_address, o.created_at, o.updated_at,
                    o.requested_quantity, o.product_type, o.fulfillment_status
              FROM orders o WHERE o.customer_id = ? ORDER BY o.created_at DESC`,
            [cid]
        );

        const orders = [];
        for (const row of rows) {
            const [orderItems] = await pool.query(
                `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
                        p.name, p.image_url, oi.seller_id
                 FROM order_items oi JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = ?`,
                [row.id]
            );

            // Fetch fulfillment summary for multi-seller orders
            let fulfillments = [];
            if (row.fulfillment_status && row.fulfillment_status !== 'pending') {
                const [fills] = await pool.query(
                    `SELECT f.id, f.seller_id, f.quantity, f.unit_price, f.total_price, f.status,
                            c.full_name AS seller_name
                     FROM order_fulfillments f
                     JOIN customers c ON c.id = f.seller_id
                     WHERE f.parent_order_id = ?
                     ORDER BY f.created_at ASC`,
                    [row.id]
                );
                fulfillments = fills;
            }

            orders.push({ ...row, items: orderItems, fulfillments });
        }

        res.json({ success: true, orders });
    } catch (err) { next(err) }
  });

app.post('/api/orders.php', validateRequired(['action']), async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { customer_id, items, shipping_address, payment_method, notes, fulfillment_mode } = req.body;
        const cid = customer_id || auth.customerId;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.json({ success: false, message: 'No items in order' });
        }

        // fulfillment_mode: 'single' (default, current behaviour) | 'multi_seller'
        const multiSeller = fulfillment_mode === 'multi_seller';

        let totalAmount = 0;
        const enrichedItems = [];
        for (const item of items) {
            const [products] = await pool.query(
                'SELECT id, price, stock_quantity, unit, seller_id, name FROM products WHERE id = ? AND is_active = 1',
                [item.product_id]
            );
            if (products.length === 0) return res.json({ success: false, message: `Product ${item.product_id} not found` });
            const p = products[0];
            const qty = item.quantity || 1;
            totalAmount += parseFloat(p.price) * qty;
            enrichedItems.push({
                product_id: p.id,
                seller_id: p.seller_id,
                quantity: qty,
                unit_price: parseFloat(p.price),
                stock_quantity: parseFloat(p.stock_quantity) || 0,
                unit: p.unit || 'kg',
                name: p.name,
            });
        }

        const orderNumber = 'ORD-' + Date.now().toString().slice(-6);
        const [result] = await pool.query(
            `INSERT INTO orders (order_number, customer_id, total_amount, status, payment_method, shipping_address, requested_quantity, product_type)
             VALUES (?, ?, ?, 'pending_payment', ?, ?, ?, ?)`,
            [orderNumber, cid, totalAmount, payment_method || 'cash_on_delivery', shipping_address || '', multiSeller ? enrichedItems.reduce((s, i) => s + i.quantity, 0) : null, multiSeller ? (items[0]?.product_type || 'grain') : null]
        );

        // Initial audit event for the new order.
        try {
            const lifecycle = require('./services/orderLifecycle')(pool);
            await lifecycle.recordSimpleEvent(
                pool,
                result.insertId,
                { action: 'order_created', status: 'pending_payment', previousStatus: null,
                  actorId: cid, actorRole: 'customer', notes: `Order ${orderNumber} created`, metadata: null }
            );
        } catch (lifecycleErr) {
            console.warn('lifecycle audit for order creation failed:', lifecycleErr.message);
        }

        for (const item of enrichedItems) {
            await pool.query(
                `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, seller_id)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [result.insertId, item.product_id, item.quantity, item.unit_price, item.unit_price * item.quantity, item.seller_id]
            );
         }

        // --- Capture seller payment destination snapshot on the order ---
        // This stores the payment method the buyer should pay into. The buyer
        // pays the seller directly (no escrow hold).
        let sellerPayment = null;
        const uniqueSellerIds = [...new Set(enrichedItems.map((i) => i.seller_id).filter(Boolean))];
        if (uniqueSellerIds.length > 0) {
          const [[payment]] = await pool.query(
            `SELECT payment_method, provider, account_name, phone_number,
                    bank_name, bank_account_number, lipa_number
             FROM seller_payment_methods
             WHERE seller_id = ? AND is_enabled = 1
             ORDER BY is_default DESC, created_at DESC LIMIT 1`,
            [uniqueSellerIds[0]]
          );
          sellerPayment = payment || null;
          if (sellerPayment) {
            await pool.query(
              `UPDATE orders SET
                 seller_id = ?,
                 seller_payment_method = ?,
                 seller_payment_provider = ?,
                 seller_payment_account_name = ?,
                 seller_payment_phone = ?,
                 seller_payment_bank_name = ?,
                 seller_payment_bank_account = ?,
                 seller_payment_lipa_number = ?
               WHERE id = ?`,
              [
                uniqueSellerIds[0],
                sellerPayment.payment_method,
                sellerPayment.provider,
                sellerPayment.account_name,
                sellerPayment.phone_number,
                sellerPayment.bank_name,
                sellerPayment.bank_account_number,
                sellerPayment.lipa_number,
                result.insertId,
              ]
            );
          }
        }

         // --- Multi-seller fulfillment allocation ---
        let fulfillments = [];
        let lastAlloc = null;
        if (multiSeller) {
            for (const item of enrichedItems) {
                // For each product line, try to allocate across sellers with stock
                const [sellers] = await pool.query(
                    `SELECT p.id AS product_id, p.seller_id, p.stock_quantity, p.price, p.unit
                     FROM products p
                     WHERE p.type = ? AND p.is_active = 1 AND p.stock_quantity > 0
                     ORDER BY p.price ASC`,
                    [item.name]
                );
                if (sellers.length === 0) continue;

                const alloc = fulfillmentAllocation.allocateFulfillment({
                    productType: item.name,
                    requestedQty: item.quantity,
                    sources: sellers,
                    sortBy: 'price_asc',
                    allowPartial: true,
                });
                lastAlloc = alloc;

                for (const a of alloc.allocations) {
                    const [ful] = await pool.query(
                        `INSERT INTO order_fulfillments
                         (parent_order_id, seller_id, product_id, quantity, unit_price, total_price, warehouse_id, delivery_location, delivery_date, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'allocated')`,
                        [result.insertId, a.seller_id, a.product_id, a.quantity, a.unit_price, a.total_price, a.warehouse_id || null, shipping_address || null, null]
                    );
                    fulfillments.push({
                        id: ful.insertId,
                        seller_id: a.seller_id,
                        product_id: a.product_id,
                        quantity: a.quantity,
                        unit_price: a.unit_price,
                        total_price: a.total_price,
                    });

                    // Reserve inventory
                    await pool.query(
                        `INSERT INTO inventory_reservations (product_id, seller_id, warehouse_id, fulfillment_id, order_id, quantity, status)
                         VALUES (?, ?, ?, ?, ?, ?, 'reserved')`,
                        [a.product_id, a.seller_id, a.warehouse_id || null, ful.insertId, result.insertId, a.quantity]
                    );
                }
            }

            // Update fulfillment status on parent order
            const allComplete = fulfillments.length > 0 && lastAlloc?.complete !== false;
            await pool.query(
                'UPDATE orders SET fulfillment_status = ? WHERE id = ?',
                [allComplete ? 'fully_fulfilled' : (fulfillments.length > 0 ? 'partially_fulfilled' : 'pending'), result.insertId]
            );
        }

        await pool.query('DELETE FROM cart WHERE customer_id = ?', [cid]);

        await pool.query(
            `INSERT INTO notifications (customer_id, title, message, type, is_read)
             VALUES (?, 'Order Placed', 'Your order #${orderNumber} has been placed successfully.', 'order', 0)`,
            [cid]
        );

        res.json({
            success: true,
            order_number: orderNumber,
            order_id: result.insertId,
            total_amount: totalAmount,
            fulfillments: fulfillments,
            fulfillment_mode: multiSeller ? 'multi_seller' : 'single',
            seller_id: uniqueSellerIds[0] || null,
            seller_payment_method: sellerPayment ? sellerPayment.payment_method : null,
            seller_payment_provider: sellerPayment ? sellerPayment.provider : null,
            seller_payment_account_name: sellerPayment ? sellerPayment.account_name : null,
            seller_payment_phone: sellerPayment ? sellerPayment.phone_number : null,
            seller_payment_bank_name: sellerPayment ? sellerPayment.bank_name : null,
            seller_payment_bank_account: sellerPayment
              ? (sellerPayment.bank_account_number
                  ? sellerPayment.bank_account_number.replace(/^(\d{0,4})\d+/, '$1****')
                  : null)
              : null,
            seller_payment_lipa_number: sellerPayment
              ? (sellerPayment.lipa_number
                  ? sellerPayment.lipa_number.replace(/^(\d{0,4})\d+/, '$1****')
                  : null)
              : null,
        });
        await publishOrderUpdate(cid, { order_number: orderNumber, order_id: result.insertId, status: 'pending' })
        await publishCartUpdate(cid)
        realtime.publishNotifications(cid, { type: 'new_order', order_number: orderNumber })
    } catch (err) { next(err) }
  });

  app.put('/api/orders.php', async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { order_id, status, payment_status, notes } = req.body;
        const lifecycle = require('./services/orderLifecycle')(pool);
        const result = await lifecycle.recordLegacyStatusUpdate(pool, { role: auth.role, customerId: auth.customerId }, { order_id, status, payment_status, notes });
        res.json(result);
    } catch (err) { next(err) }
  });

// ============ MULTI-SELLER FULFILLMENT ============

// GET /api/fulfillments.php?action=by_order&order_id=X
// GET /api/fulfillments.php?action=by_seller&seller_id=X
app.get('/api/fulfillments.php', async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { action, order_id, seller_id, status, limit } = req.query;
        let sql, params;

        if (action === 'by_order' && order_id) {
            // Verify buyer owns this order
            const [[order]] = await pool.query(
                'SELECT id, customer_id, requested_quantity, fulfillment_status FROM orders WHERE id = ?',
                [order_id]
            );
            if (!order) return res.json({ success: false, message: 'Order not found' });
            if (order.customer_id !== auth.customerId) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }

            const [rows] = await pool.query(
                `SELECT f.*, c.full_name AS seller_name, c.is_verified AS seller_verified
                 FROM order_fulfillments f
                 JOIN customers c ON c.id = f.seller_id
                 WHERE f.parent_order_id = ?
                 ORDER BY f.created_at ASC`,
                [order_id]
            );

            // Compute aggregate stats
            const totalAllocated = rows.reduce((s, f) => s + parseFloat(f.quantity), 0);
            const totalFilled = rows
                .filter(f => f.status === 'delivered')
                .reduce((s, f) => s + parseFloat(f.quantity), 0);

            return res.json({
                success: true,
                order: {
                    id: order.id,
                    requested_quantity: order.requested_quantity,
                    fulfillment_status: order.fulfillment_status,
                },
                fulfillments: rows,
                summary: {
                    total_allocations: rows.length,
                    total_allocated: totalAllocated,
                    total_delivered: totalFilled,
                    remaining: totalAllocated - totalFilled,
                },
            });
        }

        if (action === 'by_seller' && seller_id) {
            const sellerId = parseInt(seller_id, 10);
            // Only allow sellers to see their own, or admins to see any
            if (sellerId !== auth.customerId && auth.role !== 'admin' && auth.role !== 'superadmin') {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }

            sql = `SELECT f.*, o.order_number, o.customer_id, o.status AS order_status
                   FROM order_fulfillments f
                   JOIN orders o ON o.id = f.parent_order_id
                   WHERE f.seller_id = ?`;
            params = [sellerId];
            if (status) {
                sql += ' AND f.status = ?';
                params.push(status);
            }
            sql += ' ORDER BY f.created_at DESC';
            if (limit) {
                sql += ' LIMIT ?';
                params.push(parseInt(limit, 10));
            }
            const [rows] = await pool.query(sql, params);
            return res.json({ success: true, fulfillments: rows });
        }

        return res.status(400).json({ success: false, message: 'Invalid action or missing parameters' });
    } catch (err) { next(err) }
});

// POST /api/fulfillments.php?action=update_status
// Body: { fulfillment_id, status, tracking_number?, notes? }
app.post('/api/fulfillments.php', async (req, res, next) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { action, fulfillment_id, status, tracking_number, notes } = req.body;
        if (action !== 'update_status') {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        const [rows] = await pool.query(
            'SELECT * FROM order_fulfillments WHERE id = ?',
            [fulfillment_id]
        );
        if (rows.length === 0) return res.json({ success: false, message: 'Fulfillment not found' });

        const f = rows[0];
        // Only the assigned seller or an admin can update
        if (f.seller_id !== auth.customerId && auth.role !== 'admin' && auth.role !== 'superadmin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const validStatuses = ['allocated', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        await pool.query(
            'UPDATE order_fulfillments SET status = ?, tracking_number = COALESCE(?, tracking_number), notes = COALESCE(?, notes) WHERE id = ?',
            [status, tracking_number || null, notes || null, fulfillment_id]
        );

        // When a fulfillment is delivered, consume the inventory reservation
        if (status === 'delivered') {
            await pool.query(
                `UPDATE inventory_reservations SET status = 'consumed'
                 WHERE fulfillment_id = ? AND status = 'reserved'`,
                [fulfillment_id]
            );
        } else if (status === 'cancelled') {
            await pool.query(
                `UPDATE inventory_reservations SET status = 'released', released_at = NOW()
                 WHERE fulfillment_id = ? AND status = 'reserved'`,
                [fulfillment_id]
            );
        }

        // Recompute parent order fulfillment_status
        const [fills] = await pool.query(
            'SELECT status, quantity FROM order_fulfillments WHERE parent_order_id = ?',
            [f.parent_order_id]
        );
        const totalQty = fills.reduce((s, r) => s + parseFloat(r.quantity), 0);
        const deliveredQty = fills.filter(r => r.status === 'delivered').reduce((s, r) => s + parseFloat(r.quantity), 0);
        const cancelledQty = fills.filter(r => r.status === 'cancelled').reduce((s, r) => s + parseFloat(r.quantity), 0);

        let parentStatus = 'pending';
        if (cancelledQty >= totalQty) {
            parentStatus = 'cancelled';
        } else if (deliveredQty >= totalQty) {
            parentStatus = 'fully_fulfilled';
        } else if (deliveredQty > 0 || fills.some(r => r.status === 'shipped')) {
            parentStatus = 'partially_fulfilled';
        }

        await pool.query(
            'UPDATE orders SET fulfillment_status = ? WHERE id = ?',
            [parentStatus, f.parent_order_id]
        );

        // Also update order status if fully delivered
        if (parentStatus === 'fully_fulfilled') {
            await pool.query(
                "UPDATE orders SET status = 'delivered' WHERE id = ? AND status != 'delivered'",
                [f.parent_order_id]
            );
        }

        // Audit every fulfillment status change as a timeline event.
        try {
            const lifecycle = require('./services/orderLifecycle')(pool);
            await lifecycle.recordFulfillmentEvent(
                pool,
                f.parent_order_id,
                status,
                { id: auth.customerId, role: auth.role },
                { fulfillment_id: f.id, notes: notes || null, tracking_number: tracking_number || null }
            );
        } catch (lifecycleErr) {
            console.warn('lifecycle audit for fulfillment update failed:', lifecycleErr.message);
        }

        // Notify buyer about fulfillment status change
        const [[order]] = await pool.query(
            'SELECT customer_id FROM orders WHERE id = ?',
            [f.parent_order_id]
        );
        if (order) {
            realtime.publishNotifications(order.customer_id, {
                type: 'fulfillment_update',
                fulfillment_id,
                status,
                parent_order_id: f.parent_order_id,
            });
        }

        res.json({ success: true, message: 'Fulfillment status updated', parent_fulfillment_status: parentStatus });
    } catch (err) { next(err) }
});

// ============ NOTIFICATIONS ============

app.get('/api/notifications.php', async (req, res) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { customer_id, unread_only, limit } = req.query;
        const cid = customer_id || auth.customerId;

        let sql = 'SELECT id, title, message, type, is_read, data, created_at FROM notifications WHERE customer_id = ?';
        const params = [cid];

        if (unread_only === 'true') {
            sql += ' AND is_read = 0';
        }

        sql += ' ORDER BY created_at DESC';

        if (limit) {
            sql += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const [rows] = await pool.query(sql, params);
        res.json({ success: true, notifications: rows });
} catch (err) { next(err) }
  });

app.put('/api/notifications.php', async (req, res) => {
    try {
        const auth = extractAuthUser(req);
        if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const { customer_id, notification_ids } = req.body;
        const cid = customer_id || auth.customerId;

        if (notification_ids && Array.isArray(notification_ids) && notification_ids.length > 0) {
            await pool.query(
                'UPDATE notifications SET is_read = 1 WHERE customer_id = ? AND id IN (?)',
                [cid, notification_ids]
            );
        } else {
            await pool.query('UPDATE notifications SET is_read = 1 WHERE customer_id = ? AND is_read = 0', [cid]);
        }

        res.json({ success: true, message: 'Notifications marked as read' });
} catch (err) { next(err) }
  });

// ============ ORDERS REALTIME (SSE) ============

app.get('/api/orders_realtime.php', async (req, res) => {
    const { customer_id } = req.query
    if (!customer_id) {
        return res.status(400).json({ success: false, message: 'customer_id is required' })
    }

    realtime.setupSSE(res, [
        { channel: realtime.CHANNELS.orders(customer_id) }
    ])

    try {
        const [rows] = await pool.query(
            `SELECT o.id, o.order_number, o.customer_id, o.total_amount, o.status, o.payment_method,
                    o.payment_status, o.shipping_address, o.created_at, o.updated_at
             FROM orders o WHERE o.customer_id = ? ORDER BY o.created_at DESC LIMIT 20`,
            [customer_id]
        )
        for (const order of rows) {
            const [orderItems] = await pool.query(
                `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
                        p.name, p.image_url
                 FROM order_items oi JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = ?`,
                [order.id]
            )
            order.items = orderItems
        }
        res.write(`data: ${JSON.stringify({ type: 'unread_count', unread_count: rows.length, orders: rows })}\n\n`)
    } catch (err) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
    }
})

// ============ DELIVERIES REALTIME (SSE) ============

app.get('/api/deliveries_realtime.php', async (req, res) => {
    const { provider_id } = req.query
    if (!provider_id) {
        return res.status(400).json({ success: false, message: 'provider_id is required' })
    }

    realtime.setupSSE(res, [
        { channel: realtime.CHANNELS.deliveries(provider_id) }
    ])

    try {
        const [rows] = await pool.query(
            `SELECT ad.id, ad.status, ad.current_location, ad.updated_at, o.order_number
             FROM active_deliveries ad
             JOIN orders o ON o.id = ad.order_id
             WHERE ad.transport_provider_id = ? AND ad.updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
             ORDER BY ad.updated_at DESC`,
            [provider_id]
        )
        res.write(`data: ${JSON.stringify({ success: true, deliveries: rows })}\n\n`)
    } catch (err) {
        res.write(`data: ${JSON.stringify({ success: false, message: err.message })}\n\n`)
    }
})

// ============ AI AGENT ============
const aiRoutes = require('./routes/ai')(pool)
app.use('/api/ai', aiRoutes)

// ============ CONTENT / CMS / MISC ============
const contentRoutes = require('./routes/content')(pool)
app.use('/api/content', contentRoutes)

// ============ SUPER ADMIN ============
const superadminExtendedRoutes = require('./routes/superadmin-extended')(pool)
app.use('/api/superadmin', superadminExtendedRoutes)
const superadminRoutes = require('./routes/superadmin')(pool)
app.use('/api/superadmin', superadminRoutes)

// ============ TEMPLATES ============
const templateRoutes = require('./routes/templates')(pool)
app.use('/api/templates', templateRoutes)

// ============ FINANCE ============
const financeRoutes = require('./routes/finance')(pool)
app.use('/api/finance', financeRoutes)

// ============ BULK PROCUREMENT ============
const bulkProcurementRoutes = require('./routes/bulkProcurement')(pool)
app.use('/api/bulk_procurement.php', bulkProcurementRoutes)

// ============ ORDER LIFECYCLE ============
const orderLifecycleRoutes = require('./routes/orderLifecycle')(pool)
app.use('/api/order_lifecycle.php', orderLifecycleRoutes)

// ============ SELLER PAYMENT METHODS ============
const sellerPaymentMethodRoutes = require('./routes/sellerPaymentMethods')(pool)
app.use('/api/seller/payment-methods', sellerPaymentMethodRoutes)

// PAYMENTS FLOW (checkout, webhooks, receipts, COD approval, payment confirmation)
const paymentRoutes = require('./routes/payments')(pool)
app.use('/api/payments', paymentRoutes)

// NTZS PARTNER API — collections, disbursements, bills and treasury.
// Uses the `collections`, `disbursements`, `treasury` and spend capabilities;
// no `wallets` capability, so nothing here provisions an end-user wallet.
const ntzsRoutes = require('./routes/ntzs')(pool)
app.use('/api/ntzs', ntzsRoutes)

// ============ ERROR HANDLING ============
app.use(notFoundHandler)
app.use(errorHandler)

// ============ API DOCUMENTATION ============
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express')
  const swaggerSpecs = require('./docs/swagger')
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs))
}

// ============ REDIS CACHE + REALTIME ============
const { initRedis } = require('./services/cache')
initRedis()
realtime.ensureSubscriber()
realtime.ensurePublisher()

// ============ NTZS PAYMENT CONFIGURATION ============
// Never fatal: a payments misconfiguration must not take the marketplace down,
// but a live key in development is worth shouting about before it moves money.
require('./services/ntzs/configCheck').logConfiguration()

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Node.js API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
});

module.exports = app;
