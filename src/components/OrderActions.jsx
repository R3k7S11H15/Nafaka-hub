import React from 'react'
import { Button } from './UI'
import { useConfirm } from './ConfirmDialog'
import { useToast } from '../context/ToastContext'
import { ACTIONS } from '../config/orderLifecycle'

// Renders the role-specific action buttons for an order. For actions that need
// extra input (notes / reason / location / provider id / document URL / amount)
// a simple confirm + prompt flow is used. The actual permission + state
// validation is enforced on the backend: the frontend only hints.
export default function OrderActions({ order, allowedActions = [], onAction, loading }) {
  const confirm = useConfirm()
  const toast = useToast()
  const visible = (allowedActions || []).filter((a) => Boolean(ACTIONS[a.action]))

  if (!visible.length) {
    return (
      <div className="text-xs text-gray-400">
        {order?.frozen ? 'Order is frozen' : 'No actions available for your role'}
      </div>
    )
  }

  const run = async (def) => {
    if (!onAction) return
    const payload = { action: def.action, order_id: order.order_number || order.id }
    const requires = ACTIONS[def.action].requires || []

    for (const field of requires) {
      const value = window.prompt(`${ACTIONS[def.action].label}\nEnter ${field.replace(/_/g, ' ')}:`)
      if (value === null) return
      payload[field] = value
    }
    if (ACTIONS[def.action].to === null || def.action === 'attach_quality_documents') {
      const doc = window.prompt('Quality document URL (optional):', '')
      if (doc !== null && doc) payload.quality_document_url = doc
    }
    if (def.action === 'submit_pod') {
      const pod = window.prompt('Proof of delivery document URL:', '')
      if (pod === null) return
      if (!pod) {
        toast.error('Proof of delivery URL is required')
        return
      }
      payload.proof_of_delivery_url = pod
    }
    const notes = window.prompt('Notes (optional):', '')
    if (notes === null) return
    if (notes) payload.notes = notes

    const ok = await confirm({
      title: ACTIONS[def.action].label,
      message: `Perform this action on order #${order.order_number || order.id}?`,
      type: 'warning',
    })
    if (!ok) return
    const result = await onAction(payload)
    if (result?.success === false) {
      toast.error(result.message || 'Action failed')
    } else {
      toast.success(`${ACTIONS[def.action].label} applied`)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((a) => (
        <Button
          key={a.action}
          variant="outline"
          size="sm"
          loading={loading}
          onClick={() => run(a)}
        >
          {ACTIONS[a.action].label}
        </Button>
      ))}
    </div>
  )
}
