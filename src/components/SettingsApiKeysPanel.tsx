import React, { useEffect, useState, useRef } from "react";
import { 
  Key, Plus, Trash2, Mail, ShieldAlert, Link, RefreshCw, Check, 
  ExternalLink, Globe, Wifi, Send, CheckCircle2, XCircle, AlertTriangle,
  Mic, Search, Webhook, Settings
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

  // Service overrides states
  const [listmonkUrl, setListmonkUrl] = useState(localStorage.getItem("zy_listmonk_url") || "http://localhost:9000");
  const [listmonkApiKey, setListmonkApiKey] = useState(localStorage.getItem("zy_listmonk_api_key") || "");
  const [whisperUrl, setWhisperUrl] = useState(localStorage.getItem("zy_whisper_url") || "http://localhost:8178");
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState(localStorage.getItem("zy_n8n_webhook_url") || "http://localhost:5678");
  const [meilisearchUrl, setMeilisearchUrl] = useState(localStorage.getItem("zy_meilisearch_url") || "http://localhost:7700");
  const [meilisearchKey, setMeilisearchKey] = useState(localStorage.getItem("zy_meilisearch_key") || "");

  const handleSaveServiceSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("zy_listmonk_url", listmonkUrl);
    localStorage.setItem("zy_listmonk_api_key", listmonkApiKey);
    localStorage.setItem("zy_whisper_url", whisperUrl);
    localStorage.setItem("zy_n8n_webhook_url", n8nWebhookUrl);
    localStorage.setItem("zy_meilisearch_url", meilisearchUrl);
    localStorage.setItem("zy_meilisearch_key", meilisearchKey);
    showToast("Integration Service configurations updated successfully!", "success");
    window.dispatchEvent(new Event("storage"));
  };


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
    <div >
      
      {/* 1. Developer API Credentials */}
      <div >
        <div >
          <div >
            <h3 >
              <Key  />
              REST API keys Credential Store
            </h3>
            <p >
              Spawn secret access credentials to query leads catalog, sync campaigns, or triggers from exterior clients.
            </p>
          </div>
        </div>

        {/* Create Form */}
        <form onSubmit={handleGenerateApiKey} >
          <div >
            <label >API Client Label Name</label>
            <input 
              type="text"
              placeholder="e.g. Zentra Zapier Integration, Dev-Client Outpost"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              
            />
          </div>
          <div >
            <button
              type="submit"
              disabled={isGenerating || !newKeyName.trim()}
              
            >
              <Plus  />
              Generate API Key
            </button>
          </div>
        </form>

        {/* Copy Area for new plain text key */}
        {createdKeyPlain && (
          <div >
            <div >
              <span  />
              <span >Backup your raw credentials secret:</span>
            </div>
            <p >
              This API token is stored securely after hashing. For safety, this plain secret token **will not be accessible again**.
            </p>
            <div >
              <span >{createdKeyPlain}</span>
              <span >Copied to Clipboard</span>
            </div>
          </div>
        )}

        {/* Existing keys list */}
        <div >
          <h4 >Currently Active Credentials</h4>
          <div >
            {apiKeys.length === 0 ? (
              <div >
                No active external developer tokens generated. Standard sandbox operates in OAuth browser modes.
              </div>
            ) : (
              apiKeys.map((k) => (
                <div key={k.id} >
                  <div >
                    <span >{k.name}</span>
                    <div >
                      <span>Prefix: <span >{k.keyPrefix}</span></span>
                      <span>•</span>
                      <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteApiKey(k.id, k.name)}
                    
                    title="Revoke Token Keys"
                  >
                    <Trash2  />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Webhooks Configuration and deliveries */}
      <div >
        <div >
          <h3 >
            <Globe  />
            Outbound Real-Time Webhook Subscriptions
          </h3>
          <p >
            Configure target webhook endpoints to listen dynamically for platform events: created target leads, scoring stage deals updates, or failed CRM integrations syncs.
          </p>
        </div>

        <div >
          
          {/* Create webhook panel */}
          <form onSubmit={handleCreateWebhook} >
            <h4 >Register Endpoint</h4>
            
            <div >
              <label >Destination Url</label>
              <input
                type="url"
                placeholder="https://your-crm.inbound-webhooks/leads"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                
              />
            </div>

            <div >
              <label >Select Subscription Triggers</label>
              <div >
                {[
                  { key: "lead.created", label: "Lead created", desc: "Triggers on manual REST or mapped excel import leads additions" },
                  { key: "lead.updated", label: "Lead parameters modified", desc: "Triggers on campaign updates, ratings changes" },
                  { key: "deal.stage_changed", label: "Deal status shifted", desc: "Triggers when deal moving in negotiation funnel stages" },
                  { key: "crm.sync_failed", label: "CRM synchronization failed", desc: "Provides failure alert and error payload on REST failed mapping" }
                ].map((ev) => {
                  const checked = selectedEvents.includes(ev.key);
                  return (
                    <label key={ev.key} >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleEvent(ev.key)}
                        
                      />
                      <div>
                        <span >{ev.label}</span>
                        <span >{ev.key}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingWebhook || !targetUrl.trim()}
              
            >
              Add Outbound Gateway
            </button>
          </form>

          {/* Connected Webhooks and dynamic logs */}
          <div >
            <div >
              <h4 >Registered Webhook Targets</h4>
              <div >
                {webhooks.length === 0 ? (
                  <div >
                    No outbound webhook endpoints connected. Outbound CRM events are skipped.
                  </div>
                ) : (
                  webhooks.map((w) => (
                    <div key={w.id} >
                      <div >
                        <span  title={w.url}>
                          {w.url}
                        </span>
                        <div >
                          {w.events.map(ev => (
                            <span key={ev} >
                              {ev}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteWebhook(w.id)}
                        
                      >
                        <Trash2  />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Simulated payload dispatcher triggers tests */}
            {webhooks.length > 0 && (
              <div >
                <span >Webhook Delivery Testing Suite</span>
                <p >Click triggers below to dispatch mock events instantly over live webhook queues.</p>
                <div >
                  <button 
                    onClick={() => handleTriggerMockWebhookEvent("lead.created")}
                    
                  >
                    🚀 Trigger Lead Created Event
                  </button>
                  <button 
                    onClick={() => handleTriggerMockWebhookEvent("deal.stage_changed")}
                    
                  >
                    🤝 Trigger Deal Changed Event
                  </button>
                  <button 
                    onClick={() => handleTriggerMockWebhookEvent("crm.sync_failed")}
                    
                  >
                    🚨 Trigger CRM Sync Failed Event
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Delivery Logs Panel with live retry checks */}
        <div >
          <div >
            <h4 >
              Webhook Delivery Logs Feed (Exponential retry logs - max 3 attempts)
            </h4>
            <button
              onClick={fetchWebhookLogs}
              disabled={isRefreshingLogs}
              
            >
              <RefreshCw  />
              Reload Logs feed
            </button>
          </div>

          <div >
            {webhookLogs.length === 0 ? (
              <div >
                No outbound events dispatched. Trigger catalog events to output execution logs.
              </div>
            ) : (
              webhookLogs.map((log) => {
                const isSuccess = log.status === "success";
                const dateText = new Date(log.lastAttemptAt).toLocaleTimeString();
                
                return (
                  <div key={log.id} >
                    <div >
                      <div >
                        {isSuccess ? (
                          <span >
                            <CheckCircle2  />
                            Success (200 OK)
                          </span>
                        ) : (
                          <span >
                            <XCircle  />
                            Dispatch Failed
                          </span>
                        )}
                        <span >{log.event}</span>
                        <span >ID: {log.eventId}</span>
                      </div>
                      
                      <div >
                        Payload: <span >{log.payload}</span>
                      </div>

                      {log.responseBody && (
                        <div >
                          Response: <span >{log.responseBody}</span>
                        </div>
                      )}
                    </div>

                    <div >
                      <span >Last Try: {dateText}</span>
                      <span >
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

      {/* 3. Integration Service Settings */}
      <div >
        <div >
          <h3 >
            <Settings  />
            External Services & Docker Integration Config
          </h3>
          <p >
            Configure local URLs and security keys for Listmonk email outreach, Whisper audio transcriptions, n8n orchestrations, and Meilisearch engine.
          </p>
        </div>

        <form onSubmit={handleSaveServiceSettings} >
          <div >
            
            {/* Listmonk Config */}
            <div >
              <h4 >
                <Mail  />
                Listmonk (Email)
              </h4>
              <div >
                <div>
                  <label >Service URL</label>
                  <input
                    type="url"
                    value={listmonkUrl}
                    onChange={(e) => setListmonkUrl(e.target.value)}
                    
                    placeholder="http://localhost:9000"
                  />
                </div>
                <div>
                  <label >API Key / Token</label>
                  <input
                    type="password"
                    value={listmonkApiKey}
                    onChange={(e) => setListmonkApiKey(e.target.value)}
                    
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>
            </div>

            {/* Whisper Config */}
            <div >
              <h4 >
                <Mic  />
                Whisper.cpp (Transcription)
              </h4>
              <div >
                <div>
                  <label >Service URL</label>
                  <input
                    type="url"
                    value={whisperUrl}
                    onChange={(e) => setWhisperUrl(e.target.value)}
                    
                    placeholder="http://localhost:8178"
                  />
                </div>
              </div>
            </div>

            {/* n8n Workflows Config */}
            <div >
              <h4 >
                <Webhook  />
                n8n Webhook
              </h4>
              <div >
                <div>
                  <label >Webhook URL</label>
                  <input
                    type="url"
                    value={n8nWebhookUrl}
                    onChange={(e) => setN8nWebhookUrl(e.target.value)}
                    
                    placeholder="http://localhost:5678"
                  />
                </div>
              </div>
            </div>

            {/* Meilisearch Config */}
            <div >
              <h4 >
                <Search  />
                Meilisearch (Search Index)
              </h4>
              <div >
                <div>
                  <label >Service URL</label>
                  <input
                    type="url"
                    value={meilisearchUrl}
                    onChange={(e) => setMeilisearchUrl(e.target.value)}
                    
                    placeholder="http://localhost:7700"
                  />
                </div>
                <div>
                  <label >Master Key</label>
                  <input
                    type="password"
                    value={meilisearchKey}
                    onChange={(e) => setMeilisearchKey(e.target.value)}
                    
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>
            </div>

          </div>

          <div >
            <button
              type="submit"
              
            >
              <Check  />
              Save Integration Overrides
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};
