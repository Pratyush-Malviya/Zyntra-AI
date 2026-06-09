import React, { useState, useEffect } from 'react';
import { Target, Cpu, Loader2, Database, ExternalLink, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface AutonomousProspectingPanelProps {
  leads: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  currentCampaignId?: string;
}

export default function AutonomousProspectingPanel({ leads, showToast, currentCampaignId }: AutonomousProspectingPanelProps) {
  const [autonomousAgentStatus, setAutonomousAgentStatus] = useState<'running' | 'stopped'>('stopped');
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [fetchedLeads, setFetchedLeads] = useState<any[]>([]);
  const [icpIndustries, setIcpIndustries] = useState('SaaS, Fintech, AI');
  const [icpRoles, setIcpRoles] = useState('CEO, CTO, VP of RevOps');

  useEffect(() => {
    fetch('/api/agents/autonomous-prospecting/status')
      .then(res => res.json())
      .then(data => setAutonomousAgentStatus(data.status))
      .catch(console.error);

    const fetchGeneratedLeads = () => {
      fetch('/api/leads')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setFetchedLeads(data.filter(l => l.status === 'generated'));
          }
        })
        .catch(console.error);
    };

    fetchGeneratedLeads();
    const interval = setInterval(fetchGeneratedLeads, 3000);
    return () => clearInterval(interval);
  }, []);

  const displayLeads = fetchedLeads.length > 0 ? fetchedLeads : leads;

  const handleAddToLeadList = async (lead: any) => {
    try {
      await addDoc(collection(db, 'leads'), {
        ...lead,
        campaignId: currentCampaignId || 'camp-default',
        status: 'imported', // move from 'generated' to 'imported' to show in main pipeline
        createdAt: new Date().toISOString()
      });
      showToast(`${lead.name} added to your product lead list!`, 'success');
      
      // Remove from backend generated feed
      await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      setFetchedLeads(prev => prev.filter(l => l.id !== lead.id));
    } catch (err) {
      if (!auth.currentUser?.isAnonymous) console.error(err);
      showToast(`Failed to add lead: ${lead.name}`, 'error');
    }
  };

  const toggleAutonomousAgent = async () => {
    setTogglingAgent(true);
    try {
      const endpoint = autonomousAgentStatus === 'running' 
        ? '/api/agents/autonomous-prospecting/stop' 
        : '/api/agents/autonomous-prospecting/start';
      
      const res = await fetch(endpoint, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industries: icpIndustries.split(',').map(s => s.trim()).filter(Boolean),
          roles: icpRoles.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        setAutonomousAgentStatus(autonomousAgentStatus === 'running' ? 'stopped' : 'running');
        showToast(autonomousAgentStatus === 'running' ? 'Autonomous Agent stopped' : 'Autonomous Agent started!', 'success');
        setAgentLogs(prev => [`[${new Date().toLocaleTimeString()}] Autonomous Agent ${autonomousAgentStatus === 'running' ? 'stopped' : 'started'}`, ...prev]);
      } else {
        showToast('Failed to toggle agent state', 'error');
      }
    } catch (err) {
      showToast('Error toggling agent', 'error');
    } finally {
      setTogglingAgent(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Control Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-surface border border-border rounded-[24px] md:rounded-[32px] p-5 md:p-8 space-y-6 glow-brand/5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider">Autonomous Agent</h3>
                  <p className="text-[10px] text-text-muted mt-0.5">Background Engine</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                autonomousAgentStatus === 'running' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'bg-bg text-text-muted border-border'
              }`}>
                {autonomousAgentStatus === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />}
                {autonomousAgentStatus === 'running' ? 'ACTIVE' : 'IDLE'}
              </span>
            </div>
            
            <p className="text-xs text-text-muted leading-relaxed">
              Enable the background autonomous agent to continuously prospect target verticals and generate ideal leads for your campaigns using LLM intelligence. Data syncs directly to your workspace.
            </p>

            <div className="space-y-4 pb-2 border-t border-border pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Ideal Customer Profile: Industries</label>
                <input 
                  value={icpIndustries} 
                  onChange={e => setIcpIndustries(e.target.value)} 
                  disabled={autonomousAgentStatus === 'running'}
                  className="w-full bg-bg border border-border focus:border-brand rounded-xl p-3 text-sm outline-none transition-all placeholder:text-text-muted/50 disabled:opacity-50" 
                  placeholder="e.g. SaaS, Fintech"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Ideal Customer Profile: Roles</label>
                <input 
                  value={icpRoles} 
                  onChange={e => setIcpRoles(e.target.value)} 
                  disabled={autonomousAgentStatus === 'running'}
                  className="w-full bg-bg border border-border focus:border-brand rounded-xl p-3 text-sm outline-none transition-all placeholder:text-text-muted/50 disabled:opacity-50" 
                  placeholder="e.g. CEO, CTO"
                />
              </div>
            </div>

            <button
              onClick={toggleAutonomousAgent}
              disabled={togglingAgent}
              className={`w-full font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer shadow-xl ${
                autonomousAgentStatus === 'running' 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 shadow-red-500/10' 
                  : 'bg-gradient-to-r from-brand to-brand-alt text-white hover:opacity-90 shadow-brand/20 border border-brand/50'
              }`}
            >
              {togglingAgent ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : autonomousAgentStatus === 'running' ? (
                <>Stop Autonomous Prospecting</>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  Start Autonomous Prospecting
                </>
              )}
            </button>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="bg-bg border border-border p-4 rounded-2xl">
                <div className="text-2xl font-syne font-bold text-brand">{displayLeads.length}</div>
                <div className="text-[9px] uppercase tracking-widest font-bold text-text-muted mt-1">Leads Found</div>
              </div>
              <div className="bg-bg border border-border p-4 rounded-2xl">
                <div className="text-2xl font-syne font-bold text-emerald-400">15s</div>
                <div className="text-[9px] uppercase tracking-widest font-bold text-text-muted mt-1">Poll Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Generated Leads Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-[24px] md:rounded-[32px] p-5 md:p-8 space-y-6 h-full min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-brand" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Generated Leads Feed</h3>
              </div>
              <span className="text-xs text-text-muted">{displayLeads.length} records</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {displayLeads.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 py-12">
                  <Database className="w-12 h-12 text-text-muted" />
                  <div>
                    <p className="text-sm font-bold">No AI Generated Leads Yet</p>
                    <p className="text-xs text-text-muted mt-1">Start the agent to begin populating the pipeline.</p>
                  </div>
                </div>
              ) : (
                <div className="w-full overflow-x-auto rounded-xl border border-border custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-alt text-xs uppercase text-text-muted">
                      <tr>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Company</th>
                        <th className="px-4 py-3 font-medium">Industry</th>
                        <th className="px-4 py-3 font-medium text-center">Score</th>
                        <th className="px-4 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayLeads.map((lead, idx) => (
                        <tr key={lead.id || idx} className="hover:bg-brand/5 transition-colors">
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            {lead.name}
                            <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-alt" title="LinkedIn Profile">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-text-muted">{lead.role}</td>
                          <td className="px-4 py-3">{lead.company}</td>
                          <td className="px-4 py-3 text-text-muted">{lead.industry}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand font-bold uppercase">
                              {lead.score || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleAddToLeadList(lead)}
                              className="bg-surface-alt hover:bg-brand/20 text-brand border border-brand/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
