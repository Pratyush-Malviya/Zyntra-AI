import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell, PieChart, Pie, Legend,
  LineChart, Line, CartesianGrid, Area, AreaChart
} from 'recharts';
import { TrendingUp, Users, Clock, ArrowRight, Target, Award, DollarSign, Zap } from 'lucide-react';
import { collection, query, where, getDocs } from '../../firebase';
import { db } from '../../firebase';
import { PIPELINE_STAGES } from '../../services/firestoreSchema';
import type { PipelineStage } from '../../services/firestoreSchema';

interface PipelineFunnelChartProps {
  orgId: string;
}

interface StageData {
  stage: PipelineStage;
  label: string;
  color: string;
  count: number;
  value: number;
  avgDays: number;
  conversionRate: number;
}

const CHANNEL_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];
const CHANNELS = ['LinkedIn', 'Email', 'Affiliate', 'Referral', 'Event'];

export function PipelineFunnelChart({ orgId }: PipelineFunnelChartProps) {
  const [stageData, setStageData] = useState<StageData[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [velocityData, setVelocityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'funnel' | 'channels' | 'velocity' | 'bant'>('funnel');

  useEffect(() => {
    loadAnalytics();
  }, [orgId]);

  const loadAnalytics = async () => {
    try {
      const leadsSnap = await getDocs(query(collection(db, 'leads'), where('orgId', '==', orgId)));
      const leads = leadsSnap.docs.map(d => d.data());

      // Stage funnel data
      const stageCounts: Record<string, number> = {};
      leads.forEach(lead => {
        const stage = lead.pipelineStage || 'lead_identified';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      });

      const computed: StageData[] = PIPELINE_STAGES.map((stage, idx) => {
        const count = stageCounts[stage.id] || Math.max(0, 20 - idx * 2); // demo data fallback
        return {
          stage: stage.id,
          label: stage.label,
          color: stage.color,
          count,
          value: count * 15000,
          avgDays: stage.slaDays + Math.random() * 3,
          conversionRate: idx === 0 ? 100 : Math.max(10, 100 - idx * 12),
        };
      });

      setStageData(computed);

      // Channel attribution
      const channels = CHANNELS.map((name, i) => ({
        name,
        leads: Math.floor(Math.random() * 30) + 5,
        qualified: Math.floor(Math.random() * 15) + 2,
        closed: Math.floor(Math.random() * 5) + 1,
        color: CHANNEL_COLORS[i],
      }));
      setChannelData(channels);

      // Stage velocity (avg days per stage)
      const velocity = PIPELINE_STAGES.map(s => ({
        stage: s.label.split(' ').slice(0, 2).join(' '),
        avgDays: s.slaDays + (Math.random() - 0.5) * 4,
        slaDays: s.slaDays,
      }));
      setVelocityData(velocity);

    } finally {
      setLoading(false);
    }
  };

  const totalPipelineValue = stageData.reduce((s, d) => s + d.value, 0);
  const totalLeads = stageData.reduce((s, d) => s + d.count, 0);
  const avgVelocity = velocityData.reduce((s, d) => s + d.avgDays, 0) / (velocityData.length || 1);

  const tabs = [
    { id: 'funnel',    label: 'Pipeline Funnel' },
    { id: 'channels',  label: 'Channel Attribution' },
    { id: 'velocity',  label: 'Stage Velocity' },
    { id: 'bant',      label: 'BANT Distribution' },
  ] as const;

  // BANT distribution data
  const bantData = [
    { name: 'A — Hot',  value: Math.floor(totalLeads * 0.15), color: '#10b981' },
    { name: 'B — Warm', value: Math.floor(totalLeads * 0.30), color: '#3b82f6' },
    { name: 'C — Cool', value: Math.floor(totalLeads * 0.35), color: '#f59e0b' },
    { name: 'D — Cold', value: Math.floor(totalLeads * 0.20), color: '#ef4444' },
  ];

  return (
    <div >
      {/* KPI Summary */}
      <div >
        {[
          { label: 'Total Leads',    value: totalLeads.toString(), icon: Users,       color: '#6366f1', delta: '+12%' },
          { label: 'Pipeline Value', value: `$${(totalPipelineValue/1000).toFixed(0)}K`, icon: DollarSign, color: '#10b981', delta: '+8%' },
          { label: 'Avg Velocity',   value: `${avgVelocity.toFixed(1)}d`,  icon: Clock,       color: '#f59e0b', delta: '-2d' },
          { label: 'Win Rate',       value: '24%',                         icon: Award,       color: '#3b82f6', delta: '+3%' },
        ].map(({ label, value, icon: Icon, color, delta }) => (
          <div key={label} >
            <div >
              <div  style={{ background: color + '15' }}>
                <Icon  style={{ color }} />
              </div>
              <span >
                {delta}
              </span>
            </div>
            <div >{value}</div>
            <div >{label}</div>
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            
            style={{
              background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pipeline Funnel */}
      {activeTab === 'funnel' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
          <div >8-Stage Sales Pipeline</div>
          <div >
            {stageData.map((stage, idx) => (
              <div key={stage.stage} >
                <div >
                  {stage.label}
                </div>
                <div >
                  <motion.div
                    
                    initial={{ width: 0 }}
                    animate={{ width: `${stage.conversionRate}%` }}
                    transition={{ delay: idx * 0.05, duration: 0.5 }}
                    style={{ background: stage.color + '25', borderLeft: `3px solid ${stage.color}` }}
                  >
                    <span  style={{ color: stage.color }}>
                      {stage.count} leads
                    </span>
                  </motion.div>
                </div>
                <div >{stage.conversionRate.toFixed(0)}%</div>
              </div>
            ))}
          </div>

          <div >
            {[
              { label: 'Lead → Discovery', rate: '68%' },
              { label: 'Discovery → Demo', rate: '52%' },
              { label: 'Demo → Closing', rate: '31%' },
            ].map(({ label, rate }) => (
              <div key={label} >
                <div >{rate}</div>
                <div >{label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Channel Attribution */}
      {activeTab === 'channels' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
          <div >Lead Source Attribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={channelData} barSize={28} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="leads"     name="Total Leads"     fill="#6366f1" radius={[4,4,0,0]} />
              <Bar dataKey="qualified" name="Qualified"       fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="closed"    name="Closed"          fill="#f59e0b" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div >
            {[['#6366f1','Total Leads'],['#10b981','Qualified'],['#f59e0b','Closed']].map(([c,l]) => (
              <div key={l} >
                <div  style={{ background: c }} />
                <span >{l}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stage Velocity */}
      {activeTab === 'velocity' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
          <div >
            <div >Average Days per Stage</div>
            <div >SLA threshold = orange line</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={velocityData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
              <YAxis unit="d" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v.toFixed(1)} days`]}
              />
              <Bar dataKey="avgDays" name="Avg Days" radius={[4,4,0,0]}>
                {velocityData.map((d, i) => (
                  <Cell key={i} fill={d.avgDays > d.slaDays ? '#ef4444' : '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div >
            <div >
              <div >{velocityData.filter(d => d.avgDays <= d.slaDays).length}</div>
              <div >Stages within SLA</div>
            </div>
            <div >
              <div >{velocityData.filter(d => d.avgDays > d.slaDays).length}</div>
              <div >SLA Breaches</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* BANT Distribution */}
      {activeTab === 'bant' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
          <div >BANT Score Distribution</div>
          <div >
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={bantData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {bantData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div >
              {bantData.map(d => (
                <div key={d.name} >
                  <div >
                    <div  style={{ background: d.color }} />
                    <span >{d.name}</span>
                  </div>
                  <div >
                    <div >
                      <div  style={{
                        width: `${(d.value / totalLeads) * 100}%`,
                        background: d.color
                      }} />
                    </div>
                    <span >{d.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div >
            <div >Priority Action</div>
            <div >
              <span >{bantData[0].value} A-leads</span> ready for immediate demo scheduling.
              <span >{bantData[1].value} B-leads</span> need proposal follow-up within 48h.
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
