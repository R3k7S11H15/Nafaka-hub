const AITools = require('./ai-tools')

class AIRecommendations {
  constructor(pool) {
    this.pool = pool
    this.tools = new AITools(pool)
  }

  async generateRecommendations(req) {
    const auth = await this.tools.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const recommendations = []

      if (auth.role === 'seller' || auth.role === 'customer') {
        const salesData = await this.tools.analyzeSales({ ...req, user: auth })
        if (salesData.success && salesData.monthly && salesData.monthly.length > 0) {
          const latest = salesData.monthly[0]
          const previous = salesData.monthly[1]
          if (latest && previous) {
            const change = ((latest.revenue - previous.revenue) / previous.revenue * 100).toFixed(1)
            if (parseFloat(change) > 20) {
              recommendations.push({
                type: 'insight',
                title: 'Sales Growing!',
                description: `Your sales increased by ${change}% this month. Consider expanding your product range.`,
                priority: 'high',
                action_data: { action: 'view_analytics', link: '/analytics' }
              })
            } else if (parseFloat(change) < -20) {
              recommendations.push({
                type: 'insight',
                title: 'Sales Decline Detected',
                description: `Your sales decreased by ${Math.abs(parseFloat(change))}% this month. Review your product listings and pricing.`,
                priority: 'high',
                action_data: { action: 'view_products', link: '/sell-products' }
              })
            }
          }
        }

        const slowProducts = await this.tools.identifySlowProducts(req)
        if (slowProducts.success && slowProducts.slow_products.length > 0) {
          recommendations.push({
            type: 'listing',
            title: 'Slow-Moving Products',
            description: `${slowProducts.slow_products.length} products have fewer than 3 sales. Consider updating pricing or descriptions.`,
            priority: 'medium',
            action_data: { action: 'view_products', link: '/sell-products' }
          })
        }

        const marketPrices = await this.tools.getMarketPrices(req)
        if (marketPrices.success && marketPrices.prices.length > 0) {
          const downTrends = marketPrices.prices.filter(p => p.trend === 'down')
          if (downTrends.length > 0 && auth.role === 'customer') {
            recommendations.push({
              type: 'price_alert',
              title: 'Price Drop Alert',
              description: `${downTrends.length} commodities have decreased in price. Good time to purchase.`,
              priority: 'medium',
              action_data: { action: 'view_products', link: '/products' }
            })
          }
        }
      }

      if (auth.role === 'seller') {
        const commissions = await this.tools.getMyCommissions(req)
        if (commissions.success && commissions.summary && commissions.summary.pending_amount > 0) {
          recommendations.push({
            type: 'insight',
            title: 'Pending Commissions',
            description: `You have TZS ${parseFloat(commissions.summary.pending_amount).toLocaleString()} in pending commissions.`,
            priority: 'low',
            action_data: { action: 'view_commissions', link: '/finance' }
          })
        }
      }

      for (const rec of recommendations) {
        const [existing] = await this.pool.query(
          `SELECT id FROM ai_recommendations WHERE user_id = ? AND type = ? AND title = ? AND status = 'pending'`,
          [auth.customerId, rec.type, rec.title]
        )
        if (existing.length === 0) {
          await this.pool.query(
            `INSERT INTO ai_recommendations (user_id, type, title, description, priority, action_data, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [auth.customerId, rec.type, rec.title, rec.description, rec.priority, JSON.stringify(rec.action_data)]
          )
        }
      }

      return { success: true, recommendations }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async getRecommendations(req, status = 'pending') {
    const auth = await this.tools.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const [recs] = await this.pool.query(
        `SELECT id, user_id, type, title, description, priority, action_data, status, created_at, updated_at
         FROM ai_recommendations
         WHERE user_id = ? AND status = ?
         ORDER BY priority ASC, created_at DESC`,
        [auth.customerId, status]
      )
      return { success: true, recommendations: recs }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async updateRecommendationStatus(req, recommendationId, status) {
    const auth = await this.tools.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    const validStatuses = ['viewed', 'acted', 'dismissed']
    if (!validStatuses.includes(status)) {
      return { success: false, message: 'Invalid status' }
    }

    try {
      const [result] = await this.pool.query(
        'UPDATE ai_recommendations SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [status, recommendationId, auth.customerId]
      )
      if (result.affectedRows === 0) {
        return { success: false, message: 'Recommendation not found' }
      }
      return { success: true, message: 'Status updated' }
    } catch (err) {
      return { success: false, message: err.message }
    }
  }

  async generateProactiveInsights(req) {
    const auth = await this.tools.getAuthUser(req)
    if (!auth) return { success: false, message: 'Unauthorized' }

    try {
      const result = await this.generateRecommendations(req)
      return result
    } catch (err) {
      return { success: false, message: err.message }
    }
  }
}

module.exports = AIRecommendations
