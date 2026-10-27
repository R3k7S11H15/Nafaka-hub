import React, { useEffect, useState } from 'react'
import { Users, MapPin, Plus, ChevronRight, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function Cooperatives() {
  const [cooperatives, setCooperatives] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [details, setDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getCooperatives()
        if (data.success) setCooperatives(data.cooperatives || [])
        else setError(data.message || 'Failed to load')
      } catch (err) { setError('Failed to connect') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const viewDetails = async (id) => {
    setSelected(id)
    setDetailsLoading(true)
    try {
      const data = await api.getCooperative(id)
      if (data.success) setDetails(data)
    } catch (err) { /* ignore */ }
    finally { setDetailsLoading(false) }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cooperatives</h1>
          <p className="text-gray-600 mt-1">Farmer cooperatives across Tanzania</p>
        </div>
        <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          <Plus className="w-4 h-4" /> Join Cooperative
        </button>
      </div>

      {cooperatives.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No cooperatives registered yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cooperatives.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{c.name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {c.region}{c.district ? `, ${c.district}` : ''}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{c.description}</p>
              <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-3">
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{c.member_count || 0} members</span>
                </div>
                {c.leader_name && <span className="text-xs text-gray-500">Lead: {c.leader_name}</span>}
              </div>
              <button onClick={() => viewDetails(c.id)} className="mt-3 w-full text-green-600 hover:text-green-700 text-sm font-medium flex items-center justify-center gap-1">
                View Details <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => { setSelected(null); setDetails(null) }}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailsLoading ? (
              <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto" /></div>
            ) : details ? (
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{details.cooperative?.name}</h2>
                <p className="text-gray-600 mb-4">{details.cooperative?.description}</p>
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Region</p>
                    <p className="font-medium">{details.cooperative?.region}, {details.cooperative?.district}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-500">Members</p>
                    <p className="font-medium">{details.cooperative?.member_count || 0}</p>
                  </div>
                  {details.cooperative?.leader_name && (
                    <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                      <p className="text-gray-500">Leader</p>
                      <p className="font-medium">{details.cooperative?.leader_name}</p>
                    </div>
                  )}
                </div>
                {details.members?.length > 0 && (
                  <>
                    <h3 className="font-semibold text-gray-900 mb-2">Members</h3>
                    <div className="space-y-1 mb-4">
                      {details.members.slice(0, 10).map(m => (
                        <div key={m.id} className="text-sm flex justify-between border-b border-gray-100 py-1">
                          <span>{m.full_name}</span>
                          <span className="text-gray-500">{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {details.announcements?.length > 0 && (
                  <>
                    <h3 className="font-semibold text-gray-900 mb-2">Announcements</h3>
                    <div className="space-y-2">
                      {details.announcements.map(a => (
                        <div key={a.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="font-medium text-sm">{a.title}</p>
                          {a.body && <p className="text-xs text-gray-600 mt-1">{a.body}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <button onClick={() => { setSelected(null); setDetails(null) }} className="mt-4 w-full bg-gray-100 py-2 rounded-lg">Close</button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
