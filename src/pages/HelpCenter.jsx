import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, MessageCircle, BookOpen, Phone, Mail, ChevronRight } from 'lucide-react'

const helpTopics = [
  { category: 'Account & Login', icon: MessageCircle, articles: ['How to create an account', 'How to verify your email', 'How to reset your password', 'How to enable 2FA'] },
  { category: 'Buying', icon: BookOpen, articles: ['How to place an order', 'How to use escrow payment', 'How to track your order', 'How to request a refund'] },
  { category: 'Selling', icon: BookOpen, articles: ['How to list a product', 'How to set prices', 'How to manage inventory', 'How to handle disputes'] },
  { category: 'Delivery', icon: BookOpen, articles: ['How to arrange delivery', 'How to track shipments', 'Delivery time estimates', 'International shipping'] },
  { category: 'Payments', icon: MessageCircle, articles: ['Supported payment methods', 'How to add a payment method', 'How to withdraw funds', 'Payment security'] },
  { category: 'Technical', icon: BookOpen, articles: ['Website not loading', 'App crashing issues', 'How to update browser', 'Contact technical support'] },
]

export default function HelpCenter() {
  const [search, setSearch] = useState('')

  return (
    <div className="p-6 space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Help Center</h1>
        <p className="text-gray-500 mb-6">Find answers to common questions or contact our support team</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for help..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {helpTopics.map((topic, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-xl"><topic.icon className="w-5 h-5 text-green-600" /></div>
              <h3 className="font-semibold text-gray-900">{topic.category}</h3>
            </div>
            <ul className="space-y-2">
              {topic.articles.map((article, j) => (
                <li key={j}>
                  <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-700 transition-colors">
                    <ChevronRight className="w-3 h-3" /> {article}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-green-50 rounded-xl p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Still need help?</h3>
        <p className="text-gray-600 mb-4">Our support team is available 24/7</p>
        <div className="flex justify-center gap-4">
          <NavLink to="/contact" className="btn-primary flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Contact Support</NavLink>
          <a href="tel:+255710379317" className="btn-secondary flex items-center gap-2"><Phone className="w-4 h-4" /> Call Us</a>
        </div>
      </div>
    </div>
  )
}
