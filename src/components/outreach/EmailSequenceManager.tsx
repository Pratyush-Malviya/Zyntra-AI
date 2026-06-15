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
  active:    { label: 'Active',    color: '#10b981', icon: <Play  /> },
  paused:    { label: 'Paused',    color: '#f59e0b', icon: <Pause  /> },
  completed: { label: 'Complete',  color: '#6366f1', icon: <CheckCircle2  /> },
  bounced:   { label: 'Bounced',   color: '#ef4444', icon: <XCircle  /> },
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

  if (loading) return <div ><Loader2  /></div>;

  if (view === 'create') {
    return (
      <div >
        <div >
          <button onClick={() => setView('list')} >
            <ChevronRight  />
          </button>
          <div>
            <h2 >Create Email Sequence</h2>
            <p >3-touch sequence — Day 1, Day 4, Day 8</p>
          </div>
        </div>

        {/* Contact info */}
        <div >
          <div >Contact Details</div>
          <div >
            {[
              { label: 'Sequence Name', key: 'sequenceName', placeholder: 'e.g. Wealth Advisory — Q1', full: true },
              { label: 'Prospect Name', key: 'contactName', placeholder: 'John Smith' },
              { label: 'Email Address', key: 'contactEmail', placeholder: 'john@company.com' },
              { label: 'Company', key: 'companyName', placeholder: 'Acme Corp' },
              { label: 'Role / Title', key: 'prospectRole', placeholder: 'Head of Operations' },
            ].map(({ label, key, placeholder, full }) => (
              <div key={key} >
                <label >{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  
                />
              </div>
            ))}
          </div>

          {/* ICP Segment selector */}
          <div>
            <label >ICP Segment</label>
            <div >
              {ICP_SEGMENTS.map(seg => (
                <button
                  key={seg.id}
                  onClick={() => setForm(p => ({ ...p, icpSegment: seg.id }))}
                  
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
              <p >
                Hook: "{ICP_HOOKS[form.icpSegment].painHook}"
              </p>
            )}
          </div>

          {/* AI Personalise button */}
          <button
            onClick={handlePersonalise}
            disabled={!form.contactName || !form.companyName || generating}
            
          >
            {generating ? <Loader2  /> : <Sparkles  />}
            {generating ? 'Personalising...' : 'AI Personalise All 3 Touches'}
          </button>
        </div>

        {/* Email touches */}
        <div >
          <div >Email Sequence Touches</div>
          {form.touches.map((touch, idx) => (
            <div key={idx} >
              <div >
                <div >
                  <span >
                    {idx + 1}
                  </span>
                  <span >Day {touch.day}</span>
                  {touch.variantUsed && (
                    <span >
                      Variant {touch.variantUsed}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setEditingTouch(editingTouch === idx ? null : idx)}
                  
                >
                  <Edit3  />
                </button>
              </div>

              <div>
                <div >Subject</div>
                <div >
                  {touch.subject}
                </div>
              </div>

              {editingTouch === idx && (
                <div>
                  <div >Email Body</div>
                  <textarea
                    value={touch.body}
                    onChange={e => setForm(f => ({ ...f, touches: f.touches.map((t, i) => i === idx ? { ...t, body: e.target.value } : t) }))}
                    rows={8}
                    
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div >
          <button onClick={() => setView('list')} >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!form.sequenceName}
            
          >
            Launch Sequence
          </button>
        </div>
      </div>
    );
  }

  if (view === 'personalize') {
    return (
      <div >
        <div >
          <button onClick={() => setView('list')} >
            <ChevronRight  />
          </button>
          <div>
            <h2 >AI Outreach Personalisation</h2>
            <p >Generate customized email copy using the AI copywriter agent</p>
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
    <div >
      <div >
        <div>
          <h1 >Email Sequences</h1>
          <p >3-touch outreach sequences per ICP segment</p>
        </div>
        <div >
          <button
            onClick={() => setView('personalize')}
            
          >
            <Sparkles  />
            AI Writer
          </button>
          <button
            onClick={() => setView('create')}
            
          >
            <Plus  />
            New Sequence
          </button>
        </div>
      </div>


      {/* Stats */}
      <div >
        {[
          { label: 'Total',     value: stats.total,     icon: Mail,        color: '#6366f1' },
          { label: 'Active',    value: stats.active,    icon: Play,        color: '#10b981' },
          { label: 'Complete',  value: stats.completed, icon: CheckCircle2,color: '#3b82f6' },
          { label: 'Opened',    value: stats.opened,    icon: Eye,         color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} >
            <div >
              <div  style={{ background: color + '15' }}>
                <Icon  style={{ color }} />
              </div>
              <span >{value}</span>
            </div>
            <div >{label}</div>
          </div>
        ))}
      </div>

      {/* Listmonk integration info */}
      <div >
        <div >
          <div >
            <Zap  />
          </div>
          <div >
            <div >Listmonk Integration</div>
            <div >
              {localStorage.getItem('zy_listmonk_url')
                ? `Connected to ${localStorage.getItem('zy_listmonk_url')}`
                : 'Not configured — sequences run in local mode. Configure Listmonk in Settings for real delivery.'}
            </div>
          </div>
          <button >
            Configure →
          </button>
        </div>
      </div>

      {sequences.length === 0 ? (
        <div >
          <Mail  />
          <div >No email sequences yet</div>
          <div >Create your first 3-touch outreach sequence</div>
        </div>
      ) : (
        <div >
          {sequences.map(seq => {
            const statusCfg = STATUS_CFG[seq.status];
            return (
              <motion.div
                key={seq.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                
              >
                <div >
                  <div >
                    <div >
                      <span >{seq.sequenceName}</span>
                      <span 
                        style={{ background: statusCfg.color + '15', color: statusCfg.color }}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                      {seq.icpSegment && (
                        <span >
                          {ICP_SEGMENTS.find(s => s.id === seq.icpSegment)?.label}
                        </span>
                      )}
                    </div>
                    {seq.contactName && (
                      <div >
                        {seq.contactName}{seq.contactEmail ? ` · ${seq.contactEmail}` : ''}
                      </div>
                    )}
                    {/* Touch progress */}
                    <div >
                      {[1, 2, 3].map(touch => (
                        <div key={touch} 
                          style={{ background: touch <= seq.currentTouch ? '#6366f1' : 'var(--border)' }} />
                      ))}
                      <span >Touch {seq.currentTouch}/3</span>
                    </div>
                    <div >
                      {seq.openedAt && <span ><CheckCircle2  />Opened</span>}
                      {seq.clickedAt && <span ><CheckCircle2  />Clicked</span>}
                      {seq.repliedAt && <span ><MessageSquare  />Replied</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(seq)}
                    
                  >
                    {seq.status === 'active' ? <Pause  /> : <Play  />}
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
