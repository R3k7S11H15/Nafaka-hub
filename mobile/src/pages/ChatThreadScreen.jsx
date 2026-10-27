import React, { useContext, useEffect, useRef, useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Colors } from '../components/UI'
import MakeOfferModal from '../components/MakeOfferModal'
import OfferCard from '../components/OfferCard'
import { BarChart2, Flag, MoreVertical, Send, Pencil, Trash2, Search, X, ArrowLeftRight } from '../icons'

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const REPORT_CATEGORIES = ['spam', 'scam', 'harassment', 'fraud', 'prohibited_contact', 'inappropriate', 'other']

export default function ChatThreadScreen({ route, navigation }) {
  const { user } = useContext(AuthContext)
  const conversationId = route?.params?.conversationId
  const passedHeader = route?.params?.header
  const [messages, setMessages] = useState([])
  const [header, setHeader] = useState(passedHeader || null)
   const [offers, setOffers] = useState([])
   const [context, setContext] = useState(null)
   const [fulfilledQty, setFulfilledQty] = useState(null)
   const [blocked, setBlocked] = useState(false)
  const [conversationClosed, setConversationClosed] = useState(false)
  const handleReopen = async () => {
    if (!conversationId) return
    try {
      const res = await api.reopenConversation(conversationId)
      if (res?.success) {
        setConversationClosed(false)
      } else {
        Alert.alert('Error', res?.message || 'Failed to reopen conversation')
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to reopen conversation')
    }
  }
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [moderationError, setModerationError] = useState('')
   const [searchQuery, setSearchQuery] = useState('')
   const [replyTo, setReplyTo] = useState(null)
   const typingDebounceRef = useRef(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const listRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    if (passedHeader) navigation.setOptions({ title: passedHeader.other_name || passedHeader.other_business || 'Chat' })
  }, [passedHeader, navigation])

  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const list = await api.getConversations()
        const conv = (list?.conversations || []).find((c) => String(c.conversation_id) === String(conversationId))
        if (!cancelled && conv) {
          setHeader(conv)
          navigation.setOptions({ title: conv.other_name || conv.other_business || 'Chat' })
          if (conv.is_blocked) setBlocked(true)
          if (conv.conv_status === 'closed') setConversationClosed(true)
        }

         const ctx = await api.getConversationContext(conversationId)
         if (!cancelled) {
           setOffers(ctx?.offers || [])
           setContext(ctx?.conversation || null)
           setFulfilledQty(ctx?.fulfilled_quantity ?? null)
         }

        const res = await api.getMessages(conversationId)
        if (!cancelled) setMessages(res?.messages || [])
        await api.markConversationRead(conversationId)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load conversation')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [conversationId, navigation])

  // Polling fallback for real-time updates (SSE is not available on mobile)
  useEffect(() => {
    if (!conversationId) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.getMessages(conversationId)
        setMessages(res?.messages || [])
        const list = await api.getConversations()
        const conv = (list?.conversations || []).find((c) => String(c.conversation_id) === String(conversationId))
        if (conv?.is_blocked) setBlocked(true)
        if (conv?.conv_status === 'closed') setConversationClosed(true)
        else setConversationClosed(false)
      } catch { setMessages([]) }
    }, 10000)
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [conversationId])

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: false }))
    }
  }, [messages, offers])

  const handleSend = async () => {
    const content = text.trim()
    if (!content || sending || !header?.other_id || blocked) return
    const recipientId = header.other_id

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

    setSending(true)
    setModerationError('')
    try {
      const opts = replyTo ? { replyToMessageId: replyTo.id } : {}
      const res = await api.sendMessage(recipientId, content, opts)
      if (res?.success === false && res?.code === 'MODERATED') {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        setModerationError(res.message || 'This message was blocked by our safety filters.')
      } else if (res?.success === false && res?.code === 'BLOCKED') {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        setBlocked(true)
      } else if (res?.success === false && res?.code === 'CLOSED') {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        setConversationClosed(true)
        setReplyTo(null)
      } else if (res?.message) {
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...res.message, id: res.message.id || m.id } : m))
        setReplyTo(null)
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setError(err?.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleOfferCreated = (offer) => {
    setOffers((prev) => [offer, ...prev])
    setShowOfferModal(false)
  }

  const handleOfferAction = async (offerId, action) => {
    try {
      await api.updateOffer(offerId, action)
      const ctx = await api.getConversationContext(conversationId)
      setOffers(ctx?.offers || [])
    } catch (err) {
      setError(err?.message || 'Failed to update offer')
    }
  }

  const handleReportMessage = (messageId) => {
    const buttons = REPORT_CATEGORIES.map((cat) => ({ text: cat, onPress: () => submitReport(messageId, cat) }))
    buttons.push({ text: 'Cancel', style: 'cancel', onPress: () => {} })
    Alert.alert('Report Message', 'Select a category:', buttons)
  }

  const submitReport = async (messageId, category) => {
    try {
      await api.reportMessage(messageId, category)
      Alert.alert('Reported', 'Report submitted. Thank you.')
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to submit report')
    }
  }

  const handleBlockUser = async () => {
    if (!header?.other_id) return
    Alert.alert('Block User', 'You will not receive messages from them.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: async () => {
        try {
          await api.blockUser(header.other_id)
          setBlocked(true)
          Alert.alert('Blocked', 'User blocked.')
        } catch (err) {
          Alert.alert('Error', err?.message || 'Failed to block user')
        }
      }},
    ])
  }

  const handleUnblockUser = async () => {
    if (!header?.other_id) return
    try {
      await api.unblockUser(header.other_id)
      setBlocked(false)
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to unblock user')
    }
  }

  const startEditMessage = (msg) => {
    if (String(msg.sender_id) !== String(user?.id)) return
    if (msg.status === 'DELETED') return
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
        Alert.alert('Blocked', res.message || 'Message was blocked by safety filters.')
      } else {
        Alert.alert('Error', res?.message || 'Failed to edit message')
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to edit message')
    } finally {
      cancelEditMessage()
    }
  }

  const handleDeleteMessage = (messageId) => {
    Alert.alert('Delete Message', 'Delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await api.deleteMessage(messageId)
          if (res?.success) {
            setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, status: 'DELETED', content: '[deleted]' } : m))
          }
        } catch (err) {
          Alert.alert('Error', err?.message || 'Failed to delete message')
        }
      }},
    ])
  }

  const renderMessage = ({ item }) => {
    const mine = String(item.sender_id) === String(user?.id)
    const isSystem = item.message_type === 'system' || item.message_type === 'offer'
    const isDeleted = item.status === 'DELETED'
    const isImage = item.message_type === 'image'

    if (isSystem && !isDeleted) {
      return (
        <View key={item.id} style={styles.systemRow}>
          <View style={styles.systemBubble}>
            <Text style={styles.systemText}>{item.content}</Text>
          </View>
        </View>
      )
    }

    if (isImage) {
      const urlLine = item.content ? item.content.split('\n').find((l) => l.startsWith('/images/messages/')) : null
      const captionLines = item.content ? item.content.split('\n').filter((l) => !l.startsWith('/images/messages/')).join('\n') : ''
      return (
        <View key={item.id} style={[styles.msgRow, mine ? styles.mine : styles.theirs]}>
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, isDeleted && styles.bubbleDeleted]}>
            {urlLine ? <Image source={{ uri: urlLine.replace('/images/messages/', '') }} style={styles.imageMsg} resizeMode="cover" /> : null}
            {captionLines ? <Text style={mine ? styles.textMine : styles.textTheirs}>{captionLines}</Text> : null}
            <View style={styles.timeRow}>
              <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>{formatTime(item.created_at)}</Text>
              {mine && item.status === 'READ' && <Text style={styles.readCheck}>✓✓</Text>}
            </View>
          </View>
        </View>
      )
    }

    const isEditing = editingId === item.id

     return (
       <View key={item.id || `${item.sender_id}-${item.created_at}`} style={[styles.msgRow, mine ? styles.mine : styles.theirs]}>
         <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, isDeleted && styles.bubbleDeleted]}>
           {item.reply_to_message_id && item.parent_content && !isEditing ? (
             <View style={styles.replyContext}>
               <Text style={styles.replySender}>{item.parent_sender_name || 'Unknown'}:</Text>
               <Text style={styles.replyContent} numberOfLines={2}>
                 {item.parent_content.length > 80 ? `${item.parent_content.slice(0, 80)}…` : item.parent_content}
               </Text>
             </View>
           ) : null}
           {isEditing ? (
             <>
               <TextInput
                 style={[styles.editInput, { backgroundColor: mine ? '#dcfce7' : Colors.white, color: Colors.text }]}
                 value={editText}
                 onChangeText={setEditText}
                 multiline
                 autoFocus
                 placeholder="Edit message..."
                 placeholderTextColor={Colors.textMuted}
               />
               <View style={styles.editActions}>
                 <TouchableOpacity onPress={cancelEditMessage}>
                   <Text style={styles.cancelEdit}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={submitEditMessage}>
                   <Text style={styles.saveEdit}>Save</Text>
                 </TouchableOpacity>
               </View>
             </>
           ) : (
             <>
               <Text style={[mine ? styles.textMine : styles.textTheirs, isDeleted && styles.deletedText]}>{item.content}</Text>
               <View style={styles.timeRow}>
                 <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>{formatTime(item.created_at)}</Text>
                 {mine && (
                   <Text style={[styles.readCheck, { color: item.status === 'READ' ? '#93c5fd' : '#94a3b8' }]}>
                     {item.status === 'DELIVERED' || item.status === 'READ' ? '✓✓' : '✓'}
                   </Text>
                 )}
                 {mine && !isDeleted && (
                   <View style={styles.editDeleteRow}>
                     <TouchableOpacity onPress={() => setReplyTo(item)} style={styles.msgActionBtn}>
                       <ArrowLeftRight width={14} height={14} color={mine ? '#dcfce7' : Colors.textMuted} />
                     </TouchableOpacity>
                     <TouchableOpacity onPress={() => startEditMessage(item)} style={styles.msgActionBtn}>
                       <Pencil width={14} height={14} color={mine ? '#dcfce7' : Colors.textMuted} />
                     </TouchableOpacity>
                     <TouchableOpacity onPress={() => handleDeleteMessage(item.id)} style={styles.msgActionBtn}>
                       <Trash2 width={14} height={14} color={mine ? '#dcfce7' : Colors.textMuted} />
                     </TouchableOpacity>
                   </View>
                 )}
               </View>
               {!mine && !isDeleted && (
                 <TouchableOpacity onPress={() => handleReportMessage(item.id)} style={styles.reportBtn}>
                   <Flag width={12} height={12} color={Colors.textMuted} />
                 </TouchableOpacity>
               )}
             </>
           )}
         </View>
       </View>
     )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header?.product_name ? (
          <View style={styles.contextBanner}>
            <Text style={styles.contextText}>In context of: {header.product_name}</Text>
          </View>
        ) : null}

         {header?.order_number ? (
           <View style={styles.contextBanner}>
             <Text style={styles.contextText}>Order #{header.order_number} — Status: {header.order_status}</Text>
           </View>
         ) : null}

          {context?.requested_quantity ? (
            <View style={styles.quantityBar}>
              <Text style={styles.quantityText}>Quantity: {fulfilledQty ?? 0} / {context.requested_quantity} tonnes fulfilled</Text>
              <View style={styles.quantityProgress}>
                <View style={[styles.quantityFill, { width: `${Math.min(100, ((fulfilledQty ?? 0) / context.requested_quantity) * 100)}%` }]} />
              </View>
              {fulfilledQty >= context.requested_quantity ? (
                <Text style={styles.quantitySubtext}>Fully fulfilled</Text>
              ) : (
                <Text style={styles.quantitySubtext}>{Math.max(0, context.requested_quantity - (fulfilledQty ?? 0))} tonnes still needed</Text>
              )}
            </View>
          ) : null}

         {moderationError ? (
          <View style={styles.moderationBanner}>
            <Text style={styles.moderationText}>{moderationError}</Text>
          </View>
        ) : null}

        {offers.length > 0 ? (
          <View style={styles.offersContainer}>
            {offers.map((offer) => (
              <OfferCard key={String(offer.id)} offer={offer} currentUser={user} onAction={handleOfferAction} />
            ))}
          </View>
        ) : null}

        <View style={styles.searchBar}>
          <Search width={16} height={16} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search messages..."
            placeholderTextColor={Colors.textMuted}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
              <X width={14} height={14} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {searchQuery ? (
          <View style={styles.searchResultsBar}>
            <Text style={styles.searchResultsText}>
              Showing {messages.filter(m => !m.message_type?.includes('system') && (m.content || '').toLowerCase().includes(searchQuery.toLowerCase())).length} of {messages.filter(m => !m.message_type?.includes('system')).length} messages
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages.filter((m) => {
              if (!searchQuery.trim()) return true
              const text = (m.content || '').toLowerCase()
              return text.includes(searchQuery.toLowerCase())
            })}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {blocked ? (
          <View style={styles.blockedBanner}>
            <Text style={styles.blockedText}>You have blocked this user</Text>
            <TouchableOpacity onPress={handleUnblockUser}>
              <Text style={styles.unblockLink}>Unblock</Text>
            </TouchableOpacity>
          </View>
         ) : null}

        {conversationClosed && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedText}>This conversation has been closed</Text>
            <TouchableOpacity onPress={handleReopen} style={styles.reopenBtn}>
              <Text style={styles.reopenText}>Reopen</Text>
            </TouchableOpacity>
          </View>
         )}

         {replyTo && (
           <View style={styles.replyContextBar}>
             <View style={styles.replyContextContent}>
               <Text style={styles.replyContextLabel}>Replying to {replyTo.sender_id === user?.id ? 'yourself' : replyTo.sender_name || 'user'}</Text>
               <Text style={styles.replyContextPreview} numberOfLines={2}>
                 {(replyTo.content || '').includes('/images/messages/')
                   ? '[image]'
                   : ((replyTo.content || '').slice(0, 80) + ((replyTo.content || '').length > 80 ? '…' : ''))}
               </Text>
             </View>
             <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyContextDismiss}>
               <X width={16} height={16} color={Colors.textMuted} />
             </TouchableOpacity>
           </View>
         )}

         <View style={styles.inputBar}>
          <TouchableOpacity
            onPress={() => setShowActions(true)}
            style={styles.moreBtn}
            activeOpacity={0.7}
          >
            <MoreVertical width={20} height={20} color={Colors.textMuted} />
          </TouchableOpacity>
          {header?.other_role === 'seller' && !blocked && !conversationClosed ? (
            <TouchableOpacity onPress={() => setShowOfferModal(true)} style={styles.offerBtn} activeOpacity={0.7}>
              <BarChart2 width={20} height={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(val) => {
              setText(val)
              if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
              typingDebounceRef.current = setTimeout(() => {
                if (!conversationId || blocked || conversationClosed || !val.trim()) return
                api.sendTypingIndicator(conversationId).catch(() => {})
              }, 500)
            }}
            placeholder={blocked ? 'User is blocked' : conversationClosed ? 'Conversation closed' : 'Type a message...'}
            placeholderTextColor={Colors.textMuted}
            multiline
            editable={!blocked && !conversationClosed}
          />
           <TouchableOpacity
             onPress={handleSend}
             disabled={sending || !text.trim() || blocked || conversationClosed}
             style={[styles.sendBtn, (!text.trim() || sending || blocked || conversationClosed) && styles.sendBtnDisabled]}>
            activeOpacity={0.7}
          >
            <Send width={20} height={20} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {showOfferModal && (
          <MakeOfferModal
            visible={showOfferModal}
            conversationId={conversationId}
            product={context?.product_name ? { name: context.product_name, price: context.product_price, image_url: context.product_image } : null}
            requestedQuantity={context?.requested_quantity}
            onClose={() => setShowOfferModal(false)}
            onCreated={handleOfferCreated}
          />
        )}

        <Modal visible={showActions} transparent animationType="fade" onRequestClose={() => setShowActions(false)}>
          <TouchableOpacity style={styles.actionsOverlay} activeOpacity={1} onPress={() => setShowActions(false)}>
          <View style={styles.actionsMenu}>
            <TouchableOpacity onPress={() => { setShowActions(false); setSearchQuery('') }} style={styles.actionItem}>
              {searchQuery ? <X width={20} height={20} color={Colors.text} /> : <Search width={20} height={20} color={Colors.text} />}
              <Text style={styles.actionLabel}>{searchQuery ? 'Clear Search' : 'Search Messages'}</Text>
            </TouchableOpacity>
            {!blocked && header?.other_role === 'seller' ? (
              <TouchableOpacity onPress={() => { setShowActions(false); setShowOfferModal(true) }} style={styles.actionItem}>
                <BarChart2 width={20} height={20} color={Colors.text} />
                <Text style={styles.actionLabel}>Make an Offer</Text>
              </TouchableOpacity>
            ) : null}
            {!blocked ? (
              <TouchableOpacity onPress={async () => {
                setShowActions(false)
                try { await api.archiveConversation(conversationId); navigation.navigate('Messages') } catch (e) { console.warn(e) }
              }} style={styles.actionItem}>
                <Text style={styles.actionLabel}>Archive Conversation</Text>
              </TouchableOpacity>
            ) : null}
            {!blocked ? (
              <TouchableOpacity onPress={async () => {
                setShowActions(false)
                try { await api.closeConversation(conversationId); navigation.navigate('Messages') } catch (e) { console.warn(e) }
              }} style={styles.actionItem}>
                <Text style={styles.actionLabel}>Close Conversation</Text>
              </TouchableOpacity>
            ) : null}
            {!blocked ? (
              <TouchableOpacity onPress={() => { setShowActions(false); handleBlockUser() }} style={styles.actionItem}>
                <Text style={[styles.actionLabel, { color: Colors.danger }]}>Block User</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { setShowActions(false); handleUnblockUser() }} style={styles.actionItem}>
                <Text style={[styles.actionLabel, { color: Colors.success }]}>Unblock User</Text>
              </TouchableOpacity>
            )}
          </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 12, paddingBottom: 80 },
  contextBanner: { padding: 8, backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderBottomColor: '#dcfce7' },
  contextText: { fontSize: 12, color: '#16a34a', textAlign: 'center' },
  moderationBanner: { padding: 8, backgroundColor: '#fffbeb', borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  moderationText: { fontSize: 12, color: '#92400e', textAlign: 'center' },
  offersContainer: { paddingHorizontal: 12, paddingBottom: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 4 },
  searchClearBtn: { padding: 4 },
  msgRow: { marginVertical: 3, flexDirection: 'row' },
  mine: { justifyContent: 'flex-end' },
  theirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  bubbleDeleted: { opacity: 0.6 },
  deletedText: { textDecorationLine: 'line-through' },
  textMine: { color: Colors.white, fontSize: 14 },
  textTheirs: { color: Colors.text, fontSize: 14 },
  systemRow: { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  systemBubble: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  systemText: { fontSize: 11, color: '#6b7280' },
  time: { fontSize: 10, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  timeMine: { color: '#dcfce7', alignSelf: 'flex-end' },
  timeTheirs: { color: Colors.textMuted, alignSelf: 'flex-end' },
  editDeleteRow: { flexDirection: 'row', gap: 2, marginLeft: 4 },
  msgActionBtn: { padding: 2 },
  reportBtn: { position: 'absolute', right: -24, top: 2 },
  readCheck: { fontSize: 10, color: '#93c5fd' },
  editInput: { minHeight: 36, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, fontSize: 14 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelEdit: { fontSize: 12, color: Colors.textMuted },
  saveEdit: { fontSize: 12, fontWeight: '600', color: Colors.success },
  imageMsg: { width: 150, height: 150, borderRadius: 10, marginBottom: 4 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 10, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  moreBtn: { padding: 4 },
  offerBtn: {
    padding: 6, backgroundColor: Colors.background, borderRadius: 20,
    border: 1, borderColor: Colors.border,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: Colors.background,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.text,
  },
  sendBtn: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled: { opacity: 0.5 },
  errorText: { color: '#991b7c', fontSize: 12, paddingHorizontal: 14, paddingBottom: 4 },
  blockedBanner: {
    padding: 12, backgroundColor: '#fee2e2', borderTopWidth: 1, borderTopColor: '#fecaca', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  closedBanner: {
    padding: 8, backgroundColor: '#fef3c7', borderBottomWidth: 1, borderBottomColor: '#fde68a',
  },
  closedText: {
    fontSize: 12, color: '#92400e', textAlign: 'center', fontWeight: '600',
  },
  reopenBtn: {
    alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: '#16a34a', borderRadius: 4,
  },
  reopenText: {
    fontSize: 12, color: Colors.white, fontWeight: '600',
  },
  blockedText: { fontSize: 13, color: '#991b7c', fontWeight: '600' },
  unblockLink: { fontSize: 13, color: Colors.success, fontWeight: '600' },
   replyContext: {
     borderTopWidth: 1,
     borderTopColor: '#e5e7eb',
     backgroundColor: '#f9fafb',
     paddingHorizontal: 12,
     paddingVertical: 8,
   },
   replySender: {
     fontSize: 11,
     fontWeight: '600',
     color: '#6b7280',
     marginBottom: 2,
   },
   replyContent: {
     fontSize: 12,
     color: '#374151',
     opacity: 0.8,
   },
   searchResultsBar: {
     paddingHorizontal: 12,
     paddingVertical: 4,
     backgroundColor: '#f9fafb',
     borderBottomWidth: 1,
     borderBottomColor: Colors.border,
   },
   searchResultsText: {
     fontSize: 11,
     color: Colors.textMuted,
     textAlign: 'center',
   },
   quantityBar: {
     padding: 10,
     backgroundColor: '#f0fdf4',
     borderBottomWidth: 1,
     borderBottomColor: '#dcfce7',
   },
   quantityText: {
     fontSize: 12,
     color: '#16a34a',
     fontWeight: '600',
     marginBottom: 4,
   },
   quantityProgress: {
     width: '100%',
     height: 6,
     backgroundColor: '#dcfce7',
     borderRadius: 3,
     overflow: 'hidden',
     marginBottom: 2,
   },
   quantityFill: {
     height: '100%',
     backgroundColor: '#16a34a',
     borderRadius: 3,
   },
   quantitySubtext: {
     fontSize: 10,
     color: '#16a34a',
     opacity: 0.8,
     textAlign: 'right',
   },
   replyContextBar: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 10,
     paddingVertical: 8,
     backgroundColor: '#f9fafb',
     borderTopWidth: 1,
     borderTopColor: '#e5e7eb',
   },
   replyContextContent: {
     flex: 1,
   },
   replyContextLabel: {
     fontSize: 11,
     color: '#6b7280',
     fontWeight: '600',
   },
   replyContextPreview: {
     fontSize: 13,
     color: '#374151',
     opacity: 0.8,
     marginTop: 2,
   },
   replyContextDismiss: {
     padding: 4,
   },
   actionsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  actionsMenu: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 8, paddingBottom: 20 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  actionLabel: { fontSize: 15, color: Colors.text },
})
