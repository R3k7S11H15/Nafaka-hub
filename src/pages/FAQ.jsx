import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, HelpCircle, ChevronRight, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function FAQ() {
  const [faqs, setFaqs] = useState([])
  const [openIndex, setOpenIndex] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getFaqs()
        if (data.success) setFaqs(data.faqs || [])
        else setError(data.message || 'Failed to load')
      } catch (err) { setError('Failed to connect') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const grouped = faqs.reduce((acc, f) => {
    const cat = f.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(f)
    return acc
  }, {})

  const filtered = (q) => {
    if (!search) return q
    const s = search.toLowerCase()
    return q.filter(item =>
      item.question.toLowerCase().includes(s) ||
      (item.answer && item.answer.toLowerCase().includes(s))
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
        <p className="text-gray-500 mt-2">Find answers to common questions about our platform</p>
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search for answers..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center text-gray-500 py-12">No FAQs published yet.</div>
        ) : (
          Object.entries(grouped).map(([category, items]) => {
            const visible = filtered(items)
            if (visible.length === 0) return null
            return (
              <div key={category}>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 capitalize">{category}</h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
                  {visible.map((item, j) => {
                    const key = `${category}-${item.id}`
                    return (
                      <div key={item.id}>
                        <button onClick={() => setOpenIndex(openIndex === key ? null : key)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
                          <span className="font-medium text-gray-900">{item.question}</span>
                          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${openIndex === key ? 'rotate-90' : ''}`} />
                        </button>
                        {openIndex === key && (
                          <div className="px-5 pb-5 text-gray-600 text-sm">{item.answer}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="bg-green-50 rounded-xl p-8 text-center">
        <HelpCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Still have questions?</h3>
        <p className="text-gray-600 mb-4">Our support team is here to help you.</p>
        <div className="flex justify-center gap-4">
          <NavLink to="/contact" className="btn-primary">Contact Support</NavLink>
          <NavLink to="/help-center" className="btn-secondary">Help Center</NavLink>
        </div>
      </div>
    </div>
  )
}
