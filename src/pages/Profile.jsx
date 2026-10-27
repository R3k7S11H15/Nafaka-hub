import React, { useState, useEffect, useContext } from 'react'
import {
  User, Mail, Phone, MapPin, Camera, Edit2, Save, X, Loader2,
  CreditCard, Shield, Key, ExternalLink, CalendarDays,
} from 'lucide-react'
import api from '../services/api'
import { AuthContext } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
}

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export default function Profile() {
  const { user, isAuthenticated, refreshUser } = useContext(AuthContext)
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [sellerPaymentMethods, setSellerPaymentMethods] = useState(null)

  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    region: '',
    role: '',
    joined: '',
  })

  useEffect(() => {
    let mounted = true
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch profile from database
        const data = await api.getProfile()
        if (!mounted) return
        if (data.success || data.user) {
          const u = data.user || {}
          setProfile({
            name: u.full_name || u.name || '',
            email: u.email || '',
            phone: u.phone || '',
            region: u.region || '',
            role: u.role || user?.role || '',
            joined: u.created_at || user?.created_at || '',
          })
        }

        // Fetch orders for recent activity (database)
        setOrdersLoading(true)
        try {
          const ordersData = await api.getOrders(user?.id)
          if (ordersData?.orders && mounted) {
            const sorted = [...ordersData.orders].sort(
              (a, b) => new Date(b.created_at || b.order_date || 0) - new Date(a.created_at || a.order_date || 0)
            )
            setOrders(sorted.slice(0, 5))
          }
        } catch {
          if (mounted) setOrders([])
        } finally {
          if (mounted) setOrdersLoading(false)
        }

        // Fetch seller payment methods from database (sellers only)
        const userRole = (data.user?.role || user?.role)
        if (userRole === 'seller') {
          try {
            const pmData = await api.getSellerPaymentMethods(user?.id)
            if (pmData && mounted) {
              setSellerPaymentMethods(pmData.methods || [])
            } else if (mounted) {
              setSellerPaymentMethods([])
            }
          } catch {
            if (mounted) setSellerPaymentMethods([])
          }
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load profile')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [isAuthenticated, user])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const data = await api.updateProfile({
        full_name: profile.name,
        phone: profile.phone,
        region: profile.region,
      })
      if (data.success) {
        setIsEditing(false)
        toast?.success('Profile updated successfully')
        refreshUser && refreshUser()
      } else {
        setError(data.message || 'Failed to update profile')
      }
    } catch (err) {
      setError(err?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const userInitials = (profile.name || user?.full_name || user?.name || 'U')
    .split(' ').map(n => n?.[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const roleColor = profile.role === 'seller' ? 'from-slate-700 to-slate-800' :
                    profile.role === 'admin' ? 'from-slate-700 to-slate-800' :
                    'from-slate-700 to-slate-800'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your profile…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Banner */}
      <div className="h-32 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.03),transparent)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-28 bg-white rounded-full shadow-xl -mb-14 ring-4 ring-white flex items-center justify-center">
          <span className="text-3xl font-bold text-gray-700">{userInitials}</span>
        </div>
      </div>

        <div className="max-w-4xl mx-auto px-4 py-6 -mt-14 pb-12">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-6">{error}</div>
        )}

        {/* Top Bar: Edit / Save */}
        <div className="flex justify-end mb-6">
          {isEditing ? (
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
              </button>
              <button onClick={() => setIsEditing(false)} className="btn-secondary flex items-center gap-2">
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} className="btn-primary flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
          )}
        </div>

        {/* Profile Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-t-xl"></div>
          <div className="px-8 pb-8">
            <div className="relative -mt-10 mb-6">
              <div className="w-24 h-24 bg-white rounded-2xl shadow-lg ring-2 ring-white flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-600">{userInitials}</span>
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 p-2 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    disabled={!isEditing || saving}
                    className={`input-field pl-10 w-full ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email (read-only)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" value={profile.email} disabled className="input-field pl-10 w-full bg-gray-50" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    disabled={!isEditing || saving}
                    className={`input-field pl-10 w-full ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={profile.region}
                    onChange={(e) => setProfile({...profile, region: e.target.value})}
                    disabled={!isEditing || saving}
                    className={`input-field pl-10 w-full ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-3">
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full capitalize">
                {profile.role || 'customer'}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                Joined {profile.joined || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Password Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                <Key className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Password</h2>
                <p className="text-sm text-gray-500">Change your account password</p>
              </div>
            </div>
            <button onClick={() => setShowPasswordModal(true)} className="btn-secondary">Change</button>
          </div>
        </div>

        {/* Seller Payment Methods Card */}
        {profile.role === 'seller' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Seller Payment Methods</h2>
                  <p className="text-sm text-gray-500">
                    How you receive payments (direct to treasury, no escrow)
                  </p>
                </div>
              </div>
              <a href="/vendor/payment-settings" className="btn-primary flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Manage
              </a>
            </div>
            {sellerPaymentMethods !== null && (
              <div className="mt-4">
                {sellerPaymentMethods.length === 0 ? (
                  <p className="text-sm text-gray-500">No payment methods configured. Add one to start receiving payments.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sellerPaymentMethods.map((m) => (
                      <span key={m.id} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {m.payment_method} ••••{String(m.account_number || m.phone_number || '').slice(-4)}
                        {m.is_default && ' (Default)'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Data & Privacy Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
              <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Data & Privacy</h2>
                <p className="text-sm text-gray-500">Download your data or delete your account</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-sm">Download Data</button>
              <button className="btn-secondary text-sm text-red-600 hover:text-red-700">Delete Account</button>
            </div>
          </div>
        </div>

        {/* Recent Orders Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <p className="text-sm text-gray-500 mt-1">Your latest 5 orders from the database</p>
          </div>

          {ordersLoading ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No orders yet
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.map((order) => {
                const status = order.status || 'pending'
                const statusClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'
                const statusLabel = STATUS_LABELS[status] || status
                return (
                  <div key={order.id || order.order_number} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        Order #{order.order_number || order.id}
                      </span>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {new Date(order.created_at || order.date || Date.now()).toLocaleDateString('en-GB', {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </span>
                      <span className="font-semibold text-gray-900">
                        TZS {Number(order.total_amount || order.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                  className="input-field w-full"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                  className="input-field w-full"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                  className="input-field w-full"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowPasswordModal(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={async () => {
                  if (passwordForm.new !== passwordForm.confirm) {
                    return toast?.error('Passwords do not match')
                  }
                  if (passwordForm.new.length < 8) {
                    return toast?.error('Password must be at least 8 characters')
                  }
                  setPasswordSaving(true)
                  try {
                    const data = await api.changePassword({
                      current_password: passwordForm.current,
                      new_password: passwordForm.new,
                    })
                    if (data.success) {
                      toast?.success('Password changed successfully')
                      setShowPasswordModal(false)
                      setPasswordForm({ current: '', new: '', confirm: '' })
                    } else {
                      toast?.error(data.message || 'Failed to change password')
                    }
                  } catch (err) {
                    toast?.error(err?.message || 'Failed to change password')
                  } finally {
                    setPasswordSaving(false)
                  }
                }}
                disabled={passwordSaving}
                className="btn-primary flex items-center gap-2"
              >
                {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
