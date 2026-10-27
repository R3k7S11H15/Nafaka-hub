const express = require('express')
const { validateRequired } = require('../middleware/validation')
const { requireAuth, extractAuthUser } = require('../middleware/auth')
const { requireRole } = require('../middleware/roleCheck')
const realtime = require('../services/realtime')

module.exports = (pool) => {
  const router = express.Router()

  // ============ HELPERS ============
  function generateRequestNumber() {
    return 'BP' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  }

  function generateContractNumber() {
    return 'CON' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  }

  async function logActivity(pool, requestId, contractId, memberId, action, entityType, entityId, details, ipAddress) {
    try {
      await pool.query(
        `INSERT INTO bulk_procurement_activity
         (request_id, contract_id, member_id, action, entity_type, entity_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [requestId, contractId, memberId, action, entityType, entityId, details, ipAddress]
      )
    } catch (err) {
      console.error('Activity log error:', err.message)
    }
  }

  async function recalculateAllocatedQuantity(pool, requestId) {
    const [[result]] = await pool.query(
      `SELECT COALESCE(SUM(committed_quantity), 0) as total_committed,
              COALESCE(SUM(contributed_quantity), 0) as total_contributed
       FROM bulk_procurement_members
       WHERE request_id = ? AND status = 'committed'`,
      [requestId]
    )
    const totalAllocated = parseFloat(result.total_committed) || parseFloat(result.total_contributed) || 0
    await pool.query(
      'UPDATE bulk_procurement_requests SET allocated_quantity = ?, updated_at = NOW() WHERE id = ?',
      [totalAllocated, requestId]
    )
    return totalAllocated
  }

  async function updateRequestStatus(pool, requestId) {
    // Recalculate allocated quantity from committed members
    await recalculateAllocatedQuantity(pool, requestId)

    const [[req]] = await pool.query(
      'SELECT required_quantity, allocated_quantity, status FROM bulk_procurement_requests WHERE id = ?',
      [requestId]
    )
    if (!req) return null

    const remaining = parseFloat(req.required_quantity) - parseFloat(req.allocated_quantity)
    let newStatus = req.status

    if (remaining <= 0) {
      newStatus = 'fully_allocated'
    } else if (parseFloat(req.allocated_quantity) > 0) {
      newStatus = 'partially_filled'
    } else if (req.status === 'open' && remaining > 0) {
      newStatus = 'open'
    }

    if (newStatus !== req.status) {
      await pool.query(
        'UPDATE bulk_procurement_requests SET status = ?, updated_at = NOW() WHERE id = ?',
        [newStatus, requestId]
      )
      return newStatus
    }
    return null
  }

  // ============ CREATE BULK PROCUREMENT REQUEST ============
  router.post('/', requireAuth, validateRequired(['action']), async (req, res, next) => {
    try {
      const { action } = req.body
      const auth = extractAuthUser(req)

      if (action === 'create_request') {
        const {
          product_type,
          required_quantity,
          quality_grade,
          delivery_location,
          delivery_date,
          max_price_per_unit,
          fulfillment_mode,
          notes,
          warehouse_id
        } = req.body

        if (!product_type || !required_quantity || !delivery_location || !delivery_date) {
          return res.json({ success: false, message: 'Missing required fields' })
        }

        if (parseFloat(required_quantity) <= 0) {
          return res.json({ success: false, message: 'Quantity must be greater than 0' })
        }

        const requestNumber = generateRequestNumber()
        const deliveryDate = delivery_date

        const [result] = await pool.query(
          `INSERT INTO bulk_procurement_requests
           (request_number, buyer_id, product_type, required_quantity, allocated_quantity,
            quality_grade, delivery_location, delivery_date, max_price_per_unit,
            fulfillment_mode, notes, warehouse_id, status)
           VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 'open')`,
          [
            requestNumber, auth.customerId, product_type.trim(),
            parseFloat(required_quantity), quality_grade || null,
            delivery_location.trim(), deliveryDate,
            max_price_per_unit ? parseFloat(max_price_per_unit) : null,
            fulfillment_mode || 'seller_supply_group',
            notes || null, warehouse_id || null
          ]
        )

        await logActivity(pool, result.insertId, null, auth.customerId, 'request_created', 'request', result.insertId,
          `Created bulk procurement request for ${required_quantity} of ${product_type}`, req.ip)

        if (realtime && realtime.publish) {
          realtime.publish('bulk_procurement:request_created', { type: 'request_created', requestId: result.insertId, requestNumber })
        }

        return res.json({
          success: true,
          message: 'Bulk procurement request created',
          request: { id: result.insertId, request_number: requestNumber, status: 'open' }
        })
      }

      res.json({ success: false, message: 'Invalid action' })
    } catch (err) {
      next(err)
    }
  })

  // ============ LIST / GET REQUESTS ============
  router.get('/', async (req, res, next) => {
    try {
      const { action, id, buyer_id, seller_id, status, mode, search, limit, offset } = req.query
      const auth = extractAuthUser(req)

      if (action === 'list_requests' || !action) {
        let sql = `
          SELECT r.*, c.full_name as buyer_name,
                 (SELECT COUNT(*) FROM bulk_procurement_members WHERE request_id = r.id AND status = 'committed') as member_count,
                 (SELECT COUNT(*) FROM bulk_procurement_members WHERE request_id = r.id) as total_members
          FROM bulk_procurement_requests r
          JOIN customers c ON r.buyer_id = c.id
          WHERE 1=1`
        const params = []

        if (status) { sql += ' AND r.status = ?'; params.push(status) }
        if (mode) { sql += ' AND r.fulfillment_mode = ?'; params.push(mode) }
        if (search) { sql += ' AND (r.product_type LIKE ? OR r.request_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }

        sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?'
        params.push(parseInt(limit) || 50, parseInt(offset) || 0)

        const [requests] = await pool.query(sql, params)
        return res.json({ success: true, requests })
      }

      if (action === 'get_request' && id) {
        const [requests] = await pool.query(
          `SELECT r.*, c.full_name as buyer_name, c.email as buyer_email, c.phone as buyer_phone
           FROM bulk_procurement_requests r
           JOIN customers c ON r.buyer_id = c.id
           WHERE r.id = ?`,
          [id]
        )
        if (requests.length === 0) {
          return res.json({ success: false, message: 'Request not found' })
        }

        const request = requests[0]

        // Get committed members
        const [members] = await pool.query(
          `SELECT m.*, c.full_name as member_name, c.email, c.phone, p.name as product_name
           FROM bulk_procurement_members m
           JOIN customers c ON m.member_id = c.id
           LEFT JOIN products p ON m.product_id = p.id
           WHERE m.request_id = ?
           ORDER BY m.created_at ASC`,
          [id]
        )
        request.members = members

        // Get contract if exists
        const [contracts] = await pool.query(
          'SELECT * FROM bulk_procurement_contracts WHERE request_id = ?',
          [id]
        )
        if (contracts.length > 0) request.contract = contracts[0]

        // Get activity log
        const [activity] = await pool.query(
          `SELECT a.*, c.full_name as actor_name
           FROM bulk_procurement_activity a
           LEFT JOIN customers c ON a.member_id = c.id
           WHERE a.request_id = ?
           ORDER BY a.created_at ASC`,
          [id]
        )
        request.activity = activity

        return res.json({ success: true, request })
      }

      if (action === 'my_requests' && auth) {
        const [requests] = await pool.query(
          `SELECT r.*,
                 (SELECT COUNT(*) FROM bulk_procurement_members WHERE request_id = r.id AND status = 'committed') as committed_sellers,
                 (SELECT COUNT(*) FROM bulk_procurement_members WHERE request_id = r.id) as total_members
           FROM bulk_procurement_requests r
           WHERE r.buyer_id = ?
           ORDER BY r.created_at DESC`,
          [auth.customerId]
        )
        return res.json({ success: true, requests })
      }

      if (action === 'my_groups' && auth) {
        const [groups] = await pool.query(
          `SELECT r.*, m.contributed_quantity, m.committed_quantity, m.status as member_status
           FROM bulk_procurement_requests r
           JOIN bulk_procurement_members m ON r.id = m.request_id
           WHERE m.member_id = ?
           ORDER BY r.created_at DESC`,
          [auth.customerId]
        )
        return res.json({ success: true, groups })
      }

      if (action === 'available_for_seller' && auth) {
        const [requests] = await pool.query(
          `SELECT r.*, c.full_name as buyer_name,
                 (SELECT COUNT(*) FROM bulk_procurement_members WHERE request_id = r.id AND status = 'committed') as committed_sellers,
                 (r.allocated_quantity / r.required_quantity * 100) as progress_percent
           FROM bulk_procurement_requests r
           JOIN customers c ON r.buyer_id = c.id
           WHERE r.status IN ('open', 'partially_filled')
             AND r.fulfillment_mode = 'seller_supply_group'
             AND (r.buyer_id != ? OR 1=1)
           ORDER BY r.created_at DESC
           LIMIT ? OFFSET ?`,
          [auth.customerId, parseInt(limit) || 50, parseInt(offset) || 0]
        )
        return res.json({ success: true, requests })
      }

      res.json({ success: false, message: 'Invalid action' })
    } catch (err) {
      next(err)
    }
  })

  // ============ GET REQUEST BY ID (alternative) ============
  router.get('/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const [requests] = await pool.query(
        `SELECT r.*, c.full_name as buyer_name, c.email as buyer_email, c.phone as buyer_phone
         FROM bulk_procurement_requests r
         JOIN customers c ON r.buyer_id = c.id
         WHERE r.id = ?`,
        [id]
      )
      if (requests.length === 0) {
        return res.json({ success: false, message: 'Request not found' })
      }

      const request = requests[0]

      const [members] = await pool.query(
        `SELECT m.*, c.full_name as member_name, c.email, c.phone, p.name as product_name
         FROM bulk_procurement_members m
         JOIN customers c ON m.member_id = c.id
         LEFT JOIN products p ON m.product_id = p.id
         WHERE m.request_id = ?
         ORDER BY m.created_at ASC`,
        [id]
      )
      request.members = members

      const [contracts] = await pool.query(
        'SELECT * FROM bulk_procurement_contracts WHERE request_id = ?',
        [id]
      )
      if (contracts.length > 0) request.contract = contracts[0]

      return res.json({ success: true, request })
    } catch (err) {
      next(err)
    }
  })

  // ============ JOIN / COMMIT TO REQUEST ============
  router.post('/:id/join', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params
      const auth = extractAuthUser(req)
      const {
        contributed_quantity,
        committed_quantity,
        unit_price,
        product_id,
        notes
      } = req.body

      if (!contributed_quantity || parseFloat(contributed_quantity) <= 0) {
        return res.json({ success: false, message: 'Contributed quantity is required and must be greater than 0' })
      }

      // Check if request exists and is open
      const [requests] = await pool.query(
        'SELECT status, allocated_quantity, required_quantity FROM bulk_procurement_requests WHERE id = ?',
        [id]
      )
      if (requests.length === 0) {
        return res.json({ success: false, message: 'Request not found' })
      }
      const request = requests[0]
      if (!['open', 'partially_filled'].includes(request.status)) {
        return res.json({ success: false, message: 'Request is not open for joining' })
      }

      // Check if member already joined
      const [existing] = await pool.query(
        'SELECT id, status FROM bulk_procurement_members WHERE request_id = ? AND member_id = ? AND member_role = "seller"',
        [id, auth.customerId]
      )

      const committedQty = committed_quantity || contributed_quantity
      const totalPrice = unit_price ? parseFloat(unit_price) * parseFloat(committedQty) : null

      if (existing.length > 0) {
        // Update existing commitment
        const [result] = await pool.query(
          `UPDATE bulk_procurement_members
           SET contributed_quantity = ?, committed_quantity = ?, unit_price = ?, total_price = ?,
             product_id = ?, notes = ?, status = 'committed', updated_at = NOW()
           WHERE id = ?`,
          [
            parseFloat(contributed_quantity), committedQty ? parseFloat(committedQty) : null,
            unit_price ? parseFloat(unit_price) : null, totalPrice,
            product_id || null, notes || null,
            existing[0].id
          ]
        )
        await logActivity(pool, parseInt(id), null, auth.customerId, 'commitment_updated', 'member', existing[0].id,
          `Updated commitment to ${contributed_quantity}`, req.ip)

        const newStatus = await updateRequestStatus(pool, id)
        if (newStatus === 'fully_allocated') {
          if (realtime && realtime.publish) {
            realtime.publish('bulk_procurement:group_filled', { type: 'group_filled', requestId: parseInt(id) })
          }
        }

        return res.json({ success: true, message: 'Commitment updated', memberId: existing[0].id, statusChanged: newStatus || null })
      } else {
        // Insert new member
        const [result] = await pool.query(
          `INSERT INTO bulk_procurement_members
           (request_id, member_id, member_role, contributed_quantity, committed_quantity, unit_price, total_price, product_id, status, notes)
           VALUES (?, ?, 'seller', ?, ?, ?, ?, ?, 'committed', ?)`,
          [
            id, auth.customerId, parseFloat(contributed_quantity),
            committedQty ? parseFloat(committedQty) : null,
            unit_price ? parseFloat(unit_price) : null, totalPrice,
            product_id || null, notes || null
          ]
        )

        // Recalculate allocated quantity from all committed members
        await recalculateAllocatedQuantity(pool, id)

        await logActivity(pool, parseInt(id), null, auth.customerId, 'seller_joined', 'member', result.insertId,
          `Joined with ${contributed_quantity} committed`, req.ip)

        // Check if we need to update status
        const newStatus = await updateRequestStatus(pool, id)
        if (newStatus === 'fully_allocated') {
          if (realtime && realtime.publish) {
            realtime.publish('bulk_procurement:group_filled', { type: 'group_filled', requestId: parseInt(id) })
          }
        }

        // Notify buyer
        if (realtime && realtime.publish) {
          realtime.publish('bulk_procurement:seller_joined', {
            type: 'seller_joined',
            requestId: parseInt(id),
            sellerId: auth.customerId,
            quantity: parseFloat(contributed_quantity)
          })
        }

        return res.json({
          success: true,
          message: 'Successfully joined the group',
          memberId: result.insertId,
          statusChanged: newStatus || null
        })
      }
    } catch (err) {
      next(err)
    }
  })

  // ============ JOIN BUYER GROUP (Model B) ============
  router.post('/:id/join_buyer', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params
      const auth = extractAuthUser(req)
      const { contributed_quantity, notes } = req.body

      if (!contributed_quantity || parseFloat(contributed_quantity) <= 0) {
        return res.json({ success: false, message: 'Required quantity is required and must be greater than 0' })
      }

      const [requests] = await pool.query(
        'SELECT status, allocated_quantity, required_quantity FROM bulk_procurement_requests WHERE id = ?',
        [id]
      )
      if (requests.length === 0) {
        return res.json({ success: false, message: 'Request not found' })
      }
      const request = requests[0]
      if (!['open', 'partially_filled'].includes(request.status)) {
        return res.json({ success: false, message: 'Request is not open for joining' })
      }

      const existing = await pool.query(
        'SELECT id, status FROM bulk_procurement_members WHERE request_id = ? AND member_id = ? AND member_role = "buyer"',
        [id, auth.customerId]
      )

      if (existing[0].length > 0) {
        await pool.query(
          `UPDATE bulk_procurement_members
           SET contributed_quantity = ?, notes = ?, updated_at = NOW()
           WHERE id = ?`,
          [parseFloat(contributed_quantity), notes || null, existing[0][0].id]
        )
        const buyerStatus = await updateRequestStatus(pool, id)
        return res.json({ success: true, message: 'Demand commitment updated', statusChanged: buyerStatus || null })
      }

      const [result] = await pool.query(
        `INSERT INTO bulk_procurement_members
         (request_id, member_id, member_role, contributed_quantity, status, notes)
         VALUES (?, ?, 'buyer', ?, 'committed', ?)`,
        [id, auth.customerId, parseFloat(contributed_quantity), notes || null]
      )

      // Recalculate allocated quantity from all committed members
      await recalculateAllocatedQuantity(pool, id)

      await logActivity(pool, parseInt(id), null, auth.customerId, 'buyer_joined', 'member', result.insertId,
        `Joined as buyer with ${contributed_quantity}`, req.ip)

      const newStatus = await updateRequestStatus(pool, id)

      return res.json({
        success: true,
        message: 'Successfully joined the buyer group',
        memberId: result.insertId,
        statusChanged: newStatus || null
      })
    } catch (err) {
      next(err)
    }
  })

  // ============ WITHDRAW FROM GROUP ============
  router.post('/members/:memberId/withdraw', requireAuth, async (req, res, next) => {
    try {
      const { memberId } = req.params
      const auth = extractAuthUser(req)

      const [members] = await pool.query(
        `SELECT m.*, r.status as request_status, r.id as request_id, r.allocated_quantity, r.required_quantity
         FROM bulk_procurement_members m
         JOIN bulk_procurement_requests r ON m.request_id = r.id
         WHERE m.id = ?`,
        [memberId]
      )
      if (members.length === 0) {
        return res.json({ success: false, message: 'Member commitment not found' })
      }
      const member = members[0]

      if (member.member_id !== auth.customerId) {
        return res.status(403).json({ success: false, message: 'Not authorized to withdraw this commitment' })
      }

      if (!['invited', 'pending', 'committed'].includes(member.status)) {
        return res.json({ success: false, message: 'Cannot withdraw - commitment is already in processing/completed stage' })
      }

      // Update member status and recalculate allocated quantity
      await pool.query(
        'UPDATE bulk_procurement_members SET status = "withdrawn", updated_at = NOW() WHERE id = ?',
        [memberId]
      )

      await recalculateAllocatedQuantity(pool, member.request_id)

      await logActivity(pool, member.request_id, null, auth.customerId, 'withdrawn', 'member', memberId,
        `Withdrew ${member.contributed_quantity}`, req.ip)

      const newStatus = await updateRequestStatus(pool, member.request_id)

      return res.json({
        success: true,
        message: 'Successfully withdrawn from the group',
        statusChanged: newStatus || null
      })
    } catch (err) {
      next(err)
    }
  })

  // ============ CONFIRM GROUP (create contract) ============
  router.post('/:id/confirm', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params
      const auth = extractAuthUser(req)

      const [requests] = await pool.query(
        'SELECT * FROM bulk_procurement_requests WHERE id = ?',
        [id]
      )
      if (requests.length === 0) {
        return res.json({ success: false, message: 'Request not found' })
      }
      const request = requests[0]

      if (request.buyer_id !== auth.customerId) {
        return res.status(403).json({ success: false, message: 'Only the buyer can confirm the group' })
      }

      if (request.status !== 'fully_allocated') {
        return res.json({ success: false, message: 'Group is not fully allocated yet' })
      }

      // Check if contract already exists
      const [existing] = await pool.query('SELECT id FROM bulk_procurement_contracts WHERE request_id = ?', [id])
      if (existing.length > 0) {
        return res.json({ success: false, message: 'Contract already created for this request' })
      }

      // Calculate totals from committed members
      const [members] = await pool.query(
        `SELECT SUM(committed_quantity) as total_qty, SUM(total_price) as total_amount
         FROM bulk_procurement_members
         WHERE request_id = ? AND status = 'committed'`,
        [id]
      )
      const totalQty = members[0].total_qty || parseFloat(request.required_quantity)
      const totalAmount = members[0].total_amount || 0
      const unitPrice = totalAmount > 0 ? totalAmount / totalQty : (request.max_price_per_unit || 0)

      const contractNumber = generateContractNumber()
      const [result] = await pool.query(
        `INSERT INTO bulk_procurement_contracts
         (contract_number, request_id, buyer_id, total_quantity, total_amount, unit_price,
          quality_standard, delivery_location, delivery_date, payment_terms,
          payment_deadline, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 DATE_ADD(?, INTERVAL 3 DAY), 'active')`,
        [
          contractNumber, id, request.buyer_id, totalQty, totalAmount, unitPrice,
          request.quality_grade || null, request.delivery_location, request.delivery_date,
          'Payment via escrow upon quality verification',
          request.delivery_date
        ]
      )

      // Update request status
      await pool.query(
        "UPDATE bulk_procurement_requests SET status = 'confirmed', contract_id = ?, updated_at = NOW() WHERE id = ?",
        [result.insertId, id]
      )

      await logActivity(pool, parseInt(id), result.insertId, auth.customerId, 'contract_created', 'contract', result.insertId,
        `Contract ${contractNumber} created`, req.ip)

      if (realtime && realtime.publish) {
        realtime.publish('bulk_procurement:contract_created', { type: 'contract_created', requestId: parseInt(id), contractId: result.insertId })
      }

      return res.json({
        success: true,
        message: 'Group confirmed, contract created',
        contract: { id: result.insertId, contract_number: contractNumber, status: 'active' }
      })
    } catch (err) {
      next(err)
    }
  })

  // ============ GET CONTRACT ============
  router.get('/contracts/:id', async (req, res, next) => {
    try {
      const { id } = req.params

      const [contracts] = await pool.query(
        `SELECT c.*, r.request_number, r.product_type, r.fulfillment_mode, c2.full_name as buyer_name
         FROM bulk_procurement_contracts c
         JOIN bulk_procurement_requests r ON c.request_id = r.id
         JOIN customers c2 ON c.buyer_id = c2.id
         WHERE c.id = ?`,
        [id]
      )
      if (contracts.length === 0) {
        return res.json({ success: false, message: 'Contract not found' })
      }
      const contract = contracts[0]

      // Get members
      const [members] = await pool.query(
        `SELECT m.*, c.full_name as seller_name, c.email, c.phone, p.name as product_name
         FROM bulk_procurement_members m
         JOIN customers c ON m.member_id = c.id
         LEFT JOIN products p ON m.product_id = p.id
         WHERE m.request_id = ? AND m.member_role = 'seller'
         ORDER BY m.created_at ASC`,
        [contract.request_id]
      )
      contract.members = members

      // Get payments
      const [payments] = await pool.query(
        'SELECT * FROM bulk_procurement_payments WHERE contract_id = ? ORDER BY created_at ASC',
        [id]
      )
      contract.payments = payments

      // Get inspections
      const [inspections] = await pool.query(
        `SELECT i.*, c.full_name as inspector_name
         FROM bulk_procurement_inspections i
         LEFT JOIN customers c ON i.inspector_id = c.id
         WHERE i.contract_id = ?
         ORDER BY i.created_at ASC`,
        [id]
      )
      contract.inspections = inspections

      // Get activity
      const [activity] = await pool.query(
        `SELECT a.*, c.full_name as actor_name
         FROM bulk_procurement_activity a
         LEFT JOIN customers c ON a.member_id = c.id
         WHERE a.contract_id = ?
         ORDER BY a.created_at ASC`,
        [id]
      )
      contract.activity = activity

      return res.json({ success: true, contract })
    } catch (err) {
      next(err)
    }
  })

  // ============ RECORD INSPECTION ============
  router.post('/contracts/:id/inspect', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params
      const auth = extractAuthUser(req)
      const {
        member_id,
        quantity_inspected,
        quantity_accepted,
        quantity_rejected,
        quality_grade,
        inspection_result,
        inspector_notes
      } = req.body

      // Verify contract exists
      const [contracts] = await pool.query('SELECT id FROM bulk_procurement_contracts WHERE id = ?', [id])
      if (contracts.length === 0) {
        return res.json({ success: false, message: 'Contract not found' })
      }

      const [result] = await pool.query(
        `INSERT INTO bulk_procurement_inspections
         (contract_id, member_id, quantity_inspected, quantity_accepted, quantity_rejected,
          quality_grade, inspection_result, inspector_id, inspector_notes, inspection_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
        [
          id, member_id || null, parseFloat(quantity_inspected), parseFloat(quantity_accepted || 0),
          parseFloat(quantity_rejected || 0), quality_grade || null,
          inspection_result || 'passed', auth.customerId, inspector_notes || null
        ]
      )

      await logActivity(pool, null, parseInt(id), auth.customerId, 'inspection_recorded', 'inspection', result.insertId,
        `Inspection: ${inspection_result || 'passed'} - ${quality_grade || 'N/A'}`, req.ip)

      // Create or update payment records for inspected member
      if (member_id && inspection_result === 'passed' && parseFloat(quantity_accepted) > 0) {
        // Calculate proportional payment from the member's contract commitment
        const [members] = await pool.query(
          'SELECT total_price, committed_quantity FROM bulk_procurement_members WHERE member_id = ? AND request_id = (SELECT request_id FROM bulk_procurement_contracts WHERE id = ?)',
          [member_id, id]
        )

        if (members.length > 0) {
          const member = members[0]
          const proportionalAmount = member.total_price
            ? parseFloat(member.total_price) * (parseFloat(quantity_accepted) / parseFloat(member.committed_quantity))
            : 0

          if (proportionalAmount > 0) {
            await pool.query(
              `INSERT INTO bulk_procurement_payments
               (contract_id, member_id, amount, payment_status)
               VALUES (?, ?, ?, 'held_in_escrow')`,
              [id, member_id, proportionalAmount]
            )
          }
        }
      }

      if (realtime && realtime.publish) {
        realtime.publish('bulk_procurement:inspection_recorded', { type: 'inspection_recorded', contractId: parseInt(id), member_id })
      }

      return res.json({
        success: true,
        message: 'Inspection recorded',
        inspectionId: result.insertId
      })
    } catch (err) {
      next(err)
    }
  })

  // ============ RELEASE PAYMENT ============
  router.post('/payments/:paymentId/release', requireAuth, async (req, res, next) => {
    try {
      const { paymentId } = req.params
      const auth = extractAuthUser(req)

      const [payments] = await pool.query(
        `SELECT p.*, c.buyer_id, m.member_id
         FROM bulk_procurement_payments p
         JOIN bulk_procurement_contracts c ON p.contract_id = c.id
         JOIN bulk_procurement_members m ON p.member_id = m.member_id AND p.contract_id = m.request_id
         WHERE p.id = ?`,
        [paymentId]
      )
      if (payments.length === 0) {
        return res.json({ success: false, message: 'Payment not found' })
      }
      const payment = payments[0]

      // Only buyer or admin can release
      if (payment.buyer_id !== auth.customerId && auth.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Not authorized' })
      }

      if (payment.payment_status !== 'held_in_escrow') {
        return res.json({ success: false, message: 'Payment is not in escrow' })
      }

      await pool.query(
        "UPDATE bulk_procurement_payments SET payment_status = 'released', released_at = NOW(), updated_at = NOW() WHERE id = ?",
        [paymentId]
      )

      await logActivity(pool, null, payment.contract_id, auth.customerId, 'payment_released', 'payment', paymentId,
        `Payment of ${payment.amount} released to seller`, req.ip)

      // Record revenue
      const commissionRate = 1.0 // 1% platform fee for bulk procurement
      const commissionAmount = parseFloat(payment.amount) * (commissionRate / 100)
      await pool.query(
        `INSERT INTO revenue_tracking (revenue_type, reference_id, reference_type, amount, customer_id, description, recorded_date)
         VALUES ('commission', ?, 'bulk_procurement_payment', ?, ?, ?, CURDATE())`,
        [paymentId, commissionAmount, payment.member_id, `Bulk procurement commission`]
      )

      if (realtime && realtime.publish) {
        realtime.publish('bulk_procurement:payment_released', { type: 'payment_released', paymentId, contractId: payment.contract_id })
      }

      return res.json({ success: true, message: 'Payment released to seller' })
    } catch (err) {
      next(err)
    }
  })

  // ============ UPDATE REQUEST ============
  router.put('/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params
      const auth = extractAuthUser(req)
      const { quality_grade, delivery_location, delivery_date, max_price_per_unit, notes, status } = req.body

      const [requests] = await pool.query('SELECT buyer_id, status FROM bulk_procurement_requests WHERE id = ?', [id])
      if (requests.length === 0) {
        return res.json({ success: false, message: 'Request not found' })
      }

      if (requests[0].buyer_id !== auth.customerId) {
        return res.status(403).json({ success: false, message: 'Not authorized' })
      }

      const updates = []
      const params = []
      if (quality_grade !== undefined) { updates.push('quality_grade = ?'); params.push(quality_grade || null) }
      if (delivery_location !== undefined) { updates.push('delivery_location = ?'); params.push(delivery_location) }
      if (delivery_date !== undefined) { updates.push('delivery_date = ?'); params.push(delivery_date) }
      if (max_price_per_unit !== undefined) { updates.push('max_price_per_unit = ?'); params.push(max_price_per_unit ? parseFloat(max_price_per_unit) : null) }
      if (notes !== undefined) { updates.push('notes = ?'); params.push(notes) }
      if (status !== undefined) { updates.push('status = ?'); params.push(status) }

      if (updates.length > 0) {
        params.push(id)
        await pool.query(
          `UPDATE bulk_procurement_requests SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
          params
        )

        await logActivity(pool, parseInt(id), null, auth.customerId, 'request_updated', 'request', id,
          `Updated: ${updates.join(', ')}`, req.ip)
      }

      return res.json({ success: true, message: 'Request updated' })
    } catch (err) {
      next(err)
    }
  })

  // ============ DELETE (CANCEL) REQUEST ============
  router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
      const { id } = req.params
      const auth = extractAuthUser(req)

      const [requests] = await pool.query('SELECT buyer_id, status FROM bulk_procurement_requests WHERE id = ?', [id])
      if (requests.length === 0) {
        return res.json({ success: false, message: 'Request not found' })
      }

      // Only buyer can cancel, and only if not in progress/completed
      if (requests[0].buyer_id !== auth.customerId && auth.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Not authorized' })
      }

      if (['completed', 'in_progress'].includes(requests[0].status)) {
        return res.json({ success: false, message: 'Cannot cancel - request is in progress or completed' })
      }

      await pool.query('DELETE FROM bulk_procurement_requests WHERE id = ?', [id])

      await logActivity(pool, parseInt(id), null, auth.customerId, 'request_cancelled', 'request', id,
        'Request cancelled by buyer', req.ip)

      return res.json({ success: true, message: 'Request cancelled' })
    } catch (err) {
      next(err)
    }
  })

  return router
}
