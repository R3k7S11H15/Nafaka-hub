import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Plus, ShoppingCart, Users, ClipboardList, Package, TrendingUp, FileText } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { Badge, StatusIndicator, Button, Card, CardBody } from '../components/UI'

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

export default function BulkProcurementDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState(user?.role === 'customer' ? 'myRequests' : 'available')
  const [myRequests, setMyRequests] = useState([])
  const [availableRequests, setAvailableRequests] = useState([])
  const [myGroups, setMyGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPageData()
  }, [activeTab])

  async function loadPageData() {
    setLoading(true)
    setError(null)
    try {
      if (activeTab === 'myRequests') {
        const res = await api.getMyBulkRequests()
        setMyRequests(res?.requests || [])
      } else if (activeTab === 'available') {
        const res = await api.getAvailableBulkRequests()
        setAvailableRequests(res?.requests || [])
      } else if (activeTab === 'myGroups') {
        const res = await api.getMyBulkGroups()
        setMyGroups(res?.groups || [])
      }
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function ProgressBar({ allocated, required, className = '' }) {
    const percent = required > 0 ? Math.min((allocated / required) * 100, 100) : 0
    const progressText = `${Math.round(percent)}% (${(allocated || 0).toLocaleString()} / ${(required || 0).toLocaleString()} ${'tonnes'})`
    return (
      <div className={`w-full ${className}`}>
        <div className="flex justify-between text-xs mb-1">
          <span>{progressText}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    )
  }

  function RequestCard({ request }) {
    const isSeller = user?.role === 'seller'
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardBody>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{request.product_type}</h3>
              <p className="text-sm text-gray-600">Request #{request.request_number}</p>
            </div>
            <Badge variant={STATUS_VARIANTS[request.status] || 'default'}>
              {STATUS_LABELS[request.status] || request.status}
            </Badge>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <p className="text-sm text-gray-600">Required Quantity</p>
              <p className="text-xl font-bold text-gray-900">{request.required_quantity} tonnes</p>
            </div>
            <ProgressBar
              allocated={parseFloat(request.allocated_quantity)}
              required={parseFloat(request.required_quantity)}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Delivery Location</p>
                <p className="text-sm font-medium text-gray-900">{request.delivery_location}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Delivery Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(request.delivery_date).toLocaleDateString()}
                </p>
              </div>
              {request.max_price_per_unit && (
                <div>
                  <p className="text-xs text-gray-500">Max Price</p>
                  <p className="text-sm font-medium text-gray-900">TZS {parseFloat(request.max_price_per_unit).toLocaleString()}/tonne</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">Quality Grade</p>
                <p className="text-sm font-medium text-gray-900">{request.quality_grade || 'Standard'}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {isSeller && (request.status === 'open' || request.status === 'partially_filled') && (
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => navigate(`/bulk-procurement/${request.id}`)}
              >
                Join Group
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => navigate(`/bulk-procurement/${request.id}`)}
            >
              View Details
            </Button>
          </div>
        </CardBody>
      </Card>
    )
  }

  const tabs = [
    { id: 'myRequests', label: user?.role === 'seller' ? 'My Groups' : 'My Requests', icon: ClipboardList },
    { id: 'available', label: 'Available Requests', icon: Package, visible: user?.role !== 'customer' },
    { id: 'myGroups', label: 'My Procurements', icon: ShoppingCart, visible: user?.role !== 'customer' },
  ].filter(t => t.visible !== false || user?.role === 'customer')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-green-600" />
              Bulk Procurement Network
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.role === 'customer'
                ? 'Create and manage bulk procurement requests'
                : 'Discover and join procurement groups'}
            </p>
          </div>

          {user?.role !== 'seller' && (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => navigate('/bulk-procurement/create')}
            >
              Create Request
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
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
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : (
          <>
            {/* My Requests Tab */}
            {activeTab === 'myRequests' && (
              <div>
                {myRequests.length === 0 ? (
                  <Card>
                    <CardBody className="text-center py-12">
                      <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No procurement requests</h3>
                      <p className="text-gray-600 mb-4">Create a bulk procurement request to get started.</p>
                      {user?.role !== 'seller' && (
                        <Button
                          variant="primary"
                          icon={Plus}
                          onClick={() => navigate('/bulk-procurement/create')}
                        >
                          Create First Request
                        </Button>
                      )}
                    </CardBody>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myRequests.map((request) => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Available Requests Tab */}
            {activeTab === 'available' && (
              <div>
                {availableRequests.length === 0 ? (
                  <Card>
                    <CardBody className="text-center py-12">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No available requests</h3>
                      <p className="text-gray-600">No bulk procurement requests are currently open for joining.</p>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {availableRequests.map((request) => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Groups Tab */}
            {activeTab === 'myGroups' && (
              <div>
                {myGroups.length === 0 ? (
                  <Card>
                    <CardBody className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups joined</h3>
                      <p className="text-gray-600">You haven't joined any procurement groups yet.</p>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myGroups.map((group) => (
                      <RequestCard key={group.id} request={group} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
