const express = require('express')
const { validateRequired, validateEmail, validatePhone, validateAmount, validatePositiveInt, sanitizeString } = require('../middleware/validation')
const { requireSuperAdmin } = require('../middleware/roleCheck')

module.exports = (pool) => {
  const router = express.Router()

  // ============ SYSTEM OVERVIEW ============
  router.get('/stats', requireSuperAdmin, async (req, res) => {
    try {
      const [[totalUsers]] = await pool.query("SELECT COUNT(*) AS total FROM customers")
      const [[totalCustomers]] = await pool.query("SELECT COUNT(*) AS total FROM customers WHERE role = 'customer'")
      const [[totalSellers]] = await pool.query("SELECT COUNT(*) AS total FROM customers WHERE role IN ('seller','vendor_admin') AND is_active = 1")
      const [[totalOrders]] = await pool.query("SELECT COUNT(*) AS total FROM orders")
      const [[pendingOrders]] = await pool.query("SELECT COUNT(*) AS total FROM orders WHERE status = 'pending'")
      const [[totalProducts]] = await pool.query("SELECT COUNT(*) AS total FROM products WHERE is_active = 1")
      const [[pendingProducts]] = await pool.query("SELECT COUNT(*) AS total FROM products WHERE is_active = 0")
      const [[totalRevenue]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM revenue_tracking")
      const [[monthRevenue]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM revenue_tracking WHERE recorded_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)")
      const [[totalCommissions]] = await pool.query("SELECT COALESCE(SUM(commission_amount), 0) AS total FROM platform_commissions")
      const [[pendingCommissions]] = await pool.query("SELECT COALESCE(SUM(commission_amount), 0) AS total FROM platform_commissions WHERE status = 'pending'")
      const [[totalWithdrawals]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals")
      const [[pendingWithdrawals]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals WHERE status = 'pending'")
      const [[totalRefunds]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM refunds")
      const [[pendingRefunds]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM refunds WHERE status = 'pending'")
      const [[totalDeliveries]] = await pool.query("SELECT COUNT(*) AS total FROM active_deliveries")
      const [[inTransit]] = await pool.query("SELECT COUNT(*) AS total FROM active_deliveries WHERE status = 'in_transit'")
      const [[totalWarehouses]] = await pool.query("SELECT COUNT(*) AS total FROM warehouse_services WHERE is_active = 1")
      const [[totalProviders]] = await pool.query("SELECT COUNT(*) AS total FROM transport_providers WHERE is_active = 1")
      const [[totalTickets]] = await pool.query("SELECT COUNT(*) AS total FROM support_tickets WHERE status != 'resolved'")
      const [[totalReports]] = await pool.query("SELECT COUNT(*) AS total FROM reported_products WHERE status = 'pending'")
      const [[totalApplications]] = await pool.query("SELECT COUNT(*) AS total FROM vendor_applications WHERE status = 'pending'")
      const [[totalLogisticsApps]] = await pool.query("SELECT COUNT(*) AS total FROM logistics_applications WHERE status = 'pending'")
      const [[totalWarehouseApps]] = await pool.query("SELECT COUNT(*) AS total FROM warehouse_applications WHERE status = 'pending'")
      const [[dbSize]] = await pool.query("SELECT SUM(data_length + index_length) AS size FROM information_schema.TABLES WHERE table_schema = DATABASE()")

      const [recentUsers] = await pool.query("SELECT id, full_name, email, phone, role, is_verified, is_active, created_at FROM customers ORDER BY created_at DESC LIMIT 10")
      const [recentOrders] = await pool.query("SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_method, o.created_at, c.full_name AS customer_name FROM orders o JOIN customers c ON o.customer_id = c.id ORDER BY o.created_at DESC LIMIT 10")
      const [recentRevenue] = await pool.query("SELECT revenue_type, amount, recorded_date, description FROM revenue_tracking ORDER BY recorded_date DESC LIMIT 10")

      res.json({
        success: true,
        stats: {
          users: { total: totalUsers.total, customers: totalCustomers.total, sellers: totalSellers.total },
          orders: { total: totalOrders.total, pending: pendingOrders.total },
          products: { total: totalProducts.total, pending: pendingProducts.total },
          revenue: { total: parseFloat(totalRevenue.total), monthly: parseFloat(monthRevenue.total) },
          commissions: { total: parseFloat(totalCommissions.total), pending: parseFloat(pendingCommissions.total) },
          withdrawals: { total: parseFloat(totalWithdrawals.total), pending: parseFloat(pendingWithdrawals.total) },
          refunds: { total: parseFloat(totalRefunds.total), pending: parseFloat(pendingRefunds.total) },
          deliveries: { total: totalDeliveries.total, in_transit: inTransit.total },
          warehouses: totalWarehouses.total,
          providers: totalProviders.total,
          tickets: totalTickets.total,
          reports: totalReports.total,
          applications: { vendor: totalApplications.total, logistics: totalLogisticsApps.total, warehouse: totalWarehouseApps.total },
          db_size: dbSize[0]?.size || 0
        },
        recent: { users: recentUsers, orders: recentOrders, revenue: recentRevenue }
      })
    } catch (err) { next(err) }
  })

  // ============ SYSTEM REALTIME SSE ============
  router.get('/realtime', async (req, res) => {
    const { token } = req.query
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required' })
    }

    try {
      const jwt = require('jsonwebtoken')
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nafaka-hub-secret-key-change-in-production')
      if (decoded.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    const sendStats = async () => {
      try {
        const [[totalUsers]] = await pool.query("SELECT COUNT(*) AS total FROM customers")
        const [[totalOrders]] = await pool.query("SELECT COUNT(*) AS total FROM orders")
        const [[pendingOrders]] = await pool.query("SELECT COUNT(*) AS total FROM orders WHERE status = 'pending'")
        const [[totalProducts]] = await pool.query("SELECT COUNT(*) AS total FROM products WHERE is_active = 1")
        const [[monthRevenue]] = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total FROM revenue_tracking WHERE recorded_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)")
        const [[inTransit]] = await pool.query("SELECT COUNT(*) AS total FROM active_deliveries WHERE status = 'in_transit'")
        const [[totalTickets]] = await pool.query("SELECT COUNT(*) AS total FROM support_tickets WHERE status != 'resolved'")

        const [recentOrders] = await pool.query("SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_method, o.created_at, c.full_name AS customer_name FROM orders o JOIN customers c ON o.customer_id = c.id ORDER BY o.created_at DESC LIMIT 5")
        const [recentUsers] = await pool.query("SELECT id, full_name, email, role, created_at FROM customers ORDER BY created_at DESC LIMIT 5")

        res.write(`data: ${JSON.stringify({
          type: 'stats_update',
          stats: {
            users: totalUsers.total,
            orders: totalOrders.total,
            pending_orders: pendingOrders.total,
            products: totalProducts.total,
            monthly_revenue: parseFloat(monthRevenue.total),
            deliveries_in_transit: inTransit.total,
            open_tickets: totalTickets.total
          },
          recent_orders: recentOrders,
          recent_users: recentUsers,
          timestamp: new Date().toISOString()
        })}\n\n`)
      } catch (err) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
      }
    }

    await sendStats()
    const interval = setInterval(sendStats, 5000)

    req.on('close', () => {
      clearInterval(interval)
    })
  })

  // ============ USER MANAGEMENT ============
  router.get('/users', requireSuperAdmin, async (req, res) => {
    try {
      const { role, search, limit, offset } = req.query
      let sql = 'SELECT id, full_name, email, phone, role, business_name, is_verified, is_active, created_at FROM customers WHERE 1=1'
      const params = []
      if (role) { sql += ' AND role = ?'; params.push(role) }
      if (search) { sql += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit) || 50, parseInt(offset) || 0)

      const [rows] = await pool.query(sql, params)
      const [[count]] = await pool.query('SELECT COUNT(*) AS total FROM customers WHERE 1=1' + (role ? ' AND role = ?' : ''), role ? [role] : [])

      res.json({ success: true, users: rows, total: count.total, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 })
    } catch (err) { next(err) }
  })

  router.put('/users/:id', requireSuperAdmin, async (req, res) => {
    try {
      const { is_active, role } = req.body
      const updates = []
      const params = []
      if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0) }
      if (role) { updates.push('role = ?'); params.push(role) }
      if (updates.length === 0) return res.json({ success: false, message: 'No updates provided' })
      params.push(req.params.id)
      await pool.query(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`, params)
      res.json({ success: true, message: 'User updated' })
    } catch (err) { next(err) }
  })

  router.delete('/users/:id', requireSuperAdmin, async (req, res) => {
    try {
      await pool.query('UPDATE customers SET is_active = 0 WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'User deactivated' })
    } catch (err) { next(err) }
  })

  // ============ ORDER MANAGEMENT ============
  router.get('/orders', requireSuperAdmin, async (req, res) => {
    try {
      const { status, search, limit, offset } = req.query
      let sql = `SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_method, o.payment_status, o.shipping_address, o.created_at, o.updated_at,
                        c.full_name AS customer_name, c.email AS customer_email
                 FROM orders o JOIN customers c ON o.customer_id = c.id WHERE 1=1`
      const params = []
      if (status) { sql += ' AND o.status = ?'; params.push(status) }
      if (search) { sql += ' AND (o.order_number LIKE ? OR c.full_name LIKE ? OR c.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
      sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit) || 50, parseInt(offset) || 0)

      const [rows] = await pool.query(sql, params)
      const whereClause = status ? ' WHERE status = ?' : ''
      const [[count]] = await pool.query('SELECT COUNT(*) AS total FROM orders' + whereClause, status ? [status] : [])

      res.json({ success: true, orders: rows, total: count.total, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 })
    } catch (err) { next(err) }
  })

  router.put('/orders/:id', requireSuperAdmin, async (req, res) => {
    try {
      const { status, payment_status } = req.body
      const updates = []
      const params = []
      if (status) { updates.push('status = ?'); params.push(status) }
      if (payment_status) { updates.push('payment_status = ?'); params.push(payment_status) }
      if (updates.length === 0) return res.json({ success: false, message: 'No updates provided' })
      params.push(req.params.id)
      await pool.query(`UPDATE orders SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params)
      res.json({ success: true, message: 'Order updated' })
    } catch (err) { next(err) }
  })

  // ============ PRODUCT MANAGEMENT ============
  router.get('/products', requireSuperAdmin, async (req, res) => {
    try {
      const { status, search, limit, offset } = req.query
      let sql = `SELECT p.*, c.full_name AS seller_name, c.email AS seller_email, AVG(r.rating) AS average_rating
                 FROM products p LEFT JOIN customers c ON p.seller_id = c.id LEFT JOIN reviews r ON p.id = r.product_id WHERE 1=1`
      const params = []
      if (status !== undefined && status !== '') { sql += ' AND p.is_active = ?'; params.push(status === '1' || status === 'active' ? 1 : 0) }
      if (search) { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
      sql += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
      params.push(parseInt(limit) || 50, parseInt(offset) || 0)

      const [rows] = await pool.query(sql, params)
      const whereClause = status !== undefined && status !== '' ? ' WHERE is_active = ?' : ''
      const [[count]] = await pool.query('SELECT COUNT(*) AS total FROM products' + whereClause, status !== undefined && status !== '' ? [(status === '1' || status === 'active') ? 1 : 0] : [])

      res.json({ success: true, products: rows, total: count.total, limit: parseInt(limit) || 50, offset: parseInt(offset) || 0 })
    } catch (err) { next(err) }
  })

  router.put('/products/:id', requireSuperAdmin, async (req, res) => {
    try {
      const { is_active, is_featured } = req.body
      const updates = []
      const params = []
      if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0) }
      if (is_featured !== undefined) { updates.push('is_featured = ?'); params.push(is_featured ? 1 : 0) }
      if (updates.length === 0) return res.json({ success: false, message: 'No updates provided' })
      params.push(req.params.id)
      await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params)
      res.json({ success: true, message: 'Product updated' })
    } catch (err) { next(err) }
  })

  router.delete('/products/:id', requireSuperAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM products WHERE id = ?', [req.params.id])
      res.json({ success: true, message: 'Product deleted' })
    } catch (err) { next(err) }
  })

  // ============ ANALYTICS ============
  router.get('/analytics', requireSuperAdmin, async (req, res) => {
    try {
      const { days = 30 } = req.query
      const period = parseInt(days)

      const [dailyRevenue] = await pool.query(
        `SELECT recorded_date AS date, COALESCE(SUM(amount), 0) AS revenue, COUNT(*) AS transactions
         FROM revenue_tracking WHERE recorded_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY recorded_date ORDER BY date`,
        [period]
      )
      const [dailyOrders] = await pool.query(
        `SELECT DATE(created_at) AS date, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue
         FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY date`,
        [period]
      )
      const [userGrowth] = await pool.query(
        `SELECT DATE(created_at) AS date, COUNT(*) AS new_users
         FROM customers WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY date`,
        [period]
      )
      const [topProducts] = await pool.query(
        `SELECT p.id, p.name, p.price, p.image_url, COUNT(oi.id) AS sales_count, COALESCE(SUM(oi.total_price), 0) AS revenue
         FROM products p JOIN order_items oi ON p.id = oi.product_id JOIN orders o ON oi.order_id = o.id
         WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY p.id ORDER BY sales_count DESC LIMIT 10`,
        [period]
      )
      const [topSellers] = await pool.query(
        `SELECT c.id, c.full_name, c.business_name, COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(oi.total_price), 0) AS revenue
         FROM customers c JOIN products p ON c.id = p.seller_id JOIN order_items oi ON p.id = oi.product_id JOIN orders o ON oi.order_id = o.id
         WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY c.id ORDER BY revenue DESC LIMIT 10`,
        [period]
      )
      const [topRegions] = await pool.query(
        `SELECT shipping_address AS region, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue
         FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND shipping_address != '' GROUP BY shipping_address ORDER BY orders DESC LIMIT 10`,
        [period]
      )
      const [revenueByType] = await pool.query(
        `SELECT revenue_type, COALESCE(SUM(amount), 0) AS total, COUNT(*) AS transactions
         FROM revenue_tracking WHERE recorded_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY revenue_type ORDER BY total DESC`,
        [period]
      )
      const [orderStatus] = await pool.query(
        `SELECT status, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total
         FROM orders GROUP BY status ORDER BY count DESC`
      )
      const [roleDistribution] = await pool.query(
        `SELECT role, COUNT(*) AS count FROM customers GROUP BY role ORDER BY count DESC`
      )

      res.json({
        success: true,
        period,
        daily_revenue: dailyRevenue,
        daily_orders: dailyOrders,
        user_growth: userGrowth,
        top_products: topProducts,
        top_sellers: topSellers,
        top_regions: topRegions,
        revenue_by_type: revenueByType,
        order_status: orderStatus,
        role_distribution: roleDistribution
      })
    } catch (err) { next(err) }
  })

  // ============ SETTINGS ============
  router.get('/settings', requireSuperAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM site_settings ORDER BY setting_key ASC')
      res.json({ success: true, settings: rows })
    } catch (err) { next(err) }
  })

  router.put('/settings', requireSuperAdmin, async (req, res) => {
    try {
      const { settings } = req.body
      if (!Array.isArray(settings)) return res.json({ success: false, message: 'Settings must be an array' })
      for (const s of settings) {
        if (s.setting_key && s.setting_value !== undefined) {
          await pool.query(
            'INSERT INTO site_settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()',
            [s.setting_key, s.setting_value, s.setting_value]
          )
        }
      }
      res.json({ success: true, message: 'Settings updated' })
    } catch (err) { next(err) }
  })

  // ============ NOTIFICATIONS ============
  router.get('/notifications', requireSuperAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100')
      res.json({ success: true, notifications: rows })
    } catch (err) { next(err) }
  })

  router.post('/notifications', requireSuperAdmin, async (req, res) => {
    try {
      const { title, message, type, target_role, target_user_id } = req.body
      if (!title || !message) return res.json({ success: false, message: 'Title and message are required' })

      let targets = []
      if (target_user_id) {
        const [[user]] = await pool.query('SELECT id FROM customers WHERE id = ?', [target_user_id])
        if (user) targets.push(user.id)
      } else if (target_role) {
        const [users] = await pool.query('SELECT id FROM customers WHERE role = ? AND is_active = 1', [target_role])
        targets = users.map(u => u.id)
      } else {
        const [users] = await pool.query('SELECT id FROM customers WHERE is_active = 1')
        targets = users.map(u => u.id)
      }

      const values = targets.map(id => [id, title, message, type || 'system', 0])
      await pool.query('INSERT INTO notifications (customer_id, title, message, type, is_read) VALUES ?', [values])
      res.json({ success: true, message: `Notification sent to ${targets.length} users`, count: targets.length })
    } catch (err) { next(err) }
  })

  // ============ SUPPORT TICKETS ============
  router.get('/support-tickets', requireSuperAdmin, async (req, res) => {
    try {
      const { status } = req.query
      let sql = `SELECT t.*, c.full_name, c.email, c.phone FROM support_tickets t JOIN customers c ON t.customer_id = c.id WHERE 1=1`
      const params = []
      if (status) { sql += ' AND t.status = ?'; params.push(status) }
      sql += ' ORDER BY t.created_at DESC'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, tickets: rows })
    } catch (err) { next(err) }
  })

  router.put('/support-tickets/:id', requireSuperAdmin, async (req, res) => {
    try {
      const { status, response } = req.body
      const updates = ['status = ?', 'updated_at = NOW()']
      const params = [status]
      if (response) { updates.push('response = ?'); params.push(response) }
      params.push(req.params.id)
      await pool.query(`UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`, params)
      res.json({ success: true, message: 'Ticket updated' })
    } catch (err) { next(err) }
  })

  // ============ WITHDRAWALS ============
  router.get('/withdrawals', requireSuperAdmin, async (req, res) => {
    try {
      const { status } = req.query
      let sql = `SELECT w.*, c.full_name, c.email, c.business_name FROM withdrawals w JOIN customers c ON w.customer_id = c.id WHERE 1=1`
      const params = []
      if (status) { sql += ' AND w.status = ?'; params.push(status) }
      sql += ' ORDER BY w.created_at DESC'
      const [rows] = await pool.query(sql, params)
      res.json({ success: true, withdrawals: rows })
    } catch (err) { next(err) }
  })

  router.put('/withdrawals/:id', requireSuperAdmin, async (req, res) => {
    try {
      const { status } = req.body
      await pool.query('UPDATE withdrawals SET status = ?, processed_at = NOW() WHERE id = ?', [status, req.params.id])
      res.json({ success: true, message: 'Withdrawal updated' })
    } catch (err) { next(err) }
  })

  // ============ REPORTED PRODUCTS ============
  router.get('/reported-products', requireSuperAdmin, async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT rp.*, p.name AS product_name, p.image_url, c.full_name AS reporter_name, c.email AS reporter_email
         FROM reported_products rp JOIN products p ON rp.product_id = p.id JOIN customers c ON rp.reporter_id = c.id ORDER BY rp.created_at DESC`
      )
      res.json({ success: true, reports: rows })
    } catch (err) { next(err) }
  })

  router.put('/reported-products/:id', requireSuperAdmin, async (req, res) => {
    try {
      const { status, resolution } = req.body
      await pool.query('UPDATE reported_products SET status = ?, resolution = ?, reviewed_at = NOW() WHERE id = ?', [status, resolution || null, req.params.id])
      res.json({ success: true, message: 'Report updated' })
    } catch (err) { next(err) }
  })

  // ============ AUDIT LOGS ============
  router.get('/audit-logs', requireSuperAdmin, async (req, res) => {
    try {
      const { limit, offset } = req.query
      const [rows] = await pool.query(
        `SELECT al.*, c.full_name AS actor_name FROM audit_logs al LEFT JOIN customers c ON al.actor_id = c.id ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
        [parseInt(limit) || 50, parseInt(offset) || 0]
      )
      const [[count]] = await pool.query('SELECT COUNT(*) AS total FROM audit_logs')
      res.json({ success: true, logs: rows, total: count.total })
    } catch (err) { next(err) }
  })

  router.post('/audit-logs', requireSuperAdmin, async (req, res) => {
    try {
      const { action, entity_type, entity_id, details } = req.body
      await pool.query(
        'INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.customerId, action, entity_type || 'system', entity_id || null, details || null, req.ip]
      )
      res.json({ success: true, message: 'Log entry created' })
    } catch (err) { next(err) }
  })

  // ============ SYSTEM HEALTH ============
  router.get('/health', requireSuperAdmin, async (req, res) => {
    try {
      const [[dbHealth]] = await pool.query('SELECT 1 AS ok')
      const [[tableCount]] = await pool.query("SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE()")
      const [[activeSessions]] = await pool.query("SELECT COUNT(*) AS total FROM user_sessions WHERE expires_at > NOW()")
      const [[errorLogs]] = await pool.query("SELECT COUNT(*) AS total FROM audit_logs WHERE action LIKE '%error%' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)")

      res.json({
        success: true,
        health: {
          database: !!dbHealth,
          tables: tableCount.total,
          active_sessions: activeSessions.total,
          error_logs_1h: errorLogs.total,
          uptime: process.uptime ? process.uptime() : null
        }
      })
    } catch (err) { next(err) }
  })

  // ============ APPLICATIONS ============
  router.get('/applications', requireSuperAdmin, async (req, res) => {
    try {
      const { type, status } = req.query
      let rows = []
      if (!type || type === 'vendor') {
        const [apps] = await pool.query(`SELECT va.*, c.full_name AS applicant_name, c.email, c.phone FROM vendor_applications va JOIN customers c ON va.customer_id = c.id WHERE 1=1 ${status ? 'AND va.status = ?' : ''} ORDER BY va.created_at DESC`, status ? [status] : [])
        rows.push(...apps.map(a => ({ ...a, type: 'vendor' })))
      }
      if (!type || type === 'logistics') {
        const [apps] = await pool.query(`SELECT la.*, c.full_name AS applicant_name, c.email, c.phone FROM logistics_applications la JOIN customers c ON la.customer_id = c.id WHERE 1=1 ${status ? 'AND la.status = ?' : ''} ORDER BY la.created_at DESC`, status ? [status] : [])
        rows.push(...apps.map(a => ({ ...a, type: 'logistics' })))
      }
      if (!type || type === 'warehouse') {
        const [apps] = await pool.query(`SELECT wa.*, c.full_name AS applicant_name, c.email, c.phone FROM warehouse_applications wa JOIN customers c ON wa.customer_id = c.id WHERE 1=1 ${status ? 'AND wa.status = ?' : ''} ORDER BY wa.created_at DESC`, status ? [status] : [])
        rows.push(...apps.map(a => ({ ...a, type: 'warehouse' })))
      }
      res.json({ success: true, applications: rows })
    } catch (err) { next(err) }
  })

  router.put('/applications/:type/:id', requireSuperAdmin, async (req, res) => {
    try {
      const { type, id } = req.params
      const { status, notes } = req.body
      const tableMap = { vendor: 'vendor_applications', logistics: 'logistics_applications', warehouse: 'warehouse_applications' }
      const table = tableMap[type]
      if (!table) return res.json({ success: false, message: 'Invalid application type' })

      await pool.query(`UPDATE ${table} SET status = ?, notes = ?, reviewed_at = NOW() WHERE id = ?`, [status, notes || null, id])
      res.json({ success: true, message: 'Application updated' })
    } catch (err) { next(err) }
  })

  return router
}
