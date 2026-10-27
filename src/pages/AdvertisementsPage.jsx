import { useState, useEffect } from 'react';
import { Globe, Plus, Edit, Trash2, Eye, Calendar, Loader2 } from 'lucide-react';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    Active: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    Paused: 'bg-yellow-100 text-yellow-800',
    paused: 'bg-yellow-100 text-yellow-800',
    Scheduled: 'bg-blue-100 text-blue-800',
    scheduled: 'bg-blue-100 text-blue-800',
    Expired: 'bg-gray-100 text-gray-800',
    expired: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default function AdvertisementsPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getAdvertisements();
        if (!mounted) return;
        setAds(Array.isArray(res?.data) ? res.data : Array.isArray(res?.advertisements) ? res.advertisements : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setAds([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const totalImpressions = ads.reduce((s, a) => s + Number(a.impressions || 0), 0);
  const totalClicks = ads.reduce((s, a) => s + Number(a.clicks || 0), 0);
  const activeCount = ads.filter(a => (a.status || '').toLowerCase() === 'active').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="w-8 h-8 text-blue-500" /> Advertisements
            </h1>
            <p className="text-gray-600 mt-2">Manage promotional campaigns and placements</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Active Campaigns</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Impressions</p>
            <p className="text-2xl font-bold text-gray-900">{totalImpressions.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Clicks</p>
            <p className="text-2xl font-bold text-blue-600">{totalClicks.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Campaigns</p>
            <p className="text-2xl font-bold text-purple-600">{ads.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Campaigns</h2>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>All Status</option>
              <option>Active</option>
              <option>Paused</option>
              <option>Scheduled</option>
              <option>Expired</option>
            </select>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading campaigns...
            </div>
          ) : ads.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No campaigns found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Placement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impressions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ads.map((ad) => (
                  <tr key={ad.id || ad.ad_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-blue-600">{ad.id || ad.ad_id || '—'}</div>
                      <div className="text-sm text-gray-900">{ad.title || ad.name || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ad.placement || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{Number(ad.impressions || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{Number(ad.clicks || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {ad.starts || ad.start_date || '—'} → {ad.ends || ad.end_date || '—'}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={ad.status} /></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800" title="View"><Eye className="w-4 h-4" /></button>
                        <button className="text-gray-600 hover:text-gray-800" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button className="text-red-600 hover:text-red-800" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
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
