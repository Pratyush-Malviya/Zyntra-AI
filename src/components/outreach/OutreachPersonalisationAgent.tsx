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
    <div >
      {/* Top Banner */}
      <div >
        <div >
          <Sparkles  />
          <h3 >Outreach Personalisation Agent</h3>
        </div>
        <p >
          Paste a LinkedIn profile URL or enter prospect specifics. The B2B copywriter agent will generate 3 highly targeted, custom cold outreach templates (Problem-First, Insight-First, and Value-First variants).
        </p>
      </div>

      <div >
        {/* Scraper / Specs Form */}
        <div >
          <div >Prospect Inputs</div>

          <div>
            <label >LinkedIn Profile URL</label>
            <div >
              <div >
                <input
                  value={linkedinUrl}
                  onChange={e => setLinkedinUrl(e.target.value)}
                  placeholder="linkedin.com/in/username"
                  
                />
                <Linkedin  />
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
                
              >
                Auto Fill Profile
              </button>
            </div>
          </div>

          <div >
            {[
              { label: 'Prospect Name', key: 'prospectName', val: prospectName, set: setProspectName, placeholder: 'Sarah Jenkins' },
              { label: 'Company Name', key: 'companyName', val: companyName, set: setCompanyName, placeholder: 'Vanguard Wealth' },
              { label: 'Prospect Role', key: 'prospectRole', val: prospectRole, set: setProspectRole, placeholder: 'MD / Operations Lead' },
            ].map(({ label, placeholder, val, set }) => (
              <div key={label}>
                <label >{label}</label>
                <input
                  value={val}
                  onChange={e => set(e.target.value)}
                  placeholder={placeholder}
                  
                />
              </div>
            ))}

            <div>
              <label >ICP Segment</label>
              <select
                value={icpSegment}
                onChange={e => setIcpSegment(e.target.value)}
                
              >
                <option value="wealth_advisory">Wealth Advisory</option>
                <option value="hr">HR Consulting</option>
                <option value="ops">Operations</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div>
            <label >Personalisation Hook</label>
            <input
              value={personalisationHook}
              onChange={e => setPersonalisationHook(e.target.value)}
              placeholder="e.g. recent post about wealth compliance tech"
              
            />
          </div>

          <div>
            <label >Target Pain Point</label>
            <input
              value={painPoint}
              onChange={e => setPainPoint(e.target.value)}
              placeholder="e.g. manual CRM overhead"
              
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!prospectName || !companyName || loading}
            
          >
            {loading ? <Loader2  /> : <Sparkles  />}
            {loading ? 'Running AI Copywriter...' : 'Generate Personalized Emails'}
          </button>
        </div>

        {/* Variants Output */}
        <div >
          {variants ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
              {/* Tabs */}
              <div >
                {[
                  { id: 'A', label: 'Variant A: Problem-First' },
                  { id: 'B', label: 'Variant B: Insight-First' },
                  { id: 'C', label: 'Variant C: Direct Value' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as any)}
                    
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
              <div >
                <div>
                  <label >Subject</label>
                  <input
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    
                  />
                </div>

                <div >
                  <label >Body</label>
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    rows={12}
                    
                  />
                </div>
              </div>

              {/* Toolbar */}
              <div >
                <button
                  onClick={handleCopy}
                  
                >
                  {copied ? <CheckCircle2  /> : <Copy  />}
                  {copied ? 'Copied' : 'Copy Template'}
                </button>
                <button
                  onClick={handleQueue}
                  
                >
                  {queued ? <CheckCircle2  /> : <Mail  />}
                  {queued ? 'Queued' : 'Queue for Outbox'}
                </button>
              </div>
            </motion.div>
          ) : (
            <div >
              <Mail  />
              <div >No Emails Generated Yet</div>
              <p >
                Fill out the prospect details on the left, then click Generate to construct A/B/C outreach email variants.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
