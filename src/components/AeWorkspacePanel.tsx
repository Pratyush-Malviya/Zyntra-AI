import React, { useState } from 'react';
import { 
  Kanban, Sparkles, ShieldCheck, FileText, Send, Loader2,
  Trash2, PlusCircle, LayoutDashboard, Search, Filter, RefreshCw, 
  ChevronRight, Calendar, User, Briefcase, TrendingUp, AlertTriangle, Cpu
} from 'lucide-react';
import { generateOutreach } from '../services/geminiService';

export function AeWorkspacePanel({ 
  showToast,
  leads,
  onGeneratePreCallBrief
}: { 
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  leads: any[];
  onGeneratePreCallBrief?: (leadName: string) => Promise<string>;
}) {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'copilot' | 'briefs'>('pipeline');

  // Interactive Deal Pipeline Board
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>('d1');
  const [deals, setDeals] = useState([
    { id: 'd1', title: 'TERAWORK Co-Founder Expansion', leadName: 'Femi Taiwo', company: 'TERAWORK', value: 45000, stage: 'qualification', status: 'hot', score: 85, reason: 'VP engaged + Pricing structure aligned with margin requirements.' },
    { id: 'd2', title: 'Caret Recruiting Workflows', leadName: 'Oluwaseyi Agunbiade', company: 'Caret', value: 85000, stage: 'demo', status: 'warm', score: 62, reason: 'Direct communication active with Director, but HubSpot integration verification is outstanding.' },
    { id: 'd3', title: 'TERAWORK Design Cohort', leadName: 'Omilade Olusegun', company: 'TERAWORK', value: 12000, stage: 'proposal', status: 'warm', score: 78, reason: 'Proposal delivered, creative directors indicated compliance, awaiting final signature.' },
    { id: 'd4', title: 'Enterprise staff licensing', leadName: 'Seyi Caret', company: 'Caret', value: 120000, stage: 'negotiation', status: 'cold', score: 35, reason: 'Single-threaded outreach, champion hasn\'t opened security brief in 14 days.' }
  ]);

  // AI Copilot CRM states
  const [copilotMessage, setCopilotMessage] = useState('');
  const [copilotChat, setCopilotChat] = useState([
    { sender: 'AI Copilot', text: 'Hello! I am your Zyntra CRM Co-pilot. Query me in plain English! Ask me about deal health, high-value pipelines, or pre-callTalking points.' }
  ]);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);

  // Pre-call brief states
  const [briefTarget, setBriefTarget] = useState('TERAWORK (Femi Taiwo)');
  const [preCallBrief, setPreCallBrief] = useState({
    objectives: 'Verify hiring headcount for the next quarter. Pitch the automated credit license instead of recruitment agencies.',
    objections: 'Economy pricing stability. They might suggest building in-house candidate trackers.',
    companyIntel: 'TERAWORK is an executive talent platform scaling across West Africa. They grew engineering staff by 22% last month.',
    talkingPoints: 'Highlight Zyntra reduces traditional recruitment overheads by 70%. Show how they can deploy lookalike ICP targeting immediately.'
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedDealId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    if (!draggedDealId) return;
    setDeals(deals.map(d => d.id === draggedDealId ? { ...d, stage: targetStage } : d));
    setDraggedDealId(null);
    showToast(`Saved deal stage update!`, 'success');
  };

  const activeDeal = deals.find(d => d.id === selectedDealId) || deals[0];

  // AI Copilot Keyword-Based response engine (Highly interactive!)
  const handleSendCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotMessage) return;

    const userQuery = copilotMessage;
    setCopilotChat(prev => [...prev, { sender: 'You', text: userQuery }]);
    setCopilotMessage('');
    setIsCopilotLoading(true);

    setTimeout(() => {
      let aiResponse = "I've analyzed your pipeline records. Could you please specify a company or metric, such as TERAWORK, Caret, or high-value deals?";

      const qLower = userQuery.toLowerCase();
      if (qLower.includes('terawork')) {
        aiResponse = "TERAWORK currently has 2 active opportunities valued at $57,000 collective pipeline. Femi Taiwo (CEO) has an AI Score of 85, displaying high engagement with outbound campaigns, specifically interest in pricing plans. I recommend preparing an overage top-up credit proposal.";
      } else if (qLower.includes('caret')) {
        aiResponse = "Caret has 2 opportunities totaling $205,000. Oluwaseyi Agunbiade is in the Demo Scheduled stage ($85,000 value), with deal health flagged at 62 due to outstanding CRM integration specs. The other deal ($120,000 value) in Negotiation is cold (Score 35) because of stale contact activity over 14 days.";
      } else if (qLower.includes('high') || qLower.includes('value') || qLower.includes('over')) {
        aiResponse = "The highest-value deal in your active AE pipeline is 'Enterprise staff licensing' for Caret, valued at $120,000. It is in the Negotiation stage but flagged as high-risk (Score 35) due to single-threaded communication. I recommend running an ICP lookalike prospecting search to map secondary champions.";
      } else if (qLower.includes('score') || qLower.includes('health')) {
        aiResponse = "Active pipeline average health is 65/100. Deal TERAWORK is lead (85), followed by TERAWORK cohort (78). Caret leads require attention: Oluwaseyi (62) is stalled, Seyi (35) is single-threaded and stalled.";
      }

      setCopilotChat(prev => [...prev, { sender: 'AI Copilot', text: aiResponse }]);
      setIsCopilotLoading(false);
    }, 1200);
  };

  const handleGenerateBrief = () => {
    showToast('AI Agent is summarizing customer news feeds...', 'info');
    setTimeout(() => {
      if (briefTarget.includes('TERAWORK')) {
        setPreCallBrief({
          objectives: 'Focus on scaling candidate search operations. Pitch 10-seat Org Administration and custom branding.',
          objections: 'Standard monthly seat quotas under $1500/mo.',
          companyIntel: 'TERAWORK has successfully raised Series-A. CEO Femi is hiring multi-talent designers and engineering coordinators.',
          talkingPoints: 'Pitch white-label CRM co-pilots. Emphasize integration with custom domain SPF wizards to prevent spam folds.'
        });
      } else {
        setPreCallBrief({
          objectives: 'Unlock CRM pipeline bottlenecks. Pitch the HubSpot integration node failover setup.',
          objections: 'API key security concerns.',
          companyIntel: 'Caret is a staffing provider managing digital workflows. They require robust sub-tenant configurations.',
          talkingPoints: 'Highlight Zyntras security ip restricted access controls. Pitch our SAML-2.0 automated directories.'
        });
      }
      showToast('AI Briefing Dossier Compiled!', 'success');
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight font-syne">AE Deal Workspace</h1>
          <p className="text-text-muted text-xs md:text-sm">Manage enterprise opportunities, review explainable deal scoring, and preparation dossiers.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#0c0d12]/80 border border-border rounded-xl">
          {[
            { id: 'pipeline', label: 'Deal Pipeline Kanban', icon: Kanban },
            { id: 'copilot', label: 'AI Copilot CRM Assistant', icon: Sparkles },
            { id: 'briefs', label: 'Pre-Call Briefings', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25' 
                  : 'text-text-muted hover:text-text border border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* DEAL PIPELINE KANBAN VIEW */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Board columns */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-4">
            {['qualification', 'demo', 'proposal', 'negotiation'].map(col => {
              const colDeals = deals.filter(d => d.stage === col);
              return (
                <div 
                  key={col} 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col)}
                  className="rounded-2xl border border-border bg-[#0b0c11]/80 p-4 min-h-[460px] flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
                    <span className="font-bold text-[10px] uppercase text-text-muted tracking-wider">
                      {col === 'qualification' ? 'Qualify' : col === 'demo' ? 'Demo Scheduled' : col === 'proposal' ? 'Proposal' : 'Negotiate'}
                    </span>
                    <span className="bg-[#0c0d12] border border-border text-[9px] px-1.5 py-0.5 rounded font-bold text-text-muted">
                      {colDeals.length}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-3">
                    {colDeals.map(d => (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, d.id)}
                        onClick={() => setSelectedDealId(d.id)}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedDealId === d.id 
                            ? 'bg-blue-500/10 border-blue-500/50 shadow-lg' 
                            : 'bg-surface border-border hover:bg-surface-alt'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">{d.title}</h4>
                          <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                            d.status === 'hot' ? 'bg-orange-500/10 text-orange-400' : d.status === 'warm' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                          }`}>{d.status.toUpperCase()}</span>
                        </div>
                        <div className="text-[10px] text-text-muted font-medium mt-1">{d.company}</div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs font-semibold text-white">${d.value.toLocaleString()}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0c0d12] border border-border ${
                            d.score >= 70 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>Score: {d.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar drawer details */}
          <div className="md:col-span-1 bg-surface border border-border rounded-3xl p-6 space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#60a5fa] border-b border-border/80 pb-2.5">AI Deal Health Analyzer</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Selected Opportunity</div>
                <div className="text-sm font-bold text-white mt-1">{activeDeal.title}</div>
                <div className="text-xs text-text-muted">{activeDeal.company}</div>
              </div>

              <div className="bg-[#0c0d12] border border-border rounded-2xl p-4 text-center space-y-1">
                <div className="text-2xl font-syne font-bold text-white">{activeDeal.score} / 100</div>
                <div className="text-[9px] text-[#60a5fa] font-extrabold uppercase tracking-wide">Explainable Deal Health Rating</div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" />
                  AI Rationale & Risk Signals
                </div>
                <p className="text-[10.5px] text-text-muted leading-relaxed font-semibold italic">
                  "{activeDeal.reason}"
                </p>
              </div>

              <div className="pt-3 border-t border-border/60">
                <button
                  onClick={() => showToast('Connecting to CRM synchronizer node...', 'info')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl text-xs transition-colors"
                >
                  Push Deal to HubSpot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI COPILOT CRM CHAT VIEW */}
      {activeTab === 'copilot' && (
        <div className="bg-surface border border-border rounded-3xl overflow-hidden min-h-[500px] flex flex-col">
          <div className="p-4 bg-surface-alt border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white font-syne uppercase">Natural Query CRM AI Co-pilot</span>
            </div>
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-extrabold px-2 py-0.5 rounded">CONNECTED TO HUB</span>
          </div>

          {/* Chat message streams */}
          <div className="flex-1 p-6 space-y-4 max-h-[350px] overflow-y-auto scrollbar-thin">
            {copilotChat.map((msg, idx) => {
              const isAi = msg.sender === 'AI Copilot';
              return (
                <div key={idx} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed ${
                    isAi ? 'bg-surface-alt text-gray-300 border border-border' : 'bg-blue-500 text-white'
                  }`}>
                    <div className="text-[9px] font-extrabold uppercase tracking-wide opacity-60 mb-1">{msg.sender}</div>
                    <p className="font-semibold">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            {isCopilotLoading && (
              <div className="flex justify-start">
                <div className="bg-surface-alt text-gray-300 border border-border p-4 rounded-2xl flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-[10px] font-bold text-text-muted">Querying synchronized databases...</span>
                </div>
              </div>
            )}
          </div>

          {/* Suggestion tags */}
          <div className="p-4 bg-surface border-t border-border/80 flex flex-wrap gap-2">
            {[
              'Show deal health analyzer metrics',
              'Summarize pipeline values for Caret',
              'List inactive high risk deals',
            ].map((tag, idx) => (
              <button
                key={idx}
                onClick={() => setCopilotMessage(tag)}
                className="bg-[#0b0c11] hover:bg-[#12131a] border border-border/80 text-[10px] text-text-muted hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Message input */}
          <form onSubmit={handleSendCopilot} className="p-4 border-t border-border flex gap-3">
            <input
              type="text"
              value={copilotMessage}
              onChange={e => setCopilotMessage(e.target.value)}
              placeholder="e.g., Query deals for TERAWORK or high-value pipeline metrics..."
              className="flex-1 bg-[#0c0d12] border border-border focus:border-blue-500/50 rounded-xl px-4 text-xs text-white outline-none"
            />
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center text-white"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        </div>
      )}

      {/* PRE-CALL BRIEFINGS VIEW */}
      {activeTab === 'briefs' && (
        <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-end justify-between gap-4 pb-4 border-b border-border/60">
            <div className="space-y-1.5 flex-1 w-full sm:w-auto">
              <label className="text-[9px] font-bold text-text-muted uppercase tracking-widestblock">Target Prospect Briefing Dossier</label>
              <select
                value={briefTarget}
                onChange={e => setBriefTarget(e.target.value)}
                className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs text-white"
              >
                <option value="TERAWORK (Femi Taiwo)">TERAWORK — Femi Taiwo (CEO)</option>
                <option value="Caret (Oluwaseyi Agunbiade)">Caret — Oluwaseyi Agunbiade (Director)</option>
              </select>
            </div>
            <button
              onClick={handleGenerateBrief}
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold h-11 px-6 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4.5 h-4.5" />
              Compile Briefing Dossier
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-[#0c0d12]/60 border border-border rounded-2xl p-6 space-y-2">
              <div className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest">Meeting Target Objectives</div>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold italic">"{preCallBrief.objectives}"</p>
            </div>

            <div className="bg-[#0c0d12]/60 border border-border rounded-2xl p-6 space-y-2">
              <div className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest">Company Intelligence & context</div>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold italic">"{preCallBrief.companyIntel}"</p>
            </div>

            <div className="bg-[#0c0d12]/60 border border-border rounded-2xl p-6 space-y-2">
              <div className="text-[10px] font-extrabold text-teal-400 uppercase tracking-widest">Pre-Call Talking point blueprints</div>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold italic">"{preCallBrief.talkingPoints}"</p>
            </div>

            <div className="bg-[#0c0d12]/60 border border-border rounded-2xl p-6 space-y-2">
              <div className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest">Expected Objections & playbooks</div>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold italic">"{preCallBrief.objections}"</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
