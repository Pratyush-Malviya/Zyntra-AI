import React, { useState } from 'react';
import { 
  List, Check, MapPin, User, Calendar, Briefcase, Zap, 
  MessageSquare, Mail, Phone, Clock, FileText, Sparkles, TrendingUp, HelpCircle,
  Plus, Minus, Edit2, CheckCircle2, Award, Flame, Target, Settings2, RefreshCw
} from 'lucide-react';

export function SdrWorkspacePanel({ 
  showToast
}: { 
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [activeTab, setActiveTab] = useState<'queue' | 'stats'>('queue');

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

  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [tempCallTarget, setTempCallTarget] = useState('50');
  const [tempEmailTarget, setTempEmailTarget] = useState('100');

  // Progress calculations
  const callPercentage = Math.min(100, Math.round((callActual / (callTarget || 1)) * 100));
  const emailPercentage = Math.min(100, Math.round((emailActual / (emailTarget || 1)) * 100));
  const isCallGoalMet = callActual >= callTarget;
  const isEmailGoalMet = emailActual >= emailTarget;
  const isAllGoalsMet = isCallGoalMet && isEmailGoalMet;

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
    setCallTarget(nextCall);
    setEmailTarget(nextEmail);
    setIsEditingTargets(false);
    showToast(`Targets recalibrated: Calls to ${nextCall}, Emails to ${nextEmail}`, 'success');
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

        <div className="flex items-center gap-1.5 p-1 bg-[#0c0d12]/80 border border-border rounded-xl">
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
        </div>
      </div>

      {/* DAILY ACTION QUEUE & GOAL TRACKER */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Tasks queue checklist */}
          <div className="lg:col-span-7 bg-surface border border-border rounded-3xl p-5 md:p-8 space-y-6">
            <div className="space-y-1 pb-4 border-b border-border/40">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f59e0b] bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">Queue List</span>
              <p className="text-xs text-text-muted mt-2">Check done status of target outbound prospects to auto-increment volume statistics.</p>
            </div>
            
            <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border/60">
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
                        <span className={`text-xs font-bold text-white ${task.done ? 'line-through text-text-muted' : ''}`}>
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
          <div className="lg:col-span-5 bg-surface border border-border rounded-3xl p-5 md:p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-syne uppercase tracking-wider leading-tight">Daily Goal Tracker</h3>
                    <p className="text-[10px] text-text-muted mt-0.5">Configure targets and record outbound volume</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setTempCallTarget(String(callTarget));
                    setTempEmailTarget(String(emailTarget));
                    setIsEditingTargets(!isEditingTargets);
                  }}
                  className="p-1.5 hover:bg-[#0c0d12] border border-transparent hover:border-border rounded-lg text-text-muted hover:text-white transition-colors cursor-pointer"
                  title="Recalibrate Targets"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Status Header Block */}
              {isAllGoalsMet ? (
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 flex items-center gap-3.5">
                  <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <Award className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-emerald-400">All Goals Satisfied! ✅</div>
                    <p className="text-[10px] text-zinc-400 leading-normal">Outbound campaign quotas matched. Perfect performance recorded.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0c0d12]/70 border border-border/60 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                      <Flame className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Daily Focus Active</div>
                      <p className="text-[10px] text-text-muted leading-relaxed">Increment calls and dispatches to maintain streak.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[#f59e0b]">{isCallGoalMet ? 1 : 0 + (isEmailGoalMet ? 1 : 0)} / 2</span>
                    <p className="text-[8px] text-zinc-600 font-extrabold uppercase tracking-widest mt-0.5">Goals Met</p>
                  </div>
                </div>
              )}

              {/* Adjust Target Forms */}
              {isEditingTargets && (
                <div className="bg-black/40 border border-[#f59e0b]/20 p-4 rounded-2xl space-y-4">
                  <div className="text-[10px] font-extrabold uppercase text-[#f59e0b] tracking-wider">Configure Daily Benchmarks</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Call Target</label>
                      <input 
                        type="number"
                        min="1"
                        value={tempCallTarget}
                        onChange={(e) => setTempCallTarget(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0a0b10] border border-border/80 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Email Target</label>
                      <input 
                        type="number"
                        min="1"
                        value={tempEmailTarget}
                        onChange={(e) => setTempEmailTarget(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0a0b10] border border-border/80 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveTargets}
                      className="flex-1 py-1.5 bg-[#f59e0b] hover:bg-amber-600 text-[#07080c] text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Save Settings
                    </button>
                    <button 
                      onClick={() => setIsEditingTargets(false)}
                      className="px-3 py-1.5 hover:bg-[#0c0d12] border border-border/60 text-text-muted hover:text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Targets Progress Section */}
              <div className="space-y-5">
                {/* 1. Calls Goal Progress */}
                <div className="p-4 bg-[#0a0b10] border border-border/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-amber-500/10 rounded-lg text-amber-500">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">Calls Handled</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-xs font-bold text-white">{callActual}</span>
                      <span className="text-[10px] text-text-muted">/ {callTarget}</span>
                      {isCallGoalMet && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-[#12131a] h-2 rounded-full overflow-hidden border border-border/40">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
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
                      className="flex-1 py-1.5 bg-[#0c0d12] hover:bg-[#12131a]/80 hover:text-white border border-border/60 hover:border-amber-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer text-center text-slate-300 flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      +1 Call
                    </button>
                    <button 
                      onClick={() => incrementCalls(5)}
                      className="px-2.5 py-1.5 bg-[#0c0d12] hover:bg-[#12131a]/80 text-text-muted hover:text-white border border-border/60 hover:border-amber-500/30 text-[10px] font-mono rounded-xl transition-all cursor-pointer"
                      title="Add 5 Calls"
                    >
                      +5
                    </button>
                    <button 
                      onClick={() => incrementCalls(-1)}
                      disabled={callActual <= 0}
                      className="p-1.5 bg-[#0c0d12] hover:bg-[#12131a]/80 disabled:opacity-40 border border-border/60 rounded-xl text-text-muted hover:text-white transition-colors cursor-pointer"
                      title="Decrease by 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. Emails Goal Progress */}
                <div className="p-4 bg-[#0a0b10] border border-border/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-[#40a9ff]/10 rounded-lg text-[#40a9ff]">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">Emails Sent</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-xs font-bold text-white">{emailActual}</span>
                      <span className="text-[10px] text-text-muted">/ {emailTarget}</span>
                      {isEmailGoalMet && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-1.5">
                    <div className="w-full bg-[#12131a] h-2 rounded-full overflow-hidden border border-border/40">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-[#40a9ff] rounded-full transition-all duration-500"
                        style={{ width: `${emailPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono text-text-muted">
                      <span>Progress Status</span>
                      <span className="font-bold text-[#40a9ff]">{emailPercentage}%</span>
                    </div>
                  </div>

                  {/* Increment / Decrement Controls */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button 
                      onClick={() => incrementEmails(1)}
                      className="flex-1 py-1.5 bg-[#0c0d12] hover:bg-[#12131a]/80 hover:text-white border border-border/60 hover:border-blue-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer text-center text-slate-300 flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-400" />
                      +1 Email
                    </button>
                    <button 
                      onClick={() => incrementEmails(5)}
                      className="px-2.5 py-1.5 bg-[#0c0d12] hover:bg-[#12131a]/80 text-text-muted hover:text-white border border-border/60 hover:border-blue-500/30 text-[10px] font-mono rounded-xl transition-all cursor-pointer"
                      title="Add 5 Emails"
                    >
                      +5
                    </button>
                    <button 
                      onClick={() => incrementEmails(-1)}
                      disabled={emailActual <= 0}
                      className="p-1.5 bg-[#0c0d12] hover:bg-[#12131a]/80 disabled:opacity-40 border border-border/60 rounded-xl text-text-muted hover:text-white transition-colors cursor-pointer"
                      title="Decrease by 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
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
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-2">
            <div className="text-3xl font-syne font-bold text-amber-400">142</div>
            <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Dials & Sequence Dispatches</div>
            <div className="text-[10px] text-emerald-400 font-semibold">+15% from campaign average</div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-2">
            <div className="text-3xl font-syne font-bold text-[#60a5fa]">26.4%</div>
            <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Personal Average Email Open rate</div>
            <div className="text-[10px] text-emerald-400 font-semibold">Above company target (20%)</div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-2">
            <div className="text-3xl font-syne font-bold text-[#a78bfa]">12</div>
            <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Meetings Booked this Month</div>
            <div className="text-[10px] text-amber-500 font-semibold font-syne">80% of personal quota</div>
          </div>
        </div>
      )}
    </div>
  );
}
