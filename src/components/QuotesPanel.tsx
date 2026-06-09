import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, DollarSign, Download, FileSignature, Send, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';

interface Quote {
  id: string;
  number: string;
  type: 'quote' | 'invoice' | 'contract';
  title: string;
  accountName: string;
  contactName: string;
  amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'paid' | 'expired';
  issueDate: string;
  dueDate: string;
  notes: string;
  createdAt: string;
}

export function QuotesPanel({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [items, setItems] = useState<Quote[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [form, setForm] = useState<Partial<Quote>>({});

  useEffect(() => {
    const saved = localStorage.getItem('zyntra_quotes');
    if (saved) setItems(JSON.parse(saved));
  }, []);

  const save = (list: Quote[]) => {
    setItems(list);
    localStorage.setItem('zyntra_quotes', JSON.stringify(list));
  };

  const nextNumber = () => {
    const nums = items.map(i => parseInt(i.number.replace(/[^0-9]/g, '')) || 0);
    return `QTE-${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`;
  };

  const handleSubmit = () => {
    if (!form.title || !form.amount) return;
    if (editing) {
      save(items.map(i => i.id === editing ? { ...i, ...form } as Quote : i));
      showToast('Document updated', 'success');
    } else {
      const newItem: Quote = {
        id: Date.now().toString(),
        number: nextNumber(),
        type: form.type || 'quote',
        title: form.title || '',
        accountName: form.accountName || '',
        contactName: form.contactName || '',
        amount: form.amount || 0,
        currency: form.currency || 'USD',
        status: 'draft',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: form.dueDate || '',
        notes: form.notes || '',
        createdAt: new Date().toISOString(),
      };
      save([...items, newItem]);
      showToast(`${form.type || 'Quote'} created`, 'success');
    }
    setShowForm(false);
    setEditing(null);
    setForm({});
  };

  const updateStatus = (id: string, status: Quote['status']) => {
    save(items.map(i => i.id === id ? { ...i, status } : i));
  };

  const deleteItem = (id: string) => {
    save(items.filter(i => i.id !== id));
    showToast('Document deleted', 'success');
  };

  const typeIcon = (t: Quote['type']) => {
    switch (t) {
      case 'quote': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'invoice': return <DollarSign className="w-4 h-4 text-green-400" />;
      case 'contract': return <FileSignature className="w-4 h-4 text-purple-400" />;
    }
  };

  const statusColor = (s: Quote['status']) => {
    switch (s) {
      case 'draft': return 'bg-gray-500/20 text-gray-400';
      case 'sent': return 'bg-blue-500/20 text-blue-400';
      case 'approved': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'paid': return 'bg-emerald-500/20 text-emerald-400';
      case 'expired': return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  const filtered = items
    .filter(i => filterType === 'all' || i.type === filterType)
    .filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.accountName.toLowerCase().includes(search.toLowerCase()));

  const totals = { quote: 0, invoice: 0, contract: 0 };
  items.forEach(i => { if (i.status !== 'rejected' && i.status !== 'expired') totals[i.type] += i.amount; });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Quotes & Billing</h2>
          <p className="text-sm text-text-muted">{items.length} documents</p>
        </div>
        <button onClick={() => { setForm({}); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Document
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-secondary rounded-xl border border-border p-3"><p className="text-xs text-text-muted">Quotes</p><p className="text-lg font-bold text-text-primary">${totals.quote.toLocaleString()}</p></div>
        <div className="bg-bg-secondary rounded-xl border border-border p-3"><p className="text-xs text-text-muted">Invoices</p><p className="text-lg font-bold text-text-primary">${totals.invoice.toLocaleString()}</p></div>
        <div className="bg-bg-secondary rounded-xl border border-border p-3"><p className="text-xs text-text-muted">Contracts</p><p className="text-lg font-bold text-text-primary">${totals.contract.toLocaleString()}</p></div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary">
          <option value="all">All Types</option>
          <option value="quote">Quotes</option>
          <option value="invoice">Invoices</option>
          <option value="contract">Contracts</option>
        </select>
      </div>

      {showForm && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-text-primary">{editing ? 'Edit Document' : 'New Document'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={form.type || 'quote'} onChange={e => setForm({...form, type: e.target.value as Quote['type']})} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary">
              <option value="quote">Quote</option>
              <option value="invoice">Invoice</option>
              <option value="contract">Contract</option>
            </select>
            <select value={form.currency || 'USD'} onChange={e => setForm({...form, currency: e.target.value})} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
              <option value="JPY">JPY</option>
              <option value="AUD">AUD</option>
              <option value="CAD">CAD</option>
              <option value="SGD">SGD</option>
            </select>
            <input value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} placeholder="Title *" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary md:col-span-2" />
            <input value={form.accountName || ''} onChange={e => setForm({...form, accountName: e.target.value})} placeholder="Account / Company" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.contactName || ''} onChange={e => setForm({...form, contactName: e.target.value})} placeholder="Contact person" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.amount ? String(form.amount) : ''} onChange={e => setForm({...form, amount: Number(e.target.value) || 0})} placeholder="Amount" type="number" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.dueDate || ''} onChange={e => setForm({...form, dueDate: e.target.value})} placeholder="Due date" type="date" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
          </div>
          <textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Terms & notes" rows={2} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!form.title || !form.amount} className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50">{editing ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(item => (
          <div key={item.id} className="bg-bg-secondary rounded-xl border border-border p-4 hover:border-brand/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {typeIcon(item.type)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text-primary">{item.title}</p>
                    <span className="text-xs text-text-muted">{item.number}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-text-muted">
                    <span>{item.accountName || 'No account'}</span>
                    <span className="font-medium text-text-primary">{item.currency} {item.amount.toLocaleString()}</span>
                    {item.dueDate && <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <select value={item.status} onChange={e => updateStatus(item.id, e.target.value as Quote['status'])} className="px-2 py-1 bg-bg-primary border border-border rounded text-xs text-text-primary">
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="paid">Paid</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-text-muted py-12">No documents found</p>}
      </div>
    </div>
  );
}
