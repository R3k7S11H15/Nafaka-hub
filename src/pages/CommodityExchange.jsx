import React, { useState, useEffect } from 'react'
import { ShoppingCart, Package, Clock, MapPin, User, Filter, Plus, DollarSign, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function CommodityExchange() {
  const [activeTab, setActiveTab] = useState('buy')
  const [buyRequests, setBuyRequests] = useState([])
  const [sellOffers, setSellOffers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getProducts({ limit: 50 })
        if (!mounted) return
        const list = res?.data?.products || res?.data || res?.products || res || []
        const arr = Array.isArray(list) ? list : []
        const offers = arr.filter(p => p.type === 'sell' || p.listing_type === 'offer').map(p => ({
          id: p.id,
          product: p.name || p.commodity,
          quantity: p.quantity || p.stock || '—',
          price: p.price ? `TZS ${Number(p.price).toLocaleString()}/kg` : '—',
          grade: p.grade || '—',
          warehouse: p.warehouse || p.location || '—',
          seller: p.seller_name || p.vendor || '—',
        }))
        const requests = arr.filter(p => p.type === 'buy' || p.listing_type === 'request').map(p => ({
          id: p.id,
          product: p.name || p.commodity,
          quantity: p.quantity || '—',
          location: p.location || p.region || '—',
          budget: p.budget || (p.target_price ? `TZS ${Number(p.target_price).toLocaleString()}` : '—'),
          deadline: p.deadline || '—',
          buyer: p.buyer_name || p.buyer || '—',
          urgency: p.urgency || 'Medium',
        }))
        setSellOffers(offers)
        setBuyRequests(requests)
      } catch {
        if (mounted) { setBuyRequests([]); setSellOffers([]) }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Commodity Exchange</h1>
        <p className="text-gray-500 mt-1">Buy and sell grain directly</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setActiveTab('buy')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'buy' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <ShoppingCart className="h-4 w-4 inline mr-2" />Buy Requests
          </button>
          <button onClick={() => setActiveTab('sell')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'sell' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            <Package className="h-4 w-4 inline mr-2" />Sell Offers
          </button>
          <button onClick={() => setActiveTab('contracts')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'contracts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            My Contracts
          </button>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 ml-auto">
          <Filter className="h-4 w-4" /><span className="text-sm font-medium">Filter</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500">
          <Loader2 className="animate-spin w-6 h-6 mr-2" />Loading exchange listings...
        </div>
      ) : activeTab === 'buy' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Active Buy Requests</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="h-4 w-4" /><span className="text-sm font-medium">Post Buy Request</span>
            </button>
          </div>
          {buyRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">No active buy requests.</div>
          ) : (
            <div className="space-y-4">
              {buyRequests.map(request => (
                <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">Need {request.quantity} of {request.product}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${request.urgency === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {request.urgency} Priority
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1"><MapPin className="h-4 w-4" />{request.location}</div>
                        <div className="flex items-center gap-1"><Package className="h-4 w-4" />{request.quantity}</div>
                        <div className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{request.budget}</div>
                        <div className="flex items-center gap-1"><Clock className="h-4 w-4" />Deadline: {request.deadline}</div>
                        <div className="flex items-center gap-1"><User className="h-4 w-4" />{request.buyer}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Respond</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'sell' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Active Sell Offers</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <Plus className="h-4 w-4" /><span className="text-sm font-medium">Post Sell Offer</span>
            </button>
          </div>
          {sellOffers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">No active sell offers.</div>
          ) : (
            <div className="space-y-4">
              {sellOffers.map(offer => (
                <div key={offer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{offer.quantity} {offer.product}</h3>
                        <span className="text-lg font-bold text-green-600">{offer.price}</span>
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">{offer.grade}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1"><MapPin className="h-4 w-4" />{offer.warehouse}</div>
                        <div className="flex items-center gap-1"><User className="h-4 w-4" />{offer.seller}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">Buy Now</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Contracts</h3>
          <p className="text-gray-500 mb-4">You don't have any active contracts yet. Start by responding to buy requests or posting sell offers.</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Browse Exchange</button>
        </div>
      )}
    </div>
  )
}
