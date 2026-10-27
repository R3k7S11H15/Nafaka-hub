import { useState, useEffect } from 'react';
import { Banknote, FileText, Shield, Percent, Clock, CheckCircle, Plus, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const PARTNERS = ['CRDB Bank', 'NMB Bank', 'Equity Bank', 'MFIs Tanzania'];

const ICON_MAP = { Banknote, FileText, Shield, Percent, Clock, CheckCircle, Plus };

const formatAmount = (value) => {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  return `Up to TZS ${(Number(value) / 1_000_000).toFixed(1)}M`;
};

const formatCurrency = (value) => {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  return `TZS ${Number(value).toLocaleString()}`;
};

export default function CreditFinancing() {
  const [formData, setFormData] = useState({
    fullName: '',
    farmSize: '',
    annualRevenue: '',
    loanAmount: '',
    purpose: '',
    documents: '',
  });
  const [loanProducts, setLoanProducts] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [productsRes, loansRes] = await Promise.all([
          api.getLoanProducts(),
          api.getMyLoans(),
        ]);
        if (!mounted) return;
        setLoanProducts(productsRes?.data || productsRes?.loan_products || productsRes || []);
        setActiveLoans(loansRes?.data || loansRes?.loans || loansRes || []);
      } catch (err) {
        if (!mounted) return;
        setLoanProducts([]);
        setActiveLoans([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.success('Loan application submitted successfully')
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Credit & Financing</h1>
          <p className="text-gray-600 mt-2">Access loans and financial services</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Our Partners</h2>
          <div className="flex flex-wrap gap-4">
            {PARTNERS.map((partner) => (
              <div key={partner} className="bg-gray-50 border border-gray-200 rounded-lg px-6 py-3 font-medium text-gray-700">
                {partner}
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Loan Products</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading loan products...
          </div>
        ) : loanProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">No loan products available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {loanProducts.map((product, idx) => {
              const Icon = ICON_MAP[product.icon] || Banknote;
              return (
                <div key={product.id || product.title || idx} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="w-8 h-8 text-green-600" />
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">{product.rate || product.interest_rate || '—'}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.title || product.name}</h3>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{formatAmount(product.amount ?? product.max_amount)}</p>
                  <p className="text-sm text-gray-500 mb-4">Tenure: {product.tenure || product.term || '—'}</p>
                  <p className="text-sm text-gray-600 mb-4">{product.eligibility || product.description || ''}</p>
                  <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">Apply Now</button>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Loan Application</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Farm Size</label>
              <input type="text" name="farmSize" value={formData.farmSize} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Annual Revenue</label>
              <input type="text" name="annualRevenue" value={formData.annualRevenue} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
              <input type="text" name="loanAmount" value={formData.loanAmount} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
              <textarea name="purpose" value={formData.purpose} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" rows="3" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Documents</label>
              <input type="file" name="documents" onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2" multiple />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition">Submit Application</button>
            </div>
          </form>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Active Loans</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading loans...
            </div>
          ) : activeLoans.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No active loans.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeLoans.map((loan) => (
                  <tr key={loan.id || loan.loan_id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{loan.id || loan.loan_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{loan.product || loan.product_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(loan.amount ?? loan.principal)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />{loan.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${loan.progress ?? 0}%` }}></div>
                      </div>
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
