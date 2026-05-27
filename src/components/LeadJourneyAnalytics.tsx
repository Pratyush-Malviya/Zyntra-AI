import React, { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { 
  BarChart3, Clock, Users, Award, 
  ShieldCheck, Flame, RotateCw, Sparkles, TrendingUp
} from "lucide-react";
import { motion } from "motion/react";

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
    { name: "Contact Loaded", count: 120, conversion: "100%", desc: "Direct integration feeds" },
    { name: "Outreach Sent", count: 98, conversion: "81%", desc: "Omnichannel outbound logs" },
    { name: "Discovery Booked", count: 64, conversion: "53%", desc: "Calendar synced meetings" },
    { name: "Proposal In-Review", count: 42, conversion: "35%", desc: "Quotes sent electronically" },
    { name: "Closed Won", count: 18, conversion: "15%", desc: "Contracts fully executed" }
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

  // Custom polished Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface/95 backdrop-blur-xl border border-border p-4 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] space-y-2 select-none">
          <p className="font-mono text-[10px] font-bold text-text uppercase tracking-widest">{label}</p>
          <div className="space-y-1.5">
            {payload.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                <span className="text-[11px] text-text-muted">{item.name}:</span>
                <span className="text-xs font-mono font-bold text-text">{item.value} {item.name.toLowerCase().includes("days") ? "days" : "deals"}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest text-[#00d4aa] bg-[#00d4aa]/10 rounded-full border border-[#00d4aa]/20">
              Live Pipelines Telemetry
            </span>
            <div className="flex items-center gap-1 text-amber-400">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">AI Powered Insights</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-syne">
            Lead Journeys & Pipeline Analysis
          </h1>
          <p className="text-xs text-text-muted leading-relaxed">
            Monitor state progression velocities, deal SLAs, conversion thresholds, and intelligent assignment models.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTriggerWorkflowsRun}
            disabled={loading}
            className="px-4 py-2.5 bg-surface-alt/80 hover:bg-surface-alt border border-border hover:border-border-subtle hover:scale-[1.01] text-xs font-bold text-text-muted hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-sm font-semibold"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00d4aa]" : ""}`} />
            Trigger Dry Run
          </button>
        </div>
      </div>

      {/* 2. Key KPI Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1 */}
        <div className="bg-surface border border-border rounded-3xl p-6 flex flex-col justify-between text-left relative overflow-hidden group hover:border-[#10b981]/25 transition-all duration-300">
          <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Clock className="w-20 h-20 text-[#10b981]" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">Conversion Speed Average</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white leading-none">14.2 Days</div>
              <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                Average duration to progress from initial loading to signed "Close Won".
              </p>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface border border-border rounded-3xl p-6 flex flex-col justify-between text-left relative overflow-hidden group hover:border-[#00d4aa]/25 transition-all duration-300">
          <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <Award className="w-20 h-20 text-[#00d4aa]" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">Closing Success Rate</span>
              <div className="w-8 h-8 rounded-xl bg-[#00d4aa]/10 border border-[#00d4aa]/20 text-[#00d4aa] flex items-center justify-center animate-pulse">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white leading-none">18.4%</div>
              <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                Calculated efficiency ratio of loaded active qualified opportunities to won accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface border border-border rounded-3xl p-6 flex flex-col justify-between text-left relative overflow-hidden group hover:border-blue-500/25 transition-all duration-300">
          <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
            <ShieldCheck className="w-20 h-20 text-blue-500" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">Active SLA Performance</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-[#3b82f6] leading-none">0 Breaches</div>
              <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                Awesome! All lead segments currently fall within specified response limits.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        {/* Chart Card 1 */}
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-5 glow-brand/5">
          <div className="flex items-center justify-between border-b border-border/20 pb-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand" />
                Time-In-Stage index (vs SLA ceilings)
              </h4>
              <p className="text-[10px] text-text-muted">
                Measures actual aging days alongside assigned upper service bounds.
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#00d4aa]" />
          </div>
          
          <div className="h-56 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeInStageData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent, #3b82f6)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="var(--accent, #3b82f6)" stopOpacity={0.2} />
                  </linearGradient>
                  <linearGradient id="slaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--warn, #f43f5e)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--warn, #f43f5e)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted)" fontSize={9} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="var(--muted)" fontSize={9} tickLine={false} axisLine={false} dx={-4} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="days" fill="url(#barGradient)" radius={[6, 6, 0, 0]} name="Average Days" barSize={18} />
                <Bar dataKey="limit" fill="url(#slaGradient)" radius={[6, 6, 0, 0]} name="SLA Ceiling Limit" barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart Card 2 */}
        <div className="bg-surface border border-border rounded-3xl p-6 space-y-5 glow-brand/5">
          <div className="flex items-center justify-between border-b border-border/20 pb-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#00d4aa]" />
                Target Segment Outcome Distribution
              </h4>
              <p className="text-[10px] text-text-muted">
                Visualizes won progression ratio comparison split relative to disqualifications.
              </p>
            </div>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] px-2 py-0.5 rounded-lg font-mono font-bold">Won Normalized</span>
          </div>
          
          <div className="h-56 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={winLossData} stackOffset="expand" margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="wonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="stage" stroke="var(--muted)" fontSize={9} tickLine={false} axisLine={false} dy={8} />
                <YAxis stroke="var(--muted)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `${Math.round(val * 100)}%`} dx={-4} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="won" fill="url(#wonGrad)" name="Won / Qualified" stackId="stack" barSize={26} radius={[0, 0, 0, 0]} />
                <Bar dataKey="lost" fill="url(#lossGrad)" name="Lost / Disqualified" stackId="stack" barSize={26} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Journey Drop-off Funnel Visualizer */}
      <div className="bg-surface border border-border rounded-3xl p-6 space-y-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/20 pb-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
              Pipeline Journey Funnel & Threshold Efficiency
            </h4>
            <p className="text-xs text-text-muted">
              Live progression metrics showing transition drop-off ratings per engagement step.
            </p>
          </div>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg font-bold">15% Close-Out Ratio</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-1">
          {conversionFunnelData.map((f, i) => {
            const nextPercent = i === 4 ? null : Math.round((conversionFunnelData[i + 1].count / f.count) * 100);
            return (
              <div 
                key={i} 
                className="p-5 bg-surface-alt border border-border rounded-2xl relative overflow-hidden flex flex-col justify-between group hover:border-[#00d4aa]/40 hover:translate-y-[-2px] transition-all duration-300 shadow-md"
              >
                {/* Decorative glowing gradient effect */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00d4aa] opacity-0 group-hover:opacity-100 transition-all rounded-r" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-text-muted font-bold uppercase tracking-wider">Step 0{i+1}</span>
                    <span className="text-[9px] font-mono font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full">
                      Vol: {f.count}
                    </span>
                  </div>

                  <div className="text-left space-y-1 min-h-[3.25rem]">
                    <div className="text-xs font-extrabold text-white group-hover:text-[#00d4aa] transition-colors">{f.name}</div>
                    <div className="text-[10px] text-text-muted leading-tight">{f.desc}</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest block font-mono">Conversion</span>
                    <span className="text-sm font-extrabold text-white font-mono">{f.conversion}</span>
                  </div>
                  {nextPercent !== null && (
                    <div className="text-right">
                      <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest block font-mono">Next stage</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">+{nextPercent}%</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Assignment Workflows Rules Section */}
      <div className="bg-surface border border-border rounded-3xl p-6 text-left space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-alt" />
              Intelligent Lead Assignment Logic & Rules
            </h4>
            <p className="text-xs text-text-muted">
              Auto-routing schemes currently executed upon database synchronization triggers.
            </p>
          </div>

          <button
            onClick={handleTriggerWorkflowsRun}
            disabled={loading}
            className="px-5 py-2.5 bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-slate-950 hover:scale-[1.01] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,212,170,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-slate-950" : ""}`} />
            Run Matchmaker Rules Engine
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workflowsList.map((wf) => (
            <div 
              key={wf.id} 
              className={`p-4 bg-surface-alt/75 border rounded-2xl text-xs space-y-3.5 text-left transition-all duration-300 relative group overflow-hidden ${
                wf.active ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-border/60 opacity-60"
              }`}
            >
              {/* Dynamic light backdrop status indicators */}
              {wf.active && (
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-emerald-500/2 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/5 transition-all" />
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-text-muted font-bold tracking-widest uppercase">
                  {wf.type}
                </span>
                <span className="flex items-center gap-1.5 bg-surface p-1 px-2.5 rounded-full border border-border/50 text-[10px] font-bold">
                  <span className={`w-1.5 h-1.5 rounded-full ${wf.active ? "bg-[#00d4aa] animate-pulse" : "bg-text-muted"}`} />
                  {wf.active ? "Active" : "Archived"}
                </span>
              </div>

              <div className="space-y-1">
                <div className="font-extrabold text-sm text-white leading-tight group-hover:text-brand-alt transition-colors">{wf.name}</div>
                <p className="text-[10px] text-text-muted font-medium">Auto-triggers for lead distribution checks.</p>
              </div>

              <div className="pt-3 border-t border-border/30 flex items-center justify-between">
                <span className="text-[9px] text-text-muted font-mono font-bold uppercase tracking-wider">Condition</span>
                <span className="font-mono text-[9px] font-bold text-brand bg-brand/10 border border-brand/20 rounded-md px-1.5 py-0.5 max-w-[150px] truncate" title={wf.condition}>
                  {wf.condition}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

