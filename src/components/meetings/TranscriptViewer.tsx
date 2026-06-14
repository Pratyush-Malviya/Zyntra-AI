import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, CheckCircle2, Clock, AlertCircle, ChevronDown,
  ChevronUp, Copy, Mail, Brain, Tag, Users, Calendar,
  TrendingUp, Shield, DollarSign, Timer
} from 'lucide-react';
import type { Meeting, ActionItem } from '../../services/firestoreSchema';
import { BANT_SCORE_CONFIG } from '../../services/firestoreSchema';

interface TranscriptViewerProps {
  meeting: Meeting;
  onToggleActionItem: (index: number) => void;
}

export default function TranscriptViewer({ meeting, onToggleActionItem }: TranscriptViewerProps) {
  const [sections, setSections] = useState({
    summary: true,
    bant: true,
    transcript: false,
    actions: true,
    objections: false,
    email: false,
  });
  const [copied, setCopied] = useState(false);

  const toggle = (key: keyof typeof sections) =>
    setSections(s => ({ ...s, [key]: !s[key] }));

  const copyEmail = () => {
    if (meeting.followUpEmailDraft) {
      navigator.clipboard.writeText(meeting.followUpEmailDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const completedActions = meeting.actionItems?.filter(a => a.completed).length || 0;
  const totalActions = meeting.actionItems?.length || 0;

  return (
    <div className="space-y-4">

      {/* Summary Card */}
      <Section
        title="AI Meeting Summary"
        icon={<Brain className="w-4 h-4 text-violet-400" />}
        open={sections.summary}
        onToggle={() => toggle('summary')}
        badge={meeting.processingStatus === 'complete' ? '✓ Complete' : undefined}
        badgeColor="#10b981"
      >
        {meeting.summary ? (
          <p className="text-sm text-text-secondary leading-relaxed">{meeting.summary}</p>
        ) : (
          <p className="text-sm text-text-secondary italic">Upload a recording and run AI analysis to generate a summary.</p>
        )}

        {meeting.nextStep && (
          <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Recommended Next Step</div>
            <div className="text-sm text-text">{meeting.nextStep}</div>
          </div>
        )}
      </Section>

      {/* BANT Signals */}
      {meeting.bantScore && meeting.bantSignals && (
        <Section
          title="BANT Qualification Signals"
          icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          open={sections.bant}
          onToggle={() => toggle('bant')}
          badge={`Score: ${meeting.bantScore}`}
          badgeColor={BANT_SCORE_CONFIG[meeting.bantScore].color}
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'Budget', icon: '💰', data: meeting.bantSignals.budget, signalKey: 'signal' },
              { key: 'Authority', icon: '👑', data: meeting.bantSignals.authority, signalKey: 'influencerLevel' },
              { key: 'Need', icon: '🎯', data: meeting.bantSignals.need, signalKey: 'urgency' },
              { key: 'Timeline', icon: '⏰', data: meeting.bantSignals.timeline, signalKey: 'timeframe' },
            ].map(({ key, icon, data, signalKey }) => (
              <div key={key} className="p-3 rounded-xl bg-surface-elevated border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{icon} {key}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {(data as any)[signalKey] || 'unknown'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {(data as any).evidence || (data as any).notes || 'Signal extracted from call'}
                </p>
              </div>
            ))}
          </div>

          {meeting.bantSignals.authority.otherStakeholders?.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">Other Stakeholders Involved</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {meeting.bantSignals.authority.otherStakeholders.map((s, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{s}</span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Action Items */}
      {meeting.actionItems && meeting.actionItems.length > 0 && (
        <Section
          title="Action Items"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          open={sections.actions}
          onToggle={() => toggle('actions')}
          badge={`${completedActions}/${totalActions}`}
          badgeColor={completedActions === totalActions ? '#10b981' : '#6366f1'}
        >
          <div className="space-y-2">
            {/* Progress bar */}
            {totalActions > 0 && (
              <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedActions / totalActions) * 100}%` }}
                />
              </div>
            )}
            {meeting.actionItems.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                  item.completed
                    ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60'
                    : 'bg-surface-elevated border-border hover:border-primary/40'
                }`}
                onClick={() => onToggleActionItem(idx)}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  item.completed ? 'border-emerald-500 bg-emerald-500' : 'border-border'
                }`}>
                  {item.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${item.completed ? 'line-through text-text-secondary' : 'text-text'}`}>
                    {item.task}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-text-secondary">{item.owner}</span>
                    {item.dueDate && (
                      <span className="flex items-center gap-0.5 text-[10px] text-text-secondary">
                        <Calendar className="w-3 h-3" />
                        {item.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Pain Points Confirmed */}
      {meeting.painConfirmed && meeting.painConfirmed.length > 0 && (
        <Section
          title="Pain Points Confirmed"
          icon={<Tag className="w-4 h-4 text-rose-400" />}
          open={sections.objections}
          onToggle={() => toggle('objections')}
        >
          <div className="flex flex-wrap gap-2">
            {meeting.painConfirmed.map((pain, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {pain}
              </span>
            ))}
          </div>
          {meeting.objectionsRaised && meeting.objectionsRaised.length > 0 && (
            <>
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-3 mb-2">Objections Raised</div>
              <div className="flex flex-wrap gap-2">
                {meeting.objectionsRaised.map((obj, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    ⚠️ {obj}
                  </span>
                ))}
              </div>
            </>
          )}
        </Section>
      )}

      {/* Follow-up Email Draft */}
      {meeting.followUpEmailDraft && (
        <Section
          title="AI-Drafted Follow-Up Email"
          icon={<Mail className="w-4 h-4 text-blue-400" />}
          open={sections.email}
          onToggle={() => toggle('email')}
          badge={copied ? '✓ Copied!' : 'Copy'}
          badgeColor={copied ? '#10b981' : '#6366f1'}
          onBadgeClick={copyEmail}
        >
          <pre className="text-sm text-text-secondary whitespace-pre-wrap font-sans leading-relaxed bg-surface-elevated p-4 rounded-xl border border-border">
            {meeting.followUpEmailDraft}
          </pre>
        </Section>
      )}

      {/* Transcript */}
      {meeting.transcript && (
        <Section
          title="Full Transcript"
          icon={<FileText className="w-4 h-4 text-text-secondary" />}
          open={sections.transcript}
          onToggle={() => toggle('transcript')}
          badge={`${Math.round(meeting.transcript.length / 5)} words`}
          badgeColor="#64748b"
        >
          <div className="bg-surface-elevated rounded-xl p-4 border border-border max-h-96 overflow-y-auto">
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap font-mono text-xs">
              {meeting.transcript}
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── Section component ─────────────────────────────────────────────────────────

function Section({
  title, icon, open, onToggle, badge, badgeColor, onBadgeClick, children
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  badgeColor?: string;
  onBadgeClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold text-text">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: badgeColor + '20', color: badgeColor }}
              onClick={e => { if (onBadgeClick) { e.stopPropagation(); onBadgeClick(); } }}
            >
              {badge}
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
        </div>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 pb-4"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
