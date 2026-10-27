const axios = require('axios')
const crypto = require('crypto')

let pool = null

function setPool(dbPool) {
  pool = dbPool
}

function generateSignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex')
}

async function deliverWebhook(webhook, eventType, payload) {
  const delivery = {
    webhook_id: webhook.id,
    event_type: eventType,
    payload: JSON.stringify(payload),
    status: 'pending',
    attempts: 1,
    max_attempts: webhook.retry_count || 3,
  }

  const [result] = await pool.query(
    'INSERT INTO webhook_deliveries (webhook_id, event_type, payload, attempts, max_attempts) VALUES (?, ?, ?, ?, ?)',
    [webhook.id, eventType, delivery.payload, 1, delivery.max_attempts]
  )
  delivery.id = result.insertId

  try {
    const response = await axios.post(webhook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': eventType,
        'X-Webhook-Signature': generateSignature(payload, webhook.secret),
      },
      timeout: webhook.timeout || 5000,
    })

    await pool.query(
      'UPDATE webhook_deliveries SET response_status = ?, response_body = ?, status = ?, delivered_at = NOW() WHERE id = ?',
      [response.status, JSON.stringify(response.data), 'delivered', delivery.id]
    )
    return { success: true, delivery }
  } catch (error) {
    await pool.query(
      'UPDATE webhook_deliveries SET response_status = ?, error_message = ?, status = ? WHERE id = ?',
      [error.response?.status || 0, error.message, 'failed', delivery.id]
    )
    return { success: false, delivery, error: error.message }
  }
}

async function retryFailedWebhooks() {
  const [pending] = await pool.query(
    `SELECT wd.*, w.url, w.secret FROM webhook_deliveries wd
     JOIN webhooks w ON wd.webhook_id = w.id
     WHERE wd.status = 'failed' AND wd.attempts < wd.max_attempts
     AND (wd.next_retry_at IS NULL OR wd.next_retry_at <= NOW())`
  )

  for (const delivery of pending) {
    const webhook = { id: delivery.webhook_id, url: delivery.url, secret: delivery.secret, retry_count: delivery.max_attempts }
    const payload = JSON.parse(delivery.payload)

    await pool.query('UPDATE webhook_deliveries SET attempts = attempts + 1, next_retry_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE id = ?', [delivery.id])
    await deliverWebhook(webhook, delivery.event_type, payload)
  }
}

async function getDeliveries(webhookId, status, limit = 50, offset = 0) {
  let sql = 'SELECT * FROM webhook_deliveries WHERE 1=1'
  const params = []
  if (webhookId) {
    sql += ' AND webhook_id = ?'
    params.push(webhookId)
  }
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)
  const [rows] = await pool.query(sql, params)
  return rows
}

async function getDeliveryStats(webhookId) {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) as count FROM webhook_deliveries WHERE webhook_id = ? GROUP BY status`,
    [webhookId]
  )
  const stats = { total: 0, delivered: 0, failed: 0, pending: 0, dead_letter: 0 }
  rows.forEach(r => {
    stats[r.status] = r.count
    stats.total += r.count
  })
  return stats
}

async function retryDelivery(deliveryId) {
  const [[delivery]] = await pool.query('SELECT * FROM webhook_deliveries WHERE id = ?', [deliveryId])
  if (!delivery) return { success: false, message: 'Delivery not found' }

  const [[webhook]] = await pool.query('SELECT * FROM webhooks WHERE id = ?', [delivery.webhook_id])
  if (!webhook) return { success: false, message: 'Webhook not found' }

  const payload = JSON.parse(delivery.payload)
  await pool.query('UPDATE webhook_deliveries SET attempts = attempts + 1, next_retry_at = NULL WHERE id = ?', [deliveryId])
  return await deliverWebhook(webhook, delivery.event_type, payload)
}

async function deleteDelivery(deliveryId) {
  await pool.query('DELETE FROM webhook_deliveries WHERE id = ?', [deliveryId])
  return { success: true }
}

module.exports = {
  setPool,
  deliverWebhook,
  retryFailedWebhooks,
  getDeliveries,
  getDeliveryStats,
  retryDelivery,
  deleteDelivery,
  generateSignature
}