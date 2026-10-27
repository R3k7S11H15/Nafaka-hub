const { extractAuthUser } = require('../middleware/auth')

class AITools {
  constructor(pool) {
    this.pool = pool
  }

  async getAuthUser(req) {
    return extractAuthUser(req)
  }

  async logToolCall(agentId, userId, toolName, inputSummary, success, error = null, ip = null) {
    try {
      await this.pool.query(
        `INSERT INTO ai_agent_logs (agent_id, user_id, action, tool_used, input_summary, success, error, ip_address, created_at)
         VALUES (?, ?, 'tool_call', ?, ?, ?, ?, ?, NOW())`,
        [agentId, userId, toolName, inputSummary?.substring(0, 500), success ? 1 : 0, error?.substring(0, 500), ip]
      )
    } catch (err) {
      console.error('Failed to log AI tool call:', err)
    }
  }

  async getAgent(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [agents] = await this.pool.query(
        'SELECT id, user_id, role, status, preferences_json, created_at, updated_at FROM ai_agents WHERE user_id = ?',
        [auth.customerId]
      )
      if (agents.length === 0) {
        return { success: false, message: 'Agent not found' }
      }
      await this.logToolCall(agents[0].id, auth.customerId, 'get_agent', 'Get agent info', true)
      return { success: true, agent: agents[0] }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getMyOrders(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [orders] = await this.pool.query(
        `SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.shipping_address, o.created_at,
                COUNT(oi.id) as item_count
         FROM orders o
         LEFT JOIN order_items oi ON o.id = oi.order_id
         WHERE o.customer_id = ?
         GROUP BY o.id
         ORDER BY o.created_at DESC
         LIMIT 50`,
        [auth.customerId]
      )
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_my_orders', 'Get user orders', true)
      return { success: true, orders }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getMyPurchaseHistory(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [history] = await this.pool.query(
        `SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at,
                p.name as product_name, p.type as product_type, p.weight,
                oi.quantity, oi.unit_price
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE o.customer_id = ? AND o.status IN ('delivered', 'shipped')
         ORDER BY o.created_at DESC
         LIMIT 100`,
        [auth.customerId]
      )
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_my_purchase_history', 'Get purchase history', true)
      return { success: true, history }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getMyWishlist(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [items] = await this.pool.query(
        `SELECT w.id, p.id as product_id, p.name, p.type, p.weight, p.price, p.image_url, p.description
         FROM wishlist w
         JOIN products p ON w.product_id = p.id
         WHERE w.customer_id = ? AND p.is_active = 1
         ORDER BY w.created_at DESC`,
        [auth.customerId]
      )
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_my_wishlist', 'Get wishlist', true)
      return { success: true, wishlist: items }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async searchProducts(req, query, filters = {}) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      let sql = `SELECT p.id, p.name, p.description, p.type, p.weight, p.price, p.image_url, p.is_active,
                        p.seller_id, c.full_name as seller_name,
                        AVG(r.rating) as average_rating, COUNT(r.id) as review_count
                 FROM products p
                 LEFT JOIN reviews r ON p.id = r.product_id
                 LEFT JOIN customers c ON p.seller_id = c.id
                 WHERE p.is_active = 1`
      const params = []

      if (query) {
        sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'
        params.push(`%${query}%`, `%${query}%`)
      }
      if (filters.type && filters.type !== 'all') {
        sql += ' AND p.type = ?'
        params.push(filters.type)
      }
      if (filters.weight && filters.weight !== 'all') {
        sql += ' AND p.weight = ?'
        params.push(filters.weight)
      }
      if (filters.max_price) {
        sql += ' AND p.price <= ?'
        params.push(parseFloat(filters.max_price))
      }
      if (filters.min_price) {
        sql += ' AND p.price >= ?'
        params.push(parseFloat(filters.min_price))
      }

      sql += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT 50'
      const [products] = await this.pool.query(sql, params)

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'search_products', `Search: ${query?.substring(0, 100)}`, true)
      return { success: true, products }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async comparePrices(req, productIds) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const ids = Array.isArray(productIds) ? productIds : [productIds]
      const placeholders = ids.map(() => '?').join(',')
      const [products] = await this.pool.query(
        `SELECT p.id, p.name, p.type, p.weight, p.price, p.image_url, p.seller_id, c.full_name as seller_name
         FROM products p
         LEFT JOIN customers c ON p.seller_id = c.id
         WHERE p.id IN (${placeholders}) AND p.is_active = 1`,
        ids
      )
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'compare_prices', `Compare ${ids.length} products`, true)
      return { success: true, products }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getMarketPrices(req, region = null, commodity = null) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      let sql = 'SELECT * FROM market_prices WHERE 1=1'
      const params = []
      if (region) { sql += ' AND region = ?'; params.push(region) }
      if (commodity) { sql += ' AND commodity = ?'; params.push(commodity) }
      sql += ' ORDER BY last_updated DESC LIMIT 100'
      const [prices] = await this.pool.query(sql, params)

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_market_prices', `Market prices: region=${region}, commodity=${commodity}`, true)
      return { success: true, prices }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async trackMyOrder(req, orderId) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [orders] = await this.pool.query(
        `SELECT o.id, o.order_number, o.status, o.payment_status, o.shipping_address, o.created_at
         FROM orders o
         WHERE o.id = ? AND o.customer_id = ?`,
        [orderId, auth.customerId]
      )
      if (orders.length === 0) {
        return { success: false, message: 'Order not found' }
      }

      const [tracking] = await this.pool.query(
        `SELECT ot.status, ot.location, ot.notes, ot.created_at
         FROM order_tracking ot
         WHERE ot.order_id = ?
         ORDER BY ot.created_at DESC`,
        [orderId]
      )

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'track_my_order', `Track order #${orderId}`, true)
      return { success: true, order: orders[0], tracking }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getRecommendations(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [orders] = await this.pool.query(
        `SELECT p.type, p.weight, COUNT(*) as purchase_count, AVG(oi.quantity) as avg_qty
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE o.customer_id = ? AND o.status IN ('delivered', 'shipped')
         GROUP BY p.type, p.weight
         ORDER BY purchase_count DESC
         LIMIT 10`,
        [auth.customerId]
      )

      const [recentOrders] = await this.pool.query(
        `SELECT o.created_at FROM orders o WHERE o.customer_id = ? ORDER BY o.created_at DESC LIMIT 5`,
        [auth.customerId]
      )

      const recommendations = []
      if (orders.length > 0) {
        const topType = orders[0].type
        const [suggested] = await this.pool.query(
          `SELECT p.id, p.name, p.type, p.weight, p.price, p.image_url, p.description
           FROM products p
           WHERE p.type = ? AND p.is_active = 1 AND p.id NOT IN (
             SELECT product_id FROM cart WHERE customer_id = ?
           )
           ORDER BY p.price ASC
           LIMIT 5`,
          [topType, auth.customerId]
        )
        recommendations.push(...suggested.map(p => ({ ...p, reason: `Based on your ${topType} purchases` })))
      }

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_recommendations', 'Get personalized recommendations', true)
      return { success: true, recommendations, purchase_patterns: orders }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async calculatePurchaseCost(req, productId, quantity = 1) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [products] = await this.pool.query(
        'SELECT id, name, price, weight, type FROM products WHERE id = ? AND is_active = 1',
        [productId]
      )
      if (products.length === 0) {
        return { success: false, message: 'Product not found' }
      }
      const product = products[0]
      const total = parseFloat(product.price) * parseInt(quantity)
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'calculate_purchase_cost', `Cost calc: product ${productId}, qty ${quantity}`, true)
      return {
        success: true,
        product: { id: product.id, name: product.name, price: product.price, weight: product.weight },
        quantity,
        total_cost: total,
        currency: 'TZS'
      }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getMySales(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [sales] = await this.pool.query(
        `SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at,
                COUNT(oi.id) as item_count
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE p.seller_id = ?
         GROUP BY o.id
         ORDER BY o.created_at DESC
         LIMIT 50`,
        [auth.customerId]
      )
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_my_sales', 'Get seller sales', true)
      return { success: true, sales }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getMyProducts(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [products] = await this.pool.query(
        `SELECT p.id, p.name, p.description, p.type, p.weight, p.price, p.image_url, p.is_active, p.created_at,
                AVG(r.rating) as average_rating, COUNT(r.id) as review_count
         FROM products p
         LEFT JOIN reviews r ON p.id = r.product_id
         WHERE p.seller_id = ?
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
        [auth.customerId]
      )
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_my_products', 'Get seller products', true)
      return { success: true, products }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getMyInventory(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [inventory] = await this.pool.query(
        `SELECT p.id, p.name, p.type, p.weight, p.price, p.is_active, p.created_at,
                COALESCE(SUM(oi.quantity), 0) as total_sold
         FROM products p
         LEFT JOIN order_items oi ON p.id = oi.product_id
         LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('delivered', 'shipped')
         WHERE p.seller_id = ?
         GROUP BY p.id
         ORDER BY total_sold DESC`,
        [auth.customerId]
      )
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_my_inventory', 'Get seller inventory', true)
      return { success: true, inventory }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async analyzeSales(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [[monthly]] = await this.pool.query(
        `SELECT DATE_FORMAT(o.created_at, '%Y-%m') as month,
                COUNT(DISTINCT o.id) as order_count,
                COALESCE(SUM(o.total_amount), 0) as revenue,
                COUNT(oi.id) as items_sold
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE p.seller_id = ? AND o.status != 'cancelled'
           AND o.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
         ORDER BY month DESC`,
        [auth.customerId]
      )

      const [[topProducts]] = await this.pool.query(
        `SELECT p.id, p.name, p.type, p.price,
                COUNT(oi.id) as times_sold,
                COALESCE(SUM(oi.total_price), 0) as revenue
         FROM products p
         JOIN order_items oi ON p.id = oi.product_id
         JOIN orders o ON oi.order_id = o.id
         WHERE p.seller_id = ? AND o.status != 'cancelled'
         GROUP BY p.id
         ORDER BY revenue DESC
         LIMIT 10`,
        [auth.customerId]
      )

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'analyze_sales', 'Sales analysis', true)
      return { success: true, monthly, top_products: topProducts }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async recommendPrice(req, productId) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [products] = await this.pool.query(
        'SELECT id, name, type, weight, price FROM products WHERE id = ? AND seller_id = ?',
        [productId, auth.customerId]
      )
      if (products.length === 0) {
        return { success: false, message: 'Product not found or not owned' }
      }
      const product = products[0]

      const [competitors] = await this.pool.query(
        `SELECT AVG(price) as avg_price, MIN(price) as min_price, MAX(price) as max_price, COUNT(*) as count
         FROM products
         WHERE type = ? AND weight = ? AND is_active = 1 AND seller_id != ?`,
        [product.type, product.weight, auth.customerId]
      )

      const competitor = competitors[0] || { avg_price: product.price, min_price: product.price, max_price: product.price, count: 0 }
      const suggested = competitor.count > 0 ? parseFloat(competitor.avg_price) : parseFloat(product.price)

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'recommend_price', `Price recommendation for product ${productId}`, true)
      return {
        success: true,
        product: { id: product.id, name: product.name, current_price: product.price },
        market_data: competitor,
        suggested_price: Math.round(suggested * 100) / 100,
        reasoning: competitor.count > 0
          ? `Based on ${competitor.count} similar products in the market (avg TZS ${Math.round(competitor.avg_price)}/kg)`
          : 'No competitor data available, keeping current price'
      }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async predictDemand(req, productType) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [history] = await this.pool.query(
        `SELECT DATE(o.created_at) as date, SUM(oi.quantity) as total_qty
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE p.type = ? AND o.status IN ('delivered', 'shipped')
           AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(o.created_at)
         ORDER BY date ASC`,
        [productType]
      )

      const [marketTrend] = await this.pool.query(
        `SELECT trend FROM market_prices WHERE commodity = ? ORDER BY last_updated DESC LIMIT 1`,
        [productType]
      )

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'predict_demand', `Demand prediction for ${productType}`, true)
      return {
        success: true,
        product_type: productType,
        demand_data: history,
        market_trend: marketTrend[0]?.trend || 'stable',
        prediction: history.length > 0 ? 'demand_increasing' : 'insufficient_data'
      }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async identifySlowProducts(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [slow] = await this.pool.query(
        `SELECT p.id, p.name, p.type, p.price, p.created_at,
                COUNT(oi.id) as sales_count,
                COALESCE(SUM(oi.total_price), 0) as revenue
         FROM products p
         LEFT JOIN order_items oi ON p.id = oi.product_id
         LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('delivered', 'shipped')
         WHERE p.seller_id = ? AND p.is_active = 1
         GROUP BY p.id
         HAVING sales_count < 3
         ORDER BY sales_count ASC, revenue ASC
         LIMIT 20`,
        [auth.customerId]
      )
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'identify_slow_products', 'Identify slow-moving products', true)
      return { success: true, slow_products: slow }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async generateProductDescription(req, productName, productType, features = '') {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    const agent = await this.getAgentFromUserId(auth.customerId)
    await this.logToolCall(agent?.id, auth.customerId, 'generate_product_description', `Generate description for ${productName}`, true)

    const templates = {
      rice: `Premium quality ${productName} sourced from trusted Tanzanian farmers. Carefully selected and processed to ensure the highest standards of purity and taste. Perfect for household and commercial use. ${features}`,
      maize: `Fresh ${productName} suitable for milling and direct consumption. Grown using sustainable farming practices across Tanzania's prime agricultural regions. ${features}`,
      wheat: `Grade A ${productName} ideal for flour milling and baking. High protein content ensures excellent baking results. ${features}`,
      default: `High quality ${productName} available now on Nafaka Hub. Fresh, competitively priced, and ready for immediate delivery across Tanzania. ${features}`
    }

    const description = templates[productType?.toLowerCase()] || templates.default || templates.default
    return { success: true, description, product_name: productName }
  }

  async getMyCommissions(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [commissions] = await this.pool.query(
        `SELECT pc.id, pc.order_id, o.order_number, pc.order_total, pc.commission_rate, pc.commission_amount, pc.status, pc.paid_at, pc.created_at
         FROM platform_commissions pc
         JOIN orders o ON pc.order_id = o.id
         WHERE pc.seller_id = ?
         ORDER BY pc.created_at DESC
         LIMIT 50`,
        [auth.customerId]
      )
      const [[summary]] = await this.pool.query(
        `SELECT COUNT(*) as total_commissions, COALESCE(SUM(commission_amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_amount,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount
         FROM platform_commissions WHERE seller_id = ?`,
        [auth.customerId]
      )
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_my_commissions', 'Get seller commissions', true)
      return { success: true, commissions, summary }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getMyCustomers(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [customers] = await this.pool.query(
        `SELECT DISTINCT c.id, c.full_name, c.email, c.phone, c.business_name,
                COUNT(o.id) as order_count, COALESCE(SUM(o.total_amount), 0) as total_spent
         FROM customers c
         JOIN orders o ON c.id = o.customer_id
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE p.seller_id = ? AND c.id != ?
         GROUP BY c.id
         ORDER BY total_spent DESC
         LIMIT 50`,
        [auth.customerId, auth.customerId]
      )
      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_my_customers', 'Get seller customers', true)
      return { success: true, customers }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getDemandInformation(req, productType) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [marketData] = await this.pool.query(
        `SELECT region, commodity, price, trend, last_updated
         FROM market_prices
         WHERE commodity = ?
         ORDER BY last_updated DESC`,
        [productType]
      )

      const [orderData] = await this.pool.query(
        `SELECT DATE(o.created_at) as date, COUNT(*) as order_count, SUM(oi.quantity) as total_qty
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE p.type = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(o.created_at)
         ORDER BY date ASC`,
        [productType]
      )

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_demand_information', `Demand info for ${productType}`, true)
      return { success: true, market_data: marketData, order_trends: orderData }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async findPotentialBuyers(req, productType, region = null) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [buyers] = await this.pool.query(
        `SELECT DISTINCT c.id, c.full_name, c.email, c.phone, c.business_name,
                COUNT(o.id) as recent_orders, COALESCE(SUM(o.total_amount), 0) as total_spent
         FROM customers c
         JOIN orders o ON c.id = o.customer_id
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE p.type = ? AND p.seller_id = ? AND c.id != ?
           AND o.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
         GROUP BY c.id
         ORDER BY recent_orders DESC
         LIMIT 30`,
        [productType, auth.customerId, auth.customerId]
      )

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'find_potential_buyers', `Find buyers for ${productType}`, true)
      return { success: true, potential_buyers: buyers }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getPlatformStats(req) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    const adminRoles = ['superadmin', 'marketplace_admin', 'finance_admin']
    if (!adminRoles.includes(auth.role)) {
      return { success: false, message: 'Forbidden: admin access required' }
    }

    try {
      const [[stats]] = await this.pool.query(
        `SELECT
          (SELECT COUNT(*) FROM customers) as total_users,
          (SELECT COUNT(*) FROM customers WHERE role = 'seller') as total_sellers,
          (SELECT COUNT(*) FROM customers WHERE role = 'customer') as total_customers,
          (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
          (SELECT COUNT(*) FROM orders) as total_orders,
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status != 'cancelled') as total_revenue,
          (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders`
      )

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_platform_stats', 'Admin platform stats', true)
      return { success: true, stats }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getOrderDetails(req, orderId) {
    const auth = await this.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [orders] = await this.pool.query(
        `SELECT o.id, o.order_number, o.total_amount, o.status, o.payment_status, o.shipping_address, o.created_at,
                c.full_name as customer_name, c.phone as customer_phone
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         WHERE o.id = ? AND (o.customer_id = ? OR ? IN ('superadmin', 'marketplace_admin', 'finance_admin'))`,
        [orderId, auth.customerId, auth.role]
      )
      if (orders.length === 0) {
        return { success: false, message: 'Order not found' }
      }

      const [items] = await this.pool.query(
        `SELECT oi.id, oi.product_id, p.name, p.image_url, oi.quantity, oi.unit_price, oi.total_price
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      )

      const [tracking] = await this.pool.query(
        `SELECT status, location, notes, created_at FROM order_tracking WHERE order_id = ? ORDER BY created_at DESC`,
        [orderId]
      )

      const agent = await this.getAgentFromUserId(auth.customerId)
      await this.logToolCall(agent?.id, auth.customerId, 'get_order_details', `Order details #${orderId}`, true)
      return { success: true, order: orders[0], items, tracking }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getAgentFromUserId(userId) {
    const [agents] = await this.pool.query(
      'SELECT id FROM ai_agents WHERE user_id = ?',
      [userId]
    )
    return agents.length > 0 ? agents[0] : null
  }
}

module.exports = AITools
