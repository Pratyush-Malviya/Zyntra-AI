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
    <div >

      {/* Summary Card */}
      <Section
        title="AI Meeting Summary"
        icon={<Brain  />}
        open={sections.summary}
        onToggle={() => toggle('summary')}
        badge={meeting.processingStatus === 'complete' ? '✓ Complete' : undefined}
        badgeColor="#10b981"
      >
        {meeting.summary ? (
          <p >{meeting.summary}</p>
        ) : (
          <p >Upload a recording and run AI analysis to generate a summary.</p>
        )}

        {meeting.nextStep && (
          <div >
            <div >Recommended Next Step</div>
            <div >{meeting.nextStep}</div>
          </div>
        )}
      </Section>

      {/* BANT Signals */}
      {meeting.bantScore && meeting.bantSignals && (
        <Section
          title="BANT Qualification Signals"
          icon={<TrendingUp  />}
          open={sections.bant}
          onToggle={() => toggle('bant')}
          badge={`Score: ${meeting.bantScore}`}
          badgeColor={BANT_SCORE_CONFIG[meeting.bantScore].color}
        >
          <div >
            {[
              { key: 'Budget', icon: '💰', data: meeting.bantSignals.budget, signalKey: 'signal' },
              { key: 'Authority', icon: '👑', data: meeting.bantSignals.authority, signalKey: 'influencerLevel' },
              { key: 'Need', icon: '🎯', data: meeting.bantSignals.need, signalKey: 'urgency' },
              { key: 'Timeline', icon: '⏰', data: meeting.bantSignals.timeline, signalKey: 'timeframe' },
            ].map(({ key, icon, data, signalKey }) => (
              <div key={key} >
                <div >
                  <span >{icon} {key}</span>
                  <span >
                    {(data as any)[signalKey] || 'unknown'}
                  </span>
                </div>
                <p >
                  {(data as any).evidence || (data as any).notes || 'Signal extracted from call'}
                </p>
              </div>
            ))}
          </div>

          {meeting.bantSignals.authority.otherStakeholders?.length > 0 && (
            <div >
              <div >
                <Users  />
                <span >Other Stakeholders Involved</span>
              </div>
              <div >
                {meeting.bantSignals.authority.otherStakeholders.map((s, i) => (
                  <span key={i} >{s}</span>
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
          icon={<CheckCircle2  />}
          open={sections.actions}
          onToggle={() => toggle('actions')}
          badge={`${completedActions}/${totalActions}`}
          badgeColor={completedActions === totalActions ? '#10b981' : '#6366f1'}
        >
          <div >
            {/* Progress bar */}
            {totalActions > 0 && (
              <div >
                <motion.div
                  
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedActions / totalActions) * 100}%` }}
                />
              </div>
            )}
            {meeting.actionItems.map((item, idx) => (
              <div
                key={idx}
                
                onClick={() => onToggleActionItem(idx)}
              >
                <div >
                  {item.completed && <CheckCircle2  />}
                </div>
                <div >
                  <div >
                    {item.task}
                  </div>
                  <div >
                    <span >{item.owner}</span>
                    {item.dueDate && (
                      <span >
                        <Calendar  />
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
          icon={<Tag  />}
          open={sections.objections}
          onToggle={() => toggle('objections')}
        >
          <div >
            {meeting.painConfirmed.map((pain, i) => (
              <span key={i} >
                {pain}
              </span>
            ))}
          </div>
          {meeting.objectionsRaised && meeting.objectionsRaised.length > 0 && (
            <>
              <div >Objections Raised</div>
              <div >
                {meeting.objectionsRaised.map((obj, i) => (
                  <span key={i} >
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
          icon={<Mail  />}
          open={sections.email}
          onToggle={() => toggle('email')}
          badge={copied ? '✓ Copied!' : 'Copy'}
          badgeColor={copied ? '#10b981' : '#6366f1'}
          onBadgeClick={copyEmail}
        >
          <pre >
            {meeting.followUpEmailDraft}
          </pre>
        </Section>
      )}

      {/* Transcript */}
      {meeting.transcript && (
        <Section
          title="Full Transcript"
          icon={<FileText  />}
          open={sections.transcript}
          onToggle={() => toggle('transcript')}
          badge={`${Math.round(meeting.transcript.length / 5)} words`}
          badgeColor="#64748b"
        >
          <div >
            <p >
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
    <div >
      <button
        onClick={onToggle}
        
      >
        <div >
          {icon}
          <span >{title}</span>
        </div>
        <div >
          {badge && (
            <span
              
              style={{ background: badgeColor + '20', color: badgeColor }}
              onClick={e => { if (onBadgeClick) { e.stopPropagation(); onBadgeClick(); } }}
            >
              {badge}
            </span>
          )}
          {open ? <ChevronUp  /> : <ChevronDown  />}
        </div>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
