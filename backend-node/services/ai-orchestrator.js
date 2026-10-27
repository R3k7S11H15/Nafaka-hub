const AITools = require('./ai-tools')
const AIMemory = require('./ai-memory')
const AIRecommendations = require('./ai-recommendations')

class AgentOrchestrator {
  constructor(pool) {
    this.pool = pool
    this.tools = new AITools(pool)
    this.memory = new AIMemory(pool)
    this.recommendations = new AIRecommendations(pool)
  }

  async getAgentInfo(req) {
    const auth = await this.tools.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    let agent = await this.tools.getAgentFromUserId(auth.customerId)
    if (!agent) {
      agent = await this.ensureAgent(auth.customerId, auth.role)
    }
    return { success: true, agent }
  }

  async ensureAgent(userId, role) {
    try {
      const [result] = await this.pool.query(
        'INSERT INTO ai_agents (user_id, role, status, preferences_json) VALUES (?, ?, ?, ?)',
        [userId, role, 'active', JSON.stringify({})]
      )
      const [agents] = await this.pool.query(
        'SELECT id, user_id, role, status, preferences_json, created_at FROM ai_agents WHERE id = ?',
        [result.insertId]
      )
      return agents[0]
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        const [agents] = await this.pool.query(
          'SELECT id, user_id, role, status, preferences_json, created_at FROM ai_agents WHERE user_id = ?',
          [userId]
        )
        return agents[0]
      }
      throw err
    }
  }

  async executeTool(req, toolName, params = {}) {
    const auth = await this.tools.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    const agent = await this.tools.getAgentFromUserId(auth.customerId)
    if (!agent) {
      return { success: false, message: 'Agent not initialized' }
    }

    const allowedTools = await this.getAllowedTools(auth.role)
    if (!allowedTools.includes(toolName)) {
      return { success: false, message: `Tool '${toolName}' not permitted for role '${auth.role}'` }
    }

    const toolMap = {
      get_agent: () => this.tools.getAgent(req),
      get_my_orders: () => this.tools.getMyOrders(req),
      get_my_purchase_history: () => this.tools.getMyPurchaseHistory(req),
      get_my_favorite_products: () => this.tools.getMyWishlist(req),
      search_products: () => this.tools.searchProducts(req, params.query, params.filters),
      compare_prices: () => this.tools.comparePrices(req, params.product_ids),
      get_market_prices: () => this.tools.getMarketPrices(req, params.region, params.commodity),
      track_my_order: () => this.tools.trackMyOrder(req, params.order_id),
      get_recommendations: () => this.tools.getRecommendations(req),
      calculate_purchase_cost: () => this.tools.calculatePurchaseCost(req, params.product_id, params.quantity),
      get_my_wishlist: () => this.tools.getMyWishlist(req),
      get_order_details: () => this.tools.getOrderDetails(req, params.order_id),
      get_my_sales: () => this.tools.getMySales(req),
      get_my_products: () => this.tools.getMyProducts(req),
      get_my_inventory: () => this.tools.getMyInventory(req),
      get_my_orders: () => this.tools.getMyOrders(req),
      analyze_sales: () => this.tools.analyzeSales(req),
      recommend_price: () => this.tools.recommendPrice(req, params.product_id),
      predict_demand: () => this.tools.predictDemand(req, params.product_type),
      identify_slow_products: () => this.tools.identifySlowProducts(req),
      generate_product_description: () => this.tools.generateProductDescription(req, params.product_name, params.product_type, params.features),
      get_my_commissions: () => this.tools.getMyCommissions(req),
      get_my_customers: () => this.tools.getMyCustomers(req),
      get_demand_information: () => this.tools.getDemandInformation(req, params.product_type),
      find_potential_buyers: () => this.tools.findPotentialBuyers(req, params.product_type, params.region),
      get_platform_stats: () => this.tools.getPlatformStats(req)
    }

    const toolFunc = toolMap[toolName]
    if (!toolFunc) {
      return { success: false, message: `Unknown tool: ${toolName}` }
    }

    try {
      const result = await toolFunc()
      if (result.success) {
        await this.memory.addMemory(req, 'context', `Tool executed: ${toolName}`, 3)
      }
      return result
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getAllowedTools(role) {
    try {
      const [rows] = await this.pool.query(
        'SELECT tool_name FROM ai_tool_permissions WHERE role = ? AND allowed = 1',
        [role]
      )
      return rows.map(r => r.tool_name)
    } catch (err) {
      console.error('Failed to load tool permissions:', err)
      return []
    }
  }

  async processUserMessage(req, message) {
    const auth = await this.tools.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    let agent = await this.tools.getAgentFromUserId(auth.customerId)
    if (!agent) {
      agent = await this.ensureAgent(auth.customerId, auth.role)
    }

    await this.pool.query(
      'INSERT INTO ai_conversations (agent_id, user_id, message, sender, created_at) VALUES (?, ?, ?, ?, NOW())',
      [agent.id, auth.customerId, message, 'user']
    )

    const context = await this.memory.buildContext(req)
    const allowedTools = await this.getAllowedTools(auth.role)

    const lowerMessage = message.toLowerCase()
    let toolCalls = []
    let responseText = ''

    if (lowerMessage.includes('order') && (lowerMessage.includes('my') || lowerMessage.includes('track'))) {
      if (allowedTools.includes('get_my_orders')) {
        const orderResult = await this.tools.getMyOrders(req)
        if (orderResult.success) {
          const orderCount = orderResult.orders.length
          const pending = orderResult.orders.filter(o => o.status === 'pending').length
          responseText = `You have ${orderCount} total orders, ${pending} pending. `
          if (pending > 0) {
            responseText += 'Would you like me to track any specific order?'
          } else {
            responseText += 'All your orders are being processed!'
          }
          toolCalls.push('get_my_orders')
        }
      }
    } else if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
      if (allowedTools.includes('get_recommendations')) {
        const recs = await this.tools.getRecommendations(req)
        if (recs.success && recs.recommendations.length > 0) {
          responseText = `Based on your activity, I found ${recs.recommendations.length} recommendations:\n`
          recs.recommendations.slice(0, 3).forEach(r => {
            responseText += `• ${r.reason || r.name}: ${r.description || ''}\n`
          })
        } else {
          responseText = 'I don\'t have enough data yet. Continue using the marketplace and I\'ll learn your preferences!'
        }
        toolCalls.push('get_recommendations')
      }
    } else if (lowerMessage.includes('price') || lowerMessage.includes('market')) {
      if (allowedTools.includes('get_market_prices')) {
        const prices = await this.tools.getMarketPrices(req)
        if (prices.success && prices.prices.length > 0) {
          const top = prices.prices.slice(0, 5)
          responseText = 'Current market prices:\n'
          top.forEach(p => {
            responseText += `• ${p.commodity} in ${p.region}: TZS ${p.price}/${p.unit} (${p.trend})\n`
          })
        }
        toolCalls.push('get_market_prices')
      }
    } else if (lowerMessage.includes('sales') && auth.role === 'seller') {
      if (allowedTools.includes('analyze_sales')) {
        const analysis = await this.tools.analyzeSales(req)
        if (analysis.success) {
          responseText = `Sales Analysis:\n`
          if (analysis.monthly && analysis.monthly.length > 0) {
            responseText += `• Recent months: ${analysis.monthly.length} months of data\n`
            responseText += `• Total revenue: TZS ${parseFloat(analysis.monthly.reduce((sum, m) => sum + (m.revenue || 0), 0)).toLocaleString()}\n`
          }
          if (analysis.top_products && analysis.top_products.length > 0) {
            responseText += `• Top product: ${analysis.top_products[0].name} (TZS ${parseFloat(analysis.top_products[0].revenue).toLocaleString()})\n`
          }
        }
        toolCalls.push('analyze_sales')
      }
    } else if (lowerMessage.includes('product') && (lowerMessage.includes('my') || lowerMessage.includes('list'))) {
      if (auth.role === 'seller' && allowedTools.includes('get_my_products')) {
        const products = await this.tools.getMyProducts(req)
        if (products.success) {
          responseText = `You have ${products.products.length} active products. `
          const lowRated = products.products.filter(p => p.average_rating && p.average_rating < 3)
          if (lowRated.length > 0) {
            responseText += `${lowRated.length} have ratings below 3 stars. Consider improving descriptions or pricing.`
          }
        }
        toolCalls.push('get_my_products')
      }
    } else {
      responseText = this.getDefaultResponse(auth.role, allowedTools)
    }

    await this.pool.query(
      'INSERT INTO ai_conversations (agent_id, user_id, message, sender, tool_used, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [agent.id, auth.customerId, responseText, 'ai', toolCalls[0] || null]
    )

    await this.tools.logToolCall(agent.id, auth.customerId, 'process_message', `User message: ${message.substring(0, 200)}`, true)

    return {
      success: true,
      response: responseText,
      tools_used: toolCalls,
      context: {
        role: auth.role,
        memory_count: context.memories?.length || 0
      }
    }
  }

  getDefaultResponse(role, allowedTools) {
    const responses = {
      seller: "I can help you with: analyzing your sales, recommending prices, identifying slow products, finding potential buyers, and managing your inventory. What would you like to know?",
      customer: "I can help you with: tracking orders, finding products, comparing prices, checking market trends, and getting personalized recommendations. What can I help you find?",
    }
    return responses[role] || "Hello! I'm your personal AI assistant. How can I help you today?"
  }

  async getConversationHistory(req, limit = 50) {
    const auth = await this.tools.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [history] = await this.pool.query(
        `SELECT id, message, sender, tool_used, created_at
         FROM ai_conversations
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [auth.customerId, limit]
      )
      return { success: true, history: history.reverse() }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async clearConversation(req) {
    const auth = await this.tools.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const agent = await this.tools.getAgentFromUserId(auth.customerId)
      if (!agent) return { success: false, message: 'Agent not found' }
      await this.pool.query('DELETE FROM ai_conversations WHERE user_id = ?', [auth.customerId])
      return { success: true, message: 'Conversation cleared' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }
}

module.exports = AgentOrchestrator
