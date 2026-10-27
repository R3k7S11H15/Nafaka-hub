import { useState, useEffect } from 'react';
import { Navigation, MapPin, Clock, Truck, Phone, Loader2 } from 'lucide-react';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    'In Transit': 'bg-blue-100 text-blue-800',
    'in_transit': 'bg-blue-100 text-blue-800',
    Scheduled: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-yellow-100 text-yellow-800',
    Loading: 'bg-purple-100 text-purple-800',
    loading: 'bg-purple-100 text-purple-800',
    Delayed: 'bg-red-100 text-red-800',
    delayed: 'bg-red-100 text-red-800',
    Delivered: 'bg-green-100 text-green-800',
    delivered: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function ProgressBar({ progress }) {
  const p = Number(progress || 0);
  const color = p > 70 ? 'bg-green-500' : p > 30 ? 'bg-blue-500' : 'bg-yellow-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden w-32">
        <div className={`h-full ${color}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-8">{p}%</span>
    </div>
  );
}

export default function ActiveDeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getActiveDeliveries();
        if (!mounted) return;
        setDeliveries(Array.isArray(res?.data) ? res.data : Array.isArray(res?.deliveries) ? res.deliveries : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setDeliveries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const inTransit = deliveries.filter(d => (d.status || '').toLowerCase().includes('transit')).length;
  const scheduled = deliveries.filter(d => (d.status || '').toLowerCase() === 'scheduled').length;
  const loadingCount = deliveries.filter(d => (d.status || '').toLowerCase() === 'loading').length;
  const delayed = deliveries.filter(d => (d.status || '').toLowerCase() === 'delayed').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Navigation className="w-8 h-8 text-blue-500" /> Active Deliveries
          </h1>
          <p className="text-gray-600 mt-2">Live tracking of all deliveries in progress</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">In Transit</p>
            <p className="text-2xl font-bold text-blue-600">{inTransit}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Scheduled</p>
            <p className="text-2xl font-bold text-yellow-600">{scheduled}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Loading</p>
            <p className="text-2xl font-bold text-purple-600">{loadingCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Delayed</p>
            <p className="text-2xl font-bold text-red-600">{delayed}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading deliveries...
          </div>
        ) : deliveries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">No active deliveries.</div>
        ) : (
          <div className="space-y-4">
            {deliveries.map((d) => (
              <div key={d.id || d.delivery_id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{d.id || d.delivery_id || '—'} <span className="text-sm text-gray-500 font-normal">({d.shipment || d.shipment_id || ''})</span></h3>
                    <p className="text-sm text-gray-600 mt-1">Customer: {d.customer || d.customer_name || '—'}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Route</p>
                    <p className="text-sm text-gray-900 flex items-center gap-2 mt-1">
                      <MapPin className="w-4 h-4 text-green-500" /> {d.from || d.origin || '—'}
                      <span className="text-gray-400">→</span>
                      <MapPin className="w-4 h-4 text-red-500" /> {d.to || d.destination || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Driver & Vehicle</p>
                    <p className="text-sm text-gray-900 flex items-center gap-2 mt-1">
                      <Truck className="w-4 h-4 text-blue-500" /> {d.driver || d.driver_name || '—'} · {d.vehicle || d.vehicle_plate || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">ETA</p>
                    <p className="text-sm text-gray-900 flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-gray-500" /> {d.eta || d.estimated_arrival || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Progress</p>
                    <div className="mt-1"><ProgressBar progress={d.progress} /></div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 inline-flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> Track Live
                  </button>
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Call Driver
                  </button>
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
