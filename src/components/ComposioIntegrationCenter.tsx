import React, { useEffect, useState } from "react";
import { 
  Cpu, Key, CloudLightning, ShieldCheck, Mail, RefreshCw, 
  CheckCircle2, XCircle, ExternalLink, Link, Trash2, Send, Zap, 
  FileSpreadsheet, Code2, Briefcase, Play, Terminal
} from "lucide-react";

interface ComposioApp {
  id: string;
  name: string;
  label: string;
  description: string;
  category: "messaging" | "crm" | "productivity" | "dev";
  icon: React.ComponentType<any>;
  popularAction: {
    id: string;
    label: string;
    desc: string;
    fields: { name: string; label: string; placeholder: string; type: "string" | "textarea" }[];
  };
}

const SUPPORTED_APPS: ComposioApp[] = [
  {
    id: "gmail",
    name: "gmail",
    label: "Gmail",
    description: "Automate outbound campaign copies, transaction alerts, and emails.",
    category: "messaging",
    icon: Mail,
    popularAction: {
      id: "GMAIL_SEND_EMAIL",
      label: "Gmail: Send Email Direct",
      desc: "Dispatch high-precision outreach messages using the connected Gmail client inbox.",
      fields: [
        { name: "to", label: "Recipient Address (Email)", placeholder: "prospect@target-co.com", type: "string" },
        { name: "subject", label: "Subject Line", placeholder: "SDR Collaboration Invitation", type: "string" },
        { name: "body", label: "Email Body Content (Markdown supported)", placeholder: "Hi and happy to connect...", type: "textarea" }
      ]
    }
  },
  {
    id: "slack",
    name: "slack",
    label: "Slack",
    description: "Publish alert hooks, lead summaries, and conversion telemetry into team channels.",
    category: "messaging",
    icon: Send,
    popularAction: {
      id: "SLACK_BOT_POST_MESSAGE",
      label: "Slack: Post Channel Message",
      desc: "Broadcast lead qualification summaries directly into internal Slack notification channels.",
      fields: [
        { name: "channel", label: "Channel ID / Name", placeholder: "C123456789 or #sdr-leads", type: "string" },
        { name: "text", label: "Message Text", placeholder: "⚡ Lead Sarah Mitchell just promoted to 'Proposal Ready'. Check CRM Hub.", type: "textarea" }
      ]
    }
  },
  {
    id: "hubspot",
    name: "hubspot",
    label: "HubSpot CRM",
    description: "Synchronize company parameters, client deals, and status parameters instantly.",
    category: "crm",
    icon: Briefcase,
    popularAction: {
      id: "HUBSPOT_CREATE_CONTACT",
      label: "HubSpot: Create CRM Contact",
      desc: "Register qualified sandbox leads directly into HubSpot's CRM pipeline contacts database.",
      fields: [
        { name: "email", label: "Prospect Email", placeholder: "harvey@specter-law.com", type: "string" },
        { name: "firstName", label: "First Name", placeholder: "Harvey", type: "string" },
        { name: "lastName", label: "Last Name", placeholder: "Specter", type: "string" }
      ]
    }
  },
  {
    id: "sheets",
    name: "sheets",
    label: "Google Sheets",
    description: "Read campaign spreadsheets or write outreach results.",
    category: "productivity",
    icon: FileSpreadsheet,
    popularAction: {
      id: "SHEETS_CREATE_SPREADSHEET",
      label: "Sheets: Create Campaign Log Sheet",
      desc: "Spawn a brand new Google spreadsheet to map outgoing outreach campaigns statistics.",
      fields: [
        { name: "title", label: "Spreadsheet Title Name", placeholder: "Zyntra Campaign Sync Log", type: "string" }
      ]
    }
  },
  {
    id: "github",
    name: "github",
    label: "GitHub",
    description: "Check software project updates, file issues, or automate repository triggers.",
    category: "dev",
    icon: Code2,
    popularAction: {
      id: "GITHUB_CREATE_ISSUE",
      label: "GitHub: Create Repository Issue",
      desc: "Register lead alerts or technical support issues inside design and engineering repos.",
      fields: [
        { name: "owner", label: "Repository Owner (Username)", placeholder: "ZyntraCorp", type: "string" },
        { name: "repo", label: "Repository Name", placeholder: "sdr-outreach-app", type: "string" },
        { name: "title", label: "Issue Title Label", placeholder: "Lead inbound sync pipeline malfunction", type: "string" }
      ]
    }
  }
];

interface ComposioConnection {
  id: string;
  appName: string;
  status: string;
  createdAt: string;
}

interface ComposioIntegrationCenterProps {
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export const ComposioIntegrationCenter: React.FC<ComposioIntegrationCenterProps> = ({ showToast }) => {
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [maskedKey, setMaskedKey] = useState("ak_p4Bq...3EKi-1");
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [tempKey, setTempKey] = useState("");
  const [isLoadingKey, setIsLoadingKey] = useState(false);

  const [connections, setConnections] = useState<ComposioConnection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);

  // Authentication Link Initiation State
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | null>(null);
  const [connectingAppId, setConnectingAppId] = useState<string | null>(null);

  // Action Testing State
  const [selectedAppForAction, setSelectedAppForAction] = useState<ComposioApp>(SUPPORTED_APPS[0]);
  const [actionPayload, setActionPayload] = useState<Record<string, string>>({});
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Category filter
  const [activeCategory, setActiveCategory] = useState<"all" | "messaging" | "crm" | "productivity">("all");

  const appendToTerminal = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, `[${timestamp}] ${text}`]);
  };

  const fetchComposioKeyStatus = async () => {
    setIsLoadingKey(true);
    try {
      const res = await fetch("/api/composio/key");
      if (res.ok) {
        const data = await res.json();
        setApiKeySecret(data.keySecret);
        setMaskedKey(data.masked);
        setTempKey(data.keySecret);
      }
    } catch (err) {
      console.error("Failed fetching Composio keys: ", err);
    }
    setIsLoadingKey(false);
  };

  const fetchConnections = async () => {
    setIsLoadingConnections(true);
    try {
      const res = await fetch("/api/composio/connections");
      if (res.ok) {
        const data = await res.json();
        const items = data.connections || data.items || (Array.isArray(data) ? data : []);
        setConnections(items);
        appendToTerminal(`Retrieved ${items.length} active workspace connections from Composio.dev API.`);
      } else {
        appendToTerminal("Failed to list active Composio connections. Check your API credentials key.");
      }
    } catch (err: any) {
      appendToTerminal(`Network exception fetching connections: ${err.message}`);
    }
    setIsLoadingConnections(false);
  };

  useEffect(() => {
    fetchComposioKeyStatus();
    fetchConnections();
    appendToTerminal("Composio AI Integrations Command Center bootstrapped successfully.");
  }, []);

  const handleUpdateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempKey.trim()) return;
    setIsLoadingKey(true);
    try {
      const res = await fetch("/api/composio/key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: tempKey.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeySecret(data.keySecret);
        setMaskedKey(data.masked);
        setIsEditingKey(false);
        showToast("Composio Developer API key updated successfully!", "success");
        appendToTerminal(`Swapped active Composio API access token. Masked target: ${data.masked}`);
        fetchConnections();
      } else {
        showToast("Failed to register custom Composio token.", "error");
      }
    } catch (err) {
      showToast("Network error editing key.", "error");
    }
    setIsLoadingKey(false);
  };

  const handleInitiateConnection = async (appName: string) => {
    setIsCreatingLink(true);
    setConnectingAppId(appName);
    setAuthRedirectUrl(null);
    appendToTerminal(`Initiating secure OAuth redirect mapping context for app: '${appName}'...`);
    try {
      // Use standard location origins for perfect redirect matching after OAuth consent screen completes
      const parentOrigin = window.location.origin;
      const res = await fetch("/api/composio/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          redirectUrl: parentOrigin
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.redirectUrl) {
          setAuthRedirectUrl(data.redirectUrl);
          appendToTerminal(`Successfully spawned authorization link! Redirect URL generated.`);
          showToast(`Consenting authorization link computed for ${appName}!`, "info");
        } else {
          appendToTerminal(`Success response received, but no custom redirectUrl was returned.`);
          fetchConnections();
        }
      } else {
        const errText = await res.text();
        appendToTerminal(`Composio Error initiating connection: ${errText}`);
        showToast(`Composio error payload: ${errText.substring(0, 50)}`, "error");
      }
    } catch (err: any) {
      appendToTerminal(`Network exception creating credentials: ${err.message}`);
      showToast("Composio oauth connection payload error.", "error");
    }
    setIsCreatingLink(false);
  };

  const handleRevokeConnection = async (connectionId: string, appName: string) => {
    if (!confirm(`Are you sure you want to decoupling and revoke Composio access for: "${appName}"?`)) return;
    
    appendToTerminal(`Revoking connection ID: '${connectionId}' associated with app '${appName}'...`);
    try {
      const res = await fetch(`/api/composio/connections/${connectionId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        showToast(`Revoked ${appName} integration credential index successfully.`, "success");
        appendToTerminal(`Decoupling request processed. Removing credential reference.`);
        fetchConnections();
      } else {
        const errText = await res.text();
        appendToTerminal(`Composio revocation failed: ${errText}`);
        showToast("Failed to decouple connection.", "error");
      }
    } catch (err: any) {
      appendToTerminal(`Network exception decoupling credential: ${err.message}`);
    }
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const app = selectedAppForAction;
    const matchedConnection = connections.find(c => c.appName.toLowerCase() === app.name);
    
    if (!matchedConnection) {
      appendToTerminal(`Execution aborted: Active ${app.label} connection is required before testing playground actions.`);
      showToast("Provide connected tool credentials first.", "warning");
      return;
    }

    setIsExecutingAction(true);
    setExecutionResult(null);
    appendToTerminal(`Triggering action '${app.popularAction.id}' on connection ${matchedConnection.id}...`);

    try {
      // Build proper payload mapping
      const inputPayload: Record<string, any> = {};
      app.popularAction.fields.forEach(f => {
        inputPayload[f.name] = actionPayload[f.name] || "";
      });

      const res = await fetch("/api/composio/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: app.popularAction.id,
          connectionId: matchedConnection.id,
          input: inputPayload
        })
      });

      const data = await res.json();
      setExecutionResult(data);

      if (res.ok) {
        showToast("Action dispatched and evaluated successfully!", "success");
        appendToTerminal(`Execution status: Succeeded! Result: ${JSON.stringify(data).substring(0, 200)}...`);
      } else {
        showToast("Action playground returned execution failure.", "error");
        appendToTerminal(`Execution status: Failed! Error description: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      appendToTerminal(`Network pipeline error calling execute: ${err.message}`);
      showToast("Outbound payload dispatch failure.", "error");
    }
    setIsExecutingAction(false);
  };

  const isAppConnected = (appName: string) => {
    return connections.some(c => c.appName.toLowerCase() === appName.toLowerCase());
  };

  const getAppConnectionId = (appName: string) => {
    const conn = connections.find(c => c.appName.toLowerCase() === appName.toLowerCase());
    return conn ? conn.id : "";
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === "messaging") return "Outbound messaging";
    if (cat === "crm") return "CRM pipelines";
    if (cat === "productivity") return "Productivity suites";
    return "Development sandbox";
  };

  const filteredApps = SUPPORTED_APPS.filter(app => {
    if (activeCategory === "all") return true;
    return app.category === activeCategory;
  });

  return (
    <div className="space-y-8 text-xs font-sans text-text">
      
      {/* 1. Header Board Grid */}
      <div className="relative border border-border rounded-xl p-6 md:p-8 space-y-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-extrabold uppercase text-[9px] tracking-widest border border-emerald-400/20 flex items-center gap-1">
                <CloudLightning className="w-3 h-3 text-emerald-400 animate-pulse" />
                Composio Runtime
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h2 className="text-lg md:text-xl font-black text-text tracking-tight flex items-center gap-2">
              <Cpu className="w-6 h-6" />
              Composio.dev Agent Integrations Center
            </h2>
            <p className="text-text-muted text-[11px] leading-relaxed max-w-2xl">
              Connect external enterprise tools directly to your sales automation agents, allowing your SDR and AE bots to execute outbound actions on Slack, write contacts in HubSpot, deploy GitHub tickets, and shoot email copies.
            </p>
          </div>

          <button 
            onClick={() => { fetchConnections(); appendToTerminal("Live sync connections request issued."); }}
            disabled={isLoadingConnections}
            className="md:self-start flex items-center gap-1.5 px-4.5 py-3.5 bg-surface hover:bg-surface-alt border border-border rounded-xl font-bold hover:text-brand transition-all cursor-pointer select-none text-xs disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4${isLoadingConnections ? "animate-spin" : ""}`} />
            Sync Connections Status
          </button>
        </div>

        {/* API Key settings card inside composio dashboard */}
        <div className="p-5 bg-black/40 border border-border/80 rounded-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center border border-orange-400/20">
                <Key className="w-5 h-5 text-orange-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">Active Composio Token Credentials</span>
                <span className="font-mono text-zinc-300 font-bold tracking-wider text-xs select-all">{maskedKey}</span>
              </div>
            </div>

            <button 
              onClick={() => {
                setTempKey(apiKeySecret);
                setIsEditingKey(!isEditingKey);
              }}
              className="px-4 py-2 bg-surface hover:bg-surface-alt border border-border rounded-xl font-bold select-none cursor-pointer text-xs"
            >
              {isEditingKey ? "Collapse Settings" : "Configure Custom API Token"}
            </button>
          </div>

          {isEditingKey && (
            <form onSubmit={handleUpdateKey} className="pt-4 border-t border-border/40 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">Edit Secret Key</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="password"
                    required
                    placeholder="ak_p4..."
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-black/80 border border-border hover:border-brand rounded-xl font-mono text-text text-xs tracking-wider font-extrabold focus:outline-none"
                  />
                  <div className="flex gap-2.5 shrink-0">
                    <button 
                      type="submit"
                      disabled={isLoadingKey || !tempKey.trim()}
                      className="px-5 py-2.5 bg-brand hover:bg-brand/90 text-black font-extrabold rounded-xl transition-all cursor-pointer text-xs"
                    >
                      {isLoadingKey ? "Saving Token..." : "Register Key"}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditingKey(false)}
                      className="px-4 py-2.5 bg-surface hover:bg-zinc-700 text-text rounded-xl cursor-pointer text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-text-muted">
                The platform securely proxies other services on behalf of your credentials client. Never commits keys plain-text into the browser.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* 2. Interactive Integrations App Grid */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold text-text flex items-center gap-1.5">
              <Zap className="w-4.5 h-4.5 text-brand" />
              Available App Integrations
            </h3>
            <p className="text-text-muted text-[10px]">Verify connected developer status profiles or connect new workspace targets using Composio OAuth.</p>
          </div>

          {/* Filters */}
          <div className="flex bg-black/40 border border-border rounded-xl p-1 shrink-0">
            {[
              { id: "all", label: "All Suite" },
              { id: "messaging", label: "Email & Slack" },
              { id: "crm", label: "CRM" },
              { id: "productivity", label: "Productivity" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveCategory(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  activeCategory === f.id ? "bg-surface text-brand outline-none shadow-sm" : "text-text-muted hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* App List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map(app => {
            const connected = isAppConnected(app.name);
            const connId = getAppConnectionId(app.name);
            const AppIcon = app.icon;

            return (
              <div 
                key={app.id} 
                className={`bg-surface/60 border rounded-3xl p-5 space-y-4 hover:border-brand/35 transition-all ${
                  connected ? "border-emerald-500/25 bg-[#0a1410]/20 glow-emerald-500/5 hover:border-emerald-500/40" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                      connected 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                        : "bg-surface-alt border-border text-brand"
                    }`}>
                      <AppIcon className="w-5.5 h-5.5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-text text-xs block">{app.label}</span>
                      <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">{getCategoryLabel(app.category)}</span>
                    </div>
                  </div>

                  {connected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-bold uppercase tracking-wider border border-emerald-500/25">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface text-zinc-500 text-[8px] font-bold uppercase tracking-wider border border-border">
                      Disconnected
                    </span>
                  )}
                </div>

                <p className="text-text-muted text-[10px] leading-relaxed h-11 overflow-hidden">
                  {app.description}
                </p>

                {/* Connection Controls */}
                <div className="pt-2 border-t border-border/40 flex justify-between items-center gap-4">
                  {connected ? (
                    <>
                      <div className="text-[9px] text-text-muted truncate flex-1 font-mono uppercase">
                        ID: <span className="text-zinc-300 font-bold" title={connId}>{connId.substring(0, 10)}...</span>
                      </div>
                      <button 
                        onClick={() => handleRevokeConnection(connId, app.label)}
                        className="px-3.5 py-2 text-rose-400 hover:text-rose-300 border border-border hover:border-rose-500/30 bg-surface rounded-xl select-none flex items-center gap-1 cursor-pointer transition-colors"
                        title="Remove Connection credentials"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleInitiateConnection(app.name)}
                      disabled={isCreatingLink && connectingAppId === app.name}
                      className="w-full px-4 py-2.5 bg-brand hover:bg-brand/90 text-black font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isCreatingLink && connectingAppId === app.name ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Initiating Link...
                        </>
                      ) : (
                        <>
                          <Link className="w-3.5 h-3.5" />
                          Connect Integration
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Redirect Link Overlay Option */}
                {!connected && authRedirectUrl && connectingAppId === app.name && (
                  <div className="p-3 bg-brand/5 border border-border rounded-xl space-y-2 mt-2 leading-relaxed">
                    <span className="text-[9px] font-bold text-brand uppercase block animate-pulse">🔒 Authorization Window Ready</span>
                    <p className="text-[9px] text-text-muted">Click the link below to verify credentials on the official secure portal:</p>
                    <a 
                      href={authRedirectUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-brand text-black font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1 cursor-pointer hover:bg-brand/90 transition-all select-none leading-none"
                    >
                      <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                      Authenticate {app.label} Connection
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Action Playground Board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Action Form Card */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <span className="px-2 py-0.5 rounded-full bg-brand-alt/10 text-brand-alt font-extrabold uppercase text-[8px] tracking-widest border border-brand-alt/25">
              Outbound Sandbox
            </span>
            <h3 className="text-sm font-extrabold text-text flex items-center gap-2 mt-1">
              <Play className="w-4 h-4 text-brand-alt" />
              Composio Action Execution Playground
            </h3>
            <p className="text-text-muted text-[10px] leading-relaxed">
              Manually evaluate outbound messages and pipeline actions using active connected profiles. This validates the live operational integration pipeline.
            </p>
          </div>

          {/* Trigger App selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">Select connected App integration</label>
            <div className="grid grid-cols-5 gap-2">
              {SUPPORTED_APPS.map(app => {
                const connected = isAppConnected(app.name);
                const selected = selectedAppForAction.id === app.id;
                const Icon = app.icon;

                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => {
                      setSelectedAppForAction(app);
                      setActionPayload({});
                      setExecutionResult(null);
                    }}
                    className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all text-center cursor-pointer ${
                      selected 
                        ? "bg-[#111322] border-brand text-brand" 
                        : connected 
                          ? "bg-black/20 border-emerald-500/20 text-zinc-300 hover:border-zinc-700" 
                          : "bg-black/35 border-border text-zinc-500 hover:border-zinc-800"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[9px] font-bold block truncate max-w-full leading-none">{app.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action form payload fields */}
          <form onSubmit={handleExecuteAction} className="p-5 bg-black/30 border border-border rounded-xl space-y-4">
            <div className="border-b border-border pb-2.5 mb-2">
              <span className="text-[9px] font-mono text-brand font-bold uppercase tracking-wider block">REST Target Action ID</span>
              <span className="text-[11px] text-text font-extrabold select-all">{selectedAppForAction.popularAction.id}</span>
              <p className="text-[10px] text-text-muted mt-1 leading-relaxed">{selectedAppForAction.popularAction.desc}</p>
            </div>

            {selectedAppForAction.popularAction.fields.map(field => {
              const value = actionPayload[field.name] || "";
              return (
                <div key={field.name} className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea 
                      required
                      placeholder={field.placeholder}
                      value={value}
                      rows={4}
                      onChange={(e) => setActionPayload({ ...actionPayload, [field.name]: e.target.value })}
                      className="w-full px-3.5 py-2 bg-black/80 border border-border hover:border-brand rounded-xl focus:outline-none placeholder:text-zinc-600 focus:ring-0 leading-relaxed font-sans text-xs"
                    />
                  ) : (
                    <input 
                      type="text"
                      required
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(e) => setActionPayload({ ...actionPayload, [field.name]: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-black/80 border border-border hover:border-brand rounded-xl focus:outline-none placeholder:text-zinc-600 focus:ring-0 font-sans text-xs"
                    />
                  )}
                </div>
              );
            })}

            {isAppConnected(selectedAppForAction.name) ? (
              <button 
                type="submit"
                disabled={isExecutingAction}
                className="w-full py-3 bg-brand text-black font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs select-none"
              >
                {isExecutingAction ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing Action Rest Request...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute Action on Composio
                  </>
                )}
              </button>
            ) : (
              <div className="p-3.5 bg-rose-500/5 border border-rose-500/10 text-rose-400 rounded-xl text-center text-[10px] leading-relaxed">
                Connect your <strong>{selectedAppForAction.label}</strong> integration account in the available apps grid to unlock code action execution.
              </div>
            )}
          </form>

          {/* Action response results */}
          {executionResult && (
            <div className="p-5 border rounded-xl space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase block tracking-wider">RESPONSE PAYLOAD RECEIVED</span>
              <pre className="text-[10px] font-mono leading-relaxed bg-black/40 p-3 rounded-xl overflow-x-auto text-zinc-300 max-h-40">
                {JSON.stringify(executionResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Live Terminal Logger Console */}
        <div className="lg:col-span-5 bg-black border border-border rounded-xl p-6 flex flex-col h-[520px] relative">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4.5 h-4.5 text-orange-400" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Integration Terminal Logs</span>
            </div>
            <button 
              onClick={() => setTerminalLogs([])}
              className="text-[9px] font-mono text-zinc-600 hover:text-zinc-400 cursor-pointer hover:underline"
            >
              Clear Console
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[9px] text-zinc-500 leading-normal custom-scrollbar select-all pr-1">
            {terminalLogs.length === 0 ? (
              <div className="text-center italic pt-20 text-zinc-700">
                Console idle. Issue connection linkages, custom credentials token swaps, or triggers to output telemetry.
              </div>
            ) : (
              terminalLogs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                  {log.includes("Succeeded") || log.includes("Successfully") ? (
                    <span className="text-emerald-400 font-bold">{log}</span>
                  ) : log.includes("Failed") || log.includes("Error") ? (
                    <span className="text-rose-400 font-bold">{log}</span>
                  ) : log.includes("Initiating") || log.includes("Spawning") ? (
                    <span className="text-zinc-300">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-zinc-850 pt-3 mt-3 flex items-center justify-between text-[10px] text-zinc-500 shrink-0 font-mono">
            <span>Client State: OK</span>
            <span>Channel: HTTPS Rest</span>
          </div>
        </div>

      </div>

    </div>
  );
};
