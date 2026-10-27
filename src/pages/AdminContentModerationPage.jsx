import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle2, XCircle, ArrowUpRight, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

const ENTITY_TYPES = ['product', 'review', 'message', 'profile', 'blog_comment'];
const STATUSES = ['pending', 'approved', 'rejected', 'escalated'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const RULE_TYPES = ['keyword', 'regex', 'image_hash', 'behavioral'];
const ACTIONS = ['flag', 'hide', 'reject', 'escalate'];

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    escalated: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[severity] || 'bg-gray-100 text-gray-800'}`}>
      {severity}
    </span>
  );
}

export default function AdminContentModerationPage() {
  const [queue, setQueue] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast()
  const confirm = useConfirm()
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [activeTab, setActiveTab] = useState('queue');
  const [actionNotes, setActionNotes] = useState({});
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState({ name: '', entity_type: 'product', rule_type: 'keyword', pattern: '', severity: 'medium', action: 'flag', is_active: true });

  const fetchQueue = async () => {
    try {
      const res = await api.getAdminModerationQueue({ status: statusFilter, entity_type: entityFilter, limit, offset });
      if (res?.success) {
        setQueue(res.queue || []);
        setTotal(res.total || 0);
      }
    } catch {
      setQueue([]);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await api.getModerationRules();
      if (res?.success) setRules(res.rules || []);
    } catch {
      setRules([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      if (activeTab === 'queue') {
        await fetchQueue();
      } else {
        await fetchRules();
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false };
  }, [activeTab, statusFilter, entityFilter, offset]);

  const handleModerate = async (queueId, actionType) => {
    const notes = actionNotes[queueId] || '';
    try {
      await api.moderateContent(queueId, actionType, notes);
      setActionNotes(prev => ({ ...prev, [queueId]: '' }));
      await fetchQueue();
    } catch {
      toast.error('Failed to perform action');
    }
  };

  const handleSaveRule = async () => {
    if (!ruleForm.name || !ruleForm.entity_type || !ruleForm.pattern) {
      toast.error('Name, entity_type, and pattern are required');
      return;
    }
    try {
      if (editingRule) {
        await api.updateModerationRule(editingRule.id, ruleForm);
      } else {
        await api.createModerationRule(ruleForm);
      }
      setShowRuleModal(false);
      setEditingRule(null);
      setRuleForm({ name: '', entity_type: 'product', rule_type: 'keyword', pattern: '', severity: 'medium', action: 'flag', is_active: true });
      await fetchRules();
    } catch {
      toast.error('Failed to save rule');
    }
  };

  const handleDeleteRule = async (id) => {
    const confirmed = await confirm({ title: 'Delete this rule?', type: 'danger' })
    if (!confirmed) return;
    try {
      await api.deleteModerationRule(id);
      await fetchRules();
    } catch {
      toast.error('Failed to delete rule');
    }
  };

  const startEditRule = (rule) => {
    setEditingRule(rule);
    setRuleForm({ name: rule.name, entity_type: rule.entity_type, rule_type: rule.rule_type, pattern: rule.pattern, severity: rule.severity, action: rule.action, is_active: rule.is_active });
    setShowRuleModal(true);
  };

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const approvedCount = queue.filter(q => q.status === 'approved').length;
  const rejectedCount = queue.filter(q => q.status === 'rejected').length;
  const escalatedCount = queue.filter(q => q.status === 'escalated').length;

  const stats = [
    { label: 'Pending Review', value: pendingCount, icon: AlertTriangle, color: 'text-yellow-600' },
    { label: 'Approved', value: approvedCount, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Rejected', value: rejectedCount, icon: XCircle, color: 'text-red-600' },
    { label: 'Escalated', value: escalatedCount, icon: ArrowUpRight, color: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" /> Content Moderation
          </h1>
          <p className="text-gray-600 mt-2">Review and manage flagged content across the platform</p>
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
                <Icon className={`w-10 h-10 ${stat.color}`} />
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'queue' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Moderation Queue
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'rules' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Moderation Rules
              </button>
            </div>
            {activeTab === 'queue' && (
              <div className="flex gap-2">
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Status</option>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setOffset(0); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">All Types</option>
                  {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {activeTab === 'rules' && (
              <button onClick={() => { setEditingRule(null); setRuleForm({ name: '', entity_type: 'product', rule_type: 'keyword', pattern: '', severity: 'medium', action: 'flag', is_active: true }); setShowRuleModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Rule
              </button>
            )}
          </div>

          {activeTab === 'queue' && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading queue...
                </div>
              ) : queue.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No items in moderation queue.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity Preview</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {queue.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">#{item.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">{item.entity_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.entity_preview || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.reported_by_name || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.ai_score != null ? item.ai_score : '—'}</td>
                        <td className="px-6 py-4"><StatusBadge status={item.status} /></td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1">
                              <button onClick={() => handleModerate(item.id, 'approve')} className="text-xs text-green-600 hover:text-green-800 font-medium">Approve</button>
                              <button onClick={() => handleModerate(item.id, 'reject')} className="text-xs text-red-600 hover:text-red-800 font-medium">Reject</button>
                              <button onClick={() => handleModerate(item.id, 'hide')} className="text-xs text-gray-600 hover:text-gray-800 font-medium">Hide</button>
                              <button onClick={() => handleModerate(item.id, 'escalate')} className="text-xs text-purple-600 hover:text-purple-800 font-medium">Escalate</button>
                            </div>
                            <input
                              type="text"
                              placeholder="Add note..."
                              value={actionNotes[item.id] || ''}
                              onChange={(e) => setActionNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                              className="text-xs px-2 py-1 border border-gray-300 rounded w-full"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {total > limit && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Previous</button>
                    <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Next</button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'rules' && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading rules...
                </div>
              ) : rules.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No moderation rules configured.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pattern</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{rule.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">{rule.entity_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">{rule.rule_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{rule.pattern}</td>
                        <td className="px-6 py-4"><SeverityBadge severity={rule.severity} /></td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">{rule.action}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{rule.is_active ? 'Yes' : 'No'}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <button onClick={() => startEditRule(rule)} className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button onClick={() => handleDeleteRule(rule.id)} className="text-xs text-red-600 hover:text-red-800 font-medium inline-flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>

      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{editingRule ? 'Edit Rule' : 'Add Rule'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                <select value={ruleForm.entity_type} onChange={(e) => setRuleForm({ ...ruleForm, entity_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
                <select value={ruleForm.rule_type} onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pattern</label>
                <input type="text" value={ruleForm.pattern} onChange={(e) => setRuleForm({ ...ruleForm, pattern: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select value={ruleForm.severity} onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select value={ruleForm.action} onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={ruleForm.is_active} onChange={(e) => setRuleForm({ ...ruleForm, is_active: e.target.checked })} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => { setShowRuleModal(false); setEditingRule(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveRule} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save Rule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
