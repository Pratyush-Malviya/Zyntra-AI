import React, { useState, useEffect } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, AreaChart, Area } from "recharts";
import { 
  BarChart3, Clock, AlertTriangle, Users, Award, 
  ArrowRight, ShieldCheck, Flame, Zap, Compass, RotateCw 
} from "lucide-react";

interface AnalyticsProps {
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const LeadJourneyAnalytics: React.FC<AnalyticsProps> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  
  // Custom Analytics Datasets
  const timeInStageData = [
    { name: "Discovery", days: 4.2, limit: 5 },
    { name: "Proposal", days: 8.5, limit: 10 },
    { name: "Negotiation", days: 6.1, limit: 7 },
    { name: "Won Integration", days: 3.4, limit: 5 },
    { name: "Closing Support", days: 2.1, limit: 3 }
  ];

  const conversionFunnelData = [
    { name: "Contact Loaded", count: 120, conversion: "100%" },
    { name: "Outreach Copy Sent", count: 98, conversion: "81%" },
    { name: "Discovery Booked", count: 64, conversion: "53%" },
    { name: "Proposal In-Review", count: 42, conversion: "35%" },
    { name: "Closed Won", count: 18, conversion: "15%" }
  ];

  const winLossData = [
    { stage: "Discovery", won: 14, lost: 8 },
    { stage: "Proposal", won: 18, lost: 12 },
    { stage: "Negotiation", won: 22, lost: 4 },
  ];

  const workflowsList = [
    { id: "wf-1", name: "Enterprise Round-Robin Allocation", type: "Round-Robin", condition: "Value > $50,000", active: true },
    { id: "wf-2", name: "APAC Region Manual Assignment", type: "Geographical Rule", condition: "Country === 'India' | 'Singapore'", active: true },
    { id: "wf-3", name: "Inbound SaaS Industry Assignment", type: "Industry Matching Engine", condition: "Industry === 'SaaS'", active: false }
  ];

  const handleTriggerWorkflowsRun = () => {
    setLoading(true);
    showToast("Launching lead assignment workflow rule engine...", "info");
    setTimeout(() => {
      setLoading(false);
      showToast("Round-robin auto-allocation complete! 12 lead targets synchronized.", "success");
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* STATS ACCUMULATION CARDS */}
        <div className="bg-gradient-to-br from-brand/10 to-brand-alt/5 border border-brand/20 p-5 rounded-2xl flex items-center justify-between text-left">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-brand uppercase tracking-wider font-mono">Conversion Speed Average</span>
            <div className="text-2xl font-black font-syne text-text">14.2 Days</div>
            <p className="text-[9px] text-text-muted">Avg days from Contact Load to Close Won state.</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center text-brand">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#00d4aa]/10 to-emerald-500/5 border border-[#00d4aa]/20 p-5 rounded-2xl flex items-center justify-between text-left">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#00d4aa] uppercase tracking-wider font-mono">Closing Success Rate</span>
            <div className="text-2xl font-black font-syne text-[#00d4aa]">18.4%</div>
            <p className="text-[9px] text-text-muted">Outperforms competitor standards by +3.2%.</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#00d4aa]/20 flex items-center justify-center text-[#00d4aa]">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/20 p-5 rounded-2xl flex items-center justify-between text-left">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">Active SLAs Breaches</span>
            <div className="text-2xl font-black font-syne text-amber-400">0 Overdue</div>
            <p className="text-[9px] text-text-muted">All targets remain within stage SLA limits.</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        
        {/* CHART 1: Average Time-In-Stage index */}
        <div className="bg-[#090a0f]/40 border border-border/70 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand" />
              Time-In-Stage Averages (vs SLA ceilings)
            </h4>
            <p className="text-[10px] text-text-muted mt-1">Tracks average chronology days of deal staging compared with designated ceilings.</p>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeInStageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#090a0f", borderColor: "#333", color: "#fff", fontSize: 11 }} />
                <Bar dataKey="days" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Average Days" />
                <Bar dataKey="limit" fill="#ef4444" opacity={0.4} radius={[4, 4, 0, 0]} name="SLA Days limit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Win/Loss drops ratios */}
        <div className="bg-[#090a0f]/40 border border-border/70 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#00d4aa]" />
              Staged Win vs Loss Distribution
            </h4>
            <p className="text-[10px] text-text-muted mt-1">Chronicles final deal outcomes segmented by the dynamic promotional stage blocks.</p>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={winLossData} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="stage" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#090a0f", borderColor: "#333", color: "#fff", fontSize: 11 }} />
                <Bar dataKey="won" fill="#10b981" stackId="a" name="Won" />
                <Bar dataKey="lost" fill="#ef4444" stackId="a" name="Lost / Disqualified" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* DROP-OFF HEATMAP AND FUNNEL CONVERSION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* FUNNEL DROP OFF HEATMAP */}
        <div className="lg:col-span-2 bg-[#090a0f]/40 border border-border/70 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-brand-alt" />
              Pipeline Journey Drop-Off Heatmap
            </h4>
            <p className="text-[10px] text-text-muted mt-1">High-contrast representation of lead volumes drop values across consecutive segments.</p>
          </div>

          <div className="grid grid-cols-5 gap-2 pt-2">
            {conversionFunnelData.map((f, i) => {
              const bgColors = [
                "bg-brand/20 border-brand/45",
                "bg-brand-alt/20 border-brand-alt/45",
                "bg-cyan-500/10 border-cyan-500/25",
                "bg-amber-500/10 border-amber-500/25",
                "bg-[#00d4aa]/15 border-[#00d4aa]/30"
              ];
              return (
                <div key={i} className={`p-3.5 border rounded-xl text-center space-y-1 ${bgColors[i]}`}>
                  <span className="text-[8px] font-mono text-text-muted uppercase block">Step {i+1}</span>
                  <div className="text-[10px] font-bold text-text truncate" title={f.name}>{f.name}</div>
                  <div className="text-lg font-black font-mono text-text">{f.count}</div>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-black/60 font-mono text-[9px] font-bold text-white mt-1">
                    {f.conversion}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* WORKFLOWS ALIGNMENT SETTINGS */}
        <div className="bg-[#090a0f]/40 border border-border/70 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-brand" />
              Assignment Workflows Rules
            </h4>
            
            <div className="space-y-2">
              {workflowsList.map((wf) => (
                <div key={wf.id} className="p-2.5 bg-surface border border-border rounded-xl text-xs space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text">{wf.name}</span>
                    <span className={`w-2 h-2 rounded-full ${wf.active ? "bg-[#00d4aa]" : "bg-text-muted/40"}`} />
                  </div>
                  <div className="text-[10px] text-text-muted flex items-center gap-1">
                    <span>Type: {wf.type}</span>
                    <span>•</span>
                    <span className="font-mono text-[8px] tracking-wide text-brand bg-brand/5 border border-brand/10 rounded px-1">{wf.condition}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleTriggerWorkflowsRun}
            disabled={loading}
            className="w-full bg-surface-alt border border-border-muted/65 text-text hover:text-brand px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Run Automatic Allocation
          </button>
        </div>

      </div>
    </div>
  );
};
