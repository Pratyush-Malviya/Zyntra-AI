import React, { useState, useEffect, useRef, Suspense, Component } from 'react';
import { auth, db, googleProvider, signInWithPopup, signOut, signInAnonymously, onAuthStateChanged, doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, getDocs, Timestamp } from './firebase';
import { Settings, Users, Target, LayoutDashboard, Kanban, DollarSign, FileText, LogOut, Menu, X, Sun, Moon, Plus, Mail, Phone, Linkedin, Send, Download, Search, MessageSquare, ChevronRight, Loader2, Globe, Activity, Sparkles, ExternalLink } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { generateOutreach, OutreachMessages } from './services/geminiService';
import LandingPage from './components/LandingPage';
import { SmartCsvImportModal } from './components/SmartCsvImportModal';
import ProspectResearchPanel from './components/ProspectResearchPanel';

const CrmPipelineBoard = React.lazy(() => import('./components/CrmPipelineBoard').then(m => ({ default: m.CrmPipelineBoard })));

interface UserProfile {
  uid: string; email: string; name: string; photoURL?: string; role: string; createdAt: string;
}
interface Campaign { id: string; name: string; status: 'draft' | 'active' | 'completed'; leadsCount: number; createdAt: string; config?: any; }
interface Lead { id: string; campaignId: string; name: string; role: string; company: string; email: string; phone: string; status: 'imported' | 'generated' | 'sent'; score: number; tags?: string[]; industry?: string; country?: string; linkedin_url?: string; createdAt?: string; }
interface Contact { id: string; firstName: string; lastName: string; email: string; phone: string; jobTitle: string; company: string; linkedin: string; notes: string; createdAt: string; }
interface Quote { id: string; number: string; type: 'quote' | 'invoice' | 'contract'; title: string; accountName: string; amount: number; currency: string; status: string; dueDate: string; createdAt: string; }
interface Config { company: string; product: string; industry: string; targetRole: string; targetCountry: string; tone: string; }

// --- Error Boundary ---
class ErrorBoundary extends Component<{ children: React.ReactNode; fallback?: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? (this.props.fallback || <div className="p-8 text-center text-text-muted">Something went wrong</div>) : this.props.children; }
}

// --- Panel Wrapper ---
function PanelWrapper({ children }: { children: React.ReactNode }) {
  return <div className="bg-surface border border-border rounded-[24px] md:rounded-[32px] p-5 md:p-8 space-y-6 glow-brand/5 max-w-7xl mx-auto">{children}</div>;
}

// --- Main App ---
function MainApp({ user, profile, theme, setTheme }: { user: any; profile: UserProfile; theme: 'dark' | 'light'; setTheme: (t: 'dark' | 'light') => void }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('DASHBOARD');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [messages, setMessages] = useState<Record<string, OutreachMessages>>({});
  const [config, setConfig] = useState<Config>({ company: '', product: '', industry: '', targetRole: '', targetCountry: '', tone: 'Professional' });
  const [showToast, setShowToast] = useState<{ msg: string; type: string } | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', email: '', company: '', role: '', phone: '', score: 50 });
  const [importData, setImportData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { if (showToast) setTimeout(() => setShowToast(null), 3000); }, [showToast]);
  const toast = (msg: string, type = 'success') => setShowToast({ msg, type });

  const loadLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) { const data = await res.json(); setLeads(data); }
    } catch {}
  };

  // Load leads from API on mount
  useEffect(() => { loadLeads(); }, []);

  // Load campaigns from Firestore for authenticated users
  useEffect(() => {
    if (!user?.uid || user?.isAnonymous) return;
    const unsubCampaigns = onSnapshot(query(collection(db, 'campaigns'), where('userId', '==', user.uid)), snap => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
    });
    return () => { unsubCampaigns(); };
  }, [user]);

  const createCampaign = async () => {
    if (!campaignName) return;
    if (user?.uid && !user?.isAnonymous) {
      await addDoc(collection(db, 'campaigns'), { name: campaignName, status: 'draft', leadsCount: 0, userId: user.uid, createdAt: new Date().toISOString() });
    } else {
      const newCamp: Campaign = { id: 'camp-' + Date.now(), name: campaignName, status: 'draft', leadsCount: 0, createdAt: new Date().toISOString() };
      setCampaigns([...campaigns, newCamp]);
    }
    setCampaignName(''); toast('Campaign created');
  };

  const addLead = async () => {
    if (!newLead.name || !newLead.email) { toast('Name and email required', 'error'); return; }
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLead, score: Number(newLead.score), status: 'imported' }),
      });
      if (res.ok) {
        toast('Lead added!'); setShowAddLead(false);
        setNewLead({ name: '', email: '', company: '', role: '', phone: '', score: 50 });
        loadLeads();
      } else { toast('Failed to add lead', 'error'); }
    } catch { toast('Network error', 'error'); }
  };

  const deleteCampaign = async (id: string) => {
    if (user?.uid && !user?.isAnonymous) { await deleteDoc(doc(db, 'campaigns', id)); }
    else { setCampaigns(campaigns.filter(c => c.id !== id)); }
    toast('Campaign deleted');
  };

  const filteredLeads = leads.filter(l => !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.company.toLowerCase().includes(searchQuery.toLowerCase()));

  const sidebarItems = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'PIPELINE', icon: Kanban, label: 'Pipeline' },
    { id: 'CAMPAIGNS', icon: Target, label: 'Campaigns' },
    { id: 'LEADS', icon: Users, label: 'Leads' },
    { id: 'CONTACTS', icon: Mail, label: 'Contacts' },
    { id: 'RESEARCH', icon: Sparkles, label: 'Research' },
    { id: 'QUOTES', icon: DollarSign, label: 'Quotes' },
    { id: 'SETTINGS', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex">
      {/* Sidebar */}
      <aside className={`fixed md:relative z-40 h-full bg-bg-secondary border-r border-border transition-all flex flex-col ${isMobileMenuOpen ? 'left-0' : '-left-64 md:left-0'} md:w-56 w-64`}>
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <span className="font-bold text-sm">Zyntra CRM</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1"><X className="w-4 h-4" /></button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {sidebarItems.map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${activeView === item.id ? 'bg-brand text-white' : 'text-text-muted hover:bg-bg-primary'}`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border shrink-0">
          <button onClick={() => signOut(auth)} className="flex items-center gap-2 text-sm text-text-muted hover:text-red-400"><LogOut className="w-4 h-4" /> Sign Out</button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 bg-bg-primary/80 backdrop-blur-lg border-b border-border px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-1"><Menu className="w-5 h-5" /></button>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">{activeView}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg hover:bg-bg-secondary text-text-muted">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6">
          <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>}>

            {activeView === 'DASHBOARD' && (
              <PanelWrapper>
                <h3 className="text-lg font-bold">Dashboard</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-bg-secondary rounded-xl border border-border p-4"><p className="text-xs text-text-muted">Campaigns</p><p className="text-2xl font-bold">{campaigns.length}</p></div>
                  <div className="bg-bg-secondary rounded-xl border border-border p-4"><p className="text-xs text-text-muted">Total Leads</p><p className="text-2xl font-bold">{leads.length}</p></div>
                  <div className="bg-bg-secondary rounded-xl border border-border p-4"><p className="text-xs text-text-muted">Contacts</p><p className="text-2xl font-bold">{contacts.length}</p></div>
                  <div className="bg-bg-secondary rounded-xl border border-border p-4"><p className="text-xs text-text-muted">Avg Score</p><p className="text-2xl font-bold">{leads.length ? Math.round(leads.reduce((a, l) => a + l.score, 0) / leads.length) : 0}</p></div>
                </div>
                <div className="bg-bg-secondary rounded-xl border border-border p-4">
                  <p className="text-sm font-medium mb-2">Recent Activity</p>
                  {leads.slice(0, 5).map(l => (
                    <div key={l.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0 text-sm">
                      <Activity className="w-3.5 h-3.5 text-brand" />
                      <span className="text-text-primary">{l.name}</span>
                      <span className="text-text-muted text-xs">{l.company}</span>
                      <span className="text-xs ml-auto">{l.status}</span>
                    </div>
                  ))}
                </div>
              </PanelWrapper>
            )}

            {activeView === 'PIPELINE' && (
              <ErrorBoundary key="pipeline">
                <CrmPipelineBoard leads={leads as any} onLeadsUpdated={() => {}} showToast={toast} profile={profile} />
              </ErrorBoundary>
            )}

            {activeView === 'CAMPAIGNS' && (
              <PanelWrapper>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Campaigns</h3>
                  <div className="flex gap-2">
                    <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Campaign name" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm w-48" />
                    <button onClick={createCampaign} disabled={!campaignName} className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50 flex items-center gap-1"><Plus className="w-4 h-4" /> New</button>
                  </div>
                </div>
                <div className="grid gap-3">
                  {campaigns.map(c => (
                    <div key={c.id} className="bg-bg-secondary rounded-xl border border-border p-4 flex items-center justify-between hover:border-brand/30 transition-colors">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-text-muted">{c.status} · {c.leadsCount} leads · {new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${c.status === 'active' ? 'bg-green-500/20 text-green-400' : c.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>{c.status}</span>
                        <button onClick={() => setCurrentCampaign(c)} className="p-1.5 rounded-lg hover:bg-bg-primary text-text-muted"><ChevronRight className="w-4 h-4" /></button>
                        <button onClick={() => deleteCampaign(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </PanelWrapper>
            )}

            {activeView === 'LEADS' && (
              <PanelWrapper>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="text-lg font-bold">Leads ({filteredLeads.length})</h3>
                  <div className="flex items-center gap-2">
                    <div className="relative w-56">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search leads..." className="w-full pl-9 pr-4 py-2 bg-bg-primary border border-border rounded-lg text-sm" />
                    </div>
                    <button onClick={() => setShowAddLead(true)} className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-bold flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Lead</button>
                    <button onClick={() => setShowImport(true)} className="px-4 py-2 bg-bg-primary border border-border rounded-lg text-sm hover:border-brand">Import CSV</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-text-muted border-b border-border"><th className="text-left py-3 px-2">Name</th><th className="text-left py-3 px-2">Company</th><th className="text-left py-3 px-2">Email</th><th className="text-left py-3 px-2">Status</th><th className="text-left py-3 px-2">Score</th></tr></thead>
                    <tbody>
                      {filteredLeads.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-sm text-text-muted">No leads yet. Click "Add Lead" or import a CSV.</td></tr>
                      ) : filteredLeads.map(l => (
                        <tr key={l.id} className="border-b border-border hover:bg-bg-secondary/50"><td className="py-3 px-2 font-medium">{l.name}</td><td className="py-3 px-2 text-text-muted">{l.company}</td><td className="py-3 px-2 text-text-muted">{l.email}</td><td className="py-3 px-2"><span className={`px-2 py-0.5 rounded text-xs ${l.status === 'sent' ? 'bg-green-500/20 text-green-400' : l.status === 'generated' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>{l.status}</span></td><td className="py-3 px-2"><span className="text-brand font-bold">{l.score}</span></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PanelWrapper>
            )}

            {/* Add Lead Modal */}
            {showAddLead && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold"><Plus className="w-4 h-4 inline" /> New Lead</h3>
                    <button onClick={() => setShowAddLead(false)} className="p-1"><X className="w-4 h-4" /></button>
                  </div>
                  <input value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} placeholder="Full Name *" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm" />
                  <input value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} placeholder="Email *" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newLead.company} onChange={e => setNewLead({ ...newLead, company: e.target.value })} placeholder="Company" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm" />
                    <input value={newLead.role} onChange={e => setNewLead({ ...newLead, role: e.target.value })} placeholder="Job Title" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} placeholder="Phone" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm" />
                    <div><label className="text-xs text-text-muted block mb-1">Score: {newLead.score}</label>
                    <input type="range" min="0" max="100" value={newLead.score} onChange={e => setNewLead({ ...newLead, score: Number(e.target.value) })} className="w-full" /></div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setShowAddLead(false)} className="px-4 py-2 rounded-lg bg-bg-secondary text-sm">Cancel</button>
                    <button onClick={addLead} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-bold">Add Lead</button>
                  </div>
                </div>
              </div>
            )}

            {/* CSV Import Modal */}
            {showImport && (
              <SmartCsvImportModal
                onClose={() => setShowImport(false)}
                onImportComplete={(rows, summary) => { toast(`Imported ${rows.length} leads`); setShowImport(false); loadLeads(); }}
                existingLeads={leads}
                showToast={toast}
              />
            )}

            {activeView === 'CONTACTS' && (
              <PanelWrapper>
                <h3 className="text-lg font-bold">Contacts</h3>
                {contacts.length === 0 && <p className="text-sm text-text-muted">No contacts yet. They will appear here when you add them through the API or directly.</p>}
                <div className="grid gap-2">
                  {contacts.map(c => (
                    <div key={c.id} className="bg-bg-secondary rounded-xl border border-border p-3 flex items-center justify-between">
                      <div><p className="font-medium">{c.firstName} {c.lastName}</p><p className="text-xs text-text-muted">{c.jobTitle} at {c.company}</p></div>
                      <div className="flex items-center gap-2 text-xs text-text-muted">{c.email && <span><Mail className="w-3 h-3 inline" /> {c.email}</span>}</div>
                    </div>
                  ))}
                </div>
              </PanelWrapper>
            )}

            {activeView === 'RESEARCH' && (
              <ErrorBoundary key="research">
                <ProspectResearchPanel user={user} profile={profile} campaigns={campaigns} showToast={toast} />
              </ErrorBoundary>
            )}

            {activeView === 'QUOTES' && (
              <PanelWrapper>
                <h3 className="text-lg font-bold">Quotes & Billing</h3>
                {quotes.length === 0 && <p className="text-sm text-text-muted">No documents yet.</p>}
                <div className="grid gap-2">
                  {quotes.map(q => (
                    <div key={q.id} className="bg-bg-secondary rounded-xl border border-border p-3 flex items-center justify-between">
                      <div><p className="font-medium">{q.title}</p><p className="text-xs text-text-muted">{q.number} · {q.accountName} · {q.currency} {q.amount.toLocaleString()}</p></div>
                      <span className={`px-2 py-0.5 rounded text-xs ${q.status === 'paid' ? 'bg-green-500/20 text-green-400' : q.status === 'sent' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>{q.status}</span>
                    </div>
                  ))}
                </div>
              </PanelWrapper>
            )}

            {activeView === 'SETTINGS' && (
              <PanelWrapper>
                <h3 className="text-lg font-bold">Settings</h3>
                <div className="grid gap-6 max-w-2xl">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Campaign Defaults</p>
                    <input value={config.company} onChange={e => setConfig({ ...config, company: e.target.value })} placeholder="Your Company" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm" />
                    <input value={config.product} onChange={e => setConfig({ ...config, product: e.target.value })} placeholder="Product / Service" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm" />
                    <select value={config.tone} onChange={e => setConfig({ ...config, tone: e.target.value })} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm">
                      <option>Professional</option><option>Casual</option><option>Bold</option><option>Consultative</option>
                    </select>
                    <button onClick={() => toast('Settings saved')} className="px-4 py-2 bg-brand text-white rounded-lg text-sm">Save</button>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-border">
                    <p className="text-sm font-medium">Account</p>
                    <p className="text-xs text-text-muted">Signed in as {user?.email || 'Anonymous'}</p>
                    <button onClick={() => signOut(auth)} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm">Sign Out</button>
                  </div>
                </div>
              </PanelWrapper>
            )}

          </Suspense>
        </div>

        {showToast && (
          <div className="fixed bottom-4 right-4 z-50 bg-brand text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-bounce">
            {showToast.msg}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('zyntra-theme') as any) || 'dark');
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('zyntra-theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && !u.isAnonymous) {
        const pDoc = await getDoc(doc(db, 'users', u.uid));
        setProfile(pDoc.exists() ? (pDoc.data() as UserProfile) : { uid: u.uid, email: u.email || '', name: u.displayName || '', photoURL: u.photoURL || '', role: 'user', createdAt: new Date().toISOString() });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleDemoLogin = async () => {
    try { await signInAnonymously(auth); setShowLanding(false); } catch { alert('Demo login failed'); }
  };

  const handleGoogleLogin = async () => {
    try { await signInWithPopup(auth, googleProvider); setShowLanding(false); } catch { alert('Google login failed'); }
  };

  if (loading) {
    return <div className="min-h-screen bg-bg-primary flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;
  }

  if (!user) {
    if (showLanding) {
      return <LandingPage onLaunchApp={handleGoogleLogin} onGoogleLogin={handleGoogleLogin} onDemoLogin={handleDemoLogin} isAuthenticated={false} theme={theme} setTheme={setTheme} />;
    }
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="bg-bg-secondary rounded-2xl border border-border p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto"><Target className="w-8 h-8 text-brand" /></div>
          <h2 className="text-xl font-bold">Zyntra CRM</h2>
          <p className="text-sm text-text-muted">Sign in to manage your pipeline</p>
          <button onClick={handleGoogleLogin} className="w-full px-4 py-3 bg-brand text-white rounded-xl hover:bg-brand-hover flex items-center justify-center gap-2"><Mail className="w-4 h-4" /> Sign in with Google</button>
          <button onClick={handleDemoLogin} className="w-full px-4 py-3 bg-bg-primary border border-border rounded-xl text-sm hover:border-brand">Try Demo</button>
        </div>
      </div>
    );
  }

  return <MainApp user={user} profile={profile!} theme={theme} setTheme={setTheme} />;
}
