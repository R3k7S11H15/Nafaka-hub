import { useState, useEffect, useCallback, useContext } from 'react';
import {
  ArrowDownToLine, ArrowUpFromLine, Receipt, Landmark, RefreshCw,
  Loader2, AlertTriangle, CheckCircle2, ShieldCheck, Play, RotateCcw, Plus, Info,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { ROLES } from '../config/roles';
import ntzs from '../services/ntzs';

const FINANCE_ROLES = [ROLES.SUPERADMIN, ROLES.FINANCE_ADMIN, ROLES.MARKETPLACE_ADMIN];

const tzs = (v) => (v == null ? '—' : `TZS ${Number(v).toLocaleString()}`);

const STATUS_STYLES = {
  completed: 'bg-green-100 text-green-800',
  paid: 'bg-green-100 text-green-800',
  burned: 'bg-blue-100 text-blue-800',
  submitted: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  review: 'bg-purple-100 text-purple-800',
  failed: 'bg-red-100 text-red-800',
  reverted: 'bg-gray-100 text-gray-800',
};

function StatusBadge({ status }) {
  const key = String(status || 'pending').toLowerCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[key] || 'bg-gray-100 text-gray-800'}`}>
      {key}
    </span>
  );
}

/**
 * Banner for the states the nTZS error catalogue calls out. `verify` is not a
 * failure: the outcome is unknown and the answer is to read the record back.
 */
function OutcomeNotice({ result, onDismiss }) {
  if (!result || result.success !== false) return null;
  const verify = result.retry === 'verify';
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border mb-4 ${verify ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
      <AlertTriangle className={`w-5 h-5 mt-0.5 ${verify ? 'text-amber-600' : 'text-red-600'}`} />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">
          {verify ? 'Outcome unknown — verify before retrying' : 'Request failed'}
          {result.code ? <span className="ml-2 font-mono text-xs text-gray-500">{result.code}</span> : null}
        </p>
        <p className="text-sm text-gray-600 mt-1">{result.message}</p>
        {verify && (
          <p className="text-xs text-amber-700 mt-2">
            The payment may already have been taken. Use “Read from rail” on the record — do not resend it.
          </p>
        )}
      </div>
      <button onClick={onDismiss} className="text-xs text-gray-500 hover:text-gray-700">Dismiss</button>
    </div>
  );
}

function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center py-10 text-gray-500">
      <Loader2 className="animate-spin w-5 h-5 mr-2" /> {label}...
    </div>
  );
}

const TABS = [
  { key: 'overview', label: 'Treasury', icon: Landmark },
  { key: 'collections', label: 'Collections', icon: ArrowDownToLine },
  { key: 'payouts', label: 'Payouts', icon: ArrowUpFromLine },
  { key: 'bills', label: 'Bills', icon: Receipt },
  { key: 'ledger', label: 'Ledger', icon: Landmark },
];

/**
 * nTZS console — treasury, collections, disbursements and bills.
 *
 * Rules this screen enforces rather than leaving to the operator:
 *  - a payout is priced first, and the fee and recipient are shown before it is
 *    executed against that quote;
 *  - an unconfirmed recipient name is shown as unconfirmed, never blocked on;
 *  - an unknown outcome (502 / verify) is resolved by reading the record back
 *    from the rail, not by resending it.
 */
export default function FinanceNtzsPage() {
  const { user } = useContext(AuthContext);
  const [tab, setTab] = useState('overview');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!FINANCE_ROLES.includes(user?.role)) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center max-w-md">
          <ShieldCheck className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900">Finance access required</h1>
          <p className="text-sm text-gray-600 mt-2">
            The nTZS console handles money movement and is limited to finance admins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">nTZS Payments</h1>
            <p className="text-gray-600 mt-1">
              Collections, disbursements, bills and the treasury ledger — partner treasury only, no per-customer accounts.
            </p>
          </div>
          <OpsControls onResult={setNotice} setBusy={setBusy} busy={busy} />
        </div>

        <OutcomeNotice result={notice} onDismiss={() => setNotice(null)} />

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'collections' && <CollectionsTab onResult={setNotice} />}
        {tab === 'payouts' && <PayoutsTab onResult={setNotice} />}
        {tab === 'bills' && <BillsTab onResult={setNotice} />}
        {tab === 'ledger' && <LedgerTab />}
      </div>
    </div>
  );
}

function OpsControls({ onResult, setBusy, busy }) {
  const run = async (label, fn) => {
    setBusy(true);
    try {
      onResult(await fn());
    } catch (err) {
      onResult({ success: false, message: err.message, retry: 'backoff' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        disabled={busy}
        onClick={() => run('reconcile', () => ntzs.reconcile())}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        title="Read every in-flight movement back from nTZS and settle it"
      >
        <RefreshCw className="w-4 h-4" /> Reconcile
      </button>
      <button
        disabled={busy}
        onClick={() => run('advance', () => ntzs.testMode('advance'))}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        title="Test keys only: settle every pending simulated transaction now"
      >
        <Play className="w-4 h-4" /> Advance sandbox
      </button>
      <button
        disabled={busy}
        onClick={() => run('reset', () => ntzs.testMode('reset'))}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        title="Test keys only: wipe every simulated transaction"
      >
        <RotateCcw className="w-4 h-4" /> Reset sandbox
      </button>
    </div>
  );
}

function OverviewTab() {
  const [accounts, setAccounts] = useState(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [fundingSourceId, setFundingSourceId] = useState('');
  const [opening, setOpening] = useState('');
  const [supply, setSupply] = useState(null);
  const [config, setConfig] = useState(null);

  const load = useCallback(async () => {
    const { data } = await ntzs.getTreasury();
    setAccounts(data.accounts || []);
  }, []);

  useEffect(() => {
    load().catch(() => setAccounts([]));
    ntzs
      .getSupply()
      .then(({ data }) => setSupply(data.supply))
      .catch(() => setSupply(null));
    ntzs
      .getConfigStatus()
      .then(({ data }) => setConfig(data.config || null))
      .catch(() => setConfig(null));
  }, [load]);

  const createSubAccount = async () => {
    setCreating(true);
    try {
      await ntzs.createSubAccount({
        label,
        fundingSourceId: fundingSourceId || undefined,
        openingBalanceTzs: opening ? Number(opening) : undefined,
      });
      setLabel('');
      setFundingSourceId('');
      setOpening('');
      await load();
    } finally {
      setCreating(false);
    }
  };

  if (accounts === null) return <Spinner label="Loading treasury" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <div key={account.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{account.label}</p>
              <Landmark className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{tzs(account.balanceTzs)}</p>
            <dl className="mt-3 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <dt>Held in flight</dt>
                <dd>{tzs(account.reservedTzs)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Available</dt>
                <dd className="font-medium text-gray-700">{tzs(account.availableTzs)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Funding source</dt>
                <dd className="font-mono truncate max-w-[9rem]">{account.fundingSourceId || 'treasury'}</dd>
              </div>
            </dl>
            <div className="mt-3">
              <StatusBadge status={account.status} />
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No treasury account yet — it is created on the first collection or payout.
          </div>
        )}
      </div>

      {config && config.issues.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Configuration</h2>
          <ul className="space-y-2">
            {config.issues.map((issue) => (
              <li key={issue.code} className="flex items-start gap-2 text-sm">
                <AlertTriangle
                  className={`w-4 h-4 mt-0.5 ${issue.level === 'error' ? 'text-red-500' : 'text-amber-500'}`}
                />
                <span className="text-gray-700">
                  <span className="font-mono text-xs text-gray-500">{issue.code}</span> — {issue.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {supply && (
        <div className="bg-white rounded-lg shadow p-5 flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-400 mt-0.5" />
          <p className="text-sm text-gray-600">
            nTZS supply on {supply.chain || 'base'}: <strong>{tzs(supply.totalSupplyTzs)}</strong>. This is
            platform-wide circulation, not this account&rsquo;s balance.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">New sub-account</h2>
        <p className="text-sm text-gray-600 mb-4">
          A labelled slice of the treasury — a market, a branch, a buyer cohort — that a specific workflow
          funds from.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (e.g. Mwanza branch)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={fundingSourceId}
            onChange={(e) => setFundingSourceId(e.target.value)}
            placeholder="Funding source id (optional)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <input
            value={opening}
            onChange={(e) => setOpening(e.target.value.replace(/\D/g, ''))}
            placeholder="Opening balance (TZS)"
            inputMode="numeric"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={createSubAccount}
            disabled={creating || !label}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>
      </div>
    </div>
  );
}

function CollectionsTab({ onResult }) {
  const [collections, setCollections] = useState(null);

  const load = useCallback(async () => {
    const { data } = await ntzs.listCollections({ limit: 50 });
    setCollections(data.collections || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sync = async (id) => {
    const { data } = await ntzs.syncCollection(id);
    if (data.success === false) onResult(data);
    await load();
  };

  if (collections === null) return <Spinner label="Loading collections" />;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Collections</h2>
        <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>
      {collections.length === 0 ? (
        <p className="p-10 text-center text-gray-500">No collections yet.</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['#', 'Amount', 'Method', 'Payer', 'Status', 'Reference', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {collections.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm text-gray-500">{c.id}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{tzs(c.amountTzs)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.paymentMethod}</td>
                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{c.phoneNumber || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{c.providerId || '—'}</td>
                <td className="px-4 py-3 text-right">
                  {c.providerId && ['pending', 'submitted', 'uncertain'].includes(c.status) && (
                    <button onClick={() => sync(c.id)} className="text-sm text-blue-600 hover:underline">
                      Read from rail
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PayoutsTab({ onResult }) {
  const [payouts, setPayouts] = useState(null);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [quote, setQuote] = useState(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const { data } = await ntzs.listPayouts({ limit: 50 });
    setPayouts(data.payouts || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const price = async () => {
    setWorking(true);
    setQuote(null);
    onResult(null);
    try {
      const { data } = await ntzs.quotePayout({
        amountTzs: Number(amount),
        phoneNumber: phone || undefined,
        bankCode: bankCode || undefined,
        accountNumber: accountNumber || undefined,
      });
      if (data.success === false) {
        onResult(data);
        return;
      }
      setQuote(data);
    } catch (err) {
      onResult({ success: false, message: err.message, retry: 'backoff' });
    } finally {
      setWorking(false);
    }
  };

  const execute = async () => {
    if (!quote) return;
    setWorking(true);
    try {
      const { data } = await ntzs.createPayout({
        quoteId: quote.quoteId,
        amountTzs: Number(amount),
        phoneNumber: quote.destination?.phoneNumber || undefined,
        bankCode: quote.destination?.bankCode || undefined,
        accountNumber: quote.destination?.accountNumber || undefined,
      });
      onResult(data);
      if (data.success !== false) setQuote(null);
      await load();
    } finally {
      setWorking(false);
    }
  };

  const sync = async (id) => {
    const { data } = await ntzs.syncPayout(id);
    if (data.success === false) onResult(data);
    await load();
  };

  if (payouts === null) return <Spinner label="Loading payouts" />;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900">New payout</h2>
        <p className="text-sm text-gray-600 mt-1 mb-4">
          The amount is net to the recipient, minimum 5,000 TZS. The fee comes from nTZS — it is never
          computed here.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={amount}
            onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '')); setQuote(null); }}
            placeholder="Amount (TZS)"
            inputMode="numeric"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setQuote(null); }}
            placeholder="Mobile number"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <input
            value={bankCode}
            onChange={(e) => { setBankCode(e.target.value); setQuote(null); }}
            placeholder="Bank code (e.g. CRDB)"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={accountNumber}
            onChange={(e) => { setAccountNumber(e.target.value); setQuote(null); }}
            placeholder="Account number"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={price}
            disabled={working || !amount || (!phone && !(bankCode && accountNumber))}
            className="inline-flex items-center gap-2 bg-gray-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
          >
            {working && <Loader2 className="w-4 h-4 animate-spin" />} Price payout
          </button>
          <button
            onClick={execute}
            disabled={working || !quote || quote.insufficientBalance}
            className="inline-flex items-center gap-2 bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <ArrowUpFromLine className="w-4 h-4" /> Pay {quote ? tzs(quote.totalTzs) : ''}
          </button>
        </div>

        {quote && (
          <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900">
                Sending to:{' '}
                {quote.recipientName ? (
                  <span className="text-green-700">{quote.recipientName}</span>
                ) : (
                  // Fail-soft: an unconfirmed name is normal, never a block.
                  <span className="text-amber-700">
                    {quote.destination?.phoneNumber || quote.destination?.accountNumberMasked}{' '}
                    <span className="text-xs">(not confirmed)</span>
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-600">
                Amount <strong>{tzs(quote.receiveAmountTzs)}</strong> + fee{' '}
                <strong>{tzs(quote.totalFeeTzs)}</strong> = <strong>{tzs(quote.totalTzs)}</strong>
              </p>
            </div>
            {quote.insufficientBalance && (
              <p className="text-sm text-red-700 mt-2">
                No quote was issued — the treasury balance is insufficient. Nothing has been paid.
              </p>
            )}
            {quote.expiresAt && (
              <p className="text-xs text-gray-500 mt-2">
                Quote expires {new Date(quote.expiresAt).toLocaleString()} — after that the price is
                re-quoted, not retried.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Payouts</h2>
          <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        {payouts.length === 0 ? (
          <p className="p-10 text-center text-gray-500">No payouts yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Recipient', 'Net', 'Fee', 'Status', 'Ref', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {p.recipientName || p.phoneNumber || p.accountNumberMasked || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{tzs(p.amountTzs)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{tzs(p.feeTzs)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{p.providerId || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {p.providerId && ['pending', 'burned'].includes(p.status) && (
                      <button onClick={() => sync(p.id)} className="text-sm text-blue-600 hover:underline">
                        Read from rail
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function BillsTab({ onResult }) {
  const [bills, setBills] = useState(null);
  const [billers, setBillers] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [code, setCode] = useState('');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [payNumber, setPayNumber] = useState('');
  const [kind, setKind] = useState('bill');
  const [quote, setQuote] = useState(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const { data } = await ntzs.listBills({ limit: 50 });
    setBills(data.bills || []);
  }, []);

  useEffect(() => {
    load();
    ntzs
      .listBillers()
      .then(({ data }) => {
        setBillers(data.billers || []);
        setEnabled(data.enabled !== false);
      })
      .catch(() => setBillers([]));
  }, [load]);

  const selected = billers.find((b) => b.code === code);

  const price = async () => {
    setWorking(true);
    setQuote(null);
    onResult(null);
    try {
      const { data } = await ntzs.quoteBill({
        kind,
        amountTzs: Number(amount),
        utilityCode: kind === 'bill' ? code : undefined,
        utilityRef: kind === 'bill' ? reference : undefined,
        payNumber: payNumber || undefined,
      });
      if (data.success === false) {
        onResult(data);
        return;
      }
      setQuote(data);
    } catch (err) {
      onResult({ success: false, message: err.message, retry: 'backoff' });
    } finally {
      setWorking(false);
    }
  };

  const execute = async (network) => {
    if (!quote) return;
    setWorking(true);
    try {
      const { data } = await ntzs.createBill({ quoteId: quote.quoteId, network });
      onResult(data);
      if (data.success !== false) setQuote(null);
      await load();
    } finally {
      setWorking(false);
    }
  };

  const sync = async (id) => {
    const { data } = await ntzs.syncBill(id);
    if (data.success === false) onResult(data);
    await load();
  };

  if (bills === null) return <Spinner label="Loading bills" />;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900">Pay a bill or till</h2>
        <p className="text-sm text-gray-600 mt-1 mb-4">
          A fee applies to every payment — the amount is always confirmed from the quote before paying.
        </p>
        {!enabled && (
          <p className="text-sm text-amber-700 mb-4">
            Spend is not enabled on this environment; bill payments will be refused upstream.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={kind}
            onChange={(e) => { setKind(e.target.value); setQuote(null); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="bill">Utility bill</option>
            <option value="lipa">Till / Lipa</option>
          </select>
          {kind === 'bill' ? (
            <select
              value={code}
              onChange={(e) => { setCode(e.target.value); setQuote(null); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select biller</option>
              {billers.map((b) => (
                <option key={`${b.category}-${b.code}`} value={b.code}>
                  {b.code} — {b.categoryLabel || b.category}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={payNumber}
              onChange={(e) => { setPayNumber(e.target.value); setQuote(null); }}
              placeholder="Till / pay number"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          )}
          {kind === 'bill' && (
            <input
              value={reference}
              onChange={(e) => { setReference(e.target.value); setQuote(null); }}
              placeholder={selected?.referenceLabel || 'Account / reference number'}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          )}
          <input
            value={amount}
            onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '')); setQuote(null); }}
            placeholder="Amount (TZS)"
            inputMode="numeric"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={price}
            disabled={working || !amount || (kind === 'bill' ? !code || !reference : !payNumber)}
            className="inline-flex items-center gap-2 bg-gray-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-900 disabled:opacity-50"
          >
            {working && <Loader2 className="w-4 h-4 animate-spin" />} Price payment
          </button>
          <button
            onClick={() => execute()}
            disabled={working || !quote}
            className="inline-flex items-center gap-2 bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> Pay {quote ? tzs(quote.totalTzs) : ''}
          </button>
          {quote && (
            <button
              onClick={() => execute(selected?.network || 'vodacom')}
              disabled={working}
              className="inline-flex items-center gap-2 bg-amber-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              title="Retry with the till's network when nTZS asked for it"
            >
              Retry with network
            </button>
          )}
        </div>

        {quote && (
          <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm font-medium text-gray-900">
              Paying:{' '}
              {quote.merchantName ? (
                <span className="text-green-700">{quote.merchantName}</span>
              ) : (
                <span className="text-amber-700">
                  {quote.utilityCode || quote.payNumber} <span className="text-xs">(not confirmed)</span>
                </span>
              )}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Amount <strong>{tzs(quote.amountTzs)}</strong> + fee <strong>{tzs(quote.feeTzs)}</strong> ={' '}
              <strong>{tzs(quote.totalTzs)}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Bill payments</h2>
          <button onClick={load} className="text-sm text-blue-600 hover:underline">Refresh</button>
        </div>
        {bills.length === 0 ? (
          <p className="p-10 text-center text-gray-500">No bill payments yet.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['#', 'Biller', 'Reference', 'Amount', 'Status', 'Biller ref', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bills.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 text-sm text-gray-500">{b.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {b.merchantName || b.utilityCode || b.payNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{b.utilityRef || b.payNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{tzs(b.totalTzs || b.amountTzs)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{b.reference || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {b.providerId && b.status === 'pending' && (
                      <button onClick={() => sync(b.id)} className="text-sm text-blue-600 hover:underline">
                        Read from rail
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LedgerTab() {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    ntzs
      .getTreasuryLedger({ limit: 100 })
      .then(({ data }) => setEntries(data.entries || []))
      .catch(() => setEntries([]));
  }, []);

  if (entries === null) return <Spinner label="Loading ledger" />;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Treasury ledger</h2>
        <p className="text-sm text-gray-600 mt-1">
          Every movement, keyed so a repeated webhook can never double-count. Only terminal successes
          move the balance.
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="p-10 text-center text-gray-500">No movements yet.</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['When', 'Account', 'Type', 'In', 'Out', 'Balance', 'Reference'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {e.createdAt ? new Date(e.createdAt).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{e.accountLabel}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{e.entryType}</td>
                <td className="px-4 py-3 text-sm text-green-700">
                  {e.direction === 'credit' ? tzs(e.amountTzs) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-red-700">
                  {e.direction === 'debit' ? tzs(e.amountTzs) : e.direction === 'release' ? tzs(e.amountTzs) : '—'}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{tzs(e.balanceAfterTzs)}</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-500">{e.referenceId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
