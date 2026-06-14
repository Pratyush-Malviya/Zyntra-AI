import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { Cpu, DollarSign, TrendingUp, Zap, Activity, AlertTriangle } from 'lucide-react';
import { collection, query, where, getDocs } from '../../firebase';
import { db } from '../../firebase';

interface AiCostTrackerProps {
  orgId: string;
}

const MODEL_COLORS: Record<string, string> = {
  'gemini-1.5-flash': '#6366f1',
  'gpt-4o-mini':      '#10b981',
  'claude-3-haiku':   '#f59e0b',
  'llama-3-8b':       '#3b82f6',
  'nvidia-nemotron':  '#ec4899',
};

const COST_PER_1K = {
  'gemini-1.5-flash': 0.000075,
  'gpt-4o-mini':      0.00015,
  'claude-3-haiku':   0.00025,
  'llama-3-8b':       0.0001,
  'nvidia-nemotron':  0.0002,
};

export function AiCostTracker({ orgId }: AiCostTrackerProps) {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [modelBreakdown, setModelBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'cost' | 'tokens' | 'perLead'>('cost');

  useEffect(() => {
    loadCostData();
  }, [orgId]);

  const loadCostData = async () => {
    // In production: query AI usage logs from Firestore
    // For demo: generate realistic synthetic data

    const days = 14;
    const daily = Array.from({ length: days }, (_, i) => {
      const date = new Date(Date.now() - (days - 1 - i) * 86400000);
      const tokens = Math.floor(Math.random() * 80000) + 20000;
      const calls = Math.floor(Math.random() * 25) + 5;
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tokens,
        calls,
        cost: (tokens / 1000) * 0.00015,
        costPerLead: ((tokens / 1000) * 0.00015) / Math.max(1, Math.floor(calls * 0.4)),
      };
    });
    setDailyData(daily);

    const models = Object.entries(MODEL_COLORS).map(([model, color]) => ({
      model,
      color,
      tokens: Math.floor(Math.random() * 200000) + 50000,
      calls: Math.floor(Math.random() * 80) + 10,
      cost: 0,
    })).map(m => ({
      ...m,
      cost: (m.tokens / 1000) * (COST_PER_1K[m.model as keyof typeof COST_PER_1K] || 0.0002),
    }));
    setModelBreakdown(models);

    setLoading(false);
  };

  const totalCost = dailyData.reduce((s, d) => s + d.cost, 0);
  const totalTokens = dailyData.reduce((s, d) => s + d.tokens, 0);
  const totalCalls = dailyData.reduce((s, d) => s + d.calls, 0);
  const avgCostPerLead = totalCost / Math.max(1, dailyData.length * 3);
  const budget = 50; // monthly budget
  const usagePercent = (totalCost / budget) * 100;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '14-Day Cost',       value: `$${totalCost.toFixed(2)}`,        icon: DollarSign, color: '#10b981' },
          { label: 'Total Tokens',      value: `${(totalTokens/1000).toFixed(0)}K`,icon: Zap,        color: '#6366f1' },
          { label: 'AI Calls',          value: totalCalls.toString(),              icon: Activity,   color: '#3b82f6' },
          { label: 'Cost / Lead',       value: `$${avgCostPerLead.toFixed(3)}`,   icon: TrendingUp, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg" style={{ background: color + '15' }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <div className="text-xl font-bold text-text">{value}</div>
            <div className="text-xs text-text-secondary">{label}</div>
          </div>
        ))}
      </div>

      {/* Budget gauge */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-text">Monthly AI Budget</div>
          <div className="flex items-center gap-2">
            {usagePercent > 80 && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            <span className="text-sm font-bold" style={{ color: usagePercent > 80 ? '#f59e0b' : '#10b981' }}>
              ${totalCost.toFixed(2)} / ${budget}
            </span>
          </div>
        </div>
        <div className="h-3 bg-surface-elevated rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, usagePercent)}%` }}
            transition={{ duration: 0.8 }}
            style={{ background: usagePercent > 80 ? '#f59e0b' : 'linear-gradient(to right, #6366f1, #10b981)' }}
          />
        </div>
        <div className="flex justify-between text-xs text-text-secondary">
          <span>{usagePercent.toFixed(1)}% of budget used</span>
          <span>${(budget - totalCost).toFixed(2)} remaining</span>
        </div>
      </div>

      {/* Cost over time chart */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-text">AI Usage — 14 Days</div>
          <div className="flex gap-1 p-1 bg-surface-elevated rounded-lg">
            {(['cost', 'tokens', 'perLead'] as const).map(v => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className="px-2 py-1 rounded text-[11px] font-semibold transition-all"
                style={{
                  background: activeView === v ? 'var(--color-primary)' : 'transparent',
                  color: activeView === v ? 'white' : 'var(--text-secondary)',
                }}
              >
                {v === 'cost' ? 'Cost' : v === 'tokens' ? 'Tokens' : '$/Lead'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [
                activeView === 'tokens' ? `${(v/1000).toFixed(1)}K tokens` : `$${v.toFixed(4)}`,
              ]}
            />
            <Area
              type="monotone"
              dataKey={activeView === 'tokens' ? 'tokens' : activeView === 'perLead' ? 'costPerLead' : 'cost'}
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#areaGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Model breakdown */}
      <div className="card p-5 space-y-4">
        <div className="text-sm font-bold text-text">Model Usage Breakdown</div>
        <div className="space-y-3">
          {modelBreakdown
            .sort((a, b) => b.cost - a.cost)
            .map(model => {
              const pct = (model.cost / modelBreakdown.reduce((s: number, m: any) => s + m.cost, 0)) * 100;
              return (
                <div key={model.model} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: model.color }} />
                      <span className="font-mono text-text">{model.model}</span>
                    </div>
                    <div className="flex items-center gap-3 text-text-secondary">
                      <span>{model.calls} calls</span>
                      <span className="font-semibold text-text">${model.cost.toFixed(4)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      style={{ background: model.color }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-text-secondary">
          <span className="text-primary font-bold">Cost optimisation tip:</span> Use Gemini Flash for research tasks, save GPT-4o for final outreach generation. Estimated savings: 40%.
        </div>
      </div>
    </div>
  );
}
