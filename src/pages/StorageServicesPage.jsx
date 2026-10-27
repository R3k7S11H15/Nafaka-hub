import { useState, useEffect } from 'react';
import { Warehouse, MapPin, Thermometer, Calendar, Loader2 } from 'lucide-react';
import api from '../services/api';

const featuresList = (f) => {
  if (Array.isArray(f)) return f;
  if (typeof f === 'string') return f.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

export default function StorageServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getWarehouses();
        if (!mounted) return;
        setServices(res?.data || res?.warehouses || res || []);
      } catch {
        if (mounted) setServices([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const stats = [
    { label: 'Active Facilities', value: services.length, icon: Warehouse },
    { label: 'Total Capacity', value: '—', icon: Thermometer },
    { label: 'Locations', value: new Set(services.map(s => s.region || s.location).filter(Boolean)).size, icon: MapPin },
    { label: 'Avg. Occupancy', value: '—', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Storage Services</h1>
          <p className="text-gray-600 mt-2">Available storage facilities and warehouses across Tanzania</p>
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

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading facilities...
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">No storage facilities available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((service) => {
              const features = featuresList(service.features);
              const available = service.available !== false && (service.status || '').toLowerCase() !== 'full';
              return (
                <div key={service.id || service.warehouse_id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{service.name || service.warehouse_name || 'Facility'}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {service.provider || service.location || service.region || '—'}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {available ? 'Available' : 'Full'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-4 text-sm">
                    <div>
                      <p className="text-gray-500">Capacity</p>
                      <p className="font-semibold text-gray-900">{service.capacity || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Rate</p>
                      <p className="font-semibold text-gray-900">{service.rate || service.price || '—'}</p>
                    </div>
                  </div>

                  {features.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Features</p>
                      <div className="flex flex-wrap gap-2">
                        {features.map((f, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50" disabled={!available}>
                      Book Now
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
