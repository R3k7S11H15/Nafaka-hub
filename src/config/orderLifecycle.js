/**
 * Shared order lifecycle configuration (frontend mirror of the backend service).
 *
 * The authoritive permission/transition logic lives on the backend: the
 * frontend only uses these definitions to render UI; every action is still
 * validated (role + state) on the server.
 *
 * New no-escrow direct buyer → seller payment flow:
 *   draft → pending_payment → buyer_marked_paid → paid → processing
 *   → ready_for_delivery → out_for_delivery → delivered → completed
 *   → disputed / refunded / cancelled / payment_rejected
 */

// The canonical ordered lifecycle statuses used to render the stepper/timeline.
export const LIFECYCLE_STAGES = [
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

// All statuses including legacy aliases.
export const ORDER_STATUSES = LIFECYCLE_STAGES.map((s) => s.status).concat([
  'pending',
  'confirmed',
  'shipped',
  'awaiting_seller_confirmation',
  'seller_accepted',
  'awaiting_warehouse_allocation',
  'quality_inspection',
  'ready_for_dispatch',
  'assigned_to_logistics',
  'buyer_confirmation',
])

// Map legacy/short statuses to their canonical lifecycle state.
export const STATUS_NORMALIZE = {
  pending: 'pending_payment',
  confirmed: 'pending_payment',
  processing: 'buyer_marked_paid',
  shipped: 'in_transit',
  buyer_confirmation: 'delivered',
}

export const STATUS_LABELS = Object.fromEntries(LIFECYCLE_STAGES.map((s) => [s.status, s.label]))

export const TERMINAL_STATUSES = ['completed', 'refunded', 'cancelled', 'payment_rejected', 'disputed']

// Action metadata used by the UI to render forms/button. `from: ['*']` means any active state.
export const ACTIONS = {
  submit_order: { label: 'Submit Order', to: 'pending_payment', from: ['draft', 'pending'], roles: ['customer'], requires: [] },
  mark_payment_submitted: { label: 'Mark Payment Submitted', to: 'buyer_marked_paid', from: ['pending_payment', 'pending', 'payment_rejected'], roles: ['customer'], requires: ['payment_reference'] },
  cancel_order: { label: 'Cancel Order', to: 'cancelled', from: ['pending_payment', 'pending', 'buyer_marked_paid'], roles: ['customer'], requires: ['reason'] },
  buyer_confirm_delivery: { label: 'Confirm Delivery', to: 'buyer_confirmation', from: ['delivered'], roles: ['customer'], requires: [] },
  complete_order: { label: 'Complete Order', to: 'completed', from: ['buyer_confirmation', 'delivered'], roles: ['customer', 'superadmin', 'marketplace_admin', 'customer_support'], requires: [] },
  retry_payment: { label: 'Retry Payment', to: 'pending_payment', from: ['payment_rejected'], roles: ['customer'], requires: [] },
  raise_dispute: { label: 'Raise Dispute', to: 'disputed', from: [
    'buyer_marked_paid', 'paid', 'processing',
    'ready_for_delivery', 'out_for_delivery',
    'in_transit', 'delivered', 'buyer_confirmation',
  ], roles: ['customer'], requires: ['reason'] },
  // Seller
  confirm_payment: { label: 'Confirm Payment', to: 'paid', from: ['buyer_marked_paid'], roles: ['seller'], requires: [] },
  reject_payment: { label: 'Reject Payment', to: 'payment_rejected', from: ['buyer_marked_paid'], roles: ['seller'], requires: ['reason'] },
  seller_accept: { label: 'Accept Order', to: 'seller_accepted', from: ['awaiting_seller_confirmation', 'processing'], roles: ['seller'], requires: [] },
  seller_reject: { label: 'Reject Order', to: 'cancelled', from: ['awaiting_seller_confirmation', 'seller_accepted', 'paid'], roles: ['seller'], requires: ['reason'] },
  seller_prepare: { label: 'Prepare', to: 'processing', from: ['paid', 'seller_accepted'], roles: ['seller'], requires: [] },
  attach_quality_documents: { label: 'Attach Quality Documents', to: null, from: ['quality_inspection', 'processing'], roles: ['seller'], requires: ['quality_document_url'] },
  // Warehouse
  warehouse_receive: { label: 'Receive', to: 'quality_inspection', from: ['awaiting_warehouse_allocation', 'processing'], roles: ['warehouse', 'warehouse_manager'], requires: ['warehouse_id'] },
  warehouse_inspect: { label: 'Inspect', to: null, from: ['quality_inspection', 'processing'], roles: ['warehouse', 'warehouse_manager'], requires: ['notes'] },
  warehouse_allocate: { label: 'Allocate', to: 'ready_for_dispatch', from: ['quality_inspection', 'awaiting_warehouse_allocation'], roles: ['warehouse', 'warehouse_manager'], requires: [] },
  warehouse_release: { label: 'Release', to: null, from: ['ready_for_dispatch'], roles: ['warehouse', 'warehouse_manager'], requires: [] },
  // Logistics / Admin
  assign_logistics: { label: 'Assign Logistics', to: 'assigned_to_logistics', from: ['ready_for_dispatch', 'processing'], roles: ['transport_manager', 'superadmin', 'marketplace_admin', 'customer_support'], requires: ['provider_id'] },
  logistics_accept: { label: 'Accept Delivery', to: 'in_transit', from: ['assigned_to_logistics'], roles: ['logistics_company', 'transport_manager', 'superadmin'], requires: [] },
  update_location: { label: 'Update Location', to: null, from: ['in_transit'], roles: ['logistics_company', 'transport_manager', 'superadmin'], requires: ['location'] },
  submit_pod: { label: 'Submit Proof of Delivery', to: 'delivered', from: ['in_transit'], roles: ['logistics_company', 'transport_manager', 'superadmin'], requires: ['proof_of_delivery_url'] },
  admin_intervene: { label: 'Intervene', to: 'target', from: ['*'], roles: ['superadmin', 'marketplace_admin', 'customer_support'], requires: ['target_status'] },
  freeze_order: { label: 'Freeze Order', to: null, from: ['*'], roles: ['superadmin', 'marketplace_admin', 'customer_support'], requires: [] },
  unfreeze_order: { label: 'Unfreeze Order', to: null, from: ['*'], roles: ['superadmin', 'marketplace_admin', 'customer_support'], requires: [] },
  approve_refund: { label: 'Approve Refund', to: 'refunded', from: ['disputed', 'payment_rejected'], roles: ['finance_admin', 'superadmin', 'marketplace_admin'], requires: ['refund_amount'] },
  approve_payout: { label: 'Approve Payout', to: null, from: ['completed'], roles: ['finance_admin', 'superadmin'], requires: [] },
}

// Role -> list of actions that role may perform (frontend convenience only).
export const ROLE_ACTIONS = {
  customer: ['submit_order', 'mark_payment_submitted', 'cancel_order', 'buyer_confirm_delivery', 'complete_order', 'retry_payment', 'raise_dispute'],
  seller: ['confirm_payment', 'reject_payment', 'seller_accept', 'seller_reject', 'seller_prepare', 'attach_quality_documents'],
  warehouse: ['warehouse_receive', 'warehouse_inspect', 'warehouse_allocate', 'warehouse_release'],
  warehouse_manager: ['warehouse_receive', 'warehouse_inspect', 'warehouse_allocate', 'warehouse_release'],
  transport_manager: ['assign_logistics', 'logistics_accept', 'update_location', 'submit_pod'],
  logistics_company: ['logistics_accept', 'update_location', 'submit_pod'],
  finance_admin: ['approve_refund', 'approve_payout'],
  customer_support: ['admin_intervene', 'freeze_order', 'unfreeze_order'],
  superadmin: Object.keys(ACTIONS),
  marketplace_admin: Object.keys(ACTIONS),
  vendor_admin: [],
}

export const ORDER_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  pending_payment: 'bg-yellow-100 text-yellow-800',
  buyer_marked_paid: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  payment_rejected: 'bg-red-100 text-red-800',
  processing: 'bg-blue-100 text-blue-800',
  ready_for_delivery: 'bg-purple-100 text-purple-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  disputed: 'bg-orange-100 text-orange-800',
  refunded: 'bg-pink-100 text-pink-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export function getStatusLabel(status) {
  if (!status) return 'Unknown'
  return STATUS_LABELS[status] || status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function normalizeStatus(status) {
  return STATUS_NORMALIZE[status] || status
}

export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(normalizeStatus(status))
}

export function getStatusColor(status) {
  const normalized = normalizeStatus(status)
  return ORDER_STATUS_COLORS[normalized] || 'bg-gray-100 text-gray-700'
}

export function getCurrentStageIndex(status) {
  return LIFECYCLE_STAGES.findIndex((s) => s.status === normalizeStatus(status))
}

export function getRoleActionsForStatus(role, status) {
  const actions = ROLE_ACTIONS[role] || []
  return actions.filter((a) => {
    const def = ACTIONS[a]
    if (!def) return false
    const from = def.from || []
    if (from.includes('*')) return true
    return from.includes(status) || from.includes(normalizeStatus(status))
  })
}

export function canPerformAction(role, status, actionName) {
  const def = ACTIONS[actionName]
  if (!def) return false
  if (!def.roles.includes(role)) return false
  const from = def.from || []
  if (from.includes('*')) return true
  return from.includes(status) || from.includes(normalizeStatus(status))
}
