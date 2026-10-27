import React from 'react'
import { Clock, CheckCircle, Package, Truck, MapPin, Calendar, Search, AlertCircle, XCircle, CreditCard } from 'lucide-react'
import { LIFECYCLE_STAGES, STATUS_LABELS, STATUS_NORMALIZE, getCurrentStageIndex, isTerminal } from '../config/orderLifecycle'
import { StatusIndicator } from './UI'

const STAGE_ICONS = {
  draft: Package,
  pending_payment: Clock,
  paid: CheckCircle,
  awaiting_seller_confirmation: Package,
  seller_accepted: CheckCircle,
  awaiting_warehouse_allocation: Package,
  quality_inspection: Search,
  ready_for_dispatch: Package,
  assigned_to_logistics: Truck,
  in_transit: Truck,
  delivered: CheckCircle,
  buyer_confirmation: Clock,
  completed: CheckCircle,
  disputed: AlertCircle,
  refunded: CreditCard,
  cancelled: XCircle,
}

const STATUS_COLORS = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  awaiting_seller_confirmation: 'bg-amber-100 text-amber-800',
  seller_accepted: 'bg-purple-100 text-purple-800',
  awaiting_warehouse_allocation: 'bg-slate-100 text-slate-800',
  quality_inspection: 'bg-fuchsia-100 text-fuchsia-800',
  ready_for_dispatch: 'bg-indigo-100 text-indigo-800',
  assigned_to_logistics: 'bg-cyan-100 text-cyan-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  buyer_confirmation: 'bg-pink-100 text-pink-800',
  completed: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  refunded: 'bg-violet-100 text-violet-800',
  cancelled: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
}

export function OrderStatusBadge({ status, variant = 'pill' }) {
  const normalized = STATUS_NORMALIZE[status] || status
  const label = STATUS_LABELS[normalized] || status
  const classes = STATUS_COLORS[normalized] || 'bg-gray-100 text-gray-800'
  if (variant === 'pill') {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${classes}`}>
        {label}
      </span>
    )
  }
  return <StatusIndicator status={normalized} variant="pill" />
}

// Vertical stepper using the canonical lifecycle stage order.
export function OrderLifecycleStepper({ status }) {
  const normalized = STATUS_NORMALIZE[status] || status
  const currentIdx = getCurrentStageIndex(status)
  const isCancelled = normalized === 'cancelled'
  const isRefunded = normalized === 'refunded'
  const isDisputed = normalized === 'disputed'
  const isCompleted = normalized === 'completed'

  const colorFor = (idx) => {
    if (isRefunded || isCancelled) return idx === LIFECYCLE_STAGES.length - 1 && ['refunded', 'cancelled'].includes(LIFECYCLE_STAGES[idx].status) ? 'completed' : 'neutral'
    if (idx < currentIdx) return 'completed'
    if (idx === currentIdx) return 'current'
    return 'pending'
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 -z-10" />
      <div className="space-y-4">
        {LIFECYCLE_STAGES.map((stage, idx) => {
          const state = colorFor(idx)
          const Icon = STAGE_ICONS[stage.status] || Clock
          const dotClass =
            state === 'completed'
              ? 'bg-green-600 text-white border-green-600'
              : state === 'current'
              ? 'bg-blue-600 text-white border-blue-600 animate-pulse'
              : 'bg-white text-gray-400 border-gray-300'
          const textClass =
            state === 'completed' ? 'text-gray-900' : state === 'current' ? 'text-blue-700' : 'text-gray-400'
          return (
            <div key={stage.status} className="flex items-start gap-3">
              <div
                className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 ${dotClass} transition-all`}
                title={stage.label}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`flex items-baseline justify-between ${textClass}`}>
                  <span className="font-medium">{stage.label}</span>
                  {state === 'current' && <span className="text-xs">Current</span>}
                </div>
                {state === 'completed' && <span className="text-xs text-gray-500">Completed</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Immutable audit event list (the "order timeline").
export function OrderTimeline({ events = [] }) {
  if (!events.length) {
    return (
      <div className="text-sm text-gray-500 py-4">
        No timeline events recorded yet. The timeline is created automatically
        on every status change.
      </div>
    )
  }
  return (
    <ul className="relative pl-6 border-l border-gray-200 space-y-5">
      {events.map((e) => {
        const Icon = STAGE_ICONS[e.status] || Clock
        const isAction = !e.status
        return (
          <li key={e.id} className="relative pb-2 last:pb-0">
            <div
              className={`absolute -left-1.5 flex items-center justify-center w-7 h-7 rounded-full border-2 ${isAction ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-green-100 text-green-700 border-green-300'}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="ml-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-gray-800">{e.action || e.status}</span>
                {e.status && <StatusIndicator status={STATUS_NORMALIZE[e.status] || e.status} variant="dot" />}
                {e.actor_role && (
                  <span className="text-xs text-gray-500">by {e.actor_role}</span>
                )}
                {e.location && <span className="text-xs text-gray-500">at {e.location}</span>}
              </div>
              {e.notes && <p className="text-sm text-gray-600 mt-0.5">{e.notes}</p>}
              <time className="text-xs text-gray-400">
                {e.created_at ? new Date(e.created_at).toLocaleString() : ''}
              </time>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default OrderLifecycleStepper
