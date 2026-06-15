import React, { useState } from 'react';
import { 
  Kanban, Sparkles, ShieldCheck, FileText, Send, Loader2,
  Trash2, PlusCircle, LayoutDashboard, Search, Filter, RefreshCw, 
  ChevronRight, Calendar, User, Briefcase, TrendingUp, AlertTriangle, Cpu
} from 'lucide-react';
import { generateOutreach } from '../services/aiService';

interface AEOpportunity {
  id: string;
  leadId?: string;
  title: string;
  leadName: string;
  company: string;
  value: number;
  stage: string;
  status: 'hot' | 'warm' | 'cold' | 'lost';
  score: number;
  reason: string;
}

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
  const [deals, setDeals] = useState<AEOpportunity[]>([
    { id: 'd1', title: 'TERAWORK Co-Founder Expansion', leadName: 'Femi Taiwo', company: 'TERAWORK', value: 45000, stage: 'qualification', status: 'hot', score: 85, reason: 'VP engaged + Pricing structure aligned with margin requirements.' },
    { id: 'd2', title: 'Caret Recruiting Workflows', leadName: 'Oluwaseyi Agunbiade', company: 'Caret', value: 85000, stage: 'demo', status: 'warm', score: 62, reason: 'Direct communication active with Director, but HubSpot integration verification is outstanding.' },
    { id: 'd3', title: 'TERAWORK Design Cohort', leadName: 'Omilade Olusegun', company: 'TERAWORK', value: 12000, stage: 'proposal', status: 'warm', score: 78, reason: 'Proposal delivered, creative directors indicated compliance, awaiting final signature.' },
    { id: 'd4', title: 'Enterprise staff licensing', leadName: 'Seyi Caret', company: 'Caret', value: 120000, stage: 'negotiation', status: 'cold', score: 35, reason: 'Single-threaded outreach, champion hasn\'t opened security brief in 14 days.' }
  ]);

  // Synchronize leads with "discovery_call" status promoted by SDRs into the AE's opportunity pipeline
  React.useEffect(() => {
    if (!leads || leads.length === 0) return;
    const discoveryLeads = leads.filter(l => l.status === 'discovery_call');
    if (discoveryLeads.length === 0) return;

    setDeals(prevDeals => {
      const newDeals = [...prevDeals];
      let didUpdate = false;

      discoveryLeads.forEach(lead => {
        const alreadyExists = prevDeals.some(d => d.leadId === lead.id || d.id === lead.id || d.title.includes(lead.name));
        if (!alreadyExists) {
          newDeals.push({
            id: lead.id || 'deal-l-' + Math.random().toString(36).substring(2, 9),
            leadId: lead.id,
            title: `${lead.company || lead.name} Outbound Opportunity`,
            leadName: lead.name,
            company: lead.company || 'Unknown Company',
            value: lead.score ? lead.score * 500 : 35000,
            stage: 'qualification',
            status: 'hot',
            score: lead.score || 75,
            reason: 'SDR outbound sequence completed. Target moved to Discovery stage. High scoring indicators tracked.'
          });
          didUpdate = true;
        }
      });

      if (didUpdate) {
        return newDeals;
      }
      return prevDeals;
    });
  }, [leads]);

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
    <div >
      {/* Header Tabs */}
      <div >
        <div >
          <h1 >AE Deal Workspace</h1>
          <p >Manage enterprise opportunities, review explainable deal scoring, and preparation dossiers.</p>
        </div>

        <div >
          {[
            { id: 'pipeline', label: 'Deal Pipeline Kanban', icon: Kanban },
            { id: 'copilot', label: 'AI Copilot CRM Assistant', icon: Sparkles },
            { id: 'briefs', label: 'Pre-Call Briefings', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              
            >
              <tab.icon  />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* DEAL PIPELINE KANBAN VIEW */}
      {activeTab === 'pipeline' && (
        <div >
          {/* Board columns */}
          <div >
            {['qualification', 'demo', 'proposal', 'negotiation'].map(col => {
              const colDeals = deals.filter(d => d.stage === col);
              return (
                <div 
                  key={col} 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col)}
                  
                >
                  <div >
                    <span >
                      {col === 'qualification' ? 'Qualify' : col === 'demo' ? 'Demo Scheduled' : col === 'proposal' ? 'Proposal' : 'Negotiate'}
                    </span>
                    <span >
                      {colDeals.length}
                    </span>
                  </div>

                  <div >
                    {colDeals.map(d => (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, d.id)}
                        onClick={() => setSelectedDealId(d.id)}
                        
                      >
                        <div >
                          <h4 >{d.title}</h4>
                          <span >{d.status.toUpperCase()}</span>
                        </div>
                        <div >{d.company}</div>
                        <div >
                          <span >${d.value.toLocaleString()}</span>
                          <span >Score: {d.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar drawer details */}
          <div >
            <h3 >AI Deal Health Analyzer</h3>
            
            <div >
              <div>
                <div >Selected Opportunity</div>
                <div >{activeDeal.title}</div>
                <div >{activeDeal.company}</div>
              </div>

              <div >
                <div >{activeDeal.score} / 100</div>
                <div >Explainable Deal Health Rating</div>
              </div>

              <div >
                <div >
                  <Cpu  />
                  AI Rationale & Risk Signals
                </div>
                <p >
                  "{activeDeal.reason}"
                </p>
              </div>

              <div >
                <button
                  onClick={() => showToast('Connecting to CRM synchronizer node...', 'info')}
                  
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
        <div >
          <div >
            <div >
              <Sparkles  />
              <span >Natural Query CRM AI Co-pilot</span>
            </div>
            <span >CONNECTED TO HUB</span>
          </div>

          {/* Chat message streams */}
          <div >
            {copilotChat.map((msg, idx) => {
              const isAi = msg.sender === 'AI Copilot';
              return (
                <div key={idx} >
                  <div >
                    <div >{msg.sender}</div>
                    <p >{msg.text}</p>
                  </div>
                </div>
              );
            })}
            {isCopilotLoading && (
              <div >
                <div >
                  <Loader2  />
                  <span >Querying synchronized databases...</span>
                </div>
              </div>
            )}
          </div>

          {/* Suggestion tags */}
          <div >
            {[
              'Show deal health analyzer metrics',
              'Summarize pipeline values for Caret',
              'List inactive high risk deals',
            ].map((tag, idx) => (
              <button
                key={idx}
                onClick={() => setCopilotMessage(tag)}
                
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Message input */}
          <form onSubmit={handleSendCopilot} >
            <input
              type="text"
              value={copilotMessage}
              onChange={e => setCopilotMessage(e.target.value)}
              placeholder="e.g., Query deals for TERAWORK or high-value pipeline metrics..."
              
            />
            <button
              type="submit"
              
            >
              <Send  />
            </button>
          </form>
        </div>
      )}

      {/* PRE-CALL BRIEFINGS VIEW */}
      {activeTab === 'briefs' && (
        <div >
          <div >
            <div >
              <label >Target Prospect Briefing Dossier</label>
              <select
                value={briefTarget}
                onChange={e => setBriefTarget(e.target.value)}
                
              >
                <option value="TERAWORK (Femi Taiwo)">TERAWORK — Femi Taiwo (CEO)</option>
                <option value="Caret (Oluwaseyi Agunbiade)">Caret — Oluwaseyi Agunbiade (Director)</option>
              </select>
            </div>
            <button
              onClick={handleGenerateBrief}
              
            >
              <Sparkles  />
              Compile Briefing Dossier
            </button>
          </div>

          <div >
            <div >
              <div >Meeting Target Objectives</div>
              <p >"{preCallBrief.objectives}"</p>
            </div>

            <div >
              <div >Company Intelligence & context</div>
              <p >"{preCallBrief.companyIntel}"</p>
            </div>

            <div >
              <div >Pre-Call Talking point blueprints</div>
              <p >"{preCallBrief.talkingPoints}"</p>
            </div>

            <div >
              <div >Expected Objections & playbooks</div>
              <p >"{preCallBrief.objections}"</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
