import React, { useState, useEffect } from 'react';
import { Plus, Search, GitBranch, Zap, Users, Mail, Globe, Clock, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: { event: string; conditions: { field: string; operator: string; value: string }[] };
  actions: { type: string; config: Record<string, string> }[];
  active: boolean;
  createdAt: string;
}

const TRIGGER_EVENTS = [
  'lead.created', 'lead.updated', 'deal.stage_changed', 'deal.created',
  'campaign.completed', 'case.created', 'case.updated',
  'contact.created', 'account.created',
];

const ACTION_TYPES = [
  { type: 'assign_user', label: 'Assign User', icon: 'Users', fields: [{ key: 'userId', label: 'User ID' }] },
  { type: 'send_email', label: 'Send Email', icon: 'Mail', fields: [{ key: 'template', label: 'Email Template' }, { key: 'to', label: 'Recipient' }] },
  { type: 'update_field', label: 'Update Field', icon: 'Zap', fields: [{ key: 'field', label: 'Field Name' }, { key: 'value', label: 'New Value' }] },
  { type: 'webhook', label: 'Fire Webhook', icon: 'Globe', fields: [{ key: 'url', label: 'Webhook URL' }] },
  { type: 'change_stage', label: 'Change Pipeline Stage', icon: 'GitBranch', fields: [{ key: 'stage', label: 'Target Stage' }] },
  { type: 'notify_slack', label: 'Slack Notification', icon: 'MessageSquare', fields: [{ key: 'channel', label: 'Channel' }, { key: 'message', label: 'Message' }] },
];

const OPERATORS = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'];

export function WorkflowPanel({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formEvent, setFormEvent] = useState('lead.created');
  const [conditions, setConditions] = useState<{ field: string; operator: string; value: string }[]>([]);
  const [actions, setActions] = useState<{ type: string; config: Record<string, string> }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('zyntra_workflows');
    if (saved) setRules(JSON.parse(saved));
  }, []);

  const save = (list: WorkflowRule[]) => {
    setRules(list);
    localStorage.setItem('zyntra_workflows', JSON.stringify(list));
  };

  const resetForm = () => {
    setFormName(''); setFormDesc(''); setFormEvent('lead.created');
    setConditions([]); setActions([]); setEditing(null); setShowForm(false);
  };

  const handleSubmit = () => {
    if (!formName) return;
    if (editing) {
      save(rules.map(r => r.id === editing ? { ...r, name: formName, description: formDesc, trigger: { event: formEvent, conditions }, actions } : r));
      showToast('Workflow updated', 'success');
    } else {
      save([...rules, { id: Date.now().toString(), name: formName, description: formDesc, trigger: { event: formEvent, conditions }, actions, active: true, createdAt: new Date().toISOString() }]);
      showToast('Workflow created', 'success');
    }
    resetForm();
  };

  const toggleRule = (id: string) => {
    save(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const deleteRule = (id: string) => {
    save(rules.filter(r => r.id !== id));
    showToast('Workflow deleted', 'success');
  };

  const editRule = (r: WorkflowRule) => {
    setFormName(r.name); setFormDesc(r.description); setFormEvent(r.trigger.event);
    setConditions(r.trigger.conditions); setActions(r.actions);
    setEditing(r.id); setShowForm(true);
  };

  const addCondition = () => setConditions([...conditions, { field: '', operator: 'equals', value: '' }]);
  const updateCondition = (i: number, k: string, v: string) => {
    const c = [...conditions]; c[i] = { ...c[i], [k]: v }; setConditions(c);
  };
  const removeCondition = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i));

  const addAction = () => setActions([...actions, { type: 'assign_user', config: {} }]);
  const updateAction = (i: number, k: string, v: string) => {
    const a = [...actions];
    if (k === 'type') a[i] = { type: v, config: {} };
    else a[i] = { ...a[i], config: { ...a[i].config, [k]: v } };
    setActions(a);
  };
  const removeAction = (i: number) => setActions(actions.filter((_, idx) => idx !== i));

  const filtered = rules.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Workflow Automation</h2>
          <p className="text-sm text-text-muted">{rules.length} rules ({rules.filter(r => r.active).length} active)</p>
        </div>
        <button onClick={() => resetForm()} className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflow rules..." className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm" />
      </div>

      {showForm && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
          <h3 className="font-semibold text-text-primary">{editing ? 'Edit Rule' : 'New Automation Rule'}</h3>
          <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Rule name *" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
          <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Description" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
          
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">When this happens:</p>
            <select value={formEvent} onChange={e => setFormEvent(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary">
              {TRIGGER_EVENTS.map(e => <option key={e} value={e}>{e.replace(/\./g, ' → ')}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-primary">Conditions (all must match):</p>
              <button onClick={addCondition} className="text-xs text-brand hover:underline">+ Add condition</button>
            </div>
            {conditions.map((c, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={c.field} onChange={e => updateCondition(i, 'field', e.target.value)} placeholder="Field" className="flex-1 px-2 py-1 bg-bg-primary border border-border rounded text-xs text-text-primary" />
                <select value={c.operator} onChange={e => updateCondition(i, 'operator', e.target.value)} className="px-2 py-1 bg-bg-primary border border-border rounded text-xs text-text-primary">
                  {OPERATORS.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                </select>
                <input value={c.value} onChange={e => updateCondition(i, 'value', e.target.value)} placeholder="Value" className="flex-1 px-2 py-1 bg-bg-primary border border-border rounded text-xs text-text-primary" />
                <button onClick={() => removeCondition(i)} className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-text-primary">Then do this:</p>
              <button onClick={addAction} className="text-xs text-brand hover:underline">+ Add action</button>
            </div>
            {actions.map((a, i) => {
              const actionDef = ACTION_TYPES.find(at => at.type === a.type) || ACTION_TYPES[0];
              return (
                <div key={i} className="flex flex-wrap gap-2 mb-2 items-start">
                  <select value={a.type} onChange={e => updateAction(i, 'type', e.target.value)} className="px-2 py-1 bg-bg-primary border border-border rounded text-xs text-text-primary">
                    {ACTION_TYPES.map(at => <option key={at.type} value={at.type}>{at.label}</option>)}
                  </select>
                  {actionDef.fields.map(f => (
                    <input key={f.key} value={a.config[f.key] || ''} onChange={e => updateAction(i, f.key, e.target.value)} placeholder={f.label} className="px-2 py-1 bg-bg-primary border border-border rounded text-xs text-text-primary" />
                  ))}
                  <button onClick={() => removeAction(i)} className="p-1 text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!formName} className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50">{editing ? 'Update' : 'Create'}</button>
            <button onClick={resetForm} className="px-4 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(rule => (
          <div key={rule.id} className="bg-bg-secondary rounded-xl border border-border p-4 hover:border-brand/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-brand" />
                  <p className="font-medium text-text-primary">{rule.name}</p>
                  <span className="text-xs text-text-muted bg-bg-primary px-2 py-0.5 rounded">{rule.trigger.event.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-text-muted mt-1">{rule.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {rule.actions.map((a, i) => {
                    const def = ACTION_TYPES.find(at => at.type === a.type);
                    return <span key={i} className="text-xs bg-bg-primary px-2 py-0.5 rounded text-text-muted">{def?.label || a.type}</span>;
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleRule(rule.id)} className="p-1">{rule.active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-text-muted" />}</button>
                <button onClick={() => editRule(rule)} className="p-1.5 rounded-lg hover:bg-bg-primary text-text-muted"><Zap className="w-4 h-4" /></button>
                <button onClick={() => deleteRule(rule.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-text-muted py-12">No workflow rules configured</p>}
      </div>
    </div>
  );
}
