/**
 * Order Lifecycle service.
 *
 * Marketplace order lifecycle (no escrow, direct buyer -> seller payment):
 *
 *   draft -> pending_payment -> buyer_marked_paid -> paid -> processing
 *   -> ready_for_delivery -> out_for_delivery -> delivered -> completed
 *   -> disputed / refunded / cancelled / rejected
 *
 * Terminal error states:
 *   - payment_rejected (seller rejected payment, buyer can retry)
 *   - cancelled (buyer or seller cancelled)
 *   - disputed / refunded / completed
 *
 * Responsibilities:
 *  - Role + ownership based permission control for every transition.
 *  - Atomic (transacted) status transitions that write an immutable audit
 *    event into `order_tracking` for EVERY status change / action.
 *  - Recruitable notifications for important transitions (buyer, sellers,
 *    warehouse owner, logistics owner, finance, admin group).
 *  - Server-Sent Events broadcast so web/mobile timelines update live.
 *
 * The status names below are the single source of truth: the frontend
 * (`src/config/orderLifecycle.js`) mirrors them for labels/icons/stages.
 */

const realtime = require('./realtime')

// ---------------------------------------------------------------------------
// Statuses & stages
// ---------------------------------------------------------------------------

const ORDER_STATUSES = [
  'draft',
  'pending_payment',
  'buyer_marked_paid',
  'paid',
  'payment_rejected',
  'processing',
  'ready_for_delivery',
  'out_for_delivery',
  'delivered',
  'completed',
  'disputed',
  'refunded',
  'cancelled',
  // Legacy aliases still stored in the DB enum (kept for compatibility).
  'pending',
  'shipped',
  'confirmed',
  'awaiting_seller_confirmation',
  'seller_accepted',
  'awaiting_warehouse_allocation',
  'quality_inspection',
  'ready_for_dispatch',
  'assigned_to_logistics',
  'in_transit',
  'buyer_confirmation',
]

// Map legacy/short statuses to their canonical lifecycle state.
const STATUS_NORMALIZE = {
  pending: 'pending_payment',
  confirmed: 'pending_payment',
  processing: 'buyer_marked_paid',
  shipped: 'in_transit',
  buyer_confirmation: 'delivered',
}

const STATUS_LABELS = {
  draft: 'Draft',
  pending_payment: 'Pending Payment',
  buyer_marked_paid: 'Awaiting Seller Confirmation',
  paid: 'Paid',
  payment_rejected: 'Payment Rejected',
  processing: 'Processing',
  ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

// Ordered lifecycle stages. Each stage maps 1:1 to a canonical status.
// Terminal states are listed for completeness.
const STAGES = [
  { status: 'draft', label: 'Draft' },
  { status: 'pending_payment', label: 'Pending Payment' },
  { status: 'buyer_marked_paid', label: 'Awaiting Seller Confirmation' },
  { status: 'paid', label: 'Paid' },
  { status: 'payment_rejected', label: 'Payment Rejected' },
  { status: 'processing', label: 'Processing' },
  { status: 'ready_for_delivery', label: 'Ready for Delivery' },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'completed', label: 'Completed' },
  { status: 'disputed', label: 'Disputed' },
  { status: 'refunded', label: 'Refunded' },
  { status: 'cancelled', label: 'Cancelled' },
]

// ---------------------------------------------------------------------------
// Role groups (mirrors src/config/roles.js)
// ---------------------------------------------------------------------------
const ADMIN_ROLES = [
  'superadmin',
  'marketplace_admin',
  'vendor_admin',
  'warehouse_manager',
  'transport_manager',
  'customer_support',
  'finance_admin',
]
const WAREHOUSE_ROLES = ['warehouse', 'warehouse_manager']
const LOGISTICS_ROLES = ['logistics_company', 'transport_manager']
const FINANCE_ROLES = ['finance_admin', 'superadmin', 'marketplace_admin']
const SELLER_ROLES = ['seller', 'superadmin', 'marketplace_admin']
const BUYER_ROLES = ['customer', 'superadmin', 'marketplace_admin', 'customer_support']

const TERMINAL_STATUSES = ['completed', 'refunded', 'cancelled', 'payment_rejected']

// ---------------------------------------------------------------------------
// Action -> transition table
// ---------------------------------------------------------------------------
// `to: null`  => metadata-only action (no order.status change, still audited).
// `to: 'target'` => the target status comes from body.target_status.
// `from: ['*']` => allowed from any non-terminal state.
const ACTIONS = {
  // Buyer
  submit_order: { to: 'pending_payment', from: ['draft', 'pending'], roles: ['customer'], label: 'Submit Order' },
  mark_payment_submitted: {
    to: 'buyer_marked_paid',
    from: ['pending_payment', 'pending', 'payment_rejected'],
    roles: ['customer'],
    label: 'Mark Payment Submitted',
    requires: ['payment_reference'],
    set: { payment_status: 'pending' },
  },
  cancel_order: { to: 'cancelled', from: ['pending_payment', 'pending', 'buyer_marked_paid'], roles: ['customer'], label: 'Cancel Order', requires: ['reason'] },
  buyer_confirm_delivery: { to: 'buyer_confirmation', from: ['delivered'], roles: ['customer'], label: 'Confirm Delivery' },
  complete_order: { to: 'completed', from: ['buyer_confirmation', 'delivered'], roles: ['customer', 'superadmin', 'marketplace_admin', 'customer_support'], label: 'Complete Order' },
  retry_payment: { to: 'pending_payment', from: ['payment_rejected'], roles: ['customer'], label: 'Retry Payment' },
  raise_dispute: {
    to: 'disputed',
    from: [
      'buyer_marked_paid', 'paid', 'processing',
      'ready_for_delivery', 'out_for_delivery',
      'in_transit', 'delivered', 'buyer_confirmation',
    ],
    roles: ['customer'],
    label: 'Raise Dispute',
    requires: ['reason'],
    set: { payment_status: 'disputed' },
  },
  // Seller
  confirm_payment: {
    to: 'paid',
    from: ['buyer_marked_paid'],
    roles: ['seller'],
    label: 'Confirm Payment',
    set: { payment_status: 'completed' },
  },
  reject_payment: {
    to: 'payment_rejected',
    from: ['buyer_marked_paid'],
    roles: ['seller'],
    label: 'Reject Payment',
    requires: ['reason'],
  },
  seller_accept: {
    to: 'seller_accepted',
    from: ['awaiting_seller_confirmation', 'processing'],
    roles: ['seller'],
    label: 'Accept Order',
  },
  seller_reject: { to: 'cancelled', from: ['awaiting_seller_confirmation', 'seller_accepted', 'paid'], roles: ['seller'], label: 'Reject Order', requires: ['reason'] },
  seller_prepare: { to: 'processing', from: ['paid', 'seller_accepted'], roles: ['seller'], label: 'Prepare' },
  attach_quality_documents: { to: null, from: ['quality_inspection', 'processing'], roles: ['seller'], label: 'Attach Quality Documents', requires: ['quality_document_url'] },
  // Warehouse
  warehouse_receive: { to: 'quality_inspection', from: ['awaiting_warehouse_allocation', 'processing'], roles: ['warehouse', 'warehouse_manager'], label: 'Receive' },
  warehouse_inspect: { to: null, from: ['quality_inspection', 'processing'], roles: ['warehouse', 'warehouse_manager'], label: 'Inspect', requires: ['notes'] },
  warehouse_allocate: { to: 'ready_for_dispatch', from: ['quality_inspection', 'awaiting_warehouse_allocation'], roles: ['warehouse', 'warehouse_manager'], label: 'Allocate' },
  warehouse_release: { to: null, from: ['ready_for_dispatch'], roles: ['warehouse', 'warehouse_manager'], label: 'Release' },
  // Logistics / Admin
  assign_logistics: { to: 'assigned_to_logistics', from: ['ready_for_dispatch', 'processing'], roles: ['transport_manager', 'superadmin', 'marketplace_admin', 'customer_support'], label: 'Assign Logistics', requires: ['provider_id'] },
  logistics_accept: { to: 'in_transit', from: ['assigned_to_logistics'], roles: ['logistics_company', 'transport_manager', 'superadmin'], label: 'Accept Delivery' },
  update_location: { to: null, from: ['in_transit'], roles: ['logistics_company', 'transport_manager', 'superadmin'], label: 'Update Location', requires: ['location'] },
  submit_pod: { to: 'delivered', from: ['in_transit'], roles: ['logistics_company', 'transport_manager', 'superadmin'], label: 'Submit Proof of Delivery', requires: ['proof_of_delivery_url'] },
  // Admin
  admin_intervene: { to: 'target', from: ['*'], roles: ['superadmin', 'marketplace_admin', 'customer_support'], label: 'Intervene', requires: ['target_status'] },
  freeze_order: { to: null, from: ['*'], roles: ['superadmin', 'marketplace_admin', 'customer_support'], label: 'Freeze Order' },
  unfreeze_order: { to: null, from: ['*'], roles: ['superadmin', 'marketplace_admin', 'customer_support'], label: 'Unfreeze Order' },
  // Finance
  approve_refund: { to: 'refunded', from: ['disputed', 'payment_rejected'], roles: ['finance_admin', 'superadmin', 'marketplace_admin'], label: 'Approve Refund', requires: ['refund_amount'], set: { payment_status: 'refunded' } },
  approve_payout: { to: null, from: ['completed'], roles: ['finance_admin', 'superadmin'], label: 'Approve Payout' },
}

// Statuses the buyer can cancel / dispute / confirm — derived from the table above.
const ACTIVE_STATUSES = ORDER_STATUSES.filter((s) => !TERMINAL_STATUSES.includes(s) && !s.startsWith('pending'))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAdmin(user) {
  return user && ADMIN_ROLES.includes(user.role)
}

function normalizeStatus(status) {
  return STATUS_NORMALIZE[status] || status
}

function isFromAllowed(currentStatus, fromList) {
  if (!fromList) return true
  if (fromList.includes('*')) return true
  if (fromList.includes(currentStatus)) return true
  // Allow legacy aliases for the same logical stage.
  const canonical = normalizeStatus(currentStatus)
  if (fromList.includes(canonical) && canonical !== currentStatus) return true
  return false
}

function validateRequires(action, body) {
  if (!action.requires) return
  for (const field of action.requires) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      throw { status: 400, message: `Missing required field: ${field}` }
    }
  }
}

function assertActionAllowed(currentStatus, actionName, user) {
  const action = ACTIONS[actionName]
  if (!action) throw { status: 400, message: 'Invalid action' }
  const normalized = normalizeStatus(currentStatus)
  // payment_rejected is terminal but can be recovered via retry_payment.
  if (TERMINAL_STATUSES.includes(normalized) && action.to && !['admin_intervene', 'freeze_order', 'unfreeze_order', 'retry_payment', 'approve_refund'].includes(actionName)) {
    throw { status: 409, message: `Order is ${currentStatus} and cannot transition further` }
  }
  if (!isFromAllowed(currentStatus, action.from)) {
    throw { status: 409, message: `Action ${action.label} is not allowed in status ${currentStatus}` }
  }
}

async function validatePermission(pool, auth, order, actionName, body) {
  const action = ACTIONS[actionName]
  const allowedByRole = action.roles.includes(auth.role) || ADMIN_ROLES.includes(auth.role)
  if (!allowedByRole) {
    throw { status: 403, message: 'You do not have permission to perform this action' }
  }

  // Ownership / assignment checks for non-admin actors.
  if (!isAdmin(auth)) {
    if (auth.role === 'customer' && BUYER_ROLES.includes(auth.role)) {
      if (Number(order.customer_id) !== Number(auth.customerId)) {
        throw { status: 403, message: 'You do not own this order' }
      }
    }
    if (SELLER_ROLES.includes(auth.role)) {
      if (!await isSellerOfOrder(pool, order.id, auth.customerId)) {
        throw { status: 403, message: 'You are not a seller of this order' }
      }
    }
    if (WAREHOUSE_ROLES.includes(auth.role) && auth.role !== 'warehouse_manager') {
      if (!order.assigned_warehouse_id && !body.warehouse_id) {
        throw { status: 403, message: 'You are not assigned to this order' }
      }
    }
    if (LOGISTICS_ROLES.includes(auth.role) && auth.role !== 'transport_manager') {
      if (!order.assigned_logistics_provider_id) {
        throw { status: 403, message: 'You are not assigned to this order' }
      }
    }
  }
  return true
}

async function isSellerOfOrder(pool, orderId, sellerId) {
  const [[row]] = await pool.query(
    `SELECT 1 FROM order_items oi JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ? AND (oi.seller_id = ? OR p.seller_id = ?) LIMIT 1`,
    [orderId, sellerId, sellerId]
  )
  if (row) return true
  const [[f]] = await pool.query(
    'SELECT 1 FROM order_fulfillments WHERE parent_order_id = ? AND seller_id = ? LIMIT 1',
    [orderId, sellerId]
  )
  return !!f
}

async function isWarehouseOwner(pool, order, userId) {
  if (!order.assigned_warehouse_id) return false
  const [[w]] = await pool.query('SELECT owner_id FROM warehouse_services WHERE id = ?', [order.assigned_warehouse_id])
  if (!w) return false
  return Number(w.owner_id) === Number(userId)
}

async function isLogisticsOwner(pool, order, userId) {
  if (!order.assigned_logistics_provider_id) return false
  const [[p]] = await pool.query('SELECT owner_id FROM transport_providers WHERE id = ?', [order.assigned_logistics_provider_id])
  if (!p) return false
  return Number(p.owner_id) === Number(userId)
}

async function resolveOrder(pool, id) {
  const [rows] = await pool.query('SELECT * FROM orders WHERE id = ? OR order_number = ?', [id, id])
  if (!rows.length) throw { status: 404, message: 'Order not found' }
  return rows[0]
}

async function getOrderSellers(pool, orderId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT seller_id FROM order_items WHERE order_id = ?
     UNION
     SELECT DISTINCT seller_id FROM order_fulfillments WHERE parent_order_id = ?`,
    [orderId, orderId]
  )
  return rows.map((r) => r.seller_id).filter(Boolean)
}

async function getRoleRecipients(pool, roles) {
  const placeholders = roles.map(() => '?').join(',')
  const [rows] = await pool.query(
    `SELECT DISTINCT id FROM customers WHERE role IN (${placeholders})`,
    roles
  )
  return rows.map((r) => r.id)
}

function stageIndex(status) {
  const idx = STAGES.findIndex((s) => s.status === status)
  if (idx === -1) {
    // legacy alias position
    const norm = normalizeStatus(status)
    return STAGES.findIndex((s) => s.status === norm)
  }
  return idx
}

// ---------------------------------------------------------------------------
// Audit / notification / realtime
// ---------------------------------------------------------------------------

async function recordEvent(pool, conn, orderId, event) {
  return recordEventInternal(conn, orderId, event)
}

async function recordEventInternal(conn, orderId, event) {
  const {
    action,
    status,
    previousStatus,
    actorId,
    actorRole,
    location = null,
    notes = null,
    metadata = null,
  } = event
  const [result] = await conn.query(
    `INSERT INTO order_tracking
       (order_id, status, location, notes, updated_by, created_at,
        actor_role, action, previous_status, metadata)
     VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)`,
    [orderId, status, location, notes, actorId, actorRole, action, previousStatus, metadata ? JSON.stringify(metadata) : null]
  )
  return result.insertId
}

async function notifyRecipients(pool, orderId, currentStatus, actionName, actor) {
  const [orderRows] = await pool.query(
    'SELECT id, order_number, customer_id, status FROM orders WHERE id = ?',
    [orderId]
  )
  if (!orderRows.length) return
  const order = orderRows[0]
  const label = STATUS_LABELS[currentStatus] || currentStatus
  const recipientIds = new Set()

  // Always notify the buyer.
  if (order.customer_id) recipientIds.add(order.customer_id)

  const sellers = await getOrderSellers(pool, orderId)
  const importantActions = [
    'seller_accept', 'seller_reject', 'submit_order', 'mark_payment_submitted',
    'confirm_payment', 'reject_payment', 'retry_payment', 'cancel_order',
    'warehouse_receive', 'warehouse_inspect', 'warehouse_allocate', 'warehouse_release',
    'assign_logistics', 'logistics_accept', 'submit_pod', 'buyer_confirm_delivery',
    'complete_order', 'raise_dispute', 'admin_intervene', 'approve_refund', 'approve_payout',
    'freeze_order', 'unfreeze_order', 'fulfillment_update', 'status_update',
  ]
  const important = importantActions.includes(actionName)

  if (important) {
    sellers.forEach((s) => recipientIds.add(s))
  }

  if (actionName === 'assign_logistics' && actor && actor.providerId) {
    const [[p]] = await pool.query('SELECT owner_id FROM transport_providers WHERE id = ?', [actor.providerId])
    if (p && p.owner_id) recipientIds.add(p.owner_id)
  }

  if (['raise_dispute', 'approve_refund', 'admin_intervene', 'complete_order'].includes(actionName)) {
    const admins = await getRoleRecipients(pool, ['superadmin', 'marketplace_admin', 'customer_support'])
    admins.forEach((a) => recipientIds.add(a))
  }

  if (actionName === 'approve_refund') {
    const finance = await getRoleRecipients(pool, FINANCE_ROLES)
    finance.forEach((f) => recipientIds.add(f))
  }

  if (actionName === 'approve_payout') {
    const finance = await getRoleRecipients(pool, FINANCE_ROLES)
    finance.forEach((f) => recipientIds.add(f))
  }

  const insertRows = []
  for (const recipientId of recipientIds) {
    if (!recipientId) continue
    let message = ''
    if (actionName === 'raise_dispute') message = `A dispute was raised on order #${order.order_number}.`
    else if (actionName === 'approve_refund') message = `Refund approved for order #${order.order_number}.`
    else if (actionName === 'approve_payout') message = `Payout approved for order #${order.order_number}.`
    else if (actionName === 'freeze_order') message = `Order #${order.order_number} has been frozen.`
    else if (actionName === 'unfreeze_order') message = `Order #${order.order_number} has been unfrozen.`
    else if (actionName === 'complete_order') message = `Order #${order.order_number} has been completed.`
    else if (actionName === 'submit_pod') message = `Proof of delivery submitted for order #${order.order_number}.`
    else if (actionName === 'confirm_payment') message = `Payment confirmed for order #${order.order_number}.`
    else if (actionName === 'reject_payment') message = `Payment was rejected for order #${order.order_number}. Please retry or contact support.`
    else if (actionName === 'mark_payment_submitted') message = `Buyer has submitted payment for order #${order.order_number}.`
    else message = `Order #${order.order_number} status updated to ${label}.`

    insertRows.push([
      recipientId,
      `Order #${order.order_number}`,
      message,
      'order',
      0,
      JSON.stringify({ order_id: orderId, action: actionName, status: currentStatus }),
    ])
  }

  for (const [customer_id, title, message, type, is_read, data] of insertRows) {
    await pool.query(
      'INSERT INTO notifications (customer_id, title, message, type, is_read, data) VALUES (?, ?, ?, ?, ?, ?)',
      [customer_id, title, message, type, is_read, data]
    )
  }

  // Broadcast via SSE to each recipient + the buyer's order channel.
  for (const recipientId of recipientIds) {
    if (!recipientId) continue
    realtime.publishNotifications(recipientId, {
      type: 'order_update',
      action: actionName,
      order_id: orderId,
      order_number: order.order_number,
      status: currentStatus,
    })
  }
  realtime.publishOrders(order.customer_id, {
    order_id: orderId,
    order_number: order.order_number,
    status: currentStatus,
    action: actionName,
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function performTransition(pool, auth, body) {
  const { action: actionName, order_id: orderId } = body
  let conn
  try {
    conn = await pool.getConnection()
    await conn.beginTransaction()

    const order = await resolveOrder(pool, orderId)
    assertActionAllowed(order.status, actionName, auth)
    await validatePermission(pool, auth, order, actionName, body)

    if (order.frozen && !['freeze_order', 'unfreeze_order', 'admin_intervene'].includes(actionName) && !isAdmin(auth)) {
      throw { status: 409, message: 'Order is frozen and cannot be changed' }
    }

    const action = ACTIONS[actionName]
    const previousStatus = order.status
    let toStatus = action.to

    if (toStatus === 'target') {
      toStatus = body.target_status
      // admin_intervene can set any valid status (including terminal).
      if (!ORDER_STATUSES.includes(toStatus)) throw { status: 400, message: `Invalid target status: ${toStatus}` }
    }

    const metadata = {
      actor_id: auth.customerId,
      actor_role: auth.role,
      location: body.location || null,
      proof_of_delivery_url: body.proof_of_delivery_url || null,
      quality_document_url: body.quality_document_url || null,
      tracking_number: body.tracking_number || null,
      notes: body.notes || null,
      provider_id: body.provider_id || null,
      warehouse_id: body.warehouse_id || null,
      reason: body.reason || null,
      refund_amount: body.refund_amount || null,
      payment_reference: body.payment_reference || null,
    }

    // Record the audit event.
    await recordEvent(pool, conn, order.id, {
      action: actionName,
      status: toStatus || previousStatus,
      previousStatus,
      actorId: auth.customerId,
      actorRole: auth.role,
      location: body.location || null,
      notes: body.notes || null,
      metadata,
    })

    // Build the order row update.
    const setClauses = []
    const setValues = []
    if (toStatus) {
      setClauses.push('status = ?')
      setValues.push(toStatus)
    }
    if (action.set) {
      for (const [k, v] of Object.entries(action.set)) {
        setClauses.push(`${k} = ?`)
        setValues.push(v)
      }
    }
    if (actionName === 'assign_logistics' && body.provider_id) {
      setClauses.push('assigned_logistics_provider_id = ?')
      setValues.push(body.provider_id)
    }
    if (actionName === 'warehouse_receive' && body.warehouse_id) {
      setClauses.push('assigned_warehouse_id = ?')
      setValues.push(body.warehouse_id)
    }
    if (body.quality_document_url) {
      setClauses.push('quality_document_url = ?')
      setValues.push(body.quality_document_url)
    }
    if (body.proof_of_delivery_url) {
      setClauses.push('proof_of_delivery_url = ?')
      setValues.push(body.proof_of_delivery_url)
    }
    if (body.refund_amount !== undefined && body.refund_amount !== null) {
      setClauses.push('refund_amount = ?')
      setValues.push(body.refund_amount)
    }
    if (actionName === 'mark_payment_submitted' && body.payment_reference) {
      setClauses.push('payment_reference = ?')
      setValues.push(body.payment_reference)
    }
    if (actionName === 'approve_payout') {
      setClauses.push('payout_status = ?')
      setValues.push('paid')
    }
    setClauses.push('lifecycle_version = lifecycle_version + 1')
    setValues.push(order.id)
    await conn.query(`UPDATE orders SET ${setClauses.map((c) => c).join(', ')} WHERE id = ?`, setValues)

    await conn.commit()

    // Notifications (outside the transaction to avoid holding the lock long).
    await notifyRecipients(pool, order.id, toStatus || order.status, actionName, { providerId: body.provider_id })

    return {
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      from: previousStatus,
      to: toStatus || previousStatus,
      action: actionName,
      frozen: order.frozen,
      message: `Order ${action.label}`,
    }
  } catch (err) {
    if (conn) { try { await conn.rollback() } catch (_) {} }
    throw err
  } finally {
    if (conn) conn.release()
  }
}

async function recordSimpleEvent(pool, orderId, event) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const id = await recordEventInternal(conn, orderId, event)
    await conn.commit()
    return id
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

async function recordFulfillmentEvent(pool, orderId, fulfillmentStatus, actor, extra = {}) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await recordEvent(pool, conn, orderId, {
      action: 'fulfillment_update',
      status: fulfillmentStatus,
      previousStatus: fulfillmentStatus,
      actorId: actor.id,
      actorRole: actor.role,
      notes: extra.notes || null,
      metadata: { fulfillment_id: extra.fulfillment_id, tracking_number: extra.tracking_number, source: 'fulfillment' },
    })
    await conn.commit()
    await notifyRecipients(pool, orderId, fulfillmentStatus, 'fulfillment_update', { providerId: null })
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

async function recordLegacyStatusUpdate(pool, auth, body) {
  // Used by the legacy PUT /orders.php and superadmin order endpoint so that
  // *every* status change (even legacy ones) creates an audit event.
  const { order_id, status, payment_status, notes } = body
  let conn
  try {
    conn = await pool.getConnection()
    await conn.beginTransaction()
    const order = await resolveOrder(pool, order_id)
    if (Number(order.customer_id) !== Number(auth.customerId) && !isAdmin(auth)) {
      throw { status: 403, message: 'Not authorized' }
    }
    const previousStatus = order.status
    const setClauses = []
    const setValues = []
    if (status) {
      setClauses.push('status = ?')
      setValues.push(status)
    }
    if (payment_status) {
      setClauses.push('payment_status = ?')
      setValues.push(payment_status)
    }
    if (setClauses.length) {
      setClauses.push('lifecycle_version = lifecycle_version + 1')
      setValues.push(order.id)
      await conn.query(`UPDATE orders SET ${setClauses.join(', ')} WHERE id = ?`, setValues)
    }
    await recordEvent(pool, conn, order.id, {
      action: 'status_update',
      status: status || payment_status || previousStatus,
      previousStatus,
      actorId: auth.customerId,
      actorRole: auth.role,
      notes: notes || null,
      metadata: { source: 'legacy', payment_status: payment_status || null },
    })
    await conn.commit()
    await notifyRecipients(pool, order.id, status || order.status, 'status_update', {})
    return { success: true, order_id: order.id, from: previousStatus, to: status || previousStatus }
  } catch (err) {
    if (conn) { try { await conn.rollback() } catch (_) {} }
    throw err
  } finally {
    if (conn) conn.release()
  }
}

async function getOrderWithTimeline(pool, auth, id) {
  const order = await resolveOrder(pool, id)
  const [items] = await pool.query(
    `SELECT oi.id, oi.product_id, oi.quantity, oi.unit_price, oi.total_price,
            oi.seller_id, p.name AS name, p.image_url AS image_url
     FROM order_items oi JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ?`,
    [order.id]
  )
  order.items = items

  const [fulfillments] = await pool.query(
    `SELECT f.*, c.full_name AS seller_name
     FROM order_fulfillments f JOIN customers c ON c.id = f.seller_id
     WHERE f.parent_order_id = ? ORDER BY f.created_at ASC`,
    [order.id]
  )
  order.fulfillments = fulfillments

  const [timeline] = await pool.query(
    `SELECT id, order_id, status, location, notes, updated_by, actor_role, action,
            previous_status, metadata, created_at
     FROM order_tracking WHERE order_id = ? ORDER BY created_at ASC`,
    [order.id]
  )

  const allowedActions = await getAllowedActionsForOrder(pool, auth, order)
  return { success: true, order, timeline, allowed_actions: allowedActions }
}

async function getAllowedActionsForOrder(pool, auth, order) {
  const actions = []
  const normalized = normalizeStatus(order.status)
  const isAdminActor = isAdmin(auth)

  // Ownership booleans for non-admins.
  let isBuyer = false, isSeller = false
  if (Number(order.customer_id) === Number(auth.customerId)) isBuyer = true
  if (!isAdminActor && SELLER_ROLES.includes(auth.role)) {
    isSeller = await isSellerOfOrder(pool, order.id, auth.customerId)
  }

  for (const [name, action] of Object.entries(ACTIONS)) {
    // Freeze: only admin/unfreeze allowed on frozen orders.
    if (order.frozen && !['unfreeze_order', 'admin_intervene'].includes(name)) continue
    if (name === 'freeze_order' && !order.frozen) {
      // allow freeze only in active states
      if (TERMINAL_STATUSES.includes(normalized)) continue
    }

    let roleOk = action.roles.includes(auth.role) || isAdminActor
    if (!roleOk) continue

    // Role ownership constraints.
    if (auth.role === 'customer' && !isBuyer) continue
    if (SELLER_ROLES.includes(auth.role) && !isAdminActor && !isSeller) continue
    if ((WAREHOUSE_ROLES.includes(auth.role) || LOGISTICS_ROLES.includes(auth.role)) && !isAdminActor) {
      // Warehouse/logistics actors need an assignment unless they are a manager/admin.
      if (!order.assigned_warehouse_id && WAREHOUSE_ROLES.includes(auth.role) && auth.role !== 'warehouse_manager') continue
      if (!order.assigned_logistics_provider_id && LOGISTICS_ROLES.includes(auth.role) && auth.role !== 'transport_manager') continue
    }

    if (isFromAllowed(order.status, action.from) && !isActionInFrozenLock(order, name, auth)) {
      actions.push({ action: name, label: action.label, roles: action.roles })
    }
  }
  return actions
}

function isActionInFrozenLock(order, name, auth) {
  if (!order.frozen) return false
  return !['unfreeze_order', 'admin_intervene'].includes(name) || !isAdmin(auth)
}

async function getAllowedActions(pool, auth, id) {
  const order = await resolveOrder(pool, id)
  return { success: true, status: order.status, allowed_actions: await getAllowedActionsForOrder(pool, auth, order) }
}

function STATUS_CONFIG() {
  return STAGES.map((s) => ({ status: s.status, label: STATUS_LABELS[s.status] || s.label }))
}

module.exports = (pool) => ({
  pool,
  ORDER_STATUSES,
  STATUS_LABELS,
  STAGES,
  ACTIONS,
  TERMINAL_STATUSES,
  STATUS_CONFIG,
  normalizeStatus,
  isFromAllowed,
  performTransition,
  recordEvent,
  recordSimpleEvent,
  recordFulfillmentEvent,
  recordLegacyStatusUpdate,
  getOrderWithTimeline,
  getAllowedActions,
})
