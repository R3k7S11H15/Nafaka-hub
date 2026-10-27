import React, { useState, useContext, useCallback } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, ShoppingCart, Store,
  Warehouse, Truck, Package, Gavel, MessageSquare,
  ClipboardCheck, Shield, Navigation, Banknote,
  CloudRain, Globe, Users, BarChart3, Gift,
  MapPin, HelpCircle, Leaf, LineChart, Home as HomeIcon,
  LogOut, Bell, Search, Menu, X, ShoppingBag,
  Facebook, Twitter, Instagram, Mail, Phone, MapPin as MapPinIcon,
  User, Heart, SettingsIcon, FileText, PackageCheck, TruckIcon, ClipboardList, Star, CreditCard, MapPin as AddressIcon, DollarSign, Sprout, FlaskConical, Wrench,
  Smartphone, Brain, Landmark, Users as UsersIcon, FileSignature, Calendar as CalendarIcon, ChevronDown, Clock,
  ArrowDownRight, ArrowUpRight, UserCog, Key, Database, Activity, Download, Settings, LayoutTemplate, CheckSquare, Building2
} from 'lucide-react'

import api from './services/api'
import { useSSE } from './hooks/useSSE'
import { ROLES, getRoleLabel } from './config/roles'
import { AuthenticatedRoutes, PublicRoutes } from './routes/index'
import { CartContext } from './context/CartContext'
import { AuthContext, useAuth } from './context/AuthContext'
import { Button, Badge, Input } from './components/UI'
import SuperAdminLayout from './layouts/SuperAdminLayout'
import PendingApprovalScreen from './pages/PendingApprovalScreen'

const footerLinks = [
  {
    title: 'Marketplace',
    links: [
      { name: 'Products', href: '/products' },
      { name: 'Market Prices', href: '/market-prices' },
      { name: 'Wholesalers', href: '/wholesalers' },
      { name: 'Wishlist', href: '/wishlist' },
    ],
  },
  {
    title: 'Services',
    links: [
      { name: 'Bulk Purchase', href: '/bulk-purchase' },
      { name: 'Transport', href: '/transport' },
      { name: 'Storage', href: '/storage-services' },
      { name: 'Escrow', href: '/escrow' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Careers', href: '/careers' },
      { name: 'Blog', href: '/blog' },
    ],
  },
]

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Nafaka Hub</h3>
                <p className="text-xs text-gray-400">Tanzania</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4">Tanzania's leading agricultural marketplace connecting farmers, wholesalers, and buyers.</p>
            <div className="flex gap-3">
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"><Twitter className="w-4 h-4" /></a>
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"><Instagram className="w-4 h-4" /></a>
            </div>
          </div>
          {footerLinks.map((section, i) => (
            <div key={i}>
              <h4 className="font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <NavLink to={link.href} className="text-sm text-gray-400 hover:text-white transition-colors">{link.name}</NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <MapPinIcon className="w-4 h-4 text-green-500" /> Morogoro, Tanzania
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="w-4 h-4 text-green-500" /> +255 710 379 317
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="w-4 h-4 text-green-500" /> info@nafakahub.co.tz
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p> 2026 Nafaka Hub Tanzania. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

function App() {
   const [sidebarOpen, setSidebarOpen] = useState(false)
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
   const [servicesOpen, setServicesOpen] = useState(false)
   const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const { cartItems, fetchCart } = useContext(CartContext)
  const { user, logout } = useContext(AuthContext)
  const cartItemCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0)

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await api.getNotifications(user.id, { unreadOnly: true })
      if (data.success) {
        setUnreadNotificationCount(data.notifications?.length || 0)
      }
    } catch {
      setUnreadNotificationCount(0)
    }
  }, [user])

  const { connected: notifSseConnected } = useSSE(
    user?.id ? `/api/notifications_realtime.php?customer_id=${user.id}` : null,
    {
      onMessage: (event) => {
        if (!event || event.type === 'error' || event.type === 'initial') return
        switch (event.type) {
          case 'notification':
            setUnreadNotificationCount(prev => prev + 1)
            break
          case 'unread_count':
            if (event.unread_count !== undefined) {
              setUnreadNotificationCount(event.unread_count)
            }
            break
          default:
            break
        }
      },
    }
  )

  React.useEffect(() => {
    if (user?.id) {
      fetchCart()
      fetchNotifications()
    }
  }, [user, fetchCart, fetchNotifications])

  const userRole = user?.role || 'customer'
  const isLoggedIn = !!user
  const { pendingApproval, loading: authLoading } = useAuth()

  const [globalSearch, setGlobalSearch] = useState('')

  const handleGlobalSearch = (e) => {
    e.preventDefault()
    const q = globalSearch.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
    setGlobalSearch('')
  }

  const handleLogout = () => {
    logout()
  }

  const services = [
    { name: 'Bulk Purchase', href: '/bulk-purchase', desc: 'Order grain in bulk at wholesale prices' },
    { name: 'Transport', href: '/transport', desc: 'Book trucks and logistics providers' },
    { name: 'Escrow', href: '/escrow', desc: 'Secure payments with buyer protection' },
    { name: 'Certified Seeds', href: '/seeds', desc: 'TOSCI-verified seed varieties' },
    { name: 'Fertilizers', href: '/fertilizers', desc: 'Organic and chemical fertilizers' },
    { name: 'Farm Equipment', href: '/farm-equipment', desc: 'Tractors, tools & machinery' },
    { name: 'Storage Services', href: '/storage-services', desc: 'Warehouses and silos nationwide' },
    { name: 'Logistics', href: '/logistics-services', desc: 'End-to-end supply chain solutions' },
    { name: 'Agricultural Financing', href: '/agri-financing', desc: 'Loans and credit for farmers' },
    { name: 'Crop Insurance', href: '/crop-insurance', desc: 'Protect against weather and pests' },
    { name: 'Export Services', href: '/export-services', desc: 'Documentation & market access' },
  ]

  const topNavServices = [
    { name: 'Bulk Purchase', href: '/bulk-purchase' },
    { name: 'Transport Marketplace', href: '/transport' },
    { name: 'Storage Services', href: '/storage-services' },
    { name: 'Logistics Services', href: '/logistics-services' },
    { name: 'Warehouse Booking', href: '/warehouse-booking' },
    { name: 'Escrow Payments', href: '/escrow' },
    { name: 'Agricultural Financing', href: '/agri-financing' },
    { name: 'Crop Insurance', href: '/crop-insurance' },
    { name: 'Export Services', href: '/export-services' },
    { name: 'Smart Logistics', href: '/logistics' },
  ]

   const getSidebarForRole = () => {
    switch (userRole) {
      case ROLES.SELLER:
        return [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'My Store', href: '/sell-products', icon: Store },
          { name: 'Products', href: '/products', icon: Package },
          { name: 'Fulfillments', href: '/fulfillments', icon: Building2 },
          { name: 'Orders', href: '/my-orders', icon: ClipboardList },
          { name: 'Customers', href: '/seller/customers', icon: Users },
          { name: 'Analytics', href: '/analytics', icon: BarChart3 },
          { name: 'Warehouse', href: '/warehouse', icon: Warehouse },
          { name: 'Delivery', href: '/transport', icon: TruckIcon },
          { name: 'Messages', href: '/messages', icon: MessageSquare },
          { name: 'Reviews', href: '/my-reviews', icon: Star },
          { name: 'Withdrawals', href: '/seller/withdrawals', icon: DollarSign },
          { name: 'Promotions', href: '/loyalty', icon: Gift },
          { name: 'Subscriptions', href: '/subscription-plans', icon: PackageCheck },
          { name: 'Settings', href: '/settings', icon: SettingsIcon },
        ]
      case ROLES.SUPERADMIN:
        return [
          { name: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
          { name: 'User Management', href: '/superadmin/users', icon: Users },
          { name: 'Products', href: '/superadmin/products', icon: Package },
          { name: 'Orders', href: '/superadmin/orders', icon: ShoppingCart },
          { name: 'Sub-Admins', href: '/superadmin/sub-admins', icon: UserCog },
          { name: 'Audit Logs', href: '/superadmin/audit', icon: FileText },
          { name: 'API Keys', href: '/superadmin/api-keys', icon: Key },
          { name: 'Backups', href: '/superadmin/backups', icon: Database },
          { name: 'System Health', href: '/superadmin/health', icon: Activity },
          { name: 'Settings', href: '/superadmin/settings', icon: Settings },
          { name: 'Export / Import', href: '/superadmin/export', icon: Download },
        ]
      case ROLES.MARKETPLACE_ADMIN:
        return [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Products', href: '/products', icon: Package },
          { name: 'Product Approvals', href: '/marketplace/approvals', icon: ClipboardCheck },
          { name: 'Categories', href: '/admin/categories', icon: Store },
          { name: 'Featured Listings', href: '/admin/featured-listings', icon: Star },
          { name: 'Sellers', href: '/sellers', icon: Users },
          { name: 'Reported Products', href: '/marketplace/reported', icon: Shield },
          { name: 'Orders', href: '/my-orders', icon: ClipboardList },
          { name: 'Analytics', href: '/analytics', icon: BarChart3 },
          { name: 'Blog', href: '/admin/blog', icon: FileText },
          { name: 'FAQs', href: '/admin/faqs', icon: HelpCircle },
          { name: 'Testimonials', href: '/admin/testimonials', icon: MessageSquare },
          { name: 'Partners', href: '/admin/partners', icon: Users },
          { name: 'Reviews', href: '/admin/reviews', icon: Star },
          { name: 'Contracts', href: '/admin/contracts', icon: FileText },
          { name: 'Promotions', href: '/admin/promotions', icon: Gift },
          { name: 'Templates', href: '/admin/templates', icon: LayoutTemplate },
          { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
          { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
          { name: 'Notifications', href: '/notifications', icon: Bell },
        ]
      case ROLES.VENDOR_ADMIN:
        return [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Vendor Applications', href: '/vendor/applications', icon: Users },
          { name: 'Logistics Applications', href: '/admin/logistics-applications', icon: Truck },
          { name: 'Vendor Verification', href: '/vendor/verification', icon: ClipboardCheck },
          { name: 'Active Vendors', href: '/sellers', icon: Store },
          { name: 'My Products', href: '/vendor/products', icon: Package },
          { name: 'My Orders', href: '/vendor/orders', icon: ClipboardList },
          { name: 'Commissions', href: '/vendor/commissions', icon: DollarSign },
          { name: 'Withdrawals', href: '/vendor/withdrawals', icon: Banknote },
          { name: 'Vendor Analytics', href: '/admin/vendors/analytics', icon: BarChart3 },
          { name: 'Suspended Vendors', href: '/vendor/suspended', icon: Shield },
          { name: 'Reports', href: '/vendor/reports', icon: FileText },
          { name: 'Contracts', href: '/vendor/contracts', icon: FileText },
          { name: 'Communications', href: '/vendor/communications', icon: MessageSquare },
          { name: 'Bulk Actions', href: '/vendor/bulk-actions', icon: CheckSquare },
          { name: 'Audit Logs', href: '/vendor/audit', icon: FileText },
          { name: 'Subscription Plans', href: '/vendor/plans', icon: PackageCheck },
          { name: 'Settings', href: '/vendor/settings', icon: SettingsIcon },
          { name: 'Notifications', href: '/notifications', icon: Bell },
        ]
      case ROLES.WAREHOUSE_MANAGER:
        return [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Warehouses', href: '/warehouse', icon: Warehouse },
          { name: 'Inventory', href: '/warehouse/inventory', icon: Package },
          { name: 'Storage Services', href: '/storage-services', icon: Warehouse },
          { name: 'Warehouse Booking', href: '/warehouse-booking', icon: ClipboardList },
          { name: 'Inward/Outward', href: '/warehouse/movements', icon: PackageCheck },
          { name: 'Reports', href: '/analytics', icon: BarChart3 },
          { name: 'Notifications', href: '/notifications', icon: Bell },
          { name: 'Settings', href: '/settings', icon: SettingsIcon },
        ]
      case ROLES.TRANSPORT_MANAGER:
        return [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Shipments', href: '/transport', icon: TruckIcon },
          { name: 'Active Deliveries', href: '/transport/deliveries', icon: Navigation },
          { name: 'Logistics', href: '/logistics', icon: Truck },
          { name: 'Drivers', href: '/transport/drivers', icon: Users },
          { name: 'Routes', href: '/transport/routes', icon: MapPin },
          { name: 'Reports', href: '/analytics', icon: BarChart3 },
          { name: 'Notifications', href: '/notifications', icon: Bell },
          { name: 'Settings', href: '/settings', icon: SettingsIcon },
        ]
      case ROLES.CUSTOMER_SUPPORT:
        return [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Support Tickets', href: '/messages', icon: MessageSquare },
          { name: 'Live Chat', href: '/messages', icon: MessageSquare },
          { name: 'User Management', href: '/admin', icon: Users },
          { name: 'Disputes', href: '/admin/disputes', icon: HelpCircle },
          { name: 'FAQ Management', href: '/admin/faqs', icon: FileText },
          { name: 'Help Center', href: '/help-center', icon: HelpCircle },
          { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
          { name: 'Notifications', href: '/notifications', icon: Bell },
          { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
        ]
      case ROLES.FINANCE_ADMIN:
        return [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Transactions', href: '/finance/transactions', icon: DollarSign },
          { name: 'Vendor Payouts', href: '/finance/payouts', icon: Banknote },
          { name: 'Commissions', href: '/finance/commissions', icon: TrendingUp },
          { name: 'Refunds', href: '/finance/refunds', icon: PackageCheck },
          { name: 'Invoices', href: '/finance/invoices', icon: FileText },
          { name: 'Statements', href: '/finance/statements', icon: FileText },
          { name: 'Payment Gateways', href: '/finance/payment-methods', icon: CreditCard },
          { name: 'Tax/VAT', href: '/admin/tax', icon: FileText },
          { name: 'Revenue', href: '/revenue-dashboard', icon: BarChart3 },
          { name: 'Financial Reports', href: '/admin/reports', icon: FileText },
          { name: 'Escrow', href: '/escrow', icon: Shield },
          { name: 'Notifications', href: '/notifications', icon: Bell },
          { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
        ]
      case ROLES.CUSTOMER:
      default:
        return [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Products', href: '/products', icon: Package },
          { name: 'Categories', href: '/categories', icon: Store },
          { name: 'Sellers', href: '/sellers', icon: Users },
          { name: 'Market Prices', href: '/market-prices', icon: TrendingUp },
          { name: 'Subscriptions', href: '/subscription-plans', icon: PackageCheck },
          { divider: true },
          { name: 'My Orders', href: '/my-orders', icon: ClipboardList },
          { name: 'Wishlist', href: '/wishlist', icon: Heart },
          { name: 'Cart', href: '/cart', icon: ShoppingCart },
          { name: 'Checkout', href: '/checkout', icon: CreditCard },
          { name: 'Messages', href: '/messages', icon: MessageSquare },
          { name: 'Notifications', href: '/notifications', icon: Bell },
          { divider: true },
          { name: 'Storage Services', href: '/storage-services', icon: Warehouse },
          { name: 'Logistics Services', href: '/logistics-services', icon: TruckIcon },
          { name: 'Transport Marketplace', href: '/transport', icon: Truck },
          { name: 'Warehouse Booking', href: '/warehouse-booking', icon: CalendarIcon },
          { name: 'Bulk Purchase', href: '/bulk-purchase', icon: PackageCheck },
          { name: 'Escrow Payments', href: '/escrow', icon: Shield },
          { name: 'Agri Financing', href: '/agri-financing', icon: Banknote },
          { name: 'Crop Insurance', href: '/crop-insurance', icon: Shield },
          { divider: true },
          { name: 'Saved Addresses', href: '/addresses', icon: AddressIcon },
          { name: 'Payment Methods', href: '/payment-methods', icon: CreditCard },
          { name: 'My Reviews', href: '/my-reviews', icon: Star },
          { name: 'Profile', href: '/profile', icon: User },
          { name: 'Settings', href: '/settings', icon: SettingsIcon },
        ]
      case ROLES.LOGISTICS_COMPANY:
        return [
          { name: 'Dashboard', href: '/logistics/dashboard', icon: LayoutDashboard },
          { divider: true },
          { name: 'Available Deliveries', href: '/logistics/available', icon: Package },
          { name: 'Active Deliveries', href: '/logistics/active', icon: Truck },
          { name: 'Delivery History', href: '/logistics/history', icon: ClipboardList },
          { divider: true },
          { name: 'Vehicles', href: '/logistics/vehicles', icon: PackageCheck },
          { name: 'Drivers', href: '/logistics/drivers', icon: Users },
          { divider: true },
          { name: 'Earnings', href: '/logistics/earnings', icon: DollarSign },
          { name: 'Documents', href: '/logistics/documents', icon: FileText },
          { name: 'Company Profile', href: '/logistics/profile', icon: User },
          { name: 'Subscription', href: '/logistics/subscription', icon: CreditCard },
          { divider: true },
          { name: 'Ratings', href: '/logistics/ratings', icon: Star },
          { name: 'Analytics', href: '/logistics/analytics', icon: BarChart3 },
          { divider: true },
          { name: 'Messages', href: '/messages', icon: MessageSquare },
          { name: 'Notifications', href: '/notifications', icon: Bell },
          { name: 'Settings', href: '/settings', icon: SettingsIcon },
        ]
      case ROLES.WAREHOUSE:
        return [
          { name: 'Dashboard', href: '/warehouse/dashboard', icon: LayoutDashboard },
          { divider: true },
          { name: 'Inventory', href: '/warehouse/inventory', icon: Package },
          { name: 'Storage Spaces', href: '/warehouse/spaces', icon: Warehouse },
          { name: 'Inbound', href: '/warehouse/inbound', icon: ArrowDownRight },
          { name: 'Outbound', href: '/warehouse/outbound', icon: ArrowUpRight },
          { name: 'Bookings', href: '/warehouse/bookings', icon: ClipboardList },
          { divider: true },
          { name: 'Customers', href: '/warehouse/customers', icon: Users },
          { name: 'Earnings', href: '/warehouse/earnings', icon: DollarSign },
          { divider: true },
          { name: 'Documents', href: '/warehouse/documents', icon: FileText },
          { name: 'Profile', href: '/warehouse/profile', icon: User },
          { name: 'Subscription', href: '/warehouse/subscription', icon: CreditCard },
          { divider: true },
          { name: 'Ratings', href: '/warehouse/ratings', icon: Star },
          { name: 'Analytics', href: '/warehouse/analytics', icon: BarChart3 },
          { name: 'Promote', href: '/warehouse/promote', icon: TrendingUp },
          { divider: true },
          { name: 'Notifications', href: '/notifications', icon: Bell },
          { name: 'Settings', href: '/settings', icon: SettingsIcon },
        ]
    }
  }

  const sidebarNavigation = getSidebarForRole()
  const location = useLocation()
  const navigate = useNavigate()
  const isSuperAdminRoute = location.pathname.startsWith('/superadmin')

  const SidebarSection = ({ title, items }) => (
    <div className="mb-6">
      {title && (
        <p className="px-4 mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
      )}
      <div className="space-y-0.5">
        {items.map((item, itemIdx) => (
          item.divider ? (
            <div key={item.name || `divider-${itemIdx}`} className="mx-4 my-2 border-t border-gray-800"></div>
          ) : (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/dashboard'}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group
                ${isActive
                  ? 'bg-green-600/20 text-green-400 shadow-sm'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }
              `}
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? 'bg-green-600/30 text-green-400' : 'bg-gray-800 text-gray-500 group-hover:bg-gray-700'
                  }`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="flex-1 truncate">{item.name}</span>
                  {isActive && <div className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0"></div>}
                </>
              )}
            </NavLink>
          )
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50/80">
      {authLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : isLoggedIn && pendingApproval ? (
        <PendingApprovalScreen />
      ) : isLoggedIn && isSuperAdminRoute ? (
        <main className="min-h-screen">
          <AuthenticatedRoutes userRole={userRole} />
        </main>
      ) : isLoggedIn ? (
        <div className="flex">
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/40 backdrop:blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          <aside className={`
            fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 border-r border-gray-800 transform transition-all duration-300 ease-in-out shadow-xl lg:shadow-none
            lg:translate-x-0 lg:static lg:inset-auto lg:z-auto
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-5 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-md">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-lg leading-tight">Nafaka Hub</p>
                    <p className="text-xs text-gray-500">Tanzania</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin p-4">
                {(() => {
                  const sectionLabels = ['Main Menu', 'Services', 'Management']
                  const sections = sidebarNavigation.reduce((acc, item) => {
                    if (item.divider) acc.push([])
                    else acc[acc.length - 1].push(item)
                    return acc
                  }, [[]])
                  return sectionLabels.map((label, idx) => {
                    const items = sections[idx] || []
                    return items.length > 0 ? (
                      <SidebarSection key={label} title={label} items={items} />
                    ) : null
                  })
                })()}
              </nav>

              <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-800">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-green-700">
                       {(user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{getRoleLabel(userRole)}</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 hover:bg-red-50/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors" title="Logout">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0">
              <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 lg:px-8 sticky top-0 z-50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 -ml-1 hover:bg-gray-100 rounded-lg text-gray-600 shrink-0"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <form onSubmit={handleGlobalSearch} role="search" className="relative hidden sm:block w-full max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input
                      type="search"
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      placeholder="Search products, orders, sellers..."
                      aria-label="Search"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                  </form>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <NavLink to="/notifications" className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-600" aria-label="Notifications">
                     <Bell className="w-5 h-5" />
                     {unreadNotificationCount > 0 && (
                       <Badge variant="danger" size="sm" className="absolute top-1.5 right-1.5 w-4 h-4 min-w-[1rem] flex items-center justify-center ring-2 ring-white">
                         {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                       </Badge>
                     )}
                   </NavLink>
                   <NavLink to="/messages" className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-600" aria-label="Messages">
                     <MessageSquare className="w-5 h-5" />
                   </NavLink>
                   <NavLink to="/cart" className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-600" aria-label="Cart">
                     <ShoppingBag className="w-5 h-5" />
                     {cartItemCount > 0 && (
                       <Badge variant="success" size="sm" className="absolute top-1.5 right-1.5 w-4 h-4 min-w-[1rem] flex items-center justify-center ring-2 ring-white">
                         {cartItemCount > 99 ? '99+' : cartItemCount}
                       </Badge>
                     )}
                   </NavLink>
                  <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
                  <NavLink to="/profile" className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-600" aria-label="Profile" title={user?.name || 'Profile'}>
                    <User className="w-5 h-5" />
                  </NavLink>
                  <button onClick={handleLogout} className="p-2.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors" title="Logout" aria-label="Logout">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[1600px] p-4 lg:p-8">
                <AuthenticatedRoutes userRole={userRole} />
              </div>
            </main>
          </div>
        </div>
      ) : (
        <div>
          <header className="bg-green-700 text-white sticky top-0 z-[60]">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center justify-between gap-3 h-16">
                <NavLink to="/" className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg leading-tight">Nafaka Hub</p>
                    <p className="text-xs text-green-200">Tanzania</p>
                  </div>
                </NavLink>

                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-green-100 hover:text-white" aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                <nav className="hidden lg:flex items-center gap-4 xl:gap-6 min-w-0">
                  <NavLink to="/" className={({isActive}) => `text-sm font-medium ${isActive ? 'text-yellow-400' : 'text-green-100 hover:text-white'}`}>Home</NavLink>
                  <NavLink to="/products" className={({isActive}) => `text-sm font-medium ${isActive ? 'text-yellow-400' : 'text-green-100 hover:text-white'}`}>Products</NavLink>
                  <NavLink to="/categories" className={({isActive}) => `text-sm font-medium ${isActive ? 'text-yellow-400' : 'text-green-100 hover:text-white'}`}>Categories</NavLink>
                  <NavLink to="/market-prices" className={({isActive}) => `text-sm font-medium ${isActive ? 'text-yellow-400' : 'text-green-100 hover:text-white'}`}>Market Prices</NavLink>
                  <div
                    className="relative"
                    onMouseEnter={() => setServicesOpen(true)}
                    onMouseLeave={() => setServicesOpen(false)}
                  >
                    <button className={`text-sm font-medium flex items-center gap-1 ${servicesOpen ? 'text-yellow-400' : 'text-green-100 hover:text-white'}`}>
                      Services <ChevronDown className={`w-3.5 h-3.5 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {servicesOpen && (
                      <div className="absolute top-full left-0 pt-2 z-[60]">
                        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-[640px] p-4 grid grid-cols-2 gap-1">
                          {services.map((s) => (
                            <NavLink
                              key={s.name}
                              to={s.href}
                              onClick={() => setServicesOpen(false)}
                              className="block px-3 py-2.5 rounded-lg hover:bg-green-50 transition-colors group"
                            >
                              <p className="text-sm font-semibold text-gray-900 group-hover:text-green-700">{s.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <NavLink to="/sellers" className={({isActive}) => `text-sm font-medium ${isActive ? 'text-yellow-400' : 'text-green-100 hover:text-white'}`}>Sellers</NavLink>
                  <NavLink to="/about" className={({isActive}) => `text-sm font-medium ${isActive ? 'text-yellow-400' : 'text-green-100 hover:text-white'}`}>About</NavLink>
                  <NavLink to="/contact" className={({isActive}) => `text-sm font-medium ${isActive ? 'text-yellow-400' : 'text-green-100 hover:text-white'}`}>Contact</NavLink>
                </nav>

                <div className="hidden lg:flex items-center gap-3">
                   <NavLink to="/cart" className="relative p-2 text-green-100 hover:text-white">
                     <ShoppingBag className="w-5 h-5" />
                     {cartItemCount > 0 && (
                       <Badge variant="warning" size="sm" className="absolute -top-1 -right-1 w-4 h-4 min-w-[1rem] flex items-center justify-center ring-2 ring-white bg-yellow-500 text-gray-900">
                         {cartItemCount}
                       </Badge>
                     )}
                   </NavLink>
                   <NavLink to="/sell-products" className="text-sm font-medium text-green-100 hover:text-white">Sell Products</NavLink>
                   <NavLink to="/bulk-purchase" className="text-sm font-medium text-green-100 hover:text-white">Bulk Orders</NavLink>
                   <NavLink to="/login" className="text-sm font-medium text-green-100 hover:text-white">Login</NavLink>
                   <Button as={NavLink} to="/register" variant="accent" size="sm">
                     Register
                   </Button>
                 </div>
              </div>

              {mobileMenuOpen && (
                <div className="lg:hidden border-t border-green-600 py-4 space-y-3">
                  <NavLink to="/" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-green-100 hover:text-white py-2">Home</NavLink>
                  <NavLink to="/products" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-green-100 hover:text-white py-2">Products</NavLink>
                  <NavLink to="/categories" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-green-100 hover:text-white py-2">Categories</NavLink>
                  <NavLink to="/market-prices" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-green-100 hover:text-white py-2">Market Prices</NavLink>
                  <div>
                    <button onClick={() => setServicesOpen(!servicesOpen)} className="flex items-center justify-between w-full text-sm font-medium text-green-100 hover:text-white py-2">
                      Services <ChevronDown className={`w-4 h-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {servicesOpen && (
                      <div className="pl-3 mt-1 space-y-1 border-l border-green-600">
                        {services.map((s) => (
                          <NavLink key={s.name} to={s.href} onClick={() => { setMobileMenuOpen(false); setServicesOpen(false) }} className="block text-xs text-green-200 hover:text-white py-1.5">
                            {s.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                  <NavLink to="/sellers" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-green-100 hover:text-white py-2">Sellers</NavLink>
                  <NavLink to="/about" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-green-100 hover:text-white py-2">About</NavLink>
                  <NavLink to="/contact" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-green-100 hover:text-white py-2">Contact</NavLink>
                  <NavLink to="/sell-products" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-green-100 hover:text-white py-2">Sell Products</NavLink>
                  <NavLink to="/bulk-purchase" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-green-100 hover:text-white py-2">Bulk Orders</NavLink>
                  <div className="flex items-center gap-3 pt-3 border-t border-green-600">
                    <NavLink to="/cart" onClick={() => setMobileMenuOpen(false)} className="relative p-2 text-green-100 hover:text-white">
                      <ShoppingBag className="w-5 h-5" />
                    </NavLink>
                    <NavLink to="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-green-100 hover:text-white">Login</NavLink>
                    <NavLink to="/register" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg">Register</NavLink>
                  </div>
                </div>
              )}
            </div>
          </header>
          <PublicRoutes />
          <Footer />
        </div>
      )}
    </div>
  )
}

export default App
