import React from 'react'
import { NavLink } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <NavLink to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </NavLink>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-50 rounded-xl"><Shield className="w-6 h-6 text-green-600" /></div>
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6 text-gray-700">
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">1. Information We Collect</h2><p>We collect personal information such as name, email, phone number, and delivery address when you register. We also collect usage data to improve our services.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">2. How We Use Your Information</h2><p>Your information is used to process orders, communicate with you, and improve our platform. We do not sell your personal data to third parties.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">3. Data Security</h2><p>We implement industry-standard security measures to protect your data. All transactions are encrypted using SSL technology.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">4. Cookies</h2><p>We use cookies to enhance your browsing experience. You can disable cookies in your browser settings, but some features may not work properly.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">5. Third-Party Services</h2><p>We use third-party payment processors (M-Pesa, banks) and delivery services. These partners have their own privacy policies.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">6. Your Rights</h2><p>You have the right to access, correct, or delete your personal data. Contact our support team for data-related requests.</p></section>
      </div>
    </div>
  )
}
