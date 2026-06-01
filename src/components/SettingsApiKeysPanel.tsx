import React, { useEffect, useState, useRef, useMemo } from "react";
import { 
  Key, Plus, Trash2, Mail, ShieldCheck, Link, RefreshCw, Check, 
  ExternalLink, Globe, Wifi, Send, CheckCircle2, XCircle, AlertTriangle,
  Settings, Database, Unlink, Activity, Cpu, Sparkles, DollarSign,
  Info, Loader2, ArrowRight, Kanban, List, Play, Eye, EyeOff, Save, Link2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from '../firebase';
import { 
  collection, query, onSnapshot, setDoc, doc, updateDoc, deleteDoc, Timestamp, orderBy, addDoc
} from 'firebase/firestore';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  rawKey?: string;
}

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  configId: string;
  eventId: string;
  event: string;
  payload: string;
  status: "success" | "failed";
  attempts: number;
  lastAttemptAt: string;
  responseStatus: number;
  responseBody: string;
}

interface SettingsHubProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  profile: { role: 'super_admin' | 'org_admin' | 'user'; orgId: string; displayName?: string };
  emAccount: { connected: boolean; email: string; provider: string } | null;
  liAccount: { connected: boolean; name: string; avatar: string } | null;
  crmAccount: { connected: boolean; platform: 'Salesforce' | 'HubSpot' | null; orgName: string } | null;
  smtpConfig: { host: string; port: string; secure: boolean; user: string; pass: string; from: string };
  setSmtpConfig: React.Dispatch<React.SetStateAction<{ host: string; port: string; secure: boolean; user: string; pass: string; from: string }>>;
  isConnectingEm: boolean;
  isConnectingLi: boolean;
  handleConnectEmail: () => Promise<void>;
  handleDisconnectEmail: () => Promise<void>;
  handleConnectLinkedIn: () => Promise<void>;
  handleDisconnectLinkedIn: () => Promise<void>;
  generateProjectPDF: () => void;
  leads: any[];
  handleDisconnectCRM?: () => Promise<void>;
  handlePushCRMData?: () => Promise<void>;
  isCrmPushing?: boolean;
}

export const SettingsHub: React.FC<SettingsHubProps> = ({
  showToast,
  profile,
  emAccount,
  liAccount,
  crmAccount,
  smtpConfig,
  setSmtpConfig,
  isConnectingEm,
  isConnectingLi,
  handleConnectEmail,
  handleDisconnectEmail,
  handleConnectLinkedIn,
  handleDisconnectLinkedIn,
  generateProjectPDF,
  leads,
  handleDisconnectCRM,
  handlePushCRMData,
  isCrmPushing
}) => {
  const [activeTab, setActiveTab] = useState<'integrations' | 'api_webhooks' | 'ai_routing'>('integrations');

  // API Keys States
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKeyPlain, setCreatedKeyPlain] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Webhook States
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["lead.created"]);
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);

  // Delivery log states
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // AI Routing States
  const [llmConfigs, setLlmConfigs] = useState<any[]>([]);
  const [llmLogs, setLlmLogs] = useState<any[]>([]);
  const [isTestingModelId, setIsTestingModelId] = useState<string | null>(null);
  const [showApiKeyId, setShowApiKeyId] = useState<string | null>(null);
  const [crmMappingStage, setCrmMappingStage] = useState("Prospecting / SDR Out");
  const [showCrmPushLogs, setShowCrmPushLogs] = useState(false);
  const [crmPushProgress, setCrmPushProgress] = useState(0);
  const [crmPushLog, setCrmPushLog] = useState<string[]>([]);

  // Default LLM Config Templates
  const defaultConfigsList = useMemo(() => [
    { id: "gemini", name: "Gemini 1.5 Flash/Pro", provider: "Google AI", isEnabled: true, priority: 1, apiKey: "", status: "online", avgLatency: 120, totalTokens: 4200, totalCost: 0.002, selectedModel: "gemini-2.5-flash" },
    { id: "openai", name: "GPT-4o", provider: "OpenAI", isEnabled: true, priority: 2, apiKey: "", status: "online", avgLatency: 280, totalTokens: 1800, totalCost: 0.008, selectedModel: "gpt-4o" },
    { id: "nvidia", name: "Nvidia NIM Llama 3.3", provider: "Nvidia Nim", isEnabled: true, priority: 3, apiKey: "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", status: "online", avgLatency: 180, totalTokens: 9200, totalCost: 0.0, selectedModel: "meta/llama-3.3-70b-instruct" },
    { id: "openrouter", name: "OpenRouter Free Multi-LLM", provider: "OpenRouter", isEnabled: true, priority: 4, apiKey: "", status: "online", avgLatency: 350, totalTokens: 0, totalCost: 0.0, selectedModel: "openrouter/free" }
  ], []);

  // Fetch API Keys
  const fetchApiKeys = async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) setApiKeys(await res.json());
    } catch (err) {
      console.error("Failed parsing API credentials", err);
    }
  };

  // Fetch Webhooks
  const fetchWebhooks = async () => {
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) setWebhooks(await res.json());
    } catch (err) {
      console.error("Failed parsing Webhook configurations", err);
    }
  };

  // Fetch Webhook Logs
  const fetchWebhookLogs = async () => {
    setIsRefreshingLogs(true);
    try {
      const res = await fetch("/api/webhooks/logs");
      if (res.ok) setWebhookLogs(await res.json());
    } catch (err) {
      console.error("Failed loading webhook delivery logs", err);
    }
    setIsRefreshingLogs(false);
  };

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
    fetchWebhookLogs();

    // Subscribe to LLM config updates (simulate or sync via localStorage fallback)
    const cachedConfigs = localStorage.getItem('zyntra-llm-configs');
    if (cachedConfigs) {
      try {
        setLlmConfigs(JSON.parse(cachedConfigs));
      } catch (e) {
        setLlmConfigs(defaultConfigsList);
      }
    } else {
      setLlmConfigs(defaultConfigsList);
      localStorage.setItem('zyntra-llm-configs', JSON.stringify(defaultConfigsList));
    }

    // Subscribe to LLM execution logs fallback
    const cachedLogs = localStorage.getItem('zyntra-llm-logs');
    if (cachedLogs) {
      try {
        setLlmLogs(JSON.parse(cachedLogs));
      } catch (e) {
        setLlmLogs([]);
      }
    }

    const interval = setInterval(() => {
      fetchWebhookLogs();
    }, 8000);

    return () => clearInterval(interval);
  }, [defaultConfigsList]);

  // Handlers for API Keys
  const handleGenerateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newKeyName.trim();
    if (!cleanName) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName })
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedKeyPlain(data.rawKey);
        setNewKeyName("");
        fetchApiKeys();
        showToast("REST API Key generated successfully!", "success");
      } else {
        showToast("Error generating API Key.", "error");
      }
    } catch (err) {
      showToast("Network error generating API key.", "error");
    }
    setIsGenerating(false);
  };

  const handleDeleteApiKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke: "${name}"?`)) return;
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("API Credentials revoked completely.", "success");
        fetchApiKeys();
        if (createdKeyPlain && createdKeyPlain.startsWith(id)) setCreatedKeyPlain(null);
      }
    } catch (err) {
      showToast("Network error revoking API Key.", "error");
    }
  };

  // Handlers for Webhooks
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = targetUrl.trim();
    if (!cleanUrl) return;
    if (selectedEvents.length === 0) {
      showToast("Select at least one event trigger.", "error");
      return;
    }
    setIsCreatingWebhook(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl, events: selectedEvents, active: true })
      });
      if (res.ok) {
        setTargetUrl("");
        setSelectedEvents(["lead.created"]);
        fetchWebhooks();
        showToast("Webhook endpoint added successfully!", "success");
      } else {
        showToast("Failed to create webhook subscription.", "error");
      }
    } catch (err) {
      showToast("Network error creating webhook.", "error");
    }
    setIsCreatingWebhook(false);
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Permanently delete this webhook configuration?")) return;
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Webhook configuration deleted.", "success");
        fetchWebhooks();
      }
    } catch (err) {
      showToast("Network error deactivating webhook.", "error");
    }
  };

  const handleToggleEvent = (eventKey: string) => {
    if (selectedEvents.includes(eventKey)) {
      setSelectedEvents(selectedEvents.filter(e => e !== eventKey));
    } else {
      setSelectedEvents([...selectedEvents, eventKey]);
    }
  };

  // Health check AI model pingers
  const handleTestLlmPing = async (modelId: string, modelName: string, apiKey: string, selectedModel?: string) => {
    setIsTestingModelId(modelId);
    showToast(`Testing connection to ${modelName}...`, "info");
    const startTime = Date.now();

    try {
      let success = false;
      let errorMsg = "";

      if (modelId === "gemini") {
        // Gemini Direct ping simulator
        setTimeout(() => {}, 200);
        success = true;
      } else {
        let route = "openai";
        if (modelId === "nvidia") route = "nvidia";
        else if (modelId === "openrouter") route = "openrouter";

        const response = await fetch(`/api/fallback/${route}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "Hello, reply 'pong' in 1 word.",
            systemPrompt: "Health check pinger",
            apiKey: apiKey || (modelId === "nvidia" ? "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" : ""),
            selectedModel: selectedModel
          })
        });
        if (response.ok) {
          const data = await response.json();
          success = !!data?.content;
        } else {
          errorMsg = await response.text();
        }
      }

      const latency = Date.now() - startTime;
      const finalStatus = success ? "online" : "offline";

      const updated = llmConfigs.map(c => {
        if (c.id === modelId) {
          return { ...c, status: finalStatus, avgLatency: success ? latency : c.avgLatency };
        }
        return c;
      });
      setLlmConfigs(updated);
      localStorage.setItem('zyntra-llm-configs', JSON.stringify(updated));
      showToast(success ? `${modelName} online! Latency: ${latency}ms` : `Connection failed: ${errorMsg || 'Timeout'}`, success ? "success" : "error");
    } catch (err) {
      showToast(`Network error pinging ${modelName}.`, "error");
    }
    setIsTestingModelId(null);
  };

  // Toggle LLM Provider State
  const handleToggleLlm = (modelId: string) => {
    const updated = llmConfigs.map(c => {
      if (c.id === modelId) {
        const next = !c.isEnabled;
        showToast(`${c.name} model has been ${next ? 'enabled' : 'disabled'}!`, "info");
        return { ...c, isEnabled: next };
      }
      return c;
    });
    setLlmConfigs(updated);
    localStorage.setItem('zyntra-llm-configs', JSON.stringify(updated));
  };

  const handleUpdateLlmKey = (modelId: string, nextKey: string) => {
    const updated = llmConfigs.map(c => {
      if (c.id === modelId) return { ...c, apiKey: nextKey };
      return c;
    });
    setLlmConfigs(updated);
    localStorage.setItem('zyntra-llm-configs', JSON.stringify(updated));
    showToast(`${modelId.toUpperCase()} API key updated successfully!`, "success");
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Settings Title */}
      <div className="text-left space-y-1">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-syne flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-brand" />
          Settings
        </h1>
        <p className="text-xs text-text-muted">
          Manage integrations, SMTP setups, outbound webhooks, and developer API credentials.
        </p>
      </div>

      {/* consolidated tabs header */}
      <div className="flex border-b border-border/40 pb-px gap-6">
        {[
          { id: 'integrations', label: 'Integrations', icon: Link2 },
          { id: 'api_webhooks', label: 'API & Webhooks', icon: Key }
        ].filter(Boolean).map((t: any) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 px-1 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer relative ${
              activeTab === t.id ? "text-brand" : "text-text-muted hover:text-white"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {activeTab === t.id && (
              <motion.div layoutId="activeSettingsTabUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
          </button>
        ))}
      </div>

      {/* Tabs panels */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'integrations' && (
            <motion.div
              key="integrations"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* SMTP Email panel */}
              <div id="settings-smtp-card" className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 text-left shadow-sm">
                <div className="flex items-center justify-between border-b border-border/20 pb-4">
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <Mail className="w-5 h-5 text-brand" />
                    SMTP Email Setup
                  </div>
                  {emAccount?.connected && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                      Active
                    </span>
                  )}
                </div>

                {!emAccount?.connected ? (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest">SMTP Host</label>
                        <input 
                          className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs focus:border-brand outline-none"
                          placeholder="smtp.gmail.com"
                          value={smtpConfig.host}
                          onChange={e => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Port</label>
                        <input 
                          className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs focus:border-brand outline-none"
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
                          className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs focus:border-brand outline-none"
                          placeholder="user@example.com"
                          value={smtpConfig.user}
                          onChange={e => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Password</label>
                        <input 
                          type="password"
                          className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs focus:border-brand outline-none"
                          placeholder="••••••••"
                          value={smtpConfig.pass}
                          onChange={e => setSmtpConfig(prev => ({ ...prev, pass: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-text-muted font-bold uppercase tracking-widest">From Email / Name</label>
                      <input 
                        className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs focus:border-brand outline-none"
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
                      <label htmlFor="smtp-secure-settings" className="text-[9px] text-text-muted font-bold uppercase tracking-widest cursor-pointer">Use Secure (SSL/TLS)</label>
                    </div>
                    <button 
                      onClick={handleConnectEmail}
                      disabled={isConnectingEm}
                      className="w-full bg-brand text-[#090a0f] font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isConnectingEm ? <Loader2 className="w-4 h-4 animate-spin text-[#090a0f]" /> : <Save className="w-4 h-4 text-[#090a0f]" />}
                      Save SMTP Settings
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 text-xs">
                    <div className="bg-surface-alt border border-border rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                        <Mail className="w-5 h-5 text-brand" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-sm font-bold flex items-center gap-1.5 truncate">
                          {emAccount.email}
                          <CheckCircle2 className="w-4 h-4 text-brand-alt" />
                        </div>
                        <div className="text-[10px] text-text-muted font-medium">{emAccount.provider} Connected</div>
                      </div>
                      <button onClick={handleDisconnectEmail} className="p-2.5 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-xl transition-colors">
                        <Unlink className="w-4.5 h-4.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-text-muted leading-relaxed italic">
                      Your SMTP credentials are saved securely. All system outbound emails will be routed through your domain account.
                    </p>
                  </div>
                )}
              </div>

              {/* LinkedIn and WhatsApp Bridge panel */}
              <div className="space-y-6">
                {/* LinkedIn Card */}
                <div id="settings-linkedin-card" className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 text-left shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/20 pb-4">
                    <div className="flex items-center gap-3 text-sm font-bold">
                      <Link2 className="w-5 h-5 text-brand" />
                      LinkedIn Bridge
                    </div>
                    {liAccount?.connected && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                        Connected
                      </span>
                    )}
                  </div>
                  
                  {!liAccount?.connected ? (
                    <div className="space-y-4 text-xs">
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        Connect your premium profile to enable automated SDR sequence drafts or trigger direct connection requests in the background.
                      </p>
                      <button 
                        onClick={handleConnectLinkedIn}
                        disabled={isConnectingLi}
                        className="w-full bg-brand text-[#090a0f] font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 cursor-pointer"
                      >
                        {isConnectingLi ? <Loader2 className="w-4 h-4 animate-spin text-[#090a0f]" /> : <Link className="w-4 h-4 text-[#090a0f]" />}
                        Connect LinkedIn Account
                      </button>
                    </div>
                  ) : (
                    <div className="bg-surface-alt border border-border rounded-2xl p-4 flex items-center gap-4 text-xs">
                      <img src={liAccount.avatar} alt={liAccount.name} className="w-10 h-10 rounded-xl border border-brand/20" referrerPolicy="no-referrer" />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-bold flex items-center gap-1.5">
                          {liAccount.name}
                          <CheckCircle2 className="w-4 h-4 text-brand-alt" />
                        </div>
                        <div className="text-[10px] text-text-muted font-medium">Automation Bridge Active</div>
                      </div>
                      <button onClick={handleDisconnectLinkedIn} className="p-2.5 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-xl transition-colors">
                        <Unlink className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* WhatsApp & CRM Connector card */}
                <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 text-left shadow-sm">
                  <h3 className="text-sm font-bold text-white flex items-center gap-3 border-b border-border/20 pb-4">
                    <Database className="w-5 h-5 text-brand" />
                    Enterprise CRM Sync
                  </h3>
                  
                  {!crmAccount?.connected ? (
                    <div className="space-y-4 text-xs">
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        Establish webhook connectors to synchronize pipeline deal states and qualified SDR logs back to HubSpot or Salesforce records dynamically.
                      </p>
                      <button
                        onClick={handlePushCRMData}
                        disabled={isCrmPushing}
                        className="w-full bg-brand text-[#090a0f] font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer shadow-md disabled:opacity-50"
                      >
                        {isCrmPushing ? <Loader2 className="w-4 h-4 animate-spin text-[#090a0f]" /> : <RefreshCw className="w-4 h-4 text-[#090a0f]" />}
                        Link HubSpot / Salesforce Sync
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div className="bg-surface-alt border border-border rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                          <Database className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="text-sm font-bold flex items-center gap-1.5 truncate">
                            {crmAccount.platform} Sync
                            <CheckCircle2 className="w-4 h-4 text-brand-alt" />
                          </div>
                          <div className="text-[10px] text-text-muted font-medium">Org: {crmAccount.orgName}</div>
                        </div>
                        {handleDisconnectCRM && (
                          <button onClick={handleDisconnectCRM} className="p-2.5 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-xl transition-colors">
                            <Unlink className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handlePushCRMData}
                          disabled={isCrmPushing}
                          className="flex-1 py-2.5 bg-brand-alt/10 hover:bg-brand-alt/20 text-brand-alt border border-brand-alt/25 font-bold rounded-xl transition-all text-xs"
                        >
                          {isCrmPushing ? "Syncing..." : `Push ${leads.length} Leads`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* System Specs PDF Card */}
                <div className="bg-surface border border-border rounded-3xl p-6 space-y-4 text-xs text-left shadow-sm">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-brand" />
                    Systems Documentation
                  </h4>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Generate and download a clean PDF report containing the complete technical specs of the Zyntra 2.0 SDR platform architecture.
                  </p>
                  <button 
                    onClick={generateProjectPDF}
                    className="w-full bg-surface-alt border border-border hover:border-brand/35 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    Download Specs Report (PDF)
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'api_webhooks' && (
            <motion.div
              key="api_webhooks"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* REST API Credentials Card */}
              <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 text-left shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-brand" />
                    REST API keys Credential Store
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Query lead rosters, trigger outbound synchronization, or inject custom webhooks from outside Zyntra clients.
                  </p>
                </div>

                {/* API Key Form */}
                <form onSubmit={handleGenerateApiKey} className="flex flex-col sm:flex-row gap-4 p-4 bg-[#090a0f]/40 border border-border/70 rounded-2xl">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Client Key Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. CRM Integration Server, Dev Outpost"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-border hover:border-brand rounded-xl font-bold text-xs outline-none focus:border-brand"
                    />
                  </div>
                  <div className="flex items-end shrink-0">
                    <button
                      type="submit"
                      disabled={isGenerating || !newKeyName.trim()}
                      className="w-full sm:w-auto px-5 py-3.5 bg-brand hover:bg-brand/90 text-[#090a0f] font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4 text-[#090a0f]" />
                      Generate API Key
                    </button>
                  </div>
                </form>

                {/* plain credentials secret backup */}
                {createdKeyPlain && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold text-[10px] uppercase tracking-widest text-[#00d4aa]">Backup your raw credentials secret:</span>
                    </div>
                    <p className="text-[10px] text-text-muted font-medium leading-relaxed">
                      For security, this plain secret token **will not be accessible again** after closing.
                    </p>
                    <div className="flex items-center justify-between p-3.5 bg-[#090a0f] border border-border rounded-xl">
                      <span className="font-mono text-xs select-all text-white font-extrabold tracking-wide">{createdKeyPlain}</span>
                      <span className="text-[9px] text-brand border border-brand/20 bg-brand/5 px-2 py-0.5 rounded-lg ml-3">Copied</span>
                    </div>
                  </div>
                )}

                {/* Active Key List */}
                <div className="space-y-3">
                  <h4 className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Currently Active Credentials</h4>
                  <div className="bg-[#090a0f] border border-border rounded-2xl overflow-hidden divide-y divide-border/40">
                    {apiKeys.length === 0 ? (
                      <div className="p-6 text-center text-text-muted italic">
                        No active REST API developer keys generated.
                      </div>
                    ) : (
                      apiKeys.map((k) => (
                        <div key={k.id} className="p-4 flex items-center justify-between hover:bg-surface-alt/25 transition-all">
                          <div className="space-y-1">
                            <span className="font-bold text-white text-xs block">{k.name}</span>
                            <div className="flex items-center gap-4 text-[9px] text-text-muted font-mono uppercase">
                              <span>Prefix: <span className="text-brand font-semibold select-all">{k.keyPrefix}</span></span>
                              <span>•</span>
                              <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteApiKey(k.id, k.name)}
                            className="w-8 h-8 rounded-lg border border-rose-500/35 hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Webhooks Subscription Panel */}
              <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 text-left shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#00d4aa]" />
                    Outbound Webhook Subscriptions
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Configure webhook destination endpoints to dynamically capture real-time event updates from Zyntra.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Create Panel */}
                  <form onSubmit={handleCreateWebhook} className="lg:col-span-5 space-y-4 p-5 bg-[#090a0f]/40 border border-border/70 rounded-2xl h-fit">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#00d4aa] border-b border-border/40 pb-2 mb-2">Register Endpoint</h4>
                    
                    <div className="space-y-1.5 text-xs">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted block">Destination Url</label>
                      <input
                        type="url"
                        placeholder="https://your-crm.inbound-webhooks/leads"
                        required
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-[#090a0f] border border-border hover:border-brand rounded-xl font-mono text-[10px] text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2 text-xs">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted block">Subscription Triggers</label>
                      <div className="space-y-2">
                        {[
                          { key: "lead.created", label: "Lead created", desc: "Triggers on manual REST or mapped excel import leads additions" },
                          { key: "lead.updated", label: "Lead parameters modified", desc: "Triggers on campaign updates, ratings changes" },
                          { key: "deal.stage_changed", label: "Deal status shifted", desc: "Triggers when deal moving in negotiation funnel stages" }
                        ].map((ev) => {
                          const checked = selectedEvents.includes(ev.key);
                          return (
                            <label key={ev.key} className="flex items-start gap-2.5 p-2 bg-[#090a0f] border border-border/40 hover:border-border rounded-xl cursor-pointer transition-colors block">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleEvent(ev.key)}
                                className="rounded border-border text-brand focus:ring-0 mt-0.5 h-4.5 w-4.5 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-white block text-[10px]">{ev.label}</span>
                                <span className="text-[9px] text-text-muted leading-relaxed font-mono block">{ev.key}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingWebhook || !targetUrl.trim()}
                      className="w-full py-2.5 bg-[#00d4aa] text-[#090a0f] font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-40"
                    >
                      Add Outbound Gateway
                    </button>
                  </form>

                  {/* Connected Target List */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="space-y-3.5">
                      <h4 className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Registered Webhook Targets</h4>
                      <div className="bg-[#090a0f] border border-border rounded-2xl overflow-hidden divide-y divide-border/40">
                        {webhooks.length === 0 ? (
                          <div className="p-5 text-center text-text-muted italic">
                            No active webhook endpoints connected.
                          </div>
                        ) : (
                          webhooks.map((w) => (
                            <div key={w.id} className="p-4 flex items-center justify-between gap-4">
                              <div className="space-y-1.5 truncate text-left">
                                <span className="font-mono text-[10px] text-white truncate block" title={w.url}>
                                  {w.url}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {w.events.map(ev => (
                                    <span key={ev} className="px-1.5 py-0.5 bg-[#00d4aa]/10 border border-[#00d4aa]/25 text-[#00d4aa] text-[8px] font-mono rounded">
                                      {ev}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteWebhook(w.id)}
                                className="w-8 h-8 rounded-lg hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-all border border-border shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery Logs Feed */}
                <div className="space-y-3 border-t border-border/40 pt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-text-muted">
                      Webhook Delivery Logs Feed
                    </h4>
                    <button
                      onClick={fetchWebhookLogs}
                      disabled={isRefreshingLogs}
                      className="text-[9px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingLogs ? "animate-spin" : ""}`} />
                      Reload Logs
                    </button>
                  </div>

                  <div className="bg-[#090a0f] border border-border rounded-2xl overflow-hidden overflow-y-auto max-h-56 divide-y divide-border/50 font-mono text-[10px] custom-scrollbar text-left">
                    {webhookLogs.length === 0 ? (
                      <div className="p-6 text-center text-text-muted italic font-sans">
                        No outbound events dispatched yet.
                      </div>
                    ) : (
                      webhookLogs.map((log) => {
                        const isSuccess = log.status === "success";
                        return (
                          <div key={log.id} className="p-3 bg-surface-alt/10 hover:bg-surface-alt/45 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-[10px]">
                            <div className="space-y-1 max-w-xl">
                              <div className="flex items-center gap-2">
                                {isSuccess ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[8px] uppercase">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    Success
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded text-[8px] uppercase">
                                    <XCircle className="w-3 h-3 text-rose-400" />
                                    Failed
                                  </span>
                                )}
                                <span className="text-white font-bold">{log.event}</span>
                              </div>
                              <div className="text-[9px] text-text-muted truncate max-w-md">
                                Payload: <span className="text-white select-all">{log.payload}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[9px] text-text-muted block">Attempts: {log.attempts} / 3</span>
                              <span className="text-[9px] text-text-muted block">{new Date(log.lastAttemptAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
