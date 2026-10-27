import { useState, useEffect, useCallback } from 'react';
import { Receipt, Loader2, AlertTriangle, CheckCircle2, Search, Info } from 'lucide-react';
import ntzs from '../services/ntzs';

const tzs = (v) => (v == null ? '—' : `TZS ${Number(v).toLocaleString()}`);

/**
 * Pay a utility bill or a till from the customer side.
 *
 * The flow mirrors the nTZS rules: look up who is being paid (fail-soft — a
 * missing name is not a block), price the payment so the fee is visible before
 * anything moves, then execute against that quote and show the reference the
 * biller recognises.
 */
export default function BillPaymentPage() {
  const [billers, setBillers] = useState([]);
  const [spendEnabled, setSpendEnabled] = useState(true);
  const [code, setCode] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('bill');
  const [payNumber, setPayNumber] = useState('');

  const [lookup, setLookup] = useState(null);
  const [quote, setQuote] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  const selected = billers.find((b) => b.code === code);
  const needsPayNumber = kind === 'lipa';

  useEffect(() => {
    let active = true;
    ntzs
      .listBillers()
      .then(({ data }) => {
        if (!active) return;
        setBillers(data.billers || []);
        setSpendEnabled(data.enabled !== false);
      })
      .catch((err) => {
        if (active) setError({ message: err.message, retry: 'backoff' });
      });
    return () => {
      active = false;
    };
  }, []);

  const reset = useCallback(() => {
    setLookup(null);
    setQuote(null);
    setReceipt(null);
    setError(null);
  }, []);

  const runLookup = async () => {
    setWorking(true);
    setError(null);
    setQuote(null);
    try {
      if (needsPayNumber) {
        const { data } = await ntzs.lookupMerchantName({ kind: 'lipa', payNumber, amountTzs: Number(amount) || undefined });
        setLookup({ ...data, target: payNumber });
        return;
      }
      const { data } = await ntzs.lookupMerchantName({
        kind: 'bill',
        utilityCode: code,
        utilityRef: reference,
        amountTzs: Number(amount) || undefined,
      });
      setLookup({ ...data, target: reference });
    } catch (err) {
      setError({ message: err.message, retry: 'backoff' });
    } finally {
      setWorking(false);
    }
  };

  const price = async () => {
    setWorking(true);
    setError(null);
    setQuote(null);
    try {
      const { data } = await ntzs.quoteBill({
        kind,
        amountTzs: Number(amount),
        utilityCode: needsPayNumber ? undefined : code,
        utilityRef: needsPayNumber ? undefined : reference,
        payNumber: needsPayNumber ? payNumber : undefined,
      });
      if (data.success === false) {
        setError(data);
        return;
      }
      setQuote(data);
    } catch (err) {
      setError({ message: err.message, retry: 'backoff' });
    } finally {
      setWorking(false);
    }
  };

  const pay = async () => {
    if (!quote) return;
    setWorking(true);
    setError(null);
    try {
      const { data } = await ntzs.createBill({ quoteId: quote.quoteId });
      if (data.success === false) {
        setError(data);
        return;
      }
      setReceipt(data.bill);
      setQuote(null);
    } catch (err) {
      setError({ message: err.message, retry: 'verify' });
    } finally {
      setWorking(false);
    }
  };

  const canLookup = amount && (needsPayNumber ? payNumber : code && reference);
  const canPrice = amount && (needsPayNumber ? payNumber : code && reference);

  if (receipt) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-gray-900">Payment submitted</h1>
          <p className="text-sm text-gray-600 mt-2">
            Status: <strong>{receipt.status}</strong>
            {['pending', 'paid', 'burned'].includes(receipt.status) &&
              ' — the biller is processing it. This is success in flight, not a failure.'}
          </p>
          <dl className="mt-6 space-y-2 text-sm text-left">
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <dt className="text-gray-500">Biller</dt>
              <dd className="font-medium text-gray-900">{receipt.merchantName || receipt.utilityCode || receipt.payNumber}</dd>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <dt className="text-gray-500">Amount</dt>
              <dd className="font-medium text-gray-900">{tzs(receipt.totalTzs || receipt.amountTzs)}</dd>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-2">
              <dt className="text-gray-500">Your reference</dt>
              <dd className="font-mono font-medium text-gray-900">{receipt.reference || 'issued on settlement'}</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500 mt-4">
            Keep this reference — it is what the biller recognises if you query the payment.
          </p>
          <button
            onClick={() => {
              setReceipt(null);
              setReference('');
              setAmount('');
              setLookup(null);
            }}
            className="mt-6 bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Pay another bill
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">Pay a bill</h1>
        <p className="text-gray-600 mt-1 mb-6">
          Utilities, airtime, TV and till payments from your nTZS balance. A service fee applies to every
          payment and is always shown before you confirm.
        </p>

        {!spendEnabled && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800">
              Bill payment is not enabled on this environment right now. Nothing will be charged.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {error.retry === 'verify' ? 'Outcome unknown — check before paying again' : 'Could not continue'}
              </p>
              <p className="text-sm text-gray-600">{error.message}</p>
              {error.code && <p className="text-xs font-mono text-gray-500 mt-1">{error.code}</p>}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600">Payment type</span>
              <select
                value={kind}
                onChange={(e) => { setKind(e.target.value); reset(); }}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="bill">Utility bill</option>
                <option value="lipa">Till / merchant (Lipa)</option>
              </select>
            </label>

            {needsPayNumber ? (
              <label className="block">
                <span className="text-sm text-gray-600">Till / pay number</span>
                <input
                  value={payNumber}
                  onChange={(e) => { setPayNumber(e.target.value); reset(); }}
                  placeholder="e.g. 0712345678"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                />
              </label>
            ) : (
              <label className="block">
                <span className="text-sm text-gray-600">Biller</span>
                <select
                  value={code}
                  onChange={(e) => { setCode(e.target.value); reset(); }}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select a biller</option>
                  {billers.map((b) => (
                    <option key={`${b.category}-${b.code}`} value={b.code}>
                      {b.code} — {b.categoryLabel || b.category}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!needsPayNumber && (
              <label className="block">
                <span className="text-sm text-gray-600">
                  {selected?.referenceLabel || 'Account / meter number'}
                </span>
                <input
                  value={reference}
                  onChange={(e) => { setReference(e.target.value); reset(); }}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                />
                {selected?.referenceKind && (
                  <span className="text-xs text-gray-500">
                    {selected.referenceKind}, {selected.referenceMinLength}–{selected.referenceMaxLength} digits
                  </span>
                )}
              </label>
            )}

            <label className="block">
              <span className="text-sm text-gray-600">Amount (TZS)</span>
              <input
                value={amount}
                onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '')); setQuote(null); }}
                inputMode="numeric"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={runLookup}
              disabled={working || !canLookup}
              className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Search className="w-4 h-4" /> Check who receives this
            </button>
            <button
              onClick={price}
              disabled={working || !canPrice}
              className="inline-flex items-center gap-2 bg-gray-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
            >
              {working && <Loader2 className="w-4 h-4 animate-spin" />} See total
            </button>
          </div>

          {lookup && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
              <Info className="w-4 h-4 text-gray-400 mt-0.5" />
              <p className="text-sm text-gray-700">
                {lookup.name ? (
                  <>Paying <strong className="text-green-700">{lookup.name}</strong>.</>
                ) : (
                  // Fail-soft: no confirmation available is normal, not a block.
                  <>No name confirmation available{lookup.reason ? ` (${lookup.reason})` : ''}. You can still pay.</>
                )}
              </p>
            </div>
          )}

          {quote && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Total to pay</p>
                <p className="text-2xl font-bold text-gray-900">{tzs(quote.totalTzs)}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {tzs(quote.amountTzs)} + {tzs(quote.feeTzs)} service fee
                {quote.expiresAt ? ` · valid until ${new Date(quote.expiresAt).toLocaleTimeString()}` : ''}
              </p>
              <button
                onClick={pay}
                disabled={working}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                Confirm payment of {tzs(quote.totalTzs)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
