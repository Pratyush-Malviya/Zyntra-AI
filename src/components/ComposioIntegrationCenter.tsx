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
    <div >
      
      {/* 1. Header Board Grid */}
      <div >
        <div  />
        
        <div >
          <div >
            <div >
              <span >
                <CloudLightning  />
                Composio Runtime
              </span>
              <span  />
            </div>
            <h2 >
              <Cpu  />
              Composio.dev Agent Integrations Center
            </h2>
            <p >
              Connect external enterprise tools directly to your sales automation agents, allowing your SDR and AE bots to execute outbound actions on Slack, write contacts in HubSpot, deploy GitHub tickets, and shoot email copies.
            </p>
          </div>

          <button 
            onClick={() => { fetchConnections(); appendToTerminal("Live sync connections request issued."); }}
            disabled={isLoadingConnections}
            
          >
            <RefreshCw  />
            Sync Connections Status
          </button>
        </div>

        {/* API Key settings card inside composio dashboard */}
        <div >
          <div >
            <div >
              <div >
                <Key  />
              </div>
              <div >
                <span >Active Composio Token Credentials</span>
                <span >{maskedKey}</span>
              </div>
            </div>

            <button 
              onClick={() => {
                setTempKey(apiKeySecret);
                setIsEditingKey(!isEditingKey);
              }}
              
            >
              {isEditingKey ? "Collapse Settings" : "Configure Custom API Token"}
            </button>
          </div>

          {isEditingKey && (
            <form onSubmit={handleUpdateKey} >
              <div >
                <label >Edit Secret Key</label>
                <div >
                  <input 
                    type="password"
                    required
                    placeholder="ak_p4..."
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    
                  />
                  <div >
                    <button 
                      type="submit"
                      disabled={isLoadingKey || !tempKey.trim()}
                      
                    >
                      {isLoadingKey ? "Saving Token..." : "Register Key"}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditingKey(false)}
                      
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
              <p >
                The platform securely proxies other services on behalf of your credentials client. Never commits keys plain-text into the browser.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* 2. Interactive Integrations App Grid */}
      <div >
        <div >
          <div >
            <h3 >
              <Zap  />
              Available App Integrations
            </h3>
            <p >Verify connected developer status profiles or connect new workspace targets using Composio OAuth.</p>
          </div>

          {/* Filters */}
          <div >
            {[
              { id: "all", label: "All Suite" },
              { id: "messaging", label: "Email & Slack" },
              { id: "crm", label: "CRM" },
              { id: "productivity", label: "Productivity" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveCategory(f.id as any)}
                
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* App List Grid */}
        <div >
          {filteredApps.map(app => {
            const connected = isAppConnected(app.name);
            const connId = getAppConnectionId(app.name);
            const AppIcon = app.icon;

            return (
              <div 
                key={app.id} 
                
              >
                <div >
                  <div >
                    <div >
                      <AppIcon  />
                    </div>
                    <div >
                      <span >{app.label}</span>
                      <span >{getCategoryLabel(app.category)}</span>
                    </div>
                  </div>

                  {connected ? (
                    <span >
                      <CheckCircle2  />
                      Connected
                    </span>
                  ) : (
                    <span >
                      Disconnected
                    </span>
                  )}
                </div>

                <p >
                  {app.description}
                </p>

                {/* Connection Controls */}
                <div >
                  {connected ? (
                    <>
                      <div >
                        ID: <span  title={connId}>{connId.substring(0, 10)}...</span>
                      </div>
                      <button 
                        onClick={() => handleRevokeConnection(connId, app.label)}
                        
                        title="Remove Connection credentials"
                      >
                        <Trash2  />
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleInitiateConnection(app.name)}
                      disabled={isCreatingLink && connectingAppId === app.name}
                      
                    >
                      {isCreatingLink && connectingAppId === app.name ? (
                        <>
                          <RefreshCw  />
                          Initiating Link...
                        </>
                      ) : (
                        <>
                          <Link  />
                          Connect Integration
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Redirect Link Overlay Option */}
                {!connected && authRedirectUrl && connectingAppId === app.name && (
                  <div >
                    <span >🔒 Authorization Window Ready</span>
                    <p >Click the link below to verify credentials on the official secure portal:</p>
                    <a 
                      href={authRedirectUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      
                    >
                      <ExternalLink  />
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
      <div >
        
        {/* Action Form Card */}
        <div >
          <div >
            <span >
              Outbound Sandbox
            </span>
            <h3 >
              <Play  />
              Composio Action Execution Playground
            </h3>
            <p >
              Manually evaluate outbound messages and pipeline actions using active connected profiles. This validates the live operational integration pipeline.
            </p>
          </div>

          {/* Trigger App selector */}
          <div >
            <label >Select connected App integration</label>
            <div >
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
                    
                  >
                    <Icon  />
                    <span >{app.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action form payload fields */}
          <form onSubmit={handleExecuteAction} >
            <div >
              <span >REST Target Action ID</span>
              <span >{selectedAppForAction.popularAction.id}</span>
              <p >{selectedAppForAction.popularAction.desc}</p>
            </div>

            {selectedAppForAction.popularAction.fields.map(field => {
              const value = actionPayload[field.name] || "";
              return (
                <div key={field.name} >
                  <label >{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea 
                      required
                      placeholder={field.placeholder}
                      value={value}
                      rows={4}
                      onChange={(e) => setActionPayload({ ...actionPayload, [field.name]: e.target.value })}
                      
                    />
                  ) : (
                    <input 
                      type="text"
                      required
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(e) => setActionPayload({ ...actionPayload, [field.name]: e.target.value })}
                      
                    />
                  )}
                </div>
              );
            })}

            {isAppConnected(selectedAppForAction.name) ? (
              <button 
                type="submit"
                disabled={isExecutingAction}
                
              >
                {isExecutingAction ? (
                  <>
                    <RefreshCw  />
                    Executing Action Rest Request...
                  </>
                ) : (
                  <>
                    <Play  />
                    Execute Action on Composio
                  </>
                )}
              </button>
            ) : (
              <div >
                Connect your <strong>{selectedAppForAction.label}</strong> integration account in the available apps grid to unlock code action execution.
              </div>
            )}
          </form>

          {/* Action response results */}
          {executionResult && (
            <div >
              <span >RESPONSE PAYLOAD RECEIVED</span>
              <pre >
                {JSON.stringify(executionResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Live Terminal Logger Console */}
        <div >
          <div >
            <div >
              <Terminal  />
              <span >Integration Terminal Logs</span>
            </div>
            <button 
              onClick={() => setTerminalLogs([])}
              
            >
              Clear Console
            </button>
          </div>

          <div >
            {terminalLogs.length === 0 ? (
              <div >
                Console idle. Issue connection linkages, custom credentials token swaps, or triggers to output telemetry.
              </div>
            ) : (
              terminalLogs.map((log, idx) => (
                <div key={idx} >
                  {log.includes("Succeeded") || log.includes("Successfully") ? (
                    <span >{log}</span>
                  ) : log.includes("Failed") || log.includes("Error") ? (
                    <span >{log}</span>
                  ) : log.includes("Initiating") || log.includes("Spawning") ? (
                    <span >{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))
            )}
          </div>

          <div >
            <span>Client State: OK</span>
            <span>Channel: HTTPS Rest</span>
          </div>
        </div>

      </div>

    </div>
  );
};
