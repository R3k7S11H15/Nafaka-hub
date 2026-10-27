import React from 'react'
import { NavLink } from 'react-router-dom'
import { FileText, ArrowLeft } from 'lucide-react'

export default function Terms() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <NavLink to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </NavLink>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-xl"><FileText className="w-6 h-6 text-blue-600" /></div>
        <h1 className="text-3xl font-bold text-gray-900">Terms & Conditions</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6 text-gray-700">
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2><p>By accessing and using Nafaka Hub Tanzania, you accept and agree to be bound by the terms and provision of this agreement.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">2. User Accounts</h2><p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">3. Product Listings</h2><p>Sellers must provide accurate descriptions of their products. Misleading information may result in account suspension.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">4. Payment Terms</h2><p>All payments are processed directly to sellers via secure payment providers (NTZS). After completing your payment, you must submit a payment reference. The seller confirms receipt before your order moves to processing. Buyer protection is provided through our dispute resolution process.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">5. Delivery</h2><p>We strive to ensure timely delivery of all products. Delivery times may vary based on location and product availability.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">6. Returns & Refunds</h2><p>Products may be returned within 7 days of delivery if they do not match the description. Refunds are processed within 14 business days.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">7. Limitation of Liability</h2><p>Nafaka Hub Tanzania shall not be liable for any indirect, incidental, special, consequential or punitive damages.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">8. Governing Law</h2><p>These terms shall be governed by and construed in accordance with the laws of Tanzania.</p></section>
      </div>
    </div>
  )
}
