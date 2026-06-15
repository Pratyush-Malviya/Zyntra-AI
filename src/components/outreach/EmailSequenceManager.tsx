import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Plus, Play, Pause, CheckCircle2, XCircle, Clock, Send,
  ChevronRight, Loader2, Sparkles, Copy, Edit3, Trash2, Eye,
  RefreshCw, Users, TrendingUp, BarChart2, Filter, ArrowRight,
  MessageSquare, Zap, Tag, Globe
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from '../../firebase';
import { db } from '../../firebase';
import type { EmailSequence, EmailTouch, IcpSegment } from '../../services/firestoreSchema';
import { createEmailSequence, updateEmailSequence, ICP_SEGMENTS, BANT_SCORE_CONFIG } from '../../services/firestoreSchema';
import { runOutreachPersonalisationAgent } from '../../services/aiAgentService';
import { ICP_HOOKS } from '../../services/promptTemplates';
import OutreachPersonalisationAgent from './OutreachPersonalisationAgent';


interface EmailSequenceManagerProps {
  orgId: string;
  profile: any;
}

const STATUS_CFG = {
  active:    { label: 'Active',    color: '#10b981', icon: <Play className="w-3 h-3" /> },
  paused:    { label: 'Paused',    color: '#f59e0b', icon: <Pause className="w-3 h-3" /> },
  completed: { label: 'Complete',  color: '#6366f1', icon: <CheckCircle2 className="w-3 h-3" /> },
  bounced:   { label: 'Bounced',   color: '#ef4444', icon: <XCircle className="w-3 h-3" /> },
};

const DEFAULT_TOUCHES: EmailTouch[] = [
  {
    day: 1,
    subject: 'Quick question about your workflow',
    body: 'Hi [Name],\n\nI noticed [Company] is scaling rapidly. Most teams at your stage spend 8+ hours per week on post-meeting admin.\n\nSarvaX.ai automates everything: transcription, CRM updates, and follow-up emails — automatically after every call.\n\nWorth 15 minutes?\n\nBest,\nPratyush\nSarvaX.ai',
    variantUsed: 'A',
  },
  {
    day: 4,
    subject: 'Following up — [Company] meeting automation',
    body: 'Hi [Name],\n\nJust circling back on my previous note.\n\nTeams like yours are cutting post-call admin by 80% with AI. Happy to show you a quick demo.\n\nBest,\nPratyush',
    variantUsed: 'B',
  },
  {
    day: 8,
    subject: 'Last note — AI for [Company]',
    body: 'Hi [Name],\n\nOne final note. If post-meeting workflow isn\'t a priority right now, no worries — I\'ll check back in 90 days.\n\nIf you\'d like to explore, happy to make it worth your 15 minutes.\n\nPratyush\nSarvaX.ai',
    variantUsed: 'C',
  },
];

export default function EmailSequenceManager({ orgId, profile }: EmailSequenceManagerProps) {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'detail' | 'personalize'>('list');
  const [selected, setSelected] = useState<EmailSequence | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editingTouch, setEditingTouch] = useState<number | null>(null);
  const [variants, setVariants] = useState<any>(null);

  const [form, setForm] = useState({
    sequenceName: '',
    contactName: '',
    contactEmail: '',
    icpSegment: 'hr' as IcpSegment,
    prospectRole: '',
    companyName: '',
    touches: DEFAULT_TOUCHES.map(t => ({ ...t })),
  });

  useEffect(() => {
    const q = query(
      collection(db, 'email_sequences'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setSequences(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmailSequence)));
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  const handlePersonalise = async () => {
    if (!form.companyName || !form.contactName) return;
    setGenerating(true);
    try {
      const result = await runOutreachPersonalisationAgent({
        prospectName: form.contactName,
        prospectRole: form.prospectRole || 'Decision Maker',
        companyName: form.companyName,
        icpSegment: form.icpSegment,
        personalisationHook: ICP_HOOKS[form.icpSegment]?.painHook,
        painPoint: ICP_HOOKS[form.icpSegment]?.valueProp,
      });
      setVariants(result);
      // Update touch 1 with variant A
      setForm(f => ({
        ...f,
        touches: f.touches.map((t, i) => i === 0
          ? { ...t, subject: result.variantA.subject, body: result.variantA.body, variantUsed: 'A' }
          : i === 1
          ? { ...t, subject: result.variantB.subject, body: result.variantB.body, variantUsed: 'B' }
          : { ...t, subject: result.variantC.subject, body: result.variantC.body, variantUsed: 'C' }
        )
      }));
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!form.sequenceName) return;
    await createEmailSequence({
      orgId,
      leadId: '',
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      sequenceName: form.sequenceName,
      icpSegment: form.icpSegment,
      status: 'active',
      touches: form.touches,
      currentTouch: 1,
    });
    setView('list');
  };

  const handleToggleStatus = async (seq: EmailSequence) => {
    if (!seq.id) return;
    const next = seq.status === 'active' ? 'paused' : 'active';
    await updateEmailSequence(seq.id, { status: next });
  };

  const stats = {
    total: sequences.length,
    active: sequences.filter(s => s.status === 'active').length,
    completed: sequences.filter(s => s.status === 'completed').length,
    opened: sequences.filter(s => s.openedAt).length,
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;

  if (view === 'create') {
    return (
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-surface-elevated text-text-secondary">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <h2 className="text-lg font-bold">Create Email Sequence</h2>
            <p className="text-xs text-text-secondary">3-touch sequence — Day 1, Day 4, Day 8</p>
          </div>
        </div>

        {/* Contact info */}
        <div className="card p-5 space-y-4">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">Contact Details</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Sequence Name', key: 'sequenceName', placeholder: 'e.g. Wealth Advisory — Q1', full: true },
              { label: 'Prospect Name', key: 'contactName', placeholder: 'John Smith' },
              { label: 'Email Address', key: 'contactEmail', placeholder: 'john@company.com' },
              { label: 'Company', key: 'companyName', placeholder: 'Acme Corp' },
              { label: 'Role / Title', key: 'prospectRole', placeholder: 'Head of Operations' },
            ].map(({ label, key, placeholder, full }) => (
              <div key={key} className={full ? 'col-span-2' : ''}>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 block">{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            ))}
          </div>

          {/* ICP Segment selector */}
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 block">ICP Segment</label>
            <div className="grid grid-cols-4 gap-2">
              {ICP_SEGMENTS.map(seg => (
                <button
                  key={seg.id}
                  onClick={() => setForm(p => ({ ...p, icpSegment: seg.id }))}
                  className="p-2.5 rounded-xl border text-center text-xs font-semibold transition-all"
                  style={{
                    background: form.icpSegment === seg.id ? 'rgba(99,102,241,0.12)' : 'var(--surface-elevated)',
                    borderColor: form.icpSegment === seg.id ? '#6366f1' : 'var(--border)',
                    color: form.icpSegment === seg.id ? '#818cf8' : 'var(--text-secondary)',
                  }}
                >
                  {seg.label}
                </button>
              ))}
            </div>
            {form.icpSegment && ICP_HOOKS[form.icpSegment] && (
              <p className="text-[11px] text-primary mt-2 italic">
                Hook: "{ICP_HOOKS[form.icpSegment].painHook}"
              </p>
            )}
          </div>

          {/* AI Personalise button */}
          <button
            onClick={handlePersonalise}
            disabled={!form.contactName || !form.companyName || generating}
            className="w-full py-2.5 rounded-xl text-text text-sm font-semibold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Personalising...' : 'AI Personalise All 3 Touches'}
          </button>
        </div>

        {/* Email touches */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">Email Sequence Touches</div>
          {form.touches.map((touch, idx) => (
            <div key={idx} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-text text-[11px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold text-text">Day {touch.day}</span>
                  {touch.variantUsed && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      Variant {touch.variantUsed}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setEditingTouch(editingTouch === idx ? null : idx)}
                  className="p-1.5 rounded-xl hover:bg-surface-elevated text-text-secondary transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="text-[10px] font-bold text-text-secondary uppercase mb-1">Subject</div>
                <div className="text-sm text-text bg-surface-elevated px-3 py-2 rounded-xl border border-border">
                  {touch.subject}
                </div>
              </div>

              {editingTouch === idx && (
                <div>
                  <div className="text-[10px] font-bold text-text-secondary uppercase mb-1">Email Body</div>
                  <textarea
                    value={touch.body}
                    onChange={e => setForm(f => ({ ...f, touches: f.touches.map((t, i) => i === idx ? { ...t, body: e.target.value } : t) }))}
                    rows={8}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm resize-none focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setView('list')} className="flex-1 py-3 rounded-xl border border-border text-sm text-text-secondary">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!form.sequenceName}
            className="flex-1 py-3 rounded-xl text-text font-semibold text-sm hover:opacity-90 disabled:opacity-40"
          >
            Launch Sequence
          </button>
        </div>
      </div>
    );
  }

  if (view === 'personalize') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-surface-elevated text-text-secondary">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <h2 className="text-lg font-bold">AI Outreach Personalisation</h2>
            <p className="text-xs text-text-secondary font-sans mt-0.5">Generate customized email copy using the AI copywriter agent</p>
          </div>
        </div>

        <OutreachPersonalisationAgent
          onQueueVariant={(variant, label) => {
            createEmailSequence({
              orgId,
              leadId: '',
              contactName: form.contactName || 'Sarah Jenkins',
              contactEmail: form.contactEmail || 'sarah@vanguard.com',
              sequenceName: `AI Personalized Variant ${label}`,
              icpSegment: form.icpSegment,
              status: 'active',
              touches: [
                {
                  day: 1,
                  subject: variant.subject,
                  body: variant.body,
                  variantUsed: label as 'A' | 'B' | 'C',
                },
                ...DEFAULT_TOUCHES.slice(1)
              ],
              currentTouch: 1,
            });
            setView('list');
          }}
          defaultLeadName={form.contactName}
          defaultCompanyName={form.companyName}
          defaultRole={form.prospectRole}
        />
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Email Sequences</h1>
          <p className="text-xs text-text-secondary mt-0.5">3-touch outreach sequences per ICP segment</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('personalize')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/30 text-indigo-400 text-sm font-semibold hover:bg-indigo-500/10 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            AI Writer
          </button>
          <button
            onClick={() => setView('create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-text text-sm font-semibold hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            New Sequence
          </button>
        </div>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: stats.total,     icon: Mail,        color: '#6366f1' },
          { label: 'Active',    value: stats.active,    icon: Play,        color: '#10b981' },
          { label: 'Complete',  value: stats.completed, icon: CheckCircle2,color: '#3b82f6' },
          { label: 'Opened',    value: stats.opened,    icon: Eye,         color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-xl" style={{ background: color + '15' }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-2xl font-bold text-text">{value}</span>
            </div>
            <div className="text-xs text-text-secondary">{label}</div>
          </div>
        ))}
      </div>

      {/* Listmonk integration info */}
      <div className="card p-4 border border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-text">Listmonk Integration</div>
            <div className="text-xs text-text-secondary mt-0.5">
              {localStorage.getItem('zy_listmonk_url')
                ? `Connected to ${localStorage.getItem('zy_listmonk_url')}`
                : 'Not configured — sequences run in local mode. Configure Listmonk in Settings for real delivery.'}
            </div>
          </div>
          <button className="text-xs text-amber-400 font-semibold hover:text-amber-300 whitespace-nowrap">
            Configure →
          </button>
        </div>
      </div>

      {sequences.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div className="font-semibold">No email sequences yet</div>
          <div className="text-xs mt-1">Create your first 3-touch outreach sequence</div>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map(seq => {
            const statusCfg = STATUS_CFG[seq.status];
            return (
              <motion.div
                key={seq.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-text">{seq.sequenceName}</span>
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: statusCfg.color + '15', color: statusCfg.color }}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                      {seq.icpSegment && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {ICP_SEGMENTS.find(s => s.id === seq.icpSegment)?.label}
                        </span>
                      )}
                    </div>
                    {seq.contactName && (
                      <div className="text-xs text-text-secondary mt-0.5">
                        {seq.contactName}{seq.contactEmail ? ` · ${seq.contactEmail}` : ''}
                      </div>
                    )}
                    {/* Touch progress */}
                    <div className="flex items-center gap-1.5 mt-3">
                      {[1, 2, 3].map(touch => (
                        <div key={touch} className="flex-1 h-1.5 rounded-full"
                          style={{ background: touch <= seq.currentTouch ? '#6366f1' : 'var(--border)' }} />
                      ))}
                      <span className="text-[10px] text-text-secondary ml-1">Touch {seq.currentTouch}/3</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {seq.openedAt && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Opened</span>}
                      {seq.clickedAt && <span className="text-primary flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Clicked</span>}
                      {seq.repliedAt && <span className="text-amber-400 flex items-center gap-1"><MessageSquare className="w-3 h-3" />Replied</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(seq)}
                    className="p-2 rounded-xl hover:bg-surface-elevated text-text-secondary transition-colors"
                  >
                    {seq.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Re-export for use from other components ──────────────────────────────────

export { EmailSequenceManager };
