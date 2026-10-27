import { useState, useEffect } from 'react';
import { MapPin, Clock, Truck, Route as RouteIcon, Loader2 } from 'lucide-react';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    Active: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    Seasonal: 'bg-yellow-100 text-yellow-800',
    seasonal: 'bg-yellow-100 text-yellow-800',
    Customs: 'bg-purple-100 text-purple-800',
    customs: 'bg-purple-100 text-purple-800',
    Suspended: 'bg-red-100 text-red-800',
    suspended: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getRoutes();
        if (!mounted) return;
        setRoutes(Array.isArray(res?.data) ? res.data : Array.isArray(res?.routes) ? res.routes : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setRoutes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const totalShipments = routes.reduce((sum, r) => sum + Number(r.shipments || r.shipment_count || 0), 0);
  const totalVehicles = routes.reduce((sum, r) => sum + Number(r.vehicles || r.vehicle_count || 0), 0);
  const activeCount = routes.filter(r => (r.status || '').toLowerCase() === 'active').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <RouteIcon className="w-8 h-8 text-blue-500" /> Routes
            </h1>
            <p className="text-gray-600 mt-2">Manage transport routes and waypoints</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            Add Route
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total Routes</p>
            <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Active Shipments</p>
            <p className="text-2xl font-bold text-blue-600">{totalShipments}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Vehicles Deployed</p>
            <p className="text-2xl font-bold text-purple-600">{totalVehicles}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading routes...
          </div>
        ) : routes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">No routes configured.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {routes.map((route) => (
              <div key={route.id || route.route_id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{route.name || `${route.from || ''} → ${route.to || ''}`}</h3>
                    <p className="text-xs text-gray-500 mt-1">{route.id || route.route_id || ''}</p>
                  </div>
                  <StatusBadge status={route.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 my-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Distance</p>
                    <p className="font-semibold text-gray-900">{route.distance || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Est. Duration</p>
                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {route.duration || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Shipments</p>
                    <p className="font-semibold text-gray-900">{route.shipments ?? route.shipment_count ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Vehicles</p>
                    <p className="font-semibold text-gray-900 flex items-center gap-1">
                      <Truck className="w-3 h-3" /> {route.vehicles ?? route.vehicle_count ?? '—'}
                    </p>
                  </div>
                </div>

                {Array.isArray(route.stops) && route.stops.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Stops</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {route.stops.map((stop, i) => (
                        <span key={i} className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {stop}
                          </span>
                          {i < route.stops.length - 1 && <span className="text-gray-400">→</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">
                    View on Map
                  </button>
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50">
                    Edit
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
