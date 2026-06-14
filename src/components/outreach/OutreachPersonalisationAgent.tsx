import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Linkedin, Loader2, Send, Copy, CheckCircle2,
  AlertCircle, ChevronRight, ArrowRight, Edit3, Trash2, Mail
} from 'lucide-react';
import { runOutreachPersonalisationAgent } from '../../services/aiAgentService';
import type { EmailVariant } from '../../services/aiAgentService';

interface OutreachPersonalisationAgentProps {
  onQueueVariant: (variant: EmailVariant, label: string) => void;
  defaultLeadName?: string;
  defaultCompanyName?: string;
  defaultRole?: string;
}

export default function OutreachPersonalisationAgent({
  onQueueVariant,
  defaultLeadName = '',
  defaultCompanyName = '',
  defaultRole = ''
}: OutreachPersonalisationAgentProps) {
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [prospectName, setProspectName] = useState(defaultLeadName);
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [prospectRole, setProspectRole] = useState(defaultRole);
  const [icpSegment, setIcpSegment] = useState('wealth_advisory');
  const [personalisationHook, setPersonalisationHook] = useState('');
  const [painPoint, setPainPoint] = useState('');

  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<{
    variantA: EmailVariant;
    variantB: EmailVariant;
    variantC: EmailVariant;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'A' | 'B' | 'C'>('A');
  const [copied, setCopied] = useState(false);
  const [queued, setQueued] = useState<string | null>(null);

  // Edit states
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleGenerate = async () => {
    if (!prospectName || !companyName) return;
    setLoading(true);
    setVariants(null);
    setIsEditing(false);
    try {
      const result = await runOutreachPersonalisationAgent({
        prospectName,
        prospectRole: prospectRole || 'Decision Maker',
        companyName,
        icpSegment,
        personalisationHook: personalisationHook || 'Recent business expansion',
        painPoint: painPoint || 'Manual workflow overhead',
      });
      setVariants(result);
      setEditSubject(result.variantA.subject);
      setEditBody(result.variantA.body);
      setActiveTab('A');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'A' | 'B' | 'C') => {
    setActiveTab(tab);
    if (variants) {
      const v = tab === 'A' ? variants.variantA : tab === 'B' ? variants.variantB : variants.variantC;
      setEditSubject(v.subject);
      setEditBody(v.body);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${editSubject}\n\n${editBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQueue = () => {
    onQueueVariant({ subject: editSubject, body: editBody }, activeTab);
    setQueued(activeTab);
    setTimeout(() => setQueued(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="card p-5 border border-indigo-500/20 bg-indigo-500/5">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-text">Outreach Personalisation Agent</h3>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Paste a LinkedIn profile URL or enter prospect specifics. The B2B copywriter agent will generate 3 highly targeted, custom cold outreach templates (Problem-First, Insight-First, and Value-First variants).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Scraper / Specs Form */}
        <div className="card p-5 lg:col-span-5 space-y-4">
          <div className="text-xs font-bold text-text-secondary uppercase tracking-wider">Prospect Inputs</div>

          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 block">LinkedIn Profile URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={linkedinUrl}
                  onChange={e => setLinkedinUrl(e.target.value)}
                  placeholder="linkedin.com/in/username"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary"
                />
                <Linkedin className="absolute left-2.5 top-3.5 w-4 h-4 text-text-muted" />
              </div>
              <button
                onClick={() => {
                  // Simulate profile scraping
                  setProspectName('Sarah Jenkins');
                  setCompanyName('Vanguard Wealth');
                  setProspectRole('Managing Director');
                  setPersonalisationHook('your team\'s new client portal launch');
                  setPainPoint('spending 4 hours a day on operations admin');
                }}
                className="px-3 py-2.5 rounded-xl border border-border hover:border-indigo-400 text-xs font-semibold text-text-secondary hover:text-text transition-colors whitespace-nowrap"
              >
                Auto Fill Profile
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Prospect Name', key: 'prospectName', val: prospectName, set: setProspectName, placeholder: 'Sarah Jenkins' },
              { label: 'Company Name', key: 'companyName', val: companyName, set: setCompanyName, placeholder: 'Vanguard Wealth' },
              { label: 'Prospect Role', key: 'prospectRole', val: prospectRole, set: setProspectRole, placeholder: 'MD / Operations Lead' },
            ].map(({ label, placeholder, val, set }) => (
              <div key={label}>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 block">{label}</label>
                <input
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-xl text-xs focus:outline-none focus:border-primary"
                />
              </div>
            ))}

            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 block">ICP Segment</label>
              <select
                value={icpSegment}
                onChange={e => setIcpSegment(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-xl text-xs focus:outline-none focus:border-primary"
              >
                <option value="wealth_advisory">Wealth Advisory</option>
                <option value="hr">HR Consulting</option>
                <option value="ops">Operations</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 block">Personalisation Hook</label>
            <input
              value={personalisationHook}
              onChange={e => setPersonalisationHook(e.target.value)}
              placeholder="e.g. recent post about wealth compliance tech"
              className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-xl text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 block">Target Pain Point</label>
            <input
              value={painPoint}
              onChange={e => setPainPoint(e.target.value)}
              placeholder="e.g. manual CRM overhead"
              className="w-full px-3 py-2.5 bg-surface-elevated border border-border rounded-xl text-xs focus:outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!prospectName || !companyName || loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Running AI Copywriter...' : 'Generate Personalized Emails'}
          </button>
        </div>

        {/* Variants Output */}
        <div className="lg:col-span-7 flex flex-col min-h-[400px]">
          {variants ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5 flex-1 flex flex-col space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-border pb-2">
                {[
                  { id: 'A', label: 'Variant A: Problem-First' },
                  { id: 'B', label: 'Variant B: Insight-First' },
                  { id: 'C', label: 'Variant C: Direct Value' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as any)}
                    className="pb-2 px-2 text-xs font-semibold border-b-2 transition-all"
                    style={{
                      borderColor: activeTab === tab.id ? '#6366f1' : 'transparent',
                      color: activeTab === tab.id ? '#818cf8' : 'var(--text-secondary)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Template Body */}
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">Subject</label>
                  <input
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs font-semibold focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">Body</label>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={12}
                    className="w-full flex-1 px-3 py-2.5 bg-surface-elevated border border-border rounded-xl text-xs leading-relaxed focus:outline-none focus:border-primary resize-none font-mono"
                  />
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex gap-2 pt-4 border-t border-border/60">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs text-text-secondary hover:text-text transition-colors flex items-center justify-center gap-1.5"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy Template'}
                </button>
                <button
                  onClick={handleQueue}
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  {queued ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Mail className="w-4 h-4" />}
                  {queued ? 'Queued' : 'Queue for Outbox'}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="card border-dashed border-2 border-border flex flex-col items-center justify-center text-center p-12 flex-1">
              <Mail className="w-12 h-12 text-text-secondary opacity-30 mb-3" />
              <div className="text-sm font-semibold text-text">No Emails Generated Yet</div>
              <p className="text-xs text-text-secondary max-w-xs mt-1 leading-relaxed">
                Fill out the prospect details on the left, then click Generate to construct A/B/C outreach email variants.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
