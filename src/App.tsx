import React, { useState, useEffect, useRef, Component } from 'react';
import * as XLSX from 'xlsx';
import { 
  Settings, 
  Users, 
  Zap, 
  Eye, 
  Download, 
  MessageSquare, 
  Linkedin, 
  Mail, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Loader2, 
  Plus, 
  Menu,
  X, 
  FileJson, 
  FileSpreadsheet, 
  Code2, 
  ShieldCheck,
  Smartphone,
  Briefcase,
  Globe,
  Send,
  ExternalLink,
  Link2,
  Unlink,
  UserCheck,
  AlertCircle,
  LogOut,
  LayoutDashboard,
  Target,
  History,
  Trash2,
  Save,
  UserPlus,
  Sun,
  Moon,
  FileText,
  Award,
  Sparkles,
  Database,
  RefreshCw,
  Building,
  Check,
  DollarSign,
  TrendingUp,
  CreditCard,
  PlusCircle,
  Activity,
  Filter
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { generateOutreach, OutreachMessages } from './services/geminiService';
import ProspectResearchPanel from './components/ProspectResearchPanel';
import LeadScoreHistogram from './components/LeadScoreHistogram';
import LandingPage from './components/LandingPage';
import { SuperAdminDashboard as SuperAdminPanel } from './components/SuperAdminDashboard';
import { CrmSyncLogsPanel } from './components/CrmSyncLogsPanel';
import { SmartCsvImportModal } from './components/SmartCsvImportModal';
import { SettingsApiKeysPanel } from './components/SettingsApiKeysPanel';
import { CrmPipelineBoard } from './components/CrmPipelineBoard';
import { LeadJourneyAnalytics } from './components/LeadJourneyAnalytics';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  Timestamp,
  deleteField,
  OAuthProvider,
  linkWithPopup,
  User 
} from './firebase';

// --- Types ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (path === 'users/profile_init' || path?.startsWith('organizations/')) {
    alert(`Critical Error [${operationType}]: ${errInfo.error}\nPath: ${path}`);
  }
}

interface Lead {
  id?: string;
  name: string;
  role: string;
  company: string;
  industry: string;
  country: string;
  phone: string;
  email: string;
  linkedin_url: string;
  userId?: string;
  orgId?: string;
  campaignId?: string;
  score?: number;
  status?: 'pending' | 'sent' | 'failed' | 'imported';
  createdAt?: any;
  website?: string;
  employees?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed';
  leadsCount: number;
  createdAt: any;
  userId: string;
  orgId: string;
  config?: Config;
}

interface Config {
  company: string;
  product: string;
  vp: string;
  sender: string;
  cta: string;
}

interface SmtpConfig {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'super_admin' | 'org_admin' | 'user';
  orgId: string;
  lastLogin: any;
  smtpConfig?: SmtpConfig;
  linkedinAccount?: {
    connected: boolean;
    name: string;
    avatar: string;
    uid: string;
  };
}

// --- Constants ---
const SAMPLE_CSV = `name,role,company,industry,country,phone,email,linkedin_url
Aditi Sharma,HR Director,TechCorp India,IT Services,India,+919876543210,aditi@techcorp.in,linkedin.com/in/aditi-sharma
James Ochieng,CEO,Nairobi Staffing Co,Recruitment,Kenya,+254711223344,james@nairobistaff.co.ke,linkedin.com/in/james-ochieng
Sarah Mitchell,Head of Talent,GrowthCo UK,SaaS,UK,+447911123456,sarah@growthco.io,linkedin.com/in/sarah-mitchell
Perminus Wainaina,Managing Director,Corporate Staffing Services,HR Consulting,Kenya,+254722334455,perminus@css.co.ke,linkedin.com/in/perminus
Neha Kapoor,VP HR,Flipkart,E-Commerce,India,+919811223344,neha@flipkart.com,linkedin.com/in/neha-kapoor`;

const COUNTRY_FLAGS: Record<string, string> = {
  Kenya: '🇰🇪',
  India: '🇮🇳',
  UK: '🇬🇧',
  Australia: '🇦🇺',
  UAE: '🇦🇪',
  USA: '🇺🇸'
};

// --- Sub-components ---

const PanelWrapper = ({ children, index, activePanel }: { children: React.ReactNode, index: number, activePanel: number }) => {
  if (activePanel !== index) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {children}
    </motion.div>
  );
};

const ReviewCard: React.FC<{ 
  lead: Lead, 
  msg: OutreachMessages, 
  onUpdate: (field: string, val: string) => void,
  smtpConfig?: SmtpConfig
}> = ({ lead, msg, onUpdate, smtpConfig }) => {
  const [activeTab, setActiveTab] = useState<'wa' | 'li' | 'em'>('wa');
  const [sentStatus, setSentStatus] = useState<{[key: string]: 'idle' | 'sending' | 'success' | 'error'}>({
    wa: 'idle', li: 'idle', em: 'idle'
  });

  const handleSendWhatsApp = () => {
    const phone = (lead.phone || '').replace(/\D/g, '');
    const text = encodeURIComponent(msg.whatsapp || '');
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent(msg.email_subject);
    const body = encodeURIComponent(msg.email_body);
    window.location.href = `mailto:${lead.email}?subject=${subject}&body=${body}`;
  };

  const handleOpenLinkedIn = () => {
    const url = lead.linkedin_url.startsWith('http') ? lead.linkedin_url : `https://${lead.linkedin_url}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
      <div className="p-4 flex justify-between items-start border-b border-border">
        <div>
          <div className="font-bold text-[14px]">{lead.name}</div>
          <div className="text-[11px] text-text-muted mt-0.5">{lead.role}{lead.company ? ` @ ${lead.company}` : ''}</div>
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <span className="px-2 py-0.5 rounded-full bg-whatsapp/15 text-whatsapp text-[10px] font-bold uppercase">WA</span>
          <span className="px-2 py-0.5 rounded-full bg-linkedin/15 text-linkedin text-[10px] font-bold uppercase">LI</span>
          <span className="px-2 py-0.5 rounded-full bg-email/15 text-email text-[10px] font-bold uppercase">EM</span>
        </div>
      </div>
      
      <div className="flex border-b border-border">
        <button onClick={() => setActiveTab('wa')} className={`flex-1 py-2.5 text-center text-[12px] font-semibold transition-all border-b-2 ${activeTab === 'wa' ? 'text-whatsapp border-whatsapp' : 'text-text-muted border-transparent'}`}>📱 WA</button>
        <button onClick={() => setActiveTab('li')} className={`flex-1 py-2.5 text-center text-[12px] font-semibold transition-all border-b-2 ${activeTab === 'li' ? 'text-linkedin border-linkedin' : 'text-text-muted border-transparent'}`}>💼 LI</button>
        <button onClick={() => setActiveTab('em')} className={`flex-1 py-2.5 text-center text-[12px] font-semibold transition-all border-b-2 ${activeTab === 'em' ? 'text-email border-email' : 'text-text-muted border-transparent'}`}>✉️ EM</button>
      </div>

      <div className="p-4">
        {activeTab === 'wa' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold text-whatsapp uppercase tracking-wider">WhatsApp · Day 6</div>
              <button onClick={handleSendWhatsApp} className="p-2 rounded-lg bg-whatsapp/10 text-whatsapp hover:bg-whatsapp hover:text-white transition-all"><Send className="w-3.5 h-3.5" /></button>
            </div>
            <div 
              contentEditable 
              onBlur={e => onUpdate('whatsapp', e.currentTarget.innerText)}
              className="bg-surface-alt border-l-4 border-whatsapp rounded-lg p-3 text-sm leading-relaxed outline-none min-h-[60px]"
              dangerouslySetInnerHTML={{ __html: msg.whatsapp }}
            />
            <div className="text-[10px] text-text-muted leading-relaxed">Max 100 words · No links · Tap to edit</div>
          </div>
        )}

        {activeTab === 'li' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold text-linkedin uppercase tracking-wider">LinkedIn Connect · Day 1</div>
                <button onClick={handleOpenLinkedIn} className="p-2 rounded-lg bg-linkedin/10 text-linkedin hover:bg-linkedin hover:text-white transition-all"><ExternalLink className="w-3.5 h-3.5" /></button>
              </div>
              <div 
                contentEditable 
                onBlur={e => onUpdate('linkedin_connect', e.currentTarget.innerText)}
                className="bg-surface-alt border-l-4 border-linkedin rounded-lg p-3 text-sm leading-relaxed outline-none min-h-[60px]"
                dangerouslySetInnerHTML={{ __html: msg.linkedin_connect }}
              />
            </div>
            <div>
              <div className="text-[10px] font-bold text-linkedin uppercase tracking-wider mb-2">LinkedIn DM · Day 4</div>
              <div 
                contentEditable 
                onBlur={e => onUpdate('linkedin_dm', e.currentTarget.innerText)}
                className="bg-surface-alt border-l-4 border-linkedin rounded-lg p-3 text-sm leading-relaxed outline-none min-h-[60px]"
                dangerouslySetInnerHTML={{ __html: msg.linkedin_dm }}
              />
            </div>
          </div>
        )}

        {activeTab === 'em' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold text-email uppercase tracking-wider">Subject Line</div>
                <button onClick={handleSendEmail} className="p-2 rounded-lg bg-email/10 text-email hover:bg-email hover:text-white transition-all"><Mail className="w-3.5 h-3.5" /></button>
              </div>
              <div 
                contentEditable 
                onBlur={e => onUpdate('email_subject', e.currentTarget.innerText)}
                className="bg-surface-alt border-l-4 border-email rounded-lg p-3 text-sm font-bold outline-none"
                dangerouslySetInnerHTML={{ __html: msg.email_subject }}
              />
            </div>
            <div>
               <div className="text-[10px] font-bold text-email uppercase tracking-wider mb-2">Email Body · Day 2</div>
              <div 
                contentEditable 
                onBlur={e => onUpdate('email_body', e.currentTarget.innerText)}
                className="bg-surface-alt border-l-4 border-email rounded-lg p-3 text-sm leading-relaxed outline-none min-h-[80px]"
                dangerouslySetInnerHTML={{ __html: (msg.email_body || '').replace(/\n/g, '<br>') }}
              />
            </div>
            <div>
               <div className="text-[10px] font-bold text-email uppercase tracking-wider mb-2">Follow-up · Day 7</div>
              <div 
                contentEditable 
                onBlur={e => onUpdate('email_followup', e.currentTarget.innerText)}
                className="bg-surface-alt border-l-4 border-email rounded-lg p-3 text-sm leading-relaxed outline-none"
                dangerouslySetInnerHTML={{ __html: (msg.email_followup || '').replace(/\n/g, '<br>') }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Utilities ---
const calculateLeadScore = (lead: Lead): number => {
  let score = 0;
  const highValueRoles = ['ceo', 'founder', 'vp', 'director', 'head', 'manager', 'owner', 'cto', 'cmo', 'coo'];
  const role = (lead.role || '').toLowerCase();
  if (highValueRoles.some(r => role.includes(r))) score += 40;
  const techIndustries = ['software', 'tech', 'it', 'saas', 'digital', 'ai', 'cloud'];
  const industry = (lead.industry || '').toLowerCase();
  if (techIndustries.some(i => industry.includes(i))) score += 20;
  if (lead.linkedin_url && lead.linkedin_url.length > 10) score += 10;
  if (lead.phone && lead.phone.length > 5) score += 10;
  if (lead.email && lead.email.includes('@')) score += 10;
  return score;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            let updatedData = { ...data };
            let hasChanges = false;
            
            // Force Super Admin role and display name consistency for Pratyush
            if (u.email === 'malviya.pratyush26@gmail.com') {
              if (data.role !== 'super_admin') {
                updatedData.role = 'super_admin';
                hasChanges = true;
              }
              if (!data.displayName || data.displayName === '' || data.displayName === 'Untitled') {
                updatedData.displayName = 'Pratyush Malviya';
                hasChanges = true;
              }
            }

            if (!data.orgId) {
              const orgId = `org-${u.uid.slice(0, 5)}`;
              updatedData.orgId = orgId;
              hasChanges = true;
            }

            if (hasChanges) {
              await updateDoc(userRef, updatedData);
            }
            setProfile({ ...updatedData, uid: u.uid } as UserProfile);
          } else {
            const role: 'super_admin' | 'org_admin' | 'user' = u.email === 'malviya.pratyush26@gmail.com' ? 'super_admin' : 'user';
            const orgId = `org-${u.uid.slice(0, 5)}`;
            const displayName = u.displayName || (u.email === 'malviya.pratyush26@gmail.com' ? 'Pratyush Malviya' : 'SDR Guest');
            const newProfile: UserProfile = { 
              uid: u.uid, 
              email: u.email || '', 
              displayName, 
              photoURL: u.photoURL || `https://picsum.photos/seed/${u.uid}/150`, 
              role, 
              orgId, 
              lastLogin: Timestamp.now() 
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users/profile_init');
        } finally {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
        setShowLanding(true);
      }
    });
    return unsubscribe;
  }, []);

  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileSize = window.innerWidth < 1024;
      const isMobileAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobileDevice(isMobileSize || isMobileAgent);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('zyntra-theme') as 'dark' | 'light') || 'light';
  });

  const toggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('zyntra-theme', newTheme);
  };

  const effectiveTheme = isMobileDevice ? 'light' : theme;

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center"><Loader2 className="w-8 h-8 text-brand animate-spin" /></div>;
  
  if (!user || !profile) {
    if (showLanding) {
      return (
        <LandingPage 
          onLaunchApp={() => setShowLanding(false)} 
          isAuthenticated={false} 
          theme={effectiveTheme} 
          setTheme={toggleTheme} 
          isMobileDevice={isMobileDevice}
        />
      );
    }
    return <LoginView onBack={() => setShowLanding(true)} theme={effectiveTheme} setTheme={toggleTheme} isMobileDevice={isMobileDevice} />;
  }

  return <MainApp user={user} profile={profile} theme={effectiveTheme} setTheme={toggleTheme} isMobileDevice={isMobileDevice} />;
}

function LoginView({ onBack, theme, setTheme, isMobileDevice }: { onBack: () => void, theme: 'dark' | 'light', setTheme: (t: 'dark' | 'light') => void, isMobileDevice: boolean }) {
  const handleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (e) { console.error(e); } };
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#090a0f] text-slate-100' : 'bg-slate-50 text-slate-900'} flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300`}>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand rounded-full blur-[120px] opacity-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-alt rounded-full blur-[120px] opacity-20" />
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <button 
          onClick={onBack}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
            theme === 'dark' 
              ? 'bg-slate-900/60 border-white/[0.05] hover:bg-white/5 text-slate-300' 
              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      {!isMobileDevice && (
        <div className="absolute top-6 right-6">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`px-3 py-2 text-xs font-mono rounded-lg border cursor-pointer transition-colors ${
              theme === 'dark' 
                ? 'bg-slate-900 border-white/[0.05] text-amber-400 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`max-w-md w-full p-10 rounded-[40px] border text-center space-y-8 relative z-10 ${
        theme === 'dark' ? 'bg-[#12131a] border-white/[0.05]' : 'bg-white border-slate-200'
      }`}>
        <div className="space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-brand to-brand-alt rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-brand/20"><Zap className="w-10 h-10 text-white fill-current" /></div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Zyntra AI</h1>
          <p className="text-text-muted text-sm font-medium">Enterprise Outreach Engine</p>
        </div>
        <button onClick={handleLogin} className="w-full py-3.5 rounded-2xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-bold flex items-center justify-center gap-3 transition-all shadow-xl cursor-pointer text-sm dark:bg-white dark:text-[#0f172a] dark:hover:bg-slate-100"><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />Sign in with Google</button>
      </motion.div>
    </div>
  );
}



function MainApp({ user, profile, theme, setTheme, isMobileDevice }: { user: User, profile: UserProfile, theme: 'dark' | 'light', setTheme: (t: 'dark' | 'light') => void, isMobileDevice: boolean }) {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('zyntra-menu-collapsed') === 'true';
  });

  const toggleMenuCollapsed = () => {
    const newVal = !isMenuCollapsed;
    setIsMenuCollapsed(newVal);
    localStorage.setItem('zyntra-menu-collapsed', String(newVal));
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(-1); 
  const [activeView, setActiveView] = useState<'OUTREACH' | 'SETTINGS' | 'TEAM_ADMIN' | 'SUPER_ADMIN' | 'RESEARCH' | 'JOURNEY' | 'ANALYTICS'>('OUTREACH');
  const [researchKey, setResearchKey] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<Record<string, OutreachMessages>>({});
  const [config, setConfig] = useState<Config>({
    company: 'Zyntra AI',
    product: 'Multi-agent AI automation platform',
    vp: 'Zyntra AI helps businesses automate workflows, reduce manual effort, and make smarter decisions using AI agents — cutting ops time by 40%+ without hiring more staff.',
    sender: 'Pratyush',
    cta: '20-minute demo call'
  });
  const [chState, setChState] = useState({ wa: true, li: true, em: true });
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genLog, setGenLog] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState(20);
  const [tone, setTone] = useState('Professional B2B');
  const [rawLeads, setRawLeads] = useState('');
  const [sortByScore, setSortByScore] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<{ min: number; max: number; rangeLabel: string } | null>(null);
  const [highlightElite, setHighlightElite] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  
  const [liAccount, setLiAccount] = useState<{ connected: boolean, name: string, avatar: string, uid: string } | null>(null);
  const [isConnectingLi, setIsConnectingLi] = useState(false);
  const [emAccount, setEmAccount] = useState<{ connected: boolean, email: string, provider: string } | null>(null);
  const [isConnectingEm, setIsConnectingEm] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(profile.smtpConfig || { host: '', port: '587', secure: false, user: '', pass: '', from: '' });

  const [bulkLog, setBulkLog] = useState<string[]>([]);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkChannel, setBulkChannel] = useState<'wa' | 'li' | 'em' | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [isSyncingLi, setIsSyncingLi] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  // CRM Simulation States
  const [crmAccount, setCrmAccount] = useState<{ connected: boolean, platform: 'Salesforce' | 'HubSpot' | null, orgName: string } | null>(null);
  const [isConnectingCrm, setIsConnectingCrm] = useState(false);
  const [crmPlatformToConnect, setCrmPlatformToConnect] = useState<'Salesforce' | 'HubSpot'>('HubSpot');
  const [showCrmModal, setShowCrmModal] = useState(false);
  
  // Connection credentials parameters
  const [crmInstanceUrl, setCrmInstanceUrl] = useState('');
  const [crmAuthCode, setCrmAuthCode] = useState('');
  const [crmMappingStage, setCrmMappingStage] = useState('Prospecting / SDR Out');

  // Push progress simulation
  const [isCrmPushing, setIsCrmPushing] = useState(false);
  const [crmPushProgress, setCrmPushProgress] = useState(0);
  const [crmPushLog, setCrmPushLog] = useState<string[]>([]);
  const [showCrmPushLogs, setShowCrmPushLogs] = useState(false);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const bulkLogEndRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);

  useEffect(() => {
    if (profile.smtpConfig) {
      setSmtpConfig(profile.smtpConfig);
      setEmAccount({ connected: true, email: profile.smtpConfig.user, provider: 'Custom SMTP' });
    }
    if (profile.linkedinAccount) setLiAccount(profile.linkedinAccount);
  }, [profile.smtpConfig, profile.linkedinAccount]);

  // --- Firestore Sync ---
  useEffect(() => {
    if (!user || !profile.orgId) return;
    const q = query(
      collection(db, 'campaigns'), 
      where('orgId', '==', profile.orgId),
      where('userId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const camps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
      setCampaigns(camps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'campaigns');
    });
    return unsubscribe;
  }, [user, profile.orgId]);

  useEffect(() => {
    if (!currentCampaign || !user || !profile.orgId) return;
    const qLeads = query(
      collection(db, 'leads'), 
      where('orgId', '==', profile.orgId),
      where('campaignId', '==', currentCampaign.id),
      where('userId', '==', user.uid)
    );
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leads');
    });

    const qMsg = query(
      collection(db, 'messages'), 
      where('orgId', '==', profile.orgId),
      where('campaignId', '==', currentCampaign.id),
      where('userId', '==', user.uid)
    );
    const unsubscribeMsg = onSnapshot(qMsg, (snapshot) => {
      const msgs: Record<string, OutreachMessages> = {};
      snapshot.docs.forEach(doc => { msgs[doc.data().leadId] = doc.data() as OutreachMessages; });
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });
    
    if (currentCampaign.config) setConfig(currentCampaign.config);

    return () => { unsubscribeLeads(); unsubscribeMsg(); };
  }, [currentCampaign, user, profile.orgId]);



  useEffect(() => {
    if (currentCampaign?.id && user) {
      const timer = setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'campaigns', currentCampaign.id), { config });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `campaigns/${currentCampaign.id}`);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [config, currentCampaign?.id, user]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [genLog]);

  useEffect(() => {
    if (bulkLogEndRef.current) {
      bulkLogEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [bulkLog]);

  // --- Handlers ---
  const generateProjectPDF = () => {
    const doc = new jsPDF();
    const title = "Zyntra AI Outreach Engine - Project Report";
    
    doc.setFontSize(20);
    doc.text(title, 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
    
    doc.setFontSize(16);
    doc.text("1. Project Overview", 20, 45);
    doc.setFontSize(10);
    doc.text("Name: Zyntra AI Outreach Engine", 25, 55);
    doc.text("Description: A next-generation AI-powered omnichannel outreach platform.", 25, 62);
    
    doc.setFontSize(16);
    doc.text("2. Core Features", 20, 75);
    const features = [
      ["Campaign Management", "Create and manage multiple outreach strategies."],
      ["Lead Management", "Bulk import from CSV/Excel, manual entry, and scoring."],
      ["AI Personalization", "Gemini-powered message generation for WA, LI, and Email."],
      ["LinkedIn Bridge", "Secure OAuth integration for automated sending."],
      ["SMTP Integration", "Custom SMTP configuration for direct email."],
      ["Team Administration", "RBAC with Super Admin, Org Admin, and User roles."]
    ];
    
    autoTable(doc, {
      startY: 80,
      head: [['Feature', 'Description']],
      body: features,
      theme: 'grid',
      headStyles: { fillColor: [0, 212, 170] }
    });
    
    const nextY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text("3. Tech Stack", 20, nextY);
    const tech = [
      ["Frontend", "React 19, TypeScript, Vite"],
      ["Styling", "Tailwind CSS 4.0"],
      ["Animations", "Framer Motion"],
      ["Backend", "Firebase Firestore & Auth"],
      ["AI Engine", "Google Gemini API"]
    ];
    
    autoTable(doc, {
      startY: nextY + 5,
      head: [['Category', 'Technology']],
      body: tech,
      theme: 'striped'
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(16);
    doc.text("4. Digital Footprint & Social Channels", 20, finalY);
    
    const socialsTable = [
      ["LinkedIn Company Page", "https://linkedin.com/company/zyntra-ai"],
      ["Twitter / X Profile", "https://twitter.com/zyntra_ai"],
      ["Facebook Official Page", "https://facebook.com/zyntra.ai"],
      ["YouTube Official Channel", "https://youtube.com/@zyntra_ai"]
    ];

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Social Platform', 'Official Channel Access Address']],
      body: socialsTable,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });
    
    doc.save("Zyntra_AI_Project_Report.pdf");
    showToast("Project Report downloaded successfully!");
  };

  const downloadCampaignPDF = async (campaign: Campaign) => {
    try {
      const doc = new jsPDF();
      
      // Page Header Accent Border & Brand Header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235); // Brand Accent (#2563eb)
      doc.text(`ZYNTRA AI CAMPAIGN OUTREACH REPORT`, 20, 25);
      
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900 (#0f172a)
      doc.text(`Campaign: ${campaign.name}`, 20, 35);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 40, 190, 40);

      // Metadata Table
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text("Campaign Profile & Status Specs:", 20, 50);

      const createdStr = campaign.createdAt?.toDate ? campaign.createdAt.toDate().toLocaleDateString() : 'N/A';
      const metaData = [
        ["Campaign Identification Name", campaign.name],
        ["Current Operational Status", campaign.status.toUpperCase()],
        ["Total Enrolled Leads Count", `${campaign.leadsCount} Profiles`],
        ["Creation Timestamp", createdStr],
        ["Targeting Organization ID", campaign.orgId]
      ];

      autoTable(doc, {
        startY: 55,
        head: [['Specification Metric', 'Registered Execution Details']],
        body: metaData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 20, right: 20 }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;

      // Custom outreach details if config is defined
      if (campaign.config) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text("Sales Integration Blueprint (AI Config):", 20, currentY);

        const configData = [
          ["Sender Representative", campaign.config.sender],
          ["Representing Enterprise", campaign.config.company],
          ["Promoted Solution Product", campaign.config.product],
          ["Core Value Proposition Hook", campaign.config.vp],
          ["Primary Call To Action aligned", campaign.config.cta]
        ];

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Outreach Attribute', 'Configuration Payload Value']],
          body: configData,
          theme: 'striped',
          headStyles: { fillColor: [15, 118, 110] }, // teal-700
          margin: { left: 20, right: 20 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      }

      // Fetch campaign leads for dynamic output!
      const qLeads = query(
        collection(db, 'leads'),
        where('campaignId', '==', campaign.id)
      );
      const leadsSnap = await getDocs(qLeads);
      const campaignLeads = leadsSnap.docs.map(doc => doc.data() as Lead);

      if (campaignLeads.length > 0) {
        if (currentY > 210) {
          doc.addPage();
          currentY = 25;
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text("Recipient Leads Database (Enrolled List):", 20, currentY);

        const leadsBody = campaignLeads.map(l => [
          l.name || 'N/A',
          l.company || 'N/A',
          l.role || 'N/A',
          l.email || 'N/A',
          l.country || 'N/A',
          (l.status || 'pending').toUpperCase()
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['FullName', 'Enterprise Company', 'Corporate Role', 'Email Destination', 'Region', 'Status']],
          body: leadsBody,
          theme: 'grid',
          headStyles: { fillColor: [71, 85, 105] }, // slate-600
          margin: { left: 20, right: 20 }
        });
      } else {
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(10);
        doc.text("No leads are currently enrolled in this outreach strategy.", 20, currentY);
      }

      doc.save(`Zyntra_Campaign_${campaign.name.replace(/\s+/g, '_')}_Report.pdf`);
      showToast(`Campaign Report PDF for ${campaign.name} generated successfully!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to compile Campaign PDF: ${err.message || err}`, 'error');
    }
  };

  const handleLogout = () => signOut(auth);

  const handleCreateCampaign = async (name: string) => {
    if (!user || !profile?.orgId) {
      showToast('Error: Organization ID not found. Please re-login.', 'error');
      return;
    }
    const newCamp = {
      name,
      userId: user.uid,
      orgId: profile.orgId,
      status: 'draft',
      leadsCount: 0,
      createdAt: Timestamp.now()
    };
    const docRef = await addDoc(collection(db, 'campaigns'), newCamp);
    setCurrentCampaign({ id: docRef.id, ...newCamp } as Campaign);
    setActivePanel(0);
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'campaigns', id));
      if (currentCampaign?.id === id) {
        setCurrentCampaign(null);
        setActivePanel(-1);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `campaigns/${id}`);
    }
  };

  const handleToggleCh = (ch: 'wa' | 'li' | 'em') => {
    setChState(prev => ({ ...prev, [ch]: !prev[ch] }));
  };



  const handleConnectLinkedIn = async () => {
    setIsConnectingLi(true);
    try {
      const provider = new OAuthProvider('linkedin.com');
      // Use modern OIDC scopes for LinkedIn
      provider.addScope('openid');
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await linkWithPopup(auth.currentUser!, provider);
      const user = result.user;
      
      const liData = {
        connected: true,
        name: user.displayName || 'LinkedIn User',
        avatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
        uid: user.uid
      };

      await updateDoc(doc(db, 'users', profile.uid), {
        linkedinAccount: liData
      });
      
      setLiAccount(liData);
      showToast('LinkedIn account connected successfully!');
    } catch (error: any) {
      console.error("LinkedIn connection failed", error);
      if (error.code === 'auth/operation-not-allowed') {
        showToast('LinkedIn provider not enabled in console. Using simulated connection.', 'success');
        // Simulated connection for demo purposes
        const mockLiData = {
          connected: true,
          name: profile.displayName || 'LinkedIn User',
          avatar: profile.photoURL || `https://picsum.photos/seed/${profile.uid}/200`,
          uid: `li-${profile.uid.slice(0, 8)}`
        };
        await updateDoc(doc(db, 'users', profile.uid), {
          linkedinAccount: mockLiData
        });
        setLiAccount(mockLiData);
      } else if (error.code === 'auth/credential-already-in-use') {
        showToast('This LinkedIn account is already linked to another user.', 'error');
      } else {
        showToast(`Failed to connect LinkedIn: ${error.message}`, 'error');
      }
    } finally {
      setIsConnectingLi(false);
    }
  };

  const handleDisconnectLinkedIn = async () => {
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        linkedinAccount: deleteField()
      });
      setLiAccount(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${profile.uid}`);
    }
  };

  const handleConnectEmail = async () => {
    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      showToast('Please fill in all SMTP fields.', 'error');
      return;
    }
    setIsConnectingEm(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { smtpConfig });
      setEmAccount({
        connected: true,
        email: smtpConfig.user,
        provider: 'Custom SMTP'
      });
      showToast('SMTP Settings saved successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsConnectingEm(false);
    }
  };

  const handleDisconnectEmail = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { smtpConfig: deleteField() });
      setEmAccount(null);
      setSmtpConfig({
        host: '',
        port: '587',
        secure: false,
        user: '',
        pass: '',
        from: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleSyncLinkedIn = () => {
    if (Object.keys(messages).length === 0) return;
    setIsSyncingLi(true);
    setTimeout(() => {
      setIsSyncingLi(false);
      setLastSync(new Date().toLocaleTimeString());
    }, 3000);
  };

  const handleConnectCRM = (platform: 'Salesforce' | 'HubSpot') => {
    setIsConnectingCrm(true);
    setTimeout(() => {
      setIsConnectingCrm(false);
      const randomOrgId = Math.floor(1000 + Math.random() * 9000);
      setCrmAccount({
        connected: true,
        platform,
        orgName: platform === 'Salesforce' ? `Salesforce Dev Hub (${randomOrgId}-SF)` : `HubSpot Sandbox (${randomOrgId}-HS)`
      });
      showToast(`Successfully authorized and connected to custom ${platform} Org instance!`, 'success');
      setShowCrmModal(false);
    }, 2000);
  };

  const handleDisconnectCRM = () => {
    const originalPlatform = crmAccount?.platform;
    setCrmAccount(null);
    showToast(`Disconnected active session from ${originalPlatform || 'CRM'}.`, 'success');
  };

  const handlePushCRMData = () => {
    if (!crmAccount) {
      showToast('No active CRM connection.', 'error');
      return;
    }
    
    const targetLeads = leads.length > 0 ? leads : [
      { id: '1', name: 'Sarah Mitchell', company: 'GrowthCo UK', email: 'sarah@growthco.io', score: 85 },
      { id: '2', name: 'Aditi Sharma', company: 'TechCorp India', email: 'aditi@techcorp.in', score: 70 },
      { id: '3', name: 'James Ochieng', company: 'Nairobi Staffing Co', email: 'james@nairobistaff.co.ke', score: 90 }
    ];

    setIsCrmPushing(true);
    setCrmPushProgress(10);
    setShowCrmPushLogs(true);
    
    const logs: string[] = [];
    logs.push(`[SYSTEM] Initializing secure direct REST bridge to ${crmAccount.platform}...`);
    logs.push(`[OAUTH2] Resolving security bearer credentials on endpoint: ${crmInstanceUrl || 'https://api.crm.cloud'}...`);
    logs.push(`[OAUTH2] Token authorization status: Active (Expires in 3599s)`);
    logs.push(`[API] Fetching schema validation rules mapping for custom fields...`);
    setCrmPushLog([...logs]);

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= targetLeads.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsCrmPushing(false);
          setCrmPushProgress(100);
          showToast(`Successfully synced ${targetLeads.length} leads directly to your ${crmAccount.platform} pipeline!`, 'success');
        }, 500);
        return;
      }

      const activeLead = targetLeads[idx];
      logs.push(`[SCHEMA] Mapping customized campaign fields for ${activeLead.name}...`);
      logs.push(`[API] Processing upsert payload (Stage: ${crmMappingStage}) for ${activeLead.name} (${activeLead.company || 'Unknown Corp'})...`);
      
      const leadId = activeLead.id;
      const outreachInfo = leadId ? messages[leadId] : null;
      if (outreachInfo) {
        logs.push(`[SYNC] Linked Active Channels: ${outreachInfo.whatsapp ? '✓ WA  ' : ''}${outreachInfo.linkedin ? '✓ LI  ' : ''}${outreachInfo.email ? '✓ Email' : ''}`);
      } else {
        logs.push(`[SYNC] No pre-generated outreach. Mapping custom B2B profile template parameters instead.`);
      }

      logs.push(`[POST] Upsert record to endpoint: HTTP 201 Created. ID: crm_rec_${Math.random().toString(36).substr(2, 7)}`);
      logs.push(`[SYNC] Registered activity history logs and lead parameters directly into ${crmAccount.platform} records.`);
      
      idx++;
      const currentPct = Math.min(95, Math.round((idx / targetLeads.length) * 100));
      setCrmPushProgress(currentPct);
      setCrmPushLog([...logs]);
    }, 1000);
  };

  const startBulkSend = async (channel: 'wa' | 'li' | 'em') => {
    if (Object.keys(messages).length === 0) return;
    setIsBulkSending(true);
    setBulkChannel(channel);
    setBulkProgress(0);
    setBulkLog([`Initializing Bulk ${channel.toUpperCase()} Engine...`]);

    const activeLeads = leads.filter(l => l.id && messages[l.id]);
    for (let i = 0; i < activeLeads.length; i++) {
      const lead = activeLeads[i];
      const channelName = channel === 'wa' ? 'WhatsApp' : channel === 'li' ? 'LinkedIn' : 'Email';
      
      setBulkLog(prev => [...prev, `Sending ${channelName} to ${lead.name}...`]);
      
      // Simulate network delay and sending
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setBulkLog(prev => [...prev, `  ✓ Delivered to ${lead.name}`]);
      setBulkProgress(((i + 1) / activeLeads.length) * 100);
    }

    setBulkLog(prev => [...prev, `🎉 Bulk ${channel.toUpperCase()} Outreach Complete!`]);
    setTimeout(() => {
      setIsBulkSending(false);
      setBulkChannel(null);
    }, 3000);
  };

  const parseLeads = async (input: string) => {
    const lines = input.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2 || !currentCampaign || !user) return;

    const headers = lines[0].split(',').map(h => (h || '').trim().toLowerCase().replace(/\s+/g, '_'));
    const parsed = lines.slice(1).map(line => {
      const vals = splitCSV(line);
      const obj: any = {
        userId: user.uid,
        orgId: profile.orgId,
        campaignId: currentCampaign.id,
        status: 'imported'
      };
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
      return obj as Lead;
    }).filter(r => r.name);

    await saveLeads(parsed);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCampaign || !user) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const parsed = data.map((row: any) => {
        const obj: any = {
          userId: user.uid,
          orgId: profile.orgId,
          campaignId: currentCampaign.id,
          status: 'imported'
        };
        // Map common variations to standard fields
        const mapping: Record<string, string> = {
          'name': 'name', 'full name': 'name', 'prospect name': 'name',
          'role': 'role', 'title': 'role', 'job title': 'role',
          'company': 'company', 'organization': 'company',
          'industry': 'industry', 'sector': 'industry',
          'country': 'country', 'location': 'country',
          'phone': 'phone', 'mobile': 'phone', 'whatsapp': 'phone',
          'email': 'email', 'email address': 'email',
          'linkedin_url': 'linkedin_url', 'linkedin': 'linkedin_url', 'profile url': 'linkedin_url'
        };

        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().trim();
          if (mapping[normalizedKey]) {
            obj[mapping[normalizedKey]] = String(row[key] || '').trim();
          }
        });

        return obj as Lead;
      }).filter(l => l.name);

      await saveLeads(parsed);
    };
    reader.readAsBinaryString(file);
  };

  const saveLeads = async (parsed: Lead[]) => {
    if (!currentCampaign) return;
    // Save to Firestore
    for (const lead of parsed) {
      await addDoc(collection(db, 'leads'), {
        ...lead,
        createdAt: Timestamp.now()
      });
    }
    
    await updateDoc(doc(db, 'campaigns', currentCampaign.id), {
      leadsCount: leads.length + parsed.length
    });
  };

  const handleSmartImportComplete = async (importedRows: any[], summary: any) => {
    if (!currentCampaign || !user || !profile) return;
    
    const mappedLeads = importedRows.map(row => ({
      userId: user.uid,
      orgId: profile.orgId,
      campaignId: currentCampaign.id,
      name: row.name || "",
      role: row.role || "",
      company: row.company || "",
      industry: row.industry || "N/A",
      country: row.country || "N/A",
      phone: row.phone || "",
      email: row.email || "",
      linkedin_url: row.linkedin_url || "",
      status: "imported",
      score: Number(row.score) || Math.floor(65 + Math.random() * 25),
    } as Lead));

    await saveLeads(mappedLeads);
    setShowSmartImportModal(false);
  };

  const splitCSV = (line: string) => {
    const r = [];
    let cur = '', inQ = false;
    for (let c of line) {
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { r.push(cur); cur = ''; }
      else { cur += c; }
    }
    r.push(cur);
    return r;
  };

  const startGeneration = async () => {
    if (leads.length === 0 || !currentCampaign || !user) return;
    setIsGenerating(true);
    setGenProgress(0);
    setGenLog(['Starting generation...']);
    
    const toProcess = leads.slice(0, Math.min(batchSize, leads.length));

    for (let i = 0; i < toProcess.length; i++) {
      const lead = toProcess[i];
      if (!lead.id) continue;
      
      setGenLog(prev => [...prev, `→ ${lead.name} @ ${lead.company || '?'}`]);
      
      try {
        const result = await generateOutreach(lead, config);
        // Save to Firestore
        await setDoc(doc(db, 'messages', lead.id), {
          ...result,
          leadId: lead.id,
          campaignId: currentCampaign.id,
          userId: user.uid,
          orgId: profile.orgId,
          updatedAt: Timestamp.now()
        });
        setGenLog(prev => [...prev, `  ✓ 3 messages ready`]);
      } catch (e) {
        const fallback = getFallback(lead, config);
        await setDoc(doc(db, 'messages', lead.id), {
          ...fallback,
          leadId: lead.id,
          campaignId: currentCampaign.id,
          userId: user.uid,
          orgId: profile.orgId,
          updatedAt: Timestamp.now()
        });
        setGenLog(prev => [...prev, `  ⚠ Used fallback template`]);
      }
      
      setGenProgress(((i + 1) / toProcess.length) * 100);
    }

    setIsGenerating(false);
  };

  const getFallback = (lead: Lead, cfg: Config): OutreachMessages => {
    const fn = (lead.name || 'there').split(' ')[0];
    return {
      whatsapp: `Hi ${fn}, noticed ${lead.company || 'your company'} operates in ${lead.industry || 'your sector'}. At ${cfg.company} we help teams cut manual ops by 40%+ using AI agents. Open to a quick ${cfg.cta}?`,
      linkedin_connect: `Hi ${fn}, I work with ${lead.industry || 'businesses'} on AI automation — would love to connect and share what we're seeing.`,
      linkedin_dm: `Hi ${fn}, thanks for connecting! We've helped ${lead.industry || 'similar'} teams cut manual work by 40%+ with ${cfg.company}. Worth a quick chat?`,
      email_subject: `AI automation for ${lead.company || lead.industry || 'your team'}`,
      email_body: `Hi ${fn},\n\nI came across ${lead.company || 'your company'} and wanted to reach out. We help ${lead.industry || 'similar'} teams automate time-consuming workflows using AI agents.\n\n${cfg.company} typically reduces manual effort by 40%+ and frees up senior staff for higher-value work.\n\nWould you be open to a ${cfg.cta}?\n\nBest,\n${cfg.sender}`,
      email_followup: `Hi ${fn}, just following up on my note from earlier this week. If now isn't the right time, happy to reconnect — just let me know.\n\n${cfg.sender}`,
    };
  };

  const exportCSV = (ch: 'whatsapp' | 'linkedin' | 'email' | 'master' | 'li_script') => {
    if (Object.keys(messages).length === 0) return;
    
    if (ch === 'li_script') {
      const script = `/**
 * Zyntra AI LinkedIn Automation Bridge
 * This script automates sending the generated messages through your profile.
 * Instructions:
 * 1. Open LinkedIn in your browser.
 * 2. Open Developer Tools (F12).
 * 3. Paste this script into the Console.
 */

const outreachData = ${JSON.stringify(leads.filter(l => l.id && messages[l.id]).map(l => {
        const m = messages[l.id!];
        return {
          name: l.name,
          url: l.linkedin_url,
          connect: m.linkedin_connect,
          dm: m.linkedin_dm
        };
      }), null, 2)};

console.log("🚀 Zyntra AI Bridge Initialized. Found " + outreachData.length + " leads.");
// Automation logic would go here...
`;
      const blob = new Blob([script], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkedin_bridge_script.js`;
      a.click();
      return;
    }

    let headers: string[] = [];
    let rows: any[][] = [];

    const activeLeads = leads.filter(l => l.id && messages[l.id]);

    if (ch === 'whatsapp') {
      headers = ['name', 'company', 'country', 'phone', 'message'];
      rows = activeLeads.map(l => {
        const m = messages[l.id!];
        return [l.name, l.company, l.country, l.phone, m.whatsapp];
      });
    } else if (ch === 'linkedin') {
      headers = ['name', 'company', 'linkedin_url', 'connect_message', 'dm_message'];
      rows = activeLeads.map(l => {
        const m = messages[l.id!];
        return [l.name, l.company, l.linkedin_url, m.linkedin_connect, m.linkedin_dm];
      });
    } else if (ch === 'email') {
      headers = ['name', 'company', 'email', 'subject', 'body', 'followup'];
      rows = activeLeads.map(l => {
        const m = messages[l.id!];
        return [l.name, l.company, l.email, m.email_subject, m.email_body, m.email_followup];
      });
    } else {
      headers = ['name', 'role', 'company', 'industry', 'country', 'phone', 'email', 'linkedin_url', 'wa_message', 'li_connect', 'li_dm', 'email_subject', 'email_body', 'email_followup'];
      rows = activeLeads.map(l => {
        const m = messages[l.id!];
        return [l.name, l.role, l.company, l.industry, l.country, l.phone, l.email, l.linkedin_url, m.whatsapp, m.linkedin_connect, m.linkedin_dm, m.email_subject, m.email_body, m.email_followup];
      });
    }

    const csvContent = [headers, ...rows].map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ch}_outreach.csv`;
    a.click();
  };

  return (
    <div className={`min-h-screen bg-bg text-text font-sans selection:bg-brand/30 flex ${theme}`}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm border ${
              toast.type === 'success' 
                ? 'bg-surface border-brand-alt/30 text-brand-alt' 
                : toast.type === 'info'
                ? 'bg-[#090a0f] border-cyan-400/30 text-cyan-400 shadow-cyan-950/25'
                : 'bg-surface border-red-500/30 text-red-500'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-brand" />
            ) : toast.type === 'info' ? (
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <button 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden cursor-pointer w-full h-full border-0 text-left outline-none block"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu backdrop"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen z-[60] border-r border-border-subtle bg-[#111216]/95 md:bg-surface/50 backdrop-blur-xl flex flex-col transition-all duration-300 md:translate-x-0 ${
        isMobileMenuOpen 
          ? 'w-64 translate-x-0' 
          : `-translate-x-full md:translate-x-0 ${isMenuCollapsed ? 'w-20' : 'w-64'}`
      }`}>
        <div className={`p-4 flex ${isMenuCollapsed && !isMobileMenuOpen ? 'flex-col items-center gap-3' : 'items-center justify-between gap-3'} transition-all duration-300`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand to-brand-alt flex items-center justify-center shadow-lg shadow-brand/20 shrink-0">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            {(!isMenuCollapsed || isMobileMenuOpen) && (
              <div className="overflow-hidden transition-all duration-300 block">
                <span className="font-syne font-extrabold text-xl tracking-tight block truncate text-text">Zyntra AI</span>
                <div className="text-[8px] text-text-muted font-bold uppercase tracking-[0.2em]">Enterprise v1.0</div>
              </div>
            )}
          </div>
          {/* Close Menu Button on Mobile Drawer */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 hover:bg-bg-subtle text-text-muted hover:text-text rounded-lg md:hidden transition-colors"
            title="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Toggle Menu Button on Desktop */}
          <button 
            onClick={toggleMenuCollapsed}
            className="p-1.5 hover:bg-bg-subtle text-text-muted hover:text-text rounded-lg hidden md:block transition-colors cursor-pointer"
            title={isMenuCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isMenuCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-thin">
          <div>
            <NavButton 
              active={activeView === 'OUTREACH'} 
              onClick={() => { setActiveView('OUTREACH'); setActivePanel(-1); setIsMobileMenuOpen(false); }}
              icon={Target}
              label="Outreach"
              subLabel="Campaigns & Leads"
              isCollapsed={isMobileMenuOpen ? false : isMenuCollapsed}
            />
            <AnimatePresence initial={false}>
              {activeView === 'OUTREACH' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className={`overflow-hidden ml-5 pl-3 border-l border-brand/20 my-1 space-y-1 ${
                    isMenuCollapsed && !isMobileMenuOpen ? 'pl-0 ml-0 border-l-0' : ''
                  }`}
                >
                  <button
                    onClick={() => {
                      setCurrentCampaign(null);
                      setActivePanel(-1);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      activePanel === -1
                        ? 'bg-brand/10 text-brand font-bold'
                        : 'text-text-muted hover:bg-bg-subtle hover:text-text'
                    } ${isMenuCollapsed && !isMobileMenuOpen ? 'justify-center p-2' : ''}`}
                    title="All Campaigns Dashboard"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0 text-brand-alt" />
                    {(!isMenuCollapsed || isMobileMenuOpen) && <span className="truncate">All Campaigns</span>}
                  </button>

                  {currentCampaign ? (
                    <>
                      <div className={`px-3 py-1 text-[8px] font-bold text-text-muted uppercase tracking-wider select-none mt-2 ${
                        isMenuCollapsed && !isMobileMenuOpen ? 'hidden' : ''
                      }`}>
                        Active Campaign
                      </div>
                      {[
                        { id: 0, label: 'Agent Product DNA', icon: Settings },
                        { id: 1, label: 'Import & Quality Map', icon: Users, badge: leads.length },
                        { id: 2, label: 'Auto-Generate outreach', icon: Zap },
                        { id: 3, label: 'Review Copy & Edit', icon: Eye, badge: Object.keys(messages).length },
                        { id: 4, label: 'Outreach & Export', icon: Download }
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setActivePanel(p.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                            activePanel === p.id
                              ? 'bg-brand/15 text-brand font-bold'
                              : 'text-text-muted hover:bg-bg-subtle hover:text-text'
                          } ${isMenuCollapsed && !isMobileMenuOpen ? 'justify-center p-2' : ''}`}
                          title={p.label}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <p.icon className="w-3.5 h-3.5 shrink-0" />
                            {(!isMenuCollapsed || isMobileMenuOpen) && <span className="truncate">{p.label}</span>}
                          </div>
                          {p.badge && (!isMenuCollapsed || isMobileMenuOpen) ? (
                            <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded-md bg-brand-alt/10 text-brand-alt border border-brand-alt/20">
                              {p.badge}
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </>
                  ) : (
                    campaigns.length > 0 && (
                      <>
                        <div className={`px-3 py-1 text-[8px] font-bold text-text-muted uppercase tracking-wider select-none mt-2 ${
                          isMenuCollapsed && !isMobileMenuOpen ? 'hidden' : ''
                        }`}>
                          Select Campaign
                        </div>
                        {campaigns.slice(0, 4).map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setCurrentCampaign(c);
                              setActivePanel(0);
                              setIsMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1 rounded-xl text-[11px] text-text-muted hover:text-brand hover:bg-brand/5 transition-all cursor-pointer text-left"
                            title={c.name}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-alt shrink-0" />
                            {(!isMenuCollapsed || isMobileMenuOpen) && (
                              <span className="truncate max-w-[120px]">{c.name}</span>
                            )}
                          </button>
                        ))}
                      </>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <NavButton 
              active={activeView === 'RESEARCH'} 
              onClick={() => { setActiveView('RESEARCH'); setIsMobileMenuOpen(false); }}
              icon={Globe}
              label="Intelligence"
              subLabel="Prospect Research"
              isCollapsed={isMobileMenuOpen ? false : isMenuCollapsed}
            />
            <AnimatePresence initial={false}>
              {activeView === 'RESEARCH' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className={`overflow-hidden ml-5 pl-3 border-l border-brand/20 my-1 space-y-1 ${
                    isMenuCollapsed && !isMobileMenuOpen ? 'pl-0 ml-0 border-l-0' : ''
                  }`}
                >
                  <button
                    onClick={() => {
                      setResearchKey(prev => prev + 1);
                      setActiveView('RESEARCH');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-text-muted hover:bg-bg-subtle hover:text-text transition-all cursor-pointer ${
                      isMenuCollapsed && !isMobileMenuOpen ? 'justify-center p-2' : ''
                    }`}
                    title="Launch New Intel Synthesis"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0 text-brand-alt" />
                    {(!isMenuCollapsed || isMobileMenuOpen) && <span className="truncate font-semibold">New Deep-Dive</span>}
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('RESEARCH');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-brand bg-brand/10 font-bold hover:bg-brand/20 transition-all cursor-pointer ${
                      isMenuCollapsed && !isMobileMenuOpen ? 'justify-center p-2' : ''
                    }`}
                    title="Browse Saved Dossiers"
                  >
                    <History className="w-3.5 h-3.5 shrink-0" />
                    {(!isMenuCollapsed || isMobileMenuOpen) && <span className="truncate">Saved Dossiers</span>}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div>
            <NavButton 
              active={activeView === 'JOURNEY'} 
              onClick={() => { setActiveView('JOURNEY'); setIsMobileMenuOpen(false); }}
              icon={TrendingUp}
              label="Journeys"
              subLabel="CRM Deals & Boards"
              isCollapsed={isMobileMenuOpen ? false : isMenuCollapsed}
            />
          </div>

          <div>
            <NavButton 
              active={activeView === 'ANALYTICS'} 
              onClick={() => { setActiveView('ANALYTICS'); setIsMobileMenuOpen(false); }}
              icon={Activity}
              label="Analytics"
              subLabel="SLA & Funnel Reports"
              isCollapsed={isMobileMenuOpen ? false : isMenuCollapsed}
            />
          </div>

          <div>
            <NavButton 
              active={activeView === 'SETTINGS'} 
              onClick={() => { setActiveView('SETTINGS'); setIsMobileMenuOpen(false); }}
              icon={Settings}
              label="Settings"
              subLabel="Email & API Setup"
              isCollapsed={isMobileMenuOpen ? false : isMenuCollapsed}
            />
            <AnimatePresence initial={false}>
              {activeView === 'SETTINGS' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className={`overflow-hidden ml-5 pl-3 border-l border-brand/20 my-1 space-y-1 ${
                    isMenuCollapsed && !isMobileMenuOpen ? 'pl-0 ml-0 border-l-0' : ''
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveView('SETTINGS');
                      setIsMobileMenuOpen(false);
                      setTimeout(() => {
                        const el = document.getElementById('settings-smtp-card');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 120);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-text-muted hover:bg-bg-subtle hover:text-text transition-all cursor-pointer ${
                      isMenuCollapsed && !isMobileMenuOpen ? 'justify-center p-2' : ''
                    }`}
                    title="Configure SMTP Delivery"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0 text-email" />
                    {(!isMenuCollapsed || isMobileMenuOpen) && <span className="truncate">Email SMTP Setup</span>}
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('SETTINGS');
                      setIsMobileMenuOpen(false);
                      setTimeout(() => {
                        const el = document.getElementById('settings-linkedin-card');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 120);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-text-muted hover:bg-bg-subtle hover:text-text transition-all cursor-pointer ${
                      isMenuCollapsed && !isMobileMenuOpen ? 'justify-center p-2' : ''
                    }`}
                    title="Adjust LinkedIn Bridge"
                  >
                    <Linkedin className="w-3.5 h-3.5 shrink-0 text-linkedin" />
                    {(!isMenuCollapsed || isMobileMenuOpen) && <span className="truncate">LinkedIn Bridge</span>}
                  </button>

                  <button
                    onClick={() => {
                      generateProjectPDF();
                      if (showToast) showToast("Gathering system metadata and printing Architecture Report...", "success");
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-text-muted hover:bg-bg-subtle hover:text-text transition-all cursor-pointer ${
                      isMenuCollapsed && !isMobileMenuOpen ? 'justify-center p-2' : ''
                    }`}
                    title="Download System Specs Report"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 text-brand" />
                    {(!isMenuCollapsed || isMobileMenuOpen) && <span className="truncate">Systems Specs (PDF)</span>}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {(profile.role === 'org_admin' || profile.role === 'super_admin') && (
            <div>
              <NavButton 
                active={activeView === 'TEAM_ADMIN'} 
                onClick={() => { setActiveView('TEAM_ADMIN'); setIsMobileMenuOpen(false); }}
                icon={Users}
                label="Team Admin"
                subLabel="Manage Organization"
                isCollapsed={isMobileMenuOpen ? false : isMenuCollapsed}
              />
              <AnimatePresence initial={false}>
                {activeView === 'TEAM_ADMIN' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className={`overflow-hidden ml-5 pl-3 border-l border-brand/20 my-1 space-y-1 ${
                      isMenuCollapsed && !isMobileMenuOpen ? 'pl-0 ml-0 border-l-0' : ''
                    }`}
                  >
                    <div className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-brand bg-brand/10 font-medium ${
                      isMenuCollapsed && !isMobileMenuOpen ? 'justify-center p-2' : ''
                    }`}>
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      {(!isMenuCollapsed || isMobileMenuOpen) && <span className="truncate">Members Profile</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {profile.role === 'super_admin' && (
            <div>
              <NavButton 
                active={activeView === 'SUPER_ADMIN'} 
                onClick={() => { setActiveView('SUPER_ADMIN'); setIsMobileMenuOpen(false); }}
                icon={ShieldCheck}
                label="Super Admin"
                subLabel="Platform Control"
                isCollapsed={isMobileMenuOpen ? false : isMenuCollapsed}
              />
              <AnimatePresence initial={false}>
                {activeView === 'SUPER_ADMIN' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className={`overflow-hidden ml-5 pl-3 border-l border-brand/20 my-1 space-y-1 ${
                      isMenuCollapsed && !isMobileMenuOpen ? 'pl-0 ml-0 border-l-0' : ''
                    }`}
                  >
                    <div className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-brand bg-brand/10 font-medium ${
                      isMenuCollapsed && !isMobileMenuOpen ? 'justify-center p-2' : ''
                    }`}>
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      {(!isMenuCollapsed || isMobileMenuOpen) && <span className="truncate">Console Registry</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {!isMobileDevice && (
            <div className="pt-4 mt-4 border-t border-border-subtle">
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-bg-subtle transition-all group text-left cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                  theme === 'dark' ? 'bg-brand/10 text-brand' : 'bg-brand-alt/10 text-brand-alt'
                } ${isMenuCollapsed && !isMobileMenuOpen ? 'mx-auto' : ''}`}>
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                {(!isMenuCollapsed || isMobileMenuOpen) && (
                  <div className="overflow-hidden transition-all duration-300 block">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text">Appearance</div>
                    <div className="text-[8px] text-text-muted uppercase tracking-widest">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
                  </div>
                )}
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <div className={`flex items-center gap-3 p-2 rounded-2xl bg-bg-subtle ${isMenuCollapsed && !isMobileMenuOpen ? 'justify-center' : ''}`}>
            <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-border-subtle shrink-0" referrerPolicy="no-referrer" alt="User avatar" />
            {(!isMenuCollapsed || isMobileMenuOpen) && (
              <>
                <div className="overflow-hidden transition-all duration-300 block">
                  <div className="text-[10px] font-bold truncate text-text">{user.displayName}</div>
                  <div className="text-[8px] text-text-muted uppercase tracking-wider">{(profile.role || '').replace('_', ' ')}</div>
                </div>
                <button onClick={handleLogout} className="ml-auto p-1.5 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-lg transition-colors cursor-pointer">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar (Simplified) */}
        <header className="h-20 border-b border-border-subtle flex items-center justify-between px-4 md:px-8 bg-bg/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Hamburger Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-bg-subtle text-text hover:text-brand rounded-xl md:hidden transition-all shrink-0 cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="text-xs md:text-sm font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] text-text-muted truncate max-w-[150px] xs:max-w-[200px] md:max-w-none">
              {activeView === 'OUTREACH' ? 'Outreach Engine' : activeView === 'RESEARCH' ? 'Prospect Intelligence' : activeView === 'TEAM_ADMIN' ? 'Team Administration' : activeView === 'SETTINGS' ? 'System Settings' : 'Platform Control Center'}
            </h2>
            {activeView === 'OUTREACH' && currentCampaign && (
              <>
                <ChevronRight className="w-4 h-4 text-text-muted/40 shrink-0" />
                <div className="px-2.5 py-1 rounded-full bg-brand/10 border border-brand/20 text-[9px] md:text-[10px] font-bold text-brand truncate max-w-[100px] md:max-w-none">
                  {currentCampaign.name.toUpperCase()}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-alt animate-pulse" />
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">System Online</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {activeView === 'SETTINGS' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-10"
            >
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-text-muted text-xs md:text-sm">Manage your personal and system-wide configurations.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Email SMTP Section */}
                <div id="settings-smtp-card" className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm font-bold">
                      <div className="w-8 h-8 rounded-xl bg-email/10 flex items-center justify-center text-email">
                        <Mail className="w-4 h-4" />
                      </div>
                      Email SMTP Setup
                    </div>
                    {emAccount?.connected && (
                      <div className="px-3 py-1 rounded-full bg-brand-alt/10 text-brand-alt text-[9px] font-bold flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-alt animate-pulse" />
                        ACTIVE
                      </div>
                    )}
                  </div>

                  {!emAccount?.connected ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest">SMTP Host</label>
                          <input 
                            className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs focus:border-brand outline-none transition-all"
                            placeholder="smtp.gmail.com"
                            value={smtpConfig.host}
                            onChange={e => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Port</label>
                          <input 
                            className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs focus:border-brand outline-none transition-all"
                            placeholder="587"
                            value={smtpConfig.port}
                            onChange={e => setSmtpConfig(prev => ({ ...prev, port: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Username</label>
                          <input 
                            className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs focus:border-brand outline-none transition-all"
                            placeholder="user@example.com"
                            value={smtpConfig.user}
                            onChange={e => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Password</label>
                          <input 
                            type="password"
                            className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs focus:border-brand outline-none transition-all"
                            placeholder="••••••••"
                            value={smtpConfig.pass}
                            onChange={e => setSmtpConfig(prev => ({ ...prev, pass: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest">From Email / Name</label>
                        <input 
                          className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs focus:border-brand outline-none transition-all"
                          placeholder='"Zyntra AI" <user@example.com>'
                          value={smtpConfig.from}
                          onChange={e => setSmtpConfig(prev => ({ ...prev, from: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          id="smtp-secure-settings"
                          checked={smtpConfig.secure}
                          onChange={e => setSmtpConfig(prev => ({ ...prev, secure: e.target.checked }))}
                          className="w-4 h-4 accent-brand"
                        />
                        <label htmlFor="smtp-secure-settings" className="text-[10px] text-text-muted font-bold uppercase tracking-widest cursor-pointer">Use Secure (SSL/TLS)</label>
                      </div>
                      <button 
                        onClick={handleConnectEmail}
                        disabled={isConnectingEm}
                        className="w-full bg-email hover:bg-email/90 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 shadow-lg shadow-email/20"
                      >
                        {isConnectingEm ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save SMTP Settings
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-surface-alt border border-border rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-email/10 flex items-center justify-center text-email">
                          <Mail className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold flex items-center gap-2">
                            {emAccount.email}
                            <CheckCircle2 className="w-3.5 h-3.5 text-brand-alt" />
                          </div>
                          <div className="text-[10px] text-text-muted font-medium">{emAccount.provider} Connected</div>
                        </div>
                        <button onClick={handleDisconnectEmail} className="p-3 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-xl transition-colors">
                          <Unlink className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-text-muted leading-relaxed italic">
                        Your email is connected and ready for direct outreach. To change settings, disconnect first.
                      </p>
                    </div>
                  )}
                </div>

                {/* LinkedIn Section */}
                <div id="settings-linkedin-card" className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm font-bold">
                      <div className="w-8 h-8 rounded-xl bg-linkedin/10 flex items-center justify-center text-linkedin">
                        <Linkedin className="w-4 h-4" />
                      </div>
                      LinkedIn Bridge
                    </div>
                    {liAccount?.connected && (
                      <div className="px-3 py-1 rounded-full bg-brand-alt/10 text-brand-alt text-[9px] font-bold flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-alt animate-pulse" />
                        CONNECTED
                      </div>
                    )}
                  </div>
                  
                  {!liAccount?.connected ? (
                    <div className="space-y-4">
                      <p className="text-xs text-text-muted leading-relaxed">
                        Connect your profile to enable automated background sending through our secure bridge.
                      </p>
                      <div className="p-3 rounded-xl bg-brand/5 border border-brand/10 flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                        <div className="text-[10px] text-text-muted leading-tight">
                          <strong>Setup Required:</strong> Ensure LinkedIn is enabled in your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Firebase Console</a> under Authentication &gt; Sign-in method.
                        </div>
                      </div>
                      <button 
                        onClick={handleConnectLinkedIn}
                        disabled={isConnectingLi}
                        className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 shadow-lg shadow-brand/20"
                      >
                        {isConnectingLi ? <Loader2 className="w-5 h-5 animate-spin" /> : <Link2 className="w-5 h-5" />}
                        Connect LinkedIn
                      </button>
                    </div>
                  ) : (
                    <div className="bg-surface-alt border border-border rounded-2xl p-4 flex items-center gap-4">
                      <img src={liAccount.avatar} alt={liAccount.name} className="w-12 h-12 rounded-2xl border border-brand/20" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <div className="text-sm font-bold flex items-center gap-2">
                          {liAccount.name}
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-alt" />
                        </div>
                        <div className="text-[10px] text-text-muted font-medium">Automation Bridge Active</div>
                      </div>
                      <button onClick={handleDisconnectLinkedIn} className="p-3 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-xl transition-colors">
                        <Unlink className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* System Defaults Info */}
              <div className="bg-surface-alt/50 border border-border border-dashed rounded-3xl p-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold">System Defaults</h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      If you don't provide your own SMTP settings, the platform will use the system-wide default email service configured by the administrator. 
                      Personal SMTP settings are always prioritized for your outreach.
                    </p>
                  </div>
                </div>
              </div>

              {/* Project Documentation Export */}
              <div id="settings-docs-card" className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5">
                <div className="flex items-center gap-3 text-sm font-bold">
                  <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                    <FileText className="w-4 h-4" />
                  </div>
                  Project Documentation
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Generate a complete PDF report of the project architecture, features, and technical specifications.
                </p>
                <button 
                  onClick={generateProjectPDF}
                  className="w-full bg-surface-alt border border-border hover:border-brand/30 text-text font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  Download Project Report (PDF)
                </button>
              </div>

              {/* REST API Credentials & Webhook Gateway Hub */}
              <SettingsApiKeysPanel showToast={showToast} />
            </motion.div>
          )}

          {activeView === 'OUTREACH' && (
            <div className="max-w-6xl mx-auto">
              {activePanel === -1 && (
                <CampaignDashboard 
                  campaigns={campaigns} 
                  onCreate={handleCreateCampaign} 
                  onSelect={(c) => { setCurrentCampaign(c); setActivePanel(0); }}
                  onDelete={handleDeleteCampaign}
                  onDownloadPDF={downloadCampaignPDF}
                />
              )}
              {/* Panel 0: Configure */}
              <PanelWrapper index={0} activePanel={activePanel}>
                {/* ... existing configure content ... */}
          <div className="space-y-1 mb-8">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Configure</h1>
            <p className="text-text-muted text-xs md:text-sm">Train your AI outreach agents with your product DNA.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Leads Loaded', val: leads.length, color: 'brand' },
              { label: 'AI Generated', val: Object.keys(messages).length, color: 'brand-alt' },
              { label: 'Active Channels', val: Object.values(chState).filter(Boolean).length, color: 'f59e0b' },
              { label: 'Ready to Send', val: Object.keys(messages).length, color: '6c63ff' }
            ].map((s, i) => (
              <motion.div 
                key={i} 
                whileHover={{ y: -5 }}
                className="bg-surface border border-border rounded-3xl p-6 glow-brand/5 group cursor-default"
              >
                <div className="text-3xl font-syne font-bold group-hover:text-brand transition-colors">{s.val}</div>
                <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5">
              <div className="flex items-center gap-3 text-sm font-bold">
                <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                  <Briefcase className="w-4 h-4" />
                </div>
                Product DNA
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Company & Product</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      className="w-full bg-surface-alt border border-border rounded-2xl p-4 text-sm focus:border-brand outline-none transition-all"
                      placeholder="Company"
                      value={config.company}
                      onChange={e => setConfig(prev => ({ ...prev, company: e.target.value }))}
                    />
                    <input 
                      className="w-full bg-surface-alt border border-border rounded-2xl p-4 text-sm focus:border-brand outline-none transition-all"
                      placeholder="Product"
                      value={config.product}
                      onChange={e => setConfig(prev => ({ ...prev, product: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Value Proposition</label>
                  <textarea 
                    className="w-full bg-surface-alt border border-border rounded-2xl p-4 text-sm focus:border-brand outline-none transition-all min-h-[120px] resize-none"
                    placeholder="Describe how you help..."
                    value={config.vp}
                    onChange={e => setConfig(prev => ({ ...prev, vp: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Sender Name</label>
                    <input 
                      className="w-full bg-surface-alt border border-border rounded-2xl p-4 text-sm focus:border-brand outline-none transition-all"
                      value={config.sender}
                      onChange={e => setConfig(prev => ({ ...prev, sender: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest">CTA Goal</label>
                    <select 
                      className="w-full bg-surface-alt border border-border rounded-2xl p-4 text-sm focus:border-brand outline-none transition-all appearance-none cursor-pointer"
                      value={config.cta}
                      onChange={e => setConfig(prev => ({ ...prev, cta: e.target.value }))}
                    >
                      <option>20-minute demo call</option>
                      <option>15-minute intro call</option>
                      <option>Reply with interest</option>
                      <option>Book via Calendly</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    if (!currentCampaign?.id) return;
                    try {
                      await updateDoc(doc(db, 'campaigns', currentCampaign.id), { config });
                      showToast('Product DNA saved successfully!');
                    } catch (err) {
                      handleFirestoreError(err, OperationType.UPDATE, `campaigns/${currentCampaign.id}`);
                    }
                  }}
                  className="w-full py-4 rounded-2xl bg-brand/10 border border-brand/20 text-brand font-bold text-sm hover:bg-brand/20 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Product DNA
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5">
                <div className="flex items-center gap-3 text-sm font-bold">
                  <div className="w-8 h-8 rounded-xl bg-brand-alt/10 flex items-center justify-center text-brand-alt">
                    <Settings className="w-4 h-4" />
                  </div>
                  Outreach Channels
                </div>
                <div className="space-y-4">
                  <p className="text-xs text-text-muted leading-relaxed">
                    Configure your global email and LinkedIn settings in the <button onClick={() => setActiveView('SETTINGS')} className="text-brand font-bold hover:underline">Settings</button> tab to enable direct outreach.
                  </p>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface-alt border border-border">
                    <div className={`w-2 h-2 rounded-full ${emAccount?.connected ? 'bg-brand-alt animate-pulse' : 'bg-text-muted/30'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Email: {emAccount?.connected ? 'Connected' : 'Not Configured'}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface-alt border border-border">
                    <div className={`w-2 h-2 rounded-full ${liAccount?.connected ? 'bg-brand-alt animate-pulse' : 'bg-text-muted/30'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">LinkedIn: {liAccount?.connected ? 'Connected' : 'Not Configured'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-alt/50 border border-border border-dashed rounded-3xl p-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold">Campaign Scope</h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      These settings apply specifically to the <strong>{currentCampaign?.name}</strong> campaign. 
                      Changes to Product DNA will affect future AI generations for this campaign.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-3xl p-8 space-y-6 mt-6 glow-brand/5">
            <div className="flex items-center gap-3 text-sm font-bold">
              <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                <Globe className="w-4 h-4" />
              </div>
              Active Channels
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'wa' as const, icon: MessageSquare, label: 'WhatsApp', color: '#25d366' },
                { id: 'li' as const, icon: Linkedin, label: 'LinkedIn', color: '#4da6ff' },
                { id: 'em' as const, icon: Mail, label: 'Email', color: '#f59e0b' }
              ].map(ch => (
                <button
                  key={ch.id}
                  onClick={() => handleToggleCh(ch.id)}
                  className={`flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all duration-300 ${
                    chState[ch.id] 
                      ? `bg-surface border-brand/50 shadow-lg shadow-brand/5` 
                      : 'bg-surface-alt/30 border-border text-text-muted'
                  }`}
                >
                  <ch.icon className="w-8 h-8" style={{ color: chState[ch.id] ? ch.color : undefined }} />
                  <div className="text-center">
                    <div className="text-xs font-bold" style={{ color: chState[ch.id] ? ch.color : undefined }}>{ch.label}</div>
                    <div className="text-[8px] font-bold uppercase tracking-widest opacity-60 mt-1">{chState[ch.id] ? 'Active' : 'Disabled'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActivePanel(1)}
            className="w-full bg-gradient-to-r from-brand to-brand-alt text-white font-syne font-extrabold py-6 rounded-3xl transition-all flex items-center justify-center gap-3 group mt-10 shadow-xl shadow-brand/20 text-lg"
          >
            Import Target Leads
            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </motion.button>
        </PanelWrapper>

        {/* Panel 1: Import */}
        <PanelWrapper index={1} activePanel={activePanel}>
          <div className="space-y-1 mb-8">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Import Leads</h1>
            <p className="text-text-muted text-xs md:text-sm">Paste your target list or load our high-converting sample.</p>
          </div>

          <div className="bg-brand/10 border border-brand/20 rounded-3xl p-6 text-sm text-brand-muted leading-relaxed flex items-start gap-4 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-brand/20 flex items-center justify-center text-brand shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-brand mb-1">CSV Format Guide</div>
              Required columns: <span className="font-mono text-brand-alt">name, role, company, industry, country, phone, email, linkedin_url</span>. 
              Ensure your data is clean for maximum AI personalization accuracy.
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5">
              <div className="flex items-center gap-3 text-sm font-bold">
                <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                  <UserPlus className="w-4 h-4" />
                </div>
                Add Single Lead
              </div>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const lead: Lead = {
                    name: formData.get('name') as string,
                    role: formData.get('role') as string,
                    company: formData.get('company') as string,
                    industry: formData.get('industry') as string,
                    country: formData.get('country') as string,
                    phone: formData.get('phone') as string,
                    email: formData.get('email') as string,
                    linkedin_url: formData.get('linkedin_url') as string,
                    userId: user.uid,
                    orgId: profile.orgId,
                    campaignId: currentCampaign?.id
                  };
                  if (!lead.name || !currentCampaign) return;
                  await saveLeads([lead]);
                  e.currentTarget.reset();
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <input name="name" placeholder="Full Name" required className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand" />
                  <input name="company" placeholder="Company" required className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input name="role" placeholder="Role" className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand" />
                  <input name="industry" placeholder="Industry" className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input name="email" placeholder="Email" className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand" />
                  <input name="linkedin_url" placeholder="LinkedIn URL" className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand" />
                </div>
                <button type="submit" className="w-full py-3 rounded-xl bg-brand text-white font-bold text-xs hover:bg-brand/90 transition-all">
                  Add Lead
                </button>
              </form>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5">
              <div className="flex items-center gap-3 text-sm font-bold">
                <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                Paste CSV Data
              </div>
              <div className="space-y-4">
                <textarea 
                  className="w-full bg-surface-alt border border-border rounded-2xl p-6 text-xs font-mono focus:border-brand outline-none transition-all min-h-[200px] resize-none"
                  placeholder="name,role,company,industry,country,phone,email,linkedin_url..."
                  value={rawLeads}
                  onChange={e => setRawLeads(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => parseLeads(rawLeads)}
                    className="bg-brand hover:bg-brand/90 text-white text-sm font-bold py-4 rounded-2xl transition-all shadow-lg shadow-brand/20"
                  >
                    Parse Paste
                  </button>
                  <button 
                    onClick={() => {
                      setRawLeads(SAMPLE_CSV);
                      parseLeads(SAMPLE_CSV);
                    }}
                    className="bg-surface-alt border border-border hover:bg-border text-text text-sm font-bold py-4 rounded-2xl transition-all"
                  >
                    Load Sample
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm font-bold">
                  <div className="w-8 h-8 rounded-xl bg-brand-alt/10 flex items-center justify-center text-brand-alt">
                    <Download className="w-4 h-4" />
                  </div>
                  Smart field mapping Importer
                </div>
                <p className="text-text-muted text-[11px] leading-relaxed">
                  Analyze CSV or Excel structure, discover Columns fuzzy matching suggest targets, resolve duplicates and save custom templates.
                </p>
              </div>
              
              <button
                onClick={() => {
                  if (!currentCampaign) {
                    showToast("Please select or create an active campaign first.", "error");
                    return;
                  }
                  setShowSmartImportModal(true);
                }}
                className="w-full bg-brand-alt/10 hover:bg-brand-alt hover:text-[#090a0f] text-[#00d4aa] font-extrabold py-5 rounded-2xl border border-brand-alt/30 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer text-xs"
              >
                <Plus className="w-5 h-5" />
                Launch Smart Importer Wizard
              </button>
              
              <div className="bg-[#090a0f] rounded-xl p-3 text-[9px] text-brand-alt font-mono leading-relaxed mt-2 border border-border/40">
                <span className="font-bold">FEATURES:</span> Excel sheet columns detection • Preset templates saving • Custom CRM property creation • Format validations checklist.
              </div>
            </div>
          </div>

          {leads.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 mt-10"
            >
              {/* Campaign Lead Score Distribution Histogram */}
              <LeadScoreHistogram 
                leads={leads} 
                showToast={showToast} 
                scoreFilter={scoreFilter}
                setScoreFilter={setScoreFilter}
                highlightElite={highlightElite}
                setHighlightElite={setHighlightElite}
              />

              <div className="flex items-center justify-between">
                <div className="text-lg font-syne font-bold flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-alt/10 flex items-center justify-center text-brand-alt">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span>
                      {scoreFilter ? `${leads.filter(l => {
                        const s = calculateLeadScore(l);
                        return s >= scoreFilter.min && s <= scoreFilter.max;
                      }).length} of ${leads.length}` : leads.length} Target Leads Identified
                    </span>
                    {scoreFilter && (
                      <div className="flex items-center gap-1.5 bg-brand/15 text-brand border border-brand/30 px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse">
                        <span>Score Space: {scoreFilter.rangeLabel}</span>
                        <button 
                          onClick={() => setScoreFilter(null)} 
                          className="hover:text-red-400 font-extrabold cursor-pointer transition-colors p-0.5 ml-1 text-sm leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setSortByScore(!sortByScore)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 ${
                    sortByScore ? 'bg-brand text-white' : 'bg-surface border border-border text-text-muted'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  {sortByScore ? 'Sorted by Score' : 'Sort by Score'}
                </button>
              </div>
              <div className="grid gap-3">
                {[...leads]
                  .filter(l => {
                    if (!scoreFilter) return true;
                    const s = calculateLeadScore(l);
                    return s >= scoreFilter.min && s <= scoreFilter.max;
                  })
                  .sort((a, b) => sortByScore ? calculateLeadScore(b) - calculateLeadScore(a) : 0)
                  .map((l, i) => {
                    const lScore = calculateLeadScore(l);
                    const isElite = lScore >= 60;
                    const shouldHighlight = highlightElite && isElite;

                    return (
                      <motion.div 
                        key={l.id || i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`border rounded-2xl p-4 flex flex-col group transition-all duration-300 ${
                          shouldHighlight
                            ? 'bg-emerald-500/5 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.12)] scale-[1.01]'
                            : 'bg-surface border-border hover:border-brand/30'
                        }`}
                      >
                        <div 
                          onClick={() => {
                            const cid = l.id || `lead-${i}`;
                            setExpandedLeadId(expandedLeadId === cid ? null : cid);
                          }}
                          className="flex items-center gap-4 cursor-pointer select-none"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${
                            shouldHighlight
                              ? 'bg-gradient-to-br from-emerald-400 via-brand-alt to-emerald-600 animate-pulse'
                              : 'bg-gradient-to-br from-brand to-brand-alt'
                          }`}>
                            {(l?.name || '?')[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-bold group-hover:text-brand transition-colors truncate">
                                {l?.name || 'Anonymous Lead'}
                              </div>
                              {shouldHighlight && (
                                <motion.span 
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ repeat: Infinity, duration: 2.2 }}
                                  className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[8px] font-extrabold tracking-widest uppercase flex items-center gap-0.5 shadow-sm"
                                >
                                  <Award className="w-2.5 h-2.5" />
                                  <span>Elite</span>
                                </motion.span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider truncate">
                                {l.role} @ {l.company}
                              </div>
                              <div className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                                isElite ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/20' : 'bg-brand/10 text-brand'
                              }`}>
                                SCORE: {lScore}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {l.status === 'sent' && (
                              <div className="px-2 py-1 rounded-lg bg-brand-alt/10 border border-brand-alt/20 text-[9px] font-bold text-brand-alt flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                SENT
                              </div>
                            )}
                            <div className="px-2 py-1 rounded-lg bg-surface-alt border border-border text-[9px] font-bold text-text-muted">
                              {COUNTRY_FLAGS[l.country] || '🌍'} {l.country}
                            </div>
                            <div className="text-text-muted group-hover:text-brand p-1 transition-colors">
                              <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${expandedLeadId === (l.id || `lead-${i}`) ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </div>

                        {/* Expandable lead details */}
                        {expandedLeadId === (l.id || `lead-${i}`) && (
                          <div className="w-full mt-4 pt-4 border-t border-border/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs animate-fadeIn">
                            <div>
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Company Name</span>
                              <span className="text-white font-medium block truncate">{l.company || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Official Website</span>
                              {l.website && l.website !== 'N/A' ? (
                                <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`} target="_blank" rel="noreferrer" className="text-brand hover:underline font-medium block truncate flex items-center gap-1">
                                  {l.website} <ExternalLink className="w-3 h-3 text-brand" />
                                </a>
                              ) : (
                                <span className="text-text-muted">N/A</span>
                              )}
                            </div>
                            <div>
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Decision Maker</span>
                              <span className="text-white font-medium block truncate">{l.name || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Designation</span>
                              <span className="text-brand font-medium block truncate">{l.role || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Verified Phone</span>
                              <span className="text-white font-mono font-medium block truncate">{l.phone || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Verified Email</span>
                              {l.email ? (
                                <a href={`mailto:${l.email}`} className="text-brand hover:underline font-mono font-medium block truncate">{l.email}</a>
                              ) : (
                                <span className="text-text-muted">N/A</span>
                              )}
                            </div>
                            <div>
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">LinkedIn Profile</span>
                              {l.linkedin_url ? (
                                <a href={l.linkedin_url.startsWith('http') ? l.linkedin_url : `https://${l.linkedin_url}`} target="_blank" rel="noreferrer" className="text-brand hover:underline font-medium block truncate flex items-center gap-1">
                                  LinkedIn <ExternalLink className="w-3 h-3 text-brand" />
                                </a>
                              ) : (
                                <span className="text-text-muted font-medium block truncate">N/A</span>
                              )}
                            </div>
                            <div>
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Employee Size</span>
                              <span className="text-white font-medium block truncate">{l.employees || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Location / Country</span>
                              <span className="text-white font-medium block truncate">{l.country || 'N/A'}</span>
                            </div>
                            <div className="col-span-full">
                              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Industry Segment</span>
                              <span className="text-white font-medium block truncate">{l.industry || 'N/A'}</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
              </div>
              
              {/* Automated Realtime CRM Sync Status Pipelines */}
              <CrmSyncLogsPanel leads={leads} showToast={showToast} />
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActivePanel(2)}
                className="w-full bg-gradient-to-r from-brand to-brand-alt text-white font-syne font-extrabold py-6 rounded-3xl transition-all flex items-center justify-center gap-3 group shadow-xl shadow-brand/20 text-lg"
              >
                Continue to Generate
                <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </motion.button>
            </motion.div>
          )}
        </PanelWrapper>

        {/* Panel 2: Generate */}
        <PanelWrapper index={2} activePanel={activePanel}>
          <div className="space-y-1 mb-8">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Generate</h1>
            <p className="text-text-muted text-xs md:text-sm">AI writes WhatsApp + LinkedIn + Email per lead.</p>
          </div>

          <div className="bg-email/10 border border-email/20 rounded-3xl p-6 text-sm text-warning-muted leading-relaxed flex items-start gap-4 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-email/20 flex items-center justify-center text-email shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-brand mb-1">Resource Usage</div>
              Each lead = 1 API call (all 3 channels). {leads.length} leads ≈ 30–60 seconds.
            </div>
          </div>

          {!isGenerating && Object.keys(messages).length === 0 && (
            <div className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5">
              <div className="flex items-center gap-3 text-sm font-bold">
                <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                  <Zap className="w-4 h-4" />
                </div>
                Settings
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Batch Size</label>
                  <select 
                    className="w-full bg-surface-alt border border-border rounded-2xl p-4 text-sm focus:border-brand outline-none transition-all appearance-none cursor-pointer"
                    value={batchSize}
                    onChange={e => setBatchSize(parseInt(e.target.value))}
                  >
                    <option value={3}>3 leads (quick test)</option>
                    <option value={10}>10 leads</option>
                    <option value={20}>20 leads</option>
                    <option value={999}>All leads</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Tone Style</label>
                  <select 
                    className="w-full bg-surface-alt border border-border rounded-2xl p-4 text-sm focus:border-brand outline-none transition-all appearance-none cursor-pointer"
                    value={tone}
                    onChange={e => setTone(e.target.value)}
                  >
                    <option>Professional B2B</option>
                    <option>Warm & Conversational</option>
                    <option>Direct & Concise</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={startGeneration}
                className="w-full bg-brand hover:bg-brand/90 text-white font-syne font-extrabold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-brand/20"
              >
                <Zap className="w-6 h-6 fill-current" />
                Generate All Messages
              </button>
            </div>
          )}

          {isGenerating && (
            <div className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5">
              <div className="flex items-center gap-3 text-sm font-bold">
                <Loader2 className="w-5 h-5 text-brand animate-spin" />
                Generating…
              </div>
              <div className="h-2 w-full bg-surface-alt rounded-full overflow-hidden border border-border">
                <motion.div 
                  className="h-full bg-gradient-to-r from-brand to-brand-alt"
                  initial={{ width: 0 }}
                  animate={{ width: `${genProgress}%` }}
                />
              </div>
              <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
                Progress: {Math.round(genProgress)}%
              </div>
              <div className="bg-bg-subtle border border-border rounded-2xl p-5 h-48 overflow-y-auto font-mono text-[11px] text-text-muted space-y-2 custom-scrollbar">
                {genLog.map((log, i) => (
                  <div key={i} className={`flex items-start gap-2 ${log.includes('✓') ? 'text-brand-alt' : ''}`}>
                    <span className="opacity-30">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                    {log}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {!isGenerating && Object.keys(messages).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface border border-border rounded-3xl p-8 text-center space-y-6 glow-brand/5"
            >
              <div className="w-20 h-20 bg-brand-alt/10 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-brand-alt" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-syne font-bold text-brand-alt">All Messages Ready</h3>
                <p className="text-text-muted text-base">Tap Review to read and edit before sending.</p>
              </div>
              <button 
                onClick={() => setActivePanel(3)}
                className="w-full bg-brand-alt/10 hover:bg-brand-alt/20 text-brand-alt border border-brand-alt/30 font-syne font-extrabold py-5 rounded-2xl transition-all"
              >
                Review Messages →
              </button>
            </motion.div>
          )}
        </PanelWrapper>

        {/* Panel 3: Review */}
        <PanelWrapper index={3} activePanel={activePanel}>
          <div className="space-y-1 mb-8">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Review & Refine</h1>
            <p className="text-text-muted text-xs md:text-sm">Fine-tune your AI agents' output before sending.</p>
          </div>

          <div className="space-y-6">
            {leads.filter(l => l.id && messages[l.id]).map((lead) => (
              <ReviewCard 
                key={lead.id} 
                lead={lead} 
                msg={messages[lead.id!]} 
                smtpConfig={smtpConfig}
                onUpdate={async (field, val) => {
                  if (!lead.id) return;
                  await updateDoc(doc(db, 'messages', lead.id), { [field]: val });
                }} 
              />
            ))}
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActivePanel(4)}
            className="w-full bg-gradient-to-r from-brand to-brand-alt text-white font-syne font-extrabold py-6 rounded-3xl transition-all flex items-center justify-center gap-3 group mt-10 shadow-xl shadow-brand/20 text-lg"
          >
            Export & Send
            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </motion.button>
        </PanelWrapper>

        {/* Panel 4: Export */}
        <PanelWrapper index={4} activePanel={activePanel}>
          <div className="space-y-1 mb-8">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Export & Send</h1>
            <p className="text-text-muted text-xs md:text-sm">Download and deploy your outreach.</p>
          </div>

          <div className="bg-brand/10 border border-brand/20 rounded-3xl p-6 text-sm text-brand-muted leading-relaxed flex items-start gap-4 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-brand/20 flex items-center justify-center text-brand shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-brand mb-1">Export Options</div>
              Master CSV works in Google Sheets. n8n JSON imports directly into your workflow.
            </div>
          </div>

          <div className="grid gap-6">
            {isBulkSending && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-brand/10 border border-brand/30 rounded-3xl p-8 space-y-6 glow-brand/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-lg font-syne font-bold text-brand">
                    <Zap className="w-6 h-6 animate-pulse fill-current" />
                    BULK OUTREACH IN PROGRESS
                  </div>
                  <div className="text-sm font-bold text-brand">{Math.round(bulkProgress)}%</div>
                </div>
                <div className="h-3 w-full bg-surface-alt rounded-full overflow-hidden border border-brand/20">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-brand to-brand-alt"
                    initial={{ width: 0 }}
                    animate={{ width: `${bulkProgress}%` }}
                  />
                </div>
                <div className="bg-bg-subtle border border-brand/20 rounded-2xl p-5 h-48 overflow-y-auto font-mono text-[11px] text-text-muted space-y-2 custom-scrollbar">
                  {bulkLog.map((log, i) => (
                    <div key={i} className={`flex items-start gap-2 ${log.includes('✓') ? 'text-brand-alt' : log.includes('🎉') ? 'text-brand font-bold' : ''}`}>
                      <span className="opacity-30">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                      {log}
                    </div>
                  ))}
                  <div ref={bulkLogEndRef} />
                </div>
              </motion.div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {liAccount?.connected && (
                <div className="md:col-span-2 bg-brand/5 border border-brand/20 rounded-3xl p-8 space-y-6 glow-brand/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                        <Linkedin className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-lg font-bold">LinkedIn Auto-Send Queue</div>
                        <div className="text-xs text-text-muted font-medium">Sync with automation bridge</div>
                      </div>
                    </div>
                    {lastSync && (
                      <div className="px-3 py-1 rounded-full bg-brand/10 text-brand text-[9px] font-mono font-bold">LAST SYNC: {lastSync}</div>
                    )}
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Your LinkedIn account is connected. Sync your generated messages to the automation bridge to start background sending.
                  </p>
                  <button 
                    onClick={handleSyncLinkedIn}
                    disabled={isSyncingLi || Object.keys(messages).length === 0}
                    className="w-full py-4 rounded-2xl bg-brand text-white font-syne font-extrabold flex items-center justify-center gap-3 hover:bg-brand/90 transition-all disabled:opacity-50 shadow-lg shadow-brand/20"
                  >
                    {isSyncingLi ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                    Sync {Object.keys(messages).length} Messages to Queue
                  </button>
                </div>
              )}
              {[
                { id: 'whatsapp' as const, icon: <Smartphone className="w-6 h-6" />, title: 'WhatsApp', color: '#25d366', desc: 'CSV with all messages + Node.js send script' },
                { id: 'linkedin' as const, icon: <Linkedin className="w-6 h-6" />, title: 'LinkedIn', color: '#4da6ff', desc: 'Connect request + DM text. Import to Expandi / Dripify.' },
                { id: 'email' as const, icon: <Mail className="w-6 h-6" />, title: 'Email', color: '#f59e0b', desc: 'Subject + body + follow-up. Import to Apollo / Lemlist.' },
                { id: 'master' as const, icon: <FileSpreadsheet className="w-6 h-6" />, title: 'Master CSV', color: '#00d4aa', desc: 'All leads + all 3 channels in one tracking spreadsheet.' }
              ].map(ex => (
                <div key={ex.id} className="bg-surface border border-border rounded-3xl p-8 space-y-6 glow-brand/5 group hover:border-brand/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: ex.color }}>
                      {ex.icon}
                    </div>
                    <div>
                      <div className="text-lg font-bold">{ex.title}</div>
                      <div className="text-xs text-text-muted font-medium">{ex.desc}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => exportCSV(ex.id as any)}
                      className="flex-1 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-border hover:bg-surface-alt"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    {ex.id === 'whatsapp' && (
                      <button 
                        onClick={() => startBulkSend('wa')}
                        disabled={isBulkSending}
                        className="px-6 py-4 rounded-2xl bg-whatsapp text-white text-sm font-bold hover:bg-whatsapp/80 transition-all disabled:opacity-50 shadow-lg shadow-whatsapp/20"
                      >
                        <Zap className="w-5 h-5 fill-current" />
                      </button>
                    )}
                    {ex.id === 'linkedin' && liAccount?.connected && (
                      <button 
                        onClick={() => startBulkSend('li')}
                        disabled={isBulkSending}
                        className="px-6 py-4 rounded-2xl bg-linkedin text-white text-sm font-bold hover:bg-linkedin/80 transition-all disabled:opacity-50 shadow-lg shadow-linkedin/20"
                      >
                        <Zap className="w-5 h-5 fill-current" />
                      </button>
                    )}
                    {ex.id === 'email' && emAccount?.connected && (
                      <button 
                        onClick={() => startBulkSend('em')}
                        disabled={isBulkSending}
                        className="px-6 py-4 rounded-2xl bg-email text-white text-sm font-bold hover:bg-email/80 transition-all disabled:opacity-50 shadow-lg shadow-email/20"
                      >
                        <Zap className="w-5 h-5 fill-current" />
                      </button>
                    )}
                  </div>

                  {ex.id === 'linkedin' && liAccount?.connected && (
                    <div className="pt-4 border-t border-border space-y-4">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-text-muted">
                        <span>Automation Bridge</span>
                        <span className="text-brand-alt">Ready</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={handleSyncLinkedIn}
                          disabled={isSyncingLi}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-alt/10 text-brand-alt border border-brand-alt/20 text-[10px] font-bold hover:bg-brand-alt hover:text-white transition-all disabled:opacity-50"
                        >
                          {isSyncingLi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          Sync Queue
                        </button>
                        <button 
                          onClick={() => exportCSV('li_script')}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-alt border border-border text-[10px] font-bold hover:bg-border transition-all"
                        >
                          <Code2 className="w-3 h-3" />
                          Get Script
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CRM Integration Section */}
          <div className="bg-surface border border-border rounded-3xl p-8 space-y-6 mt-10 glow-brand/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Database className="w-24 h-24 text-brand" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                    <Database className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-base font-bold">Enterprise CRM Integration</h3>
                </div>
                <p className="text-xs text-text-muted">
                  Export personalized leads and conversation metrics directly to HubSpot or Salesforce pipelines.
                </p>
              </div>

              {!crmAccount?.connected ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setCrmPlatformToConnect('HubSpot');
                      setShowCrmModal(true);
                    }}
                    className="px-4 py-2 border border-border bg-surface-alt hover:bg-border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    Connect HubSpot
                  </button>
                  <button 
                    onClick={() => {
                      setCrmPlatformToConnect('Salesforce');
                      setShowCrmModal(true);
                    }}
                    className="px-4 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    Connect Salesforce
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {crmAccount.platform} Connected
                  </span>
                  <button 
                    onClick={handleDisconnectCRM}
                    className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {crmAccount?.connected && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-6 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">Connected Org</label>
                  <div className="p-3.5 bg-[#090a0f] border border-border rounded-2xl text-xs font-mono font-semibold flex items-center justify-between text-brand">
                    <span>{crmAccount.orgName}</span>
                    <RefreshCw className="w-3.5 h-3.5 opacity-60 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">Pipeline Target Stage</label>
                  <select 
                    value={crmMappingStage}
                    onChange={(e) => setCrmMappingStage(e.target.value)}
                    className="w-full p-3.5 bg-[#090a0f] border border-border rounded-2xl text-xs font-bold text-text cursor-pointer focus:outline-none focus:border-brand"
                  >
                    <option value="Prospecting / SDR Out">Prospecting / SDR Out</option>
                    <option value="Lead Qualified / Verified">Lead Qualified / Verified</option>
                    <option value="Meeting Scheduled Loop">Meeting Scheduled Loop</option>
                    <option value="Custom Active Campaigns">Custom Active Campaigns</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button 
                    onClick={handlePushCRMData}
                    disabled={isCrmPushing}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand to-brand-alt hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-brand/20"
                  >
                    {isCrmPushing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Syncing to {crmAccount.platform}...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 fill-current" />
                        <span>Push {leads.length || 3} Leads to {crmAccount.platform}</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {showCrmPushLogs && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-[#090a0f]/50 border border-border rounded-2xl p-5 space-y-4 glow-brand/5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-brand flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-brand animate-pulse" />
                    API INTEGRATION PIPELINE SYNC
                  </span>
                  <span className="font-mono font-bold text-brand">{crmPushProgress}%</span>
                </div>
                
                <div className="h-2 w-full bg-surface-alt rounded-full overflow-hidden border border-border">
                  <div 
                    className="h-full bg-gradient-to-r from-brand to-brand-alt transition-all duration-300"
                    style={{ width: `${crmPushProgress}%` }}
                  />
                </div>

                <div className="bg-[#090a0f] border border-border rounded-xl p-4 h-40 overflow-y-auto font-mono text-[10px] text-text-muted space-y-1.5 custom-scrollbar">
                  {crmPushLog.map((log, i) => (
                    <div key={i} className={`flex items-start gap-1.5 ${log.includes('HTTP 201') ? 'text-brand-alt' : log.includes('[SUCCESS]') || log.includes('Successfully') ? 'text-brand font-bold' : ''}`}>
                      <span className="opacity-30">[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-3xl p-8 space-y-6 mt-10 glow-brand/5">
            <div className="flex items-center gap-3 text-sm font-bold">
              <ShieldCheck className="w-4 h-4 text-brand" />
              Daily Limits & Safety
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: 'WhatsApp', color: '#25d366', body: 'Max 50-80 msg/day. 8-10s delay.' },
                { title: 'LinkedIn', color: '#4da6ff', body: 'Max 20-25 req/day. No links in msg 1.' },
                { title: 'Email', color: '#f59e0b', body: 'Max 50-100/day. Warm domain first.' }
              ].map((s, i) => (
                <div key={i} className="bg-surface-alt border border-border rounded-2xl p-4 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: s.color }}>{s.title}</div>
                  <div className="text-[10px] text-text-muted font-medium leading-relaxed">{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </PanelWrapper>
      </div>
    )}

    {activeView === 'TEAM_ADMIN' && <TeamAdminPanel profile={profile} />}
    {activeView === 'SUPER_ADMIN' && <SuperAdminPanel showToast={showToast} />}
    {activeView === 'JOURNEY' && (
      <CrmPipelineBoard 
        leads={leads}
        onLeadsUpdated={() => {
          // trigger trigger refresh
        }}
        showToast={showToast}
      />
    )}
    {activeView === 'ANALYTICS' && (
      <LeadJourneyAnalytics showToast={showToast} />
    )}
    {activeView === 'RESEARCH' && (
      <ProspectResearchPanel 
        key={researchKey}
        user={user} 
        profile={profile} 
        campaigns={campaigns} 
        showToast={showToast} 
      />
    )}
  </main>
  <footer className="py-8 border-t border-border-subtle/50 mt-auto">
    <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        <span>Zyntra SDR Portal &copy; {new Date().getFullYear()}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span>Developed by</span>
        <a 
          href="https://www.linkedin.com/in/pratyushmalviy/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-brand hover:text-brand-alt hover:underline font-bold transition-all relative group"
        >
          Pratyush Malviya
        </a>
      </div>
    </div>
  </footer>
</div>

      {/* Bottom/Vertical Nav */}
      {activeView === 'OUTREACH' && activePanel !== -1 && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-auto md:right-8 md:top-1/2 md:bottom-auto md:-translate-y-1/2 z-50 transition-all duration-300 w-[95%] sm:w-auto md:w-auto">
          <div className="glass px-3 py-3 md:px-3 md:py-6 rounded-full md:rounded-3xl flex md:flex-col items-center justify-between md:justify-center gap-1.5 sm:gap-2 md:gap-4 shadow-2xl shadow-black/20 border border-border-subtle">
            {[
              { id: 0, label: 'Configure', icon: Settings },
              { id: 1, label: 'Import', icon: Users, badge: leads.length },
              { id: 2, label: 'Generate', icon: Zap },
              { id: 3, label: 'Review', icon: Eye, badge: Object.keys(messages).length },
              { id: 4, label: 'Export', icon: Download }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setActivePanel(p.id)}
                className={`relative flex items-center justify-center md:justify-start gap-3 px-3.5 sm:px-6 md:px-5 py-3 rounded-full md:rounded-2xl transition-all duration-500 group md:w-full min-w-[40px] md:min-w-[48px] ${
                  activePanel === p.id ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'text-text-muted hover:text-text hover:bg-bg-subtle'
                }`}
              >
                <p.icon className={`w-5 h-5 transition-transform duration-500 ${activePanel === p.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                {activePanel === p.id && (
                  <motion.span 
                    layoutId="nav-text"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    className="text-xs sm:text-sm font-syne font-bold overflow-hidden whitespace-nowrap"
                  >
                    {p.label}
                  </motion.span>
                )}
                {p.badge ? (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-alt text-black text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-bg shadow-lg">
                    {p.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* CRM OAuth / API Credentials Simulated Connection Modal */}
      <AnimatePresence>
        {showCrmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isConnectingCrm) setShowCrmModal(false); }}
              className="absolute inset-0 bg-[#040508]/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative max-w-md w-full bg-[#12131a] border border-white/[0.08] rounded-[32px] p-8 space-y-6 shadow-2xl overflow-hidden text-slate-100"
            >
              {/* Colored accent header depending on selection */}
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: crmPlatformToConnect === 'Salesforce' ? '#00a1e0' : '#ff7a59' }}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                    <Database className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Connect {crmPlatformToConnect}</h3>
                    <p className="text-[10px] text-slate-400 font-medium font-mono">OAuth 2.0 Secure Handshake</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCrmModal(false)}
                  disabled={isConnectingCrm}
                  className="p-1 rounded-lg hover:bg-white/5 cursor-pointer disabled:opacity-40"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00d4aa]">Instance Endpoint URL</label>
                  <input 
                    type="text" 
                    value={crmInstanceUrl}
                    onChange={(e) => setCrmInstanceUrl(e.target.value)}
                    placeholder={crmPlatformToConnect === 'Salesforce' ? 'https://na162.salesforce.com' : 'https://api.hubspot.com/v3'}
                    disabled={isConnectingCrm}
                    className="w-full px-4 py-3 bg-[#0a0b10] border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand"
                  />
                  <p className="text-[9px] text-slate-500 italic">Leave blank to route via public API gateways.</p>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#00d4aa]">Authorization Bearer Code</label>
                  <input 
                    type="password" 
                    value={crmAuthCode}
                    onChange={(e) => setCrmAuthCode(e.target.value)}
                    placeholder="Enter permanent private API secret verification token"
                    disabled={isConnectingCrm}
                    className="w-full px-4 py-3 bg-[#0a0b10] border border-white/[0.08] rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/[0.03] rounded-2xl text-[10px] text-slate-400 leading-relaxed flex items-start gap-2.5 text-left">
                  <ShieldCheck className="w-5 h-5 text-[#00d4aa] shrink-0" />
                  <span>
                    Your authorization credentials are encrypted and stored inside secure sandbox storage schemas aligned with modern TLS encryption guidelines.
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCrmModal(false)}
                  disabled={isConnectingCrm}
                  className="flex-1 py-3.5 bg-white/[0.04] border border-white/[0.05] hover:bg-white/5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleConnectCRM(crmPlatformToConnect)}
                  disabled={isConnectingCrm}
                  className="flex-1 py-3.5 bg-brand hover:opacity-90 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isConnectingCrm ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      <span>Connect Securely</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showSmartImportModal && (
          <SmartCsvImportModal 
            onClose={() => setShowSmartImportModal(false)}
            onImportComplete={handleSmartImportComplete}
            existingLeads={leads}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label, subLabel, isCollapsed }: { 
  active: boolean, 
  onClick: () => void, 
  icon: any, 
  label: string, 
  subLabel: string,
  isCollapsed?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 transition-all group cursor-pointer ${
        isCollapsed ? 'justify-center p-2' : 'p-3 rounded-2xl'
      } ${
        active 
          ? 'bg-brand text-white shadow-lg shadow-brand/20 rounded-2xl font-bold' 
          : 'text-text-muted hover:bg-bg-subtle hover:text-text rounded-2xl'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
        active ? 'bg-white/20' : 'bg-surface border border-border group-hover:border-border-subtle'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      {!isCollapsed && (
        <div className="text-left overflow-hidden block">
          <div className="text-sm font-bold truncate">{label}</div>
          <div className={`text-[9px] font-medium uppercase tracking-wider truncate ${active ? 'text-white/80' : 'text-text-muted'}`}>
            {subLabel}
          </div>
        </div>
      )}
    </button>
  );
}

function TeamAdminPanel({ profile }: { profile: UserProfile }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile.orgId) return;
    const q = query(collection(db, 'users'), where('orgId', '==', profile.orgId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return unsubscribe;
  }, [profile.orgId]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Team Administration</h1>
        <p className="text-text-muted text-xs md:text-sm">Manage your organization's users and permissions.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-3xl p-8 space-y-4">
          <div className="text-3xl font-syne font-bold text-brand">{users.length}</div>
          <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Total Members</div>
        </div>
        <div className="bg-surface border border-border rounded-3xl p-8 space-y-4">
          <div className="text-3xl font-syne font-bold text-brand-alt">Active</div>
          <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Subscription Status</div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-[40px] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-alt/50 border-b border-border">
              <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-text-muted">User</th>
              <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-text-muted">Role</th>
              <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</th>
              <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-text-muted text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(u => (
              <tr key={u.uid} className="hover:bg-bg-subtle transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <img src={u.photoURL} className="w-10 h-10 rounded-full border border-border" />
                    <div>
                      <div className="text-sm font-bold">{u.displayName}</div>
                      <div className="text-xs text-text-muted">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 rounded-full bg-surface-alt border border-border text-[10px] font-bold uppercase tracking-wider">
                    {(u.role || '').replace('_', ' ')}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-alt animate-pulse" />
                    <span className="text-xs font-medium">Active</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="text-[10px] font-bold text-brand hover:underline">Edit Role</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function CampaignDashboard({ campaigns, onCreate, onSelect, onDelete, onDownloadPDF }: { 
  campaigns: Campaign[], 
  onCreate: (name: string) => void, 
  onSelect: (c: Campaign) => void,
  onDelete: (id: string) => void,
  onDownloadPDF: (c: Campaign) => void
}) {
  const [newCampName, setNewCampName] = useState('');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-text-muted text-xs md:text-sm">Manage your outreach strategies.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input 
            className="bg-surface border border-border rounded-xl px-4 py-2 text-xs focus:border-brand outline-none w-full sm:w-56 min-w-0"
            placeholder="New Campaign Name"
            value={newCampName}
            onChange={e => setNewCampName(e.target.value)}
          />
          <button 
            onClick={() => { if(newCampName) { onCreate(newCampName); setNewCampName(''); } }}
            className="bg-brand text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-brand/90 transition-all shadow-md shadow-brand/10 w-full sm:w-auto cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Visual Showcase Banner */}
      <div className="grid md:grid-cols-12 gap-6 bg-surface border border-border rounded-3xl p-6 relative overflow-hidden glow-brand/5 items-center">
        {/* Background gradient blur */}
        <div className="absolute top-[-20%] right-[-10%] w-[35%] h-[60%] bg-brand/10 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Left column - Promo text */}
        <div className="md:col-span-8 space-y-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-brand/10 text-brand border border-brand/20 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-brand" />
            <span>Active Enterprise Workspace</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight">
              Scale Your Outreach with Precision GTM Analytics
            </h2>
            <p className="text-xs text-text-muted leading-relaxed max-w-xl">
              Zyntra AI synchronizes LinkedIn messaging and custom SMTP channels with automated Lead Intent Scoring. Maximize response rates by tracking high-fidelity prospect signals from decision makers.
            </p>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-mono">100%</span>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wide">AI Personalization</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-mono">65+ Benchmark</span>
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wide">Lead Quality Standard</span>
            </div>
          </div>
        </div>

        {/* Right column - Visual branding graphic */}
        <div className="md:col-span-4 relative flex justify-center w-full z-10">
          <div className="w-full h-32 relative rounded-2xl overflow-hidden border border-border/80 group">
            <img 
              src="https://picsum.photos/seed/cyber-enterprise/400/200" 
              alt="Zyntra Enterprise Hub" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            {/* Overlay Glass Panel */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent p-4 flex flex-col justify-end">
              <h4 className="text-xs font-bold text-white uppercase font-sans">Multi-Agent Lead Scorer</h4>
              <p className="text-[10px] text-brand font-medium">Model: Gemini 3.5 Flash</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4 opacity-40">
            <Target className="w-16 h-16 mx-auto" />
            <p className="font-syne font-bold">No campaigns yet. Create your first one above!</p>
          </div>
        )}
        {campaigns.map(c => (
          <motion.div 
            key={c.id}
            whileHover={{ y: -3 }}
            className="bg-surface border border-border rounded-2xl p-6 space-y-4 glow-brand/5 group cursor-pointer relative overflow-hidden"
            onClick={() => onSelect(c)}
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-20">
              <button 
                onClick={(e) => { e.stopPropagation(); onDownloadPDF(c); }}
                className="p-1.5 hover:bg-brand/10 text-text-muted hover:text-brand rounded-lg transition-colors cursor-pointer"
                title="Download Campaign PDF Report"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                className="p-1.5 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                title="Delete Campaign"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold group-hover:text-brand transition-colors">{c.name}</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Created {c.createdAt?.toDate().toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-bold">{c.leadsCount} Leads</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                c.status === 'active' ? 'bg-brand-alt/10 text-brand-alt' : 'bg-surface-alt text-text-muted'
              }`}>
                {c.status}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
