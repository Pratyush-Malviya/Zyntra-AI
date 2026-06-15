import React, { useState, useEffect } from 'react';
import { 
  List, Check, MapPin, User, Calendar, Briefcase, Zap, 
  MessageSquare, Mail, Phone, Clock, FileText, Sparkles, TrendingUp, HelpCircle,
  Plus, Minus, Edit2, CheckCircle2, Award, Flame, Target, Settings2, RefreshCw,
  Kanban, Layers, Search, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SdrCalendarView } from './SdrCalendarView';
import { db, collection, query, orderBy, onSnapshot, auth, doc, updateDoc } from '../firebase';

export function SdrWorkspacePanel({ 
  showToast,
  leads = [],
  campaigns = [],
  profile,
  user
}: { 
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  leads?: any[];
  campaigns?: any[];
  profile?: any;
  user?: any;
}) {
  const [activeTab, setActiveTab] = useState<'queue' | 'stats' | 'calendar' | 'leads_pipeline'>('queue');
  const [sdrViewType, setSdrViewType] = useState<'kanban' | 'list'>('kanban');
  const [sdrSearch, setSdrSearch] = useState('');
  const [sdrIndustryFilter, setSdrIndustryFilter] = useState('all');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [pulsingColumnId, setPulsingColumnId] = useState<string | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  const getLeadSdrStage = (lead: any) => {
    const status = lead.status;
    if (status === 'sent') return 'sent';
    if (status === 'failed') return 'failed';
    if (status === 'discovery_call') return 'discovery_call';
    return 'pending'; // default/imported
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    setUpdatingLeadId(leadId);
    try {
      const targetLead = (leads || []).find(l => l.id === leadId);
      if (!targetLead) return;

      // Update in Firestore
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, { status: newStatus });

      showToast(`Lead ${targetLead.name} status updated to ${newStatus === 'discovery_call' ? 'Discovery Call booked' : newStatus}`, 'success');

      // Automatically add deal in AE CRM pipeline
      if (newStatus === 'discovery_call') {
        try {
          const value = targetLead.score ? targetLead.score * 500 : 35000;
          const bodyPayload = {
            title: `${targetLead.company || targetLead.name} Outbound Opportunity`,
            value,
            stage: 'qualification',
            leadId: leadId
          };

          const response = await fetch('/api/deals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-org-id': profile?.orgId || 'org-default',
              'x-user-id': user?.uid || 'user-default',
              'x-user-role': 'manager'
            },
            body: JSON.stringify(bodyPayload)
          });

          if (response.ok) {
            showToast(`🚀 Automatically promoted opportunity to Account Executive Kanban!`, 'success');
          } else {
            console.error("Failed to REST POST sync the opportunity:", await response.text());
          }
        } catch (err) {
          console.error("REST sync failed:", err);
        }
      }
    } catch (err: any) {
      console.error("Firestore update failed:", err);
      showToast("Unable to transition lead stage: " + err.message, "error");
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleLeadDragStart = (e: any, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedLeadId(id);
  };

  const handleLeadDragOver = (e: any, colId: string) => {
    e.preventDefault();
  };

  const handleLeadDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!id) return;

    setDraggedLeadId(null);
    setPulsingColumnId(targetStatus);
    setTimeout(() => setPulsingColumnId(null), 1200);

    const targetLead = (leads || []).find(l => l.id === id);
    if (!targetLead) return;

    const currentStage = getLeadSdrStage(targetLead);
    if (currentStage === targetStatus) return;

    // Convert 'pending' to 'pending', else use exact string
    const statusValue = targetStatus === 'pending' ? 'imported' : targetStatus;
    await handleUpdateLeadStatus(id, statusValue);
  };

  // Daily Tasks Queue Checklist database
  const [tasks, setTasks] = useState([
    { id: 1, type: 'email', name: 'Femi Taiwo', title: 'Co-founder/CEO, TERAWORK', reason: 'Prospect opened email draft 3x but has not replied.', status: 'unread', done: false },
    { id: 2, type: 'linkedin', name: 'Oluwaseyi Agunbiade', title: 'Director, Caret', reason: 'High intent firmographic match. Connect with a personalized intro note.', status: 'new', done: false },
    { id: 3, type: 'call', name: 'Omilade Olusegun', title: 'Creative Director, TERAWORK', reason: 'Prospect clicked the 20-minute demo CTA link.', status: 'important', done: false },
    { id: 4, type: 'email', name: 'Seyi Caret', title: 'Growth Lead, Caret', reason: 'Send follow-up details on pricing parameters.', status: 'unread', done: false }
  ]);

  // Daily Targets and Volume tracking
  const [callTarget, setCallTarget] = useState(50);
  const [emailTarget, setEmailTarget] = useState(100);
  const [callActual, setCallActual] = useState(18);
  const [emailActual, setEmailActual] = useState(42);

  // Daily Outreach Goal - AI-generated metrics state from 'generation_logs'
  const [aiTarget, setAiTarget] = useState(15);
  const [aiActual, setAiActual] = useState(0);
  const [loadingAiLogs, setLoadingAiLogs] = useState(false);

  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [tempCallTarget, setTempCallTarget] = useState('50');
  const [tempEmailTarget, setTempEmailTarget] = useState('100');
  const [tempAiTarget, setTempAiTarget] = useState('15');

  // Real-time listener for current day's AI-generated messages from 'generation_logs' collection
  useEffect(() => {
    let unsubscribe = () => {};
    setLoadingAiLogs(true);
    try {
      const q = query(collection(db, 'generation_logs'), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter logs generated today
        const todayLogs = fetchedLogs.filter((log: any) => {
          if (!log.timestamp) return false;
          let date: Date;
          if (typeof log.timestamp.toDate === 'function') {
            date = log.timestamp.toDate();
          } else if (log.timestamp instanceof Date) {
            date = log.timestamp;
          } else if (log.timestamp.seconds) {
            date = new Date(log.timestamp.seconds * 1000);
          } else {
            date = new Date(log.timestamp);
          }

          const today = new Date();
          return date.getDate() === today.getDate() &&
                 date.getMonth() === today.getMonth() &&
                 date.getFullYear() === today.getFullYear();
        });

        // Personal tracking matches user UID
        const currentUserLogs = auth.currentUser 
          ? todayLogs.filter((log: any) => log.userId === auth.currentUser?.uid)
          : todayLogs;

        setAiActual(currentUserLogs.length);
        setLoadingAiLogs(false);
      }, (error) => {
        console.error("Failed to query generation_logs collection in real-time:", error);
        setLoadingAiLogs(false);
      });
    } catch (err) {
      console.error("Firestore setup error on generation_logs stream query:", err);
      setLoadingAiLogs(false);
    }
    return () => unsubscribe();
  }, []);

  // Progress calculations
  const callPercentage = Math.min(100, Math.round((callActual / (callTarget || 1)) * 100));
  const emailPercentage = Math.min(100, Math.round((emailActual / (emailTarget || 1)) * 100));
  const aiPercentage = Math.min(100, Math.round((aiActual / (aiTarget || 1)) * 100));
  
  const isCallGoalMet = callActual >= callTarget;
  const isEmailGoalMet = emailActual >= emailTarget;
  const isAiGoalMet = aiActual >= aiTarget;
  const isAllGoalsMet = isCallGoalMet && isEmailGoalMet && isAiGoalMet;

  const aiRemaining = Math.max(0, aiTarget - aiActual);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    const task = tasks.find(t => t.id === id);
    if (task && !task.done) {
      showToast(`Action checked. Earned 15 prospecting points!`, 'success');
      // If task type is email, optionally increment actual email volume
      if (task.type === 'email') {
        setEmailActual(prev => {
          const next = prev + 1;
          if (next === emailTarget) {
            showToast(`🔥 Bravo! Daily email target of ${emailTarget} achieved!`, 'success');
          }
          return next;
        });
      } else if (task.type === 'call') {
        setCallActual(prev => {
          const next = prev + 1;
          if (next === callTarget) {
            showToast(`📞 Dynamic Focus met Call volumes standard of ${callTarget}!`, 'success');
          }
          return next;
        });
      }
    }
  };

  const handleSaveTargets = () => {
    const nextCall = Math.max(1, parseInt(tempCallTarget) || 50);
    const nextEmail = Math.max(1, parseInt(tempEmailTarget) || 100);
    const nextAi = Math.max(1, parseInt(tempAiTarget) || 15);
    setCallTarget(nextCall);
    setEmailTarget(nextEmail);
    setAiTarget(nextAi);
    setIsEditingTargets(false);
    showToast(`Targets recalibrated: Calls to ${nextCall}, Emails to ${nextEmail}, AI Messages to ${nextAi}`, 'success');
  };

  const incrementCalls = (amt: number) => {
    setCallActual(prev => {
      const next = Math.max(0, prev + amt);
      if (next >= callTarget && prev < callTarget) {
        showToast(`🎉 Milestone reached: Call target of ${callTarget} fulfilled!`, 'success');
      }
      return next;
    });
  };

  const incrementEmails = (amt: number) => {
    setEmailActual(prev => {
      const next = Math.max(0, prev + amt);
      if (next >= emailTarget && prev < emailTarget) {
        showToast(`📬 Milestone reached: Email campaign target of ${emailTarget} achieved!`, 'success');
      }
      return next;
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Personal SDR Hub & Queue</h1>
          <p className="text-text-muted text-xs md:text-sm">Manage daily outbound interactions, review high-priority activities, and track personal metrics.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 border border-border rounded-xl">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'queue' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' 
                : 'text-text-muted hover:text-text border border-transparent'
            }`}
          >
            <List className="w-4 h-4" />
            Daily Action Item Queue
            {tasks.filter(t => !t.done).length > 0 && (
              <span className="bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full text-[10px] ml-1 font-extrabold">
                {tasks.filter(t => !t.done).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'calendar' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' 
                : 'text-text-muted hover:text-text border border-transparent'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Outbound Calendar
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stats' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' 
                : 'text-text-muted hover:text-text border border-transparent'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Personal Outbound Metrics
          </button>
          <button
            onClick={() => setActiveTab('leads_pipeline')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'leads_pipeline' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' 
                : 'text-text-muted hover:text-text border border-transparent'
            }`}
          >
            <Layers className="w-4 h-4" />
            SDR Lead Pipeline
          </button>
        </div>
      </div>

      {/* DAILY ACTION QUEUE & GOAL TRACKER */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Tasks queue checklist */}
          <div className="lg:col-span-7 bg-surface border border-border rounded-xl p-5 md:p-8 space-y-6">
            <div className="space-y-1 pb-4 border-b border-border/40">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">Queue List</span>
              <p className="text-xs text-text-muted mt-2">Check done status of target outbound prospects to auto-increment volume statistics.</p>
            </div>
            
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/60">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  className={`p-5 flex flex-col sm:flex-row items-start justify-between gap-4 transition-colors ${
                    task.done ? 'bg-[#0c0d12]/20 opacity-60' : 'bg-[#0a0b10]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        task.done 
                          ? 'bg-amber-500 border-amber-400 text-[#07080c]' 
                          : 'border-border hover:border-amber-500/50 bg-[#0c0d12]'
                      }`}
                    >
                      {task.done && <Check className="w-4 h-4" />}
                    </button>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold text-text${task.done ? 'line-through text-text-muted' : ''}`}>
                          {task.name}
                        </span>
                        <span className="text-[10px] text-text-muted font-medium">{task.title}</span>
                      </div>
                      <div className="text-xs text-text-muted leading-relaxed font-semibold">
                        Reason: "{task.reason}"
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className={`text-[8px] font-extrabold px-2.5 py-1 rounded border uppercase tracking-wider ${
                      task.type === 'email' ? 'bg-[#40a9ff]/10 text-[#40a9ff] border-[#40a9ff]/20' : 
                      task.type === 'linkedin' ? 'bg-[#0a66c2]/10 text-[#0a66c2] border-[#0a66c2]/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {task.type} Campaign
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Daily Goal Tracker bento card */}
          <div className="lg:col-span-5 bg-surface border border-border rounded-xl p-5 md:p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text font-syne uppercase tracking-wider leading-tight">Daily Goal Tracker</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Configure targets and record outbound volume</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setTempCallTarget(String(callTarget));
                    setTempEmailTarget(String(emailTarget));
                    setTempAiTarget(String(aiTarget));
                    setIsEditingTargets(!isEditingTargets);
                  }}
                  className="p-1.5 hover:bg-[#0c0d12] border border-transparent hover:border-border rounded-xl text-text-muted hover:text-white transition-colors cursor-pointer"
                  title="Recalibrate Targets"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status Header Block */}
              {isAllGoalsMet ? (
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4 flex items-center gap-3.5">
                  <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <Award className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-emerald-400">All Goals Satisfied! ✅</div>
                    <p className="text-[10px] text-zinc-400 leading-normal">Outbound campaign quotas matched. Perfect performance recorded.</p>
                  </div>
                </div>
              ) : (
                <div className="border border-border/60 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                      <Flame className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text">Daily Focus Active</div>
                      <p className="text-[10px] text-text-muted leading-relaxed">Increment calls and dispatches to maintain streak.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold">{(isCallGoalMet ? 1 : 0) + (isEmailGoalMet ? 1 : 0) + (isAiGoalMet ? 1 : 0)} / 3</span>
                    <p className="text-[8px] text-zinc-600 font-extrabold uppercase tracking-widest mt-0.5">Goals Met</p>
                  </div>
                </div>
              )}

              {/* Adjust Target Forms */}
              {isEditingTargets && (
                <div className="bg-black/40 border p-4 rounded-xl space-y-4">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider">Configure Daily Benchmarks</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Call Target</label>
                      <input 
                        type="number"
                        min="1"
                        value={tempCallTarget}
                        onChange={(e) => setTempCallTarget(e.target.value)}
                        className="w-full px-3 py-2 border border-border/80 rounded-xl text-xs font-mono text-text focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Email Target</label>
                      <input 
                        type="number"
                        min="1"
                        value={tempEmailTarget}
                        onChange={(e) => setTempEmailTarget(e.target.value)}
                        className="w-full px-3 py-2 border border-border/80 rounded-xl text-xs font-mono text-text focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">AI Target</label>
                      <input 
                        type="number"
                        min="1"
                        value={tempAiTarget}
                        onChange={(e) => setTempAiTarget(e.target.value)}
                        className="w-full px-3 py-2 border border-border/80 rounded-xl text-xs font-mono text-text focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveTargets}
                      className="flex-1 py-1.5 hover:bg-amber-600 text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Save Settings
                    </button>
                    <button 
                      onClick={() => setIsEditingTargets(false)}
                      className="px-3 py-1.5 hover:bg-[#0c0d12] border border-border/60 text-text-muted hover:text-white text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Targets Progress Section */}
              <div className="space-y-5">
                {/* 1. Calls Goal Progress */}
                <div className="p-4 border border-border/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-amber-500/10 rounded-xl text-amber-500">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-text">Calls Handled</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-xs font-bold text-text">{callActual}</span>
                      <span className="text-[10px] text-text-muted">/ {callTarget}</span>
                      {isCallGoalMet && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 rounded-full overflow-hidden border border-border/40">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${callPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono text-text-muted">
                      <span>Progress Status</span>
                      <span className="font-bold text-amber-400">{callPercentage}%</span>
                    </div>
                  </div>

                  {/* Increment / Decrement Controls */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button 
                      onClick={() => incrementCalls(1)}
                      className="flex-1 py-1.5 hover:bg-[#12131a]/80 hover:text-white border border-border/60 hover:border-amber-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer text-center text-text flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      +1 Call
                    </button>
                    <button 
                      onClick={() => incrementCalls(5)}
                      className="px-2.5 py-1.5 hover:bg-[#12131a]/80 text-text-muted hover:text-white border border-border/60 hover:border-amber-500/30 text-[10px] font-mono rounded-xl transition-all cursor-pointer"
                      title="Add 5 Calls"
                    >
                      +5
                    </button>
                    <button 
                      onClick={() => incrementCalls(-1)}
                      disabled={callActual <= 0}
                      className="p-1.5 hover:bg-[#12131a]/80 disabled:opacity-40 border border-border/60 rounded-xl text-text-muted hover:text-white transition-colors cursor-pointer"
                      title="Decrease by 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. Emails Goal Progress */}
                <div className="p-4 border border-border/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-xl">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-text">Emails Sent</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-xs font-bold text-text">{emailActual}</span>
                      <span className="text-[10px] text-text-muted">/ {emailTarget}</span>
                      {isEmailGoalMet && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 rounded-full overflow-hidden border border-border/40">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${emailPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono text-text-muted">
                      <span>Progress Status</span>
                      <span className="font-bold">{emailPercentage}%</span>
                    </div>
                  </div>

                  {/* Increment / Decrement Controls */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button 
                      onClick={() => incrementEmails(1)}
                      className="flex-1 py-1.5 hover:bg-[#12131a]/80 hover:text-white border border-border/60 hover:border-blue-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer text-center text-text flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" />
                      +1 Email
                    </button>
                    <button 
                      onClick={() => incrementEmails(5)}
                      className="px-2.5 py-1.5 hover:bg-[#12131a]/80 text-text-muted hover:text-white border border-border/60 hover:border-blue-500/30 text-[10px] font-mono rounded-xl transition-all cursor-pointer"
                      title="Add 5 Emails"
                    >
                      +5
                    </button>
                    <button 
                      onClick={() => incrementEmails(-1)}
                      disabled={emailActual <= 0}
                      className="p-1.5 hover:bg-[#12131a]/80 disabled:opacity-40 border border-border/60 rounded-xl text-text-muted hover:text-white transition-colors cursor-pointer"
                      title="Decrease by 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3. Daily Outreach Goal Progress (AI-Generated Messages from Firestore) */}
                <div className="p-4 border border-border/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-xl">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-text">AI Outreach Dispatches</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      {loadingAiLogs ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <span className="text-xs font-bold text-text">{aiActual}</span>
                      )}
                      <span className="text-[10px] text-text-muted">/ {aiTarget}</span>
                      {isAiGoalMet && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 rounded-full overflow-hidden border border-border/40">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${aiPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono text-text-muted">
                      <span>{aiRemaining > 0 ? `${aiRemaining} messages left to meet daily outreach quota` : "🔥 Outbound quota complete!"}</span>
                      <span className="font-bold">{aiPercentage}%</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Metrics Sync status */}
            <div className="pt-4 border-t border-border/40 flex items-center justify-between text-[9px] text-text-muted font-mono leading-none">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Hub Sync Active
              </span>
              <button 
                onClick={() => {
                  setCallActual(18);
                  setEmailActual(42);
                  showToast("Demonstration numbers re-seeded to baseline coordinates", "info");
                }}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Baseline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERSONAL OUTBOUND METRICS */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-surface border border-border rounded-xl p-6 space-y-2">
            <div className="text-3xl font-syne font-bold text-amber-400">142</div>
            <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Dials & Sequence Dispatches</div>
            <div className="text-[10px] text-emerald-400 font-semibold">+15% from campaign average</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-6 space-y-2">
            <div className="text-3xl font-syne font-bold">26.4%</div>
            <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Personal Average Email Open rate</div>
            <div className="text-[10px] text-emerald-400 font-semibold">Above company target (20%)</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-6 space-y-2">
            <div className="text-3xl font-syne font-bold">12</div>
            <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Meetings Booked this Month</div>
            <div className="text-[10px] text-amber-500 font-semibold font-syne">80% of personal quota</div>
          </div>
        </div>
      )}

      {/* OUTBOUND CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <SdrCalendarView 
          leads={leads}
          campaigns={campaigns}
          showToast={showToast}
        />
      )}

      {/* SDR LEAD PIPELINE VIEW */}
      {activeTab === 'leads_pipeline' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border border-border p-4 rounded-xl">
            {/* Search/Filter Inputs */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search lead or company..."
                  value={sdrSearch}
                  onChange={(e) => setSdrSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-xs text-text placeholder-text-muted focus:outline-none focus:border-amber-400"
                />
              </div>

              <select
                value={sdrIndustryFilter}
                onChange={(e) => setSdrIndustryFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-xl text-xs text-text focus:outline-none focus:border-amber-400"
              >
                <option value="all">All Industries</option>
                {Array.from(new Set((leads || []).map(l => l.industry).filter(Boolean))).map((ind: any) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* View Toggle button (Kanban or List) */}
            <div className="flex items-center gap-1.5 p-1 border border-border rounded-xl self-end md:self-auto">
              <button
                onClick={() => setSdrViewType('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  sdrViewType === 'kanban'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-text-muted hover:text-text border border-transparent'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                Kanban
              </button>
              <button
                onClick={() => setSdrViewType('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  sdrViewType === 'list'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-text-muted hover:text-text border border-transparent'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                List View
              </button>
            </div>
          </div>

          {/* Render Filters outcome count */}
          {leads && (
            <p className="text-[10px] text-text-muted uppercase font-mono tracking-widest pl-1">
              Active Selection &bull; {
                (leads || []).filter(lead => {
                  const matchSearch = lead.name?.toLowerCase().includes(sdrSearch.toLowerCase()) || 
                                      lead.company?.toLowerCase().includes(sdrSearch.toLowerCase());
                  const matchInd = sdrIndustryFilter === 'all' || lead.industry === sdrIndustryFilter;
                  return matchSearch && matchInd;
                }).length
              } outbound leads registered
            </p>
          )}

          {/* KANBAN VIEW CONFIG */}
          {sdrViewType === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {[
                { id: 'pending', name: 'Prospect Pool', color: 'border-amber-500/30 text-amber-400 bg-amber-500/5' },
                { id: 'sent', name: 'Outreach Contacting', color: 'border-blue-500/30 text-blue-400 bg-blue-500/5' },
                { id: 'failed', name: 'Outreach Failed / Bounced', color: 'border-red-500/30 text-[#ef4444] bg-red-500/5' },
                { id: 'discovery_call', name: 'Discovery Call Booked', color: 'border-emerald-500/40 text-[#10b981] bg-emerald-500/5' }
              ].map(col => {
                const colLeads = (leads || []).filter(lead => {
                  const stage = getLeadSdrStage(lead);
                  if (stage !== col.id) return false;
                  
                  const matchSearch = lead.name?.toLowerCase().includes(sdrSearch.toLowerCase()) || 
                                      lead.company?.toLowerCase().includes(sdrSearch.toLowerCase());
                  const matchInd = sdrIndustryFilter === 'all' || lead.industry === sdrIndustryFilter;
                  return matchSearch && matchInd;
                });

                const isPulsing = pulsingColumnId === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => handleLeadDragOver(e, col.id)}
                    onDrop={(e) => handleLeadDrop(e, col.id)}
                    className={`rounded-2xl border bg-[#0b0c11]/85 p-4 min-h-[460px] flex flex-col gap-3 transition-all duration-300 ${
                      isPulsing 
                        ? 'border-amber-400/80 bg-amber-400/5 scale-[1.01] shadow-lg' 
                        : 'border-border/80'
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between border-b border-border pb-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          col.id === 'pending' ? 'bg-amber-400' :
                          col.id === 'sent' ? 'bg-blue-400' :
                          col.id === 'failed' ? 'bg-red-400' : 'bg-emerald-400'
                        } ${isPulsing ? 'animate-ping' : ''}`} />
                        <span className="font-bold text-[10px] uppercase text-text tracking-wider">
                          {col.name}
                        </span>
                      </div>
                      <span className="border border-border text-[9px] px-2 py-0.5 rounded-xl font-bold text-text font-mono">
                        {colLeads.length}
                      </span>
                    </div>

                    {/* Column Body Container */}
                    <div className="flex-1 flex flex-col gap-3 pt-2">
                      <AnimatePresence mode="popLayout">
                        {colLeads.map(lead => (
                          <motion.div
                            key={lead.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            draggable
                            onDragStart={(e) => handleLeadDragStart(e as any, lead.id)}
                            className={`p-4 rounded-xl border text-left cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                              updatingLeadId === lead.id
                                ? 'bg-black/40 border-amber-500/40 opacity-40 animate-pulse'
                                : col.id === 'discovery_call'
                                ? 'bg-[#0f1d17]/50 border-emerald-500/20 hover:border-emerald-500/40'
                                : 'bg-surface border-border hover:bg-surface-alt hover:border-border/80'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-xs font-bold text-text leading-snug line-clamp-1">{lead.name}</h4>
                              <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                lead.score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                lead.score >= 60 ? 'bg-blue-500/10 text-[#40a9ff] border border-blue-500/20' :
                                'bg-[#8c8c8c]/10 text-text-muted border border-border'
                              }`}>
                                Score: {lead.score || 50}
                              </span>
                            </div>

                            <div className="text-[10px] text-text-muted mt-1 font-semibold">{lead.role} &bull; {lead.company}</div>

                            <div className="mt-3.5 space-y-1 p-2.5 rounded-xl border border-border/40 text-[9px]">
                              {lead.email && (
                                <div className="flex items-center gap-1.5 text-text-muted">
                                  <Mail className="w-3 h-3 text-amber-500/50 shrink-0" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-1.5 text-text-muted">
                                  <Phone className="w-3 h-3 text-amber-500/50 shrink-0" />
                                  <span>{lead.phone}</span>
                                </div>
                              )}
                              {lead.country && (
                                <div className="flex items-center gap-1.5 text-text-muted">
                                  <MapPin className="w-3 h-3 text-amber-500/50 shrink-0" />
                                  <span>{lead.country}</span>
                                </div>
                              )}
                            </div>

                            {/* Dropdown / Move stage quick selector to allow mobile / accessibility */}
                            <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-[10px]">
                              <span className="text-[9px] text-zinc-500 font-mono">Move to:</span>
                              <select
                                value={col.id}
                                disabled={updatingLeadId === lead.id}
                                onChange={(e) => {
                                  const targetVal = e.target.value;
                                  const statusValue = targetVal === 'pending' ? 'imported' : targetVal;
                                  handleUpdateLeadStatus(lead.id, statusValue);
                                }}
                                className="border border-border text-[9px] px-1.5 py-1 rounded-xl text-amber-400 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                              >
                                <option value="pending">Prospect Pool &bull; Cold</option>
                                <option value="sent">Campaign Contacting</option>
                                <option value="failed">Failed / Bounced</option>
                                <option value="discovery_call">🔥 Discovery Call Booked</option>
                              </select>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {colLeads.length === 0 && (
                        <div className="h-28 flex flex-col items-center justify-center border border-dashed border-border/60 rounded-xl text-center p-4">
                          <p className="text-[10px] text-zinc-650 font-bold uppercase tracking-wider">Empty stage</p>
                          <p className="text-[8px] text-text-muted mt-1">Drag prospects here to promote them.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW SYSTEM */
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] text-text-muted uppercase font-mono tracking-wider border-b border-border">
                    <tr>
                      <th className="p-4 font-bold">Contact Name</th>
                      <th className="p-4 font-bold">Job Role & Company</th>
                      <th className="p-4 font-bold">Industry / Country</th>
                      <th className="p-4 font-bold">AI Intent Score</th>
                      <th className="p-4 font-bold">Outbound Stage</th>
                      <th className="p-4 font-bold text-right text-text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-text">
                    {(leads || [])
                      .filter(lead => {
                        const matchSearch = lead.name?.toLowerCase().includes(sdrSearch.toLowerCase()) || 
                                            lead.company?.toLowerCase().includes(sdrSearch.toLowerCase());
                        const matchInd = sdrIndustryFilter === 'all' || lead.industry === sdrIndustryFilter;
                        return matchSearch && matchInd;
                      })
                      .map(lead => {
                        const currentStage = getLeadSdrStage(lead);
                        return (
                          <tr key={lead.id} className="hover:bg-surface-alt/70 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-text text-xs">{lead.name}</div>
                              <div className="text-[10px] text-text-muted mt-0.5">{lead.email}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-text text-xs font-semibold">{lead.role}</div>
                              <div className="text-[10px] text-text-muted mt-0.5">{lead.company}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-text font-medium">{lead.industry || 'Enterprise Client'}</div>
                              <div className="text-[10px] text-text-muted mt-0.5">{lead.country || 'Global'}</div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 font-mono font-bold text-xs ${
                                (lead.score || 50) >= 80 ? 'text-emerald-400' : (lead.score || 50) >= 60 ? 'text-amber-400' : 'text-zinc-500'
                              }`}>
                                <Zap className="w-3.5 h-3.5 opacity-60 text-amber-500" />
                                {lead.score || 50}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded tracking-wider border ${
                                currentStage === 'discovery_call' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                currentStage === 'sent' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                currentStage === 'failed' ? 'bg-rose-500/10 text-[#ef4444] border-rose-500/20' :
                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              }`}>
                                {currentStage === 'pending' ? 'Prospect Pool' : 
                                 currentStage === 'sent' ? 'Contacting' : 
                                 currentStage === 'failed' ? 'Failed' : '🔥 Discovery Call'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <select
                                value={currentStage}
                                disabled={updatingLeadId === lead.id}
                                onChange={(e) => {
                                  const targetVal = e.target.value;
                                  const statusValue = targetVal === 'pending' ? 'imported' : targetVal;
                                  handleUpdateLeadStatus(lead.id, statusValue);
                                }}
                                className="border border-border text-[10px] px-2 py-1.5 rounded-xl text-amber-400 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                              >
                                <option value="pending">Prospect Pool &bull; Cold</option>
                                <option value="sent">Contacting</option>
                                <option value="failed">Failed / Bounced</option>
                                <option value="discovery_call">🔥 Discovery Call</option>
                              </select>
                            </td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
