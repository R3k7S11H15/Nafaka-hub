import React, { useEffect, useState } from 'react'
import { Search, Calendar, User, ArrowRight, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getBlogPosts()
        if (data.success) setPosts(data.posts || [])
        else setError(data.message || 'Failed to load')
      } catch (err) { setError('Failed to connect') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const filtered = posts.filter(p =>
    !search ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.excerpt || '').toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toISOString().slice(0, 10)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
        <p className="text-gray-500 mt-2">Insights, tips, and news from the agricultural world</p>
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles..." className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
      ) : error ? (
        <div className="text-center text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No articles published yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="h-48 bg-gray-100 overflow-hidden">
                <img src={post.image_url || 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop'} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  {post.category && <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">{post.category}</span>}
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.published_at)}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">{post.title}</h3>
                <p className="text-sm text-gray-500 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 flex items-center gap-1"><User className="w-3 h-3" />{post.author || 'Nafaka Hub'}</span>
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">Read More <ArrowRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
