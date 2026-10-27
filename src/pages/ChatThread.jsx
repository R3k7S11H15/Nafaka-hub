import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Send, Paperclip, Smile, ShoppingCart, FileText, BarChart2,
  XCircle, ArrowLeftRight, Flag, MoreVertical, Search, X,
  AlertCircle, Pencil, Trash2, Archive
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useSSE } from '../hooks/useSSE'
import MakeOfferModal from '../components/MakeOfferModal'
import OfferCard from '../components/OfferCard'
import { Price } from '../components/UI'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString()
}

const OFFER_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  countered: 'bg-blue-100 text-blue-800',
  expired: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-gray-300 text-gray-600',
}

export default function ChatThread() {
   const { conversationId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [messages, setMessages] = useState([])
  const [header, setHeader] = useState(null)
  const [offers, setOffers] = useState([])
  const [context, setContext] = useState(null)
  const [fulfilledQty, setFulfilledQty] = useState(null)
   const [blocked, setBlocked] = useState(false)
   const [conversationClosed, setConversationClosed] = useState(false)
   const [text, setText] = useState('')
   const [searchQuery, setSearchQuery] = useState('')
   const [loading, setLoading] = useState(true)
   const [sending, setSending] = useState(false)
   const [error, setError] = useState('')
   const [moderationError, setModerationError] = useState('')
   const [typingUser, setTypingUser] = useState(null)
   const typingTimeoutRef = useRef(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerAnchorEl, setOfferAnchorEl] = useState(null)
   const [editingId, setEditingId] = useState(null)
   const [editText, setEditText] = useState('')
   const [attaching, setAttaching] = useState(false)
   const [previewImage, setPreviewImage] = useState(null)
   const [previewFile, setPreviewFile] = useState(null)
   const [captionText, setCaptionText] = useState('')
   const [replyTo, setReplyTo] = useState(null)
   const fileInputRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('offer') === 'true' && !showOfferModal) {
      setShowOfferModal(true)
      navigate(`/messages/${conversationId}`, { replace: true })
    }
  }, [location.search, conversationId, navigate, showOfferModal])

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await api.getConversations()
      const conversations = Array.isArray(list?.conversations) ? list.conversations : []
       const conv = conversations.find((c) => String(c.conversation_id) === String(conversationId))
       setHeader(conv || null)
       if (conv?.is_blocked) setBlocked(true)
       if (conv?.conv_status === 'closed') setConversationClosed(true)

        const ctx = await api.getConversationContext(conversationId)
       setContext(ctx?.conversation || null)
       setOffers(Array.isArray(ctx?.offers) ? ctx.offers : [])
       setFulfilledQty(ctx?.fulfilled_quantity ?? null)



       const res = await api.getMessages(conversationId)
      setMessages(Array.isArray(res?.messages) ? res.messages : [])
      await api.markConversationRead(conversationId)
    } catch (err) {
      setError(err?.message || 'Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    if (conversationId) load()
  }, [conversationId, load])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, offers])

  const sseUrl = user?.id ? api.messagesStreamUrl(user.id) : null
  useSSE(sseUrl, {
    enabled: !!sseUrl && !!user,
       onMessage: (payload) => {
        try {
          if (!payload) return
           if (payload.success === true && Array.isArray(payload.messages) && payload.messages.length > 0) {
             setMessages((prev) => {
               const ids = new Set(prev.map((m) => m.id))
               const merged = [...prev]
               for (const m of payload.messages) {
                 if (m.conversation_id && String(m.conversation_id) !== String(conversationId)) continue
                 if (!ids.has(m.id)) merged.push(m)
               }
               return merged.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
             })
           }
           if (payload.type === 'message' && payload.message && String(payload.conversation_id) === String(conversationId) && payload.sender_id !== user?.id) {
             setMessages((prev) => {
               const ids = new Set(prev.map((m) => m.id))
               if (ids.has(payload.message.id)) return prev
               return [...prev, payload.message].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
             })
           }
          // Handle offer events from SSE
          if (payload.type === 'offer' && String(payload.conversation_id) === String(conversationId)) {
            load()
          }
          if (payload.type === 'offer_update' && String(payload.conversation_id) === String(conversationId)) {
            load()
          }
          if (payload.type === 'message_edited' && String(payload.conversation_id) === String(conversationId)) {
            setMessages((prev) => prev.map((m) => m.id === payload.message?.id ? { ...m, content: payload.message?.content, status: payload.message?.status } : m))
          }
          if (payload.type === 'message_deleted' && String(payload.conversation_id) === String(conversationId)) {
             setMessages((prev) => prev.map((m) => m.id === payload.message_id ? { ...m, status: 'DELETED', content: '[deleted]' } : m))
           }
           if (payload.type === 'read_receipt' && String(payload.conversation_id) === String(conversationId) && payload.reader_id !== user?.id) {
             setMessages((prev) => prev.map((m) => m.sender_id === user?.id ? { ...m, status: 'READ' } : m))
           }
           if (payload.type === 'typing' && String(payload.conversation_id) === String(conversationId) && payload.user_id !== user?.id) {
              setTypingUser(payload.user_id)
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
              typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000)
            }
            if (payload.type === 'conversation_reopened' && String(payload.conversation_id) === String(conversationId) && payload.user_id !== user?.id) {
              setConversationClosed(false)
            }
        } catch (err) {
          console.error('SSE handler error:', err)
        }
      },
  })

const sendTyping = (() => {
  let timer = null
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (!conversationId || blocked) return
      api.sendTypingIndicator(conversationId).catch(() => {})
    }, 500)
  }
})()

const handleSend = async (e) => {
    e?.preventDefault?.()
    const content = text.trim()
    if (!content || sending || blocked) return
    const recipientId = header?.other_id
    if (!recipientId) return
    setSending(true)
    setModerationError('')
    setError('')

    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      sender_id: user?.id,
      content,
      created_at: new Date().toISOString(),
      message_type: 'text',
      conversation_id: conversationId,
      reply_to_message_id: replyTo?.id || null,
    }
    setMessages((prev) => [...prev, optimisticMessage])
    setText('')

     try {
      const opts = replyTo ? { replyToMessageId: replyTo.id } : {}
      const res = await api.sendMessage(recipientId, content, opts)
      const success = res?.success !== false
      const errorCode = res?.code

       if (errorCode === 'MODERATED') {
         setMessages((prev) => prev.filter((m) => m.id !== tempId))
         setModerationError(res?.message || 'Message was blocked by our safety filters.')
       } else if (errorCode === 'BLOCKED') {
         setMessages((prev) => prev.filter((m) => m.id !== tempId))
         setBlocked(true)
       } else if (errorCode === 'CLOSED') {
         setMessages((prev) => prev.filter((m) => m.id !== tempId))
         setConversationClosed(true)
       } else if (success) {
        const newMessage = res?.message || res?.data?.message || (Array.isArray(res?.messages) && res.messages[0])
        if (newMessage) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...newMessage, id: newMessage.id || m.id } : m)))
        } else {
          load()
        }
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        setError(res?.message || 'Failed to send message')
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setError(err?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleOfferCreated = (offer) => {
    setOffers((prev) => [offer, ...prev])
    setShowOfferModal(false)
  }

  const handleOfferAction = async (offerId, action, counterOffer = null) => {
    try {
      await api.updateOffer(offerId, action, counterOffer)
      load()
    } catch (err) {
      setError(err?.message || 'Failed to update offer')
    }
  }

  const [reportMessage, setReportMessage] = useState(null)
  const [reportCategories] = useState(['spam', 'scam', 'harassment', 'fraud', 'prohibited_contact', 'inappropriate', 'other'])
  const [reportCategory, setReportCategory] = useState('')

  const handleReportMessage = (messageId) => {
    setReportMessage({ id: messageId })
    setReportCategory('')
  }

  const submitReport = async () => {
    if (!reportMessage || !reportCategory) return
    try {
      await api.reportMessage(reportMessage.id, reportCategory)
      toast.success('Report submitted. Thank you.')
    } catch (err) {
      toast.error(err?.message || 'Failed to submit report')
    }
    setReportMessage(null)
    setReportCategory('')
  }

  const startEditMessage = (msg) => {
    if (String(msg.sender_id) !== String(user?.id)) return
    setEditingId(msg.id)
    setEditText(msg.content)
  }

  const cancelEditMessage = () => {
    setEditingId(null)
    setEditText('')
  }

  const submitEditMessage = async () => {
    const content = editText.trim()
    if (!content || editingId == null) return
    try {
      const res = await api.editMessage(editingId, content)
      if (res?.success) {
        setMessages((prev) => prev.map((m) => m.id === editingId ? { ...m, content: res.message?.content || content, status: res.message?.status || m.status } : m))
      } else if (res?.code === 'MODERATED') {
        toast.error(res.message || 'Message was blocked by safety filters.')
      } else {
        toast.error(res?.message || 'Failed to edit message')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to edit message')
    } finally {
      cancelEditMessage()
    }
  }

  const handleDeleteMessage = async (messageId) => {
    const confirmed = await confirm({ title: 'Delete message?', message: 'This will remove the message for you.', type: 'danger' })
    if (!confirmed) return
    try {
      const res = await api.deleteMessage(messageId)
      if (res?.success) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, status: 'DELETED', content: '[deleted]' } : m))
      } else {
        toast.error(res?.message || 'Failed to delete message')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to delete message')
    }
  }

  const handleBlockUser = async () => {
    if (!header?.other_id) return
    const confirmed = await confirm({ title: 'Block this user?', message: 'You will not receive messages from them.', type: 'danger' })
    if (!confirmed) return
    await api.blockUser(header.other_id)
    setBlocked(true)
    toast.success('User blocked.')
  }

  const handleUnblockUser = async () => {
    if (!header?.other_id) return
    await api.unblockUser(header.other_id)
    setBlocked(false)
    toast.success('User unblocked.')
  }

  const handleArchive = async () => {
    if (!conversationId) return
    try {
      await api.archiveConversation(conversationId)
      toast.success('Conversation archived')
      navigate('/messages')
    } catch (err) {
      toast.error(err?.message || 'Failed to archive conversation')
    }
  }

  const handleClose = async () => {
    if (!conversationId) return
    const confirmed = await confirm({ title: 'Close conversation?', message: 'This will mark the conversation as closed.', type: 'warning' })
    if (!confirmed) return
    try {
      await api.closeConversation(conversationId)
      toast.success('Conversation closed')
      navigate('/messages')
    } catch (err) {
      toast.error(err?.message || 'Failed to close conversation')
    }
  }

  const handleReopenConversation = async () => {
    if (!conversationId) return
    try {
      const res = await api.reopenConversation(conversationId)
      if (res?.success) {
        setConversationClosed(false)
        toast.success('Conversation reopened')
      } else {
        toast.error(res?.message || 'Failed to reopen conversation')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to reopen conversation')
    }
  }

  const handleAttachmentSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are supported.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be under 10MB.')
      return
    }
    setPreviewFile(file)
    setPreviewImage(URL.createObjectURL(file))
    setCaptionText('')
  }

  const sendAttachment = async () => {
    if (!previewFile || !conversationId) return
    setAttaching(true)
    try {
      const res = await api.uploadMessageAttachment(conversationId, previewFile, captionText)
      if (res?.success) {
        setMessages((prev) => [...prev, res.message])
        cancelAttachment()
      } else if (res?.code === 'MODERATED') {
        toast.error(res.message || 'Message was blocked by safety filters.')
      } else {
        toast.error(res?.message || 'Failed to upload image')
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to upload image')
    } finally {
      setAttaching(false)
    }
  }

  const cancelAttachment = () => {
    if (previewImage) URL.revokeObjectURL(previewImage)
    setPreviewImage(null)
    setPreviewFile(null)
    setCaptionText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-500">Loading conversation…</div>
      </div>
    )
  }

  return (
    <div className="p-6 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/messages')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {header?.other_name || header?.other_business || 'Conversation'}
          </h1>
          {header?.other_role && (
            <p className="text-xs text-gray-500 capitalize">{header.other_role}{header.other_verified ? ' • Verified' : ''}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {blocked && <span className="text-xs text-red-600 font-medium">Blocked</span>}
          {!blocked && (
            <>
              <button onClick={handleArchive} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Archive">
                <Archive className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Close">
                <XCircle className="w-4 h-4 text-gray-500" />
              </button>
            </>
          )}
          <button
            onClick={offerAnchorEl ? () => setOfferAnchorEl(null) : (e) => setOfferAnchorEl(e.currentTarget)}
            className="p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Product / Order context banner */}
      {context?.product_name && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
          <ShoppingCart className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Product: {context.product_name}</p>
            {context.product_price && <Price amount={context.product_price} className="text-sm" />}
          </div>
        </div>
      )}
      {context?.order_number && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-gray-900">Order #{context.order_number}</p>
            <p className={`text-xs ${context.order_status === 'completed' ? 'text-green-600' : context.order_status === 'cancelled' ? 'text-red-600' : 'text-yellow-600'}`}>
              Status: {context.order_status}
            </p>
          </div>
        </div>
      )}

       {/* Quantity fulfillment indicator */}
      {context?.requested_quantity && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-700">Quantity: {fulfilledQty ?? 0} / {context.requested_quantity} tonnes fulfilled</span>
            <span className="text-xs text-gray-500">
              {fulfilledQty >= context.requested_quantity
                ? 'Fully fulfilled'
                : `${Math.max(0, context.requested_quantity - (fulfilledQty ?? 0))} tonnes still needed`}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, ((fulfilledQty ?? 0) / context.requested_quantity) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Offers panel */}
          {Array.isArray(offers) && offers.length > 0 && (
        <div className="mb-4 space-y-2">
          {offers.map((o, index) => (
            <OfferCard key={o.id ?? index} offer={o} currentUser={user} onAction={handleOfferAction} />
          ))}
        </div>
      )}

       {error && (
         <div className="mb-3 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>
       )}
       {moderationError && (
         <div className="mb-3 px-3 py-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
           <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
           <span>{moderationError}</span>
         </div>
       )}
       <div className="px-3 py-1 border-b border-gray-200">
         <div className="relative">
           <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
           <input
             type="text"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             placeholder="Search messages..."
             className="w-full pl-8 pr-3 py-1 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
           />
           {searchQuery && (
             <button
               onClick={() => setSearchQuery('')}
               className="absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
             >
               <X className="w-3 h-3" />
             </button>
           )}
         </div>
       </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
        {searchQuery && (
          <div className="px-3 py-1 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            Showing {messages.filter(m => !m.message_type?.includes('system') && m.content?.toLowerCase().includes(searchQuery.toLowerCase())).length} of {messages.filter(m => !m.message_type?.includes('system')).length} messages
          </div>
        )}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {Array.isArray(messages) && messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-12">No messages yet. Say hello!</div>
          )}
           {(Array.isArray(messages) && messages.length > 0) &&
            messages.filter(m => {
              if (searchQuery) {
                const text = (m.content || '').toLowerCase()
                return text.includes(searchQuery.toLowerCase())
              }
              return true
            }).map((m, index) => {
               const mine = String(m.sender_id) === String(user?.id)
               const isSystem = m.message_type === 'system' || m.message_type === 'offer'
               const isDeleted = m.status === 'DELETED'
               const isEditing = editingId === m.id
               return (
                 <div key={m.id || `${m.sender_id}-${m.created_at || index}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                   {isSystem && !isDeleted && (
                     <div className="max-w-[80%] px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs">
                       {m.content}
                     </div>
                   )}
                   {!isSystem && (
                     <>
                       <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm group relative ${mine ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900'} ${isDeleted ? 'opacity-50' : ''}`}>
                         {isEditing ? (
                           <>
                             <textarea
                               value={editText}
                               onChange={(e) => setEditText(e.target.value)}
                               className="w-full px-2 py-1 rounded border border-gray-300 text-gray-900 text-xs resize-none outline-none"
                               rows={2}
                               autoFocus
                             />
                             <div className="flex gap-1 mt-1 justify-end">
                               <button
                                 onClick={cancelEditMessage}
                                 className="text-[10px] px-2 py-0.5 text-gray-500 hover:bg-gray-200 rounded"
                               >
                                 Cancel
                               </button>
                               <button
                                 onClick={submitEditMessage}
                                 className="text-[10px] px-2 py-0.5 text-green-700 hover:bg-green-100 rounded"
                               >
                                 Save
                               </button>
                             </div>
                           </>
                          ) : (
                            <>
                              {m.reply_to_message_id && m.parent_content && (
                                <div className={`mb-1 pb-1 border-b ${mine ? 'border-green-700/30' : 'border-gray-200'} text-xs opacity-80`}>
                                  <span className="font-medium">{m.parent_sender_name || 'Unknown'}:</span> {m.parent_content.length > 60 ? `${m.parent_content.slice(0, 60)}…` : m.parent_content}
                                </div>
                              )}
                              {m.message_type === 'image' ? (
                                <div className="break-words">
                                  {m.content && m.content !== '[deleted]' && m.content.split('\n').find(l => l.startsWith('/images/messages/')) && (
                                    <img
                                      src={m.content.split('\n').find(l => l.startsWith('/images/messages/'))}
                                      alt="image attachment"
                                      className="max-w-[200px] max-h-[200px] object-cover rounded-lg mb-1"
                                    />
                                  )}
                                  {m.content && m.content.split('\n').some(l => !l.startsWith('/images/messages/')) && m.content.split('\n').filter(l => !l.startsWith('/images/messages/')).join('\n') && (
                                    <p className="whitespace-pre-wrap break-words text-sm">{m.content.split('\n').filter(l => !l.startsWith('/images/messages/')).join('\n')}</p>
                                  )}
                                </div>
                              ) : (
                                <p className={`whitespace-pre-wrap break-words ${isDeleted ? 'line-through' : ''}`}>{m.content}</p>
                              )}
                              <div className="flex items-center gap-1 mt-1">
                                <p className={`text-[10px] ${mine ? 'text-green-100' : 'text-gray-400'}`}>{formatTime(m.created_at)}</p>
                                {mine && !isDeleted && (
                                  <div className="hidden group-hover:flex items-center gap-1">
                                    <span className="text-[10px]">{m.status === 'READ' ? '✓✓' : m.status === 'DELIVERED' ? '✓✓' : '✓'}</span>
                                    <span className={`text-[10px] ${m.status === 'READ' ? 'text-green-200' : 'text-green-100'}`}>{m.status === 'SENT' ? 'Sent' : m.status === 'DELIVERED' ? 'Delivered' : m.status === 'READ' ? 'Read' : m.status}</span>
                                    <button
                                      onClick={() => setReplyTo({ id: m.id, sender_id: m.sender_id, sender_name: m.sender_name, content: m.content })}
                                      className="p-0.5 hover:bg-gray-200 rounded"
                                      title="Reply"
                                    >
                                      <ArrowLeftRight className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => startEditMessage(m)}
                                      className="p-0.5 hover:bg-gray-200 rounded"
                                      title="Edit"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(m.id)}
                                      className="p-0.5 hover:bg-gray-200 rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                           </>
                         )}
                       </div>
                       {!mine && !blocked && !isDeleted && (
                         <button
                           onClick={() => handleReportMessage(m.id)}
                           className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                           title="Report"
                         >
                           <Flag className="w-3 h-3" />
                         </button>
                       )}
                     </>
                   )}
                 </div>
               )
             })
           }
        </div>

         {blocked && (
           <div className="p-3 border-t border-gray-100 bg-red-50">
             <p className="text-sm text-red-700 mb-2">You have blocked this user. They cannot message you.</p>
             <button
               onClick={handleUnblockUser}
               className="text-sm text-green-700 hover:text-green-800 font-medium"
             >
               Unblock user
             </button>
           </div>
         )}

        {conversationClosed && (
          <div className="p-3 border-t border-gray-100 bg-yellow-50">
            <p className="text-sm text-yellow-800 mb-2">This conversation has been closed. You can no longer send messages.</p>
            <button
              onClick={handleReopenConversation}
              className="text-sm text-green-700 hover:text-green-800 font-medium"
            >
              Reopen conversation
            </button>
          </div>
        )}

        {replyTo && (
          <div className="p-2 border-t border-gray-100 bg-gray-50 flex items-start gap-2">
            <div className="flex-1">
              <p className="text-xs text-gray-500">Replying to {replyTo.sender_id === user?.id ? 'yourself' : replyTo.sender_name || 'user'}</p>
              <p className="text-sm text-gray-800 truncate">{replyTo.content?.split('\n').find(l => l.startsWith('/images/messages/')) ? '[image]' : (replyTo.content?.slice(0, 80) || '[deleted]')}</p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

       {typingUser && (
          <div className="px-4 py-1 text-xs text-gray-500 italic">
            {header?.other_name || 'User'} is typing...
          </div>
        )}

        <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleAttachmentSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => !blocked && fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Attach photo"
            disabled={blocked}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button type="button" className="p-2 text-gray-400 hover:text-gray-600"><Smile className="w-5 h-5" /></button>
          {header?.other_role === 'seller' && !blocked && (
            <button
              type="button"
              onClick={() => setShowOfferModal(true)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Make an offer"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
          )}
          <input
            type="text"
            value={text}
            onChange={(e) => { setText(e.target.value); sendTyping() }}
            placeholder={blocked ? 'User is blocked' : conversationClosed ? 'Conversation closed' : 'Type a message…'}
            disabled={sending || blocked || conversationClosed || !!previewImage}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:opacity-50"
          />
          <button type="submit" disabled={sending || !text.trim() || blocked || conversationClosed} className="p-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </form>

        {previewImage && (
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-3 items-end">
              <img src={previewImage} alt="preview" className="w-20 h-20 object-cover rounded-lg" />
              <div className="flex-1">
                <input
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded outline-none"
                  maxLength={500}
                />
              </div>
              <button
                onClick={sendAttachment}
                disabled={attaching}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
              >
                {attaching ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={cancelAttachment}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {showOfferModal && (
        <MakeOfferModal
          conversationId={conversationId}
          product={context?.product_name ? { name: context.product_name, price: context.product_price, image_url: context.product_image } : null}
          requestedQuantity={context?.requested_quantity}
          onClose={() => setShowOfferModal(false)}
          onCreated={handleOfferCreated}
        />
      )}

      {/* Quick actions menu */}
      {offerAnchorEl && (
        <div ref={setOfferAnchorEl} className="fixed inset-0 z-[60] flex items-start justify-end pt-12 pr-20" onClick={() => setOfferAnchorEl(null)}>
          <div className="flex flex-col gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[160px]">
            {!blocked && (
              <button onClick={handleBlockUser} className="text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                Block user
              </button>
            )}
            {blocked && (
              <button onClick={handleUnblockUser} className="text-left px-3 py-2 text-sm hover:bg-gray-50 rounded">
                Unblock user
              </button>
            )}
            {header?.other_role === 'seller' && !blocked && (
              <button
                onClick={() => { setShowOfferModal(true); setOfferAnchorEl(null) }}
                className="text-left px-3 py-2 text-sm hover:bg-gray-50 rounded"
              >
                Make an offer
              </button>
            )}
           </div>
         </div>
       )}

      {reportMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setReportMessage(null)}>
          <div className="bg-white rounded-lg shadow-xl w-80 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-3">Report message</h3>
            <select
              value={reportCategory}
              onChange={(e) => setReportCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">Select a category</option>
              {reportCategories.map((cat) => (
                <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
              ))}
            </select>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setReportMessage(null)}
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!reportCategory}
                className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
