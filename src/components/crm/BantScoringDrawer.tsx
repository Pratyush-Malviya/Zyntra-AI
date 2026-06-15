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
            
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div >
              <div>
                <h2 >BANT Scoring</h2>
                <p >{leadName}</p>
              </div>
              <div >
                {/* Current score badge */}
                <div
                  
                  style={{ background: scoreCfg.bg, color: scoreCfg.color }}
                >
                  {scoreCfg.label}
                </div>
                <button onClick={onClose} >
                  <X  />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div >
              {[{ id: 'manual', label: 'Manual Score' }, { id: 'ai', label: 'AI from Transcript' }].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  
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
            <div >

              {activeTab === 'manual' && (
                <div >
                  {/* Score selector */}
                  <div>
                    <label >Overall BANT Score</label>
                    <div >
                      {(Object.entries(BANT_SCORE_CONFIG) as [BantScore, any][]).map(([s, cfg]) => (
                        <button
                          key={s}
                          onClick={() => setScore(s)}
                          
                          style={{
                            background: score === s ? cfg.bg : 'var(--surface-elevated)',
                            borderColor: score === s ? cfg.color : 'var(--border)',
                            color: score === s ? cfg.color : 'var(--text-secondary)',
                          }}
                        >
                          {s}
                          <div >
                            {s === 'A' ? 'Hot' : s === 'B' ? 'Warm' : s === 'C' ? 'Cool' : 'Cold'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Budget */}
                  <BantSection
                    title="Budget"
                    icon={<DollarSign  />}
                    description="Does the prospect have confirmed or probable budget?"
                  >
                    <div>
                      <label >Budget Signal</label>
                      <div >
                        {SIGNAL_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setSignals(s => ({ ...s, budget: { ...s.budget, signal: opt } }))}
                            
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
                      
                    />
                  </BantSection>

                  {/* Authority */}
                  <BantSection
                    title="Authority"
                    icon={<Crown  />}
                    description="Is the prospect the decision maker?"
                  >
                    <div >
                      <button
                        onClick={() => setSignals(s => ({ ...s, authority: { ...s.authority, isDecisionMaker: !s.authority.isDecisionMaker } }))}
                        
                      >
                        {signals.authority.isDecisionMaker ? <CheckCircle2  /> : <div  />}
                        Decision Maker
                      </button>
                      <select
                        value={signals.authority.influencerLevel}
                        onChange={e => setSignals(s => ({ ...s, authority: { ...s.authority, influencerLevel: e.target.value as any } }))}
                        
                      >
                        {INFLUENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} influence</option>)}
                      </select>
                    </div>
                    <input
                      value={signals.authority.evidence}
                      onChange={e => setSignals(s => ({ ...s, authority: { ...s.authority, evidence: e.target.value } }))}
                      placeholder="Role, title, or quote confirming authority..."
                      
                    />
                  </BantSection>

                  {/* Need */}
                  <BantSection
                    title="Need"
                    icon={<Target  />}
                    description="Has the prospect confirmed a real, specific pain?"
                  >
                    <div >
                      <button
                        onClick={() => setSignals(s => ({ ...s, need: { ...s.need, painConfirmed: !s.need.painConfirmed } }))}
                        
                      >
                        {signals.need.painConfirmed ? <CheckCircle2  /> : <div  />}
                        Pain Confirmed
                      </button>
                      <div >
                        {URGENCY_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setSignals(s => ({ ...s, need: { ...s.need, urgency: opt } }))}
                            
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
                      
                    />
                  </BantSection>

                  {/* Timeline */}
                  <BantSection
                    title="Timeline"
                    icon={<Timer  />}
                    description="When do they need to solve this?"
                  >
                    <input
                      value={signals.timeline.timeframe}
                      onChange={e => setSignals(s => ({ ...s, timeline: { ...s.timeline, timeframe: e.target.value } }))}
                      placeholder="e.g. Q1 2025, within 60 days, this year..."
                      
                    />
                    <input
                      value={signals.timeline.drivingEvent}
                      onChange={e => setSignals(s => ({ ...s, timeline: { ...s.timeline, drivingEvent: e.target.value } }))}
                      placeholder="Driving event (e.g. board review, new hire, regulatory deadline)..."
                      
                    />
                  </BantSection>

                  {/* Notes */}
                  <div>
                    <label >Additional Notes</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any context or next steps to record..."
                      rows={3}
                      
                    />
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div >
                  <div >
                    <div >How it works</div>
                    Paste the call transcript below. The AI agent will extract BANT signals and assign a score automatically. You can review and adjust before saving.
                  </div>

                  <div>
                    <label >Call Transcript</label>
                    <textarea
                      value={transcript}
                      onChange={e => setTranscript(e.target.value)}
                      placeholder="Paste the full meeting transcript here..."
                      rows={10}
                      
                    />
                    <div >{transcript.length} characters</div>
                  </div>

                  <button
                    onClick={handleAiScore}
                    disabled={transcript.trim().length < 50 || scoring}
                    
                  >
                    {scoring ? <Loader2  /> : <Brain  />}
                    {scoring ? 'Scoring with AI...' : 'Score with AI Agent'}
                  </button>

                  {aiRationale && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} >
                      <div >
                        <div >
                          <Sparkles  />
                          <span >AI Analysis Result</span>
                        </div>
                        <div >
                          <span  style={{
                            background: BANT_SCORE_CONFIG[score].bg,
                            color: BANT_SCORE_CONFIG[score].color,
                          }}>
                            {BANT_SCORE_CONFIG[score].label}
                          </span>
                        </div>
                        <p >{aiRationale}</p>
                      </div>
                      <div >
                        Signals updated above. Review and switch to Manual tab to adjust.
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div >
              <button onClick={onClose} >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                
              >
                {saving ? <Loader2  /> : <Save  />}
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
    <div >
      <div >
        {icon}
        <div>
          <div >{title}</div>
          <div >{description}</div>
        </div>
      </div>
      <div >
        {children}
      </div>
    </div>
  );
}
