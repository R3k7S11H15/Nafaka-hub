import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { User, Bell, CreditCard, MapPin, ChevronRight } from 'lucide-react'

const settingsSections = [
  { id: 'profile', label: 'Personal Information', icon: User, description: 'Update your name, email, and phone', href: '/profile' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Manage your notification preferences', href: '/notifications' },
  { id: 'payments', label: 'Payment Accounts', icon: CreditCard, description: 'Manage M-Pesa and bank accounts', href: '/payment-methods' },
  { id: 'addresses', label: 'Addresses', icon: MapPin, description: 'Manage delivery addresses', href: '/addresses' },
]

export default function Settings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
        {settingsSections.map((section) => (
          <NavLink key={section.id} to={section.href} className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors">
            <div className="p-3 bg-gray-50 rounded-xl">
              <section.icon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900">{section.label}</h3>
              <p className="text-sm text-gray-500">{section.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </NavLink>
        ))}
      </div>
    </div>
  )
}
