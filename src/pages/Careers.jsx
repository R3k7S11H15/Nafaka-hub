import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Users, Heart, DollarSign, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function Careers() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getJobs()
        if (data.success) setJobs(data.jobs || [])
        else setError(data.message || 'Failed to load')
      } catch (err) { setError('Failed to connect') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Join Our Team</h1>
        <p className="text-lg text-gray-600">Help us transform agriculture in Tanzania. We are looking for passionate people to join our growing team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4"><Users className="w-6 h-6 text-blue-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Great Culture</h3>
          <p className="text-sm text-gray-600 mt-2">Work with a passionate team dedicated to transforming agriculture.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-4"><Heart className="w-6 h-6 text-green-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Impact</h3>
          <p className="text-sm text-gray-600 mt-2">Make a real difference in the lives of thousands of farmers and traders.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center mx-auto mb-4"><DollarSign className="w-6 h-6 text-yellow-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Competitive Pay</h3>
          <p className="text-sm text-gray-600 mt-2">We offer competitive salaries and benefits to our team members.</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Open Positions</h2>
      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
      ) : error ? (
        <div className="text-center text-red-600 py-8">{error}</div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No open positions at the moment.</div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {job.location}{job.department ? ` · ${job.department}` : ''} · {job.type}
                  </p>
                  <p className="text-gray-600 mt-2">{job.description}</p>
                  {job.requirements && <p className="text-sm text-gray-500 mt-2"><strong>Requirements:</strong> {job.requirements}</p>}
                </div>
                <button className="btn-primary">Apply Now</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-green-50 rounded-xl p-8 text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Don't see the right fit?</h3>
        <p className="text-gray-600 mb-4">Send us your resume and we will keep you in mind for future openings.</p>
        <NavLink to="/contact" className="btn-primary inline-flex items-center gap-2">Contact Us</NavLink>
      </div>
    </div>
  )
}
