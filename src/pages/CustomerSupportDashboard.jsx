import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle, Users, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function CustomerSupportDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getSupportTickets();
        if (!mounted) return;
        setTickets((res?.tickets || res?.data?.tickets || []));
      } catch {
        if (mounted) setTickets([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const openCount = tickets.filter(t => (t.status || '').toLowerCase() === 'open').length;
  const resolvedCount = tickets.filter(t => (t.status || '').toLowerCase() === 'resolved' || (t.status || '').toLowerCase() === 'closed').length;

  const supportStats = [
    { label: 'Open Tickets', value: openCount, icon: MessageSquare },
    { label: 'Avg Response Time', value: '—', icon: Clock },
    { label: 'Resolved', value: resolvedCount, icon: CheckCircle },
    { label: 'Total Tickets', value: tickets.length, icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Customer Support Dashboard</h1>
          <p className="text-gray-600 mt-2">User support and ticket resolution</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {supportStats.map((stat) => {
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

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Support Tickets</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No support tickets.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket.id || ticket.ticket_id}>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{ticket.id || ticket.ticket_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{ticket.customer || ticket.customer_name || ticket.user_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ticket.subject || ticket.title || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(ticket.priority || '').toLowerCase() === 'high' ? 'bg-red-100 text-red-800' : (ticket.priority || '').toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                        {ticket.priority || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(ticket.status || '').toLowerCase() === 'resolved' || (ticket.status || '').toLowerCase() === 'closed' ? 'bg-green-100 text-green-800' : (ticket.status || '').toLowerCase() === 'in progress' || (ticket.status || '').toLowerCase() === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {ticket.status || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{ticket.created_at || ticket.created || '—'}</td>
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
