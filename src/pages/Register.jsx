import React, { useState } from 'react'
import { Package, Eye, EyeOff, ArrowRight, Shield, Truck, Star, Wheat, ShoppingCart, Store, Warehouse } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', region: '', password: '', shippingAddress: '', role: 'customer'
  })

  const regionList = ['Dar es Salaam', 'Mbeya', 'Morogoro', 'Iringa', 'Songea', 'Dodoma', 'Arusha', 'Mwanza', 'Tanga', 'Kilimanjaro', 'Tabora', 'Mtwara', 'Singida', 'Shinyanga', 'Kagera', 'Manyara']

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await register(
        formData.fullName,
        formData.phone,
        formData.email,
        formData.shippingAddress || formData.region,
        formData.password,
        formData.role
      )
      if (data.success) {
        navigate('/dashboard')
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Shield, text: 'Secure Direct Payments to Sellers' },
    { icon: Truck, text: 'Nationwide Delivery' },
    { icon: Star, text: 'Verified Quality Grains' },
    { icon: Wheat, text: 'Fair Market Prices' },
  ]

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-800 via-green-700 to-emerald-900 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: 'url(/back.png)' }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <pattern id="grain-pattern-register" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="2" fill="white"/>
              <circle cx="10" cy="10" r="1.5" fill="white"/>
              <circle cx="50" cy="50" r="1.5" fill="white"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grain-pattern-register)"/>
          </svg>
        </div>
        <div className="relative z-10 flex flex-col justify-center px-12 py-16">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-2xl leading-tight mb-4">Nafaka Hub</h1>
              <p className="text-green-200 text-sm">Tanzania</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Join Tanzania's Grain Marketplace
          </h2>
          <p className="text-green-100 text-lg mb-10 leading-relaxed max-w-md">
            Create an account to start buying, selling, or both. Access verified suppliers, secure payments, and nationwide logistics.
          </p>

          <div className="space-y-5">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
                  <feature.icon className="w-5 h-5 text-yellow-400" />
                </div>
                <span className="text-green-50 font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            ))}
            <span className="text-green-200 text-sm ml-2">Trusted by 5,000+ users</span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-900">Nafaka Hub</h1>
              <p className="text-xs text-gray-500">Tanzania</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
              <p className="text-gray-500 mt-1">Get started with Nafaka Hub</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                    placeholder="+255 712 345 678"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">I want to register as</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'customer' }))}
                    className={`p-3 border-2 rounded-xl text-center transition ${formData.role === 'customer' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <ShoppingCart className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Buyer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'seller' }))}
                    className={`p-3 border-2 rounded-xl text-center transition ${formData.role === 'seller' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <Store className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Seller</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/register/logistics')}
                    className={`p-3 border-2 rounded-xl text-center transition ${formData.role === 'logistics_company' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <Truck className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Logistics</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/register/warehouse')}
                    className={`p-3 border-2 rounded-xl text-center transition ${formData.role === 'warehouse' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <Warehouse className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Warehouse</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Shipping Address</label>
                <input
                  type="text"
                  name="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                  placeholder="Street, City, Region"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Region</label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                  required
                >
                  <option value="">Select region</option>
                  {regionList.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm pr-12"
                    placeholder="Create a strong password"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3.5 rounded-xl hover:bg-green-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <NavLink to="/login" className="text-green-600 hover:text-green-700 font-semibold">Sign in</NavLink>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
