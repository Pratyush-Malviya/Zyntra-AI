import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Brain, Sparkles, DollarSign, Crown, Target, Timer,
  ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Save
} from 'lucide-react';
import type { BantScore, BantSignals } from '../../services/firestoreSchema';
import { BANT_SCORE_CONFIG } from '../../services/firestoreSchema';
import { scoreTranscriptBant } from '../../services/aiAgentService';

interface BantScoringDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  leadId: string;
  currentScore?: BantScore;
  currentSignals?: BantSignals;
  onSave: (score: BantScore, signals: BantSignals, notes: string) => void;
}

const SIGNAL_OPTIONS = ['positive', 'neutral', 'negative', 'unknown'] as const;
const URGENCY_OPTIONS = ['high', 'medium', 'low'] as const;
const INFLUENCE_OPTIONS = ['primary', 'secondary', 'unknown'] as const;

export default function BantScoringDrawer({
  isOpen, onClose, leadName, leadId, currentScore, currentSignals, onSave
}: BantScoringDrawerProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [transcript, setTranscript] = useState('');
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');

  const [score, setScore] = useState<BantScore>(currentScore || 'C');
  const [signals, setSignals] = useState<BantSignals>(currentSignals || {
    budget: { signal: 'unknown', evidence: '', notes: '' },
    authority: { isDecisionMaker: false, influencerLevel: 'unknown', evidence: '', otherStakeholders: [] },
    need: { painConfirmed: false, painSummary: '', urgency: 'medium', evidence: '' },
    timeline: { timeframe: '', drivingEvent: '', evidence: '' },
  });

  const [aiRationale, setAiRationale] = useState('');

  const handleAiScore = async () => {
    if (!transcript.trim()) return;
    setScoring(true);
    setAiRationale('');
    try {
      const result = await scoreTranscriptBant(transcript);
      setScore(result.score);
      setSignals(result.signals);
      setAiRationale(result.rationale);
    } finally {
      setScoring(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(score, signals, notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const scoreCfg = BANT_SCORE_CONFIG[score];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl z-50 flex flex-col"
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-text">BANT Scoring</h2>
                <p className="text-xs text-text-secondary">{leadName}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Current score badge */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm cursor-pointer select-none"
                  style={{ background: scoreCfg.bg, color: scoreCfg.color }}
                >
                  {scoreCfg.label}
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-elevated text-text-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-3 border-b border-border flex-shrink-0">
              {[{ id: 'manual', label: 'Manual Score' }, { id: 'ai', label: 'AI from Transcript' }].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                    color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">

              {activeTab === 'manual' && (
                <div className="p-6 space-y-6">
                  {/* Score selector */}
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Overall BANT Score</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.entries(BANT_SCORE_CONFIG) as [BantScore, any][]).map(([s, cfg]) => (
                        <button
                          key={s}
                          onClick={() => setScore(s)}
                          className="p-3 rounded-xl border font-bold text-sm transition-all"
                          style={{
                            background: score === s ? cfg.bg : 'var(--surface-elevated)',
                            borderColor: score === s ? cfg.color : 'var(--border)',
                            color: score === s ? cfg.color : 'var(--text-secondary)',
                          }}
                        >
                          {s}
                          <div className="text-[9px] font-normal mt-0.5 opacity-70">
                            {s === 'A' ? 'Hot' : s === 'B' ? 'Warm' : s === 'C' ? 'Cool' : 'Cold'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Budget */}
                  <BantSection
                    title="Budget"
                    icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
                    description="Does the prospect have confirmed or probable budget?"
                  >
                    <div>
                      <label className="text-[10px] text-text-secondary mb-1 block">Budget Signal</label>
                      <div className="flex gap-2">
                        {SIGNAL_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setSignals(s => ({ ...s, budget: { ...s.budget, signal: opt } }))}
                            className="flex-1 py-1.5 rounded-xl text-[11px] font-semibold capitalize transition-all border"
                            style={{
                              background: signals.budget.signal === opt ? 'var(--color-primary)15' : 'var(--surface-elevated)',
                              borderColor: signals.budget.signal === opt ? 'var(--color-primary)' : 'var(--border)',
                              color: signals.budget.signal === opt ? 'var(--color-primary)' : 'var(--text-secondary)',
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      value={signals.budget.evidence}
                      onChange={e => setSignals(s => ({ ...s, budget: { ...s.budget, evidence: e.target.value } }))}
                      placeholder="Evidence or quote from the call..."
                      className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary"
                    />
                  </BantSection>

                  {/* Authority */}
                  <BantSection
                    title="Authority"
                    icon={<Crown className="w-4 h-4 text-amber-400" />}
                    description="Is the prospect the decision maker?"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSignals(s => ({ ...s, authority: { ...s.authority, isDecisionMaker: !s.authority.isDecisionMaker } }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          signals.authority.isDecisionMaker
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                            : 'bg-surface-elevated border-border text-text-secondary'
                        }`}
                      >
                        {signals.authority.isDecisionMaker ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                        Decision Maker
                      </button>
                      <select
                        value={signals.authority.influencerLevel}
                        onChange={e => setSignals(s => ({ ...s, authority: { ...s.authority, influencerLevel: e.target.value as any } }))}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-xs focus:outline-none focus:border-primary"
                      >
                        {INFLUENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} influence</option>)}
                      </select>
                    </div>
                    <input
                      value={signals.authority.evidence}
                      onChange={e => setSignals(s => ({ ...s, authority: { ...s.authority, evidence: e.target.value } }))}
                      placeholder="Role, title, or quote confirming authority..."
                      className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary"
                    />
                  </BantSection>

                  {/* Need */}
                  <BantSection
                    title="Need"
                    icon={<Target className="w-4 h-4 text-rose-400" />}
                    description="Has the prospect confirmed a real, specific pain?"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => setSignals(s => ({ ...s, need: { ...s.need, painConfirmed: !s.need.painConfirmed } }))}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          signals.need.painConfirmed
                            ? 'bg-rose-500/15 border-rose-500 text-rose-400'
                            : 'bg-surface-elevated border-border text-text-secondary'
                        }`}
                      >
                        {signals.need.painConfirmed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                        Pain Confirmed
                      </button>
                      <div className="flex gap-1.5">
                        {URGENCY_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setSignals(s => ({ ...s, need: { ...s.need, urgency: opt } }))}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-semibold capitalize transition-all border"
                            style={{
                              background: signals.need.urgency === opt ? 'var(--color-primary)15' : 'var(--surface-elevated)',
                              borderColor: signals.need.urgency === opt ? 'var(--color-primary)' : 'var(--border)',
                              color: signals.need.urgency === opt ? 'var(--color-primary)' : 'var(--text-secondary)',
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={signals.need.painSummary}
                      onChange={e => setSignals(s => ({ ...s, need: { ...s.need, painSummary: e.target.value } }))}
                      placeholder="Describe the specific pain the prospect expressed..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary resize-none"
                    />
                  </BantSection>

                  {/* Timeline */}
                  <BantSection
                    title="Timeline"
                    icon={<Timer className="w-4 h-4 text-blue-400" />}
                    description="When do they need to solve this?"
                  >
                    <input
                      value={signals.timeline.timeframe}
                      onChange={e => setSignals(s => ({ ...s, timeline: { ...s.timeline, timeframe: e.target.value } }))}
                      placeholder="e.g. Q1 2025, within 60 days, this year..."
                      className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary"
                    />
                    <input
                      value={signals.timeline.drivingEvent}
                      onChange={e => setSignals(s => ({ ...s, timeline: { ...s.timeline, drivingEvent: e.target.value } }))}
                      placeholder="Driving event (e.g. board review, new hire, regulatory deadline)..."
                      className="w-full px-3 py-2 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary"
                    />
                  </BantSection>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Additional Notes</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any context or next steps to record..."
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="p-6 space-y-4">
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-text-secondary leading-relaxed">
                    <div className="font-bold text-primary mb-1">How it works</div>
                    Paste the call transcript below. The AI agent will extract BANT signals and assign a score automatically. You can review and adjust before saving.
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Call Transcript</label>
                    <textarea
                      value={transcript}
                      onChange={e => setTranscript(e.target.value)}
                      placeholder="Paste the full meeting transcript here..."
                      rows={10}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm font-mono focus:outline-none focus:border-primary resize-none"
                    />
                    <div className="text-xs text-text-secondary mt-1">{transcript.length} characters</div>
                  </div>

                  <button
                    onClick={handleAiScore}
                    disabled={transcript.trim().length < 50 || scoring}
                    className="w-full py-3 rounded-xl text-text font-semibold text-sm hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {scoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    {scoring ? 'Scoring with AI...' : 'Score with AI Agent'}
                  </button>

                  {aiRationale && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className="p-4 rounded-xl border border-border bg-surface-elevated">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">AI Analysis Result</span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg font-bold px-3 py-1 rounded-xl" style={{
                            background: BANT_SCORE_CONFIG[score].bg,
                            color: BANT_SCORE_CONFIG[score].color,
                          }}>
                            {BANT_SCORE_CONFIG[score].label}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">{aiRationale}</p>
                      </div>
                      <div className="text-xs text-text-secondary text-center">
                        Signals updated above. Review and switch to Manual tab to adjust.
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-border flex-shrink-0">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm text-text-secondary hover:text-text transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-text font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save BANT Score
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function BantSection({ title, icon, description, children }: {
  title: string; icon: React.ReactNode; description: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="text-sm font-bold text-text">{title}</div>
          <div className="text-[11px] text-text-secondary">{description}</div>
        </div>
      </div>
      <div className="pl-6 space-y-2 border-l-2 border-border">
        {children}
      </div>
    </div>
  );
}
