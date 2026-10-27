import { useState, useEffect } from 'react';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, Input, Card, ErrorAlert } from '../components/UI';

export default function SellerPaymentSettings() {
  const { user } = useAuth();
  const toast = useToast();
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    payment_method: 'mobile_money',
    provider: '',
    account_name: '',
    phone_number: '',
    bank_name: '',
    bank_account_number: '',
    lipa_number: '',
    is_default: false,
    is_enabled: true,
  });

  useEffect(() => {
    fetchMethods();
  }, []);

  async function fetchMethods() {
    setLoading(true);
    try {
      const res = await api.getSellerPaymentMethods();
      if (res?.success) {
        setMethods(res.methods || []);
      } else {
        setError(res?.message || 'Failed to load payment methods');
      }
    } catch (err) {
      setError(err.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }

  const methodIcons = {
    mobile_money: Smartphone,
    bank_transfer: Banknote,
    lipa_namba: Smartphone,
  };

  const methodLabels = {
    mobile_money: 'Mobile Money',
    bank_transfer: 'Bank Transfer',
    lipa_namba: 'Lipa Namba',
  };

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function resetForm() {
    setFormData({
      payment_method: 'mobile_money',
      provider: '',
      account_name: '',
      phone_number: '',
      bank_name: '',
      bank_account_number: '',
      lipa_number: '',
      is_default: false,
      is_enabled: true,
    });
  }

  function startEdit(method) {
    setEditingId(method.id);
    setFormData({
      payment_method: method.payment_method,
      provider: method.provider || '',
      account_name: method.account_name || '',
      phone_number: method.phone_number || '',
      bank_name: method.bank_name || '',
      bank_account_number: method.bank_account_number || '',
      lipa_number: method.lipa_number || '',
      is_default: method.is_default,
      is_enabled: method.is_enabled,
    });
    setShowForm(true);
  }

  function startNew(methodType = 'mobile_money') {
    resetForm();
    setEditingId(null);
    setFormData((prev) => ({ ...prev, payment_method: methodType }));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let res;
      if (editingId) {
        res = await api.updateSellerPaymentMethod(editingId, {
          provider: formData.provider,
          account_name: formData.account_name,
          phone_number: formData.phone_number,
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number,
          lipa_number: formData.lipa_number,
          is_enabled: formData.is_enabled,
          is_default: formData.is_default,
        });
      } else {
        res = await api.createSellerPaymentMethod({
          payment_method: formData.payment_method,
          provider: formData.provider,
          account_name: formData.account_name,
          phone_number: formData.phone_number,
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number,
          lipa_number: formData.lipa_number,
          is_default: formData.is_default,
          is_enabled: formData.is_enabled,
        });
      }
      if (!res?.success) throw new Error(res?.message || 'Failed to save payment method');
      toast.success(res.message || 'Payment method saved');
      await fetchMethods();
      closeForm();
    } catch (err) {
      setError(err.message || 'Failed to save payment method');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this payment method?')) return;
    try {
      const res = await api.deleteSellerPaymentMethod(id);
      if (!res?.success) throw new Error(res?.message || 'Failed to delete');
      toast.success('Payment method deleted');
      await fetchMethods();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  }

  function renderForm() {
    const isMobile = formData.payment_method === 'mobile_money';
    const isBank = formData.payment_method === 'bank_transfer';
    const isLipa = formData.payment_method === 'lipa_namba';

    return (
      <Card className="shadow-card p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId ? 'Edit Payment Method' : 'Add Payment Method'}
          </h2>
          <button
            type="button"
            onClick={closeForm}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {!editingId && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                Payment Type
              </label>
              <div className="flex gap-3">
                {['mobile_money', 'bank_transfer', 'lipa_namba'].map((type) => {
                  const Icon = methodIcons[type];
                  const selected = formData.payment_method === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, payment_method: type }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                        selected
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{methodLabels[type]}</span>
                      {selected && <Check className="w-4 h-4 text-green-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Provider"
                name="provider"
                placeholder="e.g. M-Pesa, Airtel Money, Bank Name"
                value={formData.provider}
                onChange={handleInputChange}
              />
            </div>

            <Input
              label="Account Holder Name"
              name="account_name"
              value={formData.account_name}
              onChange={handleInputChange}
              required
            />

            {(isMobile || isLipa) && (
              <Input
                label="Phone Number"
                name="phone_number"
                type="tel"
                placeholder="07XXXXXXXX"
                value={formData.phone_number}
                onChange={handleInputChange}
                required
              />
            )}

            {isBank && (
              <>
                <Input
                  label="Bank Name"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="Account Number"
                  name="bank_account_number"
                  type="tel"
                  value={formData.bank_account_number}
                  onChange={handleInputChange}
                  required
                />
              </>
            )}

            {isLipa && (
              <Input
                label="Lipa Number"
                name="lipa_number"
                placeholder="e.g. 70031820"
                value={formData.lipa_number}
                onChange={handleInputChange}
                required
              />
            )}
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_default"
                checked={formData.is_default}
                onChange={handleInputChange}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-sm text-gray-700">Set as default payment method</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_enabled"
                checked={formData.is_enabled}
                onChange={handleInputChange}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-sm text-gray-700">Enabled</span>
            </label>
          </div>

          {error && <ErrorAlert message={error} />}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeForm} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {editingId ? 'Update' : 'Save'} Payment Method
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-32 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure how buyers can pay you directly for marketplace orders.
            </p>
          </div>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => startNew()}
            disabled={showForm}
          >
            Add Method
          </Button>
        </div>

        {error && <ErrorAlert message={error} />}

        {showForm && renderForm()}

        {!methods || methods.length === 0 ? (
          <Card className="shadow-card text-center py-12">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment methods configured</h3>
            <p className="text-gray-600 mb-6">
              Buyers cannot complete purchases from you until you add at least one payment method.
            </p>
            <Button variant="primary" icon={Plus} onClick={() => startNew()}>
              Add Payment Method
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {methods.map((method) => {
              const Icon = methodIcons[method.payment_method] || CreditCard;
              return (
                <Card key={method.id} className="shadow-card p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {methodLabels[method.payment_method] || method.payment_method}
                          </h3>
                          {method.is_default && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                              Default
                            </span>
                          )}
                          {!method.is_enabled && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                              Disabled
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                          {method.account_name && <p>{method.account_name}</p>}
                          {method.phone_number && <p>{method.phone_number}</p>}
                          {method.bank_name && method.bank_account_number && (
                            <p>{method.bank_name} · {method.bank_account_number}</p>
                          )}
                          {method.lipa_number && <p>Lipa #: {method.lipa_number}</p>}
                          {method.provider && <p>Provider: {method.provider}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Edit}
                        onClick={() => startEdit(method)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDelete(method.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
