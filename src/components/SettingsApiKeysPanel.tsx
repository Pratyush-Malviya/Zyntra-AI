import React, { useEffect, useState, useRef } from "react";
import { 
  Key, Plus, Trash2, Mail, ShieldAlert, Link, RefreshCw, Check, 
  ExternalLink, Globe, Wifi, Send, CheckCircle2, XCircle, AlertTriangle
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  rawKey?: string; // only returned once
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

interface SettingsApiKeysPanelProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const SettingsApiKeysPanel: React.FC<SettingsApiKeysPanelProps> = ({ showToast }) => {
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

  const fetchApiKeys = async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        setApiKeys(await res.json());
      }
    } catch (err) {
      console.error("Failed parsing API credentials", err);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) {
        setWebhooks(await res.json());
      }
    } catch (err) {
      console.error("Failed parsing Webhook configurations", err);
    }
  };

  const fetchWebhookLogs = async () => {
    setIsRefreshingLogs(true);
    try {
      const res = await fetch("/api/webhooks/logs");
      if (res.ok) {
        setWebhookLogs(await res.json());
      }
    } catch (err) {
      console.error("Failed loading webhook delivery logs", err);
    }
    setIsRefreshingLogs(false);
  };

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
    fetchWebhookLogs();

    // refresh webhook logs every 8 seconds in background
    const interval = setInterval(() => {
      fetchWebhookLogs();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

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
        showToast("B2B Developer REST API Key spawned completely!", "success");
      } else {
        showToast("Error spawning API credentials.", "error");
      }
    } catch (err) {
      showToast("Network pipeline error.", "error");
    }
    setIsGenerating(false);
  };

  const handleDeleteApiKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently revoke: "${name}"?`)) return;

    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("API Credentials revoked completely.", "success");
        fetchApiKeys();
        if (createdKeyPlain && createdKeyPlain.startsWith(id)) {
          setCreatedKeyPlain(null);
        }
      }
    } catch (err) {
      showToast("Network error revoking API Key.", "error");
    }
  };

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
        showToast("Outbound webhook gateway endpoint added!", "success");
      } else {
        showToast("Failed to configure webhook target.", "error");
      }
    } catch (err) {
      showToast("Network pipeline error creating webhook.", "error");
    }
    setIsCreatingWebhook(false);
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm("Permanently deactivate and delete outbound webhook endpoint?")) return;

    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Outbound webhook target deleted successfully.", "success");
        fetchWebhooks();
      }
    } catch (err) {
      showToast("Network error deleting webhook.", "error");
    }
  };

  const handleToggleEvent = (eventKey: string) => {
    if (selectedEvents.includes(eventKey)) {
      setSelectedEvents(selectedEvents.filter(e => e !== eventKey));
    } else {
      setSelectedEvents([...selectedEvents, eventKey]);
    }
  };

  const handleTriggerMockWebhookEvent = async (eventName: string) => {
    showToast(`Injecting mock event '${eventName}' to trigger webhook handlers...`, "info");
    // Trigger is easily simulated by POSTing a new lead or scoring deal update
    try {
      if (eventName === "lead.created") {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Mock webhook-tester", email: "webhook@zyntra.test", company: "Zyntra AI Sandbox" })
        });
      } else if (eventName === "deal.stage_changed") {
        await fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Mock Hubspot Deal", value: 35000, stage: "Proposal", leadId: "lead-2" })
        });
      } else if (eventName === "crm.sync_failed") {
        // Trigger sync of a missing lead ID which will naturally fail
        await fetch("/api/crm-sync/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lead_id: "lead-2", workspace_id: "org-default" })
        });
      }
      setTimeout(() => {
        fetchWebhookLogs();
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 text-xs">
      
      {/* 1. Developer API Credentials */}
      <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 glow-brand/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-brand" />
              REST API keys Credential Store
            </h3>
            <p className="text-[10px] text-text-muted">
              Spawn secret access credentials to query leads catalog, sync campaigns, or triggers from exterior clients.
            </p>
          </div>
        </div>

        {/* Create Form */}
        <form onSubmit={handleGenerateApiKey} className="flex gap-4 p-5 bg-[#090a0f]/40 border border-border/70 rounded-2xl">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">API Client Label Name</label>
            <input 
              type="text"
              placeholder="e.g. Zentra Zapier Integration, Dev-Client Outpost"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="w-full px-3.5 py-3 bg-[#090a0f] border border-border hover:border-brand rounded-xl font-bold font-sans text-xs focus:outline-none focus:border-brand"
            />
          </div>
          <div className="flex items-end shrink-0">
            <button
              type="submit"
              disabled={isGenerating || !newKeyName.trim()}
              className="px-5 py-3.5 bg-brand hover:bg-brand/90 text-[#090a0f] font-extrabold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-4 h-4 text-[#090a0f] stroke-[3]" />
              Generate API Key
            </button>
          </div>
        </form>

        {/* Copy Area for new plain text key */}
        {createdKeyPlain && (
          <div className="p-5 bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-[10px] uppercase tracking-widest text-[#00d4aa]">Backup your raw credentials secret:</span>
            </div>
            <p className="text-[10px] text-text-muted font-medium leading-relaxed">
              This API token is stored securely after hashing. For safety, this plain secret token **will not be accessible again**.
            </p>
            <div className="flex items-center justify-between p-3.5 bg-[#090a0f] border border-border rounded-xl">
              <span className="font-mono text-xs select-all text-white font-extrabold tracking-wide">{createdKeyPlain}</span>
              <span className="text-[9px] text-brand border border-brand/20 bg-brand/5 px-2 py-0.5 rounded-lg ml-3">Copied to Clipboard</span>
            </div>
          </div>
        )}

        {/* Existing keys list */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Currently Active Credentials</h4>
          <div className="bg-[#090a0f] border border-border rounded-2xl overflow-hidden divide-y divide-border/40">
            {apiKeys.length === 0 ? (
              <div className="p-6 text-center text-text-muted italic">
                No active external developer tokens generated. Standard sandbox operates in OAuth browser modes.
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
                    title="Revoke Token Keys"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Webhooks Configuration and deliveries */}
      <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 glow-brand/5">
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Globe className="w-4.5 h-4.5 text-[#00d4aa]" />
            Outbound Real-Time Webhook Subscriptions
          </h3>
          <p className="text-[10px] text-text-muted">
            Configure target webhook endpoints to listen dynamically for platform events: created target leads, scoring stage deals updates, or failed CRM integrations syncs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Create webhook panel */}
          <form onSubmit={handleCreateWebhook} className="lg:col-span-5 space-y-4 p-5 bg-[#090a0f]/40 border border-border/70 rounded-2xl h-fit">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#00d4aa] border-b border-border/40 pb-2 mb-2">Register Endpoint</h4>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">Destination Url</label>
              <input
                type="url"
                placeholder="https://your-crm.inbound-webhooks/leads"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full px-3 py-2 bg-[#090a0f] border border-border hover:border-brand rounded-xl font-mono text-[10px] text-white focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">Select Subscription Triggers</label>
              <div className="space-y-2">
                {[
                  { key: "lead.created", label: "Lead created", desc: "Triggers on manual REST or mapped excel import leads additions" },
                  { key: "lead.updated", label: "Lead parameters modified", desc: "Triggers on campaign updates, ratings changes" },
                  { key: "deal.stage_changed", label: "Deal status shifted", desc: "Triggers when deal moving in negotiation funnel stages" },
                  { key: "crm.sync_failed", label: "CRM synchronization failed", desc: "Provides failure alert and error payload on REST failed mapping" }
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

          {/* Connected Webhooks and dynamic logs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3.5">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Registered Webhook Targets</h4>
              <div className="bg-[#090a0f] border border-border rounded-2xl overflow-hidden divide-y divide-border/40">
                {webhooks.length === 0 ? (
                  <div className="p-5 text-center text-text-muted italic">
                    No outbound webhook endpoints connected. Outbound CRM events are skipped.
                  </div>
                ) : (
                  webhooks.map((w) => (
                    <div key={w.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1.5 truncate">
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
                        className="w-8 h-8 rounded-lg hover:bg-rose-500/10 text-rose-400 flex items-center justify-center transition-all cursor-pointer hover:border-red-500 border border-border"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Simulated payload dispatcher triggers tests */}
            {webhooks.length > 0 && (
              <div className="p-4 bg-[#090a0f]/40 border border-border/80 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand block">Webhook Delivery Testing Suite</span>
                <p className="text-[9px] text-text-muted">Click triggers below to dispatch mock events instantly over live webhook queues.</p>
                <div className="flex flex-wrap gap-2.5">
                  <button 
                    onClick={() => handleTriggerMockWebhookEvent("lead.created")}
                    className="px-2.5 py-1.5 bg-surface font-semibold border border-border hover:border-[#00d4aa] rounded-lg text-[9px] transition-all cursor-pointer text-text"
                  >
                    🚀 Trigger Lead Created Event
                  </button>
                  <button 
                    onClick={() => handleTriggerMockWebhookEvent("deal.stage_changed")}
                    className="px-2.5 py-1.5 bg-surface font-semibold border border-border hover:border-[#00d4aa] rounded-lg text-[9px] transition-all cursor-pointer text-text"
                  >
                    🤝 Trigger Deal Changed Event
                  </button>
                  <button 
                    onClick={() => handleTriggerMockWebhookEvent("crm.sync_failed")}
                    className="px-2.5 py-1.5 bg-surface font-semibold border border-border hover:border-rose-500/40 rounded-lg text-[9px] transition-all cursor-pointer text-text"
                  >
                    🚨 Trigger CRM Sync Failed Event
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Delivery Logs Panel with live retry checks */}
        <div className="space-y-3 border-t border-border/40 pt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
              Webhook Delivery Logs Feed (Exponential retry logs - max 3 attempts)
            </h4>
            <button
              onClick={fetchWebhookLogs}
              disabled={isRefreshingLogs}
              className="text-[9px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingLogs ? "animate-spin" : ""}`} />
              Reload Logs feed
            </button>
          </div>

          <div className="bg-[#090a0f] border border-border rounded-2xl overflow-hidden overflow-y-auto max-h-56 divide-y divide-border/50 font-mono text-[10px] custom-scrollbar">
            {webhookLogs.length === 0 ? (
              <div className="p-6 text-center text-text-muted italic font-sans">
                No outbound events dispatched. Trigger catalog events to output execution logs.
              </div>
            ) : (
              webhookLogs.map((log) => {
                const isSuccess = log.status === "success";
                const dateText = new Date(log.lastAttemptAt).toLocaleTimeString();
                
                return (
                  <div key={log.id} className="p-3 bg-surface-alt/10 hover:bg-surface-alt/45 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-[10px]">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[8px] uppercase">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Success (200 OK)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded text-[8px] uppercase">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            Dispatch Failed
                          </span>
                        )}
                        <span className="text-white font-bold">{log.event}</span>
                        <span className="text-text-muted shrink-0 text-[8px]">ID: {log.eventId}</span>
                      </div>
                      
                      <div className="text-[9px] text-text-muted leading-relaxed truncate max-w-md">
                        Payload: <span className="text-white select-all">{log.payload}</span>
                      </div>

                      {log.responseBody && (
                        <div className="text-[9px] text-text-muted bg-[#05060b] p-1.5 rounded border border-border/40 font-mono leading-relaxed mt-1">
                          Response: <span className="text-brand-alt">{log.responseBody}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col items-end shrink-0 gap-3 text-right">
                      <span className="text-[9px] text-text-muted">Last Try: {dateText}</span>
                      <span className="text-[8px] px-1.5 py-0.5 bg-surface border border-border rounded font-bold text-white uppercase tracking-wider block">
                        Attempts: {log.attempts} / 3 {log.attempts >= 3 && !isSuccess ? " [EXPIRED]" : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
