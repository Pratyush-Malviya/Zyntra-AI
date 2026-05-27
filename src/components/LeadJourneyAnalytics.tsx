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
    <div className="space-y-6 text-slate-800">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* STATS ACCUMULATION CARDS IN LIGHT THEME */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between text-left shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Conversion Speed Average</span>
            <div className="text-2xl font-extrabold font-syne text-slate-900 leading-none">14.2 Days</div>
            <p className="text-[10px] text-slate-500 mt-1">Avg days from Contact Load to Close Won state.</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/65 text-slate-600 flex items-center justify-center shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between text-left shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Closing Success Rate</span>
            <div className="text-2xl font-extrabold font-syne text-slate-900 leading-none">18.4%</div>
            <p className="text-[10px] text-slate-500 mt-1">Global average deal progression rating.</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/65 text-slate-600 flex items-center justify-center shadow-xs">
            <Award className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between text-left shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Active SLAs Breaches</span>
            <div className="text-2xl font-extrabold font-syne text-slate-900 leading-none">0 Overdue</div>
            <p className="text-[10px] text-slate-500 mt-1">All pipeline targets remain within SLA timelines.</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/65 text-slate-600 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER GRID IN LIGHT THEME */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        
        {/* CHART 1: Average Time-In-Stage index */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Time-In-Stage Averages (vs SLA ceilings)
            </h4>
            <p className="text-xs text-slate-500 mt-1">Tracks average chronology days of deal staging compared with designated ceilings.</p>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeInStageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a", fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="days" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Average Days" />
                <Bar dataKey="limit" fill="#f87171" opacity={0.4} radius={[4, 4, 0, 0]} name="SLA Days limit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Win/Loss drops ratios */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Staged Win vs Loss Distribution
            </h4>
            <p className="text-xs text-slate-500 mt-1">Files final deal outcomes segmented by target journey promotional blocks.</p>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={winLossData} stackOffset="expand">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="stage" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", color: "#0f172a", fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="won" fill="#10b981" stackId="a" name="Won" />
                <Bar dataKey="lost" fill="#f43f5e" stackId="a" name="Lost / Disqualified" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* DROP-OFF HEATMAP AND FUNNEL CONVERSION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        
        {/* FUNNEL DROP OFF HEATMAP */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Pipeline Journey Drop-Off Heatmap
            </h4>
            <p className="text-xs text-slate-500 mt-1 font-medium">Pragmatic representation of lead volumes drop values across consecutive segments.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2">
            {conversionFunnelData.map((f, i) => {
              return (
                <div key={i} className="p-4 border border-slate-250/70 rounded-xl text-center space-y-2 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300 transition-all shadow-xs overflow-hidden">
                  <span className="text-[8px] font-mono text-slate-400 font-bold uppercase tracking-widest block">Step {i+1}</span>
                  <div className="text-[10px] font-bold text-slate-800 truncate" title={f.name}>{f.name}</div>
                  <div className="text-lg font-black font-mono text-slate-900 leading-none">{f.count}</div>
                  <span className="inline-block px-2 py-0.5 rounded bg-blue-50 border border-blue-150 font-mono text-[9px] font-bold text-blue-600 mt-1">
                    {f.conversion}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* WORKFLOWS ALIGNMENT SETTINGS */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Assignment Workflows Rules
            </h4>
            
            <div className="space-y-2">
              {workflowsList.map((wf) => (
                <div key={wf.id} className="p-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{wf.name}</span>
                    <span className={`w-2 h-2 rounded-full ${wf.active ? "bg-emerald-500" : "bg-slate-300"}`} />
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span>Type: {wf.type}</span>
                    <span>•</span>
                    <span className="font-mono text-[8px] tracking-wide text-blue-700 bg-blue-50 border border-blue-100 rounded px-1">{wf.condition}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleTriggerWorkflowsRun}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Run Automatic Allocation
          </button>
        </div>

      </div>
    </div>
  );
};
