import React from 'react'
import { NavLink } from 'react-router-dom'
import { RefreshCw, ArrowLeft } from 'lucide-react'

export default function ReturnPolicy() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <NavLink to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </NavLink>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-yellow-50 rounded-xl"><RefreshCw className="w-6 h-6 text-yellow-600" /></div>
        <h1 className="text-3xl font-bold text-gray-900">Return Policy</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-6 text-gray-700">
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">1. Return Eligibility</h2><p>Products can be returned within 7 days of delivery if they are damaged, defective, or do not match the description provided by the seller.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">2. Non-Returnable Items</h2><p>Perishable goods, custom-made products, and items marked as final sale cannot be returned unless damaged or defective.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">3. Return Process</h2><p>To initiate a return, contact the seller through our messaging system or submit a dispute. Provide photos and a description of the issue.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">4. Refunds</h2><p>Once a return is approved, refunds are processed within 14 business days. The refund will be issued to the original payment method.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-900 mb-2">5. Return Shipping</h2><p>If the return is due to seller error, the seller covers return shipping. For buyer's remorse, the buyer is responsible for return shipping costs.</p></section>
      </div>
    </div>
  )
}
