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
      <div >
        <Loader2  />
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
      <div >
        <div >
          <button
            onClick={() => setView('list')}
            
          >
            <ChevronRight  />
          </button>
          <div >
            <h2 >{live.title}</h2>
            <div >
              <span  style={{
                background: MEETING_TYPE_CONFIG[live.meetingType]?.color + '20',
                color: MEETING_TYPE_CONFIG[live.meetingType]?.color
              }}>
                {MEETING_TYPE_CONFIG[live.meetingType]?.icon} {MEETING_TYPE_CONFIG[live.meetingType]?.label}
              </span>
              <span >{new Date(live.scheduledAt).toLocaleDateString()}</span>
              {live.processingStatus && (
                <span  style={{ color: STATUS_CONFIG[live.processingStatus]?.color }}>
                  {STATUS_CONFIG[live.processingStatus]?.pulse && <Loader2  />}
                  {STATUS_CONFIG[live.processingStatus]?.label}
                </span>
              )}
            </div>
          </div>
          <div >
            {!live.transcript && (
              <button
                onClick={() => { setSelectedMeeting(live); setView('upload'); }}
                
              >
                <Upload  />
                Upload Recording
              </button>
            )}
            {live.transcript && live.processingStatus !== 'complete' && (
              <button
                onClick={() => handleAnalyseMeeting(live)}
                disabled={processing[live.id!]}
                
              >
                {processing[live.id!] ? <Loader2  /> : <Brain  />}
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
      <div >
        <div >
          <button onClick={() => setView('list')} >
            <ChevronRight  />
          </button>
          <h2 >Schedule Meeting</h2>
        </div>

        <div >
          <div>
            <label >Meeting Title</label>
            <input
              value={newMeeting.title}
              onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Discovery Call — Acme Corp"
              
            />
          </div>

          <div>
            <label >Meeting Type</label>
            <div >
              {(Object.entries(MEETING_TYPE_CONFIG) as any).map(([type, cfg]: any) => (
                <button
                  key={type}
                  onClick={() => setNewMeeting(p => ({ ...p, meetingType: type }))}
                  
                  style={{
                    background: newMeeting.meetingType === type ? cfg.color + '15' : 'var(--surface-elevated)',
                    borderColor: newMeeting.meetingType === type ? cfg.color : 'var(--border)',
                  }}
                >
                  <div >{cfg.icon}</div>
                  <div  style={{ color: newMeeting.meetingType === type ? cfg.color : 'var(--text-secondary)' }}>
                    {cfg.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label >Lead Name</label>
            <input
              value={newMeeting.leadName || ''}
              onChange={e => setNewMeeting(p => ({ ...p, leadName: e.target.value, leadId: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
              placeholder="Prospect or company name"
              
            />
          </div>

          <div>
            <label >Scheduled At</label>
            <input
              type="datetime-local"
              value={newMeeting.scheduledAt?.slice(0, 16) || ''}
              onChange={e => setNewMeeting(p => ({ ...p, scheduledAt: e.target.value }))}
              
            />
          </div>

          <button
            onClick={handleCreateMeeting}
            disabled={!newMeeting.title}
            
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
    <div >
      {/* Header */}
      <div >
        <div>
          <h1 >Meeting Intelligence</h1>
          <p >Transcribe calls, extract BANT signals, draft follow-ups automatically</p>
        </div>
        <button
          onClick={() => setView('create')}
          
        >
          <Plus  />
          Schedule Meeting
        </button>
      </div>

      {/* Stats */}
      <div >
        {[
          { label: 'Total Meetings', value: stats.total, icon: Calendar, color: '#6366f1' },
          { label: 'Analysed', value: stats.complete, icon: Brain, color: '#10b981' },
          { label: 'Awaiting Recording', value: stats.pending, icon: Mic, color: '#f59e0b' },
          { label: 'A-Score Leads', value: stats.aScore, icon: Sparkles, color: '#10b981' },
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

      {/* Filter tabs */}
      <div >
        {(['all', 'discovery', 'demo', 'pilot_review', 'closing'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            
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
        <div >
          <Calendar  />
          <div >No meetings yet</div>
          <div >Schedule your first meeting to get started</div>
        </div>
      ) : (
        <div >
          {filteredMeetings.map((meeting) => {
            const typeCfg = MEETING_TYPE_CONFIG[meeting.meetingType];
            const statusCfg = meeting.processingStatus ? STATUS_CONFIG[meeting.processingStatus] : null;
            return (
              <motion.div
                key={meeting.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                
                onClick={() => { setSelectedMeeting(meeting); setView('detail'); }}
              >
                <div >
                  <div >
                    <div >
                      <span >{meeting.title}</span>
                      <span  style={{
                        background: typeCfg?.color + '15',
                        color: typeCfg?.color,
                      }}>
                        {typeCfg?.icon} {typeCfg?.label}
                      </span>
                      {meeting.bantScore && (
                        <span  style={{
                          background: BANT_SCORE_CONFIG[meeting.bantScore].bg,
                          color: BANT_SCORE_CONFIG[meeting.bantScore].color,
                        }}>
                          BANT {meeting.bantScore}
                        </span>
                      )}
                    </div>
                    {meeting.leadName && (
                      <div >{meeting.leadName}</div>
                    )}
                    <div >
                      <span >
                        <Calendar  />
                        {new Date(meeting.scheduledAt).toLocaleDateString()}
                      </span>
                      {meeting.transcript && (
                        <span >
                          <FileText  />
                          Transcript
                        </span>
                      )}
                      {meeting.summary && (
                        <span >
                          <Brain  />
                          AI Summary
                        </span>
                      )}
                    </div>
                  </div>

                  <div >
                    {statusCfg && (
                      <span  style={{ color: statusCfg.color }}>
                        {statusCfg.pulse && <Loader2  />}
                        {statusCfg.label}
                      </span>
                    )}
                    {!meeting.transcript && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedMeeting(meeting); setView('upload'); }}
                        
                      >
                        <Upload  />
                        Upload
                      </button>
                    )}
                    {meeting.transcript && meeting.processingStatus !== 'complete' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAnalyseMeeting(meeting); }}
                        disabled={processing[meeting.id!]}
                        
                      >
                        {processing[meeting.id!] ? <Loader2  /> : <Sparkles  />}
                        Analyse
                      </button>
                    )}
                    <ChevronRight  />
                  </div>
                </div>

                {/* Action items preview */}
                {meeting.actionItems && meeting.actionItems.length > 0 && (
                  <div >
                    {meeting.actionItems.slice(0, 2).map((item, i) => (
                      <span key={i} 
                        style={{ borderColor: 'var(--border)' }}>
                        {item.task}
                      </span>
                    ))}
                    {meeting.actionItems.length > 2 && (
                      <span >+{meeting.actionItems.length - 2} more</span>
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
