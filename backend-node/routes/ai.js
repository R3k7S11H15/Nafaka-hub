const express = require('express')
const router = express.Router()
const AgentOrchestrator = require('../services/ai-orchestrator')
const { validateRequired, validateEmail, validatePhone, validateAmount, validatePositiveInt, sanitizeString } = require('../middleware/validation')

module.exports = (pool) => {
  const orchestrator = new AgentOrchestrator(pool)

  const { requireAuth, extractAuthUser } = require('../middleware/auth')
  const { aiRateLimit } = require('../middleware/rateLimit')

  router.use(requireAuth)
  router.use(aiRateLimit)

  router.get('/agent', async (req, res, next) => {
    try {
      const result = await orchestrator.getAgentInfo(req)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.get('/recommendations', async (req, res, next) => {
    try {
      const status = req.query.status || 'pending'
      const result = await orchestrator.recommendations.getRecommendations(req, status)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.post('/recommendations/generate', async (req, res, next) => {
    try {
      const result = await orchestrator.recommendations.generateProactiveInsights(req)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.put('/recommendations/:id/status', async (req, res, next) => {
    try {
      const { id } = req.params
      const { status } = req.body
      const result = await orchestrator.recommendations.updateRecommendationStatus(req, id, status)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.get('/memories', async (req, res, next) => {
    try {
      const memoryType = req.query.type || null
      const result = await orchestrator.memory.getMemories(req, memoryType)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.post('/memories', async (req, res, next) => {
    try {
      const { memory_type, content, importance } = req.body
      if (!memory_type || !content) {
        return res.status(400).json({ success: false, message: 'memory_type and content are required' })
      }
      const validTypes = ['preference', 'behavior', 'fact', 'context']
      if (!validTypes.includes(memory_type)) {
        return res.status(400).json({ success: false, message: `Invalid memory_type. Must be one of: ${validTypes.join(', ')}` })
      }
      const result = await orchestrator.memory.addMemory(req, memory_type, content, importance || 5)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.delete('/memories/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const result = await orchestrator.memory.deleteMemory(req, id)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.delete('/memories', async (req, res, next) => {
    try {
      const result = await orchestrator.memory.clearAllMemories(req)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.get('/conversations', async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 50
      const result = await orchestrator.getConversationHistory(req, limit)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.delete('/conversations', async (req, res, next) => {
    try {
      const result = await orchestrator.clearConversation(req)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.post('/ask', async (req, res, next) => {
    try {
      const { message } = req.body
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Message is required' })
      }
      if (message.length > 2000) {
        return res.status(400).json({ success: false, message: 'Message too long (max 2000 chars)' })
      }
      const result = await orchestrator.processUserMessage(req, message.trim())
      res.json(result)
    } catch (err) { next(err) }
  })

  router.post('/actions', async (req, res, next) => {
    try {
      const { tool, params = {} } = req.body
      if (!tool) {
        return res.status(400).json({ success: false, message: 'tool is required' })
      }
      const result = await orchestrator.executeTool(req, tool, params)
      res.json(result)
    } catch (err) { next(err) }
  })

  router.get('/tools', async (req, res, next) => {
    try {
      const auth = extractAuthUser(req)
      if (!auth) return res.status(401).json({ success: false, message: 'Unauthorized' })

      const allowedTools = await orchestrator.getAllowedTools(auth.role)
      res.json({ success: true, tools: allowedTools, role: auth.role })
    } catch (err) { next(err) }
  })

  router.post('/preferences', async (req, res, next) => {
    try {
      const { preferences } = req.body
      if (!preferences || typeof preferences !== 'object') {
        return res.status(400).json({ success: false, message: 'preferences object is required' })
      }
      const result = await orchestrator.memory.updatePreferences(req, preferences)
      res.json(result)
    } catch (err) { next(err) }
  })

  return router
}
