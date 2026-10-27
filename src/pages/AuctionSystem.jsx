import React, { useEffect, useState } from 'react'
import { Loader2, Gavel, Clock, Users, Plus } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

function timeRemaining(endsAt) {
  if (!endsAt) return '—'
  const diff = new Date(endsAt) - new Date()
  if (diff <= 0) return 'Ended'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  return `${hours}h ${minutes}m`
}

export default function AuctionSystem() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bidInputs, setBidInputs] = useState({})
  const [bidding, setBidding] = useState(false)
  const toast = useToast()

  useEffect(() => {
    loadAuctions()
  }, [])

  const loadAuctions = async () => {
    setLoading(true)
    try {
      const data = await api.getAuctions('live')
      if (data.success) setAuctions(data.auctions || [])
      else setError(data.message || 'Failed to load')
    } catch (err) { setError('Failed to connect') }
    finally { setLoading(false) }
  }

  const handleBid = async (auctionId) => {
    const amount = parseFloat(bidInputs[auctionId])
    if (!amount || amount <= 0) return
    setBidding(true)
    try {
      const data = await api.placeBid(auctionId, amount)
      if (data.success) {
        setBidInputs(prev => ({ ...prev, [auctionId]: '' }))
        await loadAuctions()
      } else {
        toast.error(data.message || 'Bid failed')
      }
    } catch (err) { toast.error('Failed to place bid') }
    finally { setBidding(false) }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Gavel className="w-8 h-8 text-amber-600" />
          Grain Auctions
        </h1>
        <p className="text-gray-600 mt-2">Bid on premium grain lots</p>
      </div>

      <div className="flex gap-4 mb-8">
        <button className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Create Auction
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Auctions</h2>
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">{error}</div>
        ) : auctions.length === 0 ? (
          <div className="text-center text-gray-500 py-12">No active auctions right now.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {auctions.map((a) => (
              <div key={a.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{a.title}</h3>
                    <p className="text-sm text-gray-600">{a.quantity} {a.unit}</p>
                    {a.region && <p className="text-xs text-gray-500 mt-1">Region: {a.region}</p>}
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />{timeRemaining(a.ends_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{a.description}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current bid:</span>
                    <span className="font-bold text-green-600">TZS {parseFloat(a.current_bid).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Starting price:</span>
                    <span className="font-medium">TZS {parseFloat(a.starting_price).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Enter bid amount"
                    value={bidInputs[a.id] || ''}
                    onChange={(e) => setBidInputs(prev => ({ ...prev, [a.id]: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => handleBid(a.id)}
                    disabled={bidding}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm disabled:opacity-50"
                  >
                    {bidding ? '...' : 'Place Bid'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
