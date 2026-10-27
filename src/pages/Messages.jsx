import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, MessageSquare, X, ShoppingCart, Truck, FileText, BarChart2, Lock } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useSSE } from '../hooks/useSSE'

function timeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return d.toLocaleDateString()
}

function initials(name) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

const TYPE_ICONS = {
  PRODUCT_INQUIRY: ShoppingCart,
  NEGOTIATION: BarChart2,
  ORDER: FileText,
  DELIVERY: Truck,
  GENERAL_BUSINESS: MessageSquare,
  SUPPORT: MessageSquare,
}

const TYPE_COLORS = {
  PRODUCT_INQUIRY: 'bg-blue-100 text-blue-700',
  NEGOTIATION: 'bg-purple-100 text-purple-700',
  ORDER: 'bg-green-100 text-green-700',
  DELIVERY: 'bg-orange-100 text-orange-700',
  GENERAL_BUSINESS: 'bg-gray-100 text-gray-700',
  SUPPORT: 'bg-red-100 text-red-700',
}

export default function Messages() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [conversations, setConversations] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [starting, setStarting] = useState(false)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.getConversations()
      setConversations(res?.conversations || [])
    } catch (err) {
      setError(err?.message || 'Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

   useEffect(() => {
     let list = conversations
     list = list.filter((c) => (c.conv_status || 'active') !== 'archived')
     if (filterType !== 'all') {
       list = list.filter((c) => (c.conversation_type || 'GENERAL_BUSINESS') === filterType)
     }
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase()
      list = list.filter(
        (c) =>
          (c.other_name || '').toLowerCase().includes(q) ||
          (c.other_business || '').toLowerCase().includes(q) ||
          (c.last_message_preview || '').toLowerCase().includes(q)
      )
    }
    setFiltered(list)
  }, [conversations, filterType, searchQ])

  const sseUrl = user?.id ? api.messagesStreamUrl(user.id) : null
  useSSE(sseUrl, {
    enabled: !!sseUrl && !!user,
    onMessage: (payload) => {
      if (payload?.success === true || payload?.type === 'message' || payload?.type === 'offer' || payload?.type === 'read_receipt' || payload?.type === 'conversation_closed' || payload?.type === 'conversation_reopened') {
        load()
      }
    },
  })

  useEffect(() => {
    if (!showNew) return
    let cancelled = false
    if (!searchQ.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await api.searchUsers(searchQ.trim())
        if (!cancelled) setResults(res?.users || [])
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Search failed')
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [searchQ, showNew])

  const startConversation = async (otherId) => {
    if (starting) return
    setStarting(true)
    try {
      const res = await api.sendMessage(otherId, '👋 Hi!')
      const convId = res?.conversation_id
      setShowNew(false)
      setSearchQ('')
      setResults([])
      if (convId) navigate(`/messages/${convId}`)
    } catch (err) {
      setError(err?.message || 'Failed to start conversation')
    } finally {
      setStarting(false)
    }
  }

  const typeFilterOptions = [
    { value: 'all', label: 'All Conversations' },
    { value: 'PRODUCT_INQUIRY', label: 'Product Inquiries' },
    { value: 'NEGOTIATION', label: 'Negotiations' },
    { value: 'ORDER', label: 'Orders' },
    { value: 'DELIVERY', label: 'Delivery' },
    { value: 'GENERAL_BUSINESS', label: 'General' },
  ]

  return (
    <div className="p-6 h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>
      )}

      {/* Type filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {typeFilterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterType(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterType === opt.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading conversations…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No conversations yet</p>
            <p className="text-sm mt-1">Click "New Chat" to find and message other users, or browse products to start a conversation.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((conv) => {
              const Icon = TYPE_ICONS[conv.conversation_type || 'GENERAL_BUSINESS'] || MessageSquare
              return (
                <li
                  key={conv.conversation_id}
                  onClick={() => navigate(`/messages/${conv.conversation_id}`)}
                  className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors relative"
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-sm">
                      {initials(conv.other_name || conv.other_business)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                      <Icon className="w-3 h-3 text-gray-600" />
                    </div>
                  </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between">
                       <h3 className="font-medium text-gray-900 truncate">
                         {conv.other_name || conv.other_business || 'Unknown user'}
                         {conv.other_verified && <span className="ml-1 text-green-600">✓</span>}
                         {conv.conv_status === 'closed' && <Lock className="ml-1 w-3 h-3 text-yellow-500" />}
                       </h3>
                       <span className="text-xs text-gray-400 flex-shrink-0">
                         {timeAgo(conv.last_message_at || conv.updated_at)}
                       </span>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[conv.conversation_type || 'GENERAL_BUSINESS']}`}>
                         {conv.conversation_type?.replace('_', ' ') || 'General'}
                       </span>
                       {conv.conv_status === 'closed' && (
                         <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">Closed</span>
                       )}
                       {conv.product_name && (
                         <span className="text-xs text-gray-500 truncate max-w-[120px]">
                           • {conv.product_name}
                         </span>
                       )}
                     </div>
                     <p className="text-sm text-gray-500 truncate mt-1">
                       {conv.last_message_preview || <em className="text-gray-400">No messages yet</em>}
                     </p>
                   </div>
                   {conv.conv_status === 'closed' && (
                     <button
                       onClick={() => api.reopenConversation(conv.conversation_id).then(() => load())}
                       className="ml-3 px-2 py-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100"
                       title="Reopen conversation"
                     >
                       Reopen
                     </button>
                   )}
                   {conv.unread_count > 0 && conv.conv_status !== 'closed' && (
                     <span className="w-6 h-6 bg-green-600 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                       {conv.unread_count}
                     </span>
                   )}
                 </li>
              )
            })}
          </ul>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Start a new chat</h2>
              <button onClick={() => { setShowNew(false); setSearchQ(''); setResults([]) }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search by name, email, or phone…"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="mt-3 max-h-80 overflow-y-auto">
                {searching && <div className="p-3 text-sm text-gray-500">Searching…</div>}
                {!searching && searchQ.trim() && results.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No users found.</div>
                )}
                {results.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u.id)}
                    disabled={starting}
                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 rounded-lg disabled:opacity-50"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-sm">
                      {initials(u.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {u.full_name}
                        {u.is_verified && <span className="ml-1 text-green-600">✓</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate capitalize">
                        {u.role}{u.business_name ? ` • ${u.business_name}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
