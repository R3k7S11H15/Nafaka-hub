import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2, ShoppingCart, Users, User, MapPin, Calendar, Package, DollarSign, ClipboardList, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { Button, Badge, Input, StatusIndicator } from '../components/UI'

const STATUS_VARIANTS = {
  open: 'info',
  partially_filled: 'warning',
  fully_allocated: 'success',
  confirmed: 'primary',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'danger',
  expired: 'secondary',
}

const STATUS_LABELS = {
  open: 'Open',
  partially_filled: 'Partially Filled',
  fully_allocated: 'Fully Allocated',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

const MEMBER_STATUS_VARIANTS = {
  invited: 'secondary',
  pending: 'warning',
  committed: 'success',
  withdrawn: 'secondary',
  rejected: 'danger',
}

const MEMBER_STATUS_LABELS = {
  invited: 'Invited',
  pending: 'Pending',
  committed: 'Committed',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
}

export default function BulkGroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSellerView, setIsSellerView] = useState(false)
  const [sellerForm, setSellerForm] = useState({
    contributed_quantity: '',
    committed_quantity: '',
    unit_price: '',
    product_id: '',
    notes: '',
  })
  const [joining, setJoining] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    loadRequest()
  }, [id])

  async function loadRequest() {
    setLoading(true)
    try {
      const res = await api.getBulkRequest(id)
      if (res.success) {
        setRequest(res.request)
        // Check if user is a member
        const isMember = res.request.members?.some(m => m.member_id === user?.id)
        if (isMember) setIsSellerView(true)
      } else {
        toast.error(res.message || 'Failed to load request')
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load request')
    } finally {
      setLoading(false)
    }
  }

  function ProgressBar({ allocated, required }) {
    const percent = required > 0 ? Math.min((allocated / required) * 100, 100) : 0
    const progressText = `${Math.round(percent)}% (${(allocated || 0).toLocaleString()} / ${(required || 0).toLocaleString()} tonnes)`
    return (
      <div className="w-full mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700">{progressText}</span>
          <Badge variant={STATUS_VARIANTS[request?.status] || 'default'}>
            {STATUS_LABELS[request?.status] || request?.status}
          </Badge>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              percent >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
              percent > 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
              'bg-gray-300'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    )
  }

  async function handleJoin() {
    setJoining(true)
    try {
      const res = await api.joinBulkRequest(id, {
        contributed_quantity: parseFloat(sellerForm.contributed_quantity),
        committed_quantity: sellerForm.committed_quantity ? parseFloat(sellerForm.committed_quantity) : undefined,
        unit_price: sellerForm.unit_price ? parseFloat(sellerForm.unit_price) : undefined,
        product_id: sellerForm.product_id ? parseInt(sellerForm.product_id) : undefined,
        notes: sellerForm.notes,
      })

      if (res.success) {
        toast.success(res.message || 'Successfully joined the group')
        loadRequest()
      } else {
        toast.error(res.message || 'Failed to join')
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred')
    } finally {
      setJoining(false)
    }
  }

  async function handleConfirmGroup() {
    if (!window.confirm('Are you sure you want to confirm this group? This will create a contract.')) return
    setConfirming(true)
    try {
      const res = await api.confirmBulkGroup(id)
      if (res.success) {
        toast.success('Group confirmed, contract created')
        navigate(`/bulk-procurement/contract/${res.contract.id}`)
      } else {
        toast.error(res.message || 'Failed to confirm')
      }
    } catch (err) {
      toast.error(err.message || 'An error occurred')
    } finally {
      setConfirming(false)
    }
  }

  async function handleWithdraw(memberId) {
    if (!window.confirm('Are you sure you want to withdraw from this group?')) return
    try {
      const res = await api.withdrawFromGroup(memberId)
      if (res.success) {
        toast.success('Withdrawn successfully')
        loadRequest()
      } else {
        toast.error(res.message || 'Failed to withdraw')
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

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-gray-500">Request not found</p>
      </div>
    )
  }

  const isBuyer = user?.id === request.buyer_id
  const committedMembers = request.members?.filter(m => m.status === 'committed') || []
  const totalCommitted = committedMembers.reduce((sum, m) => sum + parseFloat(m.committed_quantity || m.contributed_quantity || 0), 0)
  const remainingQuantity = Math.max(parseFloat(request.required_quantity) - totalCommitted, 0)
  const isFullyAllocated = remainingQuantity <= 0
  const userMember = request.members?.find(m => m.member_id === user?.id)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/bulk-procurement" className="text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Request Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{request.product_type}</h1>
              <p className="text-gray-600">Request #{request.request_number}</p>
            </div>
            <Badge variant={STATUS_VARIANTS[request.status] || 'default'} size="lg">
              {STATUS_LABELS[request.status] || request.status}
            </Badge>
          </div>

          <ProgressBar allocated={parseFloat(request.allocated_quantity)} required={parseFloat(request.required_quantity)} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <h3 className="text-xs text-gray-500 uppercase">Required Quantity</h3>
              <p className="text-xl font-bold text-gray-900">{request.required_quantity} tonnes</p>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 uppercase">Quality Grade</h3>
              <p className="text-lg font-semibold text-gray-900">{request.quality_grade || 'Standard'}</p>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 uppercase">Fulfillment Mode</h3>
              <p className="text-lg font-semibold text-gray-900 capitalize">
                {request.fulfillment_mode?.replace('_', ' ') || 'Seller Supply Group'}
              </p>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 uppercase flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Delivery Location
              </h3>
              <p className="text-lg font-semibold text-gray-900">{request.delivery_location}</p>
            </div>
            <div>
              <h3 className="text-xs text-gray-500 uppercase flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Delivery Date
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(request.delivery_date).toLocaleDateString()}
              </p>
            </div>
            {request.max_price_per_unit && (
              <div>
                <h3 className="text-xs text-gray-500 uppercase flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Max Price
                </h3>
                <p className="text-lg font-semibold text-gray-900">TZS {parseFloat(request.max_price_per_unit).toLocaleString()}/tonne</p>
              </div>
            )}
          </div>

          {request.notes && (
            <div>
              <h3 className="text-xs text-gray-500 uppercase mb-1">Notes</h3>
              <p className="text-gray-700">{request.notes}</p>
            </div>
          )}
        </div>

        {/* Buyer Actions */}
        {isBuyer && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Buyer Actions
            </h2>
            <div className="flex gap-3">
              {request.status === 'fully_allocated' && (
                <Button
                  variant="primary"
                  loading={confirming}
                  onClick={handleConfirmGroup}
                >
                  {confirming ? 'Confirming...' : 'Confirm & Create Contract'}
                </Button>
              )}
              {request.status === 'confirmed' && request.contract && (
                <Link to={`/bulk-procurement/contract/${request.contract.id}`}>
                  <Button variant="primary">
                    View Contract
                  </Button>
                </Link>
              )}
              {['open', 'partially_filled', 'fully_allocated'].includes(request.status) && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    const res = await api.cancelBulkRequest(id)
                    if (res.success) {
                      toast.success('Request cancelled')
                      navigate('/bulk-procurement')
                    } else {
                      toast.error(res.message || 'Failed to cancel')
                    }
                  }}
                >
                  Cancel Request
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Seller Join Form */}
        {user?.role === 'seller' && !userMember && (request.status === 'open' || request.status === 'partially_filled') && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Join This Procurement Group
            </h2>
            <p className="text-gray-600 mb-4">
              Remaining: {remainingQuantity.toFixed(2)} tonnes of {request.required_quantity} tonnes required
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Quantity to Supply (tonnes) *"
                name="contributed_quantity"
                type="number"
                placeholder="e.g., 40"
                value={sellerForm.contributed_quantity}
                onChange={(e) => setSellerForm({ ...sellerForm, contributed_quantity: e.target.value })}
                min="0.01"
                step="0.01"
                max={remainingQuantity.toString()}
              />
              <Input
                label="Unit Price (TZS/tonne)"
                name="unit_price"
                type="number"
                placeholder="Optional"
                value={sellerForm.unit_price}
                onChange={(e) => setSellerForm({ ...sellerForm, unit_price: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
            <div className="mb-4">
              <Input
                label="Notes (Optional)"
                name="notes"
                placeholder="Any notes for the buyer..."
                value={sellerForm.notes}
                onChange={(e) => setSellerForm({ ...sellerForm, notes: e.target.value })}
              />
            </div>
            <Button
              variant="primary"
              loading={joining}
              onClick={handleJoin}
              disabled={!sellerForm.contributed_quantity || joining}
            >
              {joining ? 'Joining...' : 'Commit to Join Group'}
            </Button>
          </div>
        )}

        {/* Current User's Commitment */}
        {userMember && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Your Commitment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-xs text-gray-500 uppercase">Committed Quantity</h3>
                <p className="text-xl font-bold text-gray-900">{userMember.committed_quantity || userMember.contributed_quantity} tonnes</p>
              </div>
              <div>
                <h3 className="text-xs text-gray-500 uppercase">Unit Price</h3>
                <p className="text-xl font-bold text-gray-900">
                  {userMember.unit_price ? `TZS ${parseFloat(userMember.unit_price).toLocaleString()}/tonne` : 'Not specified'}
                </p>
              </div>
              <div>
                <h3 className="text-xs text-gray-500 uppercase">Status</h3>
                <Badge variant={MEMBER_STATUS_VARIANTS[userMember.status] || 'default'}>
                  {MEMBER_STATUS_LABELS[userMember.status] || userMember.status}
                </Badge>
              </div>
            </div>
            {['invited', 'pending', 'committed'].includes(userMember.status) && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => handleWithdraw(userMember.id)}
                >
                  Withdraw Commitment
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Members List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Group Members ({request.members?.length || 0})
          </h2>
          {request.members && request.members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Member</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Contributed</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Committed</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {request.members.map((member) => (
                    <tr key={member.id} className="border-t border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{member.member_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 capitalize">{member.member_role}</td>
                      <td className="py-3 px-4">{member.contributed_quantity} tonnes</td>
                      <td className="py-3 px-4">{member.committed_quantity || '-'} tonnes</td>
                      <td className="py-3 px-4">
                        {member.unit_price ? `TZS ${parseFloat(member.unit_price).toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={MEMBER_STATUS_VARIANTS[member.status] || 'default'}>
                          {MEMBER_STATUS_LABELS[member.status] || member.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No members have joined yet.</p>
          )}
        </div>

        {/* Activity Log */}
        {request.activity && request.activity.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
            <div className="space-y-3">
              {request.activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{item.actor_name || 'System'}</span>
                    <span className="text-gray-600"> {item.action.replace(/_/g, ' ')}</span>
                    {item.details && <span className="text-gray-500 block text-xs">{item.details}</span>}
                    <span className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
