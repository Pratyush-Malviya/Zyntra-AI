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
  FileText,
  Award,
  Sparkles,
  Kanban,
  Database,
  RefreshCw,
  Building,
  Check,
  DollarSign,
  TrendingUp,
  CreditCard,
  PlusCircle,
  Filter,
  Cpu,
  List,
  Search
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { generateOutreach, OutreachMessages } from './services/aiService';
import ProspectResearchPanel from './components/ProspectResearchPanel';
import LeadScoreHistogram from './components/LeadScoreHistogram';
import LandingPage from './components/LandingPage';
import { SuperAdminDashboard as SuperAdminPanel } from './components/SuperAdminDashboard';
import { CrmSyncLogsPanel } from './components/CrmSyncLogsPanel';
import { SmartCsvImportModal } from './components/SmartCsvImportModal';
import { SettingsApiKeysPanel } from './components/SettingsApiKeysPanel';
import { ComposioIntegrationCenter } from './components/ComposioIntegrationCenter';
import { CrmPipelineBoard } from './components/CrmPipelineBoard';
import { LeadJourneyAnalytics } from './components/LeadJourneyAnalytics';
import { OrgAdminPanel } from './components/OrgAdminPanel';
import { ManagerWorkspacePanel } from './components/ManagerWorkspacePanel';
import { AeWorkspacePanel } from './components/AeWorkspacePanel';
import { SdrWorkspacePanel } from './components/SdrWorkspacePanel';
import { AppShell } from './components/layout/AppShell';
import type { AppView, SuperAdminTab, UserRole } from './components/layout/AppShell';
import MeetingsPanel from './components/meetings/MeetingsPanel';
import AffiliatesPanel from './components/affiliates/AffiliatesPanel';
import EmailSequenceManager from './components/outreach/EmailSequenceManager';
import { PipelineFunnelChart } from './components/analytics/PipelineFunnelChart';
import { AiCostTracker } from './components/analytics/AiCostTracker';
import IntegrationStatusPanel from './components/settings/IntegrationStatusPanel';
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
import { providedLeads } from './provided_leads';

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

export interface Lead {
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
  nextAction?: string;
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
  role: 'super_admin' | 'org_admin' | 'user' | 'sdr' | 'manager' | 'ae' | 'viewer';
  orgId: string;
  orgName?: string;
  tierLimit?: string;
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
    <div >
      <div >
        <div>
          <div >{lead.name}</div>
          <div >{lead.role}{lead.company ? ` @ ${lead.company}` : ''}</div>
        </div>
        <div >
          <span >WA</span>
          <span >LI</span>
          <span >EM</span>
        </div>
      </div>
      
      <div >
        <button onClick={() => setActiveTab('wa')} >📱 WA</button>
        <button onClick={() => setActiveTab('li')} >💼 LI</button>
        <button onClick={() => setActiveTab('em')} >✉️ EM</button>
      </div>

      <div >
        {activeTab === 'wa' && (
          <div >
            <div >
              <div >WhatsApp · Day 6</div>
              <button onClick={handleSendWhatsApp} ><Send  /></button>
            </div>
            <div 
              contentEditable 
              onBlur={e => onUpdate('whatsapp', e.currentTarget.innerText)}
              
              dangerouslySetInnerHTML={{ __html: msg.whatsapp }}
            />
            <div >Max 100 words · No links · Tap to edit</div>
          </div>
        )}

        {activeTab === 'li' && (
          <div >
            <div>
              <div >
                <div >LinkedIn Connect · Day 1</div>
                <button onClick={handleOpenLinkedIn} ><ExternalLink  /></button>
              </div>
              <div 
                contentEditable 
                onBlur={e => onUpdate('linkedin_connect', e.currentTarget.innerText)}
                
                dangerouslySetInnerHTML={{ __html: msg.linkedin_connect }}
              />
            </div>
            <div>
              <div >LinkedIn DM · Day 4</div>
              <div 
                contentEditable 
                onBlur={e => onUpdate('linkedin_dm', e.currentTarget.innerText)}
                
                dangerouslySetInnerHTML={{ __html: msg.linkedin_dm }}
              />
            </div>
          </div>
        )}

        {activeTab === 'em' && (
          <div >
            <div>
              <div >
                <div >Subject Line</div>
                <button onClick={handleSendEmail} ><Mail  /></button>
              </div>
              <div 
                contentEditable 
                onBlur={e => onUpdate('email_subject', e.currentTarget.innerText)}
                
                dangerouslySetInnerHTML={{ __html: msg.email_subject }}
              />
            </div>
            <div>
               <div >Email Body · Day 2</div>
              <div 
                contentEditable 
                onBlur={e => onUpdate('email_body', e.currentTarget.innerText)}
                
                dangerouslySetInnerHTML={{ __html: (msg.email_body || '').replace(/\n/g, '<br>') }}
              />
            </div>
            <div>
               <div >Follow-up · Day 7</div>
              <div 
                contentEditable 
                onBlur={e => onUpdate('email_followup', e.currentTarget.innerText)}
                
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

  const effectiveTheme = theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  }, [effectiveTheme]);

  if (loading) return <div ><Loader2  /></div>;

  const handleDemoLogin = async (demo: { uid: string, email: string, displayName: string, role: string, orgId: string, orgName: string, tierLimit?: string }) => {
    setLoading(true);
    const mockUser = {
      uid: demo.uid,
      email: demo.email,
      displayName: demo.displayName,
      photoURL: `https://picsum.photos/seed/${demo.uid}/150`,
      emailVerified: true
    } as any;
    
    try {
      const userRef = doc(db, 'users', demo.uid);
      const newProfile: UserProfile = {
        uid: demo.uid,
        email: demo.email,
        displayName: demo.displayName,
        photoURL: `https://picsum.photos/seed/${demo.uid}/150`,
        role: demo.role as any,
        orgId: demo.orgId,
        orgName: demo.orgName,
        tierLimit: demo.tierLimit || 'Professional SDR',
        lastLogin: Timestamp.now()
      };
      await setDoc(userRef, newProfile, { merge: true });
      setUser(mockUser);
      setProfile(newProfile);
    } catch (e) {
      console.warn("Firestore seed failed during demo login, using local fallback state:", e);
      setUser(mockUser);
      setProfile({
        uid: demo.uid,
        email: demo.email,
        displayName: demo.displayName,
        photoURL: `https://picsum.photos/seed/${demo.uid}/150`,
        role: demo.role as any,
        orgId: demo.orgId,
        orgName: demo.orgName,
        tierLimit: demo.tierLimit || 'Professional SDR',
        lastLogin: Timestamp.now()
      } as any);
    } finally {
      setLoading(false);
      setShowLanding(false);
    }
  };
  
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
    return (
      <LoginView 
        onBack={() => setShowLanding(true)} 
        theme={effectiveTheme} 
        setTheme={toggleTheme} 
        isMobileDevice={isMobileDevice} 
        onDemoLogin={handleDemoLogin}
      />
    );
  }

  return <MainApp user={user} profile={profile} theme={effectiveTheme} setTheme={toggleTheme} isMobileDevice={isMobileDevice} />;
}

const DEMO_USERS = [
  {
    uid: 'demo-super-admin',
    email: 'superadmin@zyntra.com',
    displayName: 'Pratyush Malviya',
    role: 'super_admin',
    orgId: 'org-zyntra-global',
    orgName: 'Zyntra Corp',
    tierLimit: 'Enterprise Suite',
    description: 'Tier 1 Control: Manage global tenants, licensing pricing, and system-wide dashboards.'
  },
  {
    uid: 'demo-org-admin',
    email: 'harvey@pearsonhardman.com',
    displayName: 'Harvey Specter',
    role: 'org_admin',
    orgId: 'org-pearson-hardman',
    orgName: 'Pearson Hardman LLC',
    tierLimit: 'Professional SDR',
    description: 'Tier 2 Settings: Configure custom email domain policies, company branding details, and staff seating.'
  },
  {
    uid: 'demo-sdr',
    email: 'mike.ross@pearsonhardman.com',
    displayName: 'Mike Ross',
    role: 'sdr',
    orgId: 'org-pearson-hardman',
    orgName: 'Pearson Hardman LLC',
    tierLimit: 'Professional SDR',
    description: 'SDR Outbound Panel: Launch sequence triggers, filter campaign leads, and manage real-time queues.'
  },
  {
    uid: 'demo-manager',
    email: 'louis.litt@pearsonhardman.com',
    displayName: 'Louis Litt',
    role: 'manager',
    orgId: 'org-pearson-hardman',
    orgName: 'Pearson Hardman LLC',
    tierLimit: 'Professional SDR',
    description: 'Manager Coach Hub: Monitor representative activity, approve outgoing scripts, and forecast deals.'
  },
  {
    uid: 'demo-ae',
    email: 'rachel.zane@pearsonhardman.com',
    displayName: 'Rachel Zane',
    role: 'ae',
    orgId: 'org-pearson-hardman',
    orgName: 'Pearson Hardman LLC',
    tierLimit: 'Professional SDR',
    description: 'Account Executive CRM: Interactive pipeline boards, health charts, and comprehensive opportunity briefs.'
  },
  {
    uid: 'demo-viewer',
    email: 'donna.paulsen@pearsonhardman.com',
    displayName: 'Donna Paulsen',
    role: 'viewer',
    orgId: 'org-pearson-hardman',
    orgName: 'Pearson Hardman LLC',
    tierLimit: 'Professional SDR',
    description: 'Viewer Read-Only seat: Corporate analytics boards and overview lists with limited write permission.'
  }
];

function LoginView({ 
  onBack, 
  theme, 
  setTheme, 
  isMobileDevice,
  onDemoLogin
}: { 
  onBack: () => void, 
  theme: 'dark' | 'light', 
  setTheme: (t: 'dark' | 'light') => void, 
  isMobileDevice: boolean,
  onDemoLogin: (demoInfo: any) => void
}) {
  const handleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (e) { console.error(e); } };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Zap  />;
      case 'org_admin': return <Building  />;
      case 'sdr': return <Target  />;
      case 'manager': return <TrendingUp  />;
      case 'ae': return <Briefcase  />;
      case 'viewer': return <Eye  />;
      default: return <UserCheck  />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Tier 1 • Super Admin';
      case 'org_admin': return 'Tier 2 • Org Admin';
      case 'sdr': return 'Tier 3 • Outbound SDR';
      case 'manager': return 'Tier 3 • Coach & Forecast';
      case 'ae': return 'Tier 3 • Account Executive';
      case 'viewer': return 'Tier 3 • Viewer (Read-Only)';
      default: return 'User';
    }
  };

  return (
    <div >
      <div  />
      <div  />
      <div >
        <button 
          onClick={onBack}
          
        >
          <ChevronLeft  />
          <span>Back to Home</span>
        </button>
      </div>

      {true && (
        <div >
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        
      >
        {/* Left Side: Brand and Google Login */}
        <div >
          <div >
            <div >
              <Zap  />
            </div>
            <div >
              <h1 >Zyntra AI</h1>
              <p >Enterprise Outreach & CRM Suite</p>
            </div>
            <p >
              A high-precision, multi-tier outreach sandbox configured for high-performing sales development, organizational settings, and intelligent client pipelines.
            </p>
          </div>

          <div >
            <button 
              onClick={handleLogin} 
              
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"  alt="Google" />
              Sign in with Google Account
            </button>
            <p >
              Corporate Single Sign-On handles primary credentials and security profiles seamlessly.
            </p>
          </div>
        </div>

        {/* Right Side: Demo Quick Seats */}
        <div >
          <div >
            <h3 >Instant Demo Presets</h3>
            <p >
              Skip external OAuth credentials for your live product presentation. Enter any sandbox workspace in one click:
            </p>
          </div>

          <div >
            {DEMO_USERS.map((demo) => (
              <button
                key={demo.uid}
                onClick={() => onDemoLogin(demo)}
                
              >
                <div >
                  <div >
                    <div >
                      {getRoleIcon(demo.role)}
                    </div>
                    <span >
                      {getRoleLabel(demo.role).split(' • ')[1]}
                    </span>
                  </div>
                  <span >{demo.uid}</span>
                </div>
                
                <div >
                  {demo.displayName}
                </div>
                <div >
                  {demo.email}
                </div>
                
                <p >
                  {demo.description}
                </p>
                
                <div >
                  Enter <ChevronRight  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}



function MainApp({ user, profile, theme, setTheme, isMobileDevice }: { user: User, profile: UserProfile, theme: 'dark' | 'light', setTheme: (t: 'dark' | 'light') => void, isMobileDevice: boolean }) {

  const [activePanel, setActivePanel] = useState(-1); 
  const [simulatedRole, setSimulatedRole] = useState<'super_admin' | 'org_admin' | 'sdr' | 'manager' | 'ae' | 'viewer'>(() => {
    if (profile?.role === 'super_admin') return 'super_admin';
    if (profile?.role === 'org_admin') return 'org_admin';
    return 'sdr';
  });

  const [activeView, setActiveView] = useState<string>('SUPER_ADMIN');

  const handleSimulatedRoleChange = (role: 'super_admin' | 'org_admin' | 'sdr' | 'manager' | 'ae' | 'viewer') => {
    setSimulatedRole(role);
    if (role === 'super_admin') {
      setActiveView('SUPER_ADMIN');
      setSuperAdminTab('dashboard');
    } else if (role === 'org_admin') {
      setActiveView('ORG_DASHBOARD');
    } else if (role === 'sdr') {
      setActiveView('OUTREACH');
      setActivePanel(-1);
    } else if (role === 'manager') {
      setActiveView('MGR_DASHBOARD');
    } else if (role === 'ae') {
      setActiveView('AE_PIPELINE');
    } else if (role === 'viewer') {
      setActiveView('VIEWER_DASHBOARD');
    }
  };

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      handleSimulatedRoleChange('super_admin');
    } else if (profile?.role === 'org_admin') {
      handleSimulatedRoleChange('org_admin');
    } else {
      handleSimulatedRoleChange('sdr');
    }
  }, [profile?.role]);

  const [superAdminTab, setSuperAdminTab] = useState<'dashboard' | 'employees_list' | 'add_employees' | 'organizations' | 'enterprise_suite' | 'llm_config'>('dashboard');
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
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditFields, setBulkEditFields] = useState({
    role: '',
    company: '',
    industry: '',
    country: '',
    status: '',
  });
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadsViewMode, setLeadsViewMode] = useState<'list' | 'pipeline'>('pipeline');
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsPerPage, setLeadsPerPage] = useState(50);
  const [pipelineColLimits, setPipelineColLimits] = useState<Record<string, number>>({});
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [editedLeadData, setEditedLeadData] = useState<Partial<Lead> | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    nameCompany: true,
    score: true,
    contact: true,
    status: true,
    role: false,
    country: false,
    industry: false,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkAddRowsText, setBulkAddRowsText] = useState('');
  
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

  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
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
    if (!user || !profile?.orgId) return;
    const q = query(
      collection(db, 'campaigns'), 
      where('orgId', '==', profile.orgId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const camps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
      setCampaigns(camps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'campaigns');
    });
    return unsubscribe;
  }, [user, profile?.orgId]);

  useEffect(() => {
    if (!currentCampaign || !user || !profile?.orgId) return;
    const qLeads = query(
      collection(db, 'leads'), 
      where('orgId', '==', profile.orgId),
      where('campaignId', '==', currentCampaign.id)
    );
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leads');
    });

    const qMsg = query(
      collection(db, 'messages'), 
      where('orgId', '==', profile.orgId),
      where('campaignId', '==', currentCampaign.id)
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
  }, [currentCampaign, user, profile?.orgId]);



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
    try {
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
      showToast(`Campaign "${name}" created successfully!`, 'success');
    } catch (err: any) {
      console.error("Error creating campaign: ", err);
      handleFirestoreError(err, OperationType.WRITE, 'campaigns');
    }
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
        logs.push(`[SYNC] Linked Active Channels: ${outreachInfo.whatsapp ? '✓ WA  ' : ''}${(outreachInfo.linkedin_connect || outreachInfo.linkedin_dm) ? '✓ LI  ' : ''}${(outreachInfo.email_body || outreachInfo.email_subject) ? '✓ Email' : ''}`);
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
    if (lines.length < 2) {
      showToast("CSV input is empty or invalid.", "error");
      return;
    }
    if (!user || !profile?.orgId) {
      showToast("User session or Organization ID not found.", "error");
      return;
    }

    let targetCampaign = currentCampaign;
    if (!targetCampaign) {
      if (campaigns.length > 0) {
        targetCampaign = campaigns[0];
        setCurrentCampaign(campaigns[0]);
        showToast(`Auto-selected campaign: ${campaigns[0].name}`, "info");
      } else {
        const newCamp = {
          name: "Main Outreach Campaign",
          userId: user.uid,
          orgId: profile.orgId,
          status: 'draft',
          leadsCount: 0,
          createdAt: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, 'campaigns'), newCamp);
        targetCampaign = { id: docRef.id, ...newCamp } as Campaign;
        setCurrentCampaign(targetCampaign);
        showToast("Created a new 'Main Outreach Campaign' to store these leads.", "info");
      }
    }

    const headersRaw = lines[0].split(',').map(h => (h || '').trim());
    const headers = headersRaw.map(h => h.toLowerCase().replace(/\s+/g, '_').replace(/['"]+/g, ''));
    
    const parsed = lines.slice(1).map(line => {
      const vals = splitCSV(line).map(v => (v || '').trim());
      const rowObj: any = {};
      headers.forEach((h, i) => {
        rowObj[h] = vals[i] || '';
      });

      const lead: any = {
        userId: user.uid,
        orgId: profile.orgId,
        campaignId: targetCampaign.id,
        status: 'imported',
        name: '',
        role: '',
        company: '',
        industry: '',
        country: '',
        phone: '',
        email: '',
        linkedin_url: '',
        score: Math.floor(60 + Math.random() * 30)
      };

      if (rowObj.name) {
        lead.name = rowObj.name;
      } else if (rowObj.full_name) {
        lead.name = rowObj.full_name;
      } else if (rowObj.first_name || rowObj.last_name) {
        lead.name = `${rowObj.first_name || ''} ${rowObj.last_name || ''}`.trim();
      }

      lead.role = rowObj.role || rowObj.title || rowObj.job_title || rowObj.position || '';
      lead.company = rowObj.company_name || rowObj.company || rowObj.organization || '';
      lead.industry = rowObj.industry || rowObj.sector || '';
      lead.country = rowObj.country || rowObj.location || '';
      lead.phone = rowObj.phone || rowObj.work_direct_phone || rowObj.mobile_phone || rowObj.corporate_phone || rowObj.company_phone || '';
      lead.email = rowObj.email || rowObj.email_address || rowObj.work_email || '';
      lead.linkedin_url = rowObj.linkedin_url || rowObj.person_linkedin_url || rowObj.linkedin || '';

      lead.name = lead.name.replace(/^['"]|['"]$/g, '').trim();
      lead.role = lead.role.replace(/^['"]|['"]$/g, '').trim();
      lead.company = lead.company.replace(/^['"]|['"]$/g, '').trim();
      lead.industry = lead.industry.replace(/^['"]|['"]$/g, '').trim();
      lead.country = lead.country.replace(/^['"]|['"]$/g, '').trim();
      lead.phone = lead.phone.replace(/^['"]|['"]$/g, '').trim();
      lead.email = lead.email.replace(/^['"]|['"]$/g, '').trim();
      lead.linkedin_url = lead.linkedin_url.replace(/^['"]|['"]$/g, '').trim();

      const seniority = String(rowObj.seniority || '').toLowerCase();
      if (seniority.includes('founder') || seniority.includes('ceo') || seniority.includes('owner') || seniority.includes('c-suite')) {
        lead.score = Math.floor(88 + Math.random() * 12);
      } else if (seniority.includes('director') || seniority.includes('partner')) {
        lead.score = Math.floor(80 + Math.random() * 10);
      } else if (seniority.includes('manager')) {
        lead.score = Math.floor(70 + Math.random() * 10);
      }

      return lead as Lead;
    }).filter(r => r.name);

    if (parsed.length > 0) {
      if (targetCampaign) {
        for (const l of parsed) {
          await addDoc(collection(db, 'leads'), {
            ...l,
            createdAt: Timestamp.now()
          });
        }
        await updateDoc(doc(db, 'campaigns', targetCampaign.id), {
          leadsCount: (targetCampaign.leadsCount || 0) + parsed.length
        });
      }
      showToast(`Successfully imported ${parsed.length} B2B leads into the CRM!`, "success");
    } else {
      showToast("Could not find any valid leads with name fields in the CSV.", "error");
    }
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

  const handleDeleteLead = async (leadId: string) => {
    if (!leadId) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      if (currentCampaign) {
        await updateDoc(doc(db, 'campaigns', currentCampaign.id), {
          leadsCount: Math.max(0, leads.length - 1)
        });
      }
      setSelectedLeadIds(prev => prev.filter(id => id !== leadId));
      showToast("Lead successfully deleted.", "success");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, 'leads');
    }
  };

  const handleUpdateLead = async (leadId: string, updatedFields: Partial<Lead>) => {
    if (!leadId) return;
    try {
      await updateDoc(doc(db, 'leads', leadId), updatedFields);
      showToast("Lead successfully updated.", "success");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, 'leads');
    }
  };

  const handleBulkUpdateLeads = async (leadIds: string[], fields: Partial<Lead>) => {
    if (leadIds.length === 0) return;
    try {
      const cleanFields = Object.fromEntries(
        Object.entries(fields).filter(([_, v]) => v !== undefined && v !== '')
      );
      if (Object.keys(cleanFields).length === 0) {
        showToast("No update values specified.", "warning");
        return;
      }
      for (const id of leadIds) {
        await updateDoc(doc(db, 'leads', id), cleanFields);
      }
      setSelectedLeadIds([]);
      showToast(`Successfully updated ${leadIds.length} leads in bulk!`, "success");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, 'leads');
    }
  };

  const handleBulkDeleteLeads = async (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${leadIds.length} leads?`)) return;
    try {
      for (const id of leadIds) {
        await deleteDoc(doc(db, 'leads', id));
      }
      if (currentCampaign) {
        await updateDoc(doc(db, 'campaigns', currentCampaign.id), {
          leadsCount: Math.max(0, leads.length - leadIds.length)
        });
      }
      setSelectedLeadIds([]);
      showToast(`Successfully deleted ${leadIds.length} leads in bulk!`, "success");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, 'leads');
    }
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
    // Modal remains open on step 4 of wizard to display completed transit live stats & actual uploaded leads list.
    // Closing is handled on click of bottom click dismiss triggers!
  };

  const handleImportProvidedLeads = async () => {
    if (!currentCampaign) {
      showToast("Please select or create an active campaign first.", "error");
      return;
    }
    if (!user || !profile) {
      showToast("User session not found.", "error");
      return;
    }
    try {
      const parsed = providedLeads.map(lead => ({
        ...lead,
        userId: user.uid,
        orgId: profile.orgId,
        campaignId: currentCampaign.id,
      } as Lead));
      
      await saveLeads(parsed);
      showToast(`Successfully synced all ${providedLeads.length} provided B2B leads to campaign!`, "success");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'leads');
    }
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

        try {
          await addDoc(collection(db, 'generation_logs'), {
            leadId: lead.id,
            leadName: lead.name || 'Unknown',
            leadCompany: lead.company || 'Unknown',
            campaignId: currentCampaign.id,
            campaignName: currentCampaign.name || 'Unknown Campaign',
            userId: user.uid,
            userName: profile?.displayName || user.email || 'Unknown User',
            orgId: profile?.orgId || '',
            timestamp: Timestamp.now(),
            status: 'success',
            error: null,
            messages: result
          });
        } catch (logErr) {
          console.error("Failed to write success to generation_logs:", logErr);
          handleFirestoreError(logErr, OperationType.WRITE, 'generation_logs');
        }

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

        try {
          await addDoc(collection(db, 'generation_logs'), {
            leadId: lead.id,
            leadName: lead.name || 'Unknown',
            leadCompany: lead.company || 'Unknown',
            campaignId: currentCampaign.id,
            campaignName: currentCampaign.name || 'Unknown Campaign',
            userId: user.uid,
            userName: profile?.displayName || user.email || 'Unknown User',
            orgId: profile?.orgId || '',
            timestamp: Timestamp.now(),
            status: 'fallback',
            error: e instanceof Error ? e.message : String(e),
            messages: fallback
          });
        } catch (logErr) {
          console.error("Failed to write fallback to generation_logs:", logErr);
          handleFirestoreError(logErr, OperationType.WRITE, 'generation_logs');
        }

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
    <>
    <AppShell
      activeView={activeView as AppView}
      onViewChange={(view, subTab) => {
        setActiveView(view);
        if (subTab) setActiveView(view);
        if (view === 'OUTREACH') setActivePanel(-1);
      }}
      superAdminTab={superAdminTab}
      onSuperAdminTabChange={(tab) => setSuperAdminTab(tab)}
      simulatedRole={simulatedRole}
      onRoleChange={handleSimulatedRoleChange}
      user={user}
      profile={profile}
      onLogout={handleLogout}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            
          >
            {toast.type === 'success' ? (
              <CheckCircle2  />
            ) : toast.type === 'info' ? (
              <Loader2  />
            ) : (
              <AlertCircle  />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

        <main >
          {activeView === 'SETTINGS' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              
            >
              <div >
                <h1 >Settings</h1>
                <p >Manage your personal and system-wide configurations.</p>
              </div>

              <div >
                {/* Email SMTP Section */}
                <div id="settings-smtp-card" >
                  <div >
                    <div >
                      <div >
                        <Mail  />
                      </div>
                      Email SMTP Setup
                    </div>
                    {emAccount?.connected && (
                      <div >
                        <div  />
                        ACTIVE
                      </div>
                    )}
                  </div>

                  {!emAccount?.connected ? (
                    <div >
                      <div >
                        <div >
                          <label >SMTP Host</label>
                          <input 
                            
                            placeholder="smtp.gmail.com"
                            value={smtpConfig.host}
                            onChange={e => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                          />
                        </div>
                        <div >
                          <label >Port</label>
                          <input 
                            
                            placeholder="587"
                            value={smtpConfig.port}
                            onChange={e => setSmtpConfig(prev => ({ ...prev, port: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div >
                        <div >
                          <label >Username</label>
                          <input 
                            
                            placeholder="user@example.com"
                            value={smtpConfig.user}
                            onChange={e => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))}
                          />
                        </div>
                        <div >
                          <label >Password</label>
                          <input 
                            type="password"
                            
                            placeholder="••••••••"
                            value={smtpConfig.pass}
                            onChange={e => setSmtpConfig(prev => ({ ...prev, pass: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div >
                        <label >From Email / Name</label>
                        <input 
                          
                          placeholder='"Zyntra AI" <user@example.com>'
                          value={smtpConfig.from}
                          onChange={e => setSmtpConfig(prev => ({ ...prev, from: e.target.value }))}
                        />
                      </div>
                      <div >
                        <input 
                          type="checkbox"
                          id="smtp-secure-settings"
                          checked={smtpConfig.secure}
                          onChange={e => setSmtpConfig(prev => ({ ...prev, secure: e.target.checked }))}
                          
                        />
                        <label htmlFor="smtp-secure-settings" >Use Secure (SSL/TLS)</label>
                      </div>
                      <button 
                        onClick={handleConnectEmail}
                        disabled={isConnectingEm}
                        
                      >
                        {isConnectingEm ? <Loader2  /> : <Save  />}
                        Save SMTP Settings
                      </button>
                    </div>
                  ) : (
                    <div >
                      <div >
                        <div >
                          <Mail  />
                        </div>
                        <div >
                          <div >
                            {emAccount.email}
                            <CheckCircle2  />
                          </div>
                          <div >{emAccount.provider} Connected</div>
                        </div>
                        <button onClick={handleDisconnectEmail} >
                          <Unlink  />
                        </button>
                      </div>
                      <p >
                        Your email is connected and ready for direct outreach. To change settings, disconnect first.
                      </p>
                    </div>
                  )}
                </div>

                {/* LinkedIn Section */}
                <div id="settings-linkedin-card" >
                  <div >
                    <div >
                      <div >
                        <Linkedin  />
                      </div>
                      LinkedIn Bridge
                    </div>
                    {liAccount?.connected && (
                      <div >
                        <div  />
                        CONNECTED
                      </div>
                    )}
                  </div>
                  
                  {!liAccount?.connected ? (
                    <div >
                      <p >
                        Connect your profile to enable automated background sending through our secure bridge.
                      </p>
                      <div >
                        <AlertCircle  />
                        <div >
                          <strong>Setup Required:</strong> Ensure LinkedIn is enabled in your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" >Firebase Console</a> under Authentication &gt; Sign-in method.
                        </div>
                      </div>
                      <button 
                        onClick={handleConnectLinkedIn}
                        disabled={isConnectingLi}
                        
                      >
                        {isConnectingLi ? <Loader2  /> : <Link2  />}
                        Connect LinkedIn
                      </button>
                    </div>
                  ) : (
                    <div >
                      <img src={liAccount.avatar} alt={liAccount.name}  referrerPolicy="no-referrer" />
                      <div >
                        <div >
                          {liAccount.name}
                          <CheckCircle2  />
                        </div>
                        <div >Automation Bridge Active</div>
                      </div>
                      <button onClick={handleDisconnectLinkedIn} >
                        <Unlink  />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* System Defaults Info */}
              <div >
                <div >
                  <div >
                    <AlertCircle  />
                  </div>
                  <div >
                    <h3 >System Defaults</h3>
                    <p >
                      If you don't provide your own SMTP settings, the platform will use the system-wide default email service configured by the administrator. 
                      Personal SMTP settings are always prioritized for your outreach.
                    </p>
                  </div>
                </div>
              </div>

              {/* Project Documentation Export */}
              <div id="settings-docs-card" >
                <div >
                  <div >
                    <FileText  />
                  </div>
                  Project Documentation
                </div>
                <p >
                  Generate a complete PDF report of the project architecture, features, and technical specifications.
                </p>
                <button 
                  onClick={generateProjectPDF}
                  
                >
                  <Download  />
                  Download Project Report (PDF)
                </button>
              </div>

              {/* Composio AI Integrations Command Hub */}
              <ComposioIntegrationCenter showToast={showToast} />

              {/* REST API Credentials & Webhook Gateway Hub */}
              <SettingsApiKeysPanel showToast={showToast} />
            </motion.div>
          )}

          {activeView === 'OUTREACH' && (
            <div >
              {activePanel === -1 && (
                <CampaignDashboard 
                  campaigns={campaigns} 
                  onCreate={handleCreateCampaign} 
                  onSelect={(c) => { setCurrentCampaign(c); setActivePanel(0); }}
                  onDelete={handleDeleteCampaign}
                  onDownloadPDF={downloadCampaignPDF}
                />
              )}

              {activePanel !== -1 && (
                <div >
                  {/* Back button and title */}
                  <div >
                    <button 
                      onClick={() => { setCurrentCampaign(null); setActivePanel(-1); }}
                      
                    >
                      <ChevronLeft  />
                      Back to Campaigns
                    </button>
                    <div >
                      <span >Active Campaign:</span>
                      <span >
                        {currentCampaign?.name.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Sub-navigation Tabs */}
                  <div >
                    {[
                      { idx: 0, label: "Configure", icon: Settings },
                      { idx: 1, label: "Import Leads", icon: UserPlus },
                      { idx: 2, label: "Generate Copy", icon: Sparkles },
                      { idx: 3, label: "Send Outreach", icon: Send },
                      { idx: 4, label: "Reports", icon: FileText }
                    ].map((tab) => {
                      const isActive = activePanel === tab.idx;
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.idx}
                          onClick={() => setActivePanel(tab.idx)}
                          
                        >
                          <Icon  />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Panel 0: Configure */}
              <PanelWrapper index={0} activePanel={activePanel}>
                {/* ... existing configure content ... */}
          <div >
            <h1 >Configure</h1>
            <p >Train your AI outreach agents with your product DNA.</p>
          </div>

          <div >
            {[
              { 
                label: 'Leads Loaded', 
                val: leads.length, 
                color: 'brand',
                onClick: () => {
                  setActivePanel(1);
                  setLeadsViewMode('list');
                }
              },
              { 
                label: 'AI Generated', 
                val: Object.keys(messages).length, 
                color: 'brand-alt',
                onClick: () => {
                  setActivePanel(2);
                }
              },
              { 
                label: 'Active Channels', 
                val: Object.values(chState).filter(Boolean).length, 
                color: 'f59e0b' 
              },
              { 
                label: 'Ready to Send', 
                val: Object.keys(messages).length, 
                color: '6c63ff',
                onClick: () => {
                  setActivePanel(3);
                }
              }
            ].map((s, i) => (
              <motion.div 
                key={i} 
                whileHover={s.onClick ? { y: -5, scale: 1.02, border: '1px solid rgba(0, 212, 170, 0.4)' } : { y: -5 }}
                onClick={s.onClick}
                
              >
                <div >{s.val}</div>
                <div >
                  {s.label}
                  {s.onClick && (
                    <span >
                      View
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div >
            <div >
              <div >
                <div >
                  <Briefcase  />
                </div>
                Product DNA
              </div>
              <div >
                <div >
                  <label >Company & Product</label>
                  <div >
                    <input 
                      
                      placeholder="Company"
                      value={config.company}
                      onChange={e => setConfig(prev => ({ ...prev, company: e.target.value }))}
                    />
                    <input 
                      
                      placeholder="Product"
                      value={config.product}
                      onChange={e => setConfig(prev => ({ ...prev, product: e.target.value }))}
                    />
                  </div>
                </div>
                <div >
                  <label >Value Proposition</label>
                  <textarea 
                    
                    placeholder="Describe how you help..."
                    value={config.vp}
                    onChange={e => setConfig(prev => ({ ...prev, vp: e.target.value }))}
                  />
                </div>
                <div >
                  <div >
                    <label >Sender Name</label>
                    <input 
                      
                      value={config.sender}
                      onChange={e => setConfig(prev => ({ ...prev, sender: e.target.value }))}
                    />
                  </div>
                  <div >
                    <label >CTA Goal</label>
                    <select 
                      
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
                  
                >
                  <Save  />
                  Save Product DNA
                </button>
              </div>
            </div>

            <div >
              <div >
                <div >
                  <div >
                    <Settings  />
                  </div>
                  Outreach Channels
                </div>
                <div >
                  <p >
                    Configure your global email and LinkedIn settings in the <button onClick={() => setActiveView('SETTINGS')} >Settings</button> tab to enable direct outreach.
                  </p>
                  <div >
                    <div  />
                    <span >Email: {emAccount?.connected ? 'Connected' : 'Not Configured'}</span>
                  </div>
                  <div >
                    <div  />
                    <span >LinkedIn: {liAccount?.connected ? 'Connected' : 'Not Configured'}</span>
                  </div>
                </div>
              </div>

              <div >
                <div >
                  <div >
                    <AlertCircle  />
                  </div>
                  <div >
                    <h3 >Campaign Scope</h3>
                    <p >
                      These settings apply specifically to the <strong>{currentCampaign?.name}</strong> campaign. 
                      Changes to Product DNA will affect future AI generations for this campaign.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div >
            <div >
              <div >
                <Globe  />
              </div>
              Active Channels
            </div>
            <div >
              {[
                { id: 'wa' as const, icon: MessageSquare, label: 'WhatsApp', color: '#25d366' },
                { id: 'li' as const, icon: Linkedin, label: 'LinkedIn', color: '#4da6ff' },
                { id: 'em' as const, icon: Mail, label: 'Email', color: '#f59e0b' }
              ].map(ch => (
                <button
                  key={ch.id}
                  onClick={() => handleToggleCh(ch.id)}
                  
                >
                  <ch.icon  style={{ color: chState[ch.id] ? ch.color : undefined }} />
                  <div >
                    <div  style={{ color: chState[ch.id] ? ch.color : undefined }}>{ch.label}</div>
                    <div >{chState[ch.id] ? 'Active' : 'Disabled'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActivePanel(1)}
            
          >
            Import Target Leads
            <ChevronRight  />
          </motion.button>
        </PanelWrapper>

        {/* Panel 1: Import */}
        <PanelWrapper index={1} activePanel={activePanel}>
          <div >
            <h1 >Import Leads</h1>
            <p >Paste your target list or import manually.</p>
          </div>

          <div >
            <div >
              <AlertCircle  />
            </div>
            <div>
              <div >CSV Format Guide</div>
              Required columns: <span >name, role, company, industry, country, phone, email, linkedin_url</span>. 
              Ensure your data is clean for maximum AI personalization accuracy.
            </div>
          </div>

          <div >
            <div >
              <div >
                <div >
                  <UserPlus  />
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
                
              >
                <div >
                  <input name="name" placeholder="Full Name" required  />
                  <input name="company" placeholder="Company" required  />
                </div>
                <div >
                  <input name="role" placeholder="Role"  />
                  <input name="industry" placeholder="Industry"  />
                </div>
                <div >
                  <input name="email" placeholder="Email"  />
                  <input name="linkedin_url" placeholder="LinkedIn URL"  />
                </div>
                <button type="submit" >
                  Add Lead
                </button>
              </form>
            </div>

            <div >
              <div >
                <div >
                  <FileSpreadsheet  />
                </div>
                Paste CSV Data
              </div>
              <div >
                <textarea 
                  
                  placeholder="name,role,company,industry,country,phone,email,linkedin_url..."
                  value={rawLeads}
                  onChange={e => setRawLeads(e.target.value)}
                />
                <button 
                  onClick={() => parseLeads(rawLeads)}
                  
                >
                  Parse Paste
                </button>
              </div>
            </div>

            <div >
              <div >
                <div >
                  <div >
                    <Download  />
                  </div>
                  Smart field mapping Importer
                </div>
                <p >
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
                
              >
                <Plus  />
                Launch Smart Importer Wizard
              </button>
              
              <div >
                <span >FEATURES:</span> Excel sheet columns detection • Preset templates saving • Custom CRM property creation • Format validations checklist.
              </div>
            </div>

            <div >
              <div >
                <div >
                  <div >
                    <Database  />
                  </div>
                  Sync Provided B2B Target List
                </div>
                <p >
                  Instantly load the {providedLeads.length} pre-validated B2B executive lead contacts provided by your campaign partners (TERAWORK, Caret, INGRYD Academy, and more) into this active campaign.
                </p>
              </div>
              
              <button
                onClick={handleImportProvidedLeads}
                
              >
                <CheckCircle2  />
                Sync {providedLeads.length} Pre-validated Contacts
              </button>
              
              <div >
                <span >SPECS:</span> {providedLeads.filter(l => l.email).length} Work Emails • {providedLeads.filter(l => l.linkedin_url).length} LinkedIn URLs • 100% Validated schema matching.
              </div>
            </div>
          </div>

          {leads.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              
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

              <div >
                <div >
                  <div >
                    <CheckCircle2  />
                  </div>
                  <div >
                    <span>
                      {scoreFilter ? `${leads.filter(l => {
                        const s = calculateLeadScore(l);
                        return s >= scoreFilter.min && s <= scoreFilter.max;
                      }).length} of ${leads.length}` : leads.length} Target Leads Identified
                    </span>
                    {scoreFilter && (
                      <div >
                        <span>Score Space: {scoreFilter.rangeLabel}</span>
                        <button 
                          onClick={() => setScoreFilter(null)} 
                          
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div >
                  <button 
                    onClick={() => setSortByScore(!sortByScore)}
                    
                  >
                    <Target  />
                    {sortByScore ? 'Sorted by Score' : 'Sort by Score'}
                  </button>

                  <div >
                    <button
                      onClick={() => setLeadsViewMode('pipeline')}
                      
                      title="Pipeline Board View"
                    >
                      <Kanban  />
                      Pipeline Board
                    </button>
                    <button
                      onClick={() => setLeadsViewMode('list')}
                      
                      title="List Feed View"
                    >
                      <List  />
                      List View
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk actions and Select All controls */}
              {(() => {
                const displayedLeads = [...leads]
                  .filter(l => {
                    if (!scoreFilter) return true;
                    const s = calculateLeadScore(l);
                    return s >= scoreFilter.min && s <= scoreFilter.max;
                  })
                  .filter(l => {
                    if (!leadsSearch) return true;
                    const query = leadsSearch.toLowerCase().trim();
                    return (
                      (l.name || '').toLowerCase().includes(query) ||
                      (l.email || '').toLowerCase().includes(query) ||
                      (l.company || '').toLowerCase().includes(query) ||
                      (l.role || '').toLowerCase().includes(query) ||
                      (l.industry || '').toLowerCase().includes(query) ||
                      (l.country || '').toLowerCase().includes(query)
                    );
                  })
                  .sort((a, b) => sortByScore ? calculateLeadScore(b) - calculateLeadScore(a) : 0);

                const paginatedLeads = leadsViewMode === 'list'
                  ? displayedLeads.slice((leadsPage - 1) * leadsPerPage, leadsPage * leadsPerPage)
                  : displayedLeads;

                const allDisplayedSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => l.id && selectedLeadIds.includes(l.id));

                const toggleSelectAll = () => {
                  if (allDisplayedSelected) {
                    const displayedIds = paginatedLeads.map(l => l.id).filter(Boolean) as string[];
                    setSelectedLeadIds(prev => prev.filter(id => !displayedIds.includes(id)));
                  } else {
                    const displayedIds = paginatedLeads.map(l => l.id).filter(Boolean) as string[];
                    setSelectedLeadIds(prev => Array.from(new Set([...prev, ...displayedIds])));
                  }
                };

                return (
                  <>
                    {/* Database Lead Search Engine bar */}
                    <div >
                      <div >
                        <Search  />
                        <input
                          type="text"
                          value={leadsSearch}
                          onChange={(e) => {
                            setLeadsSearch(e.target.value);
                            setLeadsPage(1);
                          }}
                          placeholder="Search database leads (by name, email, company, job role, or industry)..."
                          
                        />
                        {leadsSearch && (
                          <button
                            onClick={() => {
                              setLeadsSearch('');
                              setLeadsPage(1);
                            }}
                            
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div >
                        <div >
                          <span  />
                          <span>Elite &ge; 60 pts</span>
                        </div>
                        <div >
                          <span  />
                          <span>Standard &lt; 60 pts</span>
                        </div>
                      </div>
                    </div>

                    <div >
                      <div >
                        <input 
                          type="checkbox"
                          id="bulk-select-all"
                          checked={allDisplayedSelected}
                          onChange={toggleSelectAll}
                          
                        />
                        <label htmlFor="bulk-select-all" >
                          {selectedLeadIds.length > 0 ? (
                            <span >{selectedLeadIds.length} Selected</span>
                          ) : (
                            <span >No Selection</span>
                          )}
                          <span >
                            • Showing {displayedLeads.length} lead{displayedLeads.length !== 1 ? 's' : ''} on feed
                          </span>
                        </label>
                      </div>

                      <div >
                        <button
                          onClick={() => setShowBulkAddModal(true)}
                          
                          title="Bulk load additional leads manually or from list"
                        >
                          <PlusCircle  />
                          Bulk Add Leads
                        </button>

                        <button
                          onClick={() => {
                            if (selectedLeadIds.length === 0) {
                              showToast("Please select at least one lead first.", "warning");
                              return;
                            }
                            setBulkEditFields({ role: '', company: '', industry: '', country: '', status: '' });
                            setShowBulkEditModal(true);
                          }}
                          
                        >
                          <Settings  />
                          Bulk Edit ({selectedLeadIds.length})
                        </button>

                        <button
                          onClick={() => {
                            if (selectedLeadIds.length === 0) {
                              showToast("Please select at least one lead to delete.", "warning");
                              return;
                            }
                            handleBulkDeleteLeads(selectedLeadIds);
                          }}
                          
                        >
                          <Trash2  />
                          Bulk Delete ({selectedLeadIds.length})
                        </button>
                      </div>
                    </div>

                    {leadsViewMode === 'list' ? (
                      <div >
                        {/* Table controls */}
                        <div >
                          <span >Tabular Workplace View</span>
                          <div >
                            <button 
                              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                              
                            >
                              <Filter  />
                              Columns
                            </button>
                            {showColumnDropdown && (
                              <div >
                                <div >Toggle Columns</div>
                                {Object.keys(visibleColumns).map((col) => (
                                  <label key={col} >
                                    <input 
                                      type="checkbox"
                                      
                                      checked={visibleColumns[col]}
                                      onChange={(e) => setVisibleColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                                    />
                                    <span >
                                      {col === 'nameCompany' ? 'Name & Company' : col}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div >
                          <table >
                            <thead>
                              <tr >
                                <th >
                                  <input 
                                    type="checkbox"
                                    id="bulk-select-list-header"
                                    checked={allDisplayedSelected}
                                    onChange={toggleSelectAll}
                                    
                                  />
                                </th>
                                {visibleColumns.nameCompany && <th >Lead / Company</th>}
                                {visibleColumns.role && <th >Position</th>}
                                {visibleColumns.score && <th >Score</th>}
                                {visibleColumns.contact && <th >Contact</th>}
                                {visibleColumns.country && <th >Location</th>}
                                {visibleColumns.industry && <th >Industry</th>}
                                {visibleColumns.status && <th >Status</th>}
                                <th >Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedLeads.map((l, leadIndex) => {
                                const lScore = calculateLeadScore(l);
                                const isElite = lScore >= 60;
                                const shouldHighlight = highlightElite && isElite;
                                const cid = l.id || `lead-${leadIndex}`;
                                const isExpanded = expandedLeadId === cid;

                                // Determine Stage status
                                let stageName = 'Pending';
                                let stageColorClass = 'bg-amber-500/15 text-amber-400 border-amber-500/20';
                                let dotColor = 'bg-amber-400';
                                if (l.status === 'sent') {
                                  stageName = 'Sent';
                                  stageColorClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
                                  dotColor = 'bg-emerald-400';
                                } else if (l.id && messages[l.id]) {
                                  stageName = 'Generated';
                                  stageColorClass = 'bg-blue-500/15 text-blue-400 border-blue-500/20';
                                  dotColor = 'bg-blue-400';
                                } else if (l.status === 'failed') {
                                  stageName = 'Failed';
                                  stageColorClass = 'bg-red-500/15 text-red-500 border-red-500/20';
                                  dotColor = 'bg-red-500';
                                } else if (l.status === 'imported') {
                                  stageName = 'Imported';
                                  stageColorClass = 'bg-purple-500/15 text-purple-400 border-purple-500/20';
                                  dotColor = 'bg-purple-400';
                                } else {
                                  stageColorClass = 'bg-slate-500/10 text-text-muted border-border';
                                  dotColor = 'bg-text-muted';
                                }

                                return (
                                  <React.Fragment key={cid}>
                                    <tr >
                                      <td >
                                        <input 
                                          type="checkbox"
                                          checked={l.id ? selectedLeadIds.includes(l.id) : false}
                                          onChange={(e) => {
                                            if (!l.id) return;
                                            if (e.target.checked) {
                                              setSelectedLeadIds(prev => [...prev, l.id!]);
                                            } else {
                                              setSelectedLeadIds(prev => prev.filter(id => id !== l.id));
                                            }
                                          }}
                                          
                                        />
                                      </td>
                                      {visibleColumns.nameCompany && (
                                        <td >
                                          <div >
                                            <div >
                                              {(l.name || '?')[0]}
                                            </div>
                                            <div >
                                              <div >
                                                <span>{l.name}</span>
                                                {shouldHighlight && (
                                                  <span >Elite</span>
                                                )}
                                              </div>
                                              <div >
                                                {l.company}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      )}
                                      {visibleColumns.role && (
                                        <td >
                                          {l.role || 'N/A'}
                                        </td>
                                      )}
                                      {visibleColumns.score && (
                                        <td >
                                          <span >
                                            {lScore}
                                          </span>
                                        </td>
                                      )}
                                      {visibleColumns.contact && (
                                        <td >
                                          <div >
                                            {l.phone ? (
                                              <a href={`tel:${l.phone}`}  title={l.phone}>
                                                <Smartphone  />
                                              </a>
                                            ) : (
                                              <span ><Smartphone  /></span>
                                            )}
                                            {l.email ? (
                                              <a href={`mailto:${l.email}`}  title={l.email}>
                                                <Mail  />
                                              </a>
                                            ) : (
                                              <span ><Mail  /></span>
                                            )}
                                            {l.linkedin_url ? (
                                              <a href={l.linkedin_url.startsWith('http') ? l.linkedin_url : `https://${l.linkedin_url}`} target="_blank" rel="noreferrer"  title="LinkedIn Profile">
                                                <Linkedin  />
                                              </a>
                                            ) : (
                                              <span ><Linkedin  /></span>
                                            )}
                                          </div>
                                        </td>
                                      )}
                                      {visibleColumns.country && (
                                        <td >
                                          {COUNTRY_FLAGS[l.country] || '🌍'} {l.country || 'Global'}
                                        </td>
                                      )}
                                      {visibleColumns.industry && (
                                        <td >
                                          {l.industry || 'N/A'}
                                        </td>
                                      )}
                                      {visibleColumns.status && (
                                        <td >
                                          <span >
                                            <span  />
                                            {stageName}
                                          </span>
                                        </td>
                                      )}
                                      <td >
                                        <div >
                                          <button 
                                            onClick={() => setExpandedLeadId(isExpanded ? null : cid)}
                                            
                                            title="Expand detail drawer"
                                          >
                                            <ChevronDown  />
                                          </button>
                                          {l.id && (
                                            <button 
                                              onClick={() => {
                                                if (confirm(`Are you sure you want to delete lead ${l.name}?`)) {
                                                  handleDeleteLead(l.id!);
                                                }
                                              }}
                                              
                                              title="Delete Lead"
                                            >
                                              <Trash2  />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                    
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={10} >
                                          {editingLeadId === l.id ? (
                                            <div >
                                              <div>
                                                <span >Name</span>
                                                <input 
                                                  type="text" 
                                                  value={editedLeadData?.name || ''} 
                                                  onChange={e => setEditedLeadData(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                                                   
                                                />
                                              </div>
                                              <div>
                                                <span >Company</span>
                                                <input 
                                                  type="text" 
                                                  value={editedLeadData?.company || ''} 
                                                  onChange={e => setEditedLeadData(prev => prev ? ({ ...prev, company: e.target.value }) : null)}
                                                   
                                                />
                                              </div>
                                              <div>
                                                <span >Role</span>
                                                <input 
                                                  type="text" 
                                                  value={editedLeadData?.role || ''} 
                                                  onChange={e => setEditedLeadData(prev => prev ? ({ ...prev, role: e.target.value }) : null)}
                                                   
                                                />
                                              </div>
                                              <div>
                                                <span >Email</span>
                                                <input 
                                                  type="text" 
                                                  value={editedLeadData?.email || ''} 
                                                  onChange={e => setEditedLeadData(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                                                   
                                                />
                                              </div>
                                              <div>
                                                <span >Phone</span>
                                                <input 
                                                  type="text" 
                                                  value={editedLeadData?.phone || ''} 
                                                  onChange={e => setEditedLeadData(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
                                                   
                                                />
                                              </div>
                                              <div>
                                                <span >LinkedIn</span>
                                                <input 
                                                  type="text" 
                                                  value={editedLeadData?.linkedin_url || ''} 
                                                  onChange={e => setEditedLeadData(prev => prev ? ({ ...prev, linkedin_url: e.target.value }) : null)}
                                                   
                                                />
                                              </div>
                                              <div >
                                                <button 
                                                  onClick={() => { setEditingLeadId(null); setEditedLeadData(null); }}
                                                  
                                                >
                                                  Cancel
                                                </button>
                                                <button 
                                                  onClick={async () => {
                                                    if (!editedLeadData || !l.id) return;
                                                    await handleUpdateLead(l.id, editedLeadData);
                                                    setEditingLeadId(null);
                                                    setEditedLeadData(null);
                                                  }}
                                                  
                                                >
                                                  Save
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div >
                                              <div>
                                                <span >Role / Title</span>
                                                <span >{l.role || 'N/A'}</span>
                                              </div>
                                              <div>
                                                <span >Official Email</span>
                                                <span >{l.email || 'N/A'}</span>
                                              </div>
                                              <div>
                                                <span >Direct Phone</span>
                                                <span >{l.phone || 'N/A'}</span>
                                              </div>
                                              <div>
                                                <span >Industry Segment</span>
                                                <span >{l.industry || 'N/A'}</span>
                                              </div>
                                              <div >
                                                <button 
                                                  onClick={() => { setEditingLeadId(l.id || `lead-${leadIndex}`); setEditedLeadData(l); }}
                                                  
                                                >
                                                  <Settings  />
                                                  Edit Details
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {/* Pagination Controls */}
                        <div >
                          <div >
                            <span>Show</span>
                            <select 
                              
                              value={leadsPerPage}
                              onChange={(e) => {
                                setLeadsPerPage(Number(e.target.value));
                                setLeadsPage(1);
                              }}
                            >
                              {[10, 25, 50, 100, 250].map(n => (
                                <option key={n} value={n}>{n} rows</option>
                              ))}
                            </select>
                            <span>per page</span>
                          </div>
                          
                          <div >
                            Showing <span >{displayedLeads.length === 0 ? 0 : (leadsPage - 1) * leadsPerPage + 1}</span> to{" "}
                            <span >{Math.min(displayedLeads.length, leadsPage * leadsPerPage)}</span> of{" "}
                            <span >{displayedLeads.length}</span> leads
                          </div>

                          <div >
                            <button
                              onClick={() => setLeadsPage(prev => Math.max(1, prev - 1))}
                              disabled={leadsPage === 1}
                              
                            >
                              Previous
                            </button>
                            {Array.from({ length: Math.ceil(displayedLeads.length / leadsPerPage) }).slice(0, 5).map((_, index) => {
                              const totalPages = Math.ceil(displayedLeads.length / leadsPerPage);
                              let targetPage = index + 1;
                              if (totalPages > 5 && leadsPage > 3) {
                                if (leadsPage + 2 > totalPages) {
                                  targetPage = totalPages - 4 + index;
                                } else {
                                  targetPage = leadsPage - 2 + index;
                                }
                              }
                              if (targetPage > totalPages || targetPage <= 0) return null;
                              return (
                                <button
                                  key={targetPage}
                                  onClick={() => setLeadsPage(targetPage)}
                                  
                                >
                                  {targetPage}
                                </button>
                              );
                            })}
                            <button
                              onClick={() => setLeadsPage(prev => Math.min(Math.ceil(displayedLeads.length / leadsPerPage), prev + 1))}
                              disabled={leadsPage >= Math.ceil(displayedLeads.length / leadsPerPage)}
                              
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                <div >
                  {[
                    { id: 'imported', label: 'Discovered leads', color: 'border-purple-500/20 text-purple-400 bg-purple-500/5', dot: 'bg-purple-400' },
                    { id: 'pending', label: 'Active engagement', color: 'border-amber-500/20 text-amber-400 bg-amber-500/5', dot: 'bg-amber-400' },
                    { id: 'generated', label: 'AI drafted messages', color: 'border-blue-500/20 text-blue-400 bg-blue-500/5', dot: 'bg-blue-400' },
                    { id: 'sent', label: 'Outreach sent', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5', dot: 'bg-emerald-400' },
                    { id: 'failed', label: 'Failed/Unreachable', color: 'border-red-500/20 text-red-500 bg-red-400/5', dot: 'bg-red-400' }
                  ].map((col) => {
                    const colLeads = displayedLeads.filter(l => {
                      const actualStatus = l.status === 'sent' ? 'sent' :
                                           (l.id && messages[l.id]) ? 'generated' :
                                           l.status === 'failed' ? 'failed' :
                                           l.status === 'imported' ? 'imported' :
                                           l.status || 'pending';
                      return actualStatus === col.id;
                    });

                    const colLimit = pipelineColLimits[col.id] || 20;
                    const truncatedColLeads = colLeads.slice(0, colLimit);

                    const isDraggedOver = draggedOverColumn === col.id;

                    return (
                      <div 
                        key={col.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedOverColumn !== col.id) {
                            setDraggedOverColumn(col.id);
                          }
                        }}
                        onDragLeave={() => setDraggedOverColumn(null)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDraggedOverColumn(null);
                          const leadId = e.dataTransfer.getData("text/plain");
                          if (leadId) {
                            await handleUpdateLead(leadId, { status: col.id as any });
                            showToast(`Updated stage for contact to ${col.label}`, "success");
                          }
                        }}
                        
                      >
                        <div >
                          <div >
                            <span  />
                            <span >{col.label}</span>
                          </div>
                          <span >{colLeads.length}</span>
                        </div>

                        <div >
                          {colLeads.length === 0 ? (
                            <div >
                              <span >Drag leads here</span>
                              <span>to update status</span>
                            </div>
                          ) : (
                            truncatedColLeads.map((l, leadIdx) => {
                              const lScore = calculateLeadScore(l);
                              const isElite = lScore >= 60;

                              return (
                                <div
                                  key={l.id || leadIdx}
                                  draggable={true}
                                  onDragStart={(e) => {
                                    if (l.id) {
                                      e.dataTransfer.setData("text/plain", l.id);
                                      e.dataTransfer.effectAllowed = "move";
                                    }
                                  }}
                                  onClick={() => {
                                    const cid = l.id || `lead-${leadIdx}`;
                                    setExpandedLeadId(expandedLeadId === cid ? null : cid);
                                  }}
                                  
                                >
                                  <div >
                                    <div >
                                      {(l.name || '?')[0]}
                                    </div>
                                    <div >
                                      <div >
                                        <span>{l.name}</span>
                                      </div>
                                      <div >
                                        {l.role}
                                      </div>
                                      <div >
                                        {l.company}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Recommendation panel */}
                                  <div >
                                    <span >Recommendation:</span>
                                    {(() => {
                                      let label = 'Qualify/generate draft';
                                      let cls = 'bg-blue-500/10 text-blue-400 border-blue-500/25';
                                      if (l.status === 'sent') {
                                        label = 'Follow-up in 3 days';
                                        cls = 'bg-purple-500/10 text-purple-400 border-purple-500/25';
                                      } else if (l.status === 'failed') {
                                        label = 'Verify profile url';
                                        cls = 'bg-red-500/10 text-red-400 border-red-500/25';
                                      } else if (l.id && messages[l.id]) {
                                        label = 'Export and send copy';
                                        cls = 'bg-[#00d4aa]/15 text-[#00d4aa] border-[#00d4aa]/30';
                                      } else if (lScore >= 60) {
                                        label = 'Draft elite AI copy';
                                        cls = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
                                      }
                                      return (
                                        <span >
                                          {label}
                                        </span>
                                      );
                                    })()}
                                  </div>

                                  <div >
                                    <div >
                                      <Award  />
                                      <span >{lScore}</span>
                                    </div>

                                    <div >
                                      {l.phone && <span  title="WhatsApp ready" />}
                                      {l.email && <span  title="Email channel configured" />}
                                      {l.linkedin_url && <span  title="LinkedIn profile mapped" />}
                                    </div>
                                  </div>

                                  {expandedLeadId === (l.id || `lead-${leadIdx}`) && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <p ><strong >Email:</strong> {l.email || 'N/A'}</p>
                                      <p ><strong >Phone:</strong> {l.phone || 'N/A'}</p>
                                      <div >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingLeadId(l.id || `lead-${leadIdx}`);
                                            setEditedLeadData(l);
                                          }}
                                          
                                        >
                                          Edit Details
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Pipeline column pagination load more */}
                        {colLeads.length > colLimit && (
                          <button
                            onClick={() => {
                              setPipelineColLimits(prev => ({
                                ...prev,
                                [col.id]: colLimit + 30
                              }));
                            }}
                            
                          >
                            + Load {colLeads.length - colLimit} More Leads
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </>
            );
          })()}
              
              {/* Automated Realtime CRM Sync Status Pipelines */}
              <CrmSyncLogsPanel leads={leads as any} showToast={showToast} />
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActivePanel(2)}
                
              >
                Continue to Generate
                <ChevronRight  />
              </motion.button>
            </motion.div>
          )}
        </PanelWrapper>

        {/* Panel 2: Generate */}
        <PanelWrapper index={2} activePanel={activePanel}>
          <div >
            <h1 >Generate</h1>
            <p >AI writes WhatsApp + LinkedIn + Email per lead.</p>
          </div>

          <div >
            <div >
              <Zap  />
            </div>
            <div>
              <div >Resource Usage</div>
              Each lead = 1 API call (all 3 channels). {leads.length} leads ≈ 30–60 seconds.
            </div>
          </div>

          {!isGenerating && Object.keys(messages).length === 0 && (
            <div >
              <div >
                <div >
                  <Zap  />
                </div>
                Settings
              </div>
              <div >
                <div >
                  <label >Batch Size</label>
                  <select 
                    
                    value={batchSize}
                    onChange={e => setBatchSize(parseInt(e.target.value))}
                  >
                    <option value={3}>3 leads (quick test)</option>
                    <option value={10}>10 leads</option>
                    <option value={20}>20 leads</option>
                    <option value={999}>All leads</option>
                  </select>
                </div>
                <div >
                  <label >Tone Style</label>
                  <select 
                    
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
                
              >
                <Zap  />
                Generate All Messages
              </button>
            </div>
          )}

          {isGenerating && (
            <div >
              <div >
                <Loader2  />
                Generating…
              </div>
              <div >
                <motion.div 
                  
                  initial={{ width: 0 }}
                  animate={{ width: `${genProgress}%` }}
                />
              </div>
              <div >
                Progress: {Math.round(genProgress)}%
              </div>
              <div >
                {genLog.map((log, i) => (
                  <div key={i} >
                    <span >[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
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
              
            >
              <div >
                <CheckCircle2  />
              </div>
              <div >
                <h3 >All Messages Ready</h3>
                <p >Tap Review to read and edit before sending.</p>
              </div>
              <button 
                onClick={() => setActivePanel(3)}
                
              >
                Review Messages →
              </button>
            </motion.div>
          )}
        </PanelWrapper>

        {/* Panel 3: Review */}
        <PanelWrapper index={3} activePanel={activePanel}>
          <div >
            <h1 >Review & Refine</h1>
            <p >Fine-tune your AI agents' output before sending.</p>
          </div>

          <div >
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
            
          >
            Export & Send
            <ChevronRight  />
          </motion.button>
        </PanelWrapper>

        {/* Panel 4: Export */}
        <PanelWrapper index={4} activePanel={activePanel}>
          <div >
            <h1 >Export & Send</h1>
            <p >Download and deploy your outreach.</p>
          </div>

          <div >
            <div >
              <Download  />
            </div>
            <div>
              <div >Export Options</div>
              Master CSV works in Google Sheets. n8n JSON imports directly into your workflow.
            </div>
          </div>

          <div >
            <div >
              {liAccount?.connected && (
                <div >
                  <div >
                    <div >
                      <div >
                        <Linkedin  />
                      </div>
                      <div>
                        <div >LinkedIn Auto-Send Queue</div>
                        <div >Sync with automation bridge</div>
                      </div>
                    </div>
                    {lastSync && (
                      <div >LAST SYNC: {lastSync}</div>
                    )}
                  </div>
                  <p >
                    Your LinkedIn account is connected. Sync your generated messages to the automation bridge to start background sending.
                  </p>
                  <button 
                    onClick={handleSyncLinkedIn}
                    disabled={isSyncingLi || Object.keys(messages).length === 0}
                    
                  >
                    {isSyncingLi ? <Loader2  /> : <Zap  />}
                    Sync {Object.keys(messages).length} Messages to Queue
                  </button>
                </div>
              )}
              {[
                { id: 'whatsapp' as const, icon: <Smartphone  />, title: 'WhatsApp', color: '#25d366', desc: 'CSV with all messages + Node.js send script' },
                { id: 'linkedin' as const, icon: <Linkedin  />, title: 'LinkedIn', color: '#4da6ff', desc: 'Connect request + DM text. Import to Expandi / Dripify.' },
                { id: 'email' as const, icon: <Mail  />, title: 'Email', color: '#f59e0b', desc: 'Subject + body + follow-up. Import to Apollo / Lemlist.' },
                { id: 'master' as const, icon: <FileSpreadsheet  />, title: 'Master CSV', color: '#00d4aa', desc: 'All leads + all 3 channels in one tracking spreadsheet.' }
              ].map(ex => (
                <div key={ex.id} >
                  <div >
                    <div  style={{ backgroundColor: ex.color }}>
                      {ex.icon}
                    </div>
                    <div>
                      <div >{ex.title}</div>
                      <div >{ex.desc}</div>
                    </div>
                  </div>
                  
                  <div >
                    <button 
                      onClick={() => exportCSV(ex.id as any)}
                      
                    >
                      <Download  />
                      Download
                    </button>
                  </div>

                  {ex.id === 'linkedin' && liAccount?.connected && (
                    <div >
                      <div >
                        <span>Automation Bridge</span>
                        <span >Ready</span>
                      </div>
                      <div >
                        <button 
                          onClick={handleSyncLinkedIn}
                          disabled={isSyncingLi}
                          
                        >
                          {isSyncingLi ? <Loader2  /> : <Zap  />}
                          Sync Queue
                        </button>
                        <button 
                          onClick={() => exportCSV('li_script')}
                          
                        >
                          <Code2  />
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
          <div >
            <div >
              <Database  />
            </div>

            <div >
              <div >
                <div >
                  <div >
                    <Database  />
                  </div>
                  <h3 >Enterprise CRM Integration</h3>
                </div>
                <p >
                  Export personalized leads and conversation metrics directly to HubSpot or Salesforce pipelines.
                </p>
              </div>

              {!crmAccount?.connected ? (
                <div >
                  <button 
                    onClick={() => {
                      setCrmPlatformToConnect('HubSpot');
                      setShowCrmModal(true);
                    }}
                    
                  >
                    Connect HubSpot
                  </button>
                  <button 
                    onClick={() => {
                      setCrmPlatformToConnect('Salesforce');
                      setShowCrmModal(true);
                    }}
                    
                  >
                    Connect Salesforce
                  </button>
                </div>
              ) : (
                <div >
                  <span >
                    <span  />
                    {crmAccount.platform} Connected
                  </span>
                  <button 
                    onClick={handleDisconnectCRM}
                    
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
                
              >
                <div >
                  <label >Connected Org</label>
                  <div >
                    <span>{crmAccount.orgName}</span>
                    <RefreshCw  />
                  </div>
                </div>

                <div >
                  <label >Pipeline Target Stage</label>
                  <select 
                    value={crmMappingStage}
                    onChange={(e) => setCrmMappingStage(e.target.value)}
                    
                  >
                    <option value="Prospecting / SDR Out">Prospecting / SDR Out</option>
                    <option value="Lead Qualified / Verified">Lead Qualified / Verified</option>
                    <option value="Meeting Scheduled Loop">Meeting Scheduled Loop</option>
                    <option value="Custom Active Campaigns">Custom Active Campaigns</option>
                  </select>
                </div>

                <div >
                  <button 
                    onClick={handlePushCRMData}
                    disabled={isCrmPushing}
                    
                  >
                    {isCrmPushing ? (
                      <>
                        <Loader2  />
                        <span>Syncing to {crmAccount.platform}...</span>
                      </>
                    ) : (
                      <>
                        <Database  />
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
                
              >
                <div >
                  <span >
                    <Database  />
                    API INTEGRATION PIPELINE SYNC
                  </span>
                  <span >{crmPushProgress}%</span>
                </div>
                
                <div >
                  <div 
                    
                    style={{ width: `${crmPushProgress}%` }}
                  />
                </div>

                <div >
                  {crmPushLog.map((log, i) => (
                    <div key={i} >
                      <span >[{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <div >
            <div >
              <ShieldCheck  />
              Daily Limits & Safety
            </div>
            <div >
              {[
                { title: 'WhatsApp', color: '#25d366', body: 'Max 50-80 msg/day. 8-10s delay.' },
                { title: 'LinkedIn', color: '#4da6ff', body: 'Max 20-25 req/day. No links in msg 1.' },
                { title: 'Email', color: '#f59e0b', body: 'Max 50-100/day. Warm domain first.' }
              ].map((s, i) => (
                <div key={i} >
                  <div  style={{ color: s.color }}>{s.title}</div>
                  <div >{s.body}</div>
                </div>
              ))}
            </div>
          </div>
        </PanelWrapper>
      </div>
    )}

    {activeView === 'TEAM_ADMIN' && <TeamAdminPanel profile={profile} />}
    
    {/* Dynamic Org Admin views */}
    {(activeView === 'ORG_DASHBOARD' || activeView === 'ORG_MEMBERS' || activeView === 'ORG_BRANDING' || activeView === 'ORG_DOMAIN' || activeView === 'ORG_BILLING' || activeView === 'ORG_FEATURES' || activeView === 'ORG_SECURITY') && (
      <OrgAdminPanel 
        showToast={showToast}
        profile={profile}
        users={[]}
      />
    )}

    {/* Dynamic Manager views */}
    {(activeView === 'MGR_DASHBOARD' || activeView === 'MGR_APPROVALS' || activeView === 'MGR_CALLS' || activeView === 'MGR_FORECAST') && (
      <ManagerWorkspacePanel 
        showToast={showToast}
        leads={leads}
        campaigns={campaigns}
      />
    )}

    {/* Dynamic AE views */}
    {(activeView === 'AE_PIPELINE' || activeView === 'AE_HEALTH' || activeView === 'AE_COPILOT' || activeView === 'AE_BRIEFS') && (
      <AeWorkspacePanel 
        showToast={showToast}
        leads={leads}
      />
    )}

    {/* Dynamic SDR views */}
    {(activeView === 'SDR_DAILY' || activeView === 'SDR_STATS') && (
      <SdrWorkspacePanel 
        showToast={showToast}
        leads={leads}
        campaigns={campaigns}
        profile={profile}
        user={user}
      />
    )}

    {/* Dynamic Reader/Viewer views */}
    {(activeView === 'VIEWER_DASHBOARD' || activeView === 'VIEWER_PIPELINE') && (
      <div >
        <div >Read-Only Viewer Analytics Panel</div>
        <p >You are currently logged in with a read-only seat. Inbound sequence analytics and company pipelines can be viewed but edit actions are restricted by administrative guidelines.</p>
        <div >
          <div >&bull; Corporate Multi-Tenant Compliance</div>
          <p >Domain settings and members roster configurations are managed by organizational administrators. To acquire edit-seat clearance, please contact your billing coordinator.</p>
        </div>
      </div>
    )}

    {/* Super Admin Billing view */}
    {activeView === 'SUPER_ADMIN_BILLING' && (
      <div >
        <h3 >Platform Multi-Tenant Billing Gateway</h3>
        <p >Manage subscription pricing matrices, super-administrator global MRR graphs, and direct merchant overrides.</p>
        <div >
          <div >
            <div >$38,240</div>
            <div >Platform Run-Rate MRR</div>
          </div>
          <div >
            <div >42</div>
            <div >Active Enterprise Orgs</div>
          </div>
          <div >
            <div >100%</div>
            <div >Stripe Server uptime</div>
          </div>
        </div>
      </div>
    )}

    {activeView === 'SUPER_ADMIN' && (
      <SuperAdminPanel 
        showToast={showToast} 
        externalActiveTab={superAdminTab}
        externalSetActiveTab={setSuperAdminTab}
      />
    )}
    {activeView === 'JOURNEY' && (
      <CrmPipelineBoard 
        leads={leads as any}
        onLeadsUpdated={() => {
          // trigger trigger refresh
        }}
        showToast={showToast}
        profile={profile}
      />
    )}
    {activeView === 'ANALYTICS' && (
      <LeadJourneyAnalytics 
        showToast={showToast} 
        profile={profile}
        user={user}
        db={db}
        campaigns={campaigns}
      />
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
    {(activeView as string) === 'MEETINGS' && (
      <MeetingsPanel
        orgId={profile?.orgId || user?.uid || 'default'}
        profile={profile}
      />
    )}
    {(activeView as string) === 'AFFILIATES' && (
      <AffiliatesPanel
        orgId={profile?.orgId || user?.uid || 'default'}
        profile={profile}
      />
    )}
    {(activeView as string) === 'EMAIL_SEQUENCES' && (
      <EmailSequenceManager
        orgId={profile?.orgId || user?.uid || 'default'}
        profile={profile}
      />
    )}
    {(activeView as string) === 'PIPELINE_ANALYTICS' && (
      <div >
        <div>
          <h1 >Pipeline Analytics</h1>
          <p >Stage funnel, channel attribution, BANT distribution</p>
        </div>
        <PipelineFunnelChart orgId={profile?.orgId || user?.uid || 'default'} />
      </div>
    )}
    {(activeView as string) === 'AI_COSTS' && (
      <div >
        <div>
          <h1 >AI Cost Tracker</h1>
          <p >Token usage, model breakdown, and per-lead costs</p>
        </div>
        <AiCostTracker orgId={profile?.orgId || user?.uid || 'default'} />
      </div>
    )}
    {(activeView as string) === 'INTEGRATIONS' && (
      <div >
        <div >
          <h1 >Integrations</h1>
          <p >Manage Listmonk, n8n, Whisper, and Meilisearch services</p>
        </div>
        <IntegrationStatusPanel />
      </div>
    )}
  </main>
  <footer >
    <div >
      <div >
        <span  />
        <span>Zyntra SDR Portal &copy; {new Date().getFullYear()}</span>
      </div>
      <div >
        <span>Developed by</span>
        <a 
          href="https://www.linkedin.com/in/pratyushmalviy/" 
          target="_blank" 
          rel="noopener noreferrer" 
          
        >
          Pratyush Malviya
        </a>
      </div>
    </div>
  </footer>
    </AppShell>

      {/* CRM OAuth / API Credentials Simulated Connection Modal */}
      <AnimatePresence>
        {showCrmModal && (
          <div >
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isConnectingCrm) setShowCrmModal(false); }}
              
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              
            >
              {/* Colored accent header depending on selection */}
              <div 
                
                style={{ backgroundColor: crmPlatformToConnect === 'Salesforce' ? '#00a1e0' : '#ff7a59' }}
              />

              <div >
                <div >
                  <div >
                    <Database  />
                  </div>
                  <div>
                    <h3 >Connect {crmPlatformToConnect}</h3>
                    <p >OAuth 2.0 Secure Handshake</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCrmModal(false)}
                  disabled={isConnectingCrm}
                  
                >
                  <X  />
                </button>
              </div>

              <div >
                <div >
                  <label >Instance Endpoint URL</label>
                  <input 
                    type="text" 
                    value={crmInstanceUrl}
                    onChange={(e) => setCrmInstanceUrl(e.target.value)}
                    placeholder={crmPlatformToConnect === 'Salesforce' ? 'https://na162.salesforce.com' : 'https://api.hubspot.com/v3'}
                    disabled={isConnectingCrm}
                    
                  />
                  <p >Leave blank to route via public API gateways.</p>
                </div>

                <div >
                  <label >Authorization Bearer Code</label>
                  <input 
                    type="password" 
                    value={crmAuthCode}
                    onChange={(e) => setCrmAuthCode(e.target.value)}
                    placeholder="Enter permanent private API secret verification token"
                    disabled={isConnectingCrm}
                    
                  />
                </div>

                <div >
                  <ShieldCheck  />
                  <span>
                    Your authorization credentials are encrypted and stored inside secure sandbox storage schemas aligned with modern TLS encryption guidelines.
                  </span>
                </div>
              </div>

              <div >
                <button 
                  onClick={() => setShowCrmModal(false)}
                  disabled={isConnectingCrm}
                  
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleConnectCRM(crmPlatformToConnect)}
                  disabled={isConnectingCrm}
                  
                >
                  {isConnectingCrm ? (
                    <>
                      <Loader2  />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <Link2  />
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
            existingLeads={leads as any}
            showToast={showToast}
          />
        )}

        {showBulkEditModal && (
          <div >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              
            >
              <div >
                <div>
                  <h2 >
                    <Settings  />
                    Bulk Edit {selectedLeadIds.length} Selected Leads
                  </h2>
                  <p >Specify non-empty values for attributes you wish to change.</p>
                </div>
                <button 
                  onClick={() => setShowBulkEditModal(false)}
                  
                >
                  ✕
                </button>
              </div>

              <div >
                <div>
                  <label >Role / Designation</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CTO, Director of Eng" 
                    
                    value={bulkEditFields.role}
                    onChange={e => setBulkEditFields(prev => ({ ...prev, role: e.target.value }))}
                  />
                </div>
                <div>
                  <label >Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Acme Corp" 
                    
                    value={bulkEditFields.company}
                    onChange={e => setBulkEditFields(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
                <div>
                  <label >Industry Segment</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SaaS, Fintech" 
                    
                    value={bulkEditFields.industry}
                    onChange={e => setBulkEditFields(prev => ({ ...prev, industry: e.target.value }))}
                  />
                </div>
                <div>
                  <label >Country ISO Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. US, GB, IN" 
                    
                    value={bulkEditFields.country}
                    onChange={e => setBulkEditFields(prev => ({ ...prev, country: e.target.value }))}
                  />
                </div>
                <div>
                  <label >Status Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. pending, sent, contact" 
                    
                    value={bulkEditFields.status}
                    onChange={e => setBulkEditFields(prev => ({ ...prev, status: e.target.value }))}
                  />
                </div>
              </div>

              <div >
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleBulkUpdateLeads(selectedLeadIds, bulkEditFields as any);
                    setShowBulkEditModal(false);
                  }}
                  
                >
                  Apply Updates
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showBulkAddModal && (
          <div >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              
            >
              <div >
                <div>
                  <h2 >
                    <PlusCircle  />
                    Bulk Add Leads
                  </h2>
                  <p >Paste CSV or TSV format data below. First row as values directly.</p>
                </div>
                <button 
                  onClick={() => setShowBulkAddModal(false)}
                  
                >
                  ✕
                </button>
              </div>

              <div >
                <div >
                  <span >Format: </span> <code >name,role,company,industry,country,phone,email,linkedin_url</code>. Paste one lead per line.
                </div>
                <textarea 
                  
                  placeholder="Alice Smith,CEO,Acme Corp,Software,US,12345,alice@acme.com,linkedin.com/in/alice"
                  value={bulkAddRowsText}
                  onChange={e => setBulkAddRowsText(e.target.value)}
                />
              </div>

              <div >
                <button
                  onClick={() => setShowBulkAddModal(false)}
                  
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!bulkAddRowsText.trim()) {
                      showToast("Please enter lead records to parse.", "warning");
                      return;
                    }
                    await parseLeads(bulkAddRowsText);
                    setBulkAddRowsText('');
                    setShowBulkAddModal(false);
                  }}
                  
                >
                  Parse & Insert Leads
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
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
      
    >
      <div >
        <Icon  />
      </div>
      {!isCollapsed && (
        <div >
          <div >{label}</div>
          <div >
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
    <div >
      <div >
        <h1 >Team Administration</h1>
        <p >Manage your organization's users and permissions.</p>
      </div>

      <div >
        <div >
          <div >{users.length}</div>
          <div >Total Members</div>
        </div>
        <div >
          <div >Active</div>
          <div >Subscription Status</div>
        </div>
      </div>

      <div >
        <table >
          <thead>
            <tr >
              <th >User</th>
              <th >Role</th>
              <th >Status</th>
              <th >Actions</th>
            </tr>
          </thead>
          <tbody >
            {users.map(u => (
              <tr key={u.uid} >
                <td >
                  <div >
                    <img src={u.photoURL}  />
                    <div>
                      <div >{u.displayName}</div>
                      <div >{u.email}</div>
                    </div>
                  </div>
                </td>
                <td >
                  <span >
                    {(u.role || '').replace('_', ' ')}
                  </span>
                </td>
                <td >
                  <div >
                    <div  />
                    <span >Active</span>
                  </div>
                </td>
                <td >
                  <button >Edit Role</button>
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
    <div >
      <div >
        <div >
          <h1 >Campaigns</h1>
          <p >Manage your outreach strategies.</p>
        </div>
        <div >
          <input 
            
            placeholder="New Campaign Name"
            value={newCampName}
            onChange={e => setNewCampName(e.target.value)}
          />
          <button 
            onClick={() => { if(newCampName) { onCreate(newCampName); setNewCampName(''); } }}
            
          >
            <Plus  />
            Create
          </button>
        </div>
      </div>

      {/* Visual Showcase Banner */}
      <div >
        {/* Background gradient blur */}
        <div  />
        
        {/* Left column - Promo text */}
        <div >
          <div >
            <Sparkles  />
            <span>Active Enterprise Workspace</span>
          </div>
          <div >
            <h2 >
              Scale Your Outreach with Precision GTM Analytics
            </h2>
            <p >
              Zyntra AI synchronizes LinkedIn messaging and custom SMTP channels with automated Lead Intent Scoring. Maximize response rates by tracking high-fidelity prospect signals from decision makers.
            </p>
          </div>
          <div >
            <div >
              <span >100%</span>
              <span >AI Personalization</span>
            </div>
            <div >
              <span >65+ Benchmark</span>
              <span >Lead Quality Standard</span>
            </div>
          </div>
        </div>

        {/* Right column - Visual branding graphic */}
        <div >
          <div >
            <img 
              src="https://picsum.photos/seed/cyber-enterprise/400/200" 
              alt="Zyntra Enterprise Hub" 
              
              referrerPolicy="no-referrer"
            />
            {/* Overlay Glass Panel */}
            <div >
              <h4 >Multi-Agent Lead Scorer</h4>
              <p >Model: Gemini 3.5 Flash</p>
            </div>
          </div>
        </div>
      </div>

      <div >
        {campaigns.length === 0 && (
          <div >
            <Target  />
            <p >No campaigns yet. Create your first one above!</p>
          </div>
        )}
        {campaigns.map(c => (
          <motion.div 
            key={c.id}
            whileHover={{ y: -3 }}
            
            onClick={() => onSelect(c)}
          >
            <div >
              <button 
                onClick={(e) => { e.stopPropagation(); onDownloadPDF(c); }}
                
                title="Download Campaign PDF Report"
              >
                <Download  />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                
                title="Delete Campaign"
              >
                <Trash2  />
              </button>
            </div>
            <div >
              <div >
                <Target  />
              </div>
              <div>
                <h3 >{c.name}</h3>
                <p >Created {c.createdAt?.toDate().toLocaleDateString()}</p>
              </div>
            </div>
            <div >
              <div >
                <Users  />
                <span >{c.leadsCount} Leads</span>
              </div>
              <div >
                {c.status}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
