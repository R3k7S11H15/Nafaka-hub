import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const svc = require('../services/orderLifecycle')({})

describe('orderLifecycle STAGES', () => {
  it('exposes the full lifecycle in the requested order', () => {
    const statuses = svc.STAGES.map((s) => s.status)
    expect(statuses).toEqual([
      'draft', 'pending_payment', 'buyer_marked_paid', 'paid', 'payment_rejected',
      'processing', 'ready_for_delivery', 'out_for_delivery', 'delivered',
      'completed', 'disputed', 'refunded', 'cancelled',
    ])
  })
})

describe('orderLifecycle actions', () => {
  it('defines role-specific actions', () => {
    expect(svc.ACTIONS.mark_payment_submitted.roles).toContain('customer')
    expect(svc.ACTIONS.confirm_payment.roles).toContain('seller')
    expect(svc.ACTIONS.warehouse_receive.roles).toContain('warehouse')
    expect(svc.ACTIONS.assign_logistics.roles).toContain('transport_manager')
    expect(svc.ACTIONS.logistics_accept.roles).toContain('logistics_company')
    expect(svc.ACTIONS.freeze_order.roles).toContain('superadmin')
    expect(svc.ACTIONS.approve_refund.roles).toContain('finance_admin')
  })

  it('only allows mark_payment_submitted from pending_payment/pending/payment_rejected', () => {
    expect(svc.isFromAllowed('pending_payment', svc.ACTIONS.mark_payment_submitted.from)).toBe(true)
    expect(svc.isFromAllowed('pending', svc.ACTIONS.mark_payment_submitted.from)).toBe(true)
    expect(svc.isFromAllowed('payment_rejected', svc.ACTIONS.mark_payment_submitted.from)).toBe(true)
    expect(svc.isFromAllowed('in_transit', svc.ACTIONS.mark_payment_submitted.from)).toBe(false)
  })
})
