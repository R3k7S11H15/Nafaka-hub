import React, { useState, useEffect } from 'react'
import { Plus, Trash2, CreditCard, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function PaymentMethods() {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newMethod, setNewMethod] = useState({ type: 'M-Pesa', number: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getPaymentMethods()
        if (!mounted) return
        setMethods(res?.data || res?.methods || res?.payment_methods || res || [])
      } catch {
        if (mounted) setMethods([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const addMethod = () => {
    if (!newMethod.number) return
    setMethods([...methods, { id: Date.now(), type: newMethod.type, number: newMethod.number, last4: newMethod.number.slice(-4), primary: methods.length === 0 }])
    setNewMethod({ type: 'M-Pesa', number: '' })
    setShowForm(false)
  }

  const removeMethod = (id) => setMethods(methods.filter(m => m.id !== id))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
          <p className="text-gray-500 mt-1">Manage your saved payment options</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Method
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Add Payment Method</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
              <select value={newMethod.type} onChange={(e) => setNewMethod({...newMethod, type: e.target.value})} className="input-field">
                <option>M-Pesa</option>
                <option>Airtel Money</option>
                <option>Tigo Pesa</option>
                <option>Visa</option>
                <option>Mastercard</option>
                <option>CRDB</option>
                <option>NMB</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Account / Card Number</label>
              <input type="text" value={newMethod.number} onChange={(e) => setNewMethod({...newMethod, number: e.target.value})} className="input-field" placeholder="Enter number" />
            </div>
            <div className="flex gap-3">
              <button onClick={addMethod} className="btn-primary">Save Method</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading payment methods...
        </div>
      ) : methods.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">No payment methods saved yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {methods.map((method) => (
            <div key={method.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-50 rounded-xl">
                    <CreditCard className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{method.type || method.brand || 'Method'}</h3>
                    <p className="text-sm text-gray-500">{method.number || method.masked_number || (method.last4 ? `•••• ${method.last4}` : '')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.primary && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Primary</span>}
                  <button onClick={() => removeMethod(method.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
