const express = require('express')
const { csrfProtection } = require('../middleware/csrf')
const { validateRequired } = require('../middleware/validation')
const { requireAuth } = require('../middleware/auth')

module.exports = (pool) => {
  const router = express.Router()
  const lifecycle = require('../services/orderLifecycle')(pool)

  function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
  }

  // GET /api/order_lifecycle.php?action=get&order_id=...&order_number=...
  // GET /api/order_lifecycle.php?action=timeline&order_id=...
  // GET /api/order_lifecycle.php?action=actions&order_id=...
  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      const { action = 'get', order_id, order_number } = req.query
      const id = order_id || order_number
      if (!id) return res.status(400).json({ success: false, message: 'order_id is required' })

      switch (action) {
        case 'get':
        case 'timeline': {
          const result = await lifecycle.getOrderWithTimeline(pool, req.user, id)
          return res.json(result)
        }
        case 'actions': {
          const result = await lifecycle.getAllowedActions(pool, req.user, id)
          return res.json(result)
        }
        case 'stages':
          return res.json({ success: true, stages: lifecycle.STAGES, labels: lifecycle.STATUS_LABELS })
        default:
          return res.status(400).json({ success: false, message: 'Invalid action' })
      }
    })
  )

  // POST /api/order_lifecycle.php
  // Body: { action, order_id, ...transition-specific fields, csrf_token }
  //   action === <lifecycle action name> (e.g. "pay", "seller_accept")  -> performTransition
  //   action === "fulfillment_update"  -> recordFulfillmentEvent
  //   action === "status_update"       -> recordLegacyStatusUpdate
  router.post(
    '/',
    csrfProtection,
    requireAuth,
    validateRequired(['action']),
    asyncHandler(async (req, res) => {
      const { action, order_id, ...body } = req.body
      let result
      if (lifecycle.ACTIONS[action]) {
        result = await lifecycle.performTransition(pool, req.user, { action, order_id, ...body })
      } else if (action === 'fulfillment_update') {
        result = await lifecycle.recordFulfillmentEvent(pool, order_id, body.status, req.user, {
          fulfillment_id: body.fulfillment_id,
          notes: body.notes,
          tracking_number: body.tracking_number,
        })
      } else if (action === 'status_update') {
        result = await lifecycle.recordLegacyStatusUpdate(pool, req.user, { order_id, ...body })
      } else {
        return res.status(400).json({ success: false, message: 'Invalid action' })
      }
      res.json(result)
    })
  )

  return router
}
