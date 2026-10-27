import { useState, useEffect } from 'react';
import { Truck, Package, CheckCircle, AlertTriangle, MapPin, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function TransportManagerDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [d, dr, r] = await Promise.all([
          api.getActiveDeliveries(),
          api.getDrivers(),
          api.getRoutes(),
        ]);
        if (!mounted) return;
        setDeliveries(Array.isArray(d?.data) ? d.data : Array.isArray(d?.deliveries) ? d.deliveries : Array.isArray(d) ? d : []);
        setDrivers(Array.isArray(dr?.data) ? dr.data : Array.isArray(dr?.drivers) ? dr.drivers : Array.isArray(dr) ? dr : []);
        setRoutes(Array.isArray(r?.data) ? r.data : Array.isArray(r?.routes) ? r.routes : Array.isArray(r) ? r : []);
      } catch {
        if (mounted) {
          setDeliveries([]);
          setDrivers([]);
          setRoutes([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const inTransit = deliveries.filter(d => (d.status || '').toLowerCase().includes('transit')).length;
  const delayed = deliveries.filter(d => (d.status || '').toLowerCase() === 'delayed').length;

  const transportStats = [
    { label: 'Active Shipments', value: deliveries.length, icon: Truck },
    { label: 'Available Trucks', value: '—', icon: Package },
    { label: 'In Transit', value: inTransit, icon: CheckCircle },
    { label: 'Delayed', value: delayed, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transport Manager Dashboard</h1>
          <p className="text-gray-600 mt-2">Logistics and delivery coordination</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {transportStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <Icon className="w-10 h-10 text-blue-500" />
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Shipments</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading shipments...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No active shipments.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ETA</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deliveries.map((shipment) => (
                  <tr key={shipment.id || shipment.delivery_id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{shipment.from || shipment.origin || '—'} → {shipment.to || shipment.destination || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{shipment.cargo || shipment.item || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{shipment.driver || shipment.driver_name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(shipment.status || '').toLowerCase() === 'delivered' ? 'bg-green-100 text-green-800' : (shipment.status || '').toLowerCase().includes('transit') ? 'bg-blue-100 text-blue-800' : (shipment.status || '').toLowerCase() === 'loading' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {shipment.status || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{shipment.eta || shipment.estimated_arrival || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Driver Status</h2>
        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="animate-spin w-5 h-5 mr-2" /> Loading drivers...
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No drivers available.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drivers.slice(0, 10).map((driver, idx) => {
                const status = (driver.status || '').toLowerCase();
                const isAvailable = status === 'active' || status === 'available';
                const isOnRoute = status.includes('trip') || status.includes('route');
                return (
                  <div key={driver.id || driver.driver_id || idx} className="flex items-center p-4 border border-gray-200 rounded-lg">
                    <div className={`p-2 rounded-lg mr-4 ${isAvailable ? 'bg-green-100' : isOnRoute ? 'bg-blue-100' : 'bg-yellow-100'}`}>
                      <MapPin className={`w-5 h-5 ${isAvailable ? 'text-green-600' : isOnRoute ? 'text-blue-600' : 'text-yellow-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{driver.name || driver.full_name || '—'}</p>
                      <p className="text-xs text-gray-500">{driver.location || driver.region || '—'}</p>
                    </div>
                    <span className={`text-xs font-medium ${isAvailable ? 'text-green-600' : isOnRoute ? 'text-blue-600' : 'text-yellow-600'}`}>
                      {driver.status || '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
