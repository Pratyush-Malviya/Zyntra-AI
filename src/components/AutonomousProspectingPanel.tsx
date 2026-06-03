import React, { useState, useEffect } from 'react';
import { Target, Cpu, Loader2, Database, ExternalLink, CheckCircle2, UserCheck, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface AutonomousProspectingPanelProps {
  leads: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export default function AutonomousProspectingPanel({ leads, showToast }: AutonomousProspectingPanelProps) {
  const [autonomousAgentStatus, setAutonomousAgentStatus] = useState<'running' | 'stopped'>('stopped');
  const [togglingAgent, setTogglingAgent] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/agents/autonomous-prospecting/status')
      .then(res => res.json())
      .then(data => setAutonomousAgentStatus(data.status))
      .catch(console.error);
  }, []);

  const toggleAutonomousAgent = async () => {
    setTogglingAgent(true);
    try {
      const endpoint = autonomousAgentStatus === 'running' 
        ? '/api/agents/autonomous-prospecting/stop' 
        : '/api/agents/autonomous-prospecting/start';
      
      const res = await fetch(endpoint, { method: 'POST' });
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
                <div className="text-2xl font-syne font-bold text-brand">{leads.length}</div>
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
              <span className="text-xs text-text-muted">{leads.length} records</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {leads.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50 py-12">
                  <Database className="w-12 h-12 text-text-muted" />
                  <div>
                    <p className="text-sm font-bold">No AI Generated Leads Yet</p>
                    <p className="text-xs text-text-muted mt-1">Start the agent to begin populating the pipeline.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {leads.map((lead, idx) => (
                    <motion.div 
                      key={lead.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-bg border border-border hover:border-brand/40 transition-all p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">{lead.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand font-bold uppercase">
                            Score: {lead.score || 0}
                          </span>
                        </div>
                        <div className="text-xs text-text-muted flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-slate-300">{lead.role}</span>
                          <span className="text-[10px] opacity-40">•</span>
                          <span>{lead.company}</span>
                          <span className="text-[10px] opacity-40">•</span>
                          <span>{lead.industry}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-text-muted">{lead.email}</span>
                          <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline flex items-center gap-1 mt-0.5">
                            LinkedIn Profile <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
