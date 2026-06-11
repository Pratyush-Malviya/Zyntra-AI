import React, { useState, useEffect } from 'react';
import { Plus, Search, Building, Phone, Mail, Globe, MapPin, Edit2, Trash2, Users, ChevronRight } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  employees: number;
  annualRevenue: number;
  description: string;
  status: 'active' | 'inactive' | 'lead';
  assignedTo: string;
  createdAt: string;
}

export function AccountsPanel({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Account>>({});

  useEffect(() => {
    const saved = localStorage.getItem('zyntra_accounts');
    if (saved) setAccounts(JSON.parse(saved));
  }, []);

  const save = (list: Account[]) => {
    setAccounts(list);
    localStorage.setItem('zyntra_accounts', JSON.stringify(list));
  };

  const handleSubmit = () => {
    if (!form.name) return;
    if (editing) {
      save(accounts.map(a => a.id === editing ? { ...a, ...form } as Account : a));
      showToast('Account updated', 'success');
    } else {
      const newAccount: Account = {
        id: Date.now().toString(),
        name: form.name || '',
        industry: form.industry || '',
        website: form.website || '',
        phone: form.phone || '',
        email: form.email || '',
        address: form.address || '',
        city: form.city || '',
        country: form.country || '',
        employees: form.employees || 0,
        annualRevenue: form.annualRevenue || 0,
        description: form.description || '',
        status: form.status || 'active',
        assignedTo: form.assignedTo || '',
        createdAt: new Date().toISOString(),
      };
      save([...accounts, newAccount]);
      showToast('Account created', 'success');
    }
    setShowForm(false);
    setEditing(null);
    setForm({});
  };

  const deleteAccount = (id: string) => {
    save(accounts.filter(a => a.id !== id));
    showToast('Account deleted', 'success');
  };

  const editAccount = (acc: Account) => {
    setForm(acc);
    setEditing(acc.id);
    setShowForm(true);
  };

  const filtered = accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Accounts</h2>
          <p className="text-sm text-text-muted">{accounts.length} total organizations</p>
        </div>
        <button onClick={() => { setForm({}); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts..." className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm" />
      </div>

      {showForm && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-text-primary">{editing ? 'Edit Account' : 'New Account'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="Account name *" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.industry || ''} onChange={e => setForm({...form, industry: e.target.value})} placeholder="Industry" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.website || ''} onChange={e => setForm({...form, website: e.target.value})} placeholder="Website" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.employees ? String(form.employees) : ''} onChange={e => setForm({...form, employees: Number(e.target.value) || 0})} placeholder="Employees" type="number" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} placeholder="City" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.country || ''} onChange={e => setForm({...form, country: e.target.value})} placeholder="Country" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
          </div>
          <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" rows={2} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!form.name} className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50">{editing ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(acc => (
          <div key={acc.id} className="bg-bg-secondary rounded-xl border border-border p-4 hover:border-brand/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0"><Building className="w-5 h-5 text-brand" /></div>
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">{acc.name}</p>
                  <p className="text-xs text-text-muted">{acc.industry} {acc.city && `· ${acc.city}`} {acc.country && `· ${acc.country}`}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-muted">
                    {acc.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {acc.email}</span>}
                    {acc.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {acc.phone}</span>}
                    {acc.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {acc.website}</span>}
                    {acc.employees > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {acc.employees} employees</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => editAccount(acc)} className="p-1.5 rounded-lg hover:bg-bg-primary text-text-muted"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteAccount(acc.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-text-muted py-12">No accounts found</p>}
      </div>
    </div>
  );
}
