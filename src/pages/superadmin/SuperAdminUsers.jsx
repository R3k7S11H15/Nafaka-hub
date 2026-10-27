import React, { useEffect, useState } from 'react'
import { Users, Search, Ban, UserCheck, Trash2, CheckSquare, Square, Download, Loader2, Filter, Calendar, X, ArrowUpDown } from 'lucide-react'
import api from '../../services/api'
import { TableSkeleton, CardSkeleton } from '../../components/Skeletons'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../components/ConfirmDialog'
import { formatRelativeTime } from '../../utils/formatters'
import storage from '../../utils/storage'

export default function SuperAdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState(() => {
    try {
      const saved = storage.getItem('filters_users')
      return saved ? JSON.parse(saved) : {
        role: '', is_verified: '', is_active: '', date_from: '', date_to: '', sort_by: 'created_at', sort_order: 'desc'
      }
    } catch {
      return { role: '', is_verified: '', is_active: '', date_from: '', date_to: '', sort_by: 'created_at', sort_order: 'desc' }
    }
  })
  const [selected, setSelected] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 20
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    fetchUsers()
  }, [search, filters, page])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = { search, limit, offset: page * limit, ...filters }
      const res = await api.getSuperAdminUsers(params)
      setUsers(res?.users || res?.data?.users || [])
      setTotal(res?.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selected.length === users.length) setSelected([])
    else setSelected(users.map(u => u.id))
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selected.length === 0) return

    const destructiveActions = ['delete']
    const isDestructive = destructiveActions.includes(bulkAction)

    if (isDestructive) {
      const confirmed = await confirm({
        title: `${bulkAction === 'delete' ? 'Delete' : bulkAction} ${selected.length} users?`,
        message: `You are about to ${bulkAction} ${selected.length} users. This will move them to trash.`,
        confirmText: bulkAction === 'delete' ? 'Delete' : bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1),
        type: 'danger',
      })
      if (!confirmed) return
    }

    try {
      await api.bulkUpdateUsers(selected, bulkAction)
      toast.success('Bulk action completed', `Successfully processed ${selected.length} users.`)
      setSelected([])
      setBulkAction('')
      fetchUsers()
    } catch (err) {
      toast.error('Bulk action failed', err.message)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Move to trash?',
      message: 'The user will be moved to trash and can be restored within 30 days.',
      confirmText: 'Delete',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await api.trashItem('users', id)
      toast.success('Moved to trash', 'User can be restored within 30 days.')
      fetchUsers()
    } catch (err) {
      toast.error('Delete failed', err.message)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value }
      storage.setItem('filters_users', JSON.stringify(newFilters))
      return newFilters
    })
    setPage(0)
  }

  const clearFilters = () => {
    setFilters({ role: '', is_verified: '', is_active: '', date_from: '', date_to: '', sort_by: 'created_at', sort_order: 'desc' })
    storage.removeItem('filters_users')
    setPage(0)
  }

  const handleExport = async () => {
    try {
      const res = await api.exportUsers({ ...filters, search })
      const blob = new Blob([res], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'users.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }

  const hasActiveFilters = filters.role || filters.is_verified || filters.is_active || filters.date_from || filters.date_to

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all platform users</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${showFilters || hasActiveFilters ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasActiveFilters && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Roles</option>
                  <option value="customer">Customer</option>
                  <option value="seller">Seller</option>
                  <option value="vendor_admin">Vendor Admin</option>
                  <option value="marketplace_admin">Marketplace Admin</option>
                  <option value="logistics_company">Logistics</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Verification</label>
                <select
                  value={filters.is_verified}
                  onChange={(e) => handleFilterChange('is_verified', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All</option>
                  <option value="1">Verified</option>
                  <option value="0">Unverified</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={filters.is_active}
                  onChange={(e) => handleFilterChange('is_active', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All</option>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sort By</label>
                <select
                  value={`${filters.sort_by}:${filters.sort_order}`}
                  onChange={(e) => {
                    const [sort_by, sort_order] = e.target.value.split(':')
                    handleFilterChange('sort_by', sort_by)
                    handleFilterChange('sort_order', sort_order)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="created_at:desc">Newest First</option>
                  <option value="created_at:asc">Oldest First</option>
                  <option value="full_name:asc">Name A-Z</option>
                  <option value="full_name:desc">Name Z-A</option>
                </select>
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-3 text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                <X className="w-4 h-4" /> Clear Filters
              </button>
            )}
          </div>
        )}

        {selected.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-center gap-3">
            <span className="text-sm text-gray-700">{selected.length} selected</span>
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Bulk action...</option>
              <option value="activate">Activate</option>
              <option value="deactivate">Deactivate</option>
              <option value="delete">Delete</option>
            </select>
            <button onClick={handleBulkAction} disabled={!bulkAction} className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                        {selected.length === users.length && users.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verification</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <button onClick={() => toggleSelect(user.id)} className="text-gray-400 hover:text-gray-600">
                          {selected.includes(user.id) ? <CheckSquare className="w-5 h-5 text-red-600" /> : <Square className="w-5 h-5" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.full_name || '—'}</p>
                          <p className="text-xs text-gray-500">{user.email || user.phone || '—'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700 capitalize">{user.role || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <UserCheck className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <Ban className="w-3 h-3" /> Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500" title={formatRelativeTime(user.created_at)}>{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">No users found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">Showing {users.length} of {total} users</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50">Previous</button>
                <span className="px-3 py-1 text-sm text-gray-600">Page {page + 1}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page * limit + users.length >= total} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
