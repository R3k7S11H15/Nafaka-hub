import React, { useState, useEffect, useCallback, useContext } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, ShoppingCart, DollarSign,
  Shield, FileText, Settings, BarChart3, Download, Upload,
  UserCog, Activity, Database, Key, Bell, Search,
  Menu, X, LogOut, ChevronRight, Monitor, Globe,
  Smartphone, ShieldCheck, Plus, Edit, RefreshCw, DownloadCloud, Filter, Zap, Keyboard, Home, Trash2, Webhook, TrendingUp, LayoutTemplate, Store, Star, MessageSquare, HelpCircle, Gift, Activity as ActivityIcon, BarChart3 as BarChart3Icon, Calendar, LineChart, UserCircle2
} from 'lucide-react'
import api from '../services/api'
import storage from '../utils/storage'
import { useSSE } from '../hooks/useSSE'
import { AuthContext } from '../context/AuthContext'
import { ROLES, getRoleLabel } from '../config/roles'
import ErrorBoundary from '../components/ErrorBoundary'
import OnboardingTour from '../components/OnboardingTour'

const menuSections = [
  {
    title: 'Main',
    items: [
      { name: 'Dashboard', href: '/superadmin', icon: LayoutDashboard, end: true },
      { name: 'Users', href: '/superadmin/users', icon: Users },
      { name: 'Products', href: '/superadmin/products', icon: Package },
      { name: 'Orders', href: '/superadmin/orders', icon: ShoppingCart },
    ]
  },
  {
    title: 'Management',
    items: [
      { name: 'Sub-Admins', href: '/superadmin/sub-admins', icon: UserCog },
      { name: 'Sessions', href: '/superadmin/sessions', icon: Monitor },
      { name: 'Notifications', href: '/superadmin/notifications', icon: Bell },
      { name: 'Trash', href: '/superadmin/trash', icon: Trash2 },
      { name: 'Audit Logs', href: '/superadmin/audit', icon: FileText },
      { name: 'API Keys', href: '/superadmin/api-keys', icon: Key },
      { name: 'Backups', href: '/superadmin/backups', icon: Database },
    ]
  },
  {
    title: 'Security',
    items: [
      { name: 'MFA Enforcement', href: '/superadmin/mfa', icon: ShieldCheck },
      { name: 'Security', href: '/superadmin/security', icon: Shield },
      { name: 'Health', href: '/superadmin/health', icon: Activity },
    ]
  },
  {
    title: 'Content',
    items: [
      { name: 'Categories', href: '/superadmin/content/categories', icon: Store },
      { name: 'Content Moderation', href: '/superadmin/content/moderation', icon: Shield },
      { name: 'Featured Listings', href: '/superadmin/content/featured-listings', icon: Star },
      { name: 'Blog Posts', href: '/superadmin/content/blog', icon: FileText },
      { name: 'FAQs', href: '/superadmin/content/faqs', icon: HelpCircle },
      { name: 'Testimonials', href: '/superadmin/content/testimonials', icon: MessageSquare },
      { name: 'Partners', href: '/superadmin/content/partners', icon: Users },
      { name: 'Reviews', href: '/superadmin/content/reviews', icon: Star },
      { name: 'Contracts', href: '/superadmin/content/contracts', icon: FileText },
      { name: 'Promotions', href: '/superadmin/content/promotions', icon: Gift },
      { name: 'Templates', href: '/superadmin/content/templates', icon: LayoutTemplate },
    ]
  },
  {
    title: 'Finance',
    items: [
      { name: 'Commissions', href: '/superadmin/finance/commissions', icon: TrendingUp },
      { name: 'Tax/VAT', href: '/superadmin/finance/tax', icon: FileText },
      { name: 'Vendor Analytics', href: '/superadmin/finance/vendors/analytics', icon: BarChart3 },
    ]
  },
  {
    title: 'Monitoring',
    items: [
      { name: 'Activity Feed', href: '/superadmin/activity-feed', icon: ActivityIcon },
      { name: 'API Stats', href: '/superadmin/api-stats', icon: BarChart3Icon },
      { name: 'Scheduled Tasks', href: '/superadmin/scheduled-tasks', icon: Calendar },
      { name: 'Enhanced Metrics', href: '/superadmin/enhanced-metrics', icon: LineChart },
    ]
  },
  {
    title: 'System',
    items: [
      { name: 'Reports', href: '/superadmin/reports', icon: BarChart3 },
      { name: 'Analytics', href: '/superadmin/analytics', icon: TrendingUp },
      { name: 'Webhooks', href: '/superadmin/webhooks', icon: Webhook },
      { name: 'Settings', href: '/superadmin/settings', icon: Settings },
      { name: 'Export / Import', href: '/superadmin/export', icon: Download },
    ]
  }
]

const routeTitles = {
  '/superadmin': 'Dashboard',
  '/superadmin/users': 'Users',
  '/superadmin/products': 'Products',
  '/superadmin/orders': 'Orders',
  '/superadmin/sub-admins': 'Sub-Admins',
  '/superadmin/sessions': 'Sessions',
  '/superadmin/notifications': 'Notifications',
  '/superadmin/trash': 'Trash',
  '/superadmin/audit': 'Audit Logs',
  '/superadmin/api-keys': 'API Keys',
  '/superadmin/backups': 'Backups',
  '/superadmin/mfa': 'MFA Enforcement',
  '/superadmin/security': 'Security',
  '/superadmin/health': 'Health',
  '/superadmin/settings': 'Settings',
  '/superadmin/export': 'Export / Import',
  '/superadmin/reports': 'Reports',
  '/superadmin/analytics': 'Analytics',
  '/superadmin/webhooks': 'Webhooks',
  '/superadmin/activity-feed': 'Activity Feed',
  '/superadmin/api-stats': 'API Stats',
  '/superadmin/scheduled-tasks': 'Scheduled Tasks',
  '/superadmin/enhanced-metrics': 'Enhanced Metrics',
  '/superadmin/content/categories': 'Categories',
  '/superadmin/content/moderation': 'Content Moderation',
  '/superadmin/content/featured-listings': 'Featured Listings',
  '/superadmin/content/blog': 'Blog Posts',
  '/superadmin/content/faqs': 'FAQs',
  '/superadmin/content/testimonials': 'Testimonials',
  '/superadmin/content/partners': 'Partners',
  '/superadmin/content/reviews': 'Reviews',
  '/superadmin/content/contracts': 'Contracts',
  '/superadmin/content/promotions': 'Promotions',
  '/superadmin/content/templates': 'Templates',
  '/superadmin/finance/commissions': 'Commissions',
  '/superadmin/finance/tax': 'Tax/VAT',
  '/superadmin/finance/vendors/analytics': 'Vendor Analytics',
  '/admin/categories': 'Categories',
  '/admin/featured-listings': 'Featured Listings',
  '/admin/blog': 'Blog Posts',
  '/admin/faqs': 'FAQs',
  '/admin/testimonials': 'Testimonials',
  '/admin/partners': 'Partners',
  '/admin/reviews': 'Reviews',
  '/admin/contracts': 'Contracts',
  '/admin/promotions': 'Promotions',
  '/admin/templates': 'Templates',
  '/admin/commissions': 'Commissions',
  '/admin/tax': 'Tax/VAT',
  '/admin/vendors/analytics': 'Vendor Analytics',
  '/admin/settings': 'Settings',
  '/admin/reports': 'Reports',
}

const quickActions = [
  { name: 'Add User', href: '/superadmin/users', icon: Plus, shortcut: 'n u' },
  { name: 'View Orders', href: '/superadmin/orders', icon: ShoppingCart, shortcut: 'g o' },
  { name: 'Create Backup', href: '/superadmin/backups', icon: DownloadCloud, shortcut: 'g b' },
  { name: 'Audit Logs', href: '/superadmin/audit', icon: FileText, shortcut: 'g a' },
]

export default function SuperAdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [stats, setStats] = useState(null)
  const [sseConnected, setSseConnected] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { user, logout } = useContext(AuthContext)
  const location = useLocation()

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    logout()
  }

  const getInitials = (name) => {
    if (!name) return 'SA'
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  const realtimeUrl = api.getSuperAdminRealtimeMetrics()
  const { connected } = useSSE(realtimeUrl, {
    enabled: !!storage.getItem('auth_token'),
    autoReconnect: true,
    onMessage: (msg) => {
      if (msg.type === 'metrics') {
        setStats(msg.data)
        setSseConnected(true)
      }
    }
  })

  useEffect(() => {
    api.getSuperAdminStats().then(res => {
      if (res?.success) setStats(res.stats)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      
      if (e.key === 'Escape') {
        setShowQuickActions(false)
        setShowShortcuts(false)
        return
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShowShortcuts(s => !s)
        return
      }

      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowQuickActions(s => !s)
        return
      }

      if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        window.location.reload()
        return
      }

      if (e.key === 'm') {
        setSidebarOpen(s => !s)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getBreadcrumbs = () => {
    const crumbs = [{ name: 'Super Admin', href: '/superadmin' }]
    if (location.pathname !== '/superadmin') {
      const path = location.pathname.replace('/superadmin/', '')
      const parts = path.split('/').filter(Boolean)
      const title = routeTitles[location.pathname] || (parts.length > 0 ? parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Super Admin')
      crumbs.push({ name: title, href: location.pathname })
    }
    return crumbs
  }

  const statCards = [
    { label: 'Users', value: stats?.users?.total ?? '—', icon: Users, color: 'blue' },
    { label: 'Orders', value: stats?.orders?.total ?? '—', icon: ShoppingCart, color: 'green' },
    { label: 'Products', value: stats?.products?.total ?? '—', icon: Package, color: 'purple' },
    { label: 'Revenue', value: stats?.revenue?.monthly ?? '—', icon: DollarSign, color: 'emerald' },
  ]

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside data-tour="sidebar" className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 text-white transform transition-all duration-300 ease-in-out shadow-2xl
        lg:translate-x-0 lg:static lg:inset-auto lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg leading-tight">Super Admin</h1>
                <p className="text-xs text-gray-400">Nafaka Hub</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {menuSections.map((section) => (
              <div key={section.title}>
                <p className="px-4 mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{section.title}</p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      end={item.end}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group
                        ${isActive ? 'bg-red-600/20 text-red-400 shadow-sm' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'}
                      `}
                      onClick={() => setSidebarOpen(false)}
                    >
                      {({ isActive }) => (
                        <>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isActive ? 'bg-red-600/30 text-red-400' : 'bg-gray-800 text-gray-500 group-hover:bg-gray-700'
                          }`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <span className="flex-1">{item.name}</span>
                          {isActive && <ChevronRight className="w-4 h-4 text-red-400" />}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-xs text-gray-400">{connected ? 'Live' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-3 p-3 mt-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">{getInitials(user?.name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name || 'Super Admin'}</p>
                <p className="text-xs text-gray-500 truncate">{getRoleLabel(user?.role)}</p>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2 hover:bg-gray-800 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 lg:px-8 sticky top-0 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu className="w-5 h-5" />
              </button>
              
              <nav className="hidden md:flex items-center gap-2 text-sm">
                {getBreadcrumbs().map((crumb, idx, arr) => (
                  <React.Fragment key={crumb.href}>
                    {idx > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <NavLink
                      to={crumb.href}
                      className={`${idx === arr.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {crumb.name}
                    </NavLink>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShortcuts(true)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                title="Keyboard Shortcuts (?)"
              >
                <Keyboard className="w-5 h-5" />
              </button>
              <NavLink to="/superadmin/export" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Export">
                <Download className="w-5 h-5" />
              </NavLink>
              <NavLink to="/superadmin/settings" className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Settings">
                <Settings className="w-5 h-5" />
              </NavLink>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {showQuickActions && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-20" onClick={() => setShowQuickActions(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Type a command or search..."
                className="flex-1 outline-none text-sm"
                autoFocus
              />
              <kbd className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-600">esc</kbd>
            </div>
            <div className="p-2 max-h-80 overflow-y-auto">
              <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Quick Actions</p>
              {quickActions.map(action => (
                <NavLink
                  key={action.name}
                  to={action.href}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-sm"
                  onClick={() => setShowQuickActions(false)}
                >
                  <action.icon className="w-4 h-4 text-gray-500" />
                  <span className="flex-1">{action.name}</span>
                  <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">{action.shortcut}</kbd>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Navigation</h4>
                  <div className="space-y-2">
                    <ShortcutRow keys={['m']} description="Toggle sidebar" />
                    <ShortcutRow keys={['g', 'd']} description="Go to Dashboard" />
                    <ShortcutRow keys={['g', 'u']} description="Go to Users" />
                    <ShortcutRow keys={['g', 'o']} description="Go to Orders" />
                    <ShortcutRow keys={['g', 'a']} description="Go to Audit Logs" />
                    <ShortcutRow keys={['g', 'b']} description="Go to Backups" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Actions</h4>
                  <div className="space-y-2">
                    <ShortcutRow keys={['⌘', 'k']} description="Quick actions" />
                    <ShortcutRow keys={['⌘', 'r']} description="Refresh page" />
                    <ShortcutRow keys={['?']} description="Show shortcuts" />
                    <ShortcutRow keys={['esc']} description="Close dialog" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Logout</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to log out? You will be redirected to the login page.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <OnboardingTour onComplete={() => {}} />
    </div>
  )
}

function ShortcutRow({ keys, description }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{description}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd key={i} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">{key}</kbd>
        ))}
      </div>
    </div>
  )
}
