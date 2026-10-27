const AITools = require('./ai-tools')

class AIMemory {
  constructor(pool) {
    this.pool = pool
    this.tools = new AITools(pool)
  }

  async getAgent(req) {
    const auth = await this.tools.getAuthUser(req)
    if (!auth) return null
    const [agents] = await this.pool.query(
      'SELECT id, user_id, role, status, preferences_json, created_at FROM ai_agents WHERE user_id = ?',
      [auth.customerId]
    )
    return agents.length > 0 ? agents[0] : null
  }

  async getMemories(req, memoryType = null) {
    const agent = await this.getAgent(req)
    if (!agent) return { success: false, message: 'Agent not found' }

    try {
      let sql = 'SELECT id, agent_id, memory_type, content, importance, created_at, updated_at FROM ai_memories WHERE agent_id = ?'
      const params = [agent.id]
      if (memoryType) {
        sql += ' AND memory_type = ?'
        params.push(memoryType)
      }
      sql += ' ORDER BY importance DESC, created_at DESC'
      const [memories] = await this.pool.query(sql, params)
      return { success: true, memories }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async addMemory(req, memoryType, content, importance = 5) {
    const agent = await this.getAgent(req)
    if (!agent) return { success: false, message: 'Agent not found' }

    if (!content || content.trim().length === 0) {
      return { success: false, message: 'Memory content cannot be empty' }
    }
    if (content.length > 2000) {
      return { success: false, message: 'Memory content too long (max 2000 chars)' }
    }
    if (importance < 1 || importance > 10) {
      return { success: false, message: 'Importance must be between 1 and 10' }
    }

    try {
      const [result] = await this.pool.query(
        'INSERT INTO ai_memories (agent_id, memory_type, content, importance) VALUES (?, ?, ?, ?)',
        [agent.id, memoryType, content.trim().substring(0, 2000), importance]
      )
      return { success: true, memory_id: result.insertId }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async deleteMemory(req, memoryId) {
    const agent = await this.getAgent(req)
    if (!agent) return { success: false, message: 'Agent not found' }

    try {
      const [result] = await this.pool.query(
        'DELETE FROM ai_memories WHERE id = ? AND agent_id = ?',
        [memoryId, agent.id]
      )
      if (result.affectedRows === 0) {
        return { success: false, message: 'Memory not found' }
      }
      return { success: true, message: 'Memory deleted' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async clearAllMemories(req) {
    const agent = await this.getAgent(req)
    if (!agent) return { success: false, message: 'Agent not found' }

    try {
      await this.pool.query('DELETE FROM ai_memories WHERE agent_id = ?', [agent.id])
      return { success: true, message: 'All memories cleared' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async updatePreferences(req, preferences) {
    const agent = await this.getAgent(req)
    if (!agent) return { success: false, message: 'Agent not found' }

    try {
      const currentPrefs = agent.preferences_json ? JSON.parse(agent.preferences_json) : {}
      const updated = { ...currentPrefs, ...preferences }
      await this.pool.query(
        'UPDATE ai_agents SET preferences_json = ?, updated_at = NOW() WHERE id = ?',
        [JSON.stringify(updated), agent.id]
      )
      return { success: true, preferences: updated }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async buildContext(req) {
    const agent = await this.getAgent(req)
    if (!agent) return null

    const context = {
      user_id: agent.user_id,
      role: agent.role,
      preferences: agent.preferences_json ? JSON.parse(agent.preferences_json) : {}
    }

    try {
      const memoryResult = await this.getMemories(req)
      if (memoryResult.success) {
        context.memories = memoryResult.memories.slice(0, 20)
      }

      if (agent.role === 'seller') {
        const products = await this.tools.getMyProducts(req)
        if (products.success) context.products = products.products.slice(0, 10)
        const sales = await this.tools.analyzeSales(req)
        if (sales.success) context.sales_summary = sales
      } else {
        const orders = await this.tools.getMyOrders(req)
        if (orders.success) context.recent_orders = orders.orders.slice(0, 10)
        const history = await this.tools.getMyPurchaseHistory(req)
        if (history.success) context.purchase_history = history.history.slice(0, 20)
      }

      const prices = await this.tools.getMarketPrices(req)
      if (prices.success) context.market_prices = prices.prices.slice(0, 20)

      return context
    } catch (err) {
      console.error('Failed to build AI context:', err)
      return context
    }
  }
}

module.exports = AIMemory
