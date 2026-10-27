import React, { useState, useContext } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3, DollarSign,
  Clock, FileText, Users, Gift, AlertCircle,
  Menu, X, LogOut, Settings, Bell, Tag
} from 'lucide-react'
import { AuthContext } from '../context/AuthContext'

const menuSections = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/vendor/dashboard', icon: LayoutDashboard },
      { name: 'Orders', href: '/vendor/orders', icon: ShoppingCart },
      { name: 'Products', href: '/vendor/products', icon: Package },
    ]
  },
  {
    title: 'Sales & Earnings',
    items: [
      { name: 'Commission', href: '/vendor/commissions', icon: DollarSign },
      { name: 'Withdrawals', href: '/vendor/withdrawals', icon: Clock },
    ]
  },
  {
    title: 'Growth',
    items: [
      { name: 'Subscription Plans', href: '/vendor/plans', icon: Tag },
      { name: 'Promote', href: '/vendor/promote', icon: BarChart3 },
    ]
  },
  {
    title: 'Business',
    items: [
      { name: 'Contracts', href: '/vendor/contracts', icon: FileText },
      { name: 'Communications', href: '/vendor/communications', icon: Users },
    ]
  },
  {
    title: 'Management',
    items: [
      { name: 'Applications', href: '/vendor/applications', icon: FileText },
      { name: 'Verification', href: '/vendor/verification', icon: AlertCircle },
      { name: 'Audit Logs', href: '/vendor/audit', icon: FileText },
      { name: 'Reports', href: '/vendor/reports', icon: BarChart3 },
      { name: 'Bulk Actions', href: '/vendor/bulk-actions', icon: ShoppingCart },
      { name: 'Settings', href: '/vendor/settings', icon: Settings },
    ]
  }
]

const routeTitles = {
  '/vendor/dashboard': 'Vendor Dashboard',
  '/vendor/orders': 'Orders',
  '/vendor/products': 'My Products',
  '/vendor/commissions': 'Commissions',
  '/vendor/withdrawals': 'Withdrawals',
  '/vendor/plans': 'Subscription Plans',
  '/vendor/promote': 'Promote Products',
  '/vendor/contracts': 'Contracts',
  '/vendor/communications': 'Communications',
  '/vendor/applications': 'Applications',
  '/vendor/verification': 'Verification',
  '/vendor/audit': 'Audit Logs',
  '/vendor/reports': 'Reports',
  '/vendor/bulk-actions': 'Bulk Actions',
  '/vendor/settings': 'Settings',
}

export default function VendorLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useContext(AuthContext)

  const getTitle = (pathname) => {
    if (routeTitles[pathname]) return routeTitles[pathname]
    for (const section of menuSections) {
      for (const item of section.items) {
        if (pathname.startsWith(item.href)) return item.name
      }
    }
    return 'Vendor'
  }

  const pageTitle = getTitle(location.pathname)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="h-full overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold text-gray-900">Vendor Portal</h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-3 space-y-1">
            {menuSections.map((section) => (
              <div key={section.title} className="mb-4">
                <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">{section.title}</p>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname.startsWith(item.href)
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </nav>
          <div className="p-3 border-t">
            <button onClick={logout} className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 rounded-lg hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">{pageTitle}</h2>
          </div>
          <div className="flex items-center gap-3">
            {user?.role_label && (
              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                {user.role_label}
              </span>
            )}
            <button className="p-1 rounded-lg hover:bg-gray-100 relative">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <NavLink to="/vendor/settings" className="p-1 rounded-lg hover:bg-gray-100">
              <Settings className="w-5 h-5 text-gray-600" />
            </NavLink>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
