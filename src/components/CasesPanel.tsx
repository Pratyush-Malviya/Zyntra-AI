import React, { useState, useEffect } from 'react';
import { Plus, Search, MessageSquare, AlertCircle, CheckCircle2, Clock, User, Building, Tag, ChevronDown } from 'lucide-react';

interface Case {
  id: string;
  subject: string;
  description: string;
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'problem' | 'question' | 'feature_request' | 'other';
  assignedTo: string;
  contactName: string;
  contactEmail: string;
  accountName: string;
  createdAt: string;
  updatedAt: string;
}

export function CasesPanel({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [form, setForm] = useState<Partial<Case>>({});

  useEffect(() => {
    const saved = localStorage.getItem('zyntra_cases');
    if (saved) setCases(JSON.parse(saved));
  }, []);

  const save = (list: Case[]) => {
    setCases(list);
    localStorage.setItem('zyntra_cases', JSON.stringify(list));
  };

  const handleSubmit = () => {
    if (!form.subject) return;
    const now = new Date().toISOString();
    if (editing) {
      save(cases.map(c => c.id === editing ? { ...c, ...form, updatedAt: now } as Case : c));
      showToast('Case updated', 'success');
    } else {
      const newCase: Case = {
        id: Date.now().toString(),
        subject: form.subject || '',
        description: form.description || '',
        status: 'new',
        priority: form.priority || 'medium',
        type: form.type || 'other',
        assignedTo: form.assignedTo || '',
        contactName: form.contactName || '',
        contactEmail: form.contactEmail || '',
        accountName: form.accountName || '',
        createdAt: now,
        updatedAt: now,
      };
      save([...cases, newCase]);
      showToast('Case created', 'success');
    }
    setShowForm(false);
    setEditing(null);
    setForm({});
  };

  const updateStatus = (id: string, status: Case['status']) => {
    save(cases.map(c => c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c));
  };

  const deleteCase = (id: string) => {
    save(cases.filter(c => c.id !== id));
    showToast('Case deleted', 'success');
  };

  const statusIcon = (s: Case['status']) => {
    switch (s) {
      case 'new': return <AlertCircle className="w-4 h-4 text-blue-400" />;
      case 'open': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-orange-400" />;
      case 'resolved': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'closed': return <CheckCircle2 className="w-4 h-4 text-text-muted" />;
    }
  };

  const priorityColor = (p: Case['priority']) => {
    switch (p) {
      case 'low': return 'bg-gray-500/20 text-gray-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'urgent': return 'bg-red-500/20 text-red-400';
    }
  };

  const filtered = cases
    .filter(c => filterStatus === 'all' || c.status === filterStatus)
    .filter(c => c.subject.toLowerCase().includes(search.toLowerCase()) || c.contactName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Cases</h2>
          <p className="text-sm text-text-muted">{cases.length} total · {cases.filter(c => c.status !== 'resolved' && c.status !== 'closed').length} open</p>
        </div>
        <button onClick={() => { setForm({}); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Case
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cases..." className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary">
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {showForm && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-text-primary">{editing ? 'Edit Case' : 'New Case'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.subject || ''} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Subject *" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary md:col-span-2" />
            <input value={form.contactName || ''} onChange={e => setForm({...form, contactName: e.target.value})} placeholder="Contact name" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.contactEmail || ''} onChange={e => setForm({...form, contactEmail: e.target.value})} placeholder="Contact email" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.accountName || ''} onChange={e => setForm({...form, accountName: e.target.value})} placeholder="Account name" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <select value={form.priority || 'medium'} onChange={e => setForm({...form, priority: e.target.value as Case['priority']})} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={form.type || 'other'} onChange={e => setForm({...form, type: e.target.value as Case['type']})} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary">
              <option value="problem">Problem</option>
              <option value="question">Question</option>
              <option value="feature_request">Feature Request</option>
              <option value="other">Other</option>
            </select>
          </div>
          <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" rows={3} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!form.subject} className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50">{editing ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-bg-secondary rounded-xl border border-border p-4 hover:border-brand/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {statusIcon(c.status)}
                  <p className="font-medium text-text-primary">{c.subject}</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor(c.priority)}`}>{c.priority}</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {c.contactName || 'Unknown'}</span>
                  {c.accountName && <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {c.accountName}</span>}
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {c.type.replace('_', ' ')}</span>
                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <select value={c.status} onChange={e => updateStatus(c.id, e.target.value as Case['status'])} className="px-2 py-1 bg-bg-primary border border-border rounded text-xs text-text-primary ml-2">
                <option value="new">New</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-text-muted py-12">No cases found</p>}
      </div>
    </div>
  );
}
