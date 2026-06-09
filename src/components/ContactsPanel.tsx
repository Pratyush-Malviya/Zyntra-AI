import React, { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, Linkedin, Building, MapPin, Edit2, Trash2, User, Star } from 'lucide-react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  company: string;
  industry: string;
  linkedin: string;
  city: string;
  country: string;
  notes: string;
  status: 'active' | 'inactive' | 'lead';
  isFavorite: boolean;
  createdAt: string;
}

export function ContactsPanel({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Contact>>({});

  useEffect(() => {
    const saved = localStorage.getItem('zyntra_contacts');
    if (saved) setContacts(JSON.parse(saved));
  }, []);

  const save = (list: Contact[]) => {
    setContacts(list);
    localStorage.setItem('zyntra_contacts', JSON.stringify(list));
  };

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName) return;
    if (editing) {
      save(contacts.map(c => c.id === editing ? { ...c, ...form } as Contact : c));
      showToast('Contact updated', 'success');
    } else {
      const newContact: Contact = {
        id: Date.now().toString(),
        firstName: form.firstName || '',
        lastName: form.lastName || '',
        email: form.email || '',
        phone: form.phone || '',
        jobTitle: form.jobTitle || '',
        company: form.company || '',
        industry: form.industry || '',
        linkedin: form.linkedin || '',
        city: form.city || '',
        country: form.country || '',
        notes: form.notes || '',
        status: form.status || 'active',
        isFavorite: false,
        createdAt: new Date().toISOString(),
      };
      save([...contacts, newContact]);
      showToast('Contact created', 'success');
    }
    setShowForm(false);
    setEditing(null);
    setForm({});
  };

  const deleteContact = (id: string) => {
    save(contacts.filter(c => c.id !== id));
    showToast('Contact deleted', 'success');
  };

  const toggleFavorite = (id: string) => {
    save(contacts.map(c => c.id === id ? { ...c, isFavorite: !c.isFavorite } : c));
  };

  const editContact = (c: Contact) => {
    setForm(c);
    setEditing(c.id);
    setShowForm(true);
  };

  const filtered = contacts.filter(c =>
    `${c.firstName} ${c.lastName} ${c.company} ${c.email}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Contacts</h2>
          <p className="text-sm text-text-muted">{contacts.length} total contacts</p>
        </div>
        <button onClick={() => { setForm({}); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm" />
      </div>

      {showForm && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-text-primary">{editing ? 'Edit Contact' : 'New Contact'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.firstName || ''} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="First name *" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.lastName || ''} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Last name *" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.jobTitle || ''} onChange={e => setForm({...form, jobTitle: e.target.value})} placeholder="Job title" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.company || ''} onChange={e => setForm({...form, company: e.target.value})} placeholder="Company" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.linkedin || ''} onChange={e => setForm({...form, linkedin: e.target.value})} placeholder="LinkedIn URL" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} placeholder="City" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.country || ''} onChange={e => setForm({...form, country: e.target.value})} placeholder="Country" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <select value={form.status || 'active'} onChange={e => setForm({...form, status: e.target.value as Contact['status']})} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="lead">Lead</option>
            </select>
          </div>
          <textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" rows={2} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!form.firstName || !form.lastName} className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50">{editing ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(contact => (
          <div key={contact.id} className="bg-bg-secondary rounded-xl border border-border p-4 hover:border-brand/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-brand" /></div>
                <div className="min-w-0">
                  <p className="font-medium text-text-primary">{contact.firstName} {contact.lastName}</p>
                  <p className="text-xs text-text-muted">{contact.jobTitle} {contact.company && `at ${contact.company}`}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-muted">
                    {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</span>}
                    {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.phone}</span>}
                    {contact.linkedin && <span className="flex items-center gap-1"><Linkedin className="w-3 h-3" /> {contact.linkedin}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleFavorite(contact.id)} className={`p-1.5 rounded-lg ${contact.isFavorite ? 'text-yellow-400' : 'text-text-muted hover:text-yellow-400'}`}><Star className="w-4 h-4" /></button>
                <button onClick={() => editContact(contact)} className="p-1.5 rounded-lg hover:bg-bg-primary text-text-muted"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => deleteContact(contact.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-text-muted py-12">No contacts found</p>}
      </div>
    </div>
  );
}
