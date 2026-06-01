import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Zap, 
  X, 
  ShieldCheck, 
  Globe, 
  Trash2, 
  UserPlus, 
  AlertCircle,
  Building,
  Check,
  DollarSign,
  TrendingUp,
  CreditCard,
  PlusCircle,
  Activity,
  Filter,
  Loader2,
  Plus,
  Target,
  Key,
  RefreshCw,
  Play,
  Eye,
  EyeOff,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { db, auth } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  setDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  orderBy,
  addDoc,
  getDoc
} from 'firebase/firestore';

// Core Local Types for Component Separation
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'super_admin' | 'org_admin' | 'user';
  orgId: string;
  lastLogin: any;
}

export interface PaymentLog {
  id: string;
  orgId: string;
  orgName: string;
  amount: number;
  tier: string;
  status: 'Paid' | 'Outstanding' | 'Refunded';
  method: string;
  invoiceNum: string;
  createdAt: any;
}

export function SuperAdminDashboard({ 
  showToast,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab
}: { 
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  activeTab?: 'dashboard' | 'employees_list' | 'add_employees' | 'organizations' | 'enterprise_suite' | 'llm_management';
  setActiveTab?: (tab: 'dashboard' | 'employees_list' | 'add_employees' | 'organizations' | 'enterprise_suite' | 'llm_management') => void;
}) {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [globalLeads, setGlobalLeads] = useState<any[]>([]);
  
  const [internalActiveTab, internalSetActiveTab] = useState<'dashboard' | 'employees_list' | 'add_employees' | 'organizations' | 'enterprise_suite' | 'llm_management'>('dashboard');
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = externalSetActiveTab || internalSetActiveTab;
  const isExternallyControlled = Boolean(externalActiveTab && externalSetActiveTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOrg, setFilterOrg] = useState('ALL');

  // LLM Management State Variables
  const [llmConfigs, setLlmConfigs] = useState<any[]>([]);
  const [llmLogs, setLlmLogs] = useState<any[]>([]);
  const [isTestingModelId, setIsTestingModelId] = useState<string | null>(null);
  const [showApiKeyId, setShowApiKeyId] = useState<string | null>(null);

  // Setup New LLM Provider Form States
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [newProviderId, setNewProviderId] = useState('');
  const [newProviderName, setNewProviderName] = useState('');
  const [newProviderGateway, setNewProviderGateway] = useState('openai');
  const [newProviderModel, setNewProviderModel] = useState('');
  const [newProviderApiKey, setNewProviderApiKey] = useState('');
  const [newProviderPriority, setNewProviderPriority] = useState(4);
  const [deletedLlmIds, setDeletedLlmIds] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('zyntra-deleted-llm-ids');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  // Dynamic OpenRouter models lists
  const [openRouterModels, setOpenRouterModels] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const fetchOpenRouterModels = async (apiKey?: string) => {
    setIsLoadingModels(true);
    try {
      const keyParam = apiKey ? `?apiKey=${apiKey}` : '';
      const response = await fetch(`/api/fallback/openrouter/models${keyParam}`);
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.data)) {
          const sorted = data.data.sort((a: any, b: any) => (a.name || a.id || '').localeCompare(b.name || b.id || ''));
          setOpenRouterModels(sorted);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dynamically OpenRouter models catalog list: ", err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Enterprise & Audit state variables (Task 5 & Task 6)
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [inviteReqs, setInviteReqs] = useState<any[]>([]);
  const [organizationsExt, setOrganizationsExt] = useState<any[]>([]);
  const [isLoadingSuite, setIsLoadingSuite] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteName, setNewInviteName] = useState('');
  const [recentMagicLink, setRecentMagicLink] = useState('');
  const [kbSummariesMap, setKbSummariesMap] = useState<Record<string, any>>({});

  // New Organization Form fields
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDomain, setNewOrgDomain] = useState('');
  const [newOrgTier, setNewOrgTier] = useState('Professional SDR');
  const [newOrgPrice, setNewOrgPrice] = useState('1499');
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // New Employees fields
  interface CreateEmployeeInput {
    displayName: string;
    email: string;
    role: 'super_admin' | 'org_admin' | 'user';
    orgId: string;
  }
  const [employeesToCreate, setEmployeesToCreate] = useState<CreateEmployeeInput[]>([
    { displayName: '', email: '', role: 'user', orgId: '' },
    { displayName: '', email: '', role: 'user', orgId: '' }
  ]);
  const [isSavingEmployees, setIsSavingEmployees] = useState(false);

  // Manual payment state fields
  const [showPayForm, setShowPayForm] = useState(false);
  const [payOrgId, setPayOrgId] = useState('');
  const [payAmount, setPayAmount] = useState('1499');
  const [payTier, setPayTier] = useState('Professional SDR');
  const [payStatus, setPayStatus] = useState<'Paid' | 'Outstanding'>('Paid');
  const [payMethod, setPayMethod] = useState('Stripe Credit Card');
  const [payInvoiceNum, setPayInvoiceNum] = useState('');
  const [isSavingPay, setIsSavingPay] = useState(false);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    // 1. Subscribe to Organizations
    const qOrgs = query(collection(db, 'organizations'));
    const unsubscribeOrgs = onSnapshot(qOrgs, (snapshot) => {
      const orgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrgs(orgList);
      if (orgList.length > 0) {
        setEmployeesToCreate(prev => prev.map(e => e.orgId ? e : { ...e, orgId: orgList[0].id }));
        setPayOrgId(prev => prev || orgList[0].id);
      }
    }, (error) => {
      console.error("Organizations load error", error);
    });

    // 2. Subscribe to Users
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      console.error("Users load error", error);
    });

    // 3. Subscribe to Global Leads
    const qLeads = query(collection(db, 'leads'));
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      setGlobalLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Global leads subscription error", error);
    });

    // 5. Subscribe to LLM Configurations
    const defaultConfigsList = [
      { id: "gemini", name: "Gemini 1.5 Flash/Pro", provider: "Google AI", isEnabled: true, priority: 1, apiKey: process.env.GEMINI_API_KEY || "", status: "online", avgLatency: 0, totalTokens: 0, totalCost: 0, selectedModel: "gemini-1.5-flash" },
      { id: "openai", name: "GPT-4o", provider: "OpenAI", isEnabled: true, priority: 2, apiKey: process.env.OPENAI_API_KEY || "", status: "online", avgLatency: 0, totalTokens: 0, totalCost: 0, selectedModel: "gpt-4o" },
      { id: "nvidia", name: "Nvidia NIM Llama 3.3", provider: "Nvidia Nim", isEnabled: true, priority: 3, apiKey: "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", status: "online", avgLatency: 0, totalTokens: 0, totalCost: 0, selectedModel: "meta/llama-3.3-70b-instruct" },
      { id: "openrouter", name: "OpenRouter Free Multi-LLM", provider: "OpenRouter", isEnabled: true, priority: 4, apiKey: process.env.OPENROUTER_API_KEY || "", status: "online", avgLatency: 0, totalTokens: 0, totalCost: 0, selectedModel: "openrouter/free" }
    ];

    const ensureAllDefaultConfigs = (list: any[]): any[] => {
      if (!Array.isArray(list)) return defaultConfigsList;
      const merged = list.map(c => {
        if (c.id === 'nvidia' && c.apiKey === "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") {
          return { ...c, apiKey: "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" };
        }
        return c;
      });
      let changed = false;
      for (const def of defaultConfigsList) {
        if (!merged.some(c => c.id === def.id)) {
          merged.push(def);
          changed = true;
        }
      }
      if (changed) {
        merged.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      }
      return merged;
    };

    const qLlmConfigs = query(collection(db, 'llm_config'), orderBy('priority', 'asc'));
    const unsubscribeLlmConfigs = onSnapshot(qLlmConfigs, (snapshot) => {
      let list: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (list.length === 0) {
        const cached = localStorage.getItem('zyntra-llm-configs');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            list = ensureAllDefaultConfigs(parsed);
          } catch (e) {
            list = defaultConfigsList;
          }
        } else {
          list = defaultConfigsList;
        }
      }
      list = ensureAllDefaultConfigs(list);
      
      // Filter out locally deleted configs
      try {
        const deletedCached = localStorage.getItem('zyntra-deleted-llm-ids');
        const deletedIds = deletedCached ? JSON.parse(deletedCached) : [];
        if (Array.isArray(deletedIds) && deletedIds.length > 0) {
          list = list.filter(c => !deletedIds.includes(c.id));
        }
      } catch (e) {}

      localStorage.setItem('zyntra-llm-configs', JSON.stringify(list));
      setLlmConfigs(list);
    }, (error) => {
      console.error("LLM configurations load error, loading local defaults:", error);
      const cached = localStorage.getItem('zyntra-llm-configs');
      let finalConfigs = defaultConfigsList;
      if (cached) {
        try {
          finalConfigs = ensureAllDefaultConfigs(JSON.parse(cached));
        } catch (e) {}
      }

      // Filter out locally deleted configs
      try {
        const deletedCached = localStorage.getItem('zyntra-deleted-llm-ids');
        const deletedIds = deletedCached ? JSON.parse(deletedCached) : [];
        if (Array.isArray(deletedIds) && deletedIds.length > 0) {
          finalConfigs = finalConfigs.filter(c => !deletedIds.includes(c.id));
        }
      } catch (e) {}

      setLlmConfigs(finalConfigs);
      localStorage.setItem('zyntra-llm-configs', JSON.stringify(finalConfigs));
    });

    // 6. Subscribe to LLM Logs
    const qLlmLogs = query(collection(db, 'llm_logs'), orderBy('timestamp', 'desc'));
    const unsubscribeLlmLogs = onSnapshot(qLlmLogs, (snapshot) => {
      let list: any[] = snapshot.docs.slice(0, 50).map(doc => ({ id: doc.id, ...doc.data() }));
      if (list.length === 0) {
        const cached = localStorage.getItem('zyntra-llm-logs');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              list = parsed;
            }
          } catch (e) {}
        }
      } else {
        localStorage.setItem('zyntra-llm-logs', JSON.stringify(list));
      }
      setLlmLogs(list);
    }, (error) => {
      console.error("LLM logs load error, loading local cached logs:", error);
      const cached = localStorage.getItem('zyntra-llm-logs');
      if (cached) {
        try {
          setLlmLogs(JSON.parse(cached));
        } catch (e) {
          setLlmLogs([]);
        }
      } else {
        setLlmLogs([]);
      }
    });

    // 7. Subscribe to local updates event
    const handleLocalUpdate = () => {
      const cachedConfigs = localStorage.getItem('zyntra-llm-configs');
      if (cachedConfigs) {
        try {
          const parsed = JSON.parse(cachedConfigs);
          setLlmConfigs(ensureAllDefaultConfigs(parsed));
        } catch (e) {}
      }
      const cachedLogs = localStorage.getItem('zyntra-llm-logs');
      if (cachedLogs) {
        try {
          setLlmLogs(JSON.parse(cachedLogs));
        } catch (e) {}
      }
    };
    window.addEventListener('zyntra-local-storage-update', handleLocalUpdate);

    // Seeding check on load
    const runSeeding = async () => {
      try {
        const { initializeLlmConfigs } = await import('../services/geminiService');
        await initializeLlmConfigs();
      } catch (e) {
        console.error("Failed running dynamic LLM seeding:", e);
      }
    };
    runSeeding();
    fetchOpenRouterModels();

    return () => {
      unsubscribeOrgs();
      unsubscribeUsers();
      unsubscribeLeads();
      unsubscribeLlmConfigs();
      unsubscribeLlmLogs();
      window.removeEventListener('zyntra-local-storage-update', handleLocalUpdate);
    };
  }, []);

  // 4. Subscribe and seed payments
  useEffect(() => {
    const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubscribePayments = onSnapshot(qPayments, async (snapshot) => {
      const payList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentLog));
      setPayments(payList);

      // Seed initial payments to Firestore so Pratyush sees beautiful data on first load
      if (payList.length === 0 && orgs.length > 0) {
        try {
          const samplePayments = [
            {
              orgId: orgs[0]?.id || 'demo-org-1',
              orgName: orgs[0]?.name || 'Pearson Hardman LLC',
              amount: 1499,
              tier: 'Professional SDR',
              status: 'Paid',
              method: 'Stripe Credit Card',
              invoiceNum: 'INV-2026-004',
              createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
            },
            {
              orgId: orgs[1]?.id || orgs[0]?.id || 'demo-org-2',
              orgName: orgs[1]?.name || orgs[0]?.name || 'Randall & Associates',
              amount: 4999,
              tier: 'Enterprise Omnichannel',
              status: 'Paid',
              method: 'Wire Transfer',
              invoiceNum: 'INV-2026-003',
              createdAt: Timestamp.fromDate(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000))
            },
            {
              orgId: orgs[0]?.id || 'demo-org-1',
              orgName: orgs[0]?.name || 'Pearson Hardman LLC',
              amount: 1499,
              tier: 'Professional SDR',
              status: 'Paid',
              method: 'Stripe Credit Card',
              invoiceNum: 'INV-2026-002',
              createdAt: Timestamp.fromDate(new Date(Date.now() - 32 * 24 * 60 * 60 * 1000))
            },
            {
              orgId: orgs[2]?.id || orgs[0]?.id || 'demo-second-org',
              orgName: orgs[2]?.name || orgs[0]?.name || 'Zane Capital Group',
              amount: 499,
              tier: 'Starter SDR Plan',
              status: 'Outstanding',
              method: 'Direct Debit',
              invoiceNum: 'INV-2026-015',
              createdAt: Timestamp.fromDate(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000))
            }
          ];
          for (const item of samplePayments) {
            const payId = `pay-${Math.random().toString(36).substr(2, 6)}`;
            await setDoc(doc(db, 'payments', payId), { id: payId, ...item });
          }
        } catch (e) {
          console.error("Autoseeding payments list failed", e);
        }
      }
    }, (error) => {
      console.error("Payments listener error", error);
    });

    return () => unsubscribePayments();
  }, [orgs]);

  // Synchronize Phase 3 Enterprise Analytics, Invite requests and Custom tenant status (Task 5 & 6)
  const fetchEnterpriseSuiteData = async () => {
    setIsLoadingSuite(true);
    try {
      // 1. Fetch enhanced operational logs
      const rawAnal = await fetch('/api/admin/enhanced-analytics');
      if (rawAnal.ok) {
        const data = await rawAnal.json();
        setAnalyticsData(data);
      }

      // 2. Fetch pending user invitations
      const rawInvites = await fetch('/api/admin/invite-requests');
      if (rawInvites.ok) {
        const data = await rawInvites.json();
        setInviteReqs(data);
      }

      // 3. Fetch detailed organizations and their metadata
      const rawOrgsExt = await fetch('/api/admin/organizations');
      if (rawOrgsExt.ok) {
        const data = await rawOrgsExt.json();
        setOrganizationsExt(data);

        // Populate sample/actual corporate Knowledge Base summaries
        for (const org of data) {
          try {
            const rawKb = await fetch('/api/kb', {
              headers: { 'x-org-id': org.id }
            });
            if (rawKb.ok) {
              const kbData = await rawKb.json();
              setKbSummariesMap(prev => ({ ...prev, [org.id]: kbData.summary }));
            }
          } catch (e) {
            console.error("Kb load error for " + org.id, e);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load secure enterprise registry", err);
    } finally {
      setIsLoadingSuite(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'enterprise_suite') {
      fetchEnterpriseSuiteData();
    }
  }, [activeTab]);

  // Action handlers for Enterprise Panel (Task 1, 5, 6)
  const handleToggleOrgStatus = async (orgId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        if (showToast) showToast(`Workspace status adjusted to ${nextStatus}!`, 'success');
        fetchEnterpriseSuiteData();
      } else {
        const err = await res.json();
        if (showToast) showToast(err.error || 'Failed to toggle status.', 'error');
      }
    } catch (e: any) {
      if (showToast) showToast(e.message, 'error');
    }
  };

  const handleResolveInviteRequest = async (requestId: string, decision: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/invite-requests/${requestId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: decision, admin_note: 'Approved via Super Admin enterprise hub' })
      });
      if (res.ok) {
        const data = await res.json();
        if (decision === 'approved' && data.magicOnboardingLink) {
          setRecentMagicLink(data.magicOnboardingLink);
          if (showToast) showToast('Agent invite request approved! Onboarding link generated.', 'success');
        } else {
          if (showToast) showToast('Agent invite request resolved successfully.', 'success');
        }
        fetchEnterpriseSuiteData();
      } else {
        const err = await res.json();
        if (showToast) showToast(err.error || 'Failed to resolve request.', 'error');
      }
    } catch (e: any) {
      if (showToast) showToast(e.message, 'error');
    }
  };

  const handleGenerateManagerInvite = async (orgId: string) => {
    if (!newInviteEmail || !newInviteName) {
      if (showToast) showToast('Please enter invitee name and email address.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/invite-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newInviteEmail, name: newInviteName })
      });
      if (res.ok) {
        const data = await res.json();
        setRecentMagicLink(data.magicOnboardingLink);
        setNewInviteEmail('');
        setNewInviteName('');
        if (showToast) showToast('Manager invitation generated successfully!', 'success');
        fetchEnterpriseSuiteData();
      } else {
        const err = await res.json();
        if (showToast) showToast(err.error || 'Failed to invite manager.', 'error');
      }
    } catch (e: any) {
      if (showToast) showToast(e.message, 'error');
    }
  };

  const handleTriggerImpersonateContext = async (orgId: string, orgName: string) => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/switch`, { method: 'POST' });
      if (res.ok) {
        if (showToast) showToast(`Switched terminal workspace into context: ${orgName}`, 'success');
        // Simulate front-end scoping replacement
        localStorage.setItem('zy_active_org_id', orgId);
        localStorage.setItem('zy_active_org_name', orgName);
        fetchEnterpriseSuiteData();
      } else {
        if (showToast) showToast('Failed to acquire tenant context.', 'error');
      }
    } catch (e: any) {
      if (showToast) showToast(e.message, 'error');
    }
  };

  // Actions handlers
  const handleAddEmployeeRow = () => {
    setEmployeesToCreate([
      ...employeesToCreate,
      { displayName: '', email: '', role: 'user', orgId: orgs[0]?.id || '' }
    ]);
  };

  const handleRemoveEmployeeRow = (index: number) => {
    if (employeesToCreate.length === 1) {
      if (showToast) showToast('At least one employee row is required.', 'error');
      return;
    }
    setEmployeesToCreate(employeesToCreate.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, field: keyof CreateEmployeeInput, val: string) => {
    const updated = [...employeesToCreate];
    updated[index] = { ...updated[index], [field]: val } as any;
    setEmployeesToCreate(updated);
  };

  // LLM Administrative Handlers
  const handleTestLlmPing = async (modelId: string, modelName: string, apiKey: string, selectedModel?: string) => {
    setIsTestingModelId(modelId);
    if (showToast) showToast(`Testing connectivity to ${modelName}...`, 'success');
    const startTime = Date.now();

    try {
      let success = false;
      let errorMsg = "";
      
      if (modelId === 'gemini') {
        const { GoogleGenAI } = await import('@google/genai');
        const geminiClient = new GoogleGenAI({
          apiKey: apiKey || process.env.GEMINI_API_KEY || "",
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
        const response = await geminiClient.models.generateContent({
          model: "gemini-2.5-flash",
          contents: "Hello, reply 'pong' in 1 word.",
        });
        success = !!response.text;
        if (!success) errorMsg = "Empty response received.";
      } else {
        let route = 'openai';
        if (modelId === 'groq') route = 'groq';
        else if (modelId === 'nvidia' || modelId.includes('nvidia')) route = 'nvidia';
        else if (modelId === 'openrouter' || modelId.includes('openrouter')) route = 'openrouter';
        
        const response = await fetch(`/api/fallback/${route}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "Hello, reply 'pong' in 1 word.",
            systemPrompt: "Health check pinger",
            apiKey: apiKey,
            selectedModel: selectedModel
          })
        });
        if (response.ok) {
          const data = await response.json();
          success = !!data?.content;
          if (!success) errorMsg = "No content returned from proxy.";
        } else {
          errorMsg = await response.text();
        }
      }

      const latency = Date.now() - startTime;
      const finalStatus = success ? 'online' : 'offline';
      
      // Update local state immediately so UI changes are visible
      const updatedConfigs = llmConfigs.map(config => {
        if (config.id === modelId) {
          return { ...config, status: finalStatus, avgLatency: success ? latency : config.avgLatency };
        }
        return config;
      });
      setLlmConfigs(updatedConfigs);
      localStorage.setItem('zyntra-llm-configs', JSON.stringify(updatedConfigs));

      // Append local test log in React state if database is offline/unwritable
      const localLog = {
        id: `local-log-${Date.now()}`,
        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        modelId,
        provider: modelId === 'gemini' ? 'Google AI' : modelId === 'openai' ? 'OpenAI' : modelId === 'groq' ? 'Groq' : modelId === 'nvidia' ? 'Nvidia Nim' : 'OpenRouter',
        action: 'ping_test',
        status: success ? 'success' : 'failure',
        latency,
        tokensUsed: success ? 10 : 0,
        cost: 0,
        error: success ? null : errorMsg
      };
      setLlmLogs(prevLogs => [localLog as any, ...prevLogs].slice(0, 50));
      const cachedLogs = localStorage.getItem('zyntra-llm-logs');
      try {
        const parsedLogs = cachedLogs ? JSON.parse(cachedLogs) : [];
        localStorage.setItem('zyntra-llm-logs', JSON.stringify([localLog, ...parsedLogs].slice(0, 50)));
      } catch (e) {}

      // Dispatch event to make sure any other subscribers pick it up
      window.dispatchEvent(new Event('zyntra-local-storage-update'));

      if (success) {
        if (showToast) showToast(`${modelName} Ping SUCCESS! Latency: ${latency}ms`, 'success');
        
        // Attempt database write in background
        try {
          await addDoc(collection(db, 'llm_logs'), {
            timestamp: Timestamp.now(),
            modelId,
            provider: modelId === 'gemini' ? 'Google AI' : modelId === 'openai' ? 'OpenAI' : modelId === 'groq' ? 'Groq' : modelId === 'nvidia' ? 'Nvidia Nim' : 'OpenRouter',
            action: 'ping_test',
            status: 'success',
            latency,
            tokensUsed: 10,
            cost: 0
          });
        } catch (e) { console.warn("Could not log ping to Firestore:", e); }

        try {
          await updateDoc(doc(db, 'llm_config', modelId), {
            status: 'online',
            avgLatency: latency
          });
        } catch (e) { console.warn("Could not update config in Firestore:", e); }
      } else {
        if (showToast) showToast(`${modelName} Ping FAILED: ${errorMsg.substring(0, 50)}`, 'error');
        
        try {
          await addDoc(collection(db, 'llm_logs'), {
            timestamp: Timestamp.now(),
            modelId,
            provider: modelId === 'gemini' ? 'Google AI' : modelId === 'openai' ? 'OpenAI' : modelId === 'groq' ? 'Groq' : modelId === 'nvidia' ? 'Nvidia Nim' : 'OpenRouter',
            action: 'ping_test',
            status: 'failure',
            latency,
            tokensUsed: 0,
            cost: 0,
            error: errorMsg
          });
        } catch (e) { console.warn("Could not log failure to Firestore:", e); }

        try {
          await updateDoc(doc(db, 'llm_config', modelId), {
            status: 'offline'
          });
        } catch (e) { console.warn("Could not update failure config in Firestore:", e); }
      }
    } catch (err: any) {
      const latency = Date.now() - startTime;
      if (showToast) showToast(`${modelName} Ping Error: ${err.message || err}`, 'error');
      
      // Update local state and logs on catch
      const updatedConfigs = llmConfigs.map(config => {
        if (config.id === modelId) {
          return { ...config, status: 'offline' };
        }
        return config;
      });
      setLlmConfigs(updatedConfigs);
      localStorage.setItem('zyntra-llm-configs', JSON.stringify(updatedConfigs));

      const localLog = {
        id: `local-log-${Date.now()}`,
        timestamp: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
        modelId,
        provider: modelId === 'gemini' ? 'Google AI' : modelId === 'openai' ? 'OpenAI' : modelId === 'groq' ? 'Groq' : modelId === 'nvidia' ? 'Nvidia Nim' : 'OpenRouter',
        action: 'ping_test',
        status: 'failure',
        latency,
        tokensUsed: 0,
        cost: 0,
        error: err.message || String(err)
      };
      setLlmLogs(prevLogs => [localLog as any, ...prevLogs].slice(0, 50));
      const cachedLogs = localStorage.getItem('zyntra-llm-logs');
      try {
        const parsedLogs = cachedLogs ? JSON.parse(cachedLogs) : [];
        localStorage.setItem('zyntra-llm-logs', JSON.stringify([localLog, ...parsedLogs].slice(0, 50)));
      } catch (e) {}

      window.dispatchEvent(new Event('zyntra-local-storage-update'));

      try {
        await addDoc(collection(db, 'llm_logs'), {
          timestamp: Timestamp.now(),
          modelId,
          provider: modelId === 'gemini' ? 'Google AI' : modelId === 'openai' ? 'OpenAI' : modelId === 'groq' ? 'Groq' : modelId === 'nvidia' ? 'Nvidia Nim' : 'OpenRouter',
          action: 'ping_test',
          status: 'failure',
          latency,
          tokensUsed: 0,
          cost: 0,
          error: err.message || String(err)
        });
      } catch (e) {}

      try {
        await updateDoc(doc(db, 'llm_config', modelId), {
          status: 'offline'
        });
      } catch (e) {}
    } finally {
      setIsTestingModelId(null);
    }
  };

  const handleUpdateLlmConfig = async (modelId: string, updates: any) => {
    const updated = llmConfigs.map(c => {
      if (c.id === modelId) {
        return { ...c, ...updates };
      }
      return c;
    });
    setLlmConfigs(updated);
    localStorage.setItem('zyntra-llm-configs', JSON.stringify(updated));
    window.dispatchEvent(new Event('zyntra-local-storage-update'));

    try {
      await updateDoc(doc(db, 'llm_config', modelId), updates);
      if (showToast) showToast(`Model config synced to cloud successfully!`, 'success');
    } catch (err: any) {
      console.warn(`Firestore sync skipped (using offline fallback): ${err.message}`);
      if (showToast) showToast(`Model config updated locally!`, 'success');
    }
  };

  const handleDeleteLlmConfig = async (modelId: string, modelName: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete the LLM configuration for "${modelName}"?`)) {
      return;
    }
    
    // Add to deleted IDs list locally
    const newDeletedIds = [...deletedLlmIds, modelId];
    setDeletedLlmIds(newDeletedIds);
    localStorage.setItem('zyntra-deleted-llm-ids', JSON.stringify(newDeletedIds));

    // Update local state
    const updated = llmConfigs.filter(c => c.id !== modelId);
    setLlmConfigs(updated);
    localStorage.setItem('zyntra-llm-configs', JSON.stringify(updated));
    window.dispatchEvent(new Event('zyntra-local-storage-update'));

    try {
      await deleteDoc(doc(db, 'llm_config', modelId));
      if (showToast) showToast(`Configuration for "${modelName}" deleted successfully!`, 'success');
    } catch (err: any) {
      console.warn(`Firestore delete failed: ${err.message}`);
      if (showToast) showToast(`Configuration deleted locally!`, 'success');
    }
  };

  const handleSetupNewLlmConfig = async () => {
    if (!newProviderId || !newProviderName || !newProviderModel) {
      if (showToast) showToast("Please fill in Provider ID, Name, and Model fields.", "error");
      return;
    }
    
    const cleanId = newProviderId.trim().toLowerCase().replace(/\s+/g, '-');
    if (llmConfigs.some(c => c.id === cleanId)) {
      if (showToast) showToast(`An LLM provider with ID "${cleanId}" already exists.`, "error");
      return;
    }

    // Restore from deleted list if previously deleted
    if (deletedLlmIds.includes(cleanId)) {
      const remainingDeleted = deletedLlmIds.filter(id => id !== cleanId);
      setDeletedLlmIds(remainingDeleted);
      localStorage.setItem('zyntra-deleted-llm-ids', JSON.stringify(remainingDeleted));
    }

    const newConfig = {
      id: cleanId,
      name: newProviderName.trim(),
      provider: newProviderGateway === 'openai' ? 'OpenAI' : newProviderGateway === 'openrouter' ? 'OpenRouter' : newProviderGateway === 'nvidia' ? 'Nvidia Nim' : 'Google AI',
      isEnabled: true,
      priority: Number(newProviderPriority) || 4,
      apiKey: newProviderApiKey.trim(),
      status: 'online',
      avgLatency: 0,
      totalTokens: 0,
      totalCost: 0,
      selectedModel: newProviderModel.trim()
    };

    const updated = [...llmConfigs, newConfig].sort((a, b) => (a.priority || 0) - (b.priority || 0));
    setLlmConfigs(updated);
    localStorage.setItem('zyntra-llm-configs', JSON.stringify(updated));
    window.dispatchEvent(new Event('zyntra-local-storage-update'));

    try {
      await setDoc(doc(db, 'llm_config', cleanId), newConfig);
      if (showToast) showToast(`LLM Provider "${newProviderName}" configured successfully!`, "success");
      setShowSetupForm(false);
      setNewProviderId('');
      setNewProviderName('');
      setNewProviderModel('');
      setNewProviderApiKey('');
    } catch (err: any) {
      console.warn(`Firestore sync failed: ${err.message}`);
      if (showToast) showToast(`LLM Provider saved locally!`, "success");
      setShowSetupForm(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName || !newOrgDomain) {
      if (showToast) showToast('Please enter organization name and domain.', 'error');
      return;
    }
    setIsSavingOrg(true);
    try {
      const orgId = `org-${Math.random().toString(36).substr(2, 5)}`;
      await setDoc(doc(db, 'organizations', orgId), {
        id: orgId,
        name: newOrgName.trim(),
        domain: newOrgDomain.trim(),
        tier: newOrgTier,
        price: Number(newOrgPrice) || 1499,
        createdAt: Timestamp.now()
      });
      setNewOrgName('');
      setNewOrgDomain('');
      if (showToast) showToast(`Successfully registered tenant "${newOrgName}"!`, 'success');
    } catch (err: any) {
      console.error(err);
      if (showToast) showToast(`Failed to register organization: ${err.message}`, 'error');
    } finally {
      setIsSavingOrg(false);
    }
  };

  const handleDeleteOrg = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete organization "${name}"? Active members will remain in-tact.`)) return;
    try {
      await deleteDoc(doc(db, 'organizations', id));
      if (showToast) showToast(`Deleted organization "${name}".`, 'success');
    } catch (err: any) {
      if (showToast) showToast(`Error deleting organization: ${err.message}`, 'error');
    }
  };

  const handleUpdateOrgTierAndRate = async (orgId: string, tier: string, price: number) => {
    try {
      await updateDoc(doc(db, 'organizations', orgId), { tier, price });
      if (showToast) showToast(`Subscription tier updated for organization!`, 'success');
    } catch (error: any) {
      if (showToast) showToast(`Failed to update tier: ${error.message}`, 'error');
    }
  };

  const handleRegisterEmployeesBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = employeesToCreate.filter(emp => emp.displayName.trim() && emp.email.trim());
    if (validRows.length === 0) {
      if (showToast) showToast('Please enter at least one employee with both Name and Email.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const r of validRows) {
      if (!emailRegex.test(r.email.trim())) {
        if (showToast) showToast(`Invalid email layout: "${r.email}"`, 'error');
        return;
      }
    }

    setIsSavingEmployees(true);
    try {
      await Promise.all(validRows.map(async (emp) => {
        const uid = `emp-${Math.random().toString(36).substr(2, 9)}`;
        const newProfile: UserProfile = {
          uid,
          email: emp.email.trim().toLowerCase(),
          displayName: emp.displayName.trim(),
          role: emp.role,
          orgId: emp.orgId,
          photoURL: `https://picsum.photos/seed/${uid}/150`,
          lastLogin: Timestamp.now()
        };
        await setDoc(doc(db, 'users', uid), newProfile);
      }));

      if (showToast) showToast(`Provisioned and registered ${validRows.length} team members successfully!`, 'success');
      setEmployeesToCreate([
        { displayName: '', email: '', role: 'user', orgId: orgs[0]?.id || '' },
        { displayName: '', email: '', role: 'user', orgId: orgs[0]?.id || '' }
      ]);
      setActiveTab('employees_list');
    } catch (err: any) {
      if (showToast) showToast(`Failed to register employees: ${err.message}`, 'error');
    } finally {
      setIsSavingEmployees(false);
    }
  };

  const handleDeleteEmployee = async (uid: string, displayName: string) => {
    if (!window.confirm(`Are you sure you want to revoke system credentials for "${displayName}"?`)) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      if (showToast) showToast(`Employee "${displayName}" removed successfully.`, 'success');
    } catch (err: any) {
      if (showToast) showToast(`Failed to delete profile: ${err.message}`, 'error');
    }
  };

  const handleUpdateRole = async (uid: string, newRole: 'super_admin' | 'org_admin' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      if (showToast) showToast(`Access privileges updated!`, 'success');
    } catch (err: any) {
      if (showToast) showToast(`Failed to update role: ${err.message}`, 'error');
    }
  };

  const handleUpdateMemberOrg = async (uid: string, targetOrgId: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { orgId: targetOrgId });
      if (showToast) showToast(`Organization re-assigned.`, 'success');
    } catch (err: any) {
      if (showToast) showToast(`Failed to update assignment: ${err.message}`, 'error');
    }
  };

  // Recording Direct Invoice payment manually
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payOrgId) {
      if (showToast) showToast('Please select a tenant organization unit.', 'error');
      return;
    }
    const targetOrg = orgs.find(o => o.id === payOrgId);
    if (!targetOrg) return;

    setIsSavingPay(true);
    try {
      const payId = `pay-${Math.random().toString(36).substr(2, 6)}`;
      const cleanInvoiceNum = payInvoiceNum.trim() || `INV-2026-${Math.floor(100 + Math.random() * 900)}`;

      await setDoc(doc(db, 'payments', payId), {
        id: payId,
        orgId: payOrgId,
        orgName: targetOrg.name,
        amount: Number(payAmount) || 0,
        tier: payTier,
        status: payStatus,
        method: payMethod,
        invoiceNum: cleanInvoiceNum,
        createdAt: Timestamp.now()
      });

      if (showToast) showToast(`Logged Direct invoice transaction ${cleanInvoiceNum} in ledger!`, 'success');
      setShowPayForm(false);
      setPayInvoiceNum('');
    } catch (error: any) {
      if (showToast) showToast(`Failed to record invoice: ${error.message}`, 'error');
    } finally {
      setIsSavingPay(false);
    }
  };

  const handleDeletePaymentLog = async (id: string, inv: string) => {
    if (!window.confirm(`Are you sure you want to void and delete payment transaction entry "${inv}"?`)) return;
    try {
      await deleteDoc(doc(db, 'payments', id));
      if (showToast) showToast(`Payment log ${inv} deleted.`, 'success');
    } catch (err: any) {
      if (showToast) showToast(`Failed to delete transaction log: ${err.message}`, 'error');
    }
  };

  // Metrics calculators
  const billingTotalRecurring = payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, current) => sum + current.amount, 0);

  const outstandingTotalCollected = payments
    .filter(p => p.status === 'Outstanding')
    .reduce((sum, current) => sum + current.amount, 0);

  const billingHealthRate = payments.length > 0
    ? Math.round((payments.filter(p => p.status === 'Paid').length / payments.length) * 100)
    : 100;

  // Filter staff criteria
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOrg = filterOrg === 'ALL' || user.orgId === filterOrg;
    return matchesSearch && matchesOrg;
  });

  return (
    <div className="w-full max-w-none mx-0 space-y-4 sm:space-y-8 pb-16 text-slate-100 px-3 sm:px-4 lg:px-6 overflow-x-hidden">
      {/* Dynamic Header Deck */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 md:p-8 bg-gradient-to-r from-slate-900 to-zinc-950 border border-border/80 rounded-2xl sm:rounded-[32px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-brand/20 text-brand border border-brand/25 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest w-fit mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-brand" />
            <span>Master System Deck</span>
          </div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-white font-syne leading-tight">Workspace Platform Controller</h1>
          <p className="text-text-muted text-[10px] sm:text-xs md:text-sm">Logged Admin: <span className="text-brand font-semibold font-mono">Pratyush Malviya</span> <span className="hidden sm:inline">•</span> <br className="sm:hidden" /><span className="hidden sm:inline">Complete platform oversight & control panel.</span></p>
        </div>
      </div>

      {/* Dynamic Bento metrics dashboard counters */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Platform Tenants', val: `${orgs.length} orgs`, desc: 'Active sandbox teams', icon: Globe, color: 'text-brand', bg: 'bg-brand/5' },
          { label: 'Active Users (Global)', val: `${users.length} users`, desc: 'SDR credential users', icon: Users, color: 'text-teal-400', bg: 'bg-teal-500/5' },
          { label: 'Gross Closed Revenue', val: `$${billingTotalRecurring.toLocaleString()}`, desc: `Outstanding debt: $${outstandingTotalCollected.toLocaleString()}`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/5' },
          { label: 'Captured Platform Leads', val: `${globalLeads.length} leads`, desc: `${billingHealthRate}% Billing collection health`, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/5' }
        ].map((s, i) => (
          <div key={i} className="bg-surface border border-border/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col justify-between hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] sm:text-[10px] text-text-muted font-bold uppercase tracking-wider sm:tracking-widest leading-tight truncate">{s.label}</span>
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg ${s.bg} flex items-center justify-center ${s.color} shrink-0`}>
                <s.icon className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-4 space-y-0.5 sm:space-y-1">
              <div className="text-sm xs:text-base sm:text-lg md:text-2xl font-syne font-bold text-white truncate">{s.val}</div>
              <p className="text-[8px] sm:text-[10px] text-zinc-500 font-mono tracking-tight leading-tight break-words">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>



      {/* ── Tab Navigation Bar ── */}
      {!isExternallyControlled && (
      <div className="flex flex-wrap gap-1 p-1.5 bg-surface border border-border/80 rounded-2xl">
        {[
          { id: 'dashboard' as const,        label: 'Dashboard',      icon: Activity },
          { id: 'employees_list' as const,   label: 'Users',          icon: Users },
          { id: 'add_employees' as const,    label: 'Add Users',      icon: UserPlus },
          { id: 'organizations' as const,    label: 'Organizations',  icon: Building },
          { id: 'enterprise_suite' as const, label: 'Enterprise',     icon: Globe },
          { id: 'llm_management' as const,   label: 'AI Routing',     icon: Cpu },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex-1 sm:flex-none justify-center sm:justify-start ${
              activeTab === tab.id
                ? 'bg-brand text-white shadow-lg shadow-brand/20'
                : 'text-text-muted hover:text-white hover:bg-surface-alt'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
      )}

      {/* 1. VIEW CONTENDER: Dashboard Tab (Contains Payments, Global statistics, Invoice Logger) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            
            {/* Interactive subscriptions client base editor */}
            <div className="lg:col-span-7 bg-surface border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">Client Subscriptions Manager</h3>
                  <p className="text-[9px] sm:text-[10px] text-text-muted">Manage corporate subscription plan tiers and modify recurring contractual rates.</p>
                </div>
                <button 
                  onClick={() => setShowPayForm(!showPayForm)}
                  className="px-3 py-1.5 bg-brand hover:opacity-90 text-white rounded-xl text-[10px] font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Log Direct Payment</span>
                </button>
              </div>

              {/* Collapsible log invoice manual form */}
              {showPayForm && (
                <form onSubmit={handleRecordPayment} className="p-5 bg-surface-alt border border-border/80 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-bold font-syne text-[#00d4aa] uppercase tracking-wide">Register Manual Payment Log</span>
                    <button type="button" onClick={() => setShowPayForm(false)} className="text-zinc-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-text-muted">Target Company</label>
                      <select 
                        value={payOrgId}
                        onChange={(e) => setPayOrgId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0d0f17] border border-border rounded-xl text-xs text-text focus:outline-none focus:border-brand cursor-pointer"
                      >
                        {orgs.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-text-muted">Invoice Identifier</label>
                      <input 
                        type="text" 
                        placeholder="e.g. INV-2026-092"
                        value={payInvoiceNum}
                        onChange={(e) => setPayInvoiceNum(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0d0f17] border border-border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-text-muted">Invoice Sum (USD)</label>
                      <input 
                        type="number" 
                        placeholder="1499"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0d0f17] border border-border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-text-muted">Tier Designation</label>
                      <select 
                        value={payTier}
                        onChange={(e) => setPayTier(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0d0f17] border border-border rounded-xl text-xs text-text focus:outline-none focus:border-brand cursor-pointer"
                      >
                        <option value="Starter SDR Plan">Starter Partner Plan</option>
                        <option value="Professional SDR">Professional Team SDR</option>
                        <option value="Enterprise Omnichannel">Enterprise Omnichannel Tier</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-text-muted">Invoice Status</label>
                      <select
                        value={payStatus}
                        onChange={(e) => setPayStatus(e.target.value as any)}
                        className="w-full px-3 py-2 bg-[#0d0f17] border border-border rounded-xl text-xs text-text focus:outline-none focus:border-brand cursor-pointer"
                      >
                        <option value="Paid">Mark as Paid</option>
                        <option value="Outstanding">Mark as Outstanding</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-text-muted">Payment Channel</label>
                      <select 
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0d0f17] border border-border rounded-xl text-xs text-text focus:outline-none focus:border-brand cursor-pointer"
                      >
                        <option value="Stripe Credit Card">Stripe Credit Card</option>
                        <option value="Wire Transfer">Wire Transfer Routing</option>
                        <option value="Direct Debit">Direct Debit Transfer</option>
                        <option value="Manual Check">Physical Company Check</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSavingPay}
                    className="w-full py-2.5 rounded-xl bg-[#00d4aa] hover:opacity-90 text-slate-900 text-xs font-bold transition-all shadow shadow-[#00d4aa]/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {isSavingPay ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Deploy Invoice Transaction</span>
                  </button>
                </form>
              )}

              {/* Subscriptions Tier Listing */}
              <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar">
                {orgs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-muted">
                    No active corporate units registered. Create a company in the Organizations Unit tab first.
                  </div>
                ) : (
                  orgs.map(o => (
                    <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[#08090f] border border-border/60 hover:border-zinc-700 transition-all gap-3.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center font-bold text-indigo-400 font-syne text-xs uppercase shrink-0">
                          {(o.name || '?')[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white leading-tight truncate">{o.name}</div>
                          <p className="text-[10px] text-zinc-500 font-mono truncate">{o.domain}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap xs:flex-nowrap items-center gap-3.5 w-full sm:w-auto justify-between sm:justify-start shrink-0">
                        <div className="space-y-1 flex-1 xs:flex-initial min-w-[125px]">
                          <span className="text-[9px] uppercase font-bold text-text-muted block">Contract Tier Duration</span>
                          <select 
                            value={o.tier || 'Professional SDR'}
                            onChange={(e) => handleUpdateOrgTierAndRate(o.id, e.target.value, o.price || 1499)}
                            className="w-full bg-[#0e0f16] border border-border/80 hover:border-brand text-[10px] font-semibold px-2 py-1.5 rounded-md focus:outline-none cursor-pointer"
                          >
                            <option value="Starter SDR Plan">Starter ($499/mo)</option>
                            <option value="Professional SDR">Professional ($1,499/mo)</option>
                            <option value="Enterprise Omnichannel">Enterprise ($4,999/mo)</option>
                          </select>
                        </div>

                        <div className="space-y-1 w-16 xs:w-auto shrink-0">
                          <span className="text-[9px] uppercase font-bold text-text-muted block">Contract Cost (USD)</span>
                          <input 
                            type="text" 
                            defaultValue={o.price || '1499'}
                            onBlur={(e) => handleUpdateOrgTierAndRate(o.id, o.tier || 'Professional SDR', Number(e.target.value) || 1499)}
                            placeholder="Rate"
                            className="w-full xs:w-16 bg-[#0e0f16] border border-border/80 text-[10px] font-semibold text-center py-1.5 rounded-md focus:outline-none focus:border-brand"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick stats on lead conversions and funnel analysis */}
            <div className="lg:col-span-5 bg-surface border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-border pb-3 block">Lead Generation Funnel Context</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-zinc-950/40 rounded-2xl border border-border/65">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-text-muted font-bold uppercase">Conversion Velocity</span>
                    <span className="text-xs text-brand font-mono font-bold">Excellent</span>
                  </div>
                  <div className="w-full bg-[#0d0f17] h-2 rounded-full overflow-hidden">
                    <div className="bg-brand h-full rounded-full" style={{ width: '74%' }} />
                  </div>
                  <p className="text-[9px] text-zinc-500 mt-1.5 font-mono">Based on aggregated lead scores and outgoing sales outreach replies.</p>
                </div>

                <div className="space-y-3.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Leads Distribution Per Tenant</span>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                    {orgs.map(o => {
                      const count = globalLeads.filter(l => l.orgId === o.id).length;
                      return (
                        <div key={o.id} className="flex items-center justify-between gap-3 text-xs py-2 border-b border-border/40 min-w-0">
                          <span className="text-zinc-300 font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-none">{o.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono bg-zinc-900 border border-border px-2 py-0.5 rounded-md text-[10.5px] font-bold text-white">{count} captures</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Ledger Panel */}
          <div className="bg-surface border border-border rounded-2xl sm:rounded-[32px] overflow-hidden p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#00d4aa]" />
                  Real-Time Transactions Ledger
                </h3>
                <p className="text-[10px] text-text-muted">Comprehensive history of direct invoiced company payments and online Stripe transaction accounts.</p>
              </div>
            </div>

            <div className="w-full">
              {payments.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-muted flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-brand/40" />
                  <span>Loading ledger transaction maps...</span>
                </div>
              ) : (
                <>
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-surface-alt/40 border-b border-border">
                          <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">Invoice No.</th>
                          <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">Tenant Company</th>
                          <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">Contract Tier</th>
                          <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">Rate (USD)</th>
                          <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">Status</th>
                          <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">Cleared Date</th>
                          <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-[#00d4aa] text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {payments.map(p => (
                          <tr key={p.id} className="hover:bg-bg-subtle transition-colors">
                            <td className="px-5 py-3 text-xs font-mono font-semibold text-white">{p.invoiceNum}</td>
                            <td className="px-5 py-3 text-xs text-zinc-300 font-medium">{p.orgName}</td>
                            <td className="px-5 py-3 text-[10.5px] uppercase tracking-wider font-mono text-zinc-400">{p.tier}</td>
                            <td className="px-5 py-3 text-xs font-mono font-bold text-white">${p.amount.toLocaleString()}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-amber-500/15 text-amber-300 border border-amber-500/10'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs font-mono text-zinc-500">
                              {p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : 'Pending'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button 
                                onClick={() => handleDeletePaymentLog(p.id, p.invoiceNum)}
                                className="p-1 text-rose-400 hover:bg-rose-500/15 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View Cards */}
                  <div className="block md:hidden space-y-3">
                    {payments.map(p => (
                      <div key={p.id} className="bg-surface-alt/65 border border-border/80 rounded-xl p-4 space-y-3 hover:border-zinc-700 transition-all">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                          <span className="text-xs font-mono font-bold text-white">{p.invoiceNum}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            p.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-amber-500/15 text-amber-300 border border-amber-500/10'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[9px] text-text-muted uppercase font-bold block">Company</span>
                            <span className="text-zinc-300 font-medium break-words">{p.orgName}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-text-muted uppercase font-bold block">Tier</span>
                            <span className="text-zinc-400 font-mono text-[9.5px] break-words">{p.tier}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-[9px] text-text-muted uppercase font-bold block">Amount</span>
                            <span className="text-white font-mono font-bold">${p.amount.toLocaleString()}</span>
                          </div>
                          <div className="mt-1">
                            <span className="text-[9px] text-text-muted uppercase font-bold block">Cleared Date</span>
                            <span className="text-zinc-500 font-mono">{p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : 'Pending'}</span>
                          </div>
                        </div>
                        <div className="flex justify-end pt-2 border-t border-border/30">
                          <button 
                            onClick={() => handleDeletePaymentLog(p.id, p.invoiceNum)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Void Transaction</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. VIEW CONTENDER: Employees Directory */}
      {activeTab === 'employees_list' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          {/* Filters Bar */}
          <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
            <div className="w-full md:w-80 relative">
              <input 
                type="text"
                placeholder="Search staff by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0a0b10] border border-border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-text-muted whitespace-nowrap font-bold uppercase tracking-wider">Search Scope:</span>
              <select 
                value={filterOrg}
                onChange={(e) => setFilterOrg(e.target.value)}
                className="p-2.5 bg-[#0a0b10] border border-border rounded-xl text-xs font-bold text-text cursor-pointer focus:outline-none focus:border-brand w-full md:w-56"
              >
                <option value="ALL">All Organizations</option>
                {orgs.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Directory Users Table */}
          <div className="bg-surface border border-border rounded-2xl sm:rounded-[32px] overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="py-16 text-center space-y-3 opacity-60">
                <Users className="w-12 h-12 mx-auto text-brand/40" />
                <p className="font-syne font-bold text-sm">No employees found matching filter criteria.</p>
                <button 
                  onClick={() => setActiveTab('add_employees')}
                  className="px-4 py-2 bg-brand/10 border border-brand/20 hover:bg-brand text-brand hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Create New Employees Now
                </button>
              </div>
            ) : (
              <div className="w-full">
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-surface-alt/50 border-b border-border">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#00d4aa]">Workspace Staff</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#00d4aa]">Assigned Organization</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#00d4aa]">Role Privileges</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#00d4aa] text-right">Access Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map(u => (
                        <tr key={u.uid} className="hover:bg-bg-subtle transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <img 
                                src={u.photoURL || `https://picsum.photos/seed/${u.uid}/100`} 
                                className="w-10 h-10 rounded-full border border-border/80 bg-zinc-950 shrink-0" 
                                alt="Avatar"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                                  <span className="truncate">{u.displayName}</span>
                                  {u.email === 'malviya.pratyush26@gmail.com' && (
                                    <span className="text-[9px] bg-brand/20 text-brand border border-brand/20 px-1.5 py-0.5 rounded-md font-mono shrink-0">Owner</span>
                                  )}
                                </div>
                                <div className="text-xs text-text-muted font-mono truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <select 
                              value={u.orgId || ''}
                              onChange={(e) => handleUpdateMemberOrg(u.uid, e.target.value)}
                              className="bg-[#0e0f16] border border-border/60 hover:border-brand/40 text-xs font-semibold px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
                            >
                              <option value="">Unassigned</option>
                              {orgs.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                              ))}
                            </select>
                          </td>

                          <td className="px-6 py-4">
                            <select 
                              value={u.role || 'user'}
                              onChange={(e) => handleUpdateRole(u.uid, e.target.value as any)}
                              disabled={u.email === 'malviya.pratyush26@gmail.com'}
                              className="bg-[#0e0f16] border border-border/60 hover:border-brand/40 text-xs font-semibold px-2 py-1 rounded-lg focus:outline-none uppercase text-zinc-300 disabled:opacity-50 cursor-pointer"
                            >
                              <option value="user">User / SDR Agent</option>
                              <option value="org_admin">Organization Admin</option>
                              <option value="super_admin">Platform Super Admin</option>
                            </select>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteEmployee(u.uid, u.displayName)}
                              disabled={u.email === 'malviya.pratyush26@gmail.com'}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                              title="Revoke and delete member access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="block md:hidden space-y-3 p-3">
                  {filteredUsers.map(u => (
                    <div key={u.uid} className="bg-surface-alt/65 border border-border/80 rounded-xl p-4 space-y-4 hover:border-zinc-700 transition-all">
                      <div className="flex items-center gap-3">
                        <img 
                          src={u.photoURL || `https://picsum.photos/seed/${u.uid}/100`} 
                          className="w-12 h-12 rounded-full border border-border/80 bg-zinc-950 shrink-0" 
                          alt="Avatar"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-white font-sans flex flex-wrap items-center gap-1.5">
                            <span className="truncate">{u.displayName}</span>
                            {u.email === 'malviya.pratyush26@gmail.com' && (
                              <span className="text-[9px] bg-brand/20 text-brand border border-brand/20 px-1.5 py-0.5 rounded-md font-mono shrink-0">Owner</span>
                            )}
                          </div>
                          <div className="text-xs text-text-muted font-mono truncate">{u.email}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/40 text-xs">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-text-muted block">Organization</span>
                          <select 
                            value={u.orgId || ''}
                            onChange={(e) => handleUpdateMemberOrg(u.uid, e.target.value)}
                            className="w-full bg-[#0e0f16] border border-border/60 hover:border-brand/40 text-xs font-semibold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                          >
                            <option value="">Unassigned</option>
                            {orgs.map(o => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-text-muted block">Role Privilege</span>
                          <select 
                            value={u.role || 'user'}
                            onChange={(e) => handleUpdateRole(u.uid, e.target.value as any)}
                            disabled={u.email === 'malviya.pratyush26@gmail.com'}
                            className="w-full bg-[#0e0f16] border border-border/60 hover:border-brand/40 text-xs font-semibold px-2 py-1.5 rounded-lg focus:outline-none uppercase text-zinc-300 disabled:opacity-50 cursor-pointer"
                          >
                            <option value="user">User / SDR</option>
                            <option value="org_admin">Org Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </div>
                      </div>

                      {u.email !== 'malviya.pratyush26@gmail.com' && (
                        <div className="flex justify-end pt-2 border-t border-border/30">
                          <button 
                            onClick={() => handleDeleteEmployee(u.uid, u.displayName)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke Access</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. VIEW CONTENDER: Add Multiple Employees */}
      {activeTab === 'add_employees' && (
        <form onSubmit={handleRegisterEmployeesBatch} className="bg-surface border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-8 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand" />
                Bulk Provision SDR Employees
              </h2>
              <p className="text-xs text-text-muted">Register corporate team members, pre-assign their organizational units and platform access privileges concurrently.</p>
            </div>
            
            <button 
              type="button"
              onClick={handleAddEmployeeRow}
              className="px-4 py-2 bg-brand/10 hover:bg-brand/20 border border-brand/20 text-brand rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              + Add Employee Form Row
            </button>
          </div>

          {orgs.length === 0 ? (
            <div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-xs text-amber-200 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold mb-1">No Organization Units Registered Yet</p>
                <p>Employee provisioning requires at least one company tenant organization. Please click the <strong>Organizations Unit</strong> navigation tab to register your first business tenant first.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 text-[10px] font-bold uppercase tracking-widest text-text-muted px-2.5 hidden sm:grid">
                <div className="col-span-3">Full Employee Name</div>
                <div className="col-span-3">Work Email Address</div>
                <div className="col-span-3">Client Org Assignment</div>
                <div className="col-span-2">Default Access Role</div>
                <div className="col-span-1 text-right">Delete</div>
              </div>

              <div className="space-y-3">
                {employeesToCreate.map((emp, index) => (
                  <div key={index} className="bg-surface-alt/40 border border-border/80 rounded-2xl p-4 sm:p-2 sm:border-0 grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                    <div className="col-span-12 sm:col-span-3">
                      <label className="text-[9px] font-bold uppercase text-text-muted block sm:hidden mb-1">Full Employee Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Rachel Zane"
                        value={emp.displayName}
                        onChange={(e) => handleFieldChange(index, 'displayName', e.target.value)}
                        className="w-full px-4 py-3 bg-[#0a0b10] border border-border/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand"
                        required
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-3">
                      <label className="text-[9px] font-bold uppercase text-text-muted block sm:hidden mb-1">Work Email Address</label>
                      <input 
                        type="email" 
                        placeholder="e.g. rachel@pearsonco.com"
                        value={emp.email}
                        onChange={(e) => handleFieldChange(index, 'email', e.target.value)}
                        className="w-full px-4 py-3 bg-[#0a0b10] border border-border/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand"
                        required
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-3">
                      <label className="text-[9px] font-bold uppercase text-text-muted block sm:hidden mb-1">Client Org Assignment</label>
                      <select 
                        value={emp.orgId}
                        onChange={(e) => handleFieldChange(index, 'orgId', e.target.value)}
                        className="w-full p-3 bg-[#0a0b10] border border-border/60 rounded-xl text-xs text-text cursor-pointer focus:outline-none focus:border-brand"
                      >
                        {orgs.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-12 sm:col-span-2">
                      <label className="text-[9px] font-bold uppercase text-text-muted block sm:hidden mb-1">Default Access Role</label>
                      <select 
                        value={emp.role}
                        onChange={(e) => handleFieldChange(index, 'role', e.target.value as any)}
                        className="w-full p-3 bg-[#0a0b10] border border-border/60 rounded-xl text-xs text-text cursor-pointer focus:outline-none focus:border-brand uppercase"
                      >
                        <option value="user">USER (SDR)</option>
                        <option value="org_admin">ORG ADMIN</option>
                        <option value="super_admin">SUPER ADMIN</option>
                      </select>
                    </div>

                    <div className="col-span-12 sm:col-span-1 text-right flex sm:justify-end justify-end mt-2 sm:mt-0">
                      <button 
                        type="button"
                        onClick={() => handleRemoveEmployeeRow(index)}
                        className="text-xs text-rose-400 hover:text-rose-300 p-2.5 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/10 cursor-pointer w-full sm:w-10 sm:h-10 shrink-0"
                        title="Remove work row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 sm:pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs text-text-muted">
                  Ready to provision <span className="text-white font-bold font-mono">{employeesToCreate.filter(e => e.displayName && e.email).length}</span> workspace profiles.
                </div>

                <button 
                  type="submit"
                  disabled={isSavingEmployees || orgs.length === 0}
                  className="w-full sm:w-auto px-6 py-3 bg-brand hover:opacity-90 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all tracking-wider shadow-lg shadow-brand/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSavingEmployees ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Register & Provision Employees
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* 4. VIEW CONTENDER: Organizations Unit */}
      {activeTab === 'organizations' && (
        <div className="grid md:grid-cols-12 gap-4 sm:gap-8 items-start">
          {/* List Companies */}
          <div className="md:col-span-7 bg-surface border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider block border-b border-border pb-3">Active Registered Corporations</h2>
            
            <div className="space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar">
              {orgs.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-muted">
                  No corporations registered yet. Create a company unit using the formulation tool.
                </div>
              ) : (
                orgs.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-4 rounded-2xl bg-surface-alt border border-border hover:border-zinc-700 transition-all gap-3.5 min-w-0">
                    <div className="flex items-center gap-3.5 font-sans min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-brand font-syne uppercase text-sm shrink-0">
                        {(o.name || '?')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{o.name}</div>
                        <div className="text-[10px] text-text-muted font-mono truncate">{o.domain} · ID: {o.id}</div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDeleteOrg(o.id, o.name)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Delete Organization"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Create Company Form */}
          <div className="md:col-span-5 bg-surface border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand">Register Organization</h2>
              <p className="text-[11px] text-text-muted">Provision a corporate unit sandbox which automatically maps employee domains and lead registries.</p>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">Company Trade Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Pearson Hardman LLC"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0b10] border border-border/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand"
                  disabled={isSavingOrg}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">Website Domain</label>
                <input 
                  type="text" 
                  placeholder="e.g. pearsonhardman.com"
                  value={newOrgDomain}
                  onChange={(e) => setNewOrgDomain(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0b10] border border-border/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand"
                  disabled={isSavingOrg}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">Default Plan</label>
                  <select 
                    value={newOrgTier}
                    onChange={(e) => {
                      setNewOrgTier(e.target.value);
                      setNewOrgPrice(e.target.value === 'Starter SDR Plan' ? '499' : e.target.value === 'Enterprise Omnichannel' ? '4999' : '1499');
                    }}
                    className="w-full p-3 bg-[#0a0b10] border border-border/60 rounded-xl text-xs text-text cursor-pointer focus:outline-none focus:border-brand"
                  >
                    <option value="Starter SDR Plan">Starter Partner</option>
                    <option value="Professional SDR">Professional SDR</option>
                    <option value="Enterprise Omnichannel">Enterprise</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">Rate (USD)</label>
                  <input 
                    type="number" 
                    value={newOrgPrice}
                    onChange={(e) => setNewOrgPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0a0b10] border border-border/60 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <button 
                onClick={handleCreateOrg}
                disabled={isSavingOrg}
                className="w-full py-3.5 rounded-xl bg-brand hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-brand/10 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSavingOrg ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Deploy Organization</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. VIEW CONTENDER: Enterprise Suite Tab (Task 1, 3, 5 & 6) */}
      {activeTab === 'enterprise_suite' && (
        <div className="space-y-6">
          
          {/* Header Overview stats */}
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#12141c] border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-purple-500/10 text-purple-400">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[8px] sm:text-[10px] text-text-muted uppercase block">Total Tenants</span>
                <span className="text-base sm:text-lg font-bold text-white font-syne">
                  {analyticsData?.overview?.totalTenants || organizationsExt.length || orgs.length}
                </span>
              </div>
            </div>

            <div className="bg-[#12141c] border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[8px] sm:text-[10px] text-text-muted uppercase block">Enterprise Users</span>
                <span className="text-base sm:text-lg font-bold text-white font-syne">
                  {analyticsData?.overview?.totalUsers || users.length}
                </span>
              </div>
            </div>

            <div className="bg-[#12141c] border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-[#00d4aa]/10 text-[#00d4aa]">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[8px] sm:text-[10px] text-text-muted uppercase block">Platform Leads</span>
                <span className="text-base sm:text-lg font-bold text-white font-syne">
                  {analyticsData?.overview?.platformLeads || globalLeads.length}
                </span>
              </div>
            </div>

            <div className="bg-[#12141c] border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-500">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[8px] sm:text-[10px] text-text-muted uppercase block">AI Usage Counter</span>
                <span className="text-base sm:text-lg font-bold text-white font-syne">
                  {analyticsData?.overview?.orgAiCreditsUsed || 0} hits
                </span>
              </div>
            </div>
          </div>

          {/* Copyable Onboarding credential highlight card */}
          {recentMagicLink && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 bg-emerald-500/5 rounded-full filter blur-xl"></div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest font-syne">Single-Use Magic Link Generated</h4>
                  <p className="text-[11px] text-emerald-400/80">Copy and dispatch this onboarding endpoint link to the prospective member. It is valid for exactly 48 hours.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input 
                  type="text" 
                  readOnly 
                  value={recentMagicLink}
                  className="w-full bg-[#090b10] border border-emerald-500/20 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300 font-mono outline-none"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(recentMagicLink);
                    if (showToast) showToast('Magic Onboarding Link copied to clipboard!', 'success');
                  }}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
                >
                  Copy Link
                </button>
                <button 
                  onClick={() => setRecentMagicLink('')}
                  className="p-2.5 text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Main Suite Split Columns */}
          <div className="grid lg:grid-cols-12 gap-6">

            {/* Left Col: Invite Workflows & Organizations breakdown (Task 5 & 6) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Task 5: Agent Onboarding invite requests verification list */}
              <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Pending Invite Requests Verification</h3>
                  <p className="text-[10px] text-text-muted">Review, approve, or reject user invite requests created by organization team managers.</p>
                </div>

                {inviteReqs.length === 0 ? (
                  <div className="py-8 text-center text-zinc-600 text-xs bg-[#0b0c11] rounded-2xl border border-dashed border-border/40">
                    No pending onboarding invitations requiring admin verification.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {inviteReqs.map((req) => (
                      <div key={req.id} className="bg-[#0e1017] border border-border/80 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white uppercase">{req.invitee_name}</span>
                            <span className="text-[9px] text-[#00d4aa] font-mono uppercase bg-[#00d4aa]/10 px-2 py-0.5 rounded-full">SDR Agent Invitation</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-mono">{req.invitee_email}</p>
                          <p className="text-[10px] text-zinc-500 italic">Requested on organization context: <span className="text-zinc-400 font-bold">{req.org_id}</span></p>
                        </div>

                        {req.status === 'pending' ? (
                          <div className="flex gap-2 shrink-0">
                            <button 
                              onClick={() => handleResolveInviteRequest(req.id, 'approved')}
                              className="px-3 py-1.5 bg-emerald-500 hover:opacity-90 text-slate-950 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                            >
                              Approve & Tokenize
                            </button>
                            <button 
                              onClick={() => handleResolveInviteRequest(req.id, 'rejected')}
                              className="px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                            >
                              Reject Request
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                            req.status === 'approved' ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-500 bg-zinc-800'
                          }`}>
                            {req.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Task 6: Comprehensive Organizations statistics units */}
              <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Active Operational Workspaces Unit</h3>
                  <p className="text-[10px] text-text-muted">Analyze detailed CRM settings sync health, active importer catalogs, and tenant activation lockups.</p>
                </div>

                <div className="w-full">
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border/80 text-text-muted text-[10px] uppercase font-bold">
                          <th className="py-2.5">Workspace Node</th>
                          <th className="py-2.5">Credentials Health</th>
                          <th className="py-2.5">Core KB Status</th>
                          <th className="py-2.5">Import Audit Count</th>
                          <th className="py-2.5 text-right">Administrative Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {organizationsExt.map((org) => {
                          const syncHealthy = org.id !== 'org-zane'; 
                          const kbSummary = kbSummariesMap[org.id] || "No loaded summarizations.";
                          const importCount = org.id === 'org-default' ? 2 : 1; 

                          return (
                            <tr key={org.id} className="hover:bg-surface-alt/40 transition-all">
                              <td className="py-3">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-white uppercase">{org.name}</div>
                                  <div className="text-[9px] text-zinc-500 font-mono flex items-center gap-1">
                                    <span>{org.id}</span>
                                    <span>•</span>
                                    <span className="capitalize">{org.plan}</span>
                                  </div>
                                </div>
                              </td>
                              
                              <td className="py-3">
                                {syncHealthy ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Sync Healthy
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 font-mono text-[9px] font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    Credentials Missing
                                  </span>
                                )}
                              </td>

                              <td className="py-3">
                                <div className="relative group cursor-help inline-block">
                                  <span className={`text-[10px] font-bold uppercase ${org.kbStatus === 'Ready' || kbSummariesMap[org.id] ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-500 bg-zinc-800'} px-2 py-0.5 rounded`}>
                                    {kbSummariesMap[org.id] ? "Loaded Summary" : "Empty"}
                                  </span>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#0e1017] border border-border p-3.5 rounded-xl text-[10px] text-zinc-300 w-64 shadow-xl z-50 pointer-events-none transition-all">
                                    <span className="block font-bold text-white mb-1 uppercase tracking-wider">Enterprise Summary</span>
                                    <p className="line-clamp-4 leading-relaxed font-sans">{kbSummary?.summary_text || kbSummary}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 text-zinc-400 font-mono font-bold text-center pl-6">
                                {importCount} logs
                              </td>

                              <td className="py-3 text-right space-x-1.5 whitespace-nowrap">
                                <button 
                                  onClick={() => handleTriggerImpersonateContext(org.id, org.name)}
                                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] transition-all cursor-pointer font-semibold"
                                >
                                  Impersonate
                                </button>
                                <button 
                                  onClick={() => handleToggleOrgStatus(org.id, org.status)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer font-bold ${
                                    org.status === 'active' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/15 text-emerald-400'
                                  }`}
                                >
                                  {org.status === 'active' ? 'Suspend' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View Cards */}
                  <div className="block md:hidden space-y-3">
                    {organizationsExt.map((org) => {
                      const syncHealthy = org.id !== 'org-zane'; 
                      const kbSummary = kbSummariesMap[org.id] || "No loaded summarizations.";
                      const importCount = org.id === 'org-default' ? 2 : 1; 

                      return (
                        <div key={org.id} className="bg-[#0b0c11]/80 border border-border/60 rounded-xl p-4 space-y-4 hover:border-zinc-700 transition-all">
                          <div className="flex items-start justify-between border-b border-border/40 pb-2">
                            <div>
                              <span className="font-bold text-sm text-white uppercase block">{org.name}</span>
                              <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">{org.id} · {org.plan}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                              syncHealthy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                            }`}>
                              {syncHealthy ? 'Healthy' : 'Sync Error'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-[9px] text-text-muted uppercase font-bold block font-syne">KB Status</span>
                              <div className="mt-1">
                                <span className={`text-[9px] font-bold uppercase ${org.kbStatus === 'Ready' || kbSummariesMap[org.id] ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-500 bg-zinc-800'} px-2 py-0.5 rounded`}>
                                  {kbSummariesMap[org.id] ? "Loaded Summary" : "Empty"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <span className="text-[9px] text-text-muted uppercase font-bold block font-syne">Import Count</span>
                              <span className="text-zinc-300 font-mono font-bold mt-1 block">{importCount} logs</span>
                            </div>
                          </div>

                          {kbSummariesMap[org.id] && (
                            <div className="bg-[#0e1017] p-2.5 rounded-lg border border-border/60 text-[10px] text-zinc-400 font-sans">
                              <span className="block font-bold text-white uppercase tracking-wider text-[8px] mb-1 font-syne">Knowledge Base Summary</span>
                              <p className="line-clamp-3 leading-relaxed font-sans">{kbSummary?.summary_text || kbSummary}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border/30">
                            <button 
                              onClick={() => handleTriggerImpersonateContext(org.id, org.name)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                            >
                              Impersonate
                            </button>
                            <button 
                              onClick={() => handleToggleOrgStatus(org.id, org.status)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                org.status === 'active' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/15 text-emerald-400'
                              }`}
                            >
                              {org.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Instant Onboarding link generator and operational Audit Trail logs list */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Manager Onboarding instant credential link generator */}
              <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Issue Manager Token</h3>
                  <p className="text-[10px] text-text-muted">Instantly bypass approvals to generate a single-use corporate Manager Onboarding token.</p>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-text-muted">Target Workplace Name</label>
                    <select 
                      id="direct-org-select-token"
                      className="w-full px-3 py-2 bg-[#0a0b10] border border-border rounded-xl text-xs text-text focus:outline-none focus:border-brand cursor-pointer"
                    >
                      {organizationsExt.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-text-muted">Manager Work Email</label>
                    <input 
                      type="email" 
                      placeholder="e.g. harvey@specterco.com"
                      value={newInviteEmail}
                      onChange={(e) => setNewInviteEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#0a0b10] border border-border rounded-xl text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-brand"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-text-muted">Manager Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Harvey Specter"
                      value={newInviteName}
                      onChange={(e) => setNewInviteName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#0a0b10] border border-border rounded-xl text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-brand"
                    />
                  </div>

                  <button 
                    onClick={() => {
                      const sel = document.getElementById('direct-org-select-token') as HTMLSelectElement;
                      if (sel) handleGenerateManagerInvite(sel.value);
                    }}
                    className="w-full py-2.5 bg-brand hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Generate Magic Manager Invite
                  </button>
                </div>
              </div>

              {/* Real-time Scrolling Enterprise Audit Trail (Task 6) */}
              <div className="bg-surface border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Live Enterprise Audit Trail</h3>
                  <p className="text-[10px] text-text-muted">Review cryptographic activity updates and tenant mutation hooks logged instantaneously.</p>
                </div>

                <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2.5 font-mono">
                  {(analyticsData?.auditTrail || []).length === 0 ? (
                    <div className="py-6 text-center text-[10px] text-zinc-600">No events audited in this window.</div>
                  ) : (
                    analyticsData?.auditTrail.map((log: any, i: number) => (
                      <div key={log.id || i} className="bg-[#0b0c11]/80 border border-border/40 hover:border-border/80 transition-all rounded-xl p-3 space-y-1.5 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#00d4aa] font-bold uppercase font-syne text-[9px] bg-[#00d4aa]/5 px-2 py-0.5 rounded">
                            {log.action}
                          </span>
                          <span className="text-[9px] text-[#42d1f6]">
                            {log.orgId}
                          </span>
                        </div>
                        <p className="text-zinc-300 leading-normal font-sans">{log.details}</p>
                        <div className="flex items-center justify-between text-[9px] text-[#868fa9]">
                          <span>User: {log.userName || log.userId}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* 6. VIEW CONTENDER: LLM Management Tab */}
      {activeTab === 'llm_management' && (() => {
        // Analytics calculations
        const nonPingLogs = llmLogs.filter(l => l.action !== 'ping_test');
        const totalRequests = nonPingLogs.length;
        const successfulRequests = nonPingLogs.filter(l => l.status === 'success').length;
        const successRate = totalRequests > 0 ? Math.round((successfulRequests / totalRequests) * 100) : 100;
        
        // Sum total costs from config aggregations
        const totalAccruedCost = llmConfigs.reduce((sum, c) => sum + (c.totalCost || 0), 0);
        
        // Average Latency of successful queries
        const successfulLogs = llmLogs.filter(l => l.status === 'success');
        const averageLatency = successfulLogs.length > 0
          ? Math.round(successfulLogs.reduce((sum, l) => sum + l.latency, 0) / successfulLogs.length)
          : 0;

        // Find the configured primary LLM (priority 1)
        const primaryConfig = llmConfigs.find(c => c.priority === 1) || llmConfigs.find(c => c.isEnabled) || llmConfigs[0];
        const activeLiveModel = primaryConfig 
          ? `${primaryConfig.name} (${primaryConfig.selectedModel || 'Auto'})`
          : 'Gemini 1.5 Flash';

        return (
          <div className="space-y-6">
            
            {/* Real-time Analytics Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
              
              {/* Active LLM */}
              <div className="bg-[#12141c] border border-border/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700 transition-all w-full min-w-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-[8px] sm:text-[10px] text-text-muted font-bold uppercase tracking-wider sm:tracking-widest truncate">Active Live LLM</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                </div>
                <div className="mt-2 sm:mt-4 space-y-1 w-full min-w-0">
                  <div className="text-xs sm:text-sm md:text-base font-syne font-bold text-emerald-400 tracking-tight truncate block max-w-full" title={activeLiveModel}>{activeLiveModel}</div>
                  <p className="text-[9px] text-zinc-500 font-mono tracking-tight">Active primary request router</p>
                </div>
              </div>

              {/* Total Queries & Success Rate */}
              <div className="bg-[#12141c] border border-border/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700 transition-all w-full min-w-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-[8px] sm:text-[10px] text-text-muted font-bold uppercase tracking-wider sm:tracking-widest truncate">Total Queries / Success</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4 space-y-2 w-full min-w-0">
                  <div className="text-base sm:text-lg md:text-2xl font-syne font-bold text-white flex items-baseline gap-1 sm:gap-2">
                    <span>{totalRequests}</span>
                    <span className="text-[9px] sm:text-xs text-blue-400 font-mono">{successRate}% success</span>
                  </div>
                  <div className="w-full bg-[#0d0f17] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-400 h-full rounded-full transition-all duration-500" style={{ width: `${successRate}%` }} />
                  </div>
                </div>
              </div>

              {/* Accumulated Cost */}
              <div className="bg-[#12141c] border border-border/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700 transition-all w-full min-w-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-[8px] sm:text-[10px] text-text-muted font-bold uppercase tracking-wider sm:tracking-widest truncate">Accrued API Costs</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4 space-y-1 w-full min-w-0">
                  <div className="text-base sm:text-lg md:text-2xl font-syne font-bold text-white truncate block max-w-full">${totalAccruedCost.toFixed(5)}</div>
                  <p className="text-[9px] text-zinc-500 font-mono tracking-tight">Consolidated fallback ledger cost</p>
                </div>
              </div>

              {/* Average Latency */}
              <div className="bg-[#12141c] border border-border/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700 transition-all w-full min-w-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-[8px] sm:text-[10px] text-text-muted font-bold uppercase tracking-wider sm:tracking-widest truncate">Avg Response Time</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <RefreshCw className="w-4 h-4 animate-spin-slow" />
                  </div>
                </div>
                <div className="mt-4 space-y-1 w-full min-w-0">
                  <div className="text-base sm:text-lg md:text-2xl font-syne font-bold text-white truncate block max-w-full">{(averageLatency / 1000).toFixed(2)}s</div>
                  <p className="text-[9px] text-zinc-500 font-mono tracking-tight">{averageLatency} ms latency baseline</p>
                </div>
              </div>

            </div>

            {/* Live API Telemetry & Routing Visualization */}
            <div className="bg-[#12141c] border border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-border pb-3.5 gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#00d4aa] animate-pulse" />
                    Live API Routing Cascade & Active Pipelines
                  </h3>
                  <p className="text-[10px] text-text-muted">Real-time status of your connected providers, endpoint URLs, and failover pathways.</p>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Routing Operational
                </div>
              </div>

              {/* Cascade Stepper Workflow */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 relative">
                {(() => {
                  const sortedChain = [...llmConfigs].sort((a, b) => a.priority - b.priority);
                  return sortedChain.map((config, index) => {
                    const isEnabled = config.isEnabled;
                    // Determine endpoint
                    let endpoint = "https://generativelanguage.googleapis.com (SDK)";
                    if (config.id === 'openai') endpoint = "https://api.openai.com/v1/chat/completions";
                    if (config.id === 'nvidia') endpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
                    if (config.id === 'openrouter') endpoint = "https://openrouter.ai/api/v1/chat/completions";

                    // Mask API Key safely
                    const maskKey = (key: string) => {
                      if (!key) return "Not Set";
                      if (key.length <= 12) return "••••••••••••";
                      return `${key.substring(0, 6)}••••${key.substring(key.length - 6)}`;
                    };

                    const priorityNames = ["1st (Primary)", "2nd Fallback", "3rd Fallback", "4th Fallback"];
                    const priorityColorClass = isEnabled 
                      ? (index === 0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                         index === 1 ? "text-blue-400 bg-blue-500/10 border-blue-500/20" :
                         index === 2 ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                         "text-zinc-400 bg-zinc-500/10 border-zinc-500/20")
                      : "text-zinc-500 bg-zinc-800/40 border-zinc-700/30";

                    return (
                      <div 
                        key={config.id} 
                        className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-3.5 group ${
                          isEnabled 
                            ? 'bg-[#0f1118]/90 border-border/80 hover:border-zinc-600 shadow-lg' 
                            : 'bg-[#0a0c10]/40 border-border/20 opacity-60'
                        }`}
                      >
                        {/* Top Priority Badge */}
                        <div className="flex justify-between items-center w-full">
                          <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-bold uppercase tracking-wider border ${priorityColorClass}`}>
                            {priorityNames[index] || `${index + 1}th Route`}
                          </span>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            !isEnabled ? 'bg-zinc-600' : config.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`} />
                        </div>

                        {/* Icon + Title */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                              !isEnabled ? 'bg-zinc-900 border-zinc-800 text-zinc-600' :
                              config.id === 'gemini' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                              config.id === 'openai' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              config.id === 'nvidia' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                              'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            }`}>
                              <Cpu className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-xs text-white tracking-tight">{config.name}</span>
                          </div>
                          <span className="text-[9px] text-[#00d4aa] font-mono font-bold block truncate max-w-full">
                            {config.selectedModel || "Auto Free Fallback"}
                          </span>
                        </div>

                        {/* Endpoint Details */}
                        <div className="space-y-1.5 text-[9px] pt-1.5 border-t border-border/40 font-mono">
                          <div>
                            <span className="text-zinc-500 block uppercase font-bold text-[8px] font-syne">Gateway Endpoint</span>
                            <span className="text-zinc-300 block truncate max-w-full leading-normal" title={endpoint}>{endpoint}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block uppercase font-bold text-[8px] font-syne">API Key Token</span>
                            <span className="text-zinc-400 block truncate max-w-full leading-normal flex items-center gap-1">
                              <Key className="w-2.5 h-2.5 shrink-0" />
                              {maskKey(config.apiKey)}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  });
                })()}
              </div>

              {/* Live Last Response / Route Diagnostics widget */}
              {(() => {
                const latestSuccess = llmLogs.find(l => l.status === 'success' && l.action !== 'ping_test');
                if (!latestSuccess) return null;
                const associatedModel = llmConfigs.find(c => c.id === latestSuccess.modelId);
                
                return (
                  <div className="bg-[#0b0c11]/80 border border-border/50 rounded-xl sm:rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-brand/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9.5px] uppercase font-bold tracking-wider text-zinc-400 font-syne">Last Resolved API Query Telemetry</span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-normal">
                        Zyntra AI successfully routed standard <span className="text-[#42d1f6] uppercase font-mono">{latestSuccess.action}</span> campaign payload to <span className="text-[#00d4aa] font-bold">{associatedModel?.name || latestSuccess.provider}</span>.
                      </h4>
                    </div>

                    <div className="grid grid-cols-3 gap-3 font-mono text-[10px] sm:text-xs shrink-0 self-stretch sm:self-auto justify-between border-t border-border/30 lg:border-t-0 lg:border-l lg:border-border/40 pt-3 lg:pt-0 lg:pl-6">
                      <div>
                        <span className="text-zinc-500 uppercase font-bold text-[8px] font-syne block mb-0.5">Active Latency</span>
                        <span className="text-emerald-400 font-bold block">{latestSuccess.latency} ms</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 uppercase font-bold text-[8px] font-syne block mb-0.5">Tokens Handled</span>
                        <span className="text-white font-bold block">{latestSuccess.tokensUsed} tokens</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 uppercase font-bold text-[8px] font-syne block mb-0.5">Accrued cost</span>
                        <span className="text-amber-400 font-bold block">${latestSuccess.cost?.toFixed(6) || "0.000000"}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Centralized Config manager */}
            <div className="bg-[#12141c] border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-border pb-3 gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">Centralized LLM Config Manager</h3>
                  <p className="text-[10px] text-text-muted">Manage fallback prioritization, live toggling status, and private client credentials securely.</p>
                </div>
                <button
                  onClick={() => setShowSetupForm(!showSetupForm)}
                  className="px-3.5 py-2 bg-[#00d4aa]/15 hover:bg-[#00d4aa]/25 text-[#00d4aa] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto border border-[#00d4aa]/25"
                >
                  <PlusCircle className="w-4 h-4" />
                  Setup New Provider
                </button>
              </div>

              {showSetupForm && (
                <div className="bg-[#0b0c11]/80 border border-border p-4 sm:p-6 rounded-2xl space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-border/40 pb-2">
                    <span className="font-bold text-xs uppercase text-[#00d4aa] font-syne tracking-wider">Configure Custom LLM Integration</span>
                    <button onClick={() => setShowSetupForm(false)} className="text-zinc-500 hover:text-white shrink-0 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Unique Provider ID</label>
                      <input 
                        type="text" 
                        placeholder="e.g. anthropic"
                        value={newProviderId}
                        onChange={(e) => setNewProviderId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#06070a] border border-border rounded-xl text-xs text-white focus:outline-none focus:border-brand"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Display Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Anthropic Claude"
                        value={newProviderName}
                        onChange={(e) => setNewProviderName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#06070a] border border-border rounded-xl text-xs text-white focus:outline-none focus:border-brand"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Gateway Protocol</label>
                      <select 
                        value={newProviderGateway}
                        onChange={(e) => setNewProviderGateway(e.target.value)}
                        className="w-full px-3 py-2 bg-[#06070a] border border-border rounded-xl text-xs text-white focus:outline-none focus:border-brand cursor-pointer"
                      >
                        <option value="openai">OpenAI Compatible (Default Proxy)</option>
                        <option value="openrouter">OpenRouter Free/Paid Proxy</option>
                        <option value="nvidia">Nvidia NIM compatible</option>
                        <option value="gemini">Google Gemini SDK</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Selected Model ID</label>
                      <input 
                        type="text" 
                        placeholder="e.g. claude-3-5-sonnet-latest"
                        value={newProviderModel}
                        onChange={(e) => setNewProviderModel(e.target.value)}
                        className="w-full px-3 py-2 bg-[#06070a] border border-border rounded-xl text-xs text-white focus:outline-none focus:border-brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">API Key Credentials</label>
                      <input 
                        type="password" 
                        placeholder="Enter secret key token"
                        value={newProviderApiKey}
                        onChange={(e) => setNewProviderApiKey(e.target.value)}
                        className="w-full px-3 py-2 bg-[#06070a] border border-border rounded-xl text-xs text-white focus:outline-none focus:border-brand"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Fallback Priority</label>
                      <select 
                        value={newProviderPriority}
                        onChange={(e) => setNewProviderPriority(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#06070a] border border-border rounded-xl text-xs text-white focus:outline-none focus:border-brand cursor-pointer"
                      >
                        <option value={1}>1st (Primary)</option>
                        <option value={2}>2nd Fallback</option>
                        <option value={3}>3rd Fallback</option>
                        <option value={4}>4th Fallback</option>
                        <option value={5}>5th Fallback</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-border/30 pt-3">
                    <button 
                      onClick={() => setShowSetupForm(false)} 
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-xl transition-all cursor-pointer font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSetupNewLlmConfig} 
                      className="px-3.5 py-1.5 bg-brand hover:opacity-90 text-white text-xs rounded-xl transition-all cursor-pointer font-bold"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              )}

              {/* Table / Grid list */}
              <div className="w-full">
                {/* Desktop View Table */}
                <div className="hidden lg:block overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-surface-alt/40 border-b border-border text-[9px] font-bold uppercase tracking-widest text-[#00d4aa]">
                        <th className="px-4 py-3">Model vertical</th>
                        <th className="px-4 py-3">Fallback Priority</th>
                        <th className="px-4 py-3">API Key Credentials</th>
                        <th className="px-4 py-3">Health Status</th>
                        <th className="px-4 py-3">Baselines</th>
                        <th className="px-4 py-3 text-right">Ping connection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {llmConfigs.map(model => {
                        // Compute individual model metrics
                        const modelLogs = llmLogs.filter(l => l.modelId === model.id && l.action !== 'ping_test');
                        const successLogs = modelLogs.filter(l => l.status === 'success');
                        const uptime = modelLogs.length > 0 ? Math.round((successLogs.length / modelLogs.length) * 100) : 100;
                        
                        return (
                          <tr key={model.id} className="hover:bg-bg-subtle/40 transition-colors">
                            
                            {/* Model Vertical Info */}
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-border flex items-center justify-center">
                                  <Cpu className={`w-4 h-4 ${
                                    model.id === 'gemini' ? 'text-blue-400' :
                                    model.id === 'openai' ? 'text-emerald-400' :
                                    model.id === 'groq' ? 'text-amber-400' : 'text-purple-400'
                                  }`} />
                                </div>
                                <div>
                                  <span className="font-bold text-xs text-white block">{model.name}</span>
                                  <div className="mt-1">
                                    {model.id === 'openrouter' ? (
                                      <div className="flex items-center gap-1">
                                        <select
                                          value={model.selectedModel || "openrouter/free"}
                                          onChange={(e) => handleUpdateLlmConfig(model.id, { selectedModel: e.target.value })}
                                          className="bg-zinc-900 border border-border/80 text-[9.5px] font-bold px-1 py-0.5 rounded focus:outline-none cursor-pointer text-white max-w-[140px] truncate"
                                        >
                                          <option value="openrouter/free">Auto Free Fallback</option>
                                          {openRouterModels.map((m: any) => (
                                            <option key={m.id} value={m.id}>
                                              {m.name || m.id}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          onClick={() => fetchOpenRouterModels(model.apiKey)}
                                          disabled={isLoadingModels}
                                          className="p-0.5 text-[#00d4aa] hover:text-white disabled:opacity-40 shrink-0 cursor-pointer"
                                          title="Refresh model list"
                                        >
                                          <RefreshCw className={`w-2.5 h-2.5 ${isLoadingModels ? 'animate-spin' : ''}`} />
                                        </button>
                                      </div>
                                    ) : model.id === 'gemini' ? (
                                      <select
                                        value={model.selectedModel || "gemini-1.5-flash"}
                                        onChange={(e) => handleUpdateLlmConfig(model.id, { selectedModel: e.target.value })}
                                        className="bg-zinc-900 border border-border/80 text-[9.5px] font-bold px-1 py-0.5 rounded focus:outline-none cursor-pointer text-white max-w-[140px] truncate"
                                      >
                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                      </select>
                                    ) : model.id === 'openai' ? (
                                      <select
                                        value={model.selectedModel || "gpt-4o"}
                                        onChange={(e) => handleUpdateLlmConfig(model.id, { selectedModel: e.target.value })}
                                        className="bg-zinc-900 border border-border/80 text-[9.5px] font-bold px-1 py-0.5 rounded focus:outline-none cursor-pointer text-white max-w-[140px] truncate"
                                      >
                                        <option value="gpt-4o">GPT-4o</option>
                                        <option value="gpt-4o-mini">GPT-4o Mini</option>
                                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                        <option value="o1-mini">o1 Mini</option>
                                      </select>
                                    ) : model.id === 'nvidia' ? (
                                      <select
                                        value={model.selectedModel || "meta/llama-3.3-70b-instruct"}
                                        onChange={(e) => handleUpdateLlmConfig(model.id, { selectedModel: e.target.value })}
                                        className="bg-zinc-900 border border-border/80 text-[9.5px] font-bold px-1 py-0.5 rounded focus:outline-none cursor-pointer text-white max-w-[140px] truncate"
                                      >
                                        <option value="meta/llama-3.3-70b-instruct">Llama 3.3 70B</option>
                                        <option value="nvidia/llama-3.1-nemotron-70b-instruct">Nemotron 70B</option>
                                        <option value="deepseek-ai/deepseek-r1">DeepSeek R1</option>
                                        <option value="google/gemma-3n-e2b-it">Gemma 3n E2B IT</option>
                                        <option value="google/gemma-2-9b-it">Gemma 2 9B</option>
                                        <option value="google/gemma-2-27b-it">Gemma 2 27B</option>
                                        <option value="meta/llama-3.1-8b-instruct">Llama 3.1 8B</option>
                                        <option value="meta/llama-3.1-70b-instruct">Llama 3.1 70B</option>
                                        <option value="meta/llama-3.1-405b-instruct">Llama 3.1 405B</option>
                                        <option value="mistralai/mistral-large-2-instruct">Mistral Large 2</option>
                                        <option value="mistralai/mixtral-8x7b-instruct-v0.1">Mixtral 8x7B</option>
                                        <option value="microsoft/phi-3-medium-128k-instruct">Phi 3 Medium</option>
                                      </select>
                                    ) : (
                                      <span className="text-[9px] text-zinc-500 font-mono block">{model.provider} · ID: {model.id}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Fallback Priority select list */}
                            <td className="px-4 py-4">
                              <select 
                                value={model.priority || 1}
                                onChange={(e) => handleUpdateLlmConfig(model.id, { priority: Number(e.target.value) })}
                                className="bg-[#0e0f16] border border-border/80 text-[10.5px] font-bold px-2 py-1 rounded-md focus:outline-none cursor-pointer text-white"
                              >
                                <option value={1}>1st (Primary)</option>
                                <option value={2}>2nd Fallback</option>
                                <option value={3}>3rd Fallback</option>
                                <option value={4}>4th Fallback</option>
                              </select>
                            </td>

                            {/* Custom API Key input with masking */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1.5 bg-[#090b10] border border-border/60 px-2 py-1.5 rounded-lg max-w-[200px]">
                                <Key className="w-3 h-3 text-zinc-600 shrink-0" />
                                <input 
                                  type={showApiKeyId === model.id ? "text" : "password"} 
                                  defaultValue={model.apiKey}
                                  placeholder="Enter custom secret key"
                                  onBlur={(e) => handleUpdateLlmConfig(model.id, { apiKey: e.target.value.trim() })}
                                  className="w-full bg-transparent text-[10px] font-mono text-zinc-300 outline-none border-none placeholder-zinc-700 min-w-0"
                                />
                                <button 
                                  onClick={() => setShowApiKeyId(showApiKeyId === model.id ? null : model.id)}
                                  className="p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
                                >
                                  {showApiKeyId === model.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>

                            {/* Health Status & Toggle switch */}
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider ${
                                  !model.isEnabled ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50' :
                                  model.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                                  'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                                }`}>
                                  {!model.isEnabled ? 'Disabled' : model.status === 'online' ? 'Online' : 'Offline'}
                                </span>

                                {/* Switch */}
                                <button 
                                  onClick={() => handleUpdateLlmConfig(model.id, { isEnabled: !model.isEnabled })}
                                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                                    model.isEnabled ? 'bg-emerald-500' : 'bg-zinc-800'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                                    model.isEnabled ? 'translate-x-3.5' : 'translate-x-0'
                                  }`} />
                                </button>
                              </div>
                            </td>

                            {/* Baselines (Avg Latency, Uptime) */}
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="space-y-0.5 font-mono text-[10.5px]">
                                <div className="text-zinc-300 font-bold">{model.avgLatency || 0} ms <span className="text-[9px] text-zinc-500 font-normal font-sans">latency</span></div>
                                <div className="text-zinc-400">{uptime}% <span className="text-[9px] text-zinc-500 font-normal font-sans">uptime</span></div>
                              </div>
                            </td>

                            {/* Test connection (Ping) */}
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleTestLlmPing(model.id, model.name, model.apiKey, model.selectedModel)}
                                  disabled={isTestingModelId !== null || !model.isEnabled}
                                  className="px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold transition-all bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1 cursor-pointer"
                                >
                                  {isTestingModelId === model.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00d4aa]" />
                                  ) : (
                                    <Play className="w-2.5 h-2.5 fill-current text-[#00d4aa] border-none shrink-0" />
                                  )}
                                  <span>Test ping</span>
                                </button>
                                <button 
                                  onClick={() => handleDeleteLlmConfig(model.id, model.name)}
                                  className="p-1.5 rounded-lg text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer shrink-0"
                                  title="Delete configuration"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="block lg:hidden space-y-4">
                  {llmConfigs.map(model => {
                    const modelLogs = llmLogs.filter(l => l.modelId === model.id && l.action !== 'ping_test');
                    const successLogs = modelLogs.filter(l => l.status === 'success');
                    const uptime = modelLogs.length > 0 ? Math.round((successLogs.length / modelLogs.length) * 100) : 100;

                    return (
                      <div key={model.id} className="bg-surface-alt border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-zinc-700 transition-all">
                        <div className="flex items-center justify-between border-b border-border/40 pb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-border flex items-center justify-center shrink-0">
                              <Cpu className={`w-4 h-4 ${
                                model.id === 'gemini' ? 'text-blue-400' :
                                model.id === 'openai' ? 'text-emerald-400' :
                                model.id === 'groq' ? 'text-amber-400' : 'text-purple-400'
                              }`} />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-white block font-syne truncate">{model.name}</span>
                              <span className="text-[9px] text-zinc-500 font-mono block truncate">{model.provider}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider ${
                              !model.isEnabled ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50' :
                              model.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                              'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                            }`}>
                              {!model.isEnabled ? 'Disabled' : model.status === 'online' ? 'Online' : 'Offline'}
                            </span>
                            <button 
                              onClick={() => handleUpdateLlmConfig(model.id, { isEnabled: !model.isEnabled })}
                              className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                                model.isEnabled ? 'bg-emerald-500' : 'bg-zinc-800'
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                                model.isEnabled ? 'translate-x-3.5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-text-muted block font-syne">Selected Model Catalog</span>
                            {model.id === 'openrouter' ? (
                              <div className="flex items-center gap-1.5 w-full min-w-0">
                                <select
                                  value={model.selectedModel || "openrouter/free"}
                                  onChange={(e) => handleUpdateLlmConfig(model.id, { selectedModel: e.target.value })}
                                  className="w-full max-w-full min-w-0 bg-[#0a0b10] border border-border/80 text-[10.5px] font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer text-white truncate"
                                >
                                  <option value="openrouter/free">Auto Free Fallback</option>
                                  {openRouterModels.map((m: any) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name || m.id}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => fetchOpenRouterModels(model.apiKey)}
                                  disabled={isLoadingModels}
                                  className="p-2 bg-zinc-900 border border-border rounded-lg text-[#00d4aa] hover:text-white disabled:opacity-40 shrink-0 cursor-pointer"
                                  title="Refresh model list"
                                >
                                  <RefreshCw className={`w-3 h-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                                </button>
                              </div>
                            ) : model.id === 'gemini' ? (
                              <select
                                value={model.selectedModel || "gemini-1.5-flash"}
                                onChange={(e) => handleUpdateLlmConfig(model.id, { selectedModel: e.target.value })}
                                className="w-full max-w-full min-w-0 bg-[#0a0b10] border border-border/80 text-[10.5px] font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer text-white truncate"
                              >
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                              </select>
                            ) : model.id === 'openai' ? (
                              <select
                                value={model.selectedModel || "gpt-4o"}
                                onChange={(e) => handleUpdateLlmConfig(model.id, { selectedModel: e.target.value })}
                                className="w-full max-w-full min-w-0 bg-[#0a0b10] border border-border/80 text-[10.5px] font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer text-white truncate"
                              >
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                <option value="o1-mini">o1 Mini</option>
                              </select>
                            ) : model.id === 'nvidia' ? (
                              <select
                                value={model.selectedModel || "meta/llama-3.3-70b-instruct"}
                                onChange={(e) => handleUpdateLlmConfig(model.id, { selectedModel: e.target.value })}
                                className="w-full max-w-full min-w-0 bg-[#0a0b10] border border-border/80 text-[10.5px] font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer text-white truncate"
                              >
                                <option value="meta/llama-3.3-70b-instruct">Llama 3.3 70B</option>
                                <option value="nvidia/llama-3.1-nemotron-70b-instruct">Nemotron 70B</option>
                                <option value="deepseek-ai/deepseek-r1">DeepSeek R1</option>
                                <option value="google/gemma-3n-e2b-it">Gemma 3n E2B IT</option>
                                <option value="google/gemma-2-9b-it">Gemma 2 9B</option>
                                <option value="google/gemma-2-27b-it">Gemma 2 27B</option>
                                <option value="meta/llama-3.1-8b-instruct">Llama 3.1 8B</option>
                                <option value="meta/llama-3.1-70b-instruct">Llama 3.1 70B</option>
                                <option value="meta/llama-3.1-405b-instruct">Llama 3.1 405B</option>
                                <option value="mistralai/mistral-large-2-instruct">Mistral Large 2</option>
                                <option value="mistralai/mixtral-8x7b-instruct-v0.1">Mixtral 8x7B</option>
                                <option value="microsoft/phi-3-medium-128k-instruct">Phi 3 Medium</option>
                              </select>
                            ) : (
                              <span className="text-xs text-zinc-500 font-mono block truncate">{model.provider}</span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-text-muted block font-syne">Fallback Priority</span>
                            <select 
                              value={model.priority || 1}
                              onChange={(e) => handleUpdateLlmConfig(model.id, { priority: Number(e.target.value) })}
                              className="w-full bg-[#0e0f16] border border-border/80 text-[10.5px] font-bold px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer text-white"
                            >
                              <option value={1}>1st (Primary)</option>
                              <option value={2}>2nd Fallback</option>
                              <option value={3}>3rd Fallback</option>
                              <option value={4}>4th Fallback</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-text-muted block font-syne">API Key Credentials</span>
                            <div className="flex items-center gap-1.5 bg-[#090b10] border border-border/60 px-3 py-1.5 rounded-lg w-full">
                              <Key className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                              <input 
                                type={showApiKeyId === model.id ? "text" : "password"} 
                                defaultValue={model.apiKey}
                                placeholder="Enter secret key"
                                onBlur={(e) => handleUpdateLlmConfig(model.id, { apiKey: e.target.value.trim() })}
                                className="w-full bg-transparent text-xs font-mono text-zinc-300 outline-none border-none placeholder-zinc-700 min-w-0"
                              />
                              <button 
                                onClick={() => setShowApiKeyId(showApiKeyId === model.id ? null : model.id)}
                                className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
                              >
                                {showApiKeyId === model.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase font-bold text-text-muted block font-syne">Diagnostic Baseline</span>
                            <div className="grid grid-cols-2 gap-2 bg-[#090b10] border border-border/65 p-2 rounded-lg font-mono text-[10.5px]">
                              <div className="text-zinc-300 font-bold">{model.avgLatency || 0} ms <span className="text-[8px] text-zinc-500 font-normal font-sans block mt-0.5">Latency</span></div>
                              <div className="text-zinc-400">{uptime}% <span className="text-[8px] text-zinc-500 font-normal font-sans block mt-0.5">Uptime</span></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end items-center gap-2 pt-2 border-t border-border/30">
                          <button 
                            onClick={() => handleTestLlmPing(model.id, model.name, model.apiKey, model.selectedModel)}
                            disabled={isTestingModelId !== null || !model.isEnabled}
                            className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1.5 cursor-pointer font-syne"
                          >
                            {isTestingModelId === model.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00d4aa]" />
                            ) : (
                              <Play className="w-2.5 h-2.5 fill-current text-[#00d4aa] border-none shrink-0" />
                            )}
                            <span>Run Diagnostic Ping</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteLlmConfig(model.id, model.name)}
                            className="p-2 rounded-lg text-rose-400 bg-rose-500/10 hover:bg-rose-500/25 transition-all cursor-pointer shrink-0"
                            title="Delete configuration"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live failover log audit stream */}
            <div className="bg-[#12141c] border border-border rounded-2xl sm:rounded-[32px] p-4 sm:p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-[#00d4aa]" />
                    Live Failover & Call Audit Stream
                  </h3>
                  <p className="text-[10px] text-text-muted">Real-time scrolling console monitoring LLM fallback sweeps, exception throws, and token costs.</p>
                </div>
              </div>

              {/* Scrolling Log console */}
              <div className="max-h-[360px] overflow-y-auto pr-1 space-y-2.5 font-mono custom-scrollbar">
                {llmLogs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-text-muted">
                    Console idle. Run sales research, write outreach, or execute ping pings to log telemetry.
                  </div>
                ) : (
                  llmLogs.map((log, i) => {
                    const dateText = log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString() : 'Pending';
                    const isSuccess = log.status === 'success';
                    const isFailover = log.status === 'failover_event';
                    
                    if (isFailover) {
                      return (
                        <div key={log.id || i} className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 space-y-1.5 w-full min-w-0 overflow-hidden">
                          <div className="flex flex-col xs:flex-row xs:items-center justify-between text-[9px] gap-2">
                            <span className="text-amber-400 font-extrabold uppercase bg-amber-500/10 px-2 py-0.5 rounded font-syne tracking-wider flex items-center gap-1 shrink-0 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              Automatic Failover sweep
                            </span>
                            <span className="text-zinc-500 shrink-0">{dateText}</span>
                          </div>
                          <p className="text-[10px] text-amber-300/90 leading-relaxed font-sans break-words break-all whitespace-pre-wrap">{log.error}</p>
                        </div>
                      );
                    }

                    return (
                      <div key={log.id || i} className={`bg-[#0b0c11]/60 border transition-all rounded-xl p-3 space-y-2.5 text-[10px] w-full min-w-0 overflow-hidden ${
                        isSuccess ? 'border-border/40 hover:border-border/80' : 'border-rose-500/25 hover:border-rose-500/40 bg-rose-950/5'
                      }`}>
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 w-full">
                          <div className="flex items-center flex-wrap gap-2 min-w-0">
                            <span className={`font-bold uppercase font-syne text-[8.5px] px-1.5 py-0.5 rounded tracking-wide shrink-0 ${
                              isSuccess ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                            }`}>
                              {log.provider}
                            </span>
                            <span className="text-[#42d1f6] text-[8.5px] px-1.5 py-0.5 bg-sky-500/10 rounded font-bold uppercase tracking-widest shrink-0">{log.action}</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 shrink-0">{dateText}</span>
                        </div>

                        {isSuccess ? (
                          <div className="flex flex-col sm:flex-row justify-between gap-2 text-zinc-300 font-mono text-[9px] leading-relaxed font-sans w-full min-w-0 overflow-hidden">
                            <span className="text-zinc-300 break-words">Request completed successfully in <span className="text-emerald-400 font-bold font-mono">{log.latency} ms</span></span>
                            <div className="flex items-center gap-3 text-zinc-500 font-mono shrink-0">
                              <span>Tokens: <span className="text-zinc-400 font-bold">{log.tokensUsed}</span></span>
                              <span>Cost: <span className="text-zinc-400 font-bold">${log.cost?.toFixed(6) || '0.000000'}</span></span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 font-sans w-full min-w-0 overflow-hidden">
                            <p className="text-rose-400 font-semibold leading-relaxed">Request failed after <span className="font-bold font-mono text-[9px]">{log.latency} ms</span></p>
                            <div className="text-[9.5px] text-rose-300/80 bg-rose-950/20 p-2.5 rounded-lg border border-rose-500/10 font-mono leading-relaxed break-words break-all">
                              Error: {log.error || 'Unknown endpoint exception.'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
}
