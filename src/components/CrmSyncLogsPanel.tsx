import React, { useEffect, useState, useRef } from "react";
import { Database, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
}

interface SyncLog {
  lead_id: string;
  workspace_id: string;
  status: "Mapped" | "Syncing" | "Failed";
  error_message: string;
  last_synced_at: string;
  retry_count: number;
}

interface CrmSyncLogsPanelProps {
  leads: Lead[];
  workspaceId?: string;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const CrmSyncLogsPanel: React.FC<CrmSyncLogsPanelProps> = ({ 
  leads, 
  workspaceId = "org-default", 
  showToast 
}) => {
  const [logs, setLogs] = useState<Record<string, SyncLog>>({});
  const [hoveredError, setHoveredError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch initial logs state with resilient retries
  const fetchSyncLogs = async (retries = 4, delay = 1500) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`/api/crm-sync/logs?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Accept": "application/json"
          }
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && !contentType.includes("application/json")) {
            throw new Error(`Expected JSON response but received: ${contentType}`);
          }
          const data: SyncLog[] = await res.json();
          const initialMap: Record<string, SyncLog> = {};
          data.forEach(log => {
            initialMap[log.lead_id] = log;
          });
          setLogs(initialMap);
          return; // Success
        } else {
          throw new Error(`Server returned status code ${res.status}`);
        }
      } catch (err) {
        console.warn(`[CRM Sync Logs] Attempt ${attempt} failed:`, err);
        if (attempt === retries) {
          console.error("Failed to fetch initial CRM sync logs", err);
        } else {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  useEffect(() => {
    fetchSyncLogs();
    
    // Setup WebSocket connection (Task 1 Technical Requirement)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/crm-sync/${workspaceId}`;
    
    const connectWS = () => {
      console.log(`[WS] Connecting to CRM Sync Gateway: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "sync:updated" && data.payload) {
            const updatedLog = data.payload as SyncLog;
            setLogs(prev => ({
              ...prev,
              [updatedLog.lead_id]: updatedLog
            }));
            
            if (updatedLog.status === "Mapped") {
              const lead = leads.find(l => l.id === updatedLog.lead_id);
              showToast(`Lead ${lead?.name || "Record"} successfully merged & mapped in CRM!`, "success");
            } else if (updatedLog.status === "Failed") {
              const lead = leads.find(l => l.id === updatedLog.lead_id);
              showToast(`CRM mapping failed for ${lead?.name}: ${updatedLog.error_message}`, "error");
            }
          }
        } catch (err) {
          console.error("WS message parse error", err);
        }
      };

      ws.onerror = () => {
        console.warn("[WS] Connection error. Using polling fallback.");
      };

      ws.onclose = () => {
        // Retry connection after 10s
        setTimeout(() => connectWS(), 10000);
      };
    };

    connectWS();

    // 5-second polling fallback (Task 1 Required)
    const interval = setInterval(() => {
      fetchSyncLogs();
    }, 5000);

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [leads, workspaceId]);

  // Handle individual lead retry logic
  const handleTriggerSync = async (leadId: string) => {
    // Set optimistic UI status
    setLogs(prev => ({
      ...prev,
      [leadId]: {
        ...(prev[leadId] || { lead_id: leadId, workspace_id: workspaceId, error_message: "", last_synced_at: new Date().toISOString(), retry_count: 0 }),
        status: "Syncing"
      }
    }));

    try {
      const res = await fetch("/api/crm-sync/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ lead_id: leadId, workspace_id: workspaceId })
      });
      
      if (!res.ok) {
        showToast("Failed to initiate sync thread.", "error");
        fetchSyncLogs(); // revert optimistic state
      } else {
        const data = await res.json();
        if (data.log) {
          setLogs(prev => ({
            ...prev,
            [leadId]: data.log
          }));
        }
      }
    } catch (err) {
      showToast("Network error initiating sync.", "error");
      fetchSyncLogs();
    }
  };

  const handleBulkSyncAll = async () => {
    setLoading(true);
    showToast(`Initializing batch CRM sync for ${leads.length} leads...`, "info");
    for (const lead of leads) {
      await handleTriggerSync(lead.id);
      // stagger triggers slightly to avoid backend spam
      await new Promise(r => setTimeout(r, 100));
    }
    setLoading(false);
  };

  return (
    <div className="crm-push-logs-panel bg-surface border border-border rounded-3xl p-6 space-y-6 glow-brand/5 relative mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-brand" />
            CRM Live Sync Dashboard
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Monitor real-time synchronization pipelines and webhook integrations with Salesforce / HubSpot.
          </p>
        </div>
        
        {leads.length > 0 && (
          <button
            onClick={handleBulkSyncAll}
            disabled={loading}
            className="px-4 py-2 bg-[#00d4aa]/10 border border-[#00d4aa]/30 hover:bg-[#00d4aa] hover:text-[#090a0f] text-[#00d4aa] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Force Global CRM Sync
          </button>
        )}
      </div>

      {/* CRM Sync Summary Cards Section */}
      {leads.length > 0 && (() => {
        const total = leads.length;
        const mapped = leads.filter(lead => logs[lead.id]?.status === "Mapped").length;
        const failed = leads.filter(lead => {
          const status = logs[lead.id]?.status;
          return status === "Failed" || !status;
        }).length;
        const syncing = leads.filter(lead => logs[lead.id]?.status === "Syncing").length;

        const totalAttempts = mapped + failed;
        const successAttemptRate = totalAttempts > 0 ? Math.round((mapped / totalAttempts) * 100) : 0;
        const failAttemptRate = totalAttempts > 0 ? 100 - successAttemptRate : 0;

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Success KPI Card */}
            <div className="bg-surface-alt/40 border border-border/60 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block">Success Rate (Mapped)</span>
                <span className="text-2xl md:text-3xl font-syne font-extrabold text-emerald-400 mt-1.5 block">
                  {Math.round((mapped / (total || 1)) * 100)}%
                </span>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                  Proportion of pipeline leads synced to target organizations securely.
                </p>
              </div>
              <div className="mt-4">
                <div className="w-full h-1.5 bg-rose-500/10 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${Math.round((mapped / (total || 1)) * 100)}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[9px] text-text-muted font-mono mt-1.5">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> {mapped} Successful</span>
                  <span>Total: {total}</span>
                </div>
              </div>
            </div>

            {/* Failure KPI Card */}
            <div className="bg-surface-alt/40 border border-border/60 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <AlertCircle className="w-12 h-12 text-rose-400" />
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block">Failure Rate (Failed / Unmapped)</span>
                <span className="text-2xl md:text-3xl font-syne font-extrabold text-rose-400 mt-1.5 block">
                  {Math.round((failed / (total || 1)) * 100)}%
                </span>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                  Percentage of targets currently failing validation rules or awaiting sync.
                </p>
              </div>
              <div className="mt-4">
                <div className="w-full h-1.5 bg-emerald-500/10 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 transition-all duration-700" style={{ width: `${Math.round((failed / (total || 1)) * 100)}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[9px] text-text-muted font-mono mt-1.5">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> {failed} Retriable</span>
                  <span>Requires Manual Retry</span>
                </div>
              </div>
            </div>

            {/* NEW Summary Card: Mapping Efficiency (Successful Mappings vs Failed Attempts) */}
            <div className="bg-surface-alt/40 border border-border/60 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <RefreshCw className="w-12 h-12 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block text-brand-alt">Mapping Efficiency Ratio</span>
                <span className="text-2xl md:text-3xl font-syne font-extrabold text-brand-alt mt-1.5 block">
                  {successAttemptRate}% / {failAttemptRate}%
                </span>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                  Direct ratio of successfully mapped versus failed mapping pipeline attempts.
                </p>
              </div>
              <div className="mt-4">
                {/* Horizontal split gauge bar */}
                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${successAttemptRate}%` }} title={`Success attempt rate: ${successAttemptRate}%`}></div>
                  <div className="h-full bg-rose-500 transition-all duration-700" style={{ width: `${failAttemptRate}%` }} title={`Failed attempt rate: ${failAttemptRate}%`}></div>
                </div>
                <div className="flex justify-between items-center text-[9px] text-text-muted font-mono mt-1.5">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> {mapped} Succeeded</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" /> {failed} Failed</span>
                </div>
              </div>
            </div>

            {/* Active Sync Pipeline Status */}
            <div className="bg-surface-alt/40 border border-border/60 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none animate-pulse">
                <Database className="w-12 h-12 text-cyan-400" />
              </div>
              <div>
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block">Active Webhook Queue</span>
                <span className="text-2xl md:text-3xl font-syne font-extrabold text-cyan-400 mt-1.5 block">
                  {syncing} Syncing
                </span>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                  Real-time parallel socket communication streams processing updates.
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/20 pt-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00d4aa] animate-ping" />
                  <span className="text-[10px] text-[#00d4aa] font-bold">Pipeline Online</span>
                </div>
                <div className="text-[10px] text-text-muted font-mono">
                  Volume: <b className="text-text">{total} Hits</b>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="overflow-x-auto min-h-32">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-[#090a0f]/40 border border-border/50 rounded-2xl text-center">
            <Database className="w-8 h-8 text-text-muted/40 mb-2" />
            <p className="text-xs font-bold text-text-muted">No Pipeline Leads Present</p>
            <p className="text-[10px] text-text-muted/60 mt-1 max-w-sm">
              Populate leads using Campaign settings, or run a smart CSV/Excel mapped catalog import.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[9px] font-bold uppercase tracking-widest text-text-muted">
                <th className="pb-3 pl-3">Lead Target</th>
                <th className="pb-3">Organization</th>
                <th className="pb-3">Email Address</th>
                <th className="pb-3 text-center">Status Badge</th>
                <th className="pb-3">Last Sync Date</th>
                <th className="pb-3 pr-3 text-right">Outreach Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {leads.map((lead) => {
                const log = logs[lead.id];
                const status = log?.status || "Failed"; // Default unmapped/missing to failed/retryable
                const errorMsg = log?.error_message || "Lead is unmapped. Click 'Sync' to provision.";
                const retryCount = log?.retry_count || 0;
                const lastSynced = log?.last_synced_at 
                  ? new Date(log.last_synced_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) 
                  : "Never";

                return (
                  <tr key={lead.id} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="py-3.5 pl-3 font-semibold text-text">{lead.name}</td>
                    <td className="py-3.5 text-text-muted font-medium">{lead.company}</td>
                    <td className="py-3.5 text-text-muted font-mono text-[11px]">{lead.email}</td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        {status === "Mapped" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Mapped
                          </span>
                        )}
                        {status === "Syncing" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold border border-cyan-500/20">
                            {/* Animated pulse badge strictly with standard keyframe */}
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            Syncing...
                          </span>
                        )}
                        {status === "Failed" && (
                          <div className="relative inline-block">
                            <span 
                              onMouseEnter={() => setHoveredError(lead.id)}
                              onMouseLeave={() => setHoveredError(null)}
                              onClick={() => setHoveredError(hoveredError === lead.id ? null : lead.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20 cursor-help relative"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                              Failed
                              <AlertCircle className="w-3 h-3 ml-0.5" />
                            </span>

                            {/* Error payload tooltip (Task 1 requirement) */}
                            {hoveredError === lead.id && (
                              <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 p-3 bg-[#0a0c14] border border-rose-500/30 rounded-xl shadow-2xl text-rose-300 text-[10px] leading-relaxed font-mono text-center">
                                <div className="font-bold text-rose-400 mb-1">CRM Sync Error:</div>
                                {errorMsg}
                                <div className="text-[8px] text-text-muted mt-1.5 border-t border-border/40 pt-1">
                                  Attempts: {retryCount} | Click tooltip to dismiss
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 text-text-muted font-mono text-[10px] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 opacity-55 text-text-muted" />
                      {lastSynced}
                    </td>
                    <td className="py-3.5 pr-3 text-right">
                      {status === "Failed" && (
                        <button
                          onClick={() => handleTriggerSync(lead.id)}
                          className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-rose-500/25"
                        >
                          Retry Sync
                        </button>
                      )}
                      {status === "Mapped" && (
                        <button
                          onClick={() => handleTriggerSync(lead.id)}
                          className="px-2.5 py-1 bg-surface-alt hover:bg-border text-text-muted hover:text-text rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-border"
                        >
                          Re-Sync Address
                        </button>
                      )}
                      {status === "Syncing" && (
                        <span className="text-[10px] text-text-muted italic animate-pulse">
                          Locking...
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-text-muted border-t border-border/30 pt-3 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>WebSocket Pipeline Status: Active (Listening)</span>
        </div>
        <span>Channel: ws://127.0.0.1/crm-sync/{workspaceId}</span>
      </div>
    </div>
  );
};
