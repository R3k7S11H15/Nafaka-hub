import React, { useEffect, useState } from 'react'
import { UserCog, Plus, Trash2, Edit3, Shield, Save, X, Lock, Copy, FileText, Tag } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'
import { ROLES, ROLE_LABELS, ROLE_LIST } from '../../config/roles'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../components/ConfirmDialog'

const PERMISSION_CATEGORIES = [
  { name: 'Users', permissions: [
    { key: 'can_view_users', label: 'View Users', description: 'Can view user list' },
    { key: 'can_create_users', label: 'Create Users', description: 'Can create users' },
    { key: 'can_edit_users', label: 'Edit Users', description: 'Can modify user info' },
    { key: 'can_delete_users', label: 'Delete Users', description: 'Can delete users' },
    { key: 'can_verify_users', label: 'Verify Users', description: 'Can verify accounts' },
  ]},
  { name: 'Products', permissions: [
    { key: 'can_view_products', label: 'View Products', description: 'Can view catalog' },
    { key: 'can_create_products', label: 'Create Products', description: 'Can add products' },
    { key: 'can_edit_products', label: 'Edit Products', description: 'Can modify products' },
    { key: 'can_delete_products', label: 'Delete Products', description: 'Can remove products' },
    { key: 'can_feature_products', label: 'Feature Products', description: 'Can feature items' },
  ]},
  { name: 'Orders', permissions: [
    { key: 'can_view_orders', label: 'View Orders', description: 'Can view orders' },
    { key: 'can_edit_orders', label: 'Edit Orders', description: 'Can modify status' },
    { key: 'can_cancel_orders', label: 'Cancel Orders', description: 'Can cancel orders' },
    { key: 'can_refund_orders', label: 'Refund Orders', description: 'Can process refunds' },
  ]},
  { name: 'Reports', permissions: [
    { key: 'can_view_reports', label: 'View Reports', description: 'Can access analytics' },
    { key: 'can_export_data', label: 'Export Data', description: 'Can export to CSV' },
    { key: 'can_view_financials', label: 'View Financials', description: 'Can access finances' },
  ]},
  { name: 'System', permissions: [
    { key: 'can_manage_settings', label: 'Manage Settings', description: 'Can modify settings' },
    { key: 'can_manage_subadmins', label: 'Manage Sub-Admins', description: 'Can manage admins' },
    { key: 'can_view_audit_logs', label: 'View Audit Logs', description: 'Can access audit logs' },
    { key: 'can_manage_backups', label: 'Manage Backups', description: 'Can backup/restore' },
  ]},
]

const DEFAULT_TEMPLATES = [
  { name: 'Full Admin', permissions: PERMISSION_CATEGORIES.reduce((acc, cat) => { cat.permissions.forEach(p => { acc[p.key] = true }); return acc }, {}) },
  { name: 'User Manager', permissions: { can_view_users: true, can_create_users: true, can_edit_users: true, can_verify_users: true, can_view_audit_logs: true } },
  { name: 'Product Manager', permissions: { can_view_products: true, can_create_products: true, can_edit_products: true, can_feature_products: true } },
  { name: 'Order Manager', permissions: { can_view_orders: true, can_edit_orders: true, can_cancel_orders: true, can_refund_orders: true } },
  { name: 'Viewer Only', permissions: { can_view_users: true, can_view_products: true, can_view_orders: true, can_view_reports: true } },
]

export default function SuperAdminSubAdmins() {
  const toast = useToast()
  const confirm = useConfirm()
  const [subAdmins, setSubAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [showTemplates, setShowTemplates] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [form, setForm] = useState({ customer_id: '', role: ROLES.MARKETPLACE_ADMIN, permissions: {}, scope: {} })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSubAdmins(); fetchUsers(); fetchTemplates() }, [])

  const fetchSubAdmins = async () => {
    try {
      const res = await api.getSubAdmins()
      setSubAdmins(res?.sub_admins || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchUsers = async () => {
    try {
      const res = await api.getSuperAdminUsers({ limit: 100 })
      setUsers(res?.users || res?.data?.users || [])
    } catch (err) { console.error(err) }
  }

  const fetchTemplates = async () => {
    try {
      const res = await api.getPermissionTemplates()
      if (res?.success && res.templates.length > 0) {
        const custom = res.templates.map(t => ({
          name: t.name, description: t.description,
          permissions: typeof t.permissions === 'string' ? JSON.parse(t.permissions) : t.permissions
        }))
        setTemplates([...DEFAULT_TEMPLATES, ...custom])
      }
    } catch (err) { console.error(err) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) await api.updateSubAdmin(editingId, form)
      else await api.createSubAdmin(form)
      resetForm()
      fetchSubAdmins()
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Remove this sub-admin?', type: 'danger' })
    if (!confirmed) return
    try { await api.deleteSubAdmin(id); fetchSubAdmins() } catch (err) { console.error(err) }
  }

  const handleEdit = (subAdmin) => {
    setEditingId(subAdmin.id)
    setForm({
      customer_id: subAdmin.customer_id, role: subAdmin.role,
      permissions: typeof subAdmin.permissions === 'string' ? JSON.parse(subAdmin.permissions) : (subAdmin.permissions || {}),
      scope: typeof subAdmin.scope === 'string' ? JSON.parse(subAdmin.scope) : (subAdmin.scope || {}),
    })
    setShowForm(true)
  }

  const resetForm = () => { setShowForm(false); setEditingId(null); setForm({ customer_id: '', role: ROLES.MARKETPLACE_ADMIN, permissions: {}, scope: {} }) }

  const togglePermission = (permKey) => {
    setForm(prev => ({ ...prev, permissions: { ...prev.permissions, [permKey]: !prev.permissions[permKey] } }))
  }

  const selectAllInCategory = (category) => {
    const newPerms = { ...form.permissions }
    category.permissions.forEach(p => { newPerms[p.key] = true })
    setForm(prev => ({ ...prev, permissions: newPerms }))
  }

  const clearCategory = (category) => {
    const newPerms = { ...form.permissions }
    category.permissions.forEach(p => { newPerms[p.key] = false })
    setForm(prev => ({ ...prev, permissions: newPerms }))
  }

  const applyTemplate = (template) => {
    setForm(prev => ({ ...prev, permissions: { ...template.permissions } }))
  }

  const handleCreateTemplate = async () => {
    if (!newTemplateName) return
    try {
      await api.createPermissionTemplate({ name: newTemplateName, description: '', permissions: form.permissions })
      setNewTemplateName('')
      fetchTemplates()
    } catch (err) { console.error(err) }
  }

  const getPermissionsCount = (subAdmin) => {
    const perms = typeof subAdmin.permissions === 'string' ? JSON.parse(subAdmin.permissions) : subAdmin.permissions
    return Object.values(perms || {}).filter(Boolean).length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Sub-Admin Management</h1><p className="text-gray-500 text-sm mt-1">Delegate admin roles with granular permissions</p></div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
          <Plus className="w-4 h-4" /> Add Sub-Admin
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Shield className="w-5 h-5 text-red-600" />{editingId ? 'Edit' : 'Create'} Sub-Admin</h3>
            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" required>
                  <option value="">Select user...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email || u.phone})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm">
                  {ROLE_LIST.filter(r => r.value !== ROLES.SUPERADMIN && r.value !== ROLES.CUSTOMER).map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Permission Template</label>
                <button type="button" onClick={() => setShowTemplates(!showTemplates)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <FileText className="w-3 h-3" />{showTemplates ? 'Hide' : 'Show'} Templates
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <button key={template.name} type="button" onClick={() => applyTemplate(template)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 flex items-center gap-1">
                    <Tag className="w-3 h-3" />{template.name}
                  </button>
                ))}
              </div>
              {showTemplates && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                  <div className="space-y-1">
                    {templates.map((template) => (
                      <div key={template.name} className="flex items-center justify-between py-1">
                        <button type="button" onClick={() => applyTemplate(template)} className="text-xs text-gray-700 hover:text-red-600 text-left flex-1">{template.name}</button>
                        <span className="text-xs text-gray-400">{Object.values(template.permissions).filter(Boolean).length} perms</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200 flex gap-2">
                    <input type="text" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="New template name" className="flex-1 px-2 py-1 text-xs border rounded" />
                    <button type="button" onClick={handleCreateTemplate} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Save</button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">Granular Permissions</label>
                <button type="button" onClick={() => setForm(prev => ({ ...prev, permissions: {} }))} className="text-xs text-gray-500 hover:text-red-600">Clear All</button>
              </div>
              <div className="space-y-6">
                {PERMISSION_CATEGORIES.map((category) => (
                  <div key={category.name} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">{category.name}</h4>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => selectAllInCategory(category)} className="text-xs text-blue-600 hover:text-blue-700">Select All</button>
                        <span className="text-gray-300">|</span>
                        <button type="button" onClick={() => clearCategory(category)} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {category.permissions.map((perm) => (
                        <label key={perm.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${form.permissions[perm.key] ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                          <input type="checkbox" checked={form.permissions[perm.key] || false} onChange={() => togglePermission(perm.key)} className="mt-0.5 h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500" />
                          <div><span className="text-sm font-medium text-gray-900">{perm.label}</span><p className="text-xs text-gray-500">{perm.description}</p></div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600"><span className="font-medium">{Object.values(form.permissions).filter(Boolean).length}</span> permissions selected</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}<Save className="w-4 h-4" />{editingId ? 'Update' : 'Create'}
              </button>
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
              <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subAdmins.map((sa) => (
                <tr key={sa.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><p className="text-sm font-medium text-gray-900">{sa.full_name}</p><p className="text-xs text-gray-500">{sa.email || sa.phone}</p></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1 text-sm text-gray-700"><Shield className="w-4 h-4 text-gray-400" />{ROLE_LABELS[sa.role] || sa.role}</span></td>
                  <td className="px-6 py-4"><span className="flex items-center gap-2 text-sm text-gray-600"><Lock className="w-4 h-4 text-gray-400" />{getPermissionsCount(sa)} permissions</span></td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sa.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{sa.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => handleEdit(sa)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(sa.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {subAdmins.length === 0 && !loading && (
          <div className="p-12 text-center text-gray-500"><Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p>No sub-admins assigned yet</p></div>
        )}
      </div>
    </div>
  )
}
