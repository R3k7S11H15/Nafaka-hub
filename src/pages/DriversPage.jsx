import { useState, useEffect } from 'react';
import { Users, Phone, Truck, Star, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    Active: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    'On Trip': 'bg-blue-100 text-blue-800',
    'on_trip': 'bg-blue-100 text-blue-800',
    'On Leave': 'bg-yellow-100 text-yellow-800',
    'on_leave': 'bg-yellow-100 text-yellow-800',
    Suspended: 'bg-red-100 text-red-800',
    suspended: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getDrivers();
        if (!mounted) return;
        setDrivers(Array.isArray(res?.data) ? res.data : Array.isArray(res?.drivers) ? res.drivers : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setDrivers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const active = drivers.filter(d => (d.status || '').toLowerCase() === 'active').length;
  const onTrip = drivers.filter(d => (d.status || '').toLowerCase().includes('trip')).length;
  const onLeave = drivers.filter(d => (d.status || '').toLowerCase().includes('leave')).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-500" /> Drivers
            </h1>
            <p className="text-gray-600 mt-2">Manage drivers, vehicles and assignments</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            Add Driver
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Drivers</p>
            <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">{active}</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">On Trip</p>
            <p className="text-2xl font-bold text-blue-600">{onTrip}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">On Leave</p>
              <p className="text-2xl font-bold text-yellow-600">{onLeave}</p>
            </div>
            <XCircle className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Driver Roster</h2>
            <div className="flex gap-2">
              <input type="search" placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Regions</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading drivers...
            </div>
          ) : drivers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No drivers found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deliveries</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drivers.map((d) => (
                  <tr key={d.id || d.driver_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-blue-600">{d.id || d.driver_id || '—'}</div>
                      <div className="text-sm text-gray-900">{d.name || d.full_name || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 inline-flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {d.phone || d.phone_number || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-900">
                        <Truck className="w-3 h-3" /> {d.vehicle || d.vehicle_plate || '—'}
                      </div>
                      <div className="text-xs text-gray-500">{d.type || d.vehicle_type || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{d.region || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{d.deliveries ?? d.delivery_count ?? '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 text-gray-900">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {d.rating ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{d.license || d.license_expiry || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Manage</button>
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
