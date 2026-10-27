import React from 'react'
import { NavLink } from 'react-router-dom'
import { Handshake, Award, Users, TrendingUp, Leaf, Quote } from 'lucide-react'

const values = [
  { icon: Handshake, title: 'Trust & Transparency', desc: 'We believe in honest trade practices and transparent pricing for all parties.' },
  { icon: Leaf, title: 'Sustainability', desc: 'Promoting eco-friendly farming and sustainable agricultural practices across Tanzania.' },
  { icon: Users, title: 'Community First', desc: 'Empowering local farmers and supporting rural communities across the nation.' },
  { icon: TrendingUp, title: 'Quality Assurance', desc: 'Every product is verified for quality to ensure customer satisfaction.' },
]

const team = [
  { name: 'John Mwakyusa', role: 'CEO & Founder', initials: 'JM' },
  { name: 'Sarah Nkya', role: 'Head of Operations', initials: 'SN' },
  { name: 'David Kimaro', role: 'Finance Director', initials: 'DK' },
  { name: 'Mary Mushi', role: 'Customer Success', initials: 'MM' },
]

export default function About() {
  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        <div className="max-w-7xl mx-auto relative">
          <nav className="flex items-center gap-2 text-sm text-green-100 mb-4">
            <NavLink to="/" className="hover:text-white transition-colors">Home</NavLink>
            <span>/</span>
            <span className="text-white font-medium">About Us</span>
          </nav>
          <h1 className="text-4xl font-bold mb-4">About Nafaka Hub</h1>
          <p className="text-lg text-green-100 max-w-2xl">Tanzania's leading agricultural e-commerce platform, connecting farmers, wholesalers, and buyers with fairness and transparency.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Who We Are</h3>
            <p className="text-gray-600 leading-relaxed">Founded in the heart of Tanzania, Nafaka Hub partners with trusted local farmers to supply fresh, premium grains across the nation. Our focus is quality, transparency, and reliability from farm to table.</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Our Mission</h3>
            <p className="text-gray-600 leading-relaxed">To deliver premium agricultural products with consistent quality, empower local communities, and ensure fair, sustainable trade practices across the entire supply chain.</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-3 text-gray-900">Our Promise</h3>
            <p className="text-gray-600 leading-relaxed">We guarantee integrity in sourcing, competitive pricing, and fast delivery—backed by responsive support and honest communication with every transaction.</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-8 lg:p-12 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <div key={i} className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2 text-gray-900">{value.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Meet Our Team</h2>
          <p className="text-gray-600">Dedicated professionals committed to transforming agriculture in Tanzania</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {team.map((member, i) => (
            <div key={i} className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-700">{member.initials}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{member.name}</h3>
              <p className="text-sm text-gray-600">{member.role}</p>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white rounded-xl p-8 lg:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
          <div className="relative">
            <Quote className="w-12 h-12 mx-auto mb-4 text-green-300" />
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">Join Us in Transforming Agriculture</h2>
            <p className="text-green-100 mb-6 max-w-2xl mx-auto">Whether you're a farmer, buyer, or transporter, Nafaka Hub provides the platform to connect and grow together.</p>
            <NavLink to="/register" className="inline-block bg-yellow-500 text-gray-900 px-8 py-3.5 rounded-lg font-semibold hover:bg-yellow-400 transition-all duration-200 shadow-lg hover:shadow-xl">
              Get Started Today
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  )
}
