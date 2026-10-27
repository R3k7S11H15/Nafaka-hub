import React, { useEffect, useState } from 'react'
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, LogIn, LogOut, AlertCircle, CheckCircle, Clock, X, ShieldCheck, Key, FileText, History } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../components/ConfirmDialog'

export default function SuperAdminSecurity() {
  const toast = useToast()
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState('ip-whitelist')
  const [ipList, setIpList] = useState([])
  const [loginHistory, setLoginHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddIp, setShowAddIp] = useState(false)
  const [newIp, setNewIp] = useState({ ip_address: '', description: '' })

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'ip-whitelist') {
        const res = await api.getIpWhitelist()
        if (res?.success) setIpList(res.ips)
      } else {
        const res = await api.getAllLoginHistory({ limit: 100 })
        if (res?.success) setLoginHistory(res.history)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddIp = async (e) => {
    e.preventDefault()
    try {
      await api.addIpWhitelist(newIp.ip_address, newIp.description)
      setNewIp({ ip_address: '', description: '' })
      setShowAddIp(false)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemoveIp = async (id) => {
    const confirmed = await confirm({ title: 'Remove this IP from whitelist?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.removeIpWhitelist(id)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleIp = async (id, current) => {
    try {
      await api.toggleIpWhitelist(id)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const successLogins = loginHistory.filter(l => l.success).length
  const failedLogins = loginHistory.filter(l => !l.success).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security & Access</h1>
          <p className="text-gray-500 text-sm mt-1">Manage IP whitelist and login history</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <TabButton active={activeTab === 'ip-whitelist'} onClick={() => setActiveTab('ip-whitelist')} icon={Shield}>
          IP Whitelist
        </TabButton>
        <TabButton active={activeTab === 'login-history'} onClick={() => setActiveTab('login-history')} icon={History}>
          Login History
        </TabButton>
      </div>

      {activeTab === 'ip-whitelist' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
                <Shield className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{ipList.length}</p>
                  <p className="text-sm text-gray-500">Whitelisted IPs</p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{ipList.filter(i => i.is_active).length}</p>
                  <p className="text-sm text-gray-500">Active</p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowAddIp(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              <Plus className="w-4 h-4" /> Add IP
            </button>
          </div>

          {showAddIp && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add IP to Whitelist</h3>
              <form onSubmit={handleAddIp} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                    <input
                      type="text"
                      value={newIp.ip_address}
                      onChange={(e) => setNewIp({ ...newIp, ip_address: e.target.value })}
                      placeholder="e.g., 192.168.1.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={newIp.description}
                      onChange={(e) => setNewIp({ ...newIp, description: e.target.value })}
                      placeholder="e.g., Office network"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAddIp(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Add IP</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ipList.map((ip) => (
                    <tr key={ip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono font-medium text-gray-900">{ip.ip_address}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{ip.description || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleToggleIp(ip.id, ip.is_active)} className={`flex items-center gap-1 ${ip.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {ip.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                          {ip.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{new Date(ip.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleRemoveIp(ip.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {ipList.length === 0 && !loading && (
              <div className="p-12 text-center text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No IPs in whitelist</p>
                <p className="text-sm mt-1">Add IPs to restrict admin access</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'login-history' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{successLogins}</p>
                <p className="text-sm text-gray-500">Successful Logins</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><AlertCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{failedLogins}</p>
                <p className="text-sm text-gray-500">Failed Attempts</p>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loginHistory.length}</p>
                <p className="text-sm text-gray-500">Total Attempts</p>
              </div>
            </div>
          </div>

           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             {loading ? (
               <TableSkeleton rows={8} cols={4} />
             ) : (
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loginHistory.map((login) => (
                    <tr key={login.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{login.full_name || login.email || '—'}</p>
                          <p className="text-xs text-gray-500">{login.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {login.success ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-500">{login.ip_address || '—'}</span>
                        {login.failure_reason && <p className="text-xs text-red-500">{login.failure_reason}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{new Date(login.created_at).toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {loginHistory.length === 0 && !loading && (
              <div className="p-12 text-center text-gray-500">
                <LogIn className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No login history</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      <Icon className="w-4 h-4" /> {children}
    </button>
  )
}
