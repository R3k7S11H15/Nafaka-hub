import { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, XCircle, FileText, Loader2 } from 'lucide-react';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    Pending: 'bg-yellow-100 text-yellow-800',
    'Under Review': 'bg-blue-100 text-blue-800',
    Approved: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default function VendorApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getApplications();
        if (!mounted) return;
        setApplications(Array.isArray(res?.data) ? res.data : Array.isArray(res?.applications) ? res.applications : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setApplications([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const pendingCount = applications.filter(a => (a.status || '').toLowerCase() === 'pending').length;
  const reviewCount = applications.filter(a => (a.status || '').toLowerCase() === 'under review' || (a.status || '').toLowerCase() === 'in_review').length;
  const approvedCount = applications.filter(a => (a.status || '').toLowerCase() === 'approved').length;
  const rejectedCount = applications.filter(a => (a.status || '').toLowerCase() === 'rejected').length;

  const stats = [
    { label: 'New Applications', value: applications.length, icon: FileText },
    { label: 'Under Review', value: reviewCount, icon: Clock },
    { label: 'Approved', value: approvedCount, icon: CheckCircle2 },
    { label: 'Rejected', value: rejectedCount, icon: XCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Applications</h1>
            <p className="text-gray-600 mt-2">Review and process new vendor onboarding requests</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            Export List
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <Icon className="w-10 h-10 text-blue-500" />
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
            <div className="flex gap-2">
              <input type="search" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Status</option>
                <option>Pending</option>
                <option>Under Review</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No applications found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Application ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id || app.application_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{app.id || app.application_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{app.name || app.applicant_name || app.full_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{app.business || app.business_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{app.region || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{app.category || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{app.documents ?? app.document_count ?? 0} files</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{app.submitted || app.created_at || app.date || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={app.status} /></td>
                    <td className="px-6 py-4">
                      {(app.status === 'Pending' || app.status === 'Under Review' || (app.status || '').toLowerCase() === 'in_review') ? (
                        <div className="flex gap-2">
                          <button className="text-xs text-green-600 hover:text-green-800 font-medium">Approve</button>
                          <button className="text-xs text-red-600 hover:text-red-800 font-medium">Reject</button>
                        </div>
                      ) : (
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">View</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
