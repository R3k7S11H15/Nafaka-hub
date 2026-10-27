import React, { useState, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Brain, Sparkles, TrendingUp, Package, Truck, DollarSign,
  Lightbulb, ArrowUpRight, RefreshCw, Trash2, Eye, Check,
  X, MessageSquare, History, Settings, Loader2, AlertCircle,
  Zap, Shield, BarChart3, ShoppingBag, Users, Store
} from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'
import { ROLES } from '../config/roles'

const priorityConfig = {
  urgent: { color: 'bg-red-100 text-red-700 border-red-200', icon: '🔴' },
  high: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🟠' },
  medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🟡' },
  low: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🔵' },
}

const typeConfig = {
  price_alert: { label: 'Price Alert', icon: TrendingUp, color: 'text-green-600' },
  restock: { label: 'Restock', icon: Package, color: 'text-blue-600' },
  demand: { label: 'Demand', icon: BarChart3, color: 'text-purple-600' },
  purchase: { label: 'Purchase', icon: ShoppingBag, color: 'text-yellow-600' },
  listing: { label: 'Listing', icon: Store, color: 'text-orange-600' },
  insight: { label: 'Insight', icon: Lightbulb, color: 'text-indigo-600' },
}

export default function AIDashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [activeTab, setActiveTab] = useState('insights')
  const isSeller = user?.role === ROLES.SELLER
  const isAdmin = ['superadmin', 'marketplace_admin', 'finance_admin'].includes(user?.role)

  const quickActions = isSeller ? [
    { label: 'Analyze My Sales', icon: BarChart3, action: 'Can you analyze my recent sales performance?', color: 'green' },
    { label: 'Find Slow Products', icon: Package, action: 'Which of my products are not selling well?', color: 'orange' },
    { label: 'Recommend Prices', icon: DollarSign, action: 'What price should I set for my products?', color: 'blue' },
    { label: 'Find Buyers', icon: Users, action: 'Who are my best customers?', color: 'purple' },
    { label: 'Check Commissions', icon: DollarSign, action: 'Show me my commission summary', color: 'green' },
    { label: 'Predict Demand', icon: TrendingUp, action: 'What is the demand trend for my products?', color: 'blue' },
  ] : [
    { label: 'Track My Orders', icon: Truck, action: 'Where are my orders?', color: 'blue' },
    { label: 'Find Products', icon: Package, action: 'Recommend products based on my purchase history', color: 'green' },
    { label: 'Check Prices', icon: TrendingUp, action: 'What are the current market prices?', color: 'orange' },
    { label: 'Compare Prices', icon: BarChart3, action: 'Compare prices for similar products', color: 'purple' },
    { label: 'Purchase History', icon: History, action: 'Show my purchase history', color: 'blue' },
    { label: 'Get Recommendations', icon: Lightbulb, action: 'What should I buy this week?', color: 'green' },
  ]
  const [recommendations, setRecommendations] = useState([])
  const [memories, setMemories] = useState([])
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const [agentRes, recsRes, memRes] = await Promise.all([
        api.getAIAgent(),
        api.getAIRecommendations('pending'),
        api.getAIMemories(),
      ])
      if (agentRes.success) setAgent(agentRes.agent)
      if (recsRes.success) setRecommendations(recsRes.recommendations || [])
      if (memRes.success) setMemories(memRes.memories || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateInsights = async () => {
    setActionLoading(true)
    try {
      const result = await api.generateAIRecommendations()
      if (result.success) {
        await fetchData()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateRecommendation = async (id, status) => {
    try {
      await api.updateAIRecommendationStatus(id, status)
      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteMemory = async (id) => {
    try {
      await api.deleteAIMemory(id)
      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleClearMemories = async () => {
     const confirmed = await confirm({ title: 'Are you sure you want to delete all AI memories?', message: 'This cannot be undone.', type: 'danger' })
     if (!confirmed) return
    try {
      await api.clearAIMemories()
      await fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAskAI = async (question) => {
    setActionLoading(true)
    try {
      const result = await api.askAI(question)
      if (result.success) {
        toast.info(result.response)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Nafaka AI Agent</h1>
          <p className="text-gray-500 mt-1">Loading your personalized insights...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            My Nafaka AI Agent
          </h1>
          <p className="text-gray-500 mt-1">
            Your personal AI assistant — working silently to help you make better decisions.
            {agent && <span className="ml-2 inline-flex items-center gap-1 text-green-600 text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Agent Active
            </span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateInsights}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-all font-medium shadow-sm hover:shadow-md text-sm disabled:opacity-50"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh Insights
          </button>
          <NavLink to="/ai-assistant" className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm">
            <MessageSquare className="w-4 h-4" />
            Chat with Agent
          </NavLink>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100">
          <nav className="flex gap-1 px-4 pt-2">
            {[
              { id: 'insights', label: 'Insights & Recommendations', icon: Sparkles },
              { id: 'memory', label: 'AI Memory', icon: History },
              { id: 'actions', label: 'Quick Actions', icon: Zap },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'insights' && (
            <div className="space-y-6">
              {recommendations.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No recommendations yet. Click "Refresh Insights" to generate personalized recommendations.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.map(rec => {
                    const typeInfo = typeConfig[rec.type] || typeConfig.insight
                    const priority = priorityConfig[rec.priority] || priorityConfig.medium
                    return (
                      <div key={rec.id} className={`border rounded-xl p-5 hover:shadow-md transition-all ${priority.color}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <typeInfo.icon className={`w-5 h-5 ${typeInfo.color}`} />
                            <span className="text-xs font-semibold uppercase tracking-wider">{typeInfo.label}</span>
                          </div>
                          <span className="text-xs">{priority.icon}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{rec.title}</h3>
                        <p className="text-sm text-gray-600 mb-4">{rec.description}</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateRecommendation(rec.id, 'acted')}
                            className="flex-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Acted
                          </button>
                          <button
                            onClick={() => handleUpdateRecommendation(rec.id, 'dismissed')}
                            className="flex-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <X className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI Memory</h3>
                  <p className="text-sm text-gray-500">Your agent's private memory. Never shared with other users.</p>
                </div>
                <button
                  onClick={handleClearMemories}
                  className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear All
                </button>
              </div>

              {memories.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No memories stored yet. Your agent will learn from your activity.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memories.map(memory => (
                    <div key={memory.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{memory.memory_type}</span>
                          <span className="text-xs text-gray-400">Importance: {memory.importance}/10</span>
                        </div>
                        <p className="text-sm text-gray-700">{memory.content}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(memory.created_at).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(memory.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Quick AI Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleAskAI(action.action)}
                    disabled={actionLoading}
                    className={`p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-${action.color}-300 hover:bg-${action.color}-50 transition-all text-left disabled:opacity-50`}
                  >
                    <action.icon className={`w-6 h-6 text-${action.color}-600 mb-2`} />
                    <p className="text-sm font-medium text-gray-900">{action.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{action.action}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
