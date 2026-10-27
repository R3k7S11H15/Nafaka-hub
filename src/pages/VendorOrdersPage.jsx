import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  Loader2,
  ClipboardList,
  Eye,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  CheckSquare,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button, Card } from '../components/UI';

const fmtMoney = (v) => {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  return `TZS ${Number(v).toLocaleString()}`;
};

const STATUS_LABELS = {
  buyer_marked_paid: 'Awaiting Payment Confirmation',
  paid: 'Paid',
  processing: 'Processing',
  ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  payment_rejected: 'Payment Rejected',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

const STATUS_COLORS = {
  buyer_marked_paid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  ready_for_delivery: 'bg-purple-100 text-purple-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  payment_rejected: 'bg-red-100 text-red-800',
  disputed: 'bg-orange-100 text-orange-800',
  refunded: 'bg-pink-100 text-pink-800',
};

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    ;(async () => {
      try {
        const res = await api.getMyVendorOrders({ limit: 1000 });
        if (!mounted) return;
        const list =
          Array.isArray(res?.orders)
            ? res.orders
            : Array.isArray(res?.data?.orders)
            ? res.data.orders
            : [];
        setOrders(list);
      } catch {
        if (mounted) setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = orders.filter((o) => {
    const matchesSearch =
      !search ||
      (o.order_number || '')
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (o.customer_name || '')
        .toLowerCase()
        .includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    return (o.status || '').toLowerCase() === filter.toLowerCase();
  });

  const stats = {
    total: orders.length,
    awaiting: orders.filter(
      (o) => (o.status || '').toLowerCase() === 'buyer_marked_paid'
    ).length,
    paid: orders.filter(
      (o) => (o.status || '').toLowerCase() === 'paid'
    ).length,
    processing: orders.filter(
      (o) => (o.status || '').toLowerCase() === 'processing'
    ).length,
    delivered: orders.filter(
      (o) =>
        (o.status || '').toLowerCase() === 'delivered' ||
        (o.status || '').toLowerCase() === 'completed'
    ).length,
  };

  const handleConfirmPayment = async (order) => {
    const confirmed = window.confirm(
      `Confirm receipt of payment for order #${order.order_number}?\n\n` +
        `Amount: ${fmtMoney(order.total_amount)}\n` +
        `Payment reference: ${order.payment_reference || order.seller_payment_method || 'N/A'}`
    );
    if (!confirmed) return;

    setActionLoading(`${order.id}-confirm`);
    try {
      const res = await api.confirmSellerPayment({
        order_id: order.id,
        seller_notes: `Payment confirmed by seller`,
      });
      if (!res?.success) throw new Error(res?.message || 'Failed to confirm payment');
      setOrders(
        orders.map((o) => (o.id === order.id ? { ...o, status: 'paid', payment_status: 'completed' } : o))
      );
      toast.success('Payment confirmed! Order moved to Paid.');
    } catch (err) {
      toast.error(err.message || 'Failed to confirm payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPayment = async (order) => {
    const reason = window.prompt(
      `Reject payment for order #${order.order_number}?\nEnter the reason for rejection:`
    );
    if (reason === null) return; // user cancelled

    setActionLoading(`${order.id}-reject`);
    try {
      const res = await api.rejectSellerPayment({
        order_id: order.id,
        reason: reason || 'Payment rejected by seller',
      });
      if (!res?.success) throw new Error(res?.message || 'Failed to reject payment');
      setOrders(
        orders.map((o) =>
          o.id === order.id ? { ...o, status: 'payment_rejected', payment_status: 'rejected' } : o
        )
      );
      toast.success('Payment rejected. Buyer will need to retry.');
    } catch (err) {
      toast.error(err.message || 'Failed to reject payment');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-1">Orders placed on your products</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Orders', value: String(stats.total), icon: ClipboardList, color: 'blue' },
            {
              label: 'Awaiting Confirmation',
              value: String(stats.awaiting),
              icon: Clock,
              color: 'yellow',
            },
            {
              label: 'Paid',
              value: String(stats.paid),
              icon: CheckCircle,
              color: 'green',
            },
            {
              label: 'Processing',
              value: String(stats.processing),
              icon: Truck,
              color: 'purple',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Card className="shadow-card">
          <div className="flex items-center gap-4 p-6 pb-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="all">All Status</option>
              <option value="buyer_marked_paid">Awaiting Confirmation</option>
              <option value="paid">Paid</option>
              <option value="processing">Processing</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="payment_rejected">Payment Rejected</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No orders found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      Payment Ref
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order) => {
                    const isAwaitingPayment =
                      order.status === 'buyer_marked_paid' ||
                      order.status === 'pending_payment';

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-4 px-4 text-sm font-medium text-blue-600">
                          {order.order_number || `#${order.id}`}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900">
                          {order.customer_name || '—'}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                          {fmtMoney(order.total_amount)}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-900 font-mono">
                          {order.payment_reference || order.transaction_ref || '—'}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {STATUS_LABELS[order.status] || order.status || '—'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-500">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {isAwaitingPayment && order.status === 'buyer_marked_paid' && (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={XCircle}
                                  loading={actionLoading === `${order.id}-reject`}
                                  onClick={() => handleRejectPayment(order)}
                                  title="Reject Payment"
                                />
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={CheckSquare}
                                  loading={actionLoading === `${order.id}-confirm`}
                                  onClick={() => handleConfirmPayment(order)}
                                  title="Confirm Payment"
                                />
                              </>
                            )}
                            <NavLink
                              to={`/tracking/${order.id}`}
                              className="text-blue-600 hover:text-blue-800"
                              title="View Order"
                            >
                              <Eye className="w-4 h-4" />
                            </NavLink>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
