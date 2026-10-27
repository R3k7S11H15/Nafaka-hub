import React, { useState, useContext } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Truck, Clipboard, DollarSign, Clock,
  FileText, Users, BarChart3, Star, Settings, Bell, MapPin,
  Menu, X, LogOut
} from 'lucide-react'
import { AuthContext } from '../context/AuthContext'

const menuSections = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/logistics/dashboard', icon: LayoutDashboard },
      { name: 'Available Deliveries', href: '/logistics/available', icon: Package },
      { name: 'Active Deliveries', href: '/logistics/active', icon: Truck },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Delivery History', href: '/logistics/history', icon: Clock },
      { name: 'Drivers', href: '/logistics/drivers', icon: Users },
      { name: 'Vehicles', href: '/logistics/vehicles', icon: Truck },
      { name: 'Ratings', href: '/logistics/ratings', icon: Star },
      { name: 'Documents', href: '/logistics/documents', icon: FileText },
    ]
  },
  {
    title: 'Earnings',
    items: [
      { name: 'Earnings', href: '/logistics/earnings', icon: DollarSign },
      { name: 'Analytics', href: '/logistics/analytics', icon: BarChart3 },
    ]
  },
  {
    title: 'Account',
    items: [
      { name: 'Profile', href: '/logistics/profile', icon: Users },
      { name: 'Subscription', href: '/logistics/subscription', icon: Clock },
    ]
  }
]

const routeTitles = {
  '/logistics/dashboard': 'Logistics Dashboard',
  '/logistics/available': 'Available Deliveries',
  '/logistics/active': 'Active Deliveries',
  '/logistics/history': 'Delivery History',
  '/logistics/drivers': 'My Drivers',
  '/logistics/vehicles': 'My Vehicles',
  '/logistics/ratings': 'My Ratings',
  '/logistics/documents': 'My Documents',
  '/logistics/earnings': 'My Earnings',
  '/logistics/analytics': 'Analytics',
  '/logistics/profile': 'My Profile',
  '/logistics/subscription': 'Subscription',
}

export default function LogisticsLayout({ children }) {
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
    return 'Logistics'
  }

  const pageTitle = getTitle(location.pathname)

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="h-full overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold text-gray-900">Logistics Portal</h1>
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
            <NavLink to="/logistics/profile" className="p-1 rounded-lg hover:bg-gray-100">
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
