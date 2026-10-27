/**
 * Real-time Pub/Sub service.
 *
 * Uses local in-process pub/sub by default (works for single-process deployments).
 * When REDIS_URL is configured AND process.env.REALTIME_USE_REDIS=true,
 * it uses Redis Pub/Sub for multi-process deployments (e.g. Docker with multiple
 * backend containers).
 *
 * Each SSE endpoint subscribes to a channel and keeps its connection open.
 * Write operations publish events to the channel so all connected clients
 * (across devices) receive updates immediately.
 */

const LOCAL_CHANNELS = new Map()
let redisSubscriber = null
let redisPublisher = null
let subscriberReady = false
const pendingSubscriptions = []

function isRedisEnabled() {
  return process.env.REALTIME_USE_REDIS === 'true' && (process.env.REDIS_URL || process.env.REDIS_HOST)
}

function ensureSubscriber() {
  if (redisSubscriber) return redisSubscriber
  if (!isRedisEnabled()) return null
  try {
    const redis = require('redis')
    const url = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
    redisSubscriber = redis.createClient({ url })
    redisSubscriber.on('error', (err) => console.warn('[realtime] Redis subscriber error:', err.message))
    redisSubscriber.connect().then(() => {
      subscriberReady = true
      console.log('[realtime] Redis subscriber connected')
      pendingSubscriptions.forEach(({ channel, handler }) => {
        try { redisSubscriber.subscribe(channel, handler) } catch {}
      })
      pendingSubscriptions.length = 0
    }).catch(err => {
      console.warn('[realtime] Redis subscriber failed, using local fallback:', err.message)
      redisSubscriber = null
    })
  } catch (err) {
    console.warn('[realtime] Redis not available, using local fallback:', err.message)
    redisSubscriber = null
  }
  return redisSubscriber
}

function ensurePublisher() {
  if (redisPublisher) return redisPublisher
  if (!isRedisEnabled()) return null
  try {
    const redis = require('redis')
    const url = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
    redisPublisher = redis.createClient({ url })
    redisPublisher.on('error', (err) => console.warn('[realtime] Redis publisher error:', err.message))
    redisPublisher.connect().then(() => {
      console.log('[realtime] Redis publisher connected')
    }).catch(err => {
      console.warn('[realtime] Redis publisher failed:', err.message)
      redisPublisher = null
    })
  } catch (err) {
    console.warn('[realtime] Redis publisher not available:', err.message)
    redisPublisher = null
  }
  return redisPublisher
}

function subscribe(channel, handler) {
  if (redisSubscriber) {
    if (!subscriberReady) {
      pendingSubscriptions.push({ channel, handler })
      return
    }
    try {
      redisSubscriber.subscribe(channel, (message) => {
        try { handler(JSON.parse(message)) } catch {}
      })
    } catch (e) {
      console.error('[realtime] Subscribe error:', e.message)
    }
    return
  }
  // Local in-process pub/sub (default, works for single-process)
  if (!LOCAL_CHANNELS.has(channel)) LOCAL_CHANNELS.set(channel, new Set())
  LOCAL_CHANNELS.get(channel).add(handler)
}

function unsubscribe(channel, handler) {
  if (redisSubscriber) {
    const idx = pendingSubscriptions.findIndex(s => s.channel === channel && s.handler === handler)
    if (idx >= 0) {
      pendingSubscriptions.splice(idx, 1)
      return
    }
    try { redisSubscriber.unsubscribe(channel) } catch {}
    return
  }
  const set = LOCAL_CHANNELS.get(channel)
  if (set) {
    set.delete(handler)
    if (set.size === 0) LOCAL_CHANNELS.delete(channel)
  }
}

function publish(channel, payload) {
  const data = JSON.stringify(payload)
  if (redisPublisher) {
    try { redisPublisher.publish(channel, data) } catch {}
    return
  }
  // Local in-process pub/sub
  const set = LOCAL_CHANNELS.get(channel)
  if (set) {
    set.forEach(handler => {
      try { handler(payload) } catch {}
    })
  }
}

// ============ Channel names ============
const CHANNELS = {
  messages: (recipientId) => `realtime:messages:${recipientId}`,
  notifications: (customerId) => `realtime:notifications:${customerId}`,
  orders: (customerId) => `realtime:orders:${customerId}`,
  cart: (customerId) => `realtime:cart:${customerId}`,
  deliveries: (providerId) => `realtime:deliveries:${providerId}`,
  superadmin: () => `realtime:superadmin`,
  bulkProcurement: (customerId) => `realtime:bulk_procurement:${customerId}`,
}

// ============ SSE helpers ============

function setupSSE(res, channels, heartbeatMs = 15000) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('X-Accel-Buffering', 'no')

  let alive = true
  const handlers = []

  channels.forEach(({ channel, mapChannel, transform }) => {
    const handler = (payload) => {
      if (!alive) return
      try {
        const data = transform ? transform(payload) : payload
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      } catch {}
    }
    handlers.push({ channel: mapChannel || channel, handler })
    subscribe(channel, handler)
  })

  const heartbeat = setInterval(() => {
    if (!alive) return
    try { res.write(`event: ping\ndata: ${Date.now()}\n\n`) } catch { stop() }
  }, heartbeatMs)

  function stop() {
    alive = false
    clearInterval(heartbeat)
    handlers.forEach(({ channel, handler }) => unsubscribe(channel, handler))
    try { res.end() } catch {}
  }

  res.on('close', stop)
  res.on('error', stop)
  return stop
}

// ============ Publish helpers ============
function publishMessage(recipientId, payload) {
  publish(CHANNELS.messages(recipientId), { type: 'message', ...payload })
}

function publishNotifications(customerId, payload) {
  publish(CHANNELS.notifications(customerId), { type: 'notification', ...payload })
}

function publishOrders(customerId, payload) {
  publish(CHANNELS.orders(customerId), { type: 'order_update', ...payload })
}

function publishCart(customerId, payload) {
  publish(CHANNELS.cart(customerId), { type: 'cart_update', ...payload })
}

function publishDeliveries(providerId, payload) {
  publish(CHANNELS.deliveries(providerId), { type: 'delivery_update', ...payload })
}

function publishSuperadmin(payload) {
  publish(CHANNELS.superadmin(), { type: 'metrics', ...payload })
}

function publishBulkProcurement(customerId, payload) {
  publish(CHANNELS.bulkProcurement(customerId), { type: 'bulk_procurement_update', ...payload })
}

function publishTyping(recipientId, payload) {
  publish(CHANNELS.messages(recipientId), { type: 'typing', ...payload })
}

function publishChatEvent(recipientId, payload) {
  publish(CHANNELS.messages(recipientId), payload)
}

module.exports = {
  ensureSubscriber,
  ensurePublisher,
  setupSSE,
  publishMessage,
  publishNotifications,
  publishOrders,
  publishCart,
  publishDeliveries,
  publishSuperadmin,
  publishBulkProcurement,
  publishTyping,
  publishChatEvent,
  CHANNELS,
}