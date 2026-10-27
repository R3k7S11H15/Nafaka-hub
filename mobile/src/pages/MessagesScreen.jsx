import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Colors } from '../components/UI'
import { Search, X, Plus, MessageSquare } from '../icons'

function timeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return d.toLocaleDateString()
}

function initials(name) {
  if (!name) return '?'
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export default function MessagesScreen({ navigation }) {
  const { user, isAuthenticated } = useContext(AuthContext)
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    load()
  }, [isAuthenticated])

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

  useEffect(() => {
    if (!showNew) return
    let cancelled = false
    if (!searchQ.trim()) { setResults([]); return }
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
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [searchQ, showNew])

  const startConversation = async (otherId) => {
    if (starting) return
    setStarting(true)
    try {
      const res = await api.sendMessage(otherId, 'Hi!')
      const convId = res?.conversation_id
      setShowNew(false)
      setSearchQ('')
      setResults([])
      if (convId && navigation?.navigate) navigation.navigate('ChatThread', { conversationId: convId })
    } catch (err) {
      setError(err?.message || 'Failed to start conversation')
    } finally {
      setStarting(false)
    }
  }

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={[styles.conversationItem, item.unread_count > 0 && styles.unreadItem]}
      activeOpacity={0.7}
      onPress={() => navigation?.navigate?.('ChatThread', { conversationId: item.conversation_id, header: item })}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(item.other_name || item.other_business)}</Text>
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationRow}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {item.other_name || item.other_business}
          </Text>
          <Text style={styles.timeText}>{timeAgo(item.last_message_at || item.updated_at)}</Text>
        </View>
        <View style={styles.conversationRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.last_message_preview || 'No messages yet'}
          </Text>
          {item.conversation_type && item.conversation_type !== 'GENERAL_BUSINESS' && (
            <Text style={styles.typeBadge}>{item.conversation_type.replace('_', ' ')}</Text>
          )}
        </View>
      </View>
      {item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadCount}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowNew(true)} style={styles.headerActionBtn}>
          <Plus width={16} height={16} color={Colors.white} />
          <Text style={styles.headerAction}>New</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>Loading conversations…</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageSquare width={48} height={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>Tap "New" to find and message other users.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.conversation_id)}
          renderItem={renderConversation}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={loading}
        />
      )}

      <Modal visible={showNew} animationType="slide" transparent onRequestClose={() => setShowNew(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New chat</Text>
              <TouchableOpacity onPress={() => { setShowNew(false); setSearchQ(''); setResults([]) }} style={styles.iconBtn}>
                <X width={20} height={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchRow}>
              <Search width={16} height={16} color={Colors.textMuted} />
              <TextInput
                autoFocus
                style={styles.searchInput}
                value={searchQ}
                onChangeText={setSearchQ}
                placeholder="Search by name, email, or phone"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.resultsBox}>
              {searching && <ActivityIndicator color={Colors.primary} />}
              {!searching && searchQ.trim() && results.length === 0 && (
                <Text style={styles.helperText}>No users found.</Text>
              )}
              {results.map((u) => (
                <TouchableOpacity
                  key={String(u.id)}
                  onPress={() => startConversation(u.id)}
                  disabled={starting}
                  style={styles.resultItem}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(u.full_name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.conversationName}>{u.full_name}</Text>
                    <Text style={styles.lastMessage}>
                      {u.role}{u.business_name ? ` • ${u.business_name}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.white },
  headerActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerAction: { fontSize: 14, fontWeight: '600', color: Colors.white, marginLeft: 4 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: Colors.textMuted },
  errorBox: { margin: 16, padding: 10, backgroundColor: '#fee2e2', borderRadius: 8 },
  errorText: { color: '#991b7c', fontSize: 13 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 16, marginBottom: 6 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  listContent: { padding: 8 },
  conversationItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginHorizontal: 16, marginVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  unreadItem: { backgroundColor: '#f0fdf4' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  conversationInfo: { flex: 1, minWidth: 0 },
  conversationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  conversationName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  timeText: { fontSize: 11, color: Colors.textMuted, marginLeft: 6 },
  lastMessage: { fontSize: 12, color: Colors.textMuted, lineHeight: 16, flex: 1 },
   typeBadge: {
     fontSize: 10, color: Colors.primary, fontWeight: '700',
     backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
     overflow: 'hidden',
   },
   unreadBadge: {
    backgroundColor: Colors.primary, minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  unreadCount: { fontSize: 11, fontWeight: '700', color: Colors.white },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  iconBtn: { padding: 4 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 0 },
  resultsBox: { marginTop: 12, gap: 6 },
  resultItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 10 },
  helperText: { color: Colors.textMuted, padding: 8, fontSize: 13 },
})