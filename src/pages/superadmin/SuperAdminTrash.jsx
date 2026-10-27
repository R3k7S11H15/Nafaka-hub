import React, { useEffect, useState } from 'react'
import { Trash2, RefreshCw, Clock, AlertTriangle, Loader2, X, RotateCw, Archive } from 'lucide-react'
import api from '../../services/api'
import { formatRelativeTime, formatDate } from '../../utils/formatters'
import { useConfirm } from '../../components/ConfirmDialog'
import { useToast } from '../../context/ToastContext'

export default function SuperAdminTrash() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    fetchTrash()
  }, [filter])

  const fetchTrash = async () => {
    setLoading(true)
    try {
      const res = await api.getTrash({ entity_type: filter || undefined })
      setItems(res?.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (id) => {
    try {
      await api.restoreTrashItem(id)
      toast.success('Item restored', 'The item has been restored successfully.')
      fetchTrash()
    } catch (err) {
      toast.error('Restore failed', err.message)
    }
  }

  const handlePermanentDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Permanently delete?',
      message: 'This action cannot be undone. The item will be permanently removed.',
      confirmText: 'Delete Forever',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await api.permanentDelete(id)
      toast.success('Item deleted', 'The item has been permanently removed.')
      fetchTrash()
    } catch (err) {
      toast.error('Delete failed', err.message)
    }
  }

  const handlePurgeExpired = async () => {
    const confirmed = await confirm({
      title: 'Purge expired items?',
      message: 'This will permanently delete all items older than 30 days from trash.',
      confirmText: 'Purge Expired',
      type: 'warning',
    })
    if (!confirmed) return
    try {
      const res = await api.purgeExpiredTrash()
      toast.success('Trash purged', res.message)
      fetchTrash()
    } catch (err) {
      toast.error('Purge failed', err.message)
    }
  }

  const isExpiringSoon = (deletedAt) => {
    const diff = Date.now() - new Date(deletedAt).getTime()
    return diff > 25 * 24 * 60 * 60 * 1000
  }

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.entity_type]) acc[item.entity_type] = []
    acc[item.entity_type].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} items - Auto-purged after 30 days</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handlePurgeExpired} disabled={items.length === 0} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm disabled:opacity-50">
            <Archive className="w-4 h-4" /> Purge Expired
          </button>
          <button onClick={fetchTrash} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin w-6 h-6 text-red-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Trash2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Trash is empty</p>
            <p className="text-sm mt-1">Deleted items will appear here for 30 days</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {Object.entries(groupedItems).map(([entityType, entityItems]) => (
              <div key={entityType}>
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-700 capitalize">{entityType}</span>
                  <span className="ml-2 text-xs text-gray-500">({entityItems.length})</span>
                </div>
                {entityItems.map((item) => (
                  <div key={item.id} className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {typeof item.data === 'string' ? JSON.parse(item.data)?.full_name || `Item #${item.entity_id}` : item.data?.full_name || `Item #${item.entity_id}`}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(item.deleted_at)}
                            </span>
                            {isExpiringSoon(item.deleted_at) && (
                              <span className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertTriangle className="w-3 h-3" />
                                Expires soon
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <RotateCw className="w-4 h-4" /> Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                        title="Delete forever"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
