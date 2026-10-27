import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Package, Mail, ArrowRight } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-grain-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
            <p className="text-gray-500 mt-1">Enter your email and we'll send you a reset link</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
              <p className="text-gray-600">We've sent a password reset link to <strong>{email}</strong></p>
              <NavLink to="/login" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium">
                <ArrowRight className="w-4 h-4 rotate-180" /> Back to login
              </NavLink>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true) }} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button type="submit" className="w-full btn-primary py-3">Send Reset Link</button>
              <p className="text-center text-sm text-gray-600">
                Remember your password? <NavLink to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</NavLink>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
