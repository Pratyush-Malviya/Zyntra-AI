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
    <div >
      <div >
        <div>
          <h3 >
            <Database  />
            CRM Live Sync Dashboard
          </h3>
          <p >
            Monitor real-time synchronization pipelines and webhook integrations with Salesforce / HubSpot.
          </p>
        </div>
        
        {leads.length > 0 && (
          <button
            onClick={handleBulkSyncAll}
            disabled={loading}
            
          >
            <RefreshCw  />
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
          <div >
            {/* Success KPI Card */}
            <div >
              <div >
                <CheckCircle  />
              </div>
              <div>
                <span >Success Rate (Mapped)</span>
                <span >
                  {Math.round((mapped / (total || 1)) * 100)}%
                </span>
                <p >
                  Proportion of pipeline leads synced to target organizations securely.
                </p>
              </div>
              <div >
                <div >
                  <div  style={{ width: `${Math.round((mapped / (total || 1)) * 100)}%` }}></div>
                </div>
                <div >
                  <span ><span  /> {mapped} Successful</span>
                  <span>Total: {total}</span>
                </div>
              </div>
            </div>

            {/* Failure KPI Card */}
            <div >
              <div >
                <AlertCircle  />
              </div>
              <div>
                <span >Failure Rate (Failed / Unmapped)</span>
                <span >
                  {Math.round((failed / (total || 1)) * 100)}%
                </span>
                <p >
                  Percentage of targets currently failing validation rules or awaiting sync.
                </p>
              </div>
              <div >
                <div >
                  <div  style={{ width: `${Math.round((failed / (total || 1)) * 100)}%` }}></div>
                </div>
                <div >
                  <span ><span  /> {failed} Retriable</span>
                  <span>Requires Manual Retry</span>
                </div>
              </div>
            </div>

            {/* NEW Summary Card: Mapping Efficiency (Successful Mappings vs Failed Attempts) */}
            <div >
              <div >
                <RefreshCw  />
              </div>
              <div>
                <span >Mapping Efficiency Ratio</span>
                <span >
                  {successAttemptRate}% / {failAttemptRate}%
                </span>
                <p >
                  Direct ratio of successfully mapped versus failed mapping pipeline attempts.
                </p>
              </div>
              <div >
                {/* Horizontal split gauge bar */}
                <div >
                  <div  style={{ width: `${successAttemptRate}%` }} title={`Success attempt rate: ${successAttemptRate}%`}></div>
                  <div  style={{ width: `${failAttemptRate}%` }} title={`Failed attempt rate: ${failAttemptRate}%`}></div>
                </div>
                <div >
                  <span ><span  /> {mapped} Succeeded</span>
                  <span ><span  /> {failed} Failed</span>
                </div>
              </div>
            </div>

            {/* Active Sync Pipeline Status */}
            <div >
              <div >
                <Database  />
              </div>
              <div>
                <span >Active Webhook Queue</span>
                <span >
                  {syncing} Syncing
                </span>
                <p >
                  Real-time parallel socket communication streams processing updates.
                </p>
              </div>
              <div >
                <div >
                  <span  />
                  <span >Pipeline Online</span>
                </div>
                <div >
                  Volume: <b >{total} Hits</b>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div >
        {leads.length === 0 ? (
          <div >
            <Database  />
            <p >No Pipeline Leads Present</p>
            <p >
              Populate leads using Campaign settings, or run a smart CSV/Excel mapped catalog import.
            </p>
          </div>
        ) : (
          <table >
            <thead>
              <tr >
                <th >Lead Target</th>
                <th >Organization</th>
                <th >Email Address</th>
                <th >Status Badge</th>
                <th >Last Sync Date</th>
                <th >Outreach Controls</th>
              </tr>
            </thead>
            <tbody >
              {leads.map((lead) => {
                const log = logs[lead.id];
                const status = log?.status || "Failed"; // Default unmapped/missing to failed/retryable
                const errorMsg = log?.error_message || "Lead is unmapped. Click 'Sync' to provision.";
                const retryCount = log?.retry_count || 0;
                const lastSynced = log?.last_synced_at 
                  ? new Date(log.last_synced_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) 
                  : "Never";

                return (
                  <tr key={lead.id} >
                    <td >{lead.name}</td>
                    <td >{lead.company}</td>
                    <td >{lead.email}</td>
                    <td >
                      <div >
                        {status === "Mapped" && (
                          <span >
                            <span  />
                            Mapped
                          </span>
                        )}
                        {status === "Syncing" && (
                          <span >
                            {/* Animated pulse badge strictly with standard keyframe */}
                            <span  />
                            Syncing...
                          </span>
                        )}
                        {status === "Failed" && (
                          <div >
                            <span 
                              onMouseEnter={() => setHoveredError(lead.id)}
                              onMouseLeave={() => setHoveredError(null)}
                              onClick={() => setHoveredError(hoveredError === lead.id ? null : lead.id)}
                              
                            >
                              <span  />
                              Failed
                              <AlertCircle  />
                            </span>

                            {/* Error payload tooltip (Task 1 requirement) */}
                            {hoveredError === lead.id && (
                              <div >
                                <div >CRM Sync Error:</div>
                                {errorMsg}
                                <div >
                                  Attempts: {retryCount} | Click tooltip to dismiss
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td >
                      <Clock  />
                      {lastSynced}
                    </td>
                    <td >
                      {status === "Failed" && (
                        <button
                          onClick={() => handleTriggerSync(lead.id)}
                          
                        >
                          Retry Sync
                        </button>
                      )}
                      {status === "Mapped" && (
                        <button
                          onClick={() => handleTriggerSync(lead.id)}
                          
                        >
                          Re-Sync Address
                        </button>
                      )}
                      {status === "Syncing" && (
                        <span >
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

      <div >
        <div >
          <span  />
          <span>WebSocket Pipeline Status: Active (Listening)</span>
        </div>
        <span>Channel: ws://127.0.0.1/crm-sync/{workspaceId}</span>
      </div>
    </div>
  );
};
