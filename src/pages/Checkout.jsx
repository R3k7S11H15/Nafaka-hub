import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CreditCard,
  Truck,
  Check,
  CheckCircle,
  Lock,
  User,
  Phone,
  MapPin,
  Building,
  PackageCheck,
  Loader2,
  QrCode,
  RefreshCw,
  Copy,
  ExternalLink,
  Clock,
   AlertCircle,
  HelpCircle,
} from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../hooks/useSSE';
import { Button, Input, Card, ErrorAlert } from '../components/UI';

// Waiting for a prompt to be approved is normal, so poll gently and briefly.
const AUTO_POLL_INTERVAL_MS = 5000;
const AUTO_POLL_ATTEMPTS = 24; // ~2 minutes, then the buyer can check manually

const PAYMENT_METHODS = [
  { value: 'mobile_money', label: 'M-Pesa', icon: '📱' },
  { value: 'mobile_money', label: 'Airtel Money', icon: '📱' },
  { value: 'mobile_money', label: 'Tigo Pesa', icon: '📱' },
  { value: 'lipa_namba', label: 'Lipa Namba', icon: '📱' },
  { value: 'card', label: 'Card', icon: '💳' },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
];

const STEPS = [
  { number: 1, label: 'Order Summary', icon: PackageCheck },
  { number: 2, label: 'Shipping', icon: Truck },
  { number: 3, label: 'Payment Method', icon: CreditCard },
  { number: 4, label: 'Pay', icon: Building },
  { number: 5, label: 'Make Payment', icon: CreditCard },
  { number: 6, label: 'Confirm Payment', icon: Check },
  { number: 7, label: 'Awaiting Seller', icon: Clock },
];

function OrderSummary({ cartItems, totalAmount, shipping, platformFee, total }) {
  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="font-semibold text-gray-900 mb-3">Order Items ({cartItems.length})</h3>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {cartItems.map((item) => (
            <div key={item.product_id || item.id} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                {(item.image || item.image_url) ? (
                  <img src={item.image || item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <PackageCheck className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.name || item.product_name}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">TZS {(((item.price ?? item.unit_price) || 0) * item.quantity).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>TZS {Number(totalAmount || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Shipping</span>
          <span>TZS {Number(shipping || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Platform fee (3%)</span>
          <span>TZS {Number(platformFee || 0).toLocaleString()}</span>
        </div>
        <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-lg">
          <span>Total to Pay</span>
          <span className="text-green-600">
            TZS {Number(total || 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Building className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Direct Payment to Seller</h4>
            <p className="text-sm text-blue-700">
              You will pay the seller directly. The seller must confirm receipt of your payment
              before your order moves to processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SellerPaymentDestination({ sellerMethod }) {
  if (!sellerMethod) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
        <p>No payment method configured by this seller.</p>
        <p className="text-sm mt-2">The seller needs to add a payment method before you can pay.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Payment Destination</h3>
        <p className="text-sm text-gray-500 mb-4">
          Send the exact amount to the seller's {sellerMethod.payment_method === 'mobile_money' ? 'mobile money' : sellerMethod.payment_method === 'lipa_namba' ? 'Lipa Namba' : 'bank'} account.
        </p>

        {sellerMethod.account_name && (
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase">Account Name</label>
            <p className="text-lg font-medium text-gray-900 mt-1">{sellerMethod.account_name}</p>
          </div>
        )}

        {sellerMethod.phone_number && (
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase">Phone Number</label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg font-medium text-gray-900">{sellerMethod.phone_number}</p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(sellerMethod.phone_number)}
                className="p-1 text-gray-500 hover:text-gray-700"
                aria-label="Copy phone number"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {sellerMethod.bank_name && (
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase">Bank</label>
            <p className="text-lg font-medium text-gray-900 mt-1">{sellerMethod.bank_name}</p>
          </div>
        )}

        {sellerMethod.bank_account_number && (
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase">Account Number</label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg font-medium text-gray-900 font-mono">{sellerMethod.bank_account_number}</p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(sellerMethod.bank_account_number)}
                className="p-1 text-gray-500 hover:text-gray-700"
                aria-label="Copy account number"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {sellerMethod.lipa_number && (
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 uppercase">Lipa Number</label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg font-medium text-gray-900 font-mono">{sellerMethod.lipa_number}</p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(sellerMethod.lipa_number)}
                className="p-1 text-gray-500 hover:text-gray-700"
                aria-label="Copy lipa number"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {sellerMethod.provider && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Provider</label>
            <p className="text-sm text-gray-900 mt-1">{sellerMethod.provider}</p>
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-yellow-900 mb-1">Important</h4>
            <p className="text-sm text-yellow-800">
              Send the exact amount shown in the order summary. Use a reference that you can record.
              After completing the payment, enter your payment reference below and click
              "I HAVE MADE THE PAYMENT".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentInstructionsCard({ paymentResponse, formData }) {
  const instructions = paymentResponse?.instructions;
  let parsedInstructions = null;
  if (instructions) {
    try {
      parsedInstructions = typeof instructions === 'string' ? JSON.parse(instructions) : instructions;
    } catch {
      parsedInstructions = null;
    }
  }

  const bankInstructions = parsedInstructions?.instructions;
  const phoneDisplay = formData.phone_number;
  const paymentRef = paymentResponse?.reference || paymentResponse?.provider_ref;

  return (
    <div className="mt-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
      <div className="flex items-start gap-3 mb-4">
        <QrCode className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-blue-900 text-lg">
            Complete your payment
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            Follow the payment instructions below to complete your payment to the seller.
          </p>
        </div>
      </div>

      {phoneDisplay && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Payment Phone Number
          </p>
          <p className="text-xl font-bold text-gray-900">{phoneDisplay}</p>
        </div>
      )}

      {paymentRef && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Reference Number</p>
              <p className="text-sm font-mono text-gray-900 break-all">{paymentRef}</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(paymentRef)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Copy reference"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {bankInstructions && (
        <div className="bg-white rounded-lg p-4 border border-blue-200 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {bankInstructions.institution && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Bank</p>
                <p className="font-medium text-gray-900">{bankInstructions.institution}</p>
              </div>
            )}
            {bankInstructions.accountNumber && (
              <div>
                <p className="text-xs text-gray-500 uppercase">Account No.</p>
                <p className="font-medium text-gray-900 font-mono">{bankInstructions.accountNumber}</p>
              </div>
            )}
            {bankInstructions.accountName && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase">Account Name</p>
                <p className="font-medium text-gray-900">{bankInstructions.accountName}</p>
              </div>
            )}
          </div>
          {bankInstructions.amountTzs && (
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase">Amount to Transfer</p>
              <p className="font-bold text-lg text-gray-900">
                TZS {Number(bankInstructions.amountTzs).toLocaleString()}
              </p>
            </div>
          )}
          {bankInstructions.note && (
            <p className="text-xs text-gray-600 mt-2">{bankInstructions.note}</p>
          )}
        </div>
      )}

      {parsedInstructions?.payment_url && (
        <div className="text-center mt-4">
          <Button
            variant="primary"
            onClick={() => (window.location.href = parsedInstructions.payment_url)}
            icon={ExternalLink}
          >
            Complete Payment
          </Button>
        </div>
      )}

      {parsedInstructions?.instructions && typeof parsedInstructions.instructions === 'string' && (
        <p className="text-sm text-blue-800 mt-2">{parsedInstructions.instructions}</p>
      )}
    </div>
  );
}

function PaymentStatusIndicator({ status, desc }) {
  const configs = {
    initiated: {
      icon: Loader2,
      iconClass: 'animate-spin',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      title: 'Payment Initiated',
      defaultDesc: 'Waiting for you to complete the payment on your device or redirect page.',
    },
    completed: {
      icon: CheckCircle,
      iconClass: '',
      color: 'text-green-600',
      bg: 'bg-green-100',
      title: 'Payment Confirmed!',
      defaultDesc: 'Your payment was successful. Your order is now being processed.',
    },
    failed: {
      icon: AlertCircle,
      iconClass: '',
      color: 'text-red-600',
      bg: 'bg-red-100',
      title: 'Payment Failed',
      defaultDesc: 'The payment could not be processed. Please try a different payment method.',
    },
    reversed: {
      icon: AlertCircle,
      iconClass: '',
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      title: 'Payment Reversed',
      defaultDesc: 'The payment was refunded or reversed.',
    },
    unverified: {
      icon: HelpCircle,
      iconClass: '',
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      title: 'Payment Not Yet Confirmed',
      defaultDesc:
        'We could not confirm whether the payment prompt reached you. Please do not pay again until you check.',
    },
    cod_pending: {
      icon: Truck,
      iconClass: '',
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      title: 'Awaiting Finance Approval',
      defaultDesc: 'Cash on Delivery orders require finance approval before fulfillment begins.',
    },
    pending_seller: {
      icon: Clock,
      iconClass: 'animate-pulse',
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      title: 'Awaiting Seller Confirmation',
      defaultDesc: 'The seller has been notified and will confirm receipt of your payment.',
    },
  };

  const cfg = configs[status] || configs.initiated;
  const Icon = cfg.icon;

  return (
    <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-100">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon className={`w-6 h-6 ${cfg.color} ${cfg.iconClass}`} />
      </div>
      <div>
        <h3 className={`text-xl font-bold ${cfg.color}`}>{cfg.title}</h3>
        <p className="text-gray-600 mt-1">{desc || cfg.defaultDesc}</p>
      </div>
    </div>
  );
}

function Stepper({ currentStep }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        return (
          <div key={step.number} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                currentStep >= step.number
                  ? 'bg-green-600 text-white scale-110'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {currentStep > step.number ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </div>
            <span className="ml-2 text-sm text-gray-600 hidden sm:inline">{step.label}</span>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-16 h-1 mx-4 rounded-full transition-all duration-300 ${
                  currentStep > step.number ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Checkout() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // 'Still waiting for the prompt' is a normal state, not an error — it must not
  // render as a red failure banner.
  const [statusNote, setStatusNote] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentId, setPaymentId] = useState(null);
  const [paymentResponse, setPaymentResponse] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [receipt, setReceipt] = useState(null);
   const [orderTotal, setOrderTotal] = useState(0);
   const [sellerMethod, setSellerMethod] = useState(null);
  const [polling, setPolling] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const pollTimerRef = useRef(null);
  const autoPollRef = useRef(0);
  // The polling timer fires outside React's render, so it reads the status
  // through a ref to avoid acting on a stale closure.
  const paymentStatusRef = useRef('initiated');
  paymentStatusRef.current = paymentStatus;
  const orderPollTimerRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    payment: 'mobile_money',
    phone_number: '',
    card_token: '',
    bank_reference: '',
  });
  const { cartItems, totalAmount, totalItems, fetchCart } = useCart();
  const { user } = useAuth();

  // SSE: listen for order status changes (seller confirms payment).
  const sse = useSSE('/api/orders_realtime.php', {
    enabled: !!orderId && step >= 6,
    onMessage: (data) => {
      if (!data || !orderId) return;
      if ((data.type === 'order_status_update' || data.type === 'payment_confirmed') &&
          data.order_id === orderId && data.status === 'paid') {
        setPaymentStatus('completed');
        setStep(7);
        fetchCart();
      }
    },
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || '',
        address: user.shipping_address || '',
        phone_number: user.phone || '',
      }));
    }
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (orderPollTimerRef.current) clearTimeout(orderPollTimerRef.current);
    };
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentChange = (e) => {
    setFormData((prev) => ({ ...prev, payment: e.target.value }));
  };

  const subtotal = totalAmount;
  const shipping = cartItems.length > 0 ? (subtotal > 100000 ? 0 : 5000) : 0;
  const platformFee = Math.round(subtotal * 0.03);
  const total = subtotal + shipping + platformFee;

  // Cash on delivery is the only method not collected through nTZS. Every other
  // method is a real provider transaction, so the buyer is never also told to
  // send money to the seller's own account — that would be a second payment.
  const collectedByNtzs = formData.payment !== 'cash';

  const startPayment = async (oid, amount) => {
    const idempotencyKey = `order-${oid}-${formData.payment}-${user?.id || 'guest'}`;
    const payload = {
      order_id: oid,
      amount,
      method: formData.payment,
      idempotency_key: idempotencyKey,
      notes: 'Checkout payment to seller',
    };

    if (['mobile_money', 'lipa_namba'].includes(formData.payment)) {
      if (!formData.phone_number) {
        throw new Error('A phone number is required for this payment method');
      }
      payload.phone = formData.phone_number;
    }

    if (formData.payment === 'card') {
      payload.redirect_url = `${window.location.origin}/checkout/success`;
      payload.cancel_url = `${window.location.origin}/checkout/cancel`;
      payload.card_token = formData.card_token;
    }

    if (formData.payment === 'bank_transfer') {
      payload.bank_reference = formData.bank_reference || undefined;
    }

    const res = await api.initPayment(payload);
    if (!res?.success) {
      /*
       * `retry: 'verify'` means the provider never confirmed the initiation, so
       * the collection may or may not have been taken. Retrying blindly risks a
       * double charge, so show the unverified state and let the buyer re-check.
       */
      if (res?.retry === 'verify' && res.payment_id) {
        setPaymentId(res.payment_id);
        setPaymentResponse(res);
        setPaymentStatus('unverified');
        setError(null);
        setStep(5);
        beginAutoPoll();
        return res;
      }
      throw new Error(res?.message || 'Payment initiation failed');
    }

    setPaymentId(res.payment_id);
    setPaymentResponse(res);

    if (res.next_action?.type === 'ntzs_card_redirect' && res.next_action?.payment_url) {
      window.location.href = res.next_action.payment_url;
    } else {
      setPaymentStatus('initiated');
      setError(null);
      setStatusNote('');
      setStep(5);
      beginAutoPoll();
    }
    return res;
  };

  const fetchReceipt = async (pid) => {
    const res = await api.getPaymentReceipt(pid);
    if (res?.success) setReceipt(res.receipt);
  };

  /**
   * Ask the provider where the payment stands.
   *
   * `pending` is the expected answer for a while: the prompt is sitting on the
   * buyer's phone waiting to be approved. Treating that as a failure alarms
   * people into paying twice, so only a genuine failure is reported as an
   * error, and only a terminal status ends the wait.
   */
  const handleCheckStatus = async ({ silent = false } = {}) => {
    if (!paymentId) return;
    if (!silent) setPolling(true);
    try {
      const res = await api.pollPaymentStatus(paymentId);
      if (res?.success && ['completed', 'failed', 'reversed'].includes(res.status)) {
        stopAutoPoll();
        setError(null);
        if (res.status === 'completed') {
          setPaymentStatus('completed');
          await fetchReceipt(paymentId);
          setStep(7);
        } else {
          setPaymentStatus(res.status === 'failed' ? 'failed' : 'reversed');
        }
      } else if (!silent) {
        if (res?.success) {
          setStatusNote(
            'Still waiting for the payment prompt to be approved. Do not pay again — approve the prompt on your phone, then check again.'
          );
        } else {
          setError(
            'We could not read this payment from the provider. Please do not pay again — contact support if you already approved a payment.'
          );
        }
      }
    } catch {
      if (!silent) setError('Could not reach the payment provider to check this payment.');
    } finally {
      if (!silent) setPolling(false);
    }
  };

  /**
   * Watch the payment while it is open, the way the provider documents: poll
   * the deposit until the status is terminal. Bounded, so it cannot hammer the
   * API or spin forever on a payment nobody approves.
   */
  const stopAutoPoll = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    autoPollRef.current = 0;
  };

  const beginAutoPoll = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    autoPollRef.current += 1;
    const attempt = autoPollRef.current;
    pollTimerRef.current = setTimeout(async () => {
      await handleCheckStatus({ silent: true });
      // Stop once the payment settled, or once the window is exhausted.
      if (['completed', 'failed', 'reversed'].includes(paymentStatusRef.current)) return;
      if (autoPollRef.current !== attempt) return;
      if (attempt >= AUTO_POLL_ATTEMPTS) return;
      beginAutoPoll();
    }, AUTO_POLL_INTERVAL_MS);
  };

  const handleMarkPaymentSubmitted = async () => {
    if (!orderId) return;
    // An nTZS collection already carries a provider reference; only a manual
    // transfer needs the buyer to supply one.
    if (!collectedByNtzs && !paymentReference.trim()) {
      setError('Please enter your payment reference before marking payment as submitted');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.markPaymentSubmitted({
        order_id: orderId,
        payment_id: paymentId,
        // An nTZS collection is referenced by the provider id, not by anything
        // the buyer types.
        payment_reference: collectedByNtzs
          ? paymentResponse?.provider_ref || `ntzs:${paymentId}`
          : paymentReference.trim(),
      });
      if (!res?.success) throw new Error(res?.message || 'Failed to mark payment as submitted');
      setPaymentStatus('pending_seller');
      setStep(7);
      startPollingForOrderStatus();
    } catch (err) {
      setError(err.message || 'Failed to submit payment');
    } finally {
      setLoading(false);
    }
  };

  const startPollingForOrderStatus = (maxAttempts = 40) => {
    let attempts = 0;
    const pollFn = async () => {
      try {
        const res = await api.getOrder(orderId);
        if (res?.success && res.order?.status === 'paid') {
          setPaymentStatus('completed');
          fetchCart();
          return;
        }
      } catch { /* ignore */ }
      attempts++;
      if (attempts < maxAttempts) {
        orderPollTimerRef.current = setTimeout(pollFn, 3000);
      }
    };
    orderPollTimerRef.current = setTimeout(pollFn, 3000);
  };

  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const orderData = {
        action: 'create',
        customer_id: user?.id,
        items: cartItems.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
        shipping_address: `${formData.name}, ${formData.address}, ${formData.city}`,
        shipping_region: formData.city,
        shipping_district: formData.city,
        payment_method: formData.payment,
        notes: `Payment method: ${formData.payment}`,
        fulfillment_mode: 'single',
      };

      const data = await api.createOrder(orderData);
      if (!data?.success) throw new Error(data?.message || 'Failed to create order');

      setOrderNumber(data.order_number);
      setOrderId(data.order_id || data.order_number);
      setOrderTotal(total);

      // Build seller method object from the order response snapshot.
      if (data.seller_payment_account_name) {
        setSellerMethod({
          payment_method: data.seller_payment_method,
          provider: data.seller_payment_provider,
          account_name: data.seller_payment_account_name,
          phone_number: data.seller_payment_phone,
          bank_name: data.seller_payment_bank_name,
          bank_account_number: data.seller_payment_bank_account,
          lipa_number: data.seller_payment_lipa_number,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to create order');
      return { success: false };
    } finally {
      setLoading(false);
    }

    return { success: true };
  };

  const handleProceedToPay = async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);

    try {
      await startPayment(orderId, orderTotal);
    } catch (err) {
      // NTZS payment initiation failed — do NOT fall back to manual payment.
      // Surface the error so the buyer can retry or choose a different provider.
      setError(err.message || 'Payment initiation failed. Please try again or select a different payment method.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) { setStep(step + 1); return; }
    if (cartItems.length === 0) return setError('Your cart is empty');

    // Step 2: Shipping form — just validate and advance to step 3 (Payment Method)
    if (step === 2) {
      if (!formData.name || !formData.address || !formData.city || !formData.phone) {
        return setError('Please fill in all shipping fields');
      }
      setError(null);
      setStep(step + 1);
      return;
    }

    // Step 3: Payment Method — validate selection, create order, advance to step 4
    if (step === 3) {
      if (['mobile_money', 'lipa_namba'].includes(formData.payment) && !formData.phone_number) {
        return setError('A phone number is required for this payment method');
      }
      if (formData.payment === 'card' && !formData.card_token) {
        return setError('A card token is required for card payments');
      }
      if (formData.payment === 'bank_transfer' && !formData.bank_reference) {
        return setError('Please provide a bank reference for bank transfer');
      }
      setError(null);
      const result = await handleCreateOrder();
      if (result?.success) setStep(step + 1);
      return;
    }

    // Fallback for any other step within the form (shouldn't normally reach here)
    setStep(step + 1);
  };
 
  // === Step 4: Seller Payment Details ===
  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <nav className="flex items-center gap-2 text-sm text-purple-100 mb-4">
              <NavLink to="/" className="hover:text-white transition-colors">Home</NavLink>
              <span>/</span>
              <NavLink to="/cart" className="hover:text-white transition-colors">Cart</NavLink>
              <span>/</span>
              <span className="text-white font-medium">Checkout</span>
            </nav>
            <h1 className="text-3xl font-bold">
              {collectedByNtzs ? 'Pay Now' : 'Seller Payment Details'}
            </h1>
            <p className="text-purple-100 mt-1">Order #{orderNumber}</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8">
          <Stepper currentStep={step} />

          {/* Payment initiation happens on this step, so its failure has to be
              shown here or the buyer only sees an unresponsive button. */}
          {error && <ErrorAlert message={error} />}

          <Card className="shadow-card p-6 mt-6">
            {collectedByNtzs ? (
              <>
                <h2 className="text-xl font-semibold mb-2 text-gray-900">
                  Pay TZS {(orderTotal || total).toLocaleString()}
                </h2>
                <p className="text-gray-600 mb-4">
                  When you continue, nTZS sends a payment prompt of
                  {' '}<span className="font-medium text-gray-900">{formData.phone_number || 'your mobile number'}</span>.
                  Approve it on your phone to complete the order. This prompt is the payment — do
                  not also send money to anyone else for this order.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-6 text-gray-900">Send Payment to Seller</h2>
                <SellerPaymentDestination sellerMethod={sellerMethod} />
              </>
            )}
            <div className="flex justify-between mt-6 pt-6 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
              <Button type="submit" variant="primary" loading={loading} onClick={handleProceedToPay}>
                Proceed to Pay
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // === Step 5: Make Payment ===
  if (step === 5) {
    const handleProceed = () => setStep(6);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white py-8 px-4">
          <div className="max-w-3xl mx-auto">
            <nav className="flex items-center gap-2 text-sm text-blue-100 mb-4">
              <NavLink to="/" className="hover:text-white transition-colors">Home</NavLink>
              <span>/</span>
              <span className="text-white font-medium">Checkout</span>
            </nav>
            <h1 className="text-3xl font-bold">Complete Your Payment</h1>
            <p className="text-blue-100 mt-1">
              Order #{orderNumber} · {formData.payment} · TZS {(orderTotal || total).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8">
          <Stepper currentStep={step} />

          {/* "Check Status" reports here too. */}
          {error && <ErrorAlert message={error} />}
          {statusNote && (
            <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {statusNote}
            </p>
          )}

          <PaymentStatusIndicator
            status={paymentStatus === 'unverified' ? 'unverified' : 'initiated'}
            desc={paymentStatus === 'unverified' ? paymentResponse?.message : undefined}
          />

          {paymentStatus === 'unverified' && (
            <Card className="shadow-card p-6 mt-6 border-amber-200 bg-amber-50">
              <h2 className="text-lg font-semibold text-amber-900">Check before you pay again</h2>
              <p className="text-sm text-amber-800 mt-2">
                The payment prompt may or may not have reached you. If you have not already
                approved a payment on your phone, press Check again — this asks the provider
                about the same payment rather than starting a second one. If you did approve a
                payment, wait a few minutes for it to settle instead of paying twice.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  icon={RefreshCw}
                  loading={loading}
                  onClick={handleProceedToPay}
                >
                  Check again
                </Button>
                <Button as={NavLink} to="/orders" variant="secondary">
                  View my orders
                </Button>
              </div>
            </Card>
          )}

          {paymentStatus !== 'unverified' && (
          <Card className="shadow-card p-6 mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Payment Instructions</h2>
              {sse.connected && (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Real-time updates connected
                </span>
              )}
            </div>

            <PaymentInstructionsCard paymentResponse={paymentResponse} formData={formData} />

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">
                  {polling ? 'Checking payment status...' : 'Waiting for payment confirmation...'}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  loading={polling}
                  onClick={handleCheckStatus}
                >
                  Check Status
                </Button>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={handleProceed}>
                I've Made the Payment
              </Button>
            </div>
          </Card>
          )}

          <Card className="shadow-card p-6 mt-6 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Lock className="w-4 h-4 text-green-600" />
              <span>
                You are paying the seller directly. The order will move to "Awaiting Seller Confirmation"
                once you submit your payment reference.
              </span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // === Step 6: Confirm Payment ===
  if (step === 6) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-8 px-4">
          <div className="max-w-3xl mx-auto">
            <nav className="flex items-center gap-2 text-sm text-green-100 mb-4">
              <NavLink to="/" className="hover:text-white transition-colors">Home</NavLink>
              <span>/</span>
              <NavLink to="/cart" className="hover:text-white transition-colors">Cart</NavLink>
              <span>/</span>
              <span className="text-white font-medium">Checkout</span>
            </nav>
            <h1 className="text-3xl font-bold">Confirm Your Payment</h1>
            <p className="text-green-100 mt-1">Order #{orderNumber}</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-8">
          <Stepper currentStep={step} />

          {error && <ErrorAlert message={error} />}

          <Card className="shadow-card p-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Confirm Your Payment</h2>
            </div>

            {/*
              An nTZS collection is the payment: the provider gives it a
              reference and confirms it through the webhook or a status check.
              Asking the buyer to type a reference belongs to the manual
              transfer flow, where there is nothing else to go on.
            */}
            {collectedByNtzs ? (
              <>
                <p className="text-gray-600 mb-4">
                  You approved the payment prompt for TZS {(orderTotal || total).toLocaleString()}. We are
                  waiting for nTZS to confirm it — there is nothing to type.
                </p>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {polling ? 'Checking payment status...' : 'Waiting for payment confirmation...'}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={RefreshCw}
                      loading={polling}
                      onClick={handleCheckStatus}
                    >
                      Check Status
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Enter the payment reference from your payment transaction. This helps the seller
                  verify your payment. The seller will review and confirm receipt.
                </p>

                <Input
                  label="Payment Reference"
                  name="payment_reference"
                  type="text"
                  required
                  placeholder="e.g. MP1234567890"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  helperText="The reference number you received after completing the payment"
                />
              </>
            )}

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  After submitting, your order will move to "Awaiting Seller Confirmation".
                  The seller typically reviews payments within 2-4 hours.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-between pt-6 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => setStep(5)}>
                Back
              </Button>
              <Button
                variant="primary"
                loading={loading}
                icon={CheckCircle}
                onClick={handleMarkPaymentSubmitted}
              >
                {collectedByNtzs ? 'CONFIRM' : 'I HAVE MADE THE PAYMENT'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // === Final states ===

  if (paymentStatus === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold">Checkout</h1>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Card className="shadow-card text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Payment Confirmed!
            </h2>
            <p className="text-gray-600 mb-6">
              The seller has confirmed receipt of your payment. Your order is now being processed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button as={NavLink} to="/my-orders" variant="primary" icon={PackageCheck} fullWidth>
                View My Orders
              </Button>
              {receipt && (
                <Button as={NavLink} to={`/receipt/${receipt.id}`} variant="secondary" fullWidth>
                  View Receipt
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold">Checkout</h1>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Card className="shadow-card text-center py-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Failed</h2>
            <p className="text-gray-600 mb-6">
              The payment could not be processed. Please try a different payment method or contact support.
            </p>
            <Button as={NavLink} to="/checkout" variant="primary" icon={RefreshCw}>
              Try Again
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'cod_pending' || step === 7) {
    const isCodPending = paymentStatus === 'cod_pending';
    return (
      <div className="min-h-screen bg-gray-50">
          <div className={`bg-gradient-to-r ${isCodPending ? 'from-amber-700 to-orange-800' : 'from-blue-700 to-indigo-800'} text-white py-8 px-4`}>
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold">
              {isCodPending ? 'Cash on Delivery' : 'Awaiting Seller Confirmation'}
            </h1>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Stepper currentStep={step} />
          {isCodPending ? (
            <Card className="shadow-card text-center py-12">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Truck className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Cash on Delivery</h2>
              <p className="text-gray-600 mb-2">
                Order #{orderNumber} was placed. Cash on delivery orders require finance approval
                before the order is confirmed and fulfillment begins.
              </p>
              <p className="text-gray-500 mb-6">You'll receive a confirmation once approved.</p>
              <Button as={NavLink} to="/my-orders" variant="primary" icon={PackageCheck}>
                View My Orders
              </Button>
            </Card>
          ) : (
            <Card className="shadow-card py-12">
              <PaymentStatusIndicator
                status="pending_seller"
                desc="The seller will confirm receipt of your payment. You'll receive a notification once confirmed."
              />
              <div className="mt-8 text-center">
                <Button as={NavLink} to="/my-orders" variant="secondary" icon={PackageCheck}>
                  Track Order
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // === Step 1-3: Main form ===
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold">Checkout</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <Card className="shadow-card text-center py-12">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add items to your cart before checking out.</p>
            <Button as={NavLink} to="/products" variant="primary" size="lg">
              Browse Products
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-green-100 mb-4">
            <NavLink to="/" className="hover:text-white transition-colors">Home</NavLink>
            <span>/</span>
            <NavLink to="/cart" className="hover:text-white transition-colors">Cart</NavLink>
            <span>/</span>
            <span className="text-white font-medium">Checkout</span>
          </nav>
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-green-100">Complete your order in a few simple steps</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <Stepper currentStep={step} />

          {error && <ErrorAlert message={error} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="shadow-card p-6 lg:p-8">
                {step === 1 && (
                  <OrderSummary
                    cartItems={cartItems}
                    totalAmount={totalAmount}
                    shipping={shipping}
                    platformFee={platformFee}
                    total={total}
                  />
                )}

                {step === 2 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Truck className="w-5 h-5 text-green-600" />
                      </div>
                      Shipping Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Full Name"
                        name="name"
                        type="text"
                        required
                        icon={User}
                        value={formData.name}
                        onChange={handleInputChange}
                      />
                      <Input
                        label="Phone"
                        name="phone"
                        type="tel"
                        required
                        icon={Phone}
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                      <div className="md:col-span-2">
                        <Input
                          label="Street Address"
                          name="address"
                          type="text"
                          required
                          icon={MapPin}
                          value={formData.address}
                          onChange={handleInputChange}
                        />
                      </div>
                      <Input
                        label="City"
                        name="city"
                        type="text"
                        required
                        icon={Building}
                        value={formData.city}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-900">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      Payment Method
                    </h2>
                    <div className="space-y-3">
                      {PAYMENT_METHODS.map((m) => (
                        <label
                          key={m.value + m.label}
                          className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            formData.payment === m.value
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment"
                            value={m.value}
                            checked={formData.payment === m.value}
                            onChange={handlePaymentChange}
                            className="w-4 h-4 text-green-600"
                          />
                          <span className="ml-3 font-medium text-gray-900">
                            {m.icon} {m.label}
                          </span>
                        </label>
                      ))}
                    </div>

                    {['mobile_money', 'lipa_namba'].includes(formData.payment) && (
                      <div className="mt-4">
                        <Input
                          label="Mobile number"
                          name="phone_number"
                          type="tel"
                          required
                          icon={Phone}
                          placeholder="07XXXXXXXX"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          helperText="Your M-Pesa / Airtel / Tigo / Lipa Namba registered number"
                        />
                      </div>
                    )}

                    {formData.payment === 'card' && (
                      <div className="mt-4">
                        <Input
                          label="Card token"
                          name="card_token"
                          type="text"
                          icon={CreditCard}
                          placeholder="tok_..."
                          value={formData.card_token}
                          onChange={handleInputChange}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Card payments are processed securely via NTZS. You will be redirected to
                          complete the payment on a secure page.
                        </p>
                      </div>
                    )}

                    {formData.payment === 'bank_transfer' && (
                      <div className="mt-4">
                        <Input
                          label="Bank reference (optional)"
                          name="bank_reference"
                          type="text"
                          icon={Building}
                          placeholder="REF-123"
                          value={formData.bank_reference}
                          onChange={handleInputChange}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          A bank transfer reference will be generated by NTZS.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between mt-6 pt-6 border-t border-gray-100">
                  {step > 1 && (
                    <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                      Back
                    </Button>
                  )}
                  <Button type="submit" variant="primary" loading={loading} className="ml-auto">
                    {step === 2
                      ? 'Continue'
                      : step === 3 ? 'Review & Proceed' : 'Continue'}
                  </Button>
                </div>
              </Card>
            </div>

            <div>
              <Card className="shadow-card sticky top-24 p-6">
                <h2 className="text-xl font-semibold mb-6 text-gray-900">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({totalItems} items)</span>
                    <span className="font-medium text-gray-900">TZS {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="font-medium text-gray-900">TZS {shipping.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Platform fee (3%)</span>
                    <span className="font-medium text-gray-900">
                      TZS {platformFee.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">TZS {(orderTotal || total).toLocaleString()}</span>
                  </div>
                </div>
                <OrderSummary
                  cartItems={cartItems}
                  totalAmount={totalAmount}
                  shipping={shipping}
                  platformFee={platformFee}
                  total={total}
                />
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <Lock className="w-4 h-4 text-green-600" />
                  <span>You are paying the seller directly. No escrow holds.</span>
                </div>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
