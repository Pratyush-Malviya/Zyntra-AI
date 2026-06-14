import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, MicOff, Upload, FileText, Brain, CheckCircle2, Clock, AlertCircle,
  ChevronRight, ChevronDown, Plus, Calendar, Phone, Video, Users, Loader2,
  Sparkles, Download, Edit3, Tag, ArrowRight, Play, Trash2, MessageSquare, X
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, orderBy, Timestamp
} from '../../firebase';
import { db, auth } from '../../firebase';
import type { Meeting, BantScore, ActionItem } from '../../services/firestoreSchema';
import { createMeeting, updateMeeting, BANT_SCORE_CONFIG } from '../../services/firestoreSchema';
import { runPostMeetingAgent, scoreTranscriptBant } from '../../services/aiAgentService';
import TranscriptViewer from './TranscriptViewer';
import MeetingUpload from './MeetingUpload';

interface MeetingsPanelProps {
  orgId: string;
  profile: any;
}

const MEETING_TYPE_CONFIG = {
  discovery:    { label: 'Discovery',    color: '#6366f1', icon: '🔍' },
  demo:         { label: 'Demo',         color: '#3b82f6', icon: '🎯' },
  pilot_review: { label: 'Pilot Review', color: '#f59e0b', icon: '🔄' },
  closing:      { label: 'Closing',      color: '#10b981', icon: '🏆' },
};

const STATUS_CONFIG = {
  pending:      { label: 'Pending',      color: '#64748b', pulse: false },
  transcribing: { label: 'Transcribing', color: '#6366f1', pulse: true  },
  analyzing:    { label: 'Analyzing',    color: '#f59e0b', pulse: true  },
  complete:     { label: 'Complete',     color: '#10b981', pulse: false },
  error:        { label: 'Error',        color: '#ef4444', pulse: false },
};

export default function MeetingsPanel({ orgId, profile }: MeetingsPanelProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [view, setView] = useState<'list' | 'detail' | 'create' | 'upload'>('list');
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | Meeting['meetingType']>('all');
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    meetingType: 'discovery',
    title: '',
    scheduledAt: new Date().toISOString().slice(0, 16),
    leadId: '',
    leadName: '',
  });

  useEffect(() => {
    const q = query(
      collection(db, 'meetings'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  const filteredMeetings = filter === 'all' ? meetings : meetings.filter(m => m.meetingType === filter);

  const handleCreateMeeting = async () => {
    if (!newMeeting.title) return;
    await createMeeting({
      ...newMeeting as Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>,
      orgId,
    });
    setView('list');
    setNewMeeting({ meetingType: 'discovery', title: '', scheduledAt: new Date().toISOString().slice(0, 16) });
  };

  const handleAnalyseMeeting = async (meeting: Meeting) => {
    if (!meeting.id || !meeting.transcript) return;
    setProcessing(p => ({ ...p, [meeting.id!]: true }));
    try {
      await updateMeeting(meeting.id, { processingStatus: 'analyzing' });
      const result = await runPostMeetingAgent({
        meetingId: meeting.id,
        leadId: meeting.leadId,
        transcript: meeting.transcript,
        prospectName: meeting.leadName || 'Prospect',
        prospectRole: 'Decision Maker',
        companyName: 'Target Company',
        callDate: new Date(meeting.scheduledAt).toLocaleDateString(),
      });
      await updateMeeting(meeting.id, {
        bantScore: result.bantScore,
        bantSignals: result.bantSignals,
        actionItems: result.actionItems,
        painConfirmed: result.painConfirmed,
        objectionsRaised: result.objectionsRaised,
        nextStep: result.nextStep,
        summary: result.summary,
        followUpEmailDraft: result.followUpEmailDraft,
        processingStatus: 'complete',
      });
    } catch (e) {
      await updateMeeting(meeting.id, { processingStatus: 'error' });
    } finally {
      setProcessing(p => ({ ...p, [meeting.id!]: false }));
    }
  };

  const handleToggleActionItem = async (meeting: Meeting, idx: number) => {
    if (!meeting.id || !meeting.actionItems) return;
    const updated = meeting.actionItems.map((item, i) =>
      i === idx ? { ...item, completed: !item.completed } : item
    );
    await updateMeeting(meeting.id, { actionItems: updated });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (view === 'upload' && selectedMeeting) {
    return (
      <MeetingUpload
        meeting={selectedMeeting}
        onComplete={async (transcript) => {
          if (!selectedMeeting.id) return;
          await updateMeeting(selectedMeeting.id, { transcript, processingStatus: 'transcribing' });
          setView('detail');
          await handleAnalyseMeeting({ ...selectedMeeting, transcript });
        }}
        onBack={() => setView('detail')}
      />
    );
  }

  if (view === 'detail' && selectedMeeting) {
    const live = meetings.find(m => m.id === selectedMeeting.id) || selectedMeeting;
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="p-2 rounded-lg hover:bg-surface-elevated transition-colors text-text-secondary"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-text truncate">{live.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{
                background: MEETING_TYPE_CONFIG[live.meetingType]?.color + '20',
                color: MEETING_TYPE_CONFIG[live.meetingType]?.color
              }}>
                {MEETING_TYPE_CONFIG[live.meetingType]?.icon} {MEETING_TYPE_CONFIG[live.meetingType]?.label}
              </span>
              <span className="text-xs text-text-secondary">{new Date(live.scheduledAt).toLocaleDateString()}</span>
              {live.processingStatus && (
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: STATUS_CONFIG[live.processingStatus]?.color }}>
                  {STATUS_CONFIG[live.processingStatus]?.pulse && <Loader2 className="w-3 h-3 animate-spin" />}
                  {STATUS_CONFIG[live.processingStatus]?.label}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!live.transcript && (
              <button
                onClick={() => { setSelectedMeeting(live); setView('upload'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Recording
              </button>
            )}
            {live.transcript && live.processingStatus !== 'complete' && (
              <button
                onClick={() => handleAnalyseMeeting(live)}
                disabled={processing[live.id!]}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {processing[live.id!] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Analyse with AI
              </button>
            )}
          </div>
        </div>

        <TranscriptViewer
          meeting={live}
          onToggleActionItem={(idx) => handleToggleActionItem(live, idx)}
        />
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <h2 className="text-lg font-bold">Schedule Meeting</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Meeting Title</label>
            <input
              value={newMeeting.title}
              onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Discovery Call — Acme Corp"
              className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Meeting Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(MEETING_TYPE_CONFIG) as any).map(([type, cfg]: any) => (
                <button
                  key={type}
                  onClick={() => setNewMeeting(p => ({ ...p, meetingType: type }))}
                  className="p-3 rounded-xl border text-center transition-all"
                  style={{
                    background: newMeeting.meetingType === type ? cfg.color + '15' : 'var(--surface-elevated)',
                    borderColor: newMeeting.meetingType === type ? cfg.color : 'var(--border)',
                  }}
                >
                  <div className="text-lg">{cfg.icon}</div>
                  <div className="text-[10px] font-semibold mt-1" style={{ color: newMeeting.meetingType === type ? cfg.color : 'var(--text-secondary)' }}>
                    {cfg.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Lead Name</label>
            <input
              value={newMeeting.leadName || ''}
              onChange={e => setNewMeeting(p => ({ ...p, leadName: e.target.value, leadId: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
              placeholder="Prospect or company name"
              className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 block">Scheduled At</label>
            <input
              type="datetime-local"
              value={newMeeting.scheduledAt?.slice(0, 16) || ''}
              onChange={e => setNewMeeting(p => ({ ...p, scheduledAt: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <button
            onClick={handleCreateMeeting}
            disabled={!newMeeting.title}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40"
          >
            Schedule Meeting
          </button>
        </div>
      </div>
    );
  }

  // LIST VIEW
  const stats = {
    total: meetings.length,
    complete: meetings.filter(m => m.processingStatus === 'complete').length,
    pending: meetings.filter(m => !m.transcript).length,
    aScore: meetings.filter(m => m.bantScore === 'A').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Meeting Intelligence</h1>
          <p className="text-xs text-text-secondary mt-0.5">Transcribe calls, extract BANT signals, draft follow-ups automatically</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Schedule Meeting
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Meetings', value: stats.total, icon: Calendar, color: '#6366f1' },
          { label: 'Analysed', value: stats.complete, icon: Brain, color: '#10b981' },
          { label: 'Awaiting Recording', value: stats.pending, icon: Mic, color: '#f59e0b' },
          { label: 'A-Score Leads', value: stats.aScore, icon: Sparkles, color: '#10b981' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg" style={{ background: color + '15' }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-2xl font-bold text-text">{value}</span>
            </div>
            <div className="text-xs text-text-secondary">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-surface-elevated rounded-xl w-fit">
        {(['all', 'discovery', 'demo', 'pilot_review', 'closing'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: filter === f ? 'var(--color-primary)' : 'transparent',
              color: filter === f ? 'white' : 'var(--text-secondary)',
            }}
          >
            {f === 'all' ? 'All' : MEETING_TYPE_CONFIG[f]?.label}
          </button>
        ))}
      </div>

      {/* Meeting list */}
      {filteredMeetings.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div className="font-semibold">No meetings yet</div>
          <div className="text-xs mt-1">Schedule your first meeting to get started</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMeetings.map((meeting) => {
            const typeCfg = MEETING_TYPE_CONFIG[meeting.meetingType];
            const statusCfg = meeting.processingStatus ? STATUS_CONFIG[meeting.processingStatus] : null;
            return (
              <motion.div
                key={meeting.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-4 hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => { setSelectedMeeting(meeting); setView('detail'); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-text">{meeting.title}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
                        background: typeCfg?.color + '15',
                        color: typeCfg?.color,
                      }}>
                        {typeCfg?.icon} {typeCfg?.label}
                      </span>
                      {meeting.bantScore && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{
                          background: BANT_SCORE_CONFIG[meeting.bantScore].bg,
                          color: BANT_SCORE_CONFIG[meeting.bantScore].color,
                        }}>
                          BANT {meeting.bantScore}
                        </span>
                      )}
                    </div>
                    {meeting.leadName && (
                      <div className="text-xs text-text-secondary mt-1">{meeting.leadName}</div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(meeting.scheduledAt).toLocaleDateString()}
                      </span>
                      {meeting.transcript && (
                        <span className="flex items-center gap-1 text-success">
                          <FileText className="w-3 h-3" />
                          Transcript
                        </span>
                      )}
                      {meeting.summary && (
                        <span className="flex items-center gap-1 text-primary">
                          <Brain className="w-3 h-3" />
                          AI Summary
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {statusCfg && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: statusCfg.color }}>
                        {statusCfg.pulse && <Loader2 className="w-3 h-3 animate-spin" />}
                        {statusCfg.label}
                      </span>
                    )}
                    {!meeting.transcript && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedMeeting(meeting); setView('upload'); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary hover:text-white transition-all"
                      >
                        <Upload className="w-3 h-3" />
                        Upload
                      </button>
                    )}
                    {meeting.transcript && meeting.processingStatus !== 'complete' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAnalyseMeeting(meeting); }}
                        disabled={processing[meeting.id!]}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 text-[11px] font-semibold hover:bg-violet-500 hover:text-white transition-all disabled:opacity-50"
                      >
                        {processing[meeting.id!] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Analyse
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-text-secondary" />
                  </div>
                </div>

                {/* Action items preview */}
                {meeting.actionItems && meeting.actionItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border flex gap-2 flex-wrap">
                    {meeting.actionItems.slice(0, 2).map((item, i) => (
                      <span key={i} className={`text-[10px] px-2 py-1 rounded-full border ${item.completed ? 'opacity-50 line-through' : ''}`}
                        style={{ borderColor: 'var(--border)' }}>
                        {item.task}
                      </span>
                    ))}
                    {meeting.actionItems.length > 2 && (
                      <span className="text-[10px] text-text-secondary">+{meeting.actionItems.length - 2} more</span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
