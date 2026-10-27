import { useState, useEffect } from 'react';
import { Globe, Ship, FileText, Plane, CheckCircle, Clock, Plus, Download, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const statsConfig = [
  { label: 'Export Orders', icon: Ship },
  { label: 'Countries Served', icon: Globe },
  { label: 'Revenue', icon: Plane },
  { label: 'Certifications', icon: CheckCircle },
];

export default function ExportModule() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderForm, setOrderForm] = useState({ product: '', quantity: '', destination: '', port: '', shipDate: '' });
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getProducts({ limit: 50 });
        if (!mounted) return;
        const list = res?.data?.products || res?.data || res?.products || res || [];
        setOrders(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setOrderForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Export order submitted successfully')
  };

  const countries = new Set(orders.map(o => o.region || o.location || o.country).filter(Boolean));
  const stats = [
    { ...statsConfig[0], value: String(orders.length) },
    { ...statsConfig[1], value: String(countries.size) },
    { ...statsConfig[2], value: '—' },
    { ...statsConfig[3], value: '—' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Export Module</h1>
          <p className="text-gray-600 mt-2">Connect with international buyers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
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

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Products for Export</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500"><Loader2 className="animate-spin w-6 h-6 mr-2" />Loading export listings...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No export listings available yet.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((o, i) => (
                  <tr key={o.id || i}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{o.name || o.title || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{o.seller_name || o.seller || o.vendor || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{o.region || o.location || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{o.stock || o.quantity || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Documents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { name: 'Phytosanitary Certificate', status: 'Ready', icon: FileText },
            { name: 'Export License', status: 'Valid', icon: CheckCircle },
            { name: 'Bill of Lading', status: 'Pending', icon: Clock },
            { name: 'Certificate of Origin', status: 'Ready', icon: FileText },
          ].map((doc) => {
            const Icon = doc.icon;
            return (
              <div key={doc.name} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div className="flex items-center">
                  <Icon className="w-6 h-6 text-gray-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{doc.name}</p>
                    <p className="text-sm text-gray-500">{doc.status}</p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800"><Download className="w-5 h-5" /></button>
              </div>
            );
          })}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">New Export Order</h2>
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select name="product" value={orderForm.product} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                <option value="">Select Product</option>
                {orders.map((o, i) => <option key={i} value={o.id || o.name}>{o.name || o.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="text" name="quantity" value={orderForm.quantity} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination Country</label>
              <input type="text" name="destination" value={orderForm.destination} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port of Loading</label>
              <select name="port" value={orderForm.port} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                <option value="">Select Port</option>
                <option value="dar">Dar es Salaam</option>
                <option value="zanzibar">Zanzibar</option>
                <option value="tanga">Tanga</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Ship Date</label>
              <input type="date" name="shipDate" value={orderForm.shipDate} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">Create Export Order</button>
            </div>
          </form>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Customs Paperwork Checklist</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-3">
            {[
              { item: 'Complete Export Declaration Form', done: true },
              { item: 'Obtain Phytosanitary Certificate', done: true },
              { item: 'Arrange Pre-shipment Inspection', done: false },
              { item: 'Pay Customs Duties', done: false },
              { item: 'Submit Shipping Documents', done: false },
            ].map((item) => (
              <div key={item.item} className="flex items-center">
                {item.done ? <CheckCircle className="w-5 h-5 text-green-500 mr-3" /> : <div className="w-5 h-5 border-2 border-gray-300 rounded-full mr-3" />}
                <span className={item.done ? 'text-gray-900 line-through' : 'text-gray-700'}>{item.item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
