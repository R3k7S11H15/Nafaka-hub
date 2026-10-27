import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Receipt as ReceiptIcon, Download, Share2, CheckCircle } from 'lucide-react'
import api from '../services/api'
import { Button, Card } from '../components/UI'

export default function Receipt() {
  const { id } = useParams()
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id) {
      api.getPaymentReceipt(id).then((res) => {
        if (res?.success) setReceipt(res.receipt)
        else setError(res?.message || 'Receipt not found')
        setLoading(false)
      }).catch(() => { setError('Failed to load receipt'); setLoading(false) })
    }
  }, [id])

  const downloadPdf = () => {
    const el = document.getElementById('receipt-print')
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>Receipt #${receipt?.id}</title><style>body{font-family:sans-serif;padding:24px}</style></head>
      <body>${el.innerHTML}</body></html>`)
    w.document.close()
    w.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4"><p className="text-center text-gray-500">Loading receipt…</p></div>
      </div>
    )
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <Card className="p-8 text-center">
            <ReceiptIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{error || 'Receipt not found'}</p>
          </Card>
        </div>
      </div>
    )
  }

  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    reversed: 'bg-slate-100 text-slate-800',
  }[receipt.status] || 'bg-gray-100 text-gray-800'

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payment Receipt</h1>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={downloadPdf}>Download / Print</Button>
            <Button variant="secondary" icon={Share2} onClick={() => navigator.clipboard.writeText(`${window.location.origin}/receipt/${receipt.id}`)}>Share</Button>
          </div>
        </div>

        <Card className="shadow-card p-8" id="receipt-print">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-green-700">Nafaka Hub</h2>
              <p className="text-sm text-gray-500">Receipt of Payment</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                {receipt.status === 'completed' && <CheckCircle className="w-4 h-4 mr-1" />}
                {receipt.status}
              </span>
              <p className="text-sm text-gray-500 mt-1">Receipt #{receipt.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs text-gray-500">Customer</p>
              <p className="font-medium text-gray-900">{receipt.customer_name}</p>
              <p className="text-sm text-gray-500">{receipt.customer_email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Order</p>
              <p className="font-medium text-gray-900">#{receipt.order_number}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment method</p>
              <p className="font-medium text-gray-900 capitalize">{receipt.method}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Provider reference</p>
              <p className="font-medium text-gray-900">{receipt.provider_ref || '—'}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Amount paid</span>
              <span className="font-bold text-lg text-gray-900">TZS {Number(receipt.amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Payment date</span>
              <span>{receipt.payment_date ? new Date(receipt.payment_date).toLocaleString() : '—'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping address</span>
              <span>{receipt.shipping_address || '—'}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
