import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams, NavLink } from 'react-router-dom'
import { Loader2, FileText, ClipboardList, CheckCircle, AlertCircle, Package, DollarSign, Calendar, MapPin, User } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { Button, Badge, Input, StatusIndicator } from '../components/UI'

const INSPECTION_RESULT_VARIANTS = {
  passed: 'success',
  failed: 'danger',
  partial: 'warning',
}

export default function BulkContractManagement() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [inspectionForm, setInspectionForm] = useState({
    member_id: '',
    quantity_inspected: '',
    quantity_accepted: '',
    quantity_rejected: '',
    quality_grade: 'Grade A',
    inspection_result: 'passed',
    inspector_notes: '',
  })
  const [inspecting, setInspecting] = useState(false)

  useEffect(() => {
    loadContract()
  }, [id])

  async function loadContract() {
    setLoading(true)
    try {
      const res = await api.getBulkContract(id)
      if (res.success) {
        setContract(res.contract)
      } else {
        toast.error(res.message || 'Failed to load contract')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load contract')
    } finally {
      setLoading(false)
    }
  }

  async function handleInspection(e) {
    e.preventDefault()
    setInspecting(true)
    try {
      const res = await api.recordBulkInspection(id, {
        member_id: inspectionForm.member_id ? parseInt(inspectionForm.member_id) : null,
        quantity_inspected: parseFloat(inspectionForm.quantity_inspected),
        quantity_accepted: parseFloat(inspectionForm.quantity_accepted),
        quantity_rejected: parseFloat(inspectionForm.quantity_rejected),
        quality_grade: inspectionForm.quality_grade,
        inspection_result: inspectionForm.inspection_result,
        inspector_notes: inspectionForm.inspector_notes,
      })

      if (res.success) {
        toast.success('Inspection recorded')
        setInspectionForm({
          member_id: '',
          quantity_inspected: '',
          quantity_accepted: '',
          quantity_rejected: '',
          quality_grade: 'Grade A',
          inspection_result: 'passed',
          inspector_notes: '',
        })
        loadContract()
      } else {
        toast.error(res.message || 'Failed to record inspection')
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred')
    } finally {
      setInspecting(false)
    }
  }

  async function handleReleasePayment(paymentId) {
    if (!window.confirm('Are you sure you want to release this payment?')) return
    try {
      const res = await api.releaseBulkPayment(paymentId)
      if (res.success) {
        toast.success('Payment released')
        loadContract()
      } else {
        toast.error(res.message || 'Failed to release payment')
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-gray-500">Contract not found</p>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'members', label: 'Members', icon: User },
    { id: 'inspections', label: 'Inspections', icon: Package },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'activity', label: 'Activity', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/bulk-procurement" className="text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Contract Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contract #{contract.contract_number}</h1>
              <p className="text-gray-600 mt-1">
                For: {contract.product_type} • Request: {contract.request_number}
              </p>
            </div>
            <Badge variant="primary" size="lg">
              {contract.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <h3 className="text-xs text-gray-500 uppercase">Total Quantity</h3>
              <p className="text-xl font-bold text-gray-900">{contract.total_quantity} tonnes</p>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 uppercase">Total Amount</h3>
              <p className="text-xl font-bold text-green-600">TZS {parseFloat(contract.total_amount || 0).toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 uppercase flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Delivery Date
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(contract.delivery_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 uppercase flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Delivery Location
              </h3>
              <p className="text-lg font-semibold text-gray-900">{contract.delivery_location}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase mb-1">Product Type</h3>
                    <p className="font-medium text-gray-900">{contract.product_type}</p>
                  </div>
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase mb-1">Quality Standard</h3>
                    <p className="font-medium text-gray-900">{contract.quality_standard || 'Standard'}</p>
                  </div>
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase mb-1">Unit Price</h3>
                    <p className="font-medium text-gray-900">TZS {parseFloat(contract.unit_price || 0).toLocaleString()}/tonne</p>
                  </div>
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase mb-1">Payment Terms</h3>
                    <p className="font-medium text-gray-900">{contract.payment_terms || 'Escrow'}</p>
                  </div>
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase mb-1">Payment Deadline</h3>
                    <p className="font-medium text-gray-900">
                      {contract.payment_deadline ? new Date(contract.payment_deadline).toLocaleDateString() : '-'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs text-gray-500 uppercase mb-1">Fulfillment Mode</h3>
                    <p className="font-medium text-gray-900 capitalize">
                      {contract.fulfillment_mode?.replace('_', ' ') || 'Seller Supply Group'}
                    </p>
                  </div>
                </div>
              </div>

              {user?.id === contract.buyer_id && contract.status === 'active' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Quality Inspection</h2>
                  <form onSubmit={handleInspection} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Seller</label>
                      <select
                        name="member_id"
                        value={inspectionForm.member_id}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, member_id: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                        required
                      >
                        <option value="">Select a seller</option>
                        {contract.members?.filter(m => m.member_role === 'seller')?.map((m) => (
                          <option key={m.id} value={m.member_id}>
                            {m.member_name} ({m.committed_quantity} tonnes)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Input
                        label="Quantity Inspected (tonnes)"
                        type="number"
                        value={inspectionForm.quantity_inspected}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, quantity_inspected: e.target.value })}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="Quantity Accepted (tonnes)"
                        type="number"
                        value={inspectionForm.quantity_accepted}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, quantity_accepted: e.target.value })}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        label="Quantity Rejected (tonnes)"
                        type="number"
                        value={inspectionForm.quantity_rejected}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, quantity_rejected: e.target.value })}
                        min="0"
                        step="0.01"
                        defaultValue="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quality Grade</label>
                      <select
                        value={inspectionForm.quality_grade}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, quality_grade: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                      >
                        <option value="Grade A">Grade A</option>
                        <option value="Grade B">Grade B</option>
                        <option value="Grade C">Grade C</option>
                        <option value="Premium">Premium</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                      <select
                        value={inspectionForm.inspection_result}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_result: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                      >
                        <option value="passed">Passed</option>
                        <option value="partial">Partial</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        label="Inspector Notes"
                        placeholder="Enter notes..."
                        value={inspectionForm.inspector_notes}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, inspector_notes: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={inspecting}
                        disabled={inspecting}
                      >
                        {inspecting ? 'Recording...' : 'Record Inspection'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Members</h2>
              {contract.members && contract.members.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Seller</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contract.members.map((m) => (
                        <tr key={m.id} className="border-t border-gray-100">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{m.seller_name || m.member_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{m.committed_quantity} tonnes</td>
                          <td className="py-3 px-4">
                            {m.unit_price ? `TZS ${parseFloat(m.unit_price).toLocaleString()}` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            {m.total_price ? `TZS ${parseFloat(m.total_price).toLocaleString()}` : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="success">{m.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No members in this contract.</p>
              )}
            </div>
          )}

          {/* Inspections Tab */}
          {activeTab === 'inspections' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quality Inspections</h2>
              {contract.inspections && contract.inspections.length > 0 ? (
                <div className="space-y-4">
                  {contract.inspections.map((i) => (
                    <div key={i.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Inspection #{i.id} - {new Date(i.inspection_date).toLocaleDateString()}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Seller: {i.member_id} • Grade: {i.quality_grade}
                          </p>
                        </div>
                        <Badge variant={INSPECTION_RESULT_VARIANTS[i.inspection_result] || 'default'}>
                          {i.inspection_result}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Inspected:</span> {i.quantity_inspected} tonnes
                        </div>
                        <div>
                          <span className="text-gray-500">Accepted:</span> {i.quantity_accepted} tonnes
                        </div>
                        <div>
                          <span className="text-gray-500">Rejected:</span> {i.quantity_rejected} tonnes
                        </div>
                      </div>
                      {i.inspector_notes && (
                        <p className="text-sm text-gray-600 mt-2">{i.inspector_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No inspections recorded yet.</p>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payments</h2>
              {contract.payments && contract.payments.length > 0 ? (
                <div className="space-y-4">
                  {contract.payments.map((p) => (
                    <div key={p.id} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Payment #{p.id} - {p.member_id}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Created: {new Date(p.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={
                          p.payment_status === 'released' ? 'success' :
                          p.payment_status === 'held_in_escrow' ? 'warning' :
                          p.payment_status === 'refunded' ? 'secondary' :
                          'default'
                        }>
                          {p.payment_status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Amount:</span> TZS {parseFloat(p.amount || 0).toLocaleString()}
                        </div>
                        <div>
                          <span className="text-gray-500">Method:</span> {p.payment_method || '-'}
                        </div>
                      </div>
                      {p.payment_status === 'held_in_escrow' && user?.id === contract.buyer_id && (
                        <div className="mt-3">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleReleasePayment(p.id)}
                          >
                            Release Payment
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No payments recorded yet.</p>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
              {contract.activity && contract.activity.length > 0 ? (
                <div className="space-y-3">
                  {contract.activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">
                          {item.actor_name || 'System'}
                        </span>
                        <span className="text-gray-600"> {item.action.replace(/_/g, ' ')}</span>
                        {item.details && <span className="text-gray-500 block text-xs mt-1">{item.details}</span>}
                        <span className="text-xs text-gray-400 block mt-1">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No activity recorded.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
