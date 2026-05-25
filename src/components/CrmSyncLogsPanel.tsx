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

  // Fetch initial logs state
  const fetchSyncLogs = async () => {
    try {
      const res = await fetch("/api/crm-sync/logs");
      if (res.ok) {
        const data: SyncLog[] = await res.json();
        const initialMap: Record<string, SyncLog> = {};
        data.forEach(log => {
          initialMap[log.lead_id] = log;
        });
        setLogs(initialMap);
      }
    } catch (err) {
      console.error("Failed to fetch initial CRM sync logs", err);
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
