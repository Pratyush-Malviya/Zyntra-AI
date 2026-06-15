import React, { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, Check, X, Edit, MessageSquare, Play, 
  Settings, Award, RefreshCw, BarChart2, CheckCircle2, ChevronRight, 
  HelpCircle, Volume2, ShieldAlert, Cpu, Layers, DollarSign, Calendar, Search, Eye, AlertCircle, FileText, Mail
} from 'lucide-react';
import { db, collection, getDocs, query, orderBy, auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleLocalFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error in Manager panel: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function ManagerWorkspacePanel({ 
  showToast,
  leads,
  campaigns
}: { 
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  leads: any[];
  campaigns: any[];
}) {
  const [activeTab, setActiveTab] = useState<'stats' | 'approvals' | 'coaching' | 'forecast' | 'audit'>('stats');

  // Generation log states
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'fallback'>('all');

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'generation_logs'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const fetchedLogs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(fetchedLogs);
    } catch (err: any) {
      console.error("Failed to load generation logs:", err);
      setLogs([]);
      showToast("Could not load generation logs list: " + err.message, "error");
      try {
        handleLocalFirestoreError(err, OperationType.LIST, 'generation_logs');
      } catch (innerErr) {
        // dynamic compliance propagation
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchLogs();
    }
  }, [activeTab]);

  // Stats / Activity Logs
  const [activityFeed, setActivityFeed] = useState([
    { id: 1, rep: 'John M (SDR)', action: 'added 25 new discovered leads', time: '5 mins ago', target: 'Staffing Outbound' },
    { id: 2, rep: 'Sarah K (AE)', action: 'moved SeedCo Deal to Active Engagement', time: '20 mins ago', target: '$45K Pipeline' },
    { id: 3, rep: 'John M (SDR)', action: 'submitted "FinTech Outbound" for Sequence Review', time: '1 hr ago', target: 'FinTech CFOs' },
    { id: 4, rep: 'David J (SDR)', action: 'dispatched 15 outreach emails to Caret team', time: '2 hrs ago', target: 'Staffing Outbound' },
  ]);

  // Sequence Approvals DB
  const [approvalsQueue, setApprovalsQueue] = useState([
    { 
      id: 'ap1', 
      sdr: 'John Miller (SDR)', 
      campaign: 'FinTech Outbound for CFOs', 
      channel: 'Email',
      draft: 'Subject: Outbound Recruiting efficiency validation - {{company}} analytics\n\nHi {{name}},\n\nI noticed TERAWORK has scaled its staffing department by 20% this quarter. Building specialized engineering pipelines usually drains 18+ hours. We help teams automate search.\n\nWould you be open to a quick 15-minute sync next Tuesday at 3 PM?',
      feedback: ''
    },
    { 
      id: 'ap2', 
      sdr: 'Sarah Cole (AE)', 
      campaign: 'High-Growth Tech Series A Expansion', 
      channel: 'LinkedIn InMail',
      draft: 'Hi {{name}}, congrats on the funding! I read caret is scaling rapidly. Checked your team layout. We have automated search workflows designed specifically for recruiting managers.\n\nLets connect briefly?',
      feedback: ''
    }
  ]);

  // Conversation Intelligence Call DB
  const [selectedCallId, setSelectedCallId] = useState<string | null>('c1');
  const [calls] = useState([
    { 
      id: 'c1', 
      rep: 'John Miller (SDR)', 
      prospect: 'Femi Taiwo (CEO, TERAWORK)', 
      date: 'Today, 10:15 AM', 
      score: 88, 
      talkRatio: { rep: 44, prospect: 56 }, 
      fillerWords: 5,
      transcript: [
        { speaker: 'Rep', text: 'Hi Femi, John here from Zyntra. I noticed TERAWORK is growing rapidly.' },
        { speaker: 'Prospect', text: 'Yes, we are indeed scaling our B2B tech recruiting sector.' },
        { speaker: 'Rep', text: 'Excellent. Our AI pipelines can accelerate matching times by up to 40%. How are you managing engineering vetting currently?' },
        { speaker: 'Prospect', text: 'Honestly, pricing is our main criteria right now. Traditional agencies are too expensive for our series-A margins.' },
        { speaker: 'Rep', text: 'Our credits system ensures you only pay for verified, locked contacts. It reduces traditional agency margins by over 70%.' },
      ],
      objections: ['Pricing standard limits', 'Competitor reference ( agencies)'],
      coachingNotes: 'Great objection handling on agency margins. Consider detailing platform safety protocols on the next call.'
    },
    { 
      id: 'c2', 
      rep: 'David Joost (AE)', 
      prospect: 'Oluwaseyi Agunbiade (Director, Caret)', 
      date: 'Yesterday, 4:32 PM', 
      score: 72, 
      talkRatio: { rep: 61, prospect: 39 }, 
      fillerWords: 14,
      transcript: [
        { speaker: 'Rep', text: 'Hello Oluwaseyi. I wanted to walk you through our entire AI pipeline capability dashboard.' },
        { speaker: 'Prospect', text: 'Okay, but do you support integration with HubSpot and Salesforce? We have a high-density pipeline already.' },
        { speaker: 'Rep', text: 'Let me share my screen. We can set up custom sync parameters...' }
      ],
      objections: ['HubSpot & Salesforce Integrations'],
      coachingNotes: 'Talk ratio is active-heavy (61% Rep). Allow the prospect more space to speak and outline their active CRM layouts.'
    }
  ]);

  // Manual Forecast Override Logs
  const [pipelineTarget, setPipelineTarget] = useState(150000);
  const [pipelineCurrent, setPipelineCurrent] = useState(115000);
  const [overrideValue, setOverrideValue] = useState('135000');
  const [overrideComment, setOverrideComment] = useState('');
  const [overrideHistory, setOverrideHistory] = useState([
    { id: 1, date: 'May 28', user: 'You (Manager)', type: 'Rollup Change', before: '$115,000', after: '$130,000', rationale: 'Adjusted Staffing Outbound cohort probability values based on client executive response scores.' }
  ]);

  const handleApprove = (id: string, name: string) => {
    setApprovalsQueue(approvalsQueue.filter(ap => ap.id !== id));
    showToast(`Sequence draft for ${name} successfully approved & deployed!`, 'success');
  };

  const handleReject = (id: string, name: string) => {
    const draft = approvalsQueue.find(ap => ap.id === id);
    if (!draft?.feedback) {
      showToast('Please add suggestions/feedback before rejecting!', 'warning');
      return;
    }
    setApprovalsQueue(approvalsQueue.filter(ap => ap.id !== id));
    showToast(`Rejected & returned draft to SDR. suggestions logged.`, 'info');
  };

  const handleApplyOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideValue || !overrideComment) {
      showToast('Rationale comment and projection override value required.', 'error');
      return;
    }
    const val = parseFloat(overrideValue);
    setPipelineCurrent(val);
    const log = {
      id: overrideHistory.length + 1,
      date: 'Today',
      user: 'You (Manager)',
      type: 'Manual Override',
      before: `$${pipelineCurrent.toLocaleString()}`,
      after: `$${val.toLocaleString()}`,
      rationale: overrideComment
    };
    setOverrideHistory([log, ...overrideHistory]);
    setOverrideComment('');
    showToast('CRM forecast override records committed to audit log!', 'success');
  };

  const activeCall = calls.find(c => c.id === selectedCallId) || calls[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Tab Select & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Manager Coaching & Analytics Workspace</h1>
          <p className="text-text-muted text-xs md:text-sm">Oversee pipeline metrics, approve sequences, and coach reps with AI intelligence.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#0c0d12]/80 border border-border rounded-xl">
          {[
            { id: 'stats', label: 'Team Dashboard', icon: BarChart2 },
            { id: 'approvals', label: 'Sequence Approval Queue', icon: CheckCircle2 },
            { id: 'coaching', label: 'AI Call Coaching', icon: MessageSquare },
            { id: 'forecast', label: 'Forecast Overrides', icon: TrendingUp },
            { id: 'audit', label: 'AI Response Audit Logs', icon: Cpu },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/25' 
                  : 'text-text-muted hover:text-text border border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'approvals' && approvalsQueue.length > 0 && (
                <span className="bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded-full text-[10px] ml-1 font-extrabold">{approvalsQueue.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* STATS & TEAM FEED VIEW */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Main KPI Boards */}
          <div className="md:col-span-3 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-surface border border-border rounded-2xl p-6 space-y-2">
                <div className="text-3xl font-syne font-bold text-teal-400">184 / 300</div>
                <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Team Outbound Dispatched</div>
                <div className="text-[10px] text-teal-400 font-semibold">61% Quota attainment</div>
              </div>
              <div className="bg-surface border border-border rounded-2xl p-6 space-y-2">
                <div className="text-3xl font-syne font-bold text-[#4da6ff]">18%</div>
                <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Average Reply Interest Weight</div>
                <div className="text-[10px] text-emerald-400 font-semibold">+4% from last month</div>
              </div>
              <div className="bg-surface border border-border rounded-2xl p-6 space-y-2">
                <div className="text-3xl font-syne font-bold text-[#a78bfa]">$135,000</div>
                <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Active Forecast Value</div>
                <div className="text-[10px] text-[#a78bfa] font-semibold">90% of Quota target</div>
              </div>
            </div>

            {/* Leaderboards */}
            <div className="bg-[#0c0d12]/70 border border-border rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">SDR Outbound Leaderboard</h3>
              <div className="space-y-4 text-xs">
                {[
                  { rep: 'John Miller', dials: '85', emails: '140', score: '92%', booked: 7, color: 'bg-teal-400' },
                  { rep: 'David Joost', dials: '62', emails: '115', score: '84%', booked: 5, color: 'bg-[#4da6ff]' },
                  { rep: 'Alice Vance', dials: '40', emails: '90', score: '78%', booked: 3, color: 'bg-purple-400' },
                ].map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/80">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-text-muted">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-white">{row.rep}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">{row.dials} dials / {row.emails} sequences</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-bold text-teal-400">{row.score}</div>
                        <div className="text-[9px] text-text-muted">Approval level</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white text-sm">{row.booked}</div>
                        <div className="text-[9px] text-text-muted">Booked Ops</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-1 bg-surface border border-border rounded-3xl p-6 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Rep Activity stream</h3>
            <div className="space-y-4">
              {activityFeed.map(feed => (
                <div key={feed.id} className="text-[11px] border-b border-border/60 pb-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-white">{feed.rep}</span>
                    <span className="text-[9px] text-text-muted font-medium italic shrink-0">{feed.time}</span>
                  </div>
                  <div className="text-text-muted mt-1 leading-snug">{feed.action}</div>
                  <div className="mt-1.5 text-[9px] font-bold text-teal-400 uppercase tracking-wider">{feed.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEQUENCE APPROVALS QUEUE VIEW */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-3xl p-6">
            {approvalsQueue.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-400 mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Approvals Queue Clear</h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto">SDRs have no drafts pending review. Automated AI sequences are deployed seamlessly.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {approvalsQueue.map(ap => (
                  <div key={ap.id} className="border border-border/80 rounded-2xl p-6 space-y-4 bg-[#0a0b10]">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-3 border-b border-border/60">
                      <div>
                        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Submitted by {ap.sdr}</div>
                        <h3 className="text-sm font-bold text-white mt-1">Campaign: {ap.campaign}</h3>
                      </div>
                      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[9px] px-2.5 py-1 rounded-full uppercase">
                        {ap.channel} OUTBOUND
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Active Copy Draft</label>
                      <textarea
                        value={ap.draft}
                        onChange={(e) => {
                          setApprovalsQueue(approvalsQueue.map(x => x.id === ap.id ? { ...x, draft: e.target.value } : x));
                        }}
                        rows={5}
                        className="w-full bg-surface border border-border rounded-xl p-4 text-xs font-mono text-white focus:border-brand outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Coaching Notes / Suggestions for Rejection</label>
                        <input
                          type="text"
                          value={ap.feedback}
                          onChange={(e) => {
                            setApprovalsQueue(approvalsQueue.map(x => x.id === ap.id ? { ...x, feedback: e.target.value } : x));
                          }}
                          placeholder="e.g. Include specific metrics. Reduce first sentence pitch length."
                          className="w-full bg-surface border border-border rounded-xl p-3 text-xs text-brand focus:border-brand outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 h-11">
                        <button
                          onClick={() => handleReject(ap.id, ap.campaign)}
                          className="bg-zinc-900 border border-border hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Reject Setup
                        </button>
                        <button
                          onClick={() => handleApprove(ap.id, ap.campaign)}
                          className="bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Check className="w-4 h-4" /> Approve Out
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONVERSATION COACHING INTEL VIEW */}
      {activeTab === 'coaching' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Recorded Coaching Logs</h3>
            <div className="flex flex-col gap-3">
              {calls.map(c => {
                const isSelected = selectedCallId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCallId(c.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-teal-500/15 border-teal-500/50 block' 
                        : 'bg-surface border-border hover:bg-surface-alt block'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] text-text-muted font-bold uppercase tracking-wider">
                      <span>{c.date}</span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        c.score >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'
                      }`}>AI Score: {c.score}</span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1.5 truncate">{c.prospect}</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Rep: {c.rep}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 bg-[#0c0d12]/70 border border-border p-6 rounded-3xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-3 border-b border-border/60">
              <div>
                <h3 className="text-sm font-bold text-white">Call Details: {activeCall.prospect}</h3>
                <div className="text-[10px] text-text-muted mt-0.5">Dialed reps: {activeCall.rep}</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm font-bold text-teal-400">{activeCall.talkRatio.rep}% / {activeCall.talkRatio.prospect}%</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">Talk-Listen Ratio</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">{activeCall.fillerWords}</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">Filler Words (Uh, Like)</div>
                </div>
              </div>
            </div>

            {/* Transcript pane */}
            <div className="space-y-3 bg-surface p-4 rounded-xl max-h-60 overflow-y-auto border border-border">
              {activeCall.transcript.map((line, idx) => (
                <div key={idx} className="text-xs leading-relaxed">
                  <span className={`font-bold uppercase tracking-wide mr-2 text-[10px] ${
                    line.speaker === 'Rep' ? 'text-teal-400' : 'text-purple-400'
                  }`}>{line.speaker}:</span>
                  <span className="text-gray-300">{line.text}</span>
                </div>
              ))}
            </div>

            {/* Coach Objections Map */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface/50 border border-border rounded-xl p-4 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Objections Flagged
                </h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeCall.objections.map((obj, idx) => (
                    <span key={idx} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-[9px] px-2 py-0.5 rounded">
                      {obj.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-surface/50 border border-border rounded-xl p-4 space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  AI Objections Battlecard Recommendation
                </h4>
                <p className="text-[10px] text-text-muted leading-relaxed font-semibold">
                  For pricing comparison objections, point out our credits calculator: "We are utility billed; agency fees are flat, billing you even for cold data."
                </p>
              </div>
            </div>

            <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-teal-400">Coaching Notes for Rep</div>
              <p className="text-xs text-text-muted mt-1 leading-normal italic">{activeCall.coachingNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* FORECAST & QUOTA MANAGEMENT VIEW */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">Manager Override Portal</h3>
                
                <form onSubmit={handleApplyOverride} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Team Target Quota ($)</label>
                    <input
                      type="number"
                      disabled
                      value={pipelineTarget}
                      className="w-full bg-surface-alt border border-border text-text-muted rounded-xl p-3 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Adjusted Forecast Commit ($)</label>
                    <input
                      type="number"
                      value={overrideValue}
                      onChange={e => setOverrideValue(e.target.value)}
                      className="w-full bg-surface-alt border border-border text-white focus:border-brand rounded-xl p-3 text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Required Audit rationale (Mandatory)</label>
                    <textarea
                      value={overrideComment}
                      onChange={e => setOverrideComment(e.target.value)}
                      placeholder="Indicate why this override is necessary e.g., CFO validated higher probability size of Staffel deals"
                      className="w-full bg-surface-alt border border-border text-white focus:border-brand rounded-xl p-3 text-xs h-20 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white py-3.5 rounded-xl font-bold text-xs"
                  >
                    Commit Manual Forecast Override
                  </button>
                </form>
              </div>

              {/* Audit history */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Audit Trail & Overrides History</h3>
                <div className="space-y-3 bg-[#0a0b10] border border-border p-4 rounded-2xl max-h-80 overflow-y-auto">
                  {overrideHistory.map(hist => (
                    <div key={hist.id} className="text-[10px] border-b border-border/40 pb-3 last:border-b-0">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-white">{hist.user}</span>
                        <span className="text-[9px] text-[#4da6ff] font-medium">{hist.date}</span>
                      </div>
                      <div className="text-[10.5px] mt-1.5 flex gap-2">
                        <span className="text-text-muted line-through">{hist.before}</span>
                        <span className="text-emerald-400 font-extrabold">&gt; {hist.after}</span>
                      </div>
                      <p className="text-[10px] text-text-muted mt-1 leading-relaxed font-semibold italic">Rationale: {hist.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI GENERATION AUDIT LOGS VIEW */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border/40">
              <div className="space-y-1">
                <h3 className="text-base font-bold font-syne text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  AI Response Generation & Audit Logs
                </h3>
                <p className="text-xs text-text-muted">
                  Audit precise AI-generated personalized outreach copy directly populated from live rest runs.
                </p>
              </div>
              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="px-4 py-2 bg-[#0c0d12] hover:bg-[#12131a] border border-border rounded-xl text-xs font-bold font-mono transition-all text-slate-300 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                {loadingLogs ? 'Refreshing...' : 'Refresh Logs'}
              </button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-4 bg-[#0a0b10] border border-border p-4 rounded-2xl">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-3.5" />
                <input
                  type="text"
                  placeholder="Search by lead name, company name, or campaign..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0c0d12] border border-border rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase text-text-muted tracking-wider">Status:</span>
                <div className="flex bg-[#0c0d12] border border-border rounded-xl p-0.5">
                  {(['all', 'success', 'fallback'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        statusFilter === status
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/25'
                          : 'text-text-muted hover:text-white border border-transparent'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Logs Table column */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-4">
                {loadingLogs ? (
                  <div className="text-center py-12 space-y-3">
                    <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                    <p className="text-xs text-text-muted">Querying Firestore 'generation_logs' collection...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-2xl space-y-2">
                    <AlertCircle className="w-8 h-8 text-text-muted mx-auto" />
                    <p className="text-xs text-text-muted">No generation logs found in database. Start generating messages to record audit logs!</p>
                  </div>
                ) : (
                  (() => {
                    const filtered = logs.filter(log => {
                      const matchesSearch = 
                        (log.leadName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (log.leadCompany || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (log.campaignName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                          <p className="text-xs text-text-muted">No logs matching search/filter terms.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border/60">
                        {filtered.map((log) => {
                          const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                          const formattedDate = dateObj ? dateObj.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';
                          const isSelected = selectedLog?.id === log.id;

                          return (
                            <div 
                              key={log.id}
                              onClick={() => setSelectedLog(log)}
                              className={`p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                isSelected 
                                  ? 'bg-purple-500/5 border-l-2 border-purple-500 pl-3.5' 
                                  : 'bg-[#0a0b10] hover:bg-[#0c0d12]/50'
                              }`}
                            >
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap text-left">
                                  <span className="text-xs font-bold text-white truncate max-w-[150px]">
                                    {log.leadName}
                                  </span>
                                  <span className="text-[10px] text-text-muted font-medium truncate max-w-[150px]">
                                    @{log.leadCompany}
                                  </span>
                                  <span className="text-[8px] font-mono bg-[#0c0d12] border border-border/60 px-1.5 py-0.5 rounded text-zinc-400 capitalize">
                                    {log.campaignName || 'Internal'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-text-muted text-left">
                                  <span>Rep: <strong className="text-zinc-300 font-semibold">{log.userName || 'System SDR'}</strong></span>
                                  <span>•</span>
                                  <span className="font-mono">{formattedDate}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                <span className={`text-[8px] font-extrabold px-2.5 py-1 rounded uppercase tracking-wider ${
                                  log.status === 'success' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}>
                                  {log.status === 'success' ? 'SUCCESS' : 'FALLBACK'}
                                </span>
                                <button className="p-1.5 hover:bg-[#0c0d12] border border-transparent hover:border-border rounded-lg text-text-muted hover:text-white transition-all cursor-pointer">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Single log details audit preview panel */}
              {selectedLog ? (
                <div className="lg:col-span-12 xl:col-span-5 bg-[#0a0b10]/80 border border-border rounded-2xl p-5 md:p-6 space-y-6 h-fit shrink-0 text-left">
                  <div className="border-b border-border/40 pb-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#a78bfa] bg-purple-500/10 border border-purple-500/25 px-2.5 py-1 rounded-md">
                          Audit Trail Details
                        </span>
                        <h4 className="text-sm font-bold text-white mt-3 font-syne truncate max-w-[200px]">
                          {selectedLog.leadName}
                        </h4>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          Generated on: {selectedLog.timestamp?.toDate ? selectedLog.timestamp.toDate().toLocaleString() : new Date(selectedLog.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedLog(null)}
                        className="px-2.5 py-1 text-[10px] font-bold text-text-muted hover:text-white border border-border/60 rounded-lg hover:bg-[#0c0d12] transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Channel selection output preview */}
                    {selectedLog.messages ? (
                      <div className="space-y-4 font-sans text-xs">
                        {/* Email */}
                        {(selectedLog.messages.email_subject || selectedLog.messages.email_body) && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-extrabold font-mono text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-blue-400" />
                              Email Outreach Body
                            </span>
                            <div className="bg-[#0c0d12] border border-border/60 rounded-xl p-3 space-y-2 text-slate-300 font-medium">
                              {selectedLog.messages.email_subject && (
                                <div className="border-b border-border/40 pb-1.5 mb-1.5">
                                  <strong className="text-text-muted text-[10px] mr-1 select-none">Subject:</strong> 
                                  <span className="text-white font-bold">{selectedLog.messages.email_subject}</span>
                                </div>
                              )}
                              <p className="whitespace-pre-wrap leading-relaxed text-[10.5px]">
                                {selectedLog.messages.email_body}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* LinkedIn Request */}
                        {selectedLog.messages.linkedin_connect && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-extrabold font-mono text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-indigo-400" />
                              LinkedIn Connection Intro Note
                            </span>
                            <div className="bg-[#0c0d12] border border-border/60 rounded-xl p-3 text-slate-300 font-medium whitespace-pre-wrap leading-relaxed text-[10.5px]">
                              {selectedLog.messages.linkedin_connect}
                            </div>
                          </div>
                        )}

                        {/* LinkedIn DM */}
                        {selectedLog.messages.linkedin_dm && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-extrabold font-mono text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                              LinkedIn DM Sequence Step
                            </span>
                            <div className="bg-[#0c0d12] border border-border/60 rounded-xl p-3 text-slate-300 font-medium whitespace-pre-wrap leading-relaxed text-[10.5px]">
                              {selectedLog.messages.linkedin_dm}
                            </div>
                          </div>
                        )}

                        {/* WhatsApp message */}
                        {selectedLog.messages.whatsapp && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-extrabold font-mono text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                              WhatsApp Quick Intro
                            </span>
                            <div className="bg-[#0c0d12] border border-border/60 rounded-xl p-3 text-slate-300 font-medium whitespace-pre-wrap leading-relaxed text-[10.5px]">
                              {selectedLog.messages.whatsapp}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-border rounded-xl">
                        <p className="text-xs text-text-muted">No generated messages associated. Check status failure notes.</p>
                      </div>
                    )}

                    {/* Rationale Failures */}
                    {selectedLog.error && (
                      <div className="p-3 bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs rounded-xl space-y-1">
                        <div className="font-extrabold text-[9px] tracking-widest uppercase flex items-center gap-1 text-rose-400">
                          <ShieldAlert className="w-4 h-4 text-rose-500" />
                          Failure Traceback Logs
                        </div>
                        <p className="font-mono text-[10px] break-all">
                          {selectedLog.error}
                        </p>
                      </div>
                    )}

                    {/* Compliance Checkbox */}
                    <div className="bg-[#0c0d12]/60 border border-border/80 rounded-xl p-3 space-y-2 text-[10px] text-text-muted font-mono leading-relaxed">
                      <div className="font-extrabold text-white uppercase text-[8px] tracking-wider flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-purple-400" />
                        Compliance Rationale
                      </div>
                      <p>
                        This audit trace complies with EU-GDPR and security logs constraints. Direct outreach is generated with organizational credentials.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-12 xl:col-span-5 border border-dashed border-border rounded-2xl p-8 text-center flex flex-col justify-center items-center gap-3 h-80">
                  <Cpu className="w-8 h-8 text-[#a78bfa]/40 animate-pulse" />
                  <p className="text-xs text-text-muted max-w-xs font-medium">
                    No log coordinates chosen. Select any generation entry on the left column to run the full copy audit.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
