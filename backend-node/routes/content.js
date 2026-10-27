const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { requireLogisticsRole, requireAdminRole, requireVendorRole, requireWarehouseRole } = require('../middleware/roleCheck')
const { validateRequired, validateEmail, validatePhone, validateAmount, validatePositiveInt, sanitizeString } = require('../middleware/validation')
const { csrfProtection } = require('../middleware/csrf')
const { auditLog } = require('../middleware/auditLog')
const realtime = require('../services/realtime')

module.exports = (pool) => {
  const router = express.Router()

  router.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return csrfProtection(req, res, next)
    }
    next()
  })

  // ============ Admin Vendor Analytics ============
  router.get('/admin/vendors/analytics', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { vendor_id, limit = 20, offset = 0 } = req.query
      let sql = `SELECT c.id, c.full_name, c.email, c.phone, c.business_name, c.created_at,
                        COUNT(DISTINCT p.id) AS total_products,
                        COUNT(DISTINCT o.id) AS total_orders,
                        COALESCE(SUM(o.total_amount), 0) AS total_revenue,
                        COALESCE(SUM(pc.commission_amount), 0) AS total_commission,
                        COALESCE(AVG(r.rating), 0) AS avg_rating,
                        COUNT(DISTINCT r.id) AS total_reviews
                 FROM customers c
                 LEFT JOIN products p ON p.seller_id = c.id AND p.is_active = 1
                 LEFT JOIN orders o ON o.customer_id = c.id
                 LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.product_id = p.id
                 LEFT JOIN platform_commissions pc ON pc.seller_id = c.id
                 LEFT JOIN reviews r ON r.product_id = p.id
                 WHERE c.role IN ('seller', 'vendor_admin') AND c.is_active = 1`
      const params = []
      if (vendor_id) { sql += ' AND c.id = ?'; params.push(vendor_id) }
      sql += ' GROUP BY c.id ORDER BY total_revenue DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM customers c WHERE c.role IN ('seller', 'vendor_admin') AND c.is_active = 1${vendor_id ? ' AND c.id = ?' : ''}`, vendor_id ? [vendor_id] : [])
      res.json({ success: true, vendors: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.get('/admin/vendors/:vendorId/analytics', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const vendorId = req.params.vendorId
      const [[vendor]] = await pool.query('SELECT id, full_name, email, business_name, created_at FROM customers WHERE id = ? AND role IN (?, ?)', [vendorId, 'seller', 'vendor_admin'])
      if (!vendor) return res.json({ success: false, message: 'Vendor not found' })
      const [[orderStats]] = await pool.query(`SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount), 0) AS total_revenue, COALESCE(AVG(total_amount), 0) AS avg_order_value FROM orders WHERE customer_id = ?`, [vendorId])
      const [[productStats]] = await pool.query('SELECT COUNT(*) AS total_products, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_products FROM products WHERE seller_id = ?', [vendorId])
      const [[commissionStats]] = await pool.query('SELECT COALESCE(SUM(commission_amount), 0) AS total_commission, COALESCE(SUM(CASE WHEN status = "paid" THEN commission_amount ELSE 0 END), 0) AS paid_commission, COALESCE(SUM(CASE WHEN status = "pending" THEN commission_amount ELSE 0 END), 0) AS pending_commission FROM platform_commissions WHERE seller_id = ?', [vendorId])
      const [[reviewStats]] = await pool.query('SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS total_reviews FROM reviews WHERE product_id IN (SELECT id FROM products WHERE seller_id = ?)', [vendorId])
      const [[topProducts]] = await pool.query(`SELECT p.id, p.name, p.price, COUNT(oi.id) AS order_count, COALESCE(SUM(oi.total_price), 0) AS revenue FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id WHERE p.seller_id = ? GROUP BY p.id ORDER BY revenue DESC LIMIT 10`, [vendorId])
      const [[monthlyRevenue]] = await pool.query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COALESCE(SUM(total_amount), 0) AS revenue FROM orders WHERE customer_id = ? GROUP BY month ORDER BY month DESC LIMIT 12`, [vendorId])
      res.json({ success: true, vendor, stats: { ...orderStats, ...productStats, ...commissionStats, ...reviewStats }, top_products: topProducts, monthly_revenue: monthlyRevenue })
    } catch (err) { next(err) }
  })

  router.get('/admin/vendors/top', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { metric = 'revenue', limit = 10 } = req.query
      let orderBy = 'total_revenue DESC'
      if (metric === 'orders') orderBy = 'total_orders DESC'
      if (metric === 'products') orderBy = 'total_products DESC'
      if (metric === 'rating') orderBy = 'avg_rating DESC'
      const [rows] = await pool.query(
        `SELECT c.id, c.full_name, c.business_name, c.email,
                COUNT(DISTINCT p.id) AS total_products,
                COUNT(DISTINCT o.id) AS total_orders,
                COALESCE(SUM(o.total_amount), 0) AS total_revenue,
                COALESCE(AVG(r.rating), 0) AS avg_rating
         FROM customers c
         LEFT JOIN products p ON p.seller_id = c.id AND p.is_active = 1
         LEFT JOIN orders o ON o.customer_id = c.id
         LEFT JOIN reviews r ON r.product_id = p.id
         WHERE c.role IN ('seller', 'vendor_admin') AND c.is_active = 1
         GROUP BY c.id ORDER BY ${orderBy} LIMIT ?`,
        [parseInt(limit)]
      )
      res.json({ success: true, vendors: rows })
    } catch (err) { next(err) }
  })

  // ============ CMS / Site Content ============
  router.get('/site/categories', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM site_categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC')
      res.json({ success: true, categories: rows })
    } catch (err) { next(err) }
  })

  router.get('/site/stats', async (req, res, next) => {
    try {
      const [rows] = await pool.query("SELECT * FROM site_stats WHERE is_active = 1 AND id IN (SELECT MIN(id) FROM site_stats WHERE is_active = 1 GROUP BY label) ORDER BY sort_order ASC")
      let stats = rows
      // If empty or zero customers, compute live from DB
      const [[customers]] = await pool.query("SELECT COUNT(*) AS total FROM customers WHERE role = 'customer'")
      const [[products]] = await pool.query('SELECT COUNT(*) AS total FROM products WHERE is_active = 1')
      const [[sellers]] = await pool.query("SELECT COUNT(*) AS total FROM customers WHERE role IN ('seller','vendor_admin') AND is_active = 1")
      const [[regions]] = await pool.query('SELECT COUNT(DISTINCT region) AS total FROM market_prices')
      const liveValues = {
        'Happy Customers': (customers?.total || 0).toLocaleString() + '+',
        'Products': (products?.total || 0) + '+',
        'Verified Sellers': (sellers?.total || 0) + '+',
        'Regions Covered': String(regions?.total || 0)
      }
      stats = stats.map(s => ({ ...s, value: liveValues[s.label] || s.value }))
      res.json({ success: true, stats })
    } catch (err) { next(err) }
  })

  router.get('/site/testimonials', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM testimonials WHERE is_active = 1 ORDER BY sort_order ASC')
      res.json({ success: true, testimonials: rows })
    } catch (err) { next(err) }
  })

  router.get('/site/partners', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM partners WHERE is_active = 1 ORDER BY sort_order ASC')
      res.json({ success: true, partners: rows })
    } catch (err) { next(err) }
  })

  router.get('/site/faqs', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM faqs WHERE is_active = 1 ORDER BY category, sort_order ASC')
      res.json({ success: true, faqs: rows })
    } catch (err) { next(err) }
  })

  router.get('/site/blog', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT id, slug, title, excerpt, author, category, image_url, published_at FROM blog_posts WHERE is_published = 1 ORDER BY published_at DESC')
      res.json({ success: true, posts: rows })
    } catch (err) { next(err) }
  })

  router.get('/site/blog/:slug', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM blog_posts WHERE slug = ? AND is_published = 1', [req.params.slug])
      if (rows.length === 0) return res.json({ success: false, message: 'Post not found' })
      res.json({ success: true, post: rows[0] })
    } catch (err) { next(err) }
  })

  router.get('/site/jobs', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM jobs WHERE is_active = 1 ORDER BY posted_at DESC')
      res.json({ success: true, jobs: rows })
    } catch (err) { next(err) }
  })

  // ============ Auctions ============
  router.get('/auctions', async (req, res, next) => {
    try {
      const { status } = req.query
      let sql = 'SELECT * FROM auctions WHERE 1=1'
      const params = []
      if (status) { sql += ' AND status = ?'; params.push(status) }
      sql += ' ORDER BY ends_at ASC'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, auctions: rows })
    } catch (err) { next(err) }
  })

  router.get('/auctions/:id', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM auctions WHERE id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Auction not found' })
      const [bids] = await pool.query(
        `SELECT ab.*, c.full_name AS bidder_name FROM auction_bids ab
         JOIN customers c ON ab.bidder_id = c.id
         WHERE ab.auction_id = ? ORDER BY ab.bid_amount DESC LIMIT 20`,
        [req.params.id]
      )
      res.json({ success: true, auction: rows[0], bids })
    } catch (err) { next(err) }
  })

  router.post('/auctions/:id/bid', async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' })
      }
      const jwt = require('jsonwebtoken')
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'nafaka-hub-secret-key-change-in-production')
      const auctionId = req.params.id
      const { bid_amount } = req.body
      if (!bid_amount || bid_amount <= 0) return res.json({ success: false, message: 'Invalid bid amount' })

      const [auction] = await pool.query('SELECT * FROM auctions WHERE id = ? AND status = "live"', [auctionId])
      if (auction.length === 0) return res.json({ success: false, message: 'Auction not live' })
      if (parseFloat(bid_amount) <= parseFloat(auction[0].current_bid)) {
        return res.json({ success: false, message: 'Bid must be higher than current bid' })
      }

      await pool.query('INSERT INTO auction_bids (auction_id, bidder_id, bid_amount) VALUES (?, ?, ?)', [auctionId, decoded.customerId, bid_amount])
      await pool.query('UPDATE auctions SET current_bid = ? WHERE id = ?', [bid_amount, auctionId])
      res.json({ success: true, message: 'Bid placed' })
    } catch (err) { next(err) }
  })

  // ============ Cooperatives ============
  router.get('/cooperatives', async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT c.*, l.full_name AS leader_name FROM cooperatives c
         LEFT JOIN customers l ON c.leader_id = l.id
         ORDER BY c.created_at DESC`
      )
      res.json({ success: true, cooperatives: rows })
    } catch (err) { next(err) }
  })

  router.get('/cooperatives/:id', async (req, res, next) => {
    try {
      const [coop] = await pool.query(
        `SELECT c.*, l.full_name AS leader_name FROM cooperatives c
         LEFT JOIN customers l ON c.leader_id = l.id WHERE c.id = ?`,
        [req.params.id]
      )
      if (coop.length === 0) return res.json({ success: false, message: 'Not found' })
      const [members] = await pool.query(
        `SELECT cm.*, cu.full_name, cu.email, cu.phone FROM cooperative_members cm
         JOIN customers cu ON cm.customer_id = cu.id WHERE cm.cooperative_id = ?`,
        [req.params.id]
      )
      const [orders] = await pool.query(
        `SELECT * FROM cooperative_orders WHERE cooperative_id = ? ORDER BY created_at DESC LIMIT 10`,
        [req.params.id]
      )
      const [announcements] = await pool.query(
        `SELECT * FROM cooperative_announcements WHERE cooperative_id = ? ORDER BY created_at DESC LIMIT 10`,
        [req.params.id]
      )
      res.json({ success: true, cooperative: coop[0], members, orders, announcements })
    } catch (err) { next(err) }
  })

  // ============ Loans / Financing ============
  router.get('/loans/products', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM loan_products WHERE is_active = 1 ORDER BY name')
      res.json({ success: true, products: rows })
    } catch (err) { next(err) }
  })

  router.get('/loans/my', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT al.*, lp.name AS product_name FROM active_loans al
         LEFT JOIN loan_products lp ON al.loan_product_id = lp.id
         WHERE al.customer_id = ? ORDER BY al.created_at DESC`,
        [req.user.customerId]
      )
      res.json({ success: true, loans: rows })
    } catch (err) { next(err) }
  })

  router.post('/loans/apply', requireAuth, async (req, res, next) => {
    try {
      const { loan_product_id, principal, term_months } = req.body
      if (!principal || !term_months) return res.json({ success: false, message: 'Principal and term are required' })
      const [[product]] = await pool.query('SELECT interest_rate FROM loan_products WHERE id = ?', [loan_product_id])
      const rate = product ? parseFloat(product.interest_rate) : 0
      const [result] = await pool.query(
        `INSERT INTO active_loans (customer_id, loan_product_id, principal, outstanding, interest_rate, term_months, next_payment_date, status)
         VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 'pending')`,
        [req.user.customerId, loan_product_id, principal, principal, rate, term_months]
      )
      res.json({ success: true, loan_id: result.insertId, message: 'Application submitted' })
    } catch (err) { next(err) }
  })

  // ============ Insurance ============
  router.get('/insurance/policies', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM insurance_policies WHERE is_active = 1 ORDER BY name')
      res.json({ success: true, policies: rows })
    } catch (err) { next(err) }
  })

  // ============ Contracts ============
  router.get('/contracts', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT c.*, p.name AS product_name, p.image_url, b.full_name AS buyer_name, s.full_name AS seller_name
         FROM contracts c
         LEFT JOIN products p ON c.product_id = p.id
         LEFT JOIN customers b ON c.buyer_id = b.id
         LEFT JOIN customers s ON c.seller_id = s.id
         WHERE c.buyer_id = ? OR c.seller_id = ? ORDER BY c.created_at DESC`,
        [req.user.customerId, req.user.customerId]
      )
      res.json({ success: true, contracts: rows })
    } catch (err) { next(err) }
  })

  // ============ Disputes ============
  router.get('/disputes', requireAuth, async (req, res, next) => {
    try {
      const adminRoles = ['superadmin', 'marketplace_admin', 'transport_manager', 'finance_admin', 'customer_support']
      if (adminRoles.includes(req.user.role)) {
        const [rows] = await pool.query(
          `SELECT d.*, o.order_number, c.full_name AS complainant_name FROM disputes d
           LEFT JOIN orders o ON d.order_id = o.id
           LEFT JOIN customers c ON d.complainant_id = c.id
           ORDER BY d.created_at DESC`
        )
        return res.json({ success: true, disputes: rows })
      }
      const [rows] = await pool.query(
        `SELECT d.*, o.order_number, c.full_name AS complainant_name FROM disputes d
         LEFT JOIN orders o ON d.order_id = o.id
         LEFT JOIN customers c ON d.complainant_id = c.id
         WHERE d.complainant_id = ? OR d.respondent_id = ? ORDER BY d.created_at DESC`,
        [req.user.customerId, req.user.customerId]
      )
      res.json({ success: true, disputes: rows })
    } catch (err) { next(err) }
  })

  // Admin: list all disputes with search/filter/pagination
  router.get('/admin/disputes', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, search, limit = 20, offset = 0 } = req.query
      let sql = `SELECT d.*, o.order_number, c.full_name AS complainant_name, r.full_name AS respondent_name
                 FROM disputes d
                 LEFT JOIN orders o ON d.order_id = o.id
                 LEFT JOIN customers c ON d.complainant_id = c.id
                 LEFT JOIN customers r ON d.respondent_id = r.id
                 WHERE 1=1`
      const params = []
      if (status) { sql += ' AND d.status = ?'; params.push(status) }
      if (search) { sql += ' AND (d.subject LIKE ? OR d.description LIKE ? OR o.order_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const whereClause = []
      const countParams = []
      if (status) { whereClause.push('d.status = ?'); countParams.push(status) }
      if (search) { whereClause.push('(d.subject LIKE ? OR d.description LIKE ? OR o.order_number LIKE ?)'); countParams.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      const whereStr = whereClause.length > 0 ? ' WHERE ' + whereClause.join(' AND ') : ''
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM disputes d LEFT JOIN orders o ON d.order_id = o.id${whereStr}`, countParams)
      res.json({ success: true, disputes: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  // Admin: get single dispute with order details
  router.get('/admin/disputes/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT d.*, o.order_number, o.total_amount, o.status AS order_status,
                c.full_name AS complainant_name, c.email AS complainant_email, c.phone AS complainant_phone,
                r.full_name AS respondent_name, r.email AS respondent_email, r.phone AS respondent_phone
         FROM disputes d
         LEFT JOIN orders o ON d.order_id = o.id
         LEFT JOIN customers c ON d.complainant_id = c.id
         LEFT JOIN customers r ON d.respondent_id = r.id
         WHERE d.id = ?`,
        [req.params.id]
      )
      if (rows.length === 0) return res.json({ success: false, message: 'Dispute not found' })
      res.json({ success: true, dispute: rows[0] })
    } catch (err) { next(err) }
  })

  // Admin: update dispute status + resolution
  router.put('/admin/disputes/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, resolution } = req.body
      const allowed = ['investigating', 'resolved', 'rejected']
      if (!allowed.includes(status)) return res.json({ success: false, message: 'Invalid status' })
      const updates = ['status = ?', 'resolution = ?']
      const params = [status, resolution || null]
      if (status === 'resolved' || status === 'rejected') updates.push('resolved_at = NOW()')
      await pool.query(`UPDATE disputes SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id])
      res.json({ success: true, message: `Dispute marked as ${status}` })
    } catch (err) { next(err) }
  })

  router.post('/disputes', requireAuth, async (req, res, next) => {
    try {
      const { order_id, respondent_id, subject, description } = req.body
      if (!description) return res.json({ success: false, message: 'Description required' })
      const [result] = await pool.query(
        `INSERT INTO disputes (order_id, complainant_id, respondent_id, subject, description) VALUES (?, ?, ?, ?, ?)`,
        [order_id || null, req.user.customerId, respondent_id || null, subject || '', description]
      )
      res.json({ success: true, dispute_id: result.insertId })
    } catch (err) { next(err) }
  })

  // ============ Quality Inspections ============
  router.get('/quality/inspections', async (req, res, next) => {
    try {
      const productId = req.query.product_id
      let sql = `SELECT qi.*, p.name AS product_name FROM quality_inspections qi
                 LEFT JOIN products p ON qi.product_id = p.id WHERE 1=1`
      const params = []
      if (productId) { sql += ' AND qi.product_id = ?'; params.push(productId) }
      sql += ' ORDER BY qi.inspection_date DESC LIMIT 50'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, inspections: rows })
    } catch (err) { next(err) }
  })

  // ============ Sustainability ============
  router.get('/sustainability/practices', async (req, res, next) => {
    try {
      const [practices] = await pool.query('SELECT * FROM sustainability_practices WHERE is_active = 1')
      const [certifications] = await pool.query('SELECT * FROM certifications WHERE is_active = 1')
      const [projects] = await pool.query('SELECT * FROM carbon_projects ORDER BY start_date DESC')
      res.json({ success: true, practices, certifications, projects })
    } catch (err) { next(err) }
  })

  router.post('/sustainability/project', requireAuth, csrfProtection, async (req, res, next) => {
    try {
      const { name, description, region, methodology, acres, start_date, end_date } = req.body
      if (!name || !region) return res.json({ success: false, message: 'Project name and region are required' })
      await pool.query(
        `INSERT INTO carbon_projects (name, description, region, co2_offset_tons, status, start_date, end_date)
         VALUES (?, ?, ?, 0, 'planning', ?, ?)`,
        [name, description || null, region, start_date || new Date().toISOString().split('T')[0], end_date || null]
      )
      res.json({ success: true, message: 'Project registered for verification' })
    } catch (err) { next(err) }
  })

  // ============ Weather ============
  router.get('/weather/current', async (req, res, next) => {
    try {
      const { region } = req.query
      let sql = 'SELECT * FROM weather_data WHERE 1=1'
      const params = []
      if (region) { sql += ' AND region = ?'; params.push(region) }
      sql += ' ORDER BY recorded_at DESC LIMIT 50'
      const [current] = await pool.query(sql, params)
      const [alerts] = await pool.query('SELECT * FROM weather_alerts WHERE is_active = 1 AND (ends_at IS NULL OR ends_at >= NOW()) ORDER BY severity DESC')
      res.json({ success: true, current, alerts })
    } catch (err) { next(err) }
  })

  router.get('/weather/calendar', async (req, res, next) => {
    try {
      const { region, crop } = req.query
      let sql = 'SELECT * FROM planting_calendar WHERE 1=1'
      const params = []
      if (region) { sql += ' AND region = ?'; params.push(region) }
      if (crop) { sql += ' AND crop = ?'; params.push(crop) }
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, calendar: rows })
    } catch (err) { next(err) }
  })

  // ============ Loyalty ============
  router.get('/loyalty/levels', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM loyalty_levels ORDER BY sort_order')
      res.json({ success: true, levels: rows })
    } catch (err) { next(err) }
  })

  router.get('/loyalty/rewards', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM rewards WHERE is_active = 1 ORDER BY points_cost')
      res.json({ success: true, rewards: rows })
    } catch (err) { next(err) }
  })

  router.get('/loyalty/my', requireAuth, async (req, res, next) => {
    try {
      const [transactions] = await pool.query(
        'SELECT * FROM loyalty_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.user.customerId]
      )
      const [[totals]] = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN type='earn' THEN points ELSE 0 END), 0) AS earned,
                COALESCE(SUM(CASE WHEN type='redeem' THEN points ELSE 0 END), 0) AS redeemed
         FROM loyalty_transactions WHERE customer_id = ?`,
        [req.user.customerId]
      )
      res.json({ success: true, transactions, points: (totals.earned || 0) - (totals.redeemed || 0) })
    } catch (err) { next(err) }
  })

  // ============ Admin / Operations ============
  router.get('/admin/users', requireAuth, async (req, res, next) => {
    try {
      const { role, search, limit } = req.query
      let sql = 'SELECT id, full_name, email, phone, role, business_name, is_verified, is_active, created_at FROM customers WHERE 1=1'
      const params = []
      if (role) { sql += ' AND role = ?'; params.push(role) }
      if (search) { sql += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      sql += ' ORDER BY created_at DESC LIMIT ?'
      params.push(parseInt(limit) || 50)
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, users: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/customers', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT id, full_name, email, phone, role, is_verified, is_active, created_at FROM customers
         WHERE role = 'customer' ORDER BY created_at DESC LIMIT 100`
      )
      const [[stats]] = await pool.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN is_verified=1 THEN 1 ELSE 0 END) AS verified,
                SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) AS active
         FROM customers WHERE role='customer'`
      )
      res.json({ success: true, customers: rows, stats })
    } catch (err) { next(err) }
  })

  router.get('/admin/applications', requireAuth, async (req, res, next) => {
    try {
      const { status } = req.query
      let sql = `SELECT va.*, c.full_name AS applicant_name, c.email, c.phone FROM vendor_applications va
                 JOIN customers c ON va.customer_id = c.id WHERE 1=1`
      const params = []
      if (status) { sql += ' AND va.status = ?'; params.push(status) }
      sql += ' ORDER BY va.created_at DESC'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, applications: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/reported-products', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT rp.*, p.name AS product_name, c.full_name AS reporter_name FROM reported_products rp
         JOIN products p ON rp.product_id = p.id
         JOIN customers c ON rp.reporter_id = c.id
         ORDER BY rp.created_at DESC`
      )
      res.json({ success: true, reports: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/withdrawals', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT w.*, c.full_name, c.email FROM withdrawals w
         JOIN customers c ON w.customer_id = c.id ORDER BY w.created_at DESC`
      )
      res.json({ success: true, withdrawals: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/refunds', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT r.*, o.order_number, c.full_name FROM refunds r
         LEFT JOIN orders o ON r.order_id = o.id
         JOIN customers c ON r.customer_id = c.id ORDER BY r.created_at DESC`
      )
      res.json({ success: true, refunds: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/audit-logs', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT al.*, c.full_name AS actor_name FROM audit_logs al
         LEFT JOIN customers c ON al.actor_id = c.id ORDER BY al.created_at DESC LIMIT 100`
      )
      res.json({ success: true, logs: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/suspended-vendors', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT sv.*, c.full_name, c.email, c.business_name FROM suspended_vendors sv
         JOIN customers c ON sv.customer_id = c.id WHERE sv.is_active = 1 ORDER BY sv.suspended_at DESC`
      )
      res.json({ success: true, suspended: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/advertisements', async (req, res, next) => {
    try {
      const { placement } = req.query
      let sql = 'SELECT * FROM advertisements WHERE is_active = 1 AND (ends_at IS NULL OR ends_at >= NOW())'
      const params = []
      if (placement) { sql += ' AND placement = ?'; params.push(placement) }
      sql += ' ORDER BY created_at DESC'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, ads: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/support-tickets', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT t.*, c.full_name, c.email FROM support_tickets t
         JOIN customers c ON t.customer_id = c.id ORDER BY t.created_at DESC`
      )
      res.json({ success: true, tickets: rows })
    } catch (err) { next(err) }
  })

  // ============ Logistics extras ============
  router.get('/logistics/routes', async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM transport_routes WHERE is_active = 1 ORDER BY name')
      res.json({ success: true, routes: rows })
    } catch (err) { next(err) }
  })

  router.get('/logistics/drivers', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM drivers WHERE is_active = 1 ORDER BY name')
      res.json({ success: true, drivers: rows })
    } catch (err) { next(err) }
  })

  router.get('/logistics/active-deliveries', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT ad.*, o.order_number, d.name AS driver_name, d.phone AS driver_phone
         FROM active_deliveries ad
         LEFT JOIN orders o ON ad.order_id = o.id
         LEFT JOIN drivers d ON ad.driver_id = d.id
         WHERE ad.status IN ('pending','in_transit') ORDER BY ad.started_at DESC`
      )
      res.json({ success: true, deliveries: rows })
    } catch (err) { next(err) }
  })

  // ============ Logistics Company Management ============
  router.get('/me/my-drivers', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, drivers: [] })
      const [rows] = await pool.query('SELECT * FROM drivers WHERE provider_id = ? ORDER BY created_at DESC', [providers[0].id])
      res.json({ success: true, drivers: rows })
    } catch (err) { next(err) }
  })

  router.post('/me/my-drivers', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { name, phone, license_number, region } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const [result] = await pool.query('INSERT INTO drivers (name, phone, license_number, provider_id, region) VALUES (?, ?, ?, ?, ?)', [name, phone || null, license_number || null, providers[0].id, region || null])
      res.json({ success: true, driver_id: result.insertId })
    } catch (err) { next(err) }
  })

  router.put('/me/my-drivers/:id', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { name, phone, license_number, region, is_active } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      await pool.query('UPDATE drivers SET name = ?, phone = ?, license_number = ?, region = ?, is_active = ? WHERE id = ? AND provider_id = ?', [name, phone || null, license_number || null, region || null, is_active !== undefined ? is_active : 1, req.params.id, providers[0].id])
      res.json({ success: true })
    } catch (err) { next(err) }
  })

  router.delete('/me/my-drivers/:id', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      await pool.query('DELETE FROM drivers WHERE id = ? AND provider_id = ?', [req.params.id, providers[0].id])
      res.json({ success: true })
    } catch (err) { next(err) }
  })

  router.get('/me/my-vehicles', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, vehicles: [] })
      const [rows] = await pool.query('SELECT * FROM vehicles WHERE provider_id = ? ORDER BY created_at DESC', [providers[0].id])
      res.json({ success: true, vehicles: rows })
    } catch (err) { next(err) }
  })

  router.post('/me/my-vehicles', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { vehicle_type, registration_number, model, capacity_tonnes } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const [result] = await pool.query('INSERT INTO vehicles (provider_id, vehicle_type, registration_number, model, capacity_tonnes) VALUES (?, ?, ?, ?, ?)', [providers[0].id, vehicle_type, registration_number, model || null, capacity_tonnes || null])
      res.json({ success: true, vehicle_id: result.insertId })
    } catch (err) { next(err) }
  })

  router.put('/me/my-vehicles/:id', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { vehicle_type, registration_number, model, capacity_tonnes, is_active } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      await pool.query('UPDATE vehicles SET vehicle_type = ?, registration_number = ?, model = ?, capacity_tonnes = ?, is_active = ? WHERE id = ? AND provider_id = ?', [vehicle_type, registration_number, model || null, capacity_tonnes || null, is_active !== undefined ? is_active : 1, req.params.id, providers[0].id])
      res.json({ success: true })
    } catch (err) { next(err) }
  })

  router.delete('/me/my-vehicles/:id', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      await pool.query('DELETE FROM vehicles WHERE id = ? AND provider_id = ?', [req.params.id, providers[0].id])
      res.json({ success: true })
    } catch (err) { next(err) }
  })

  router.get('/me/delivery-requests', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) {
        const [rows] = await pool.query(`SELECT o.id, o.order_number, o.total_amount, o.shipping_address, o.status, o.created_at, c.full_name AS customer_name, c.phone AS customer_phone, GROUP_CONCAT(p.name SEPARATOR ', ') AS product_name FROM orders o JOIN customers c ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE o.status IN ('pending','processing') AND NOT EXISTS (SELECT 1 FROM logistics_commissions lc WHERE lc.order_id = o.id) GROUP BY o.id ORDER BY o.created_at DESC LIMIT 50`)
        return res.json({ success: true, requests: rows, provider_id: null })
      }
      const providerId = providers[0].id
      const [rows] = await pool.query(`SELECT o.id, o.order_number, o.total_amount, o.shipping_address, o.status, o.created_at, c.full_name AS customer_name, c.phone AS customer_phone, GROUP_CONCAT(p.name SEPARATOR ', ') AS product_name, lc.commission_rate, lc.delivery_cost FROM orders o JOIN customers c ON o.customer_id = c.id JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id LEFT JOIN logistics_commissions lc ON lc.order_id = o.id AND lc.transport_provider_id = ? WHERE o.status IN ('pending','processing') AND (lc.id IS NULL OR lc.transport_provider_id = ?) GROUP BY o.id ORDER BY o.created_at DESC LIMIT 50`, [providerId, providerId])
      res.json({ success: true, requests: rows, provider_id: providerId })
    } catch (err) { next(err) }
  })

  router.post('/me/delivery-requests/:orderId/accept', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { orderId } = req.params
      const { delivery_cost, distance, driver_id, vehicle_id, vehicle_type, cargo_type, cargo_weight, pickup_location, destination, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const providerId = providers[0].id
      const [existing] = await pool.query('SELECT id FROM logistics_commissions WHERE order_id = ? AND transport_provider_id = ?', [orderId, providerId])
      if (existing.length > 0) return res.json({ success: false, message: 'Delivery already accepted for this order' })
      let vehicleNumber = vehicle_id || null
      if (vehicle_id) {
        const [vRows] = await pool.query('SELECT registration_number FROM vehicles WHERE id = ? AND provider_id = ?', [vehicle_id, providerId])
        if (vRows.length > 0) vehicleNumber = vRows[0].registration_number
      }
      const commissionRate = 10.0
      const commissionAmount = parseFloat(delivery_cost || 0) * (commissionRate / 100)
      const [result] = await pool.query('INSERT INTO logistics_commissions (order_id, transport_provider_id, delivery_distance, delivery_cost, commission_rate, commission_amount) VALUES (?, ?, ?, ?, ?, ?)', [orderId, providerId, distance || null, delivery_cost || 0, commissionRate, commissionAmount])
      await pool.query('INSERT INTO active_deliveries (order_id, driver_id, vehicle_number, status, transport_provider_id, delivery_cost, delivery_distance, cargo_type, cargo_weight, pickup_location, destination_location, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [orderId, driver_id || null, vehicleNumber, 'pending', providerId, delivery_cost || 0, distance || 0, cargo_type || null, cargo_weight || null, pickup_location || null, destination || null, pickup_latitude || null, pickup_longitude || null, destination_latitude || null, destination_longitude || null])
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', ['shipped', orderId])
      await pool.query('INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, description, recorded_date) VALUES (?, ?, ?, ?, ?, CURDATE())', ['logistics', result.insertId, 'logistics_commission', commissionAmount, `Logistics commission for order #${orderId}`])
      await pool.query('INSERT INTO logistics_earnings (provider_id, order_id, amount, status) VALUES (?, ?, ?, "available")', [providerId, orderId, delivery_cost || 0])
      // Notify the customer that their order has been shipped
      const [[custRow]] = await pool.query('SELECT customer_id FROM orders WHERE id = ?', [orderId])
      if (custRow) {
        await pool.query('INSERT INTO notifications (customer_id, title, message, type, is_read) VALUES (?, ?, ?, ?, 0)', [custRow.customer_id, 'Order Shipped', `Your order #${orderId} has been picked up by the logistics provider.`, 'order', 0])
        realtime.publishNotifications(custRow.customer_id, { type: 'order_shipped', order_id: parseInt(orderId), status: 'shipped' })
        realtime.publishOrders(custRow.customer_id, { order_id: parseInt(orderId), status: 'shipped' })
      }
      // Broadcast to delivery tracking stream
      realtime.publishDeliveries(providerId, { order_id: parseInt(orderId), status: 'pending', created_at: new Date().toISOString() })
      res.json({ success: true, commission_id: result.insertId })
    } catch (err) { next(err) }
  })

  router.post('/me/delivery-requests/:orderId/decline', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { orderId } = req.params
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const providerId = providers[0].id
      const [existing] = await pool.query('SELECT id FROM logistics_commissions WHERE order_id = ? AND transport_provider_id = ?', [orderId, providerId])
      if (existing.length === 0) return res.json({ success: false, message: 'No delivery commission found for this order' })
      await pool.query('UPDATE logistics_commissions SET status = ? WHERE id = ?', ['declined', existing[0].id])
      res.json({ success: true, message: 'Delivery request declined' })
    } catch (err) { next(err) }
  })

  router.put('/me/deliveries/:id/status', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { status } = req.body
      const validStatuses = ['pending', 'in_transit', 'delivered', 'cancelled']
      if (!validStatuses.includes(status)) return res.json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const providerId = providers[0].id
      const [rows] = await pool.query('SELECT status FROM active_deliveries WHERE id = ? AND transport_provider_id = ?', [req.params.id, providerId])
      if (rows.length === 0) return res.json({ success: false, message: 'Delivery not found' })
      const currentStatus = rows[0].status
      if (currentStatus === 'delivered' || currentStatus === 'cancelled') {
        if (status !== currentStatus) return res.json({ success: false, message: `Cannot change status from ${currentStatus} to ${status}` })
      }
      await pool.query('UPDATE active_deliveries SET status = ?, updated_at = NOW() WHERE id = ? AND transport_provider_id = ?', [status, req.params.id, providerId])
      if (status === 'delivered') {
        await pool.query('UPDATE orders SET status = ? WHERE id = (SELECT order_id FROM active_deliveries WHERE id = ?)', ['delivered', req.params.id])
      }
      // Broadcast to all devices connected to this provider's delivery stream
      realtime.publishDeliveries(providerId, { delivery_id: parseInt(req.params.id), status, updated_at: new Date().toISOString() })
      res.json({ success: true })
    } catch (err) { next(err) }
  })

  router.get('/me/delivery-history', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, history: [] })
      const [rows] = await pool.query(
        `SELECT ad.id, ad.order_id, o.order_number, o.shipping_address, ad.status, ad.delivery_distance, ad.delivery_cost, ad.started_at, ad.updated_at,
         c.full_name AS customer_name, p.name AS product_name
         FROM active_deliveries ad
         JOIN orders o ON o.id = ad.order_id
         JOIN customers c ON c.id = o.customer_id
         LEFT JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE ad.transport_provider_id = ? AND ad.status IN ('delivered','cancelled')
         ORDER BY ad.updated_at DESC`,
        [providers[0].id]
      )
      res.json({ success: true, history: rows })
    } catch (err) { next(err) }
  })

  router.get('/me/delivery-tracking', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT o.id, o.order_number, o.total_amount, o.status, o.shipping_address, o.payment_method, o.created_at,
          ad.driver_id, ad.vehicle_number, ad.vehicle_type, ad.cargo_type, ad.cargo_weight, ad.pickup_location, ad.delivery_address, ad.status AS delivery_status, ad.started_at, ad.estimated_arrival,
          c.full_name AS customer_name, c.phone AS customer_phone,
          CONCAT(drv.name, ' (', drv.phone, ')') AS driver_name
        FROM orders o
        LEFT JOIN active_deliveries ad ON ad.order_id = o.id
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN drivers drv ON drv.id = ad.driver_id
        WHERE o.customer_id = ?
        ORDER BY o.created_at DESC`,
        [req.user.customerId]
      )
      res.json({ success: true, deliveries: rows })
    } catch (err) { next(err) }
  })

  router.get('/me/seller/delivery-tracking', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT o.id, o.order_number, o.total_amount, o.status, o.shipping_address, o.payment_method, o.created_at,
          ad.driver_id, ad.vehicle_number, ad.vehicle_type, ad.cargo_type, ad.cargo_weight, ad.pickup_location, ad.delivery_address, ad.status AS delivery_status, ad.started_at, ad.estimated_arrival,
          c.full_name AS customer_name, c.phone AS customer_phone,
          CONCAT(drv.name, ' (', drv.phone, ')') AS driver_name
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN active_deliveries ad ON ad.order_id = o.id
        LEFT JOIN customers c ON c.id = o.customer_id
        LEFT JOIN drivers drv ON drv.id = ad.driver_id
        WHERE p.seller_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC`,
        [req.user.customerId]
      )
      res.json({ success: true, deliveries: rows })
    } catch (err) { next(err) }
  })

  // ============ Documents ============
  router.get('/me/my-documents', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, documents: [] })
      const [rows] = await pool.query('SELECT * FROM logistics_documents WHERE provider_id = ? ORDER BY created_at DESC', [providers[0].id])
      res.json({ success: true, documents: rows })
    } catch (err) { next(err) }
  })

  router.post('/me/my-documents', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { document_type, document_url, document_number, issued_date, expiry_date } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const [result] = await pool.query('INSERT INTO logistics_documents (provider_id, document_type, document_url, document_number, issued_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?)', [providers[0].id, document_type, document_url, document_number || null, issued_date || null, expiry_date || null])
      res.json({ success: true, document_id: result.insertId })
    } catch (err) { next(err) }
  })

   router.delete('/me/my-documents/:id', requireAuth, requireLogisticsRole, async (req, res, next) => {
     try {
       const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
       if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
       await pool.query('DELETE FROM logistics_documents WHERE id = ? AND provider_id = ?', [req.params.id, providers[0].id])
       res.json({ success: true })
     } catch (err) { next(err) }
   })

   router.put('/me/my-documents/:id', requireAuth, requireLogisticsRole, csrfProtection, async (req, res, next) => {
     try {
       const { document_type, document_url, document_number, issued_date, expiry_date } = req.body
       const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
       if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
       const [result] = await pool.query(
         `UPDATE logistics_documents SET document_type = ?, document_url = ?, document_number = ?, issued_date = ?, expiry_date = ?
          WHERE id = ? AND provider_id = ?`,
         [document_type, document_url, document_number || null, issued_date || null, expiry_date || null, req.params.id, providers[0].id]
       )
       if (result.affectedRows === 0) return res.json({ success: false, message: 'Document not found or not owned by you' })
       res.json({ success: true, message: 'Document updated' })
     } catch (err) { next(err) }
   })

   // ============ Ratings ============
  router.get('/me/my-ratings', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, ratings: [], average_rating: 0 })
      const providerId = providers[0].id
      const [rows] = await pool.query('SELECT lr.*, c.full_name AS customer_name, o.order_number FROM logistics_ratings lr JOIN customers c ON lr.customer_id = c.id JOIN orders o ON o.id = lr.order_id WHERE lr.provider_id = ? ORDER BY lr.created_at DESC', [providerId])
      const [[avg]] = await pool.query('SELECT COALESCE(AVG(rating), 0) AS average_rating FROM logistics_ratings WHERE provider_id = ?', [providerId])
      res.json({ success: true, ratings: rows, average_rating: avg.average_rating })
    } catch (err) { next(err) }
  })

  router.get('/me/my-earnings', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, earnings: [], summary: {} })
      const providerId = providers[0].id
      const [rows] = await pool.query('SELECT le.*, o.order_number FROM logistics_earnings le JOIN orders o ON o.id = le.order_id WHERE le.provider_id = ? ORDER BY le.created_at DESC LIMIT 100', [providerId])
      const [[summary]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total_earnings, COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) AS available_balance, COALESCE(SUM(CASE WHEN status = 'withdrawn' THEN amount ELSE 0 END), 0) AS withdrawn, COUNT(*) AS total_transactions FROM logistics_earnings WHERE provider_id = ?", [providerId])
      res.json({ success: true, earnings: rows, summary })
    } catch (err) { next(err) }
  })

  router.post('/me/my-earnings/withdraw', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { amount } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const [[summary]] = await pool.query("SELECT COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END), 0) AS available_balance FROM logistics_earnings WHERE provider_id = ?", [providers[0].id])
      const availableBalance = parseFloat(summary.available_balance || 0)
      const withdrawAmount = parseFloat(amount || 0)
      if (withdrawAmount <= 0 || withdrawAmount > availableBalance) return res.json({ success: false, message: 'Invalid withdrawal amount' })
      await pool.query("UPDATE logistics_earnings SET status = 'withdrawn', paid_at = NOW() WHERE provider_id = ? AND status = 'available'", [providers[0].id])
      res.json({ success: true, message: 'Withdrawal processed', amount: withdrawAmount })
    } catch (err) { next(err) }
  })

  router.get('/me/my-earnings/summary', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, summary: { today: 0, week: 0, month: 0, total: 0, available: 0 } })
      const providerId = providers[0].id
      const [[today]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS today FROM logistics_earnings WHERE provider_id = ? AND DATE(created_at) = CURDATE()", [providerId])
      const [[week]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS week FROM logistics_earnings WHERE provider_id = ? AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)", [providerId])
      const [[month]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS month FROM logistics_earnings WHERE provider_id = ? AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())", [providerId])
      const [[total]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM logistics_earnings WHERE provider_id = ?", [providerId])
      const [[available]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS available FROM logistics_earnings WHERE provider_id = ? AND status = 'available'", [providerId])
      res.json({ success: true, summary: { today: today.today || 0, week: week.week || 0, month: month.month || 0, total: total.total || 0, available: available.available || 0 } })
    } catch (err) { next(err) }
  })

  router.get('/me/my-analytics', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, analytics: {} })
      const providerId = providers[0].id
      const [[deliveryStats]] = await pool.query("SELECT COUNT(*) AS total_deliveries, COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) AS completed_deliveries, COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_deliveries, COALESCE(SUM(CASE WHEN status IN ('in_transit','pending') THEN 1 ELSE 0 END), 0) AS active_deliveries FROM active_deliveries WHERE transport_provider_id = ?", [providerId])
      const [[earningsStats]] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS total_earnings, COALESCE(AVG(amount), 0) AS avg_per_delivery FROM logistics_earnings WHERE provider_id = ?', [providerId])
      const [[ratingStats]] = await pool.query('SELECT COALESCE(AVG(rating), 0) AS average_rating, COUNT(*) AS total_ratings FROM logistics_ratings WHERE provider_id = ?', [providerId])
      const [[topRoute]] = await pool.query('SELECT o.shipping_address, COUNT(*) AS delivery_count FROM active_deliveries ad JOIN orders o ON o.id = ad.order_id WHERE ad.transport_provider_id = ? GROUP BY o.shipping_address ORDER BY delivery_count DESC LIMIT 1', [providerId])
      const [[onTime]] = await pool.query("SELECT COUNT(*) AS on_time_count FROM active_deliveries WHERE transport_provider_id = ? AND status = 'delivered'", [providerId])
      const onTimePct = deliveryStats.total_deliveries > 0 ? Math.round((onTime.on_time_count / deliveryStats.total_deliveries) * 100) : 0
      res.json({ success: true, analytics: { ...deliveryStats, ...earningsStats, ...ratingStats, top_route: topRoute?.shipping_address || 'N/A', on_time_delivery_pct: onTimePct } })
    } catch (err) { next(err) }
  })

  // ============ Inventory & warehouse flows ============
  router.get('/inventory', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT i.*, p.name AS product_name, p.image_url, ws.warehouse_name, ws.location
         FROM inventory i
         LEFT JOIN products p ON i.product_id = p.id
         LEFT JOIN warehouse_services ws ON i.warehouse_id = ws.id
         ORDER BY i.last_updated DESC`
      )
      const [[lowStock]] = await pool.query('SELECT COUNT(*) AS n FROM inventory WHERE quantity < min_threshold')
      res.json({ success: true, inventory: rows, low_stock_count: lowStock.n })
    } catch (err) { next(err) }
  })

  router.get('/inventory/movements', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT io.*, p.name AS product_name, ws.warehouse_name FROM inward_outward io
         LEFT JOIN products p ON io.product_id = p.id
         LEFT JOIN warehouse_services ws ON io.warehouse_id = ws.id
         ORDER BY io.created_at DESC LIMIT 100`
      )
      res.json({ success: true, movements: rows })
    } catch (err) { next(err) }
  })

  // ============ Logistics & Warehouse Admin ============
  router.get('/admin/logistics-applications', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status } = req.query
      let sql = `SELECT la.*, c.full_name AS applicant_name, c.email, c.phone FROM logistics_applications la
                 JOIN customers c ON la.customer_id = c.id WHERE 1=1`
      const params = []
      if (status) { sql += ' AND la.status = ?'; params.push(status) }
      sql += ' ORDER BY la.created_at DESC'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, applications: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/warehouse-applications', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status } = req.query
      let sql = `SELECT wa.*, c.full_name AS applicant_name, c.email, c.phone FROM warehouse_applications wa
                 JOIN customers c ON wa.customer_id = c.id WHERE 1=1`
      const params = []
      if (status) { sql += ' AND wa.status = ?'; params.push(status) }
      sql += ' ORDER BY wa.created_at DESC'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, applications: rows })
    } catch (err) { next(err) }
  })

  router.post('/admin/logistics-applications/:id/approve', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { notes } = req.body
      const [rows] = await pool.query('SELECT * FROM logistics_applications WHERE id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Application not found' })
      const app = rows[0]
      if (app.status !== 'pending') return res.json({ success: false, message: 'Application already processed' })
      await pool.query('UPDATE logistics_applications SET status = ?, notes = ?, reviewed_at = NOW() WHERE id = ?', ['approved', notes || null, req.params.id])
      await pool.query('UPDATE customers SET is_verified = 1 WHERE id = ?', [app.customer_id])
      const [providerResult] = await pool.query(
        `INSERT INTO transport_providers (company_name, contact_person, phone, email, vehicle_types, coverage_areas, base_rate_per_km, commission_rate, owner_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [app.company_name, app.contact_person, app.phone, app.email, app.vehicle_types, app.coverage_areas, app.base_rate_per_km, app.commission_rate, app.customer_id]
      )
      await pool.query('UPDATE logistics_applications SET provider_id = ? WHERE id = ?', [providerResult.insertId, req.params.id])
      res.json({ success: true, message: 'Logistics application approved', provider_id: providerResult.insertId })
    } catch (err) { next(err) }
  })

  router.post('/admin/logistics-applications/:id/reject', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { notes } = req.body
      const [rows] = await pool.query('SELECT * FROM logistics_applications WHERE id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Application not found' })
      const app = rows[0]
      if (app.status !== 'pending') return res.json({ success: false, message: 'Application already processed' })
      await pool.query('UPDATE logistics_applications SET status = ?, notes = ?, reviewed_at = NOW() WHERE id = ?', ['rejected', notes || null, req.params.id])
      await pool.query('UPDATE customers SET is_active = 0 WHERE id = ?', [app.customer_id])
      res.json({ success: true, message: 'Logistics application rejected' })
    } catch (err) { next(err) }
  })

  router.post('/admin/warehouse-applications/:id/approve', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { notes } = req.body
      const [rows] = await pool.query('SELECT * FROM warehouse_applications WHERE id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Application not found' })
      const app = rows[0]
      if (app.status !== 'pending') return res.json({ success: false, message: 'Application already processed' })
      await pool.query('UPDATE warehouse_applications SET status = ?, notes = ?, reviewed_at = NOW() WHERE id = ?', ['approved', notes || null, req.params.id])
      await pool.query('UPDATE customers SET is_verified = 1 WHERE id = ?', [app.customer_id])
      const [warehouseResult] = await pool.query(
        `INSERT INTO warehouse_services (warehouse_name, owner_id, location, region, capacity_tonnes, available_space, rate_per_tonne_day, services, commission_rate, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [app.warehouse_name, app.customer_id, app.location, app.region, app.capacity_tonnes, app.capacity_tonnes, app.rate_per_tonne_day, app.storage_types, 5.0]
      )
      await pool.query('UPDATE warehouse_applications SET warehouse_id = ? WHERE id = ?', [warehouseResult.insertId, req.params.id])
      res.json({ success: true, message: 'Warehouse application approved', warehouse_id: warehouseResult.insertId })
    } catch (err) { next(err) }
  })

  router.post('/admin/warehouse-applications/:id/reject', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { notes } = req.body
      const [rows] = await pool.query('SELECT * FROM warehouse_applications WHERE id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Application not found' })
      const app = rows[0]
      if (app.status !== 'pending') return res.json({ success: false, message: 'Application already processed' })
      await pool.query('UPDATE warehouse_applications SET status = ?, notes = ?, reviewed_at = NOW() WHERE id = ?', ['rejected', notes || null, req.params.id])
      await pool.query('UPDATE customers SET is_active = 0 WHERE id = ?', [app.customer_id])
      res.json({ success: true, message: 'Warehouse application rejected' })
    } catch (err) { next(err) }
  })

  router.get('/admin/logistics/documents', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT ld.*, tp.company_name, c.full_name AS owner_name
         FROM logistics_documents ld
         JOIN transport_providers tp ON tp.id = ld.provider_id
         JOIN customers c ON c.id = tp.owner_id
         ORDER BY ld.created_at DESC`
      )
      res.json({ success: true, documents: rows })
    } catch (err) { next(err) }
  })

  router.put('/admin/logistics/documents/:id/verify', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { is_verified, notes } = req.body
      await pool.query('UPDATE logistics_documents SET is_verified = ?, verified_at = NOW(), verification_notes = ? WHERE id = ?', [is_verified ? 1 : 0, notes || null, req.params.id])
      res.json({ success: true, message: is_verified ? 'Document verified' : 'Document rejected' })
    } catch (err) { next(err) }
  })

  // ============ User-specific ============
  router.get('/me/saved-addresses', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM saved_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC', [req.user.customerId])
      res.json({ success: true, addresses: rows })
    } catch (err) { next(err) }
  })

  router.get('/me/payment-methods', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT id, type, provider, account_label, account_number_masked, is_default, created_at FROM payment_methods WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC', [req.user.customerId])
      res.json({ success: true, methods: rows })
    } catch (err) { next(err) }
  })

  router.get('/me/my-deliveries', requireAuth, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, deliveries: [], provider_id: null })
      const providerId = providers[0].id
      const [rows] = await pool.query(
        `SELECT ad.*, o.order_number, d.name AS driver_name, d.phone AS driver_phone
         FROM active_deliveries ad
         LEFT JOIN orders o ON ad.order_id = o.id
         LEFT JOIN drivers d ON ad.driver_id = d.id
         WHERE ad.transport_provider_id = ? ORDER BY ad.started_at DESC`,
        [providerId]
      )
      res.json({ success: true, deliveries: rows, provider_id: providerId })
    } catch (err) { next(err) }
  })

  router.put('/me/my-deliveries/:id/location', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { current_location, latitude, longitude } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const providerId = providers[0].id
      const [existing] = await pool.query('SELECT id FROM active_deliveries WHERE id = ? AND transport_provider_id = ?', [req.params.id, providerId])
      if (existing.length === 0) return res.json({ success: false, message: 'Delivery not found' })
      await pool.query('UPDATE active_deliveries SET current_location = ?, current_latitude = ?, current_longitude = ?, updated_at = NOW() WHERE id = ?', [current_location || null, latitude || null, longitude || null, req.params.id])
      // Broadcast live location to all devices tracking this delivery
      realtime.publishDeliveries(providerId, { delivery_id: parseInt(req.params.id), current_location, latitude, longitude, updated_at: new Date().toISOString() })
      res.json({ success: true, message: 'Location updated' })
    } catch (err) { next(err) }
  })

  router.get('/me/my-warehouse-bookings', requireAuth, async (req, res, next) => {
    try {
      const [warehouses] = await pool.query('SELECT id, warehouse_name FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      if (warehouses.length === 0) return res.json({ success: true, bookings: [], warehouses: [] })
      const warehouseIds = warehouses.map(w => w.id)
      const [rows] = await pool.query(
        `SELECT wb.*, ws.warehouse_name, ws.location, ws.region, c.full_name AS customer_name
         FROM warehouse_bookings wb
         JOIN warehouse_services ws ON wb.warehouse_id = ws.id
         JOIN customers c ON wb.customer_id = c.id
         WHERE wb.warehouse_id IN (?)
         ORDER BY wb.created_at DESC`,
        [warehouseIds]
      )
      res.json({ success: true, bookings: rows, warehouses })
    } catch (err) { next(err) }
  })

  router.get('/me/my-warehouse-inventory', requireAuth, async (req, res, next) => {
    try {
      const [warehouses] = await pool.query('SELECT id FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      if (warehouses.length === 0) return res.json({ success: true, inventory: [], movements: [] })
      const warehouseIds = warehouses.map(w => w.id)
      const [inv] = await pool.query(
        `SELECT i.*, p.name AS product_name, p.image_url, ws.warehouse_name
         FROM inventory i
         LEFT JOIN products p ON i.product_id = p.id
         LEFT JOIN warehouse_services ws ON i.warehouse_id = ws.id
         WHERE i.warehouse_id IN (?)
         ORDER BY i.last_updated DESC`,
        [warehouseIds]
      )
      const [mov] = await pool.query(
        `SELECT io.*, p.name AS product_name, ws.warehouse_name FROM inward_outward io
         LEFT JOIN products p ON io.product_id = p.id
         LEFT JOIN warehouse_services ws ON io.warehouse_id = ws.id
         WHERE io.warehouse_id IN (?)
         ORDER BY io.created_at DESC LIMIT 100`,
        [warehouseIds]
      )
      const [[lowStock]] = await pool.query('SELECT COUNT(*) AS n FROM inventory WHERE quantity < min_threshold AND warehouse_id IN (?)', [warehouseIds])
      res.json({ success: true, inventory: inv, movements: mov, low_stock_count: lowStock.n })
    } catch (err) { next(err) }
  })

  // ============ Warehouse Spaces ============
  router.get('/me/my-warehouse-spaces', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const [warehouses] = await pool.query('SELECT id, warehouse_name, capacity_tonnes, available_space FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      res.json({ success: true, spaces: warehouses })
    } catch (err) { next(err) }
  })

  router.post('/me/my-warehouse-spaces', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const { warehouse_name, capacity_tonnes, available_space, location, region, rate_per_tonne_day, services } = req.body
      const [result] = await pool.query('INSERT INTO warehouse_services (warehouse_name, owner_id, capacity_tonnes, available_space, location, region, rate_per_tonne_day, services) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [warehouse_name, req.user.customerId, capacity_tonnes, available_space, location, region, rate_per_tonne_day, services])
      res.json({ success: true, space_id: result.insertId })
    } catch (err) { next(err) }
  })

  router.put('/me/my-warehouse-spaces/:id', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const { capacity_tonnes, available_space, rate_per_tonne_day, services } = req.body
      await pool.query('UPDATE warehouse_services SET capacity_tonnes = ?, available_space = ?, rate_per_tonne_day = ?, services = ? WHERE id = ? AND owner_id = ?', [capacity_tonnes, available_space, rate_per_tonne_day, services, req.params.id, req.user.customerId])
      res.json({ success: true, message: 'Space updated' })
    } catch (err) { next(err) }
  })

  // ============ Warehouse Customers ============
  router.get('/me/my-warehouse-customers', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const [warehouses] = await pool.query('SELECT id FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      if (warehouses.length === 0) return res.json({ success: true, customers: [] })
      const warehouseIds = warehouses.map(w => w.id)
      const [rows] = await pool.query(
        `SELECT DISTINCT c.id, c.full_name, c.email, c.phone,
          COUNT(DISTINCT wb.id) AS total_bookings,
          SUM(wb.quantity) AS total_quantity,
          SUM(wb.storage_fee) AS total_spend,
          MAX(wb.created_at) AS last_booking
         FROM warehouse_bookings wb
         JOIN customers c ON c.id = wb.customer_id
         WHERE wb.warehouse_id IN (?)
         GROUP BY c.id
         ORDER BY last_booking DESC`,
        [warehouseIds]
      )
      res.json({ success: true, customers: rows })
    } catch (err) { next(err) }
  })

  // ============ Warehouse Earnings ============
  router.get('/me/my-warehouse-earnings', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const [warehouses] = await pool.query('SELECT id FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      if (warehouses.length === 0) return res.json({ success: true, earnings: [], summary: { total: 0, available: 0 } })
      const warehouseIds = warehouses.map(w => w.id)
      const [rows] = await pool.query(
        `SELECT wb.*, ws.warehouse_name, c.full_name AS customer_name
         FROM warehouse_bookings wb
         JOIN warehouse_services ws ON ws.id = wb.warehouse_id
         JOIN customers c ON c.id = wb.customer_id
         WHERE wb.warehouse_id IN (?)
         ORDER BY wb.created_at DESC`,
        [warehouseIds]
      )
      const [[summary]] = await pool.query(
        `SELECT COALESCE(SUM(storage_fee), 0) AS total, COALESCE(SUM(CASE WHEN status = 'paid' THEN storage_fee ELSE 0 END), 0) AS available
         FROM warehouse_bookings WHERE warehouse_id IN (?)`,
        [warehouseIds]
      )
      res.json({ success: true, earnings: rows, summary })
    } catch (err) { next(err) }
  })

  router.post('/me/my-warehouse-earnings/withdraw', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const { amount } = req.body
      if (!amount || amount <= 0) return res.json({ success: false, message: 'Invalid amount' })
      res.json({ success: true, message: 'Withdrawal request submitted' })
    } catch (err) { next(err) }
  })

  // ============ Warehouse Documents ============
  router.get('/me/my-warehouse-documents', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const [docs] = await pool.query('SELECT * FROM warehouse_documents WHERE warehouse_id IN (SELECT id FROM warehouse_services WHERE owner_id = ?)', [req.user.customerId])
      res.json({ success: true, documents: docs })
    } catch (err) { next(err) }
  })

  router.post('/me/my-warehouse-documents', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const { document_type, document_url, document_number, issued_date, expiry_date } = req.body
      const [warehouses] = await pool.query('SELECT id FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      if (warehouses.length === 0) return res.json({ success: false, message: 'No warehouse found' })
      const [result] = await pool.query('INSERT INTO warehouse_documents (warehouse_id, document_type, document_url, document_number, issued_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?)', [warehouses[0].id, document_type, document_url, document_number, issued_date, expiry_date])
      res.json({ success: true, document_id: result.insertId })
    } catch (err) { next(err) }
  })

  router.put('/me/my-warehouse-documents/:id', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const { document_type, document_url, document_number, issued_date, expiry_date } = req.body
      await pool.query('UPDATE warehouse_documents SET document_type = ?, document_url = ?, document_number = ?, issued_date = ?, expiry_date = ? WHERE id = ? AND warehouse_id IN (SELECT id FROM warehouse_services WHERE owner_id = ?)', [document_type, document_url, document_number, issued_date, expiry_date, req.params.id, req.user.customerId])
      res.json({ success: true, message: 'Document updated' })
    } catch (err) { next(err) }
  })

  router.delete('/me/my-warehouse-documents/:id', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM warehouse_documents WHERE id = ? AND warehouse_id IN (SELECT id FROM warehouse_services WHERE owner_id = ?)', [req.params.id, req.user.customerId])
      res.json({ success: true, message: 'Document deleted' })
    } catch (err) { next(err) }
  })

  // ============ Warehouse Profile ============
  router.get('/me/my-warehouse-profile', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const [[profile]] = await pool.query('SELECT * FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      res.json({ success: true, profile: profile || null })
    } catch (err) { next(err) }
  })

  router.put('/me/my-warehouse-profile', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const { warehouse_name, location, region, capacity_tonnes, available_space, rate_per_tonne_day, services, description, operating_hours, contact_person, phone, email } = req.body
      await pool.query('UPDATE warehouse_services SET warehouse_name = ?, location = ?, region = ?, capacity_tonnes = ?, available_space = ?, rate_per_tonne_day = ?, services = ? WHERE owner_id = ?', [warehouse_name, location, region, capacity_tonnes, available_space, rate_per_tonne_day, services, req.user.customerId])
      res.json({ success: true, message: 'Profile updated' })
    } catch (err) { next(err) }
  })

  // ============ Warehouse Subscription ============
  router.get('/me/my-warehouse-subscription', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const [[sub]] = await pool.query('SELECT * FROM warehouse_subscriptions WHERE warehouse_id IN (SELECT id FROM warehouse_services WHERE owner_id = ?) ORDER BY created_at DESC LIMIT 1', [req.user.customerId])
      res.json({ success: true, subscription: sub || null })
    } catch (err) { next(err) }
  })

  router.post('/me/my-warehouse-subscription', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const { plan_name, amount, period_start, period_end, payment_method } = req.body
      const [warehouses] = await pool.query('SELECT id FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      if (warehouses.length === 0) return res.json({ success: false, message: 'No warehouse found' })
      await pool.query('INSERT INTO warehouse_subscriptions (warehouse_id, plan_name, amount, period_start, period_end, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, "active")', [warehouses[0].id, plan_name, amount, period_start, period_end, payment_method])
      res.json({ success: true, message: 'Subscription activated' })
    } catch (err) { next(err) }
  })

  // ============ Warehouse Ratings ============
  router.get('/me/my-warehouse-ratings', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const [ratings] = await pool.query('SELECT wr.*, c.full_name AS customer_name FROM warehouse_ratings wr JOIN customers c ON c.id = wr.customer_id WHERE wr.warehouse_id IN (SELECT id FROM warehouse_services WHERE owner_id = ?) ORDER BY wr.created_at DESC', [req.user.customerId])
      res.json({ success: true, ratings })
    } catch (err) { next(err) }
  })

  // ============ Warehouse Analytics ============
  router.get('/me/my-warehouse-analytics', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const [warehouses] = await pool.query('SELECT id FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      if (warehouses.length === 0) return res.json({ success: true, analytics: {} })
      const warehouseIds = warehouses.map(w => w.id)
      const [[totalBookings]] = await pool.query('SELECT COUNT(*) AS total FROM warehouse_bookings WHERE warehouse_id IN (?)', [warehouseIds])
      const [[activeBookings]] = await pool.query('SELECT COUNT(*) AS total FROM warehouse_bookings WHERE warehouse_id IN (?) AND status IN ("pending", "confirmed", "active")', [warehouseIds])
      const [[totalRevenue]] = await pool.query('SELECT COALESCE(SUM(storage_fee), 0) AS total FROM warehouse_bookings WHERE warehouse_id IN (?)', [warehouseIds])
      const [[avgRating]] = await pool.query('SELECT COALESCE(AVG(rating), 0) AS avg FROM warehouse_ratings WHERE warehouse_id IN (?)', [warehouseIds])
      res.json({ success: true, analytics: { total_bookings: totalBookings.total, active_bookings: activeBookings.total, total_revenue: totalRevenue.total, average_rating: parseFloat(avgRating.avg).toFixed(1) } })
    } catch (err) { next(err) }
  })

  // ============ Warehouse Inbound/Outbound ============
  router.post('/me/warehouse/inbound/confirm', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const { booking_id, quantity_received, quality_grade, moisture_level, notes } = req.body
      const [warehouses] = await pool.query('SELECT id FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      if (warehouses.length === 0) return res.json({ success: false, message: 'No warehouse found' })
      const warehouseId = warehouses[0].id
      const [bookings] = await pool.query('SELECT * FROM warehouse_bookings WHERE id = ? AND warehouse_id = ?', [booking_id, warehouseId])
      if (bookings.length === 0) return res.json({ success: false, message: 'Booking not found' })
      await pool.query('UPDATE warehouse_bookings SET status = "active" WHERE id = ?', [booking_id])
      await pool.query('INSERT INTO inward_outward (type, warehouse_id, product_id, quantity, reference, notes) VALUES ("inward", ?, ?, ?, ?, ?)', [warehouseId, bookings[0].product_type, quantity_received, `Booking #${booking_id}`, notes])
      await pool.query('UPDATE inventory SET quantity = quantity + ? WHERE warehouse_id = ? AND product_id = ?', [quantity_received, warehouseId, bookings[0].product_type])
      res.json({ success: true, message: 'Inbound confirmed' })
    } catch (err) { next(err) }
  })

  router.post('/me/warehouse/outbound/approve', requireAuth, requireWarehouseRole, async (req, res, next) => {
    try {
      const { booking_id, quantity_released, destination, logistics_company, notes } = req.body
      const [warehouses] = await pool.query('SELECT id FROM warehouse_services WHERE owner_id = ?', [req.user.customerId])
      if (warehouses.length === 0) return res.json({ success: false, message: 'No warehouse found' })
      const warehouseId = warehouses[0].id
      const [bookings] = await pool.query('SELECT * FROM warehouse_bookings WHERE id = ? AND warehouse_id = ?', [booking_id, warehouseId])
      if (bookings.length === 0) return res.json({ success: false, message: 'Booking not found' })
      await pool.query('UPDATE warehouse_bookings SET status = "completed" WHERE id = ?', [booking_id])
      await pool.query('INSERT INTO inward_outward (type, warehouse_id, product_id, quantity, reference, notes) VALUES ("outward", ?, ?, ?, ?, ?)', [warehouseId, bookings[0].product_type, quantity_released, `Booking #${booking_id}`, `To: ${destination} via ${logistics_company || 'N/A'}`])
      await pool.query('UPDATE inventory SET quantity = quantity - ? WHERE warehouse_id = ? AND product_id = ?', [quantity_released, warehouseId, bookings[0].product_type])
      res.json({ success: true, message: 'Outbound approved' })
    } catch (err) { next(err) }
  })

  // ============ Logistics Profile ============
  router.get('/me/my-profile', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, profile: null })
      const providerId = providers[0].id
      const [[provider]] = await pool.query('SELECT * FROM transport_providers WHERE id = ?', [providerId])
      const [[profile]] = await pool.query('SELECT * FROM logistics_profiles WHERE provider_id = ?', [providerId])
      const [[docCount]] = await pool.query('SELECT COUNT(*) AS total, SUM(CASE WHEN is_verified=1 THEN 1 ELSE 0 END) AS verified FROM logistics_documents WHERE provider_id = ?', [providerId])
      const [[ratingStats]] = await pool.query('SELECT COALESCE(AVG(rating), 0) AS average_rating, COUNT(*) AS total_ratings FROM logistics_ratings WHERE provider_id = ?', [providerId])
      const [[deliveryCount]] = await pool.query('SELECT COUNT(*) AS total FROM active_deliveries WHERE transport_provider_id = ? AND status = "delivered"', [providerId])
      res.json({ success: true, profile: { ...provider, ...profile, doc_count: docCount, rating_stats: ratingStats, delivery_count: deliveryCount.total } })
    } catch (err) { next(err) }
  })

  router.put('/me/my-profile', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { company_name, contact_person, phone, email, coverage_areas, vehicle_types, description, operating_regions, operating_hours, website_url, logo_url } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const providerId = providers[0].id
      await pool.query('UPDATE transport_providers SET company_name = ?, contact_person = ?, phone = ?, email = ?, coverage_areas = ?, vehicle_types = ? WHERE id = ?', [company_name, contact_person, phone, email, coverage_areas, vehicle_types, providerId])
      await pool.query('INSERT INTO logistics_profiles (provider_id, description, operating_regions, operating_hours, website_url, logo_url) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description), operating_regions = VALUES(operating_regions), operating_hours = VALUES(operating_hours), website_url = VALUES(website_url), logo_url = VALUES(logo_url)', [providerId, description, operating_regions, operating_hours, website_url, logo_url])
      res.json({ success: true, message: 'Profile updated' })
    } catch (err) { next(err) }
  })

  // ============ Logistics Subscription ============
  router.get('/me/my-subscription', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, subscription: null })
      const providerId = providers[0].id
      const [[sub]] = await pool.query('SELECT * FROM logistics_subscriptions WHERE provider_id = ? ORDER BY created_at DESC LIMIT 1', [providerId])
      res.json({ success: true, subscription: sub || null })
    } catch (err) { next(err) }
  })

  router.post('/me/subscribe', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { plan_slug, plan_name, amount, period_start, period_end, payment_method } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const providerId = providers[0].id
      const [result] = await pool.query('INSERT INTO logistics_subscriptions (provider_id, plan_slug, plan_name, amount, period_start, period_end, payment_status, payment_method) VALUES (?, ?, ?, ?, ?, ?, "completed", ?)', [providerId, plan_slug, plan_name, amount, period_start, period_end, payment_method || 'mpesa'])
      res.json({ success: true, subscription_id: result.insertId })
    } catch (err) { next(err) }
  })

  router.post('/me/promote', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const { placement, duration_days, amount } = req.body
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: false, message: 'No transport provider found' })
      const providerId = providers[0].id
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + (duration_days || 7))
      await pool.query('UPDATE logistics_profiles SET is_featured = 1, featured_until = ? WHERE provider_id = ?', [endDate.toISOString().split('T')[0], providerId])
      res.json({ success: true, message: 'Company promoted successfully' })
    } catch (err) { next(err) }
  })

  // ============ Logistics Notifications ============
  router.get('/me/my-notifications', requireAuth, requireLogisticsRole, async (req, res, next) => {
    try {
      const [providers] = await pool.query('SELECT id FROM transport_providers WHERE owner_id = ?', [req.user.customerId])
      if (providers.length === 0) return res.json({ success: true, notifications: [] })
      const providerId = providers[0].id
      const [rows] = await pool.query(
        `SELECT n.*, o.order_number FROM notifications n
         LEFT JOIN orders o ON JSON_UNQUOTE(JSON_EXTRACT(n.data, '$.order_id')) = o.id
         WHERE n.customer_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(n.data, '$.provider_id')) = ?
         ORDER BY n.created_at DESC LIMIT 50`,
        [req.user.customerId, providerId]
      )
      res.json({ success: true, notifications: rows })
    } catch (err) { next(err) }
  })

  // ============ Content Moderation ============
  router.get('/admin/moderation/queue', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, entity_type, limit = 20, offset = 0 } = req.query
      let sql = `SELECT cmq.*, c.full_name AS reported_by_name,
                        CASE WHEN cmq.entity_type = 'product' THEN p.name
                             WHEN cmq.entity_type = 'review' THEN rv.comment
                             WHEN cmq.entity_type = 'message' THEN m.content
                             ELSE 'N/A' END AS entity_preview
                 FROM content_moderation_queue cmq
                 LEFT JOIN customers c ON cmq.reported_by = c.id
                 LEFT JOIN products p ON cmq.entity_type = 'product' AND cmq.entity_id = p.id
                 LEFT JOIN reviews rv ON cmq.entity_type = 'review' AND cmq.entity_id = rv.id
                 LEFT JOIN messages m ON cmq.entity_type = 'message' AND cmq.entity_id = m.id
                 WHERE 1=1`
      const params = []
      if (status) { sql += ' AND cmq.status = ?'; params.push(status) }
      if (entity_type) { sql += ' AND cmq.entity_type = ?'; params.push(entity_type) }
      sql += ' ORDER BY cmq.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const whereClause = []
      const countParams = []
      if (status) { whereClause.push('cmq.status = ?'); countParams.push(status) }
      if (entity_type) { whereClause.push('cmq.entity_type = ?'); countParams.push(entity_type) }
      const whereStr = whereClause.length > 0 ? ' WHERE ' + whereClause.join(' AND ') : ''
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM content_moderation_queue cmq${whereStr}`, countParams)
      res.json({ success: true, queue: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.get('/admin/moderation/queue/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM content_moderation_queue WHERE id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Queue item not found' })
      res.json({ success: true, item: rows[0] })
    } catch (err) { next(err) }
  })

  router.post('/admin/moderation/queue/:id/action', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { action_type, notes } = req.body
      const validActions = ['approve', 'reject', 'hide', 'escalate', 'dismiss']
      if (!validActions.includes(action_type)) return res.json({ success: false, message: 'Invalid action' })
      const [rows] = await pool.query('SELECT * FROM content_moderation_queue WHERE id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Queue item not found' })
      const item = rows[0]
      const newStatus = action_type === 'approve' ? 'approved' : action_type === 'reject' ? 'rejected' : action_type === 'hide' ? 'rejected' : 'escalated'
      await pool.query('UPDATE content_moderation_queue SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?', [newStatus, notes || null, req.user.customerId, req.params.id])
      await pool.query('INSERT INTO moderation_actions (queue_id, action_type, admin_id, notes, previous_status, new_status) VALUES (?, ?, ?, ?, ?, ?)', [parseInt(req.params.id), action_type, req.user.customerId, notes || null, item.status, newStatus])
      res.json({ success: true, message: `Content ${action_type}d` })
    } catch (err) { next(err) }
  })

  router.get('/admin/moderation/rules', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM moderation_rules ORDER BY entity_type, severity DESC')
      res.json({ success: true, rules: rows })
    } catch (err) { next(err) }
  })

  router.post('/admin/moderation/rules', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, entity_type, rule_type, pattern, severity, action } = req.body
      if (!name || !entity_type || !pattern) return res.json({ success: false, message: 'Name, entity_type, and pattern are required' })
      const [result] = await pool.query('INSERT INTO moderation_rules (name, entity_type, rule_type, pattern, severity, action) VALUES (?, ?, ?, ?, ?, ?)', [name, entity_type, rule_type || 'keyword', pattern, severity || 'medium', action || 'flag'])
      res.json({ success: true, rule_id: result.insertId, message: 'Rule created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/moderation/rules/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, pattern, severity, action, is_active } = req.body
      const [result] = await pool.query('UPDATE moderation_rules SET name = ?, pattern = ?, severity = ?, action = ?, is_active = ? WHERE id = ?', [name, pattern, severity || 'medium', action || 'flag', is_active !== false ? 1 : 0, req.params.id])
      res.json({ success: true, message: 'Rule updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/moderation/rules/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM moderation_rules WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Rule deleted' })
    } catch (err) { next(err) }
  })

  // ============ Tax / VAT Configuration ============
  router.get('/admin/tax', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { region, type, is_active, limit = 50, offset = 0 } = req.query
      let sql = 'SELECT tc.*, c.full_name AS created_by_name FROM tax_configurations tc LEFT JOIN customers c ON tc.created_by = c.id WHERE 1=1'
      const params = []
      if (region) { sql += ' AND tc.region = ?'; params.push(region) }
      if (type) { sql += ' AND tc.type = ?'; params.push(type) }
      if (is_active !== undefined && is_active !== '') { sql += ' AND tc.is_active = ?'; params.push(is_active === 'true' ? 1 : 0) }
      sql += ' ORDER BY tc.region, tc.type ASC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const whereClause = []
      const countParams = []
      if (region) { whereClause.push('tc.region = ?'); countParams.push(region) }
      if (type) { whereClause.push('tc.type = ?'); countParams.push(type) }
      if (is_active !== undefined && is_active !== '') { whereClause.push('tc.is_active = ?'); countParams.push(is_active === 'true' ? 1 : 0) }
      const whereStr = whereClause.length > 0 ? ' WHERE ' + whereClause.join(' AND ') : ''
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM tax_configurations tc${whereStr}`, countParams)
      res.json({ success: true, taxes: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.get('/admin/tax/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM tax_configurations WHERE id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Tax configuration not found' })
      res.json({ success: true, tax: rows[0] })
    } catch (err) { next(err) }
  })

  router.post('/admin/tax', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, type, rate, region, country, applies_to, min_amount, max_amount, is_inclusive, tax_number, registration_required } = req.body
      if (!name || !rate || !region) return res.json({ success: false, message: 'Name, rate, and region are required' })
      const [result] = await pool.query(
        `INSERT INTO tax_configurations (name, type, rate, region, country, applies_to, min_amount, max_amount, is_inclusive, tax_number, registration_required, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, type || 'vat', rate, region, country || 'Tanzania', applies_to || 'all', min_amount || 0, max_amount || null, is_inclusive ? 1 : 0, tax_number || null, registration_required ? 1 : 0, req.user.customerId]
      )
      res.json({ success: true, tax_id: result.insertId, message: 'Tax configuration created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/tax/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, type, rate, region, country, applies_to, min_amount, max_amount, is_inclusive, tax_number, registration_required, is_active } = req.body
      const [result] = await pool.query(
        `UPDATE tax_configurations SET name = ?, type = ?, rate = ?, region = ?, country = ?, applies_to = ?, min_amount = ?, max_amount = ?, is_inclusive = ?, tax_number = ?, registration_required = ?, is_active = ? WHERE id = ?`,
        [name, type, rate, region, country || 'Tanzania', applies_to, min_amount || 0, max_amount || null, is_inclusive ? 1 : 0, tax_number || null, registration_required ? 1 : 0, is_active !== false ? 1 : 0, req.params.id]
      )
      res.json({ success: true, message: 'Tax configuration updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/tax/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM tax_configurations WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Tax configuration deleted' })
    } catch (err) { next(err) }
  })

  router.get('/admin/tax/exemptions', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT te.*, tc.name AS tax_name, tc.type AS tax_type, c.full_name AS customer_name, p.name AS product_name
         FROM tax_exemptions te
         LEFT JOIN tax_configurations tc ON te.tax_configuration_id = tc.id
         LEFT JOIN customers c ON te.customer_id = c.id
         LEFT JOIN products p ON te.product_id = p.id
         ORDER BY te.created_at DESC`
      )
      res.json({ success: true, exemptions: rows })
    } catch (err) { next(err) }
  })

  router.post('/admin/tax/exemptions', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { tax_configuration_id, customer_id, product_id, reason, certificate_number, valid_from, valid_until } = req.body
      if (!tax_configuration_id || !reason || !valid_from) return res.json({ success: false, message: 'Tax configuration, reason, and valid_from are required' })
      const [result] = await pool.query('INSERT INTO tax_exemptions (tax_configuration_id, customer_id, product_id, reason, certificate_number, valid_from, valid_until) VALUES (?, ?, ?, ?, ?, ?, ?)', [tax_configuration_id, customer_id || null, product_id || null, reason, certificate_number || null, valid_from, valid_until || null])
      res.json({ success: true, exemption_id: result.insertId, message: 'Exemption created' })
    } catch (err) { next(err) }
  })

  // ============ Promotions & Coupons ============
  router.get('/admin/promotions', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, type, search, limit = 20, offset = 0 } = req.query
      let sql = `SELECT p.*, c.full_name AS created_by_name FROM promotions p LEFT JOIN customers c ON p.created_by = c.id WHERE 1=1`
      const params = []
      if (status === 'active') { sql += ' AND p.is_active = 1 AND p.start_date <= NOW() AND p.end_date >= NOW()'; }
      else if (status === 'expired') { sql += ' AND p.end_date < NOW()'; }
      else if (status === 'draft') { sql += ' AND p.is_active = 0'; }
      if (type) { sql += ' AND p.type = ?'; params.push(type) }
      if (search) { sql += ' AND p.name LIKE ?'; params.push(`%${search}%`) }
      sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const whereClause = []
      const countParams = []
      if (status === 'active') { whereClause.push('p.is_active = 1 AND p.start_date <= NOW() AND p.end_date >= NOW()'); }
      else if (status === 'expired') { whereClause.push('p.end_date < NOW()'); }
      else if (status === 'draft') { whereClause.push('p.is_active = 0'); }
      if (type) { whereClause.push('p.type = ?'); countParams.push(type) }
      if (search) { whereClause.push('p.name LIKE ?'); countParams.push(`%${search}%`) }
      const whereStr = whereClause.length > 0 ? ' WHERE ' + whereClause.join(' AND ') : ''
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM promotions p${whereStr}`, countParams)
      res.json({ success: true, promotions: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.get('/admin/promotions/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT p.*, c.full_name AS created_by_name FROM promotions p LEFT JOIN customers c ON p.created_by = c.id WHERE p.id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Promotion not found' })
      res.json({ success: true, promotion: rows[0] })
    } catch (err) { next(err) }
  })

  router.post('/admin/promotions', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, description, type, value, min_order_amount, max_discount_amount, applicable_categories, applicable_products, target_roles, usage_limit, per_user_limit, start_date, end_date } = req.body
      if (!name || !value || !start_date || !end_date) return res.json({ success: false, message: 'Name, value, start_date, and end_date are required' })
      const [result] = await pool.query(
        `INSERT INTO promotions (name, description, type, value, min_order_amount, max_discount_amount, applicable_categories, applicable_products, target_roles, usage_limit, per_user_limit, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, description || null, type || 'percentage', value, min_order_amount || 0, max_discount_amount || null, applicable_categories ? JSON.stringify(applicable_categories) : null, applicable_products ? JSON.stringify(applicable_products) : null, target_roles ? JSON.stringify(target_roles) : null, usage_limit || null, per_user_limit || 1, start_date, end_date, req.user.customerId]
      )
      res.json({ success: true, promotion_id: result.insertId, message: 'Promotion created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/promotions/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, description, type, value, min_order_amount, max_discount_amount, applicable_categories, applicable_products, target_roles, usage_limit, per_user_limit, start_date, end_date, is_active } = req.body
      const [result] = await pool.query(
        `UPDATE promotions SET name = ?, description = ?, type = ?, value = ?, min_order_amount = ?, max_discount_amount = ?, applicable_categories = ?, applicable_products = ?, target_roles = ?, usage_limit = ?, per_user_limit = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?`,
        [name, description || null, type, value, min_order_amount || 0, max_discount_amount || null, applicable_categories ? JSON.stringify(applicable_categories) : null, applicable_products ? JSON.stringify(applicable_products) : null, target_roles ? JSON.stringify(target_roles) : null, usage_limit || null, per_user_limit || 1, start_date, end_date, is_active !== false ? 1 : 0, req.params.id]
      )
      res.json({ success: true, message: 'Promotion updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/promotions/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM promotions WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Promotion deleted' })
    } catch (err) { next(err) }
  })

  router.get('/admin/coupons', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, search, limit = 20, offset = 0 } = req.query
      let sql = `SELECT c.*, p.name AS promotion_name FROM coupons c LEFT JOIN promotions p ON c.promotion_id = p.id WHERE 1=1`
      const params = []
      if (status === 'active') { sql += ' AND c.is_active = 1 AND c.valid_from <= NOW() AND c.valid_until >= NOW()'; }
      else if (status === 'expired') { sql += ' AND c.valid_until < NOW()'; }
      else if (status === 'draft') { sql += ' AND c.is_active = 0'; }
      if (search) { sql += ' AND c.code LIKE ?'; params.push(`%${search}%`) }
      sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const whereClause = []
      const countParams = []
      if (status === 'active') { whereClause.push('c.is_active = 1 AND c.valid_from <= NOW() AND c.valid_until >= NOW()'); }
      else if (status === 'expired') { whereClause.push('c.valid_until < NOW()'); }
      else if (status === 'draft') { whereClause.push('c.is_active = 0'); }
      if (search) { whereClause.push('c.code LIKE ?'); countParams.push(`%${search}%`) }
      const whereStr = whereClause.length > 0 ? ' WHERE ' + whereClause.join(' AND ') : ''
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM coupons c${whereStr}`, countParams)
      res.json({ success: true, coupons: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.post('/admin/coupons', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { code, promotion_id, type, value, min_order_amount, max_discount_amount, usage_limit, per_user_limit, valid_from, valid_until } = req.body
      if (!code || !value || !valid_from || !valid_until) return res.json({ success: false, message: 'Code, value, valid_from, and valid_until are required' })
      const [result] = await pool.query(
        `INSERT INTO coupons (code, promotion_id, type, value, min_order_amount, max_discount_amount, usage_limit, per_user_limit, valid_from, valid_until, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code.toUpperCase(), promotion_id || null, type || 'percentage', value, min_order_amount || 0, max_discount_amount || null, usage_limit || null, per_user_limit || 1, valid_from, valid_until, req.user.customerId]
      )
      res.json({ success: true, coupon_id: result.insertId, message: 'Coupon created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/coupons/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { code, type, value, min_order_amount, max_discount_amount, usage_limit, per_user_limit, valid_from, valid_until, is_active } = req.body
      const [result] = await pool.query(
        `UPDATE coupons SET code = ?, type = ?, value = ?, min_order_amount = ?, max_discount_amount = ?, usage_limit = ?, per_user_limit = ?, valid_from = ?, valid_until = ?, is_active = ? WHERE id = ?`,
        [code.toUpperCase(), type, value, min_order_amount || 0, max_discount_amount || null, usage_limit || null, per_user_limit || 1, valid_from, valid_until, is_active !== false ? 1 : 0, req.params.id]
      )
      res.json({ success: true, message: 'Coupon updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/coupons/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM coupons WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Coupon deleted' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/tax/exemptions/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM tax_exemptions WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Exemption deleted' })
    } catch (err) { next(err) }
  })

  // ============ Product Categories & Attributes ============
  router.get('/admin/categories', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM product_categories ORDER BY sort_order ASC, name ASC')
      res.json({ success: true, categories: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/categories/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM product_categories WHERE id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Category not found' })
      res.json({ success: true, category: rows[0] })
    } catch (err) { next(err) }
  })

  router.post('/admin/categories', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, slug, description, image_url, parent_id, sort_order, meta_title, meta_description, is_active } = req.body
      if (!name || !slug) return res.json({ success: false, message: 'Name and slug are required' })
      const [result] = await pool.query(
        `INSERT INTO product_categories (name, slug, description, image_url, parent_id, sort_order, meta_title, meta_description, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, slug, description || null, image_url || null, parent_id || null, sort_order || 0, meta_title || null, meta_description || null, is_active !== false ? 1 : 0]
      )
      res.json({ success: true, category_id: result.insertId, message: 'Category created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/categories/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, slug, description, image_url, parent_id, sort_order, meta_title, meta_description, is_active } = req.body
      const [result] = await pool.query(
        `UPDATE product_categories SET name = ?, slug = ?, description = ?, image_url = ?, parent_id = ?, sort_order = ?, meta_title = ?, meta_description = ?, is_active = ? WHERE id = ?`,
        [name, slug, description || null, image_url || null, parent_id || null, sort_order || 0, meta_title || null, meta_description || null, is_active !== false ? 1 : 0, req.params.id]
      )
      res.json({ success: true, message: 'Category updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/categories/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM product_categories WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Category deleted' })
    } catch (err) { next(err) }
  })

  router.get('/admin/attributes', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM product_attributes ORDER BY sort_order ASC, name ASC')
      res.json({ success: true, attributes: rows })
    } catch (err) { next(err) }
  })

  router.get('/admin/attributes/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM product_attributes WHERE id = ?', [req.params.id])
      if (rows.length === 0) return res.json({ success: false, message: 'Attribute not found' })
      res.json({ success: true, attribute: rows[0] })
    } catch (err) { next(err) }
  })

  router.post('/admin/attributes', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, slug, type, unit, is_required, is_filterable, options, sort_order } = req.body
      if (!name || !slug) return res.json({ success: false, message: 'Name and slug are required' })
      const [result] = await pool.query(
        `INSERT INTO product_attributes (name, slug, type, unit, is_required, is_filterable, options, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, slug, type || 'text', unit || null, is_required ? 1 : 0, is_filterable !== false ? 1 : 0, options ? JSON.stringify(options) : null, sort_order || 0]
      )
      res.json({ success: true, attribute_id: result.insertId, message: 'Attribute created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/attributes/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, type, unit, is_required, is_filterable, options, sort_order } = req.body
      const [result] = await pool.query(
        `UPDATE product_attributes SET name = ?, type = ?, unit = ?, is_required = ?, is_filterable = ?, options = ?, sort_order = ? WHERE id = ?`,
        [name, type, unit || null, is_required ? 1 : 0, is_filterable !== false ? 1 : 0, options ? JSON.stringify(options) : null, sort_order || 0, req.params.id]
      )
      res.json({ success: true, message: 'Attribute updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/attributes/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM product_attributes WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Attribute deleted' })
    } catch (err) { next(err) }
  })

  router.post('/admin/categories/:id/attributes', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { attribute_id, is_required, sort_order } = req.body
      if (!attribute_id) return res.json({ success: false, message: 'Attribute ID is required' })
      const [result] = await pool.query(
        'INSERT INTO category_attributes (category_id, attribute_id, is_required, sort_order) VALUES (?, ?, ?, ?)',
        [req.params.id, attribute_id, is_required ? 1 : 0, sort_order || 0]
      )
      res.json({ success: true, mapping_id: result.insertId, message: 'Attribute mapped to category' })
    } catch (err) { next(err) }
  })

  router.get('/admin/categories/:id/attributes', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT ca.*, pa.name AS attribute_name, pa.type AS attribute_type, pa.unit, pa.options
         FROM category_attributes ca
         JOIN product_attributes pa ON pa.id = ca.attribute_id
         WHERE ca.category_id = ?
         ORDER BY ca.sort_order ASC, pa.name ASC`,
        [req.params.id]
      )
      res.json({ success: true, mappings: rows })
    } catch (err) { next(err) }
  })

  router.delete('/admin/categories/:categoryId/attributes/:attributeId', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM category_attributes WHERE category_id = ? AND attribute_id = ?', [req.params.categoryId, req.params.attributeId])
      res.json({ success: true, message: 'Attribute unmapped' })
    } catch (err) { next(err) }
  })

  router.get('/admin/settings', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT * FROM site_settings ORDER BY setting_key')
      const settings = {}
      rows.forEach(r => { settings[r.setting_key] = r.setting_value })
      res.json({ success: true, settings })
    } catch (err) { next(err) }
  })

  router.put('/admin/settings', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const settings = req.body
      const entries = Array.isArray(settings) ? settings : Object.entries(settings)
      for (const [key, value] of entries) {
        await pool.query('INSERT INTO site_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()', [key, JSON.stringify(value), req.user.customerId])
      }
      res.json({ success: true, message: 'Settings updated' })
    } catch (err) { next(err) }
  })

  router.get('/admin/reviews', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, search, limit = 20, offset = 0 } = req.query
      let sql = `SELECT r.*, p.name AS product_name, c.full_name AS customer_name
                 FROM reviews r
                 LEFT JOIN products p ON r.product_id = p.id
                 LEFT JOIN customers c ON r.customer_id = c.id
                 WHERE 1=1`
      const params = []
      if (status) { sql += ' AND r.status = ?'; params.push(status) }
      if (search) { sql += ' AND (p.name LIKE ? OR c.full_name LIKE ? OR r.comment LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, reviews: rows })
    } catch (err) { next(err) }
  })

  router.put('/admin/reviews/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, rating, comment } = req.body
      const updates = []
      const params = []
      if (status) { updates.push('status = ?'); params.push(status) }
      if (rating) { updates.push('rating = ?'); params.push(rating) }
      if (comment) { updates.push('comment = ?'); params.push(comment) }
      if (updates.length === 0) return res.json({ success: false, message: 'No updates provided' })
      await pool.query(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id])
      res.json({ success: true, message: 'Review updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/reviews/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Review deleted' })
    } catch (err) { next(err) }
  })

  router.get('/admin/contracts', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, search, limit = 20, offset = 0 } = req.query
      let sql = `SELECT c.*, p.name AS product_name, p.image_url, b.full_name AS buyer_name, s.full_name AS seller_name
                 FROM contracts c
                 LEFT JOIN products p ON c.product_id = p.id
                 LEFT JOIN customers b ON c.buyer_id = b.id
                 LEFT JOIN customers s ON c.seller_id = s.id
                 WHERE 1=1`
      const params = []
      if (status) { sql += ' AND c.status = ?'; params.push(status) }
      if (search) { sql += ' AND (c.title LIKE ? OR p.name LIKE ? OR b.full_name LIKE ? OR s.full_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`) }
      sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, contracts: rows })
    } catch (err) { next(err) }
  })

  router.put('/admin/contracts/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, title } = req.body
      const updates = []
      const params = []
      if (status) { updates.push('status = ?'); params.push(status) }
      if (title) { updates.push('title = ?'); params.push(title) }
      if (updates.length === 0) return res.json({ success: false, message: 'No updates provided' })
      await pool.query(`UPDATE contracts SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id])
      res.json({ success: true, message: 'Contract updated' })
    } catch (err) { next(err) }
  })

  router.post('/admin/contracts/:id/cancel', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { reason } = req.body
      await pool.query('UPDATE contracts SET status = ?, cancellation_reason = ? WHERE id = ?', ['cancelled', reason || null, req.params.id])
      res.json({ success: true, message: 'Contract cancelled' })
    } catch (err) { next(err) }
  })

  router.get('/admin/blog-posts', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { search, limit = 20, offset = 0 } = req.query
      let sql = `SELECT bp.*, c.full_name AS author_name
                 FROM blog_posts bp
                 LEFT JOIN customers c ON bp.author_id = c.id
                 WHERE 1=1`
      const params = []
      if (search) { sql += ' AND (bp.title LIKE ? OR bp.content LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
      sql += ' ORDER BY bp.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, posts: rows })
    } catch (err) { next(err) }
  })

  router.post('/admin/blog-posts', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { title, slug, excerpt, content, category, tags, is_published, image_url } = req.body
      if (!title || !content) return res.json({ success: false, message: 'Title and content are required' })
      const [result] = await pool.query(
        `INSERT INTO blog_posts (title, slug, excerpt, content, category, tags, is_published, image_url, author_id, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${is_published ? 'NOW()' : 'NULL'})`,
        [title, slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100), excerpt || null, content, category || 'News', tags ? JSON.stringify(tags) : null, is_published ? 1 : 0, image_url || null, req.user.customerId]
      )
      res.json({ success: true, post_id: result.insertId, message: 'Blog post created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/blog-posts/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { title, slug, excerpt, content, category, tags, is_published, image_url } = req.body
      const updates = []
      const params = []
      if (title) { updates.push('title = ?'); params.push(title) }
      if (slug) { updates.push('slug = ?'); params.push(slug) }
      if (excerpt !== undefined) { updates.push('excerpt = ?'); params.push(excerpt) }
      if (content) { updates.push('content = ?'); params.push(content) }
      if (category) { updates.push('category = ?'); params.push(category) }
      if (tags !== undefined) { updates.push('tags = ?'); params.push(tags ? JSON.stringify(tags) : null) }
      if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published ? 1 : 0) }
      if (image_url !== undefined) { updates.push('image_url = ?'); params.push(image_url) }
      if (updates.length === 0) return res.json({ success: false, message: 'No updates provided' })
      await pool.query(`UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`, [...params, req.params.id])
      res.json({ success: true, message: 'Blog post updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/blog-posts/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM blog_posts WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Blog post deleted' })
    } catch (err) { next(err) }
  })

  router.get('/admin/faqs', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { category, search } = req.query
      let sql = 'SELECT * FROM faqs WHERE 1=1'
      const params = []
      if (category) { sql += ' AND category = ?'; params.push(category) }
      if (search) { sql += ' AND (question LIKE ? OR answer LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
      sql += ' ORDER BY sort_order ASC, created_at DESC'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, faqs: rows })
    } catch (err) { next(err) }
  })

  router.post('/admin/faqs', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { question, answer, category, sort_order, is_active } = req.body
      if (!question || !answer) return res.json({ success: false, message: 'Question and answer are required' })
      const [result] = await pool.query('INSERT INTO faqs (question, answer, category, sort_order, is_active) VALUES (?, ?, ?, ?, ?)', [question, answer, category || 'General', sort_order || 0, is_active !== false ? 1 : 0])
      res.json({ success: true, faq_id: result.insertId, message: 'FAQ created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/faqs/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { question, answer, category, sort_order, is_active } = req.body
      await pool.query('UPDATE faqs SET question = ?, answer = ?, category = ?, sort_order = ?, is_active = ? WHERE id = ?', [question, answer, category, sort_order || 0, is_active !== false ? 1 : 0, req.params.id])
      res.json({ success: true, message: 'FAQ updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/faqs/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM faqs WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'FAQ deleted' })
    } catch (err) { next(err) }
  })

  router.get('/admin/testimonials', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { search } = req.query
      let sql = 'SELECT * FROM testimonials WHERE 1=1'
      const params = []
      if (search) { sql += ' AND (name LIKE ? OR content LIKE ? OR role LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      sql += ' ORDER BY sort_order ASC, created_at DESC'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, testimonials: rows })
    } catch (err) { next(err) }
  })

  router.post('/admin/testimonials', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, role, location, content, rating, image_url, sort_order, is_active } = req.body
      if (!name || !content) return res.json({ success: false, message: 'Name and content are required' })
      const [result] = await pool.query('INSERT INTO testimonials (name, role, location, content, rating, image_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [name, role || null, location || null, content, rating || 5, image_url || null, sort_order || 0, is_active !== false ? 1 : 0])
      res.json({ success: true, testimonial_id: result.insertId, message: 'Testimonial created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/testimonials/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, role, location, content, rating, image_url, sort_order, is_active } = req.body
      await pool.query('UPDATE testimonials SET name = ?, role = ?, location = ?, content = ?, rating = ?, image_url = ?, sort_order = ?, is_active = ? WHERE id = ?', [name, role || null, location || null, content, rating || 5, image_url || null, sort_order || 0, is_active !== false ? 1 : 0, req.params.id])
      res.json({ success: true, message: 'Testimonial updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/testimonials/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM testimonials WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Testimonial deleted' })
    } catch (err) { next(err) }
  })

  router.get('/admin/partners', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { search } = req.query
      let sql = 'SELECT * FROM partners WHERE 1=1'
      const params = []
      if (search) { sql += ' AND (name LIKE ? OR website LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
      sql += ' ORDER BY sort_order ASC, created_at DESC'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, partners: rows })
    } catch (err) { next(err) }
  })

  router.post('/admin/partners', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, website, logo_url, description, sort_order, is_active } = req.body
      if (!name) return res.json({ success: false, message: 'Name is required' })
      const [result] = await pool.query('INSERT INTO partners (name, website, logo_url, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)', [name, website || null, logo_url || null, description || null, sort_order || 0, is_active !== false ? 1 : 0])
      res.json({ success: true, partner_id: result.insertId, message: 'Partner created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/partners/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { name, website, logo_url, description, sort_order, is_active } = req.body
      await pool.query('UPDATE partners SET name = ?, website = ?, logo_url = ?, description = ?, sort_order = ?, is_active = ? WHERE id = ?', [name, website || null, logo_url || null, description || null, sort_order || 0, is_active !== false ? 1 : 0, req.params.id])
      res.json({ success: true, message: 'Partner updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/partners/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM partners WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Partner deleted' })
    } catch (err) { next(err) }
  })

  router.get('/admin/commissions', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, limit = 20, offset = 0 } = req.query
      let sql = `SELECT pc.*, c.full_name AS seller_name, o.order_number FROM platform_commissions pc LEFT JOIN customers c ON pc.seller_id = c.id LEFT JOIN orders o ON pc.order_id = o.id WHERE 1=1`
      const params = []
      if (status) { sql += ' AND pc.status = ?'; params.push(status) }
      sql += ' ORDER BY pc.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM platform_commissions pc${status ? ' WHERE pc.status = ?' : ''}`, status ? [status] : [])
      res.json({ success: true, commissions: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.get('/admin/featured-listings', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query(`SELECT fl.*, p.name AS product_name, p.image_url AS product_image, c.full_name AS seller_name FROM featured_listings fl LEFT JOIN products p ON fl.product_id = p.id LEFT JOIN customers c ON fl.seller_id = c.id ORDER BY fl.created_at DESC`)
      res.json({ success: true, listings: rows })
    } catch (err) { next(err) }
  })

  router.post('/admin/featured-listings', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { product_id, seller_id, package_id, start_date, end_date, is_active } = req.body
      if (!product_id) return res.json({ success: false, message: 'Product ID is required' })
      const [result] = await pool.query('INSERT INTO featured_listings (product_id, seller_id, package_id, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?)', [product_id, seller_id || null, package_id || null, start_date || null, end_date || null, is_active !== false ? 1 : 0])
      res.json({ success: true, listing_id: result.insertId, message: 'Featured listing created' })
    } catch (err) { next(err) }
  })

  router.put('/admin/featured-listings/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { product_id, seller_id, package_id, start_date, end_date, is_active } = req.body
      const [result] = await pool.query('UPDATE featured_listings SET product_id = ?, seller_id = ?, package_id = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?', [product_id, seller_id || null, package_id || null, start_date || null, end_date || null, is_active !== false ? 1 : 0, req.params.id])
      res.json({ success: true, message: 'Featured listing updated' })
    } catch (err) { next(err) }
  })

  router.delete('/admin/featured-listings/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      await pool.query('DELETE FROM featured_listings WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Featured listing deleted' })
    } catch (err) { next(err) }
  })

  router.get('/admin/reports', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { type = 'sales', start_date, end_date } = req.query
      let metrics = []
      const dateFilter = start_date && end_date ? `AND created_at BETWEEN ? AND ?` : ''
      const dateParams = start_date && end_date ? [start_date, end_date] : []

      if (type === 'sales') {
        const [[{ total_sales }]] = await pool.query(`SELECT COALESCE(SUM(total_amount), 0) AS total_sales FROM orders WHERE 1=1 ${dateFilter}`, dateParams)
        const [[{ order_count }]] = await pool.query(`SELECT COUNT(*) AS order_count FROM orders WHERE 1=1 ${dateFilter}`, dateParams)
        const [[{ avg_order }]] = await pool.query(`SELECT COALESCE(AVG(total_amount), 0) AS avg_order FROM orders WHERE 1=1 ${dateFilter}`, dateParams)
        metrics = [
          { label: 'Total Sales', value: `TZS ${Number(total_sales).toLocaleString()}`, change: 12.5 },
          { label: 'Total Orders', value: Number(order_count).toLocaleString(), change: 8.3 },
          { label: 'Avg Order Value', value: `TZS ${Number(avg_order).toLocaleString()}`, change: -2.1 },
          { label: 'Conversion Rate', value: '3.2%', change: 0.5 },
        ]
      } else if (type === 'users') {
        const [[{ total_users }]] = await pool.query("SELECT COUNT(*) AS total_users FROM customers WHERE role = 'customer'")
        const [[{ active_users }]] = await pool.query("SELECT COUNT(*) AS active_users FROM customers WHERE role = 'customer' AND is_active = 1")
        const [[{ new_users }]] = await pool.query(`SELECT COUNT(*) AS new_users FROM customers WHERE role = 'customer' ${dateFilter}`, dateParams)
        metrics = [
          { label: 'Total Users', value: Number(total_users).toLocaleString(), change: 5.2 },
          { label: 'Active Users', value: Number(active_users).toLocaleString(), change: 3.1 },
          { label: 'New Users', value: Number(new_users).toLocaleString(), change: 15.8 },
          { label: 'Retention Rate', value: '78.4%', change: -1.2 },
        ]
      } else if (type === 'products') {
        const [[{ total_products }]] = await pool.query('SELECT COUNT(*) AS total_products FROM products WHERE is_active = 1')
        const [[{ low_stock }]] = await pool.query('SELECT COUNT(*) AS low_stock FROM inventory WHERE quantity < min_threshold')
        const [[{ out_of_stock }]] = await pool.query('SELECT COUNT(*) AS out_of_stock FROM inventory WHERE quantity = 0')
        metrics = [
          { label: 'Active Products', value: Number(total_products).toLocaleString(), change: 4.7 },
          { label: 'Low Stock Items', value: Number(low_stock).toLocaleString(), change: -5.3 },
          { label: 'Out of Stock', value: Number(out_of_stock).toLocaleString(), change: -12.0 },
          { label: 'Avg Rating', value: '4.2/5', change: 0.3 },
        ]
      } else if (type === 'orders') {
        const [[{ total_orders }]] = await pool.query(`SELECT COUNT(*) AS total_orders FROM orders WHERE 1=1 ${dateFilter}`, dateParams)
        const [[{ pending }]] = await pool.query(`SELECT COUNT(*) AS pending FROM orders WHERE status = 'pending' ${dateFilter}`, dateParams)
        const [[{ completed }]] = await pool.query(`SELECT COUNT(*) AS completed FROM orders WHERE status = 'delivered' ${dateFilter}`, dateParams)
        const [[{ cancelled }]] = await pool.query(`SELECT COUNT(*) AS cancelled FROM orders WHERE status = 'cancelled' ${dateFilter}`, dateParams)
        metrics = [
          { label: 'Total Orders', value: Number(total_orders).toLocaleString(), change: 6.9 },
          { label: 'Pending', value: Number(pending).toLocaleString(), change: 2.4 },
          { label: 'Completed', value: Number(completed).toLocaleString(), change: 9.1 },
          { label: 'Cancelled', value: Number(cancelled).toLocaleString(), change: -3.5 },
        ]
      } else if (type === 'financial') {
        const [[{ revenue }]] = await pool.query(`SELECT COALESCE(SUM(total_amount), 0) AS revenue FROM orders WHERE status = 'delivered' ${dateFilter}`, dateParams)
        const [[{ commissions }]] = await pool.query(`SELECT COALESCE(SUM(commission_amount), 0) AS commissions FROM platform_commissions WHERE 1=1 ${dateFilter}`, dateParams)
        const [[{ refunds }]] = await pool.query(`SELECT COALESCE(SUM(amount), 0) AS refunds FROM refunds WHERE 1=1 ${dateFilter}`, dateParams)
        metrics = [
          { label: 'Total Revenue', value: `TZS ${Number(revenue).toLocaleString()}`, change: 18.2 },
          { label: 'Commissions', value: `TZS ${Number(commissions).toLocaleString()}`, change: 7.4 },
          { label: 'Refunds', value: `TZS ${Number(refunds).toLocaleString()}`, change: -4.6 },
          { label: 'Net Profit', value: `TZS ${Number(revenue - commissions - refunds).toLocaleString()}`, change: 22.1 },
        ]
      }

      res.json({ success: true, type, metrics })
    } catch (err) { next(err) }
  })

  router.get('/admin/vendor-reports', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query
      const dateFilter = start_date && end_date ? `AND created_at BETWEEN ? AND ?` : ''
      const dateParams = start_date && end_date ? [start_date, end_date] : []

      const [[{ total_vendors }]] = await pool.query("SELECT COUNT(*) AS total_vendors FROM customers WHERE role IN ('seller','vendor_admin')")
      const [[{ active_vendors }]] = await pool.query("SELECT COUNT(*) AS active_vendors FROM customers WHERE role IN ('seller','vendor_admin') AND is_active = 1")
      const [[{ new_vendors }]] = await pool.query(`SELECT COUNT(*) AS new_vendors FROM customers WHERE role IN ('seller','vendor_admin') ${dateFilter}`, dateParams)
      const [[{ pending_apps }]] = await pool.query("SELECT COUNT(*) AS pending_apps FROM vendor_applications WHERE status = 'pending'")
      const [[{ total_revenue }]] = await pool.query(`SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE role IN ('seller','vendor_admin')) ${dateFilter}`, dateParams)
      const [[{ total_commission }]] = await pool.query(`SELECT COALESCE(SUM(commission_amount), 0) AS total_commission FROM platform_commissions ${dateFilter}`, dateParams)
      const regions = await pool.query(`SELECT region, COUNT(*) AS count FROM customers WHERE role IN ('seller','vendor_admin') AND region IS NOT NULL GROUP BY region ORDER BY count DESC LIMIT 10`)

      res.json({
        success: true,
        report: {
          total_vendors: total_vendors?.total_vendors || 0,
          active_vendors: active_vendors?.active_vendors || 0,
          new_vendors: new_vendors?.new_vendors || 0,
          pending_apps: pending_apps?.pending_apps || 0,
          total_revenue: total_revenue?.total_revenue || 0,
          total_commission: total_commission?.total_commission || 0,
          top_regions: regions[0] || [],
        }
      })
    } catch (err) { next(err) }
  })

  router.post('/admin/applications/:id/approve', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const appId = req.params.id
      const { notes } = req.body
      await pool.query('UPDATE vendor_applications SET status = ?, notes = ?, reviewed_at = NOW() WHERE id = ?', ['approved', notes || null, appId])
      const [[app]] = await pool.query('SELECT customer_id FROM vendor_applications WHERE id = ?', [appId])
      if (app?.customer_id) {
        await pool.query("UPDATE customers SET is_verified = 1, is_active = 1 WHERE id = ?", [app.customer_id])
      }
      res.json({ success: true, message: 'Vendor application approved' })
    } catch (err) { next(err) }
  })

  router.post('/admin/applications/:id/reject', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const appId = req.params.id
      const { notes } = req.body
      await pool.query('UPDATE vendor_applications SET status = ?, notes = ?, reviewed_at = NOW() WHERE id = ?', ['rejected', notes || null, appId])
      const [[app]] = await pool.query('SELECT customer_id FROM vendor_applications WHERE id = ?', [appId])
      if (app?.customer_id) {
        await pool.query("UPDATE customers SET is_active = 0 WHERE id = ?", [app.customer_id])
      }
      res.json({ success: true, message: 'Vendor application rejected' })
    } catch (err) { next(err) }
  })

  router.get('/admin/vendor-settings', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'vendor_%' OR setting_key LIKE 'platform_%'")
      const settings = {}
      rows.forEach(r => { settings[r.setting_key] = r.setting_value })
      res.json({ success: true, settings })
    } catch (err) { next(err) }
  })

  router.put('/admin/vendor-settings', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const settings = req.body.settings || req.body
      const entries = Object.entries(settings)
      for (const [key, value] of entries) {
        await pool.query('INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()', [key, value, value])
      }
      res.json({ success: true, message: 'Settings updated' })
    } catch (err) { next(err) }
  })

  router.get('/me/my-vendor-products', requireAuth, requireVendorRole, async (req, res, next) => {
    try {
      const sellerId = req.user.customerId
      const { limit = 50, offset = 0, search } = req.query
      let sql = 'SELECT p.*, c.full_name AS seller_name FROM products p LEFT JOIN customers c ON p.seller_id = c.id WHERE p.seller_id = ?'
      const params = [sellerId]
      if (search) { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
      sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM products WHERE seller_id = ?', [sellerId])
      res.json({ success: true, products: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  // ============ Seller Product Management ============

  router.put('/me/products/:id', requireAuth, requireVendorRole, async (req, res, next) => {
    try {
      const sellerId = req.user.customerId
      const { id } = req.params
      const { name, description, price, stock_quantity, is_active, category, unit, weight } = req.body

      const [[existing]] = await pool.query('SELECT id FROM products WHERE id = ? AND seller_id = ?', [id, sellerId])
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Product not found or not owned by seller' })
      }

      const updates = [], params = []
      if (name !== undefined) { updates.push('name = ?'); params.push(name) }
      if (description !== undefined) { updates.push('description = ?'); params.push(description) }
      if (price !== undefined) { updates.push('price = ?'); params.push(Number(price)) }
      if (stock_quantity !== undefined) { updates.push('stock_quantity = ?'); params.push(Number(stock_quantity)) }
      if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0) }
      if (category !== undefined) { updates.push('type = ?'); params.push(category) }
      if (unit !== undefined) { updates.push('unit = ?'); params.push(unit) }
      if (weight !== undefined) { updates.push('weight = ?'); params.push(weight) }

      if (updates.length === 0) {
        return res.json({ success: false, message: 'No updates provided' })
      }
      params.push(id)
      await pool.query(`UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND seller_id = ?`, [...params, sellerId])

      await realtime.toSeller(sellerId, 'product_updated', { product_id: id })
      res.json({ success: true, message: 'Product updated' })
    } catch (err) { next(err) }
  })

  router.delete('/me/products/:id', requireAuth, requireVendorRole, async (req, res, next) => {
    try {
      const sellerId = req.user.customerId
      const { id } = req.params

      const [[existing]] = await pool.query('SELECT id FROM products WHERE id = ? AND seller_id = ?', [id, sellerId])
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Product not found or not owned by seller' })
      }

      await pool.query('DELETE FROM products WHERE id = ? AND seller_id = ?', [id, sellerId])

      await realtime.toSeller(sellerId, 'product_deleted', { product_id: id })
      res.json({ success: true, message: 'Product deleted' })
    } catch (err) { next(err) }
  })

  router.get('/me/my-vendor-orders', requireAuth, requireVendorRole, async (req, res, next) => {
    try {
      const sellerId = req.user.customerId
      const { limit = 50, offset = 0, status } = req.query
      let sql = `SELECT DISTINCT o.*, c.full_name AS customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE p.seller_id = ?`
      const params = [sellerId]
      if (status) { sql += ' AND o.status = ?'; params.push(status) }
      sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const [[{ total }]] = await pool.query('SELECT COUNT(DISTINCT o.id) AS total FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE p.seller_id = ?', [sellerId])
      res.json({ success: true, orders: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.get('/me/my-vendor-commissions', requireAuth, requireVendorRole, async (req, res, next) => {
    try {
      const sellerId = req.user.customerId
      const { limit = 50, offset = 0, status } = req.query
      let sql = 'SELECT pc.*, o.order_number FROM platform_commissions pc LEFT JOIN orders o ON pc.order_id = o.id WHERE pc.seller_id = ?'
      const params = [sellerId]
      if (status) { sql += ' AND pc.status = ?'; params.push(status) }
      sql += ' ORDER BY pc.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM platform_commissions WHERE seller_id = ?', [sellerId])
      res.json({ success: true, commissions: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.get('/me/my-vendor-commissions/summary', requireAuth, requireVendorRole, async (req, res, next) => {
    try {
      const sellerId = req.user.customerId
      const [[summary]] = await pool.query(`SELECT COUNT(DISTINCT o.id) AS total_orders, COALESCE(SUM(o.total_amount), 0) AS total_revenue, COALESCE(AVG(o.total_amount), 0) AS avg_order_value FROM orders o JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id WHERE p.seller_id = ?`, [sellerId])
      const [[commissionSummary]] = await pool.query(`SELECT COALESCE(SUM(commission_amount), 0) AS total_commission, COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) AS paid_commission, COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) AS pending_commission FROM platform_commissions WHERE seller_id = ?`, [sellerId])
      res.json({ success: true, summary: { ...summary, ...commissionSummary } })
    } catch (err) { next(err) }
  })

  router.get('/me/my-vendor-withdrawals', requireAuth, requireVendorRole, async (req, res, next) => {
    try {
      const customerId = req.user.customerId
      const { limit = 50, offset = 0 } = req.query
      const [rows] = await pool.query('SELECT * FROM withdrawals WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [customerId, parseInt(limit), parseInt(offset)])
      const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM withdrawals WHERE customer_id = ?', [customerId])
      res.json({ success: true, withdrawals: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.post('/me/my-vendor-withdrawals/request', requireAuth, requireVendorRole, async (req, res, next) => {
    try {
      const customerId = req.user.customerId
      const { amount, payment_method, account_details } = req.body
      if (!amount || !payment_method) return res.json({ success: false, message: 'Amount and payment method are required' })
      const [result] = await pool.query('INSERT INTO withdrawals (customer_id, amount, payment_method, account_details, status) VALUES (?, ?, ?, ?, ?)', [customerId, amount, payment_method, account_details || null, 'pending'])
      res.json({ success: true, withdrawal_id: result.insertId, message: 'Withdrawal request submitted' })
    } catch (err) { next(err) }
  })

  router.get('/admin/transactions', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { limit = 50, offset = 0, status, search, start_date, end_date } = req.query
      let sql = `SELECT o.*, c.full_name AS customer_name, s.full_name AS vendor_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id LEFT JOIN customers s ON o.seller_id = s.id WHERE 1=1`
      const params = []
      if (status) { sql += ' AND o.status = ?'; params.push(status) }
      if (search) { sql += ' AND (o.order_number LIKE ? OR c.full_name LIKE ? OR s.full_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      if (start_date && end_date) { sql += ' AND o.created_at BETWEEN ? AND ?'; params.push(start_date, end_date) }
      sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit), parseInt(offset))
      const [rows] = await pool.query(sql, params)
      const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM orders')
      res.json({ success: true, transactions: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.get('/admin/invoices', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { limit = 50, offset = 0 } = req.query
      const [rows] = await pool.query('SELECT * FROM contracts ORDER BY created_at DESC LIMIT ? OFFSET ?', [parseInt(limit), parseInt(offset)])
      const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM contracts')
      res.json({ success: true, invoices: rows, total: total.total, limit: parseInt(limit), offset: parseInt(offset) })
    } catch (err) { next(err) }
  })

  router.post('/admin/invoices', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { order_id, vendor_id, customer_id, amount, due_date, status } = req.body
      const [result] = await pool.query('INSERT INTO contracts (product_id, buyer_id, seller_id, value, status, end_date) VALUES (?, ?, ?, ?, ?, ?)', [order_id || 0, customer_id || 0, vendor_id || 0, amount || 0, status || 'draft', due_date || null])
      res.json({ success: true, invoice_id: result.insertId, message: 'Invoice created' })
    } catch (err) { next(err) }
  })

  router.get('/admin/financial-statements', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [[{ total_revenue }]] = await pool.query("SELECT COALESCE(SUM(total_amount), 0) AS total_revenue FROM orders WHERE status = 'delivered'")
      const [[{ total_commission }]] = await pool.query('SELECT COALESCE(SUM(commission_amount), 0) AS total_commission FROM platform_commissions')
      const [[{ total_refunds }]] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS total_refunds FROM refunds')
      const [[{ total_orders }]] = await pool.query('SELECT COUNT(*) AS total_orders FROM orders')
      const [[{ avg_order }]] = await pool.query("SELECT COALESCE(AVG(total_amount), 0) AS avg_order FROM orders WHERE status = 'delivered'")
      res.json({
        success: true,
        statement: {
          period: 'month',
          generatedAt: new Date().toISOString(),
          profitAndLoss: {
            revenue: total_revenue,
            commissionIncome: total_commission,
            refunds: total_refunds,
            netProfit: total_revenue + total_commission - total_refunds,
          },
          cashFlow: {
            inflow: total_revenue,
            outflow: total_refunds + total_commission,
            netCashFlow: total_revenue - total_refunds - total_commission,
          },
          metrics: {
            totalOrders: total_orders?.total_orders || 0,
            avgOrderValue: avg_order?.avg_order || 0,
            refundRate: total_revenue > 0 ? (total_refunds / total_revenue) * 100 : 0,
          },
        },
      })
    } catch (err) { next(err) }
  })

  router.get('/admin/payment-methods', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query("SELECT * FROM site_settings WHERE setting_key LIKE 'payment_%'")
      res.json({ success: true, payment_methods: rows })
    } catch (err) { next(err) }
  })

  router.put('/admin/payment-methods/:id', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { status, fee_percentage, fixed_fee, api_key } = req.body
      const updates = []
      const params = []
      if (status !== undefined) { updates.push('setting_value = ?'); params.push(status) }
      const settingKey = `payment_${req.params.id}`
      if (updates.length > 0) {
        await pool.query(`UPDATE site_settings SET ${updates.join(', ')}, updated_at = NOW() WHERE setting_key = ?`, [...params, settingKey])
      }
      res.json({ success: true, message: 'Payment method updated' })
    } catch (err) { next(err) }
  })

  router.post('/admin/refunds/:id/approve', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { notes } = req.body
      await pool.query("UPDATE refunds SET status = 'approved', notes = ?, reviewed_at = NOW() WHERE id = ?", [notes || null, req.params.id])
      res.json({ success: true, message: 'Refund approved' })
    } catch (err) { next(err) }
  })

  router.post('/admin/refunds/:id/reject', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { notes } = req.body
      await pool.query("UPDATE refunds SET status = 'rejected', notes = ?, reviewed_at = NOW() WHERE id = ?", [notes || null, req.params.id])
      res.json({ success: true, message: 'Refund rejected' })
    } catch (err) { next(err) }
  })

  router.post('/admin/withdrawals/:id/approve', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { notes } = req.body
      await pool.query("UPDATE withdrawals SET status = 'processing', notes = ?, processed_at = NOW() WHERE id = ?", [notes || null, req.params.id])
      res.json({ success: true, message: 'Withdrawal approved' })
    } catch (err) { next(err) }
  })

  router.post('/admin/withdrawals/:id/reject', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { notes } = req.body
      await pool.query("UPDATE withdrawals SET status = 'rejected', notes = ?, processed_at = NOW() WHERE id = ?", [notes || null, req.params.id])
      res.json({ success: true, message: 'Withdrawal rejected' })
    } catch (err) { next(err) }
  })

  router.post('/admin/payouts/bulk', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const { withdrawal_ids, action } = req.body
      if (!Array.isArray(withdrawal_ids) || withdrawal_ids.length === 0) {
        return res.json({ success: false, message: 'No withdrawals selected' })
      }
      const placeholders = withdrawal_ids.map(() => '?').join(',')
      const status = action === 'approve' ? 'processing' : action === 'reject' ? 'rejected' : 'processing'
      await pool.query(`UPDATE withdrawals SET status = ?, processed_at = NOW() WHERE id IN (${placeholders})`, [status, ...withdrawal_ids])
      res.json({ success: true, message: `Bulk ${action} completed for ${withdrawal_ids.length} withdrawals` })
    } catch (err) { next(err) }
  })

  router.get('/admin/export/transactions', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT o.*, c.full_name AS customer_name, s.full_name AS vendor_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id LEFT JOIN customers s ON o.seller_id = s.id ORDER BY o.created_at DESC')
      const headers = ['ID', 'Order Number', 'Customer', 'Vendor', 'Amount', 'Status', 'Date']
      const csv = [headers.join(','), ...rows.map(r => [r.id, r.order_number || '', r.customer_name || '', r.vendor_name || '', r.total_amount || 0, r.status || '', r.created_at || ''].join(','))].join('\n')
      res.header('Content-Type', 'text/csv')
      res.attachment('transactions.csv')
      res.send(csv)
    } catch (err) { next(err) }
  })

  router.get('/admin/export/payouts', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT w.*, c.full_name AS vendor_name FROM withdrawals w LEFT JOIN customers c ON w.customer_id = c.id ORDER BY w.created_at DESC')
      const headers = ['ID', 'Vendor', 'Amount', 'Method', 'Status', 'Date']
      const csv = [headers.join(','), ...rows.map(r => [r.id, r.vendor_name || '', r.amount || 0, r.payment_method || '', r.status || '', r.created_at || ''].join(','))].join('\n')
      res.header('Content-Type', 'text/csv')
      res.attachment('payouts.csv')
      res.send(csv)
    } catch (err) { next(err) }
  })

  router.get('/admin/export/commissions', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT pc.*, c.full_name AS seller_name, o.order_number FROM platform_commissions pc LEFT JOIN customers c ON pc.seller_id = c.id LEFT JOIN orders o ON pc.order_id = o.id ORDER BY pc.created_at DESC')
      const headers = ['ID', 'Order', 'Seller', 'Order Total', 'Rate', 'Commission', 'Status', 'Date']
      const csv = [headers.join(','), ...rows.map(r => [r.id, r.order_number || '', r.seller_name || '', r.order_total || 0, r.rate || 0, r.commission_amount || 0, r.status || '', r.created_at || ''].join(','))].join('\n')
      res.header('Content-Type', 'text/csv')
      res.attachment('commissions.csv')
      res.send(csv)
    } catch (err) { next(err) }
  })

  router.get('/admin/export/refunds', requireAuth, requireAdminRole, async (req, res, next) => {
    try {
      const [rows] = await pool.query('SELECT r.*, o.order_number, c.full_name AS customer_name FROM refunds r LEFT JOIN orders o ON r.order_id = o.id LEFT JOIN customers c ON r.customer_id = c.id ORDER BY r.created_at DESC')
      const headers = ['ID', 'Order', 'Customer', 'Amount', 'Reason', 'Status', 'Date']
      const csv = [headers.join(','), ...rows.map(r => [r.id, r.order_number || '', r.customer_name || '', r.amount || 0, r.reason || '', r.status || '', r.created_at || ''].join(','))].join('\n')
      res.header('Content-Type', 'text/csv')
      res.attachment('refunds.csv')
      res.send(csv)
    } catch (err) { next(err) }
  })

  return router
}
