import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  Server, 
  Clock, 
  RefreshCw, 
  Play, 
  Zap, 
  ShieldAlert,
  Heart,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface LatencyPoint {
  time: string;
  Gemini: number;
  NvidiaNIM: number;
  OpenAI: number;
}

export function LlmTelemetryDashboard({
  showToast
}: {
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}) {
  // Configs and Active Status States
  const [resolution, setResolution] = useState<'fast' | 'medium' | 'slow'>('fast');
  const [isLive, setIsLive] = useState(true);
  const [incidentMode, setIncidentMode] = useState<'none' | 'gemini_outage' | 'nvidia_busy'>('none');

  // Multi-provider metrics
  const [metrics, setMetrics] = useState({
    gemini: {
      uptime: '100%',
      avgLatency: 352,
      maxLatency: 490,
      jitter: 18,
      errorRate: '0.0%',
      activeStatus: 'ONLINE' as 'ONLINE' | 'OFFLINE' | 'DEGRADED',
      successCount: 1421,
      failCount: 0
    },
    nvidia: {
      uptime: '99.8%',
      avgLatency: 758,
      maxLatency: 1140,
      jitter: 42,
      errorRate: '0.2%',
      activeStatus: 'ONLINE' as 'ONLINE' | 'OFFLINE' | 'DEGRADED',
      successCount: 1042,
      failCount: 2
    },
    openai: {
      uptime: '99.9%',
      avgLatency: 842,
      maxLatency: 1220,
      jitter: 31,
      errorRate: '0.1%',
      activeStatus: 'ONLINE' as 'ONLINE' | 'OFFLINE' | 'DEGRADED',
      successCount: 890,
      failCount: 1
    }
  });

  // Uptime event historic arrays (24 indicators for timebars)
  const [geminiUptimeHistory, setGeminiUptimeHistory] = useState<('ok' | 'fail' | 'warn')[]>(Array(24).fill('ok'));
  const [nvidiaUptimeHistory, setNvidiaUptimeHistory] = useState<('ok' | 'fail' | 'warn')[]>(Array(24).fill('ok'));
  const [openaiUptimeHistory, setOpenaiUptimeHistory] = useState<('ok' | 'fail' | 'warn')[]>(Array(24).fill('ok'));

  // 10 Moving latency points
  const [chartData, setChartData] = useState<LatencyPoint[]>([
    { time: '14:40', Gemini: 348, NvidiaNIM: 750, OpenAI: 820 },
    { time: '14:41', Gemini: 355, NvidiaNIM: 762, OpenAI: 812 },
    { time: '14:42', Gemini: 340, NvidiaNIM: 745, OpenAI: 850 },
    { time: '14:43', Gemini: 362, NvidiaNIM: 780, OpenAI: 805 },
    { time: '14:44', Gemini: 350, NvidiaNIM: 755, OpenAI: 830 },
    { time: '14:45', Gemini: 358, NvidiaNIM: 740, OpenAI: 862 },
    { time: '14:46', Gemini: 345, NvidiaNIM: 790, OpenAI: 840 },
    { time: '14:47', Gemini: 360, NvidiaNIM: 765, OpenAI: 815 },
    { time: '14:48', Gemini: 352, NvidiaNIM: 758, OpenAI: 842 },
    { time: '14:49', Gemini: 354, NvidiaNIM: 749, OpenAI: 835 }
  ]);

  // Handle active simulation loop
  useEffect(() => {
    if (!isLive) return;

    const intervalTime = resolution === 'fast' ? 3000 : resolution === 'medium' ? 8000 : 20000;

    const timer = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Calculate next synthetic data based on Incident Mode
      let nextGemini = 350 + Math.floor(Math.random() * 60 - 30);
      let nextNvidia = 750 + Math.floor(Math.random() * 100 - 50);
      let nextOpenai = 840 + Math.floor(Math.random() * 80 - 40);

      let geminiStat: 'ok' | 'fail' | 'warn' = 'ok';
      let nvidiaStat: 'ok' | 'fail' | 'warn' = 'ok';
      let openaiStat: 'ok' | 'fail' | 'warn' = 'ok';

      if (incidentMode === 'gemini_outage') {
        nextGemini = 5000 + Math.floor(Math.random() * 500); // Massive timeout response
        geminiStat = 'fail';
      } else if (incidentMode === 'nvidia_busy') {
         nextNvidia = 2800 + Math.floor(Math.random() * 400); // Congested lag
         nvidiaStat = 'warn';
      }

      // Prepend / Squeeze data
      setChartData(prev => {
        const next = [...prev, {
          time: timeStr.slice(3), // mm:ss
          Gemini: nextGemini,
          NvidiaNIM: nextNvidia,
          OpenAI: nextOpenai
        }];
        if (next.length > 15) {
          next.shift();
        }
        return next;
      });

      // Update static indicators incrementally
      setGeminiUptimeHistory(prev => [...prev.slice(1), geminiStat]);
      setNvidiaUptimeHistory(prev => [...prev.slice(1), nvidiaStat]);
      setOpenaiUptimeHistory(prev => [...prev.slice(1), openaiStat]);

      // Dynamic metrics calculations
      setMetrics(prev => {
        const geminiIsOnline = incidentMode !== 'gemini_outage';
        const nvidiaIsDegraded = incidentMode === 'nvidia_busy';

        const gSuccess = prev.gemini.successCount + (geminiIsOnline ? 1 : 0);
        const gFail = prev.gemini.failCount + (geminiIsOnline ? 0 : 1);
        const gTotal = gSuccess + gFail;

        const nvSuccess = prev.nvidia.successCount + 1;
        const nvFail = prev.nvidia.failCount;
        const nvTotal = nvSuccess + nvFail;

        const oSuccess = prev.openai.successCount + 1;
        const oFail = prev.openai.failCount;
        const oTotal = oSuccess + oFail;

        return {
          gemini: {
            uptime: `${((gSuccess / gTotal) * 100).toFixed(2)}%`,
            avgLatency: geminiIsOnline 
              ? Math.round((prev.gemini.avgLatency * 9 + nextGemini) / 10) 
              : prev.gemini.avgLatency,
            maxLatency: Math.max(prev.gemini.maxLatency, nextGemini),
            jitter: Math.round(5 + Math.random() * 15),
            errorRate: `${((gFail / gTotal) * 100).toFixed(1)}%`,
            activeStatus: geminiIsOnline ? 'ONLINE' : 'OFFLINE',
            successCount: gSuccess,
            failCount: gFail
          },
          nvidia: {
            uptime: '99.8%',
            avgLatency: Math.round((prev.nvidia.avgLatency * 9 + nextNvidia) / 10),
            maxLatency: Math.max(prev.nvidia.maxLatency, nextNvidia),
            jitter: nvidiaIsDegraded ? Math.round(180 + Math.random() * 50) : Math.round(30 + Math.random() * 20),
            errorRate: prev.nvidia.errorRate,
            activeStatus: nvidiaIsDegraded ? 'DEGRADED' : 'ONLINE',
            successCount: nvSuccess,
            failCount: nvFail
          },
          openai: {
            uptime: '99.9%',
            avgLatency: Math.round((prev.openai.avgLatency * 9 + nextOpenai) / 10),
            maxLatency: Math.max(prev.openai.maxLatency, nextOpenai),
            jitter: Math.round(20 + Math.random() * 15),
            errorRate: prev.openai.errorRate,
            activeStatus: 'ONLINE',
            successCount: oSuccess,
            failCount: oFail
          }
        };
      });

    }, intervalTime);

    return () => clearInterval(timer);
  }, [isLive, resolution, incidentMode]);

  const handleResolveIncident = () => {
    setIncidentMode('none');
    showToast?.('All LLM connections restored to nominal values.', 'success');
  };

  const triggerGeminiOutageSim = () => {
    setIncidentMode('gemini_outage');
    showToast?.('WARNING: Simulating Google Cloud API region disruption. Gemini ping is failing.', 'error');
  };

  const triggerNvidiaTrafficSim = () => {
    setIncidentMode('nvidia_busy');
    showToast?.('WARNING: Simulating high-traffic congestion on Nvidia NIM fallback nodes.', 'error');
  };

  return (
    <div className="bg-[#121319] border border-zinc-800 rounded-3xl p-6 space-y-6">
      
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider block w-fit">
            <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>Real-time Telemetry Dashboard</span>
          </div>
          <h3 className="text-base font-extrabold uppercase tracking-widest text-white font-syne flex items-center gap-2">
            LLM Connected Gateways Status & Latency Monitor
          </h3>
          <p className="text-[11px] text-zinc-400">
            Active polling monitor reporting connection performance, ping curves, and live network incident diagnostics.
          </p>
        </div>

        {/* Action controllers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Status Check badge */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-zinc-300 text-[10px]">{isLive ? 'LIVE SAMPLING ON' : 'PAUSED'}</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex gap-1">
            {(['fast', 'medium', 'slow'] as const).map(res => (
              <button
                key={res}
                onClick={() => setResolution(res)}
                className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg transition-all border-0 cursor-pointer ${
                  resolution === res 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {res === 'fast' ? '3s Rate' : res === 'medium' ? '8s Rate' : '20s Rate'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsLive(!isLive)}
            title={isLive ? 'Pause monitoring simulation' : 'Resume real-time metrics'}
            className="p-2 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLive ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of the 3 Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Gemini API Status Card */}
        <div className="bg-[#171923] border border-zinc-800/80 rounded-2xl p-4.5 space-y-4 hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-7 bg-blue-500 rounded-full" />
              <div>
                <span className="text-xs font-bold text-white block">Google Gemini API</span>
                <span className="text-[10px] text-zinc-500 font-mono">Tier 0 (Primary)</span>
              </div>
            </div>
            {metrics.gemini.activeStatus === 'ONLINE' ? (
              <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                NOMINAL
              </div>
            ) : (
              <div className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/25 text-rose-400 text-[9px] font-bold animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                OUTAGE
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Avg Connection</span>
              <span className="text-base font-mono font-bold text-white">{metrics.gemini.activeStatus === 'ONLINE' ? `${metrics.gemini.avgLatency}ms` : 'TIMEOUT'}</span>
            </div>
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Reported Uptime</span>
              <span className="text-base font-mono font-bold text-emerald-400">{metrics.gemini.uptime}</span>
            </div>
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Incident Fail Rate</span>
              <span className={`text-base font-mono font-bold ${metrics.gemini.failCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>{metrics.gemini.errorRate}</span>
            </div>
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Latency Jitter</span>
              <span className="text-base font-mono font-bold text-zinc-400">~{metrics.gemini.jitter}ms</span>
            </div>
          </div>

          {/* S Uptime Check Graph Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[9px] text-[#868fa9]">
              <span>Uptime Checks (Past 24 blocks)</span>
              <span>100.0% targeted</span>
            </div>
            <div className="flex justify-between gap-[3px]">
              {geminiUptimeHistory.map((status, i) => (
                <div 
                  key={i} 
                  title={`Sample epoch ${i + 1}: ${status === 'ok' ? 'Successful ping response' : status === 'warn' ? 'Degraded system delay' : 'Connection handshake timeout'}`}
                  className={`flex-1 h-5 rounded-sm transition-colors cursor-pointer ${
                    status === 'ok' ? 'bg-emerald-500/85 hover:bg-emerald-400' : status === 'warn' ? 'bg-amber-500/85 hover:bg-amber-400' : 'bg-rose-500 animate-pulse'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* NVIDIA NIM Status Card */}
        <div className="bg-[#171923] border border-zinc-800/80 rounded-2xl p-4.5 space-y-4 hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-7 bg-purple-500 rounded-full" />
              <div>
                <span className="text-xs font-bold text-white block">NVIDIA NIM (Fallback)</span>
                <span className="text-[10px] text-zinc-500 font-mono">Tier 1 (Fallback)</span>
              </div>
            </div>
            {metrics.nvidia.activeStatus === 'ONLINE' ? (
              <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                STANDBY
              </div>
            ) : (
              <div className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[9px] font-bold animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                CONGESTED
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Avg Connection</span>
              <span className="text-base font-mono font-bold text-white">{metrics.nvidia.avgLatency}ms</span>
            </div>
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Reported Uptime</span>
              <span className="text-base font-mono font-bold text-emerald-400">{metrics.nvidia.uptime}</span>
            </div>
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Incident Fail Rate</span>
              <span className="text-base font-mono font-bold text-zinc-400">{metrics.nvidia.errorRate}</span>
            </div>
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Latency Jitter</span>
              <span className="text-base font-mono font-bold text-zinc-400">~{metrics.nvidia.jitter}ms</span>
            </div>
          </div>

          {/* S Uptime Check Graph Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[9px] text-[#868fa9]">
              <span>Uptime Checks (Past 24 blocks)</span>
              <span>99.8% targeted</span>
            </div>
            <div className="flex justify-between gap-[3px]">
              {nvidiaUptimeHistory.map((status, i) => (
                <div 
                  key={i} 
                  title={`Sample epoch ${i + 1}: ${status === 'ok' ? 'Successful standby ping' : status === 'warn' ? 'High concurrency delay' : 'Incident timeout detected'}`}
                  className={`flex-1 h-5 rounded-sm transition-colors cursor-pointer ${
                    status === 'ok' ? 'bg-emerald-500/85 hover:bg-emerald-400' : status === 'warn' ? 'bg-amber-500/85 hover:bg-amber-400' : 'bg-rose-500/90'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* OpenAI GPT Status Card */}
        <div className="bg-[#171923] border border-zinc-800/80 rounded-2xl p-4.5 space-y-4 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-7 bg-emerald-500 rounded-full" />
              <div>
                <span className="text-xs font-bold text-white block">OpenAI GPT-4o</span>
                <span className="text-[10px] text-zinc-500 font-mono">Tier 2 (Fallback)</span>
              </div>
            </div>
            <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
              NOMINAL
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Avg Connection</span>
              <span className="text-base font-mono font-bold text-white">{metrics.openai.avgLatency}ms</span>
            </div>
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Reported Uptime</span>
              <span className="text-base font-mono font-bold text-emerald-400">{metrics.openai.uptime}</span>
            </div>
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Incident Fail Rate</span>
              <span className="text-base font-mono font-bold text-zinc-400">{metrics.openai.errorRate}</span>
            </div>
            <div className="bg-[#11121a] p-2.5 rounded-xl border border-zinc-800/50">
              <span className="text-[8px] uppercase font-bold text-zinc-500 block">Latency Jitter</span>
              <span className="text-base font-mono font-bold text-zinc-400">~{metrics.openai.jitter}ms</span>
            </div>
          </div>

          {/* S Uptime Check Graph Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[9px] text-[#868fa9]">
              <span>Uptime Checks (Past 24 blocks)</span>
              <span>99.9% targeted</span>
            </div>
            <div className="flex justify-between gap-[3px]">
              {openaiUptimeHistory.map((status, i) => (
                <div 
                  key={i} 
                  title={`Sample epoch ${i + 1}: ${status === 'ok' ? 'Successful standby ping' : status === 'warn' ? 'High concurrency delay' : 'Incident timeout detected'}`}
                  className={`flex-1 h-5 rounded-sm transition-colors cursor-pointer ${
                    status === 'ok' ? 'bg-emerald-500/85 hover:bg-emerald-400' : status === 'warn' ? 'bg-amber-500/85 hover:bg-amber-400' : 'bg-rose-500/90'
                  }`} 
                />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Latency Moving Interval Area Chart Card */}
      <div className="bg-[#171923] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white block uppercase tracking-wide">Dynamic Connection Latency curves (ms)</span>
            <p className="text-[10px] text-zinc-500">Continuous microsecond latency logging per active system gateway node.</p>
          </div>

          {/* Legend helper indicator */}
          <div className="flex items-center gap-4 text-[10px] font-semibold text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-500 block" />
              <span>Gemini</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-purple-500 block" />
              <span>NVIDIA NIM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 block" />
              <span>OpenAI</span>
            </div>
          </div>
        </div>

        {/* Recharts Area Chart container */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorGemini" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorNvidia" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOpenAI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#71717a" 
                fontSize={9} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#71717a" 
                fontSize={9} 
                tickLine={false} 
                axisLine={false}
                unit="ms"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#090a0f', 
                  border: '1px solid #27272a', 
                  borderRadius: '12px',
                  color: '#f4f4f5',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="Gemini" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorGemini)" 
              />
              <Area 
                type="monotone" 
                dataKey="NvidiaNIM" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorNvidia)" 
              />
              <Area 
                type="monotone" 
                dataKey="OpenAI" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorOpenAI)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Simulator Tools Section */}
      <div className="bg-[#121319] border border-dashed border-zinc-800 rounded-2xl p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-zinc-800/50 pb-2 flex-wrap gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1">
            <Zap className="w-3 text-amber-500 animate-bounce" />
            Superadmin Incident Simulation Engine
          </span>
          {incidentMode !== 'none' && (
            <button
              onClick={handleResolveIncident}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCircle className="w-3 h-3" />
              <span>Restore Nominal Status</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3.5">
          <button
            onClick={triggerGeminiOutageSim}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border cursor-pointer select-none transition-all ${
              incidentMode === 'gemini_outage'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Gemini API Outage</span>
          </button>

          <button
            onClick={triggerNvidiaTrafficSim}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border cursor-pointer select-none transition-all ${
              incidentMode === 'nvidia_busy'
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Nvidia NIM Congestion</span>
          </button>

          <div className="flex-1 min-w-[150px] bg-zinc-950 p-2 rounded-xl text-[10px] font-mono flex items-center justify-between gap-2 text-zinc-400">
            <span>Active Incident State:</span>
            <span className={`font-bold ${incidentMode === 'none' ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
              {incidentMode === 'none' ? 'NOMINAL OPERATION' : incidentMode === 'gemini_outage' ? 'GEMINI DISRUPTED' : 'NVIDIA TIMEOUT DELAY'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
