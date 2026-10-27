import React, { useEffect, useState } from 'react'
import { Shield, Smartphone, Mail, Lock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Key, UserCheck } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../components/ConfirmDialog'

export default function SuperAdminMfa() {
  const toast = useToast()
  const [policy, setPolicy] = useState({ mfa_required: false, grace_period_hours: 24, is_active: true })
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await api.getMfaSettings()
      if (res?.success) {
        setPolicy(res.policy)
        setAdmins(res.admins_mfa || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSavePolicy = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateMfaPolicy(policy)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleEnforceMfa = async (adminId) => {
    const confirmed = await confirm({ title: 'Enforce MFA for this admin?', message: 'They will be required to set up 2FA on next login.', type: 'warning' })
    if (!confirmed) return
    try {
      await api.enforceMfa(adminId)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const enabledCount = admins.filter(a => a.mfa_enabled && a.is_verified).length
  const pendingCount = admins.filter(a => a.enforced && !a.mfa_enabled).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MFA Enforcement</h1>
          <p className="text-gray-500 text-sm mt-1">Require two-factor authentication for admin accounts</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <h3 className="font-semibold text-gray-900">MFA Enabled</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{enabledCount}</p>
          <p className="text-sm text-gray-500 mt-1">admins with 2FA active</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
            <h3 className="font-semibold text-gray-900">Pending Setup</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
          <p className="text-sm text-gray-500 mt-1">admins must enable MFA</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${policy.mfa_required ? 'bg-red-100' : 'bg-gray-100'}`}>
              <Shield className={`w-5 h-5 ${policy.mfa_required ? 'text-red-600' : 'text-gray-600'}`} />
            </div>
            <h3 className="font-semibold text-gray-900">Policy Status</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{policy.mfa_required ? 'Enforced' : 'Optional'}</p>
          <p className="text-sm text-gray-500 mt-1">MFA requirement</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">MFA Policy Settings</h3>
        <form onSubmit={handleSavePolicy} className="space-y-6">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="mfa_required"
              checked={policy.mfa_required}
              onChange={(e) => setPolicy({ ...policy, mfa_required: e.target.checked })}
              className="mt-1 h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
            />
            <div>
              <label htmlFor="mfa_required" className="text-sm font-medium text-gray-900">Require MFA for all admin accounts</label>
              <p className="text-xs text-gray-500 mt-1">When enabled, all admin users must set up two-factor authentication</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (hours)</label>
              <input
                type="number"
                value={policy.grace_period_hours}
                onChange={(e) => setPolicy({ ...policy, grace_period_hours: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                min="0"
                max="168"
              />
              <p className="text-xs text-gray-500 mt-1">Time allowed for users to set up MFA after policy is enforced</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Status</label>
              <select
                value={policy.is_active ? 'active' : 'inactive'}
                onChange={(e) => setPolicy({ ...policy, is_active: e.target.value === 'active' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Policy
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Admin MFA Status</h3>
        </div>
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MFA Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enforced</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{admin.full_name}</p>
                      <p className="text-xs text-gray-500">{admin.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {admin.mfa_enabled && admin.is_verified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3" /> Enabled
                      </span>
                    ) : admin.enforced ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <AlertTriangle className="w-3 h-3" /> Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <XCircle className="w-3 h-3" /> Not Set
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Key className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">TOTP (Authenticator)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {admin.enforced ? (
                      <span className="text-sm text-red-600">Yes</span>
                    ) : (
                      <span className="text-sm text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!admin.mfa_enabled && (
                      <button
                        onClick={() => handleEnforceMfa(admin.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <UserCheck className="w-4 h-4" /> Enforce
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
