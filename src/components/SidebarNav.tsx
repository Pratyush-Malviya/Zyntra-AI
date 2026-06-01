import React from 'react';
import { 
  Globe, Plus, History, Target, LayoutDashboard, Settings, 
  Users, Zap, Eye, Download, TrendingUp, Activity, ShieldCheck, Mail, Linkedin, FileText, ChevronRight, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Role, usePermission } from '../lib/rbac';
// Removed invalid import

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  subLabel: string;
  isCollapsed: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon: Icon, label, subLabel, isCollapsed }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group text-left cursor-pointer border ${
      active 
        ? 'bg-brand/10 border-brand/20 shadow-[inset_0_0_20px_rgba(37,99,235,0.1)]' 
        : 'bg-transparent border-transparent hover:bg-bg-subtle hover:border-border-subtle'
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-lg ${
      active 
        ? 'bg-brand text-white shadow-brand/25' 
        : 'bg-surface border border-border text-text-muted group-hover:text-text group-hover:border-border-subtle shadow-black/20'
    } ${isCollapsed ? 'mx-auto' : ''}`}>
      <Icon className="w-5 h-5" />
    </div>
    {!isCollapsed && (
      <div className="overflow-hidden transition-all duration-300 block">
        <div className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-brand-alt' : 'text-text group-hover:text-brand'}`}>
          {label}
        </div>
        <div className={`text-[8px] uppercase tracking-widest ${active ? 'text-brand/80' : 'text-text-muted'}`}>
          {subLabel}
        </div>
      </div>
    )}
  </button>
);

interface SidebarNavProps {
  activeView: string;
  setActiveView: (view: any) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isMenuCollapsed: boolean;
  activeRole: Role;
  setResearchKey: React.Dispatch<React.SetStateAction<number>>;
  setCurrentCampaign: (c: any) => void;
  setActivePanel: (p: number) => void;
  currentCampaign: any;
  campaigns: any[];
  leads: any[];
  messages: any;
  generateProjectPDF: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeView, setActiveView, isMobileMenuOpen, setIsMobileMenuOpen, isMenuCollapsed, activeRole,
  setResearchKey, setCurrentCampaign, setActivePanel, currentCampaign, campaigns, leads, messages, generateProjectPDF, showToast
}) => {
  const can = usePermission(activeRole);
  
  // Navigation visibility based on permissions
  const showIntelligence = can('leads', 'read') || activeRole === 'Org Admin' || activeRole === 'SDR';
  const showOutreach = can('outreach', 'read');
  const showJourneys = can('deals', 'read');
  const showAnalytics = can('analytics', 'read');
  const showSettings = can('settings', 'read') || activeRole === 'Integration User';
  const showTeamAdmin = can('users', 'read');
  const showSuperAdmin = activeRole === 'Org Admin';

  const _isCollapsed = isMobileMenuOpen ? false : isMenuCollapsed;

  return (
    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] scrollbar-thin">
      {showIntelligence && (
        <div>
          <NavButton 
            active={activeView === 'RESEARCH'} 
            onClick={() => { setActiveView('RESEARCH'); setIsMobileMenuOpen(false); }}
            icon={Globe}
            label="Intelligence"
            subLabel="Prospect Research"
            isCollapsed={_isCollapsed}
          />
          <AnimatePresence initial={false}>
            {activeView === 'RESEARCH' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={`overflow-hidden ml-5 pl-3 border-l border-brand/20 my-1 space-y-1 ${
                  _isCollapsed ? 'pl-0 ml-0 border-l-0' : ''
                }`}
              >
                {can('leads', 'write') && (
                  <button
                    onClick={() => {
                      setResearchKey(prev => prev + 1);
                      setActiveView('RESEARCH');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-text-muted hover:bg-bg-subtle hover:text-text transition-all cursor-pointer ${
                      _isCollapsed ? 'justify-center p-2' : ''
                    }`}
                    title="Launch New Intel Synthesis"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0 text-brand-alt" />
                    {!_isCollapsed && <span className="truncate font-semibold">New Deep-Dive</span>}
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveView('RESEARCH');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-brand bg-brand/10 font-bold hover:bg-brand/20 transition-all cursor-pointer ${
                    _isCollapsed ? 'justify-center p-2' : ''
                  }`}
                  title="Browse Saved Dossiers"
                >
                  <History className="w-3.5 h-3.5 shrink-0" />
                  {!_isCollapsed && <span className="truncate">Saved Dossiers</span>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {showOutreach && (
        <div>
          <NavButton 
            active={activeView === 'OUTREACH'} 
            onClick={() => { setActiveView('OUTREACH'); setActivePanel(-1); setIsMobileMenuOpen(false); }}
            icon={Target}
            label="Outreach"
            subLabel="Campaigns & Leads"
            isCollapsed={_isCollapsed}
          />
          <AnimatePresence initial={false}>
            {activeView === 'OUTREACH' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={`overflow-hidden ml-5 pl-3 border-l border-brand/20 my-1 space-y-1 ${
                  _isCollapsed ? 'pl-0 ml-0 border-l-0' : ''
                }`}
              >
                <button
                  onClick={() => {
                    setCurrentCampaign(null);
                    setActivePanel(-1);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                    !currentCampaign
                      ? 'bg-brand/10 text-brand font-bold'
                      : 'text-text-muted hover:bg-bg-subtle hover:text-text'
                  } ${_isCollapsed ? 'justify-center p-2' : ''}`}
                  title="All Campaigns Dashboard"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0 text-brand-alt" />
                  {!_isCollapsed && <span className="truncate">All Campaigns</span>}
                </button>

                {currentCampaign ? (
                  <>
                    <div className={`px-3 py-1 text-[8px] font-bold text-text-muted uppercase tracking-wider select-none mt-2 ${
                      _isCollapsed ? 'hidden' : ''
                    }`}>
                      Active Campaign
                    </div>
                    {[
                      { id: 0, label: 'Agent Product DNA', icon: Settings },
                      { id: 1, label: 'Import & Quality Map', icon: Users, badge: leads.length },
                      { id: 2, label: 'Auto-Generate outreach', icon: Zap },
                      { id: 3, label: 'Review Copy & Edit', icon: Eye, badge: Object.keys(messages || {}).length },
                      { id: 4, label: 'Outreach & Export', icon: Download }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setActivePanel(p.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                          true // activePanel === p.id should be passed as prop if needed, for simplicity omitting strict active state here or passing activePanel as prop
                            ? 'text-text-muted hover:bg-bg-subtle hover:text-text'
                            : 'bg-brand/15 text-brand font-bold'
                        } ${_isCollapsed ? 'justify-center p-2' : ''}`}
                        title={p.label}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <p.icon className="w-3.5 h-3.5 shrink-0" />
                          {!_isCollapsed && <span className="truncate">{p.label}</span>}
                        </div>
                        {p.badge && !_isCollapsed ? (
                          <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold rounded-md bg-brand-alt/10 text-brand-alt border border-brand-alt/20">
                            {p.badge}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </>
                ) : (
                  campaigns.length > 0 && (
                    <>
                      <div className={`px-3 py-1 text-[8px] font-bold text-text-muted uppercase tracking-wider select-none mt-2 ${
                        _isCollapsed ? 'hidden' : ''
                      }`}>
                        Select Campaign
                      </div>
                      {campaigns.slice(0, 4).map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCurrentCampaign(c);
                            setActivePanel(0);
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1 rounded-xl text-[11px] text-text-muted hover:text-brand hover:bg-brand/5 transition-all cursor-pointer text-left"
                          title={c.name}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-alt shrink-0" />
                          {!_isCollapsed && (
                            <span className="truncate max-w-[120px]">{c.name}</span>
                          )}
                        </button>
                      ))}
                    </>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {showJourneys && (
        <div>
          <NavButton 
            active={activeView === 'JOURNEY'} 
            onClick={() => { setActiveView('JOURNEY'); setIsMobileMenuOpen(false); }}
            icon={TrendingUp}
            label="Journeys"
            subLabel="CRM Deals & Boards"
            isCollapsed={_isCollapsed}
          />
        </div>
      )}

      {showAnalytics && (
        <div>
          <NavButton 
            active={activeView === 'ANALYTICS'} 
            onClick={() => { setActiveView('ANALYTICS'); setIsMobileMenuOpen(false); }}
            icon={Activity}
            label="Analytics"
            subLabel="SLA & Funnel Reports"
            isCollapsed={_isCollapsed}
          />
        </div>
      )}

      {showSettings && (
        <div>
          <NavButton 
            active={activeView === 'SETTINGS'} 
            onClick={() => { setActiveView('SETTINGS'); setIsMobileMenuOpen(false); }}
            icon={Settings}
            label="Settings"
            subLabel="Email & API Setup"
            isCollapsed={_isCollapsed}
          />
          <AnimatePresence initial={false}>
            {activeView === 'SETTINGS' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={`overflow-hidden ml-5 pl-3 border-l border-brand/20 my-1 space-y-1 ${
                  _isCollapsed ? 'pl-0 ml-0 border-l-0' : ''
                }`}
              >
                <button
                  onClick={() => {
                    setActiveView('SETTINGS');
                    setIsMobileMenuOpen(false);
                    setTimeout(() => {
                      const el = document.getElementById('settings-smtp-card');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 120);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-text-muted hover:bg-bg-subtle hover:text-text transition-all cursor-pointer ${
                    _isCollapsed ? 'justify-center p-2' : ''
                  }`}
                  title="Configure SMTP Delivery"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0 text-email" />
                  {!_isCollapsed && <span className="truncate">Email SMTP Setup</span>}
                </button>

                <button
                  onClick={() => {
                    setActiveView('SETTINGS');
                    setIsMobileMenuOpen(false);
                    setTimeout(() => {
                      const el = document.getElementById('settings-linkedin-card');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 120);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-text-muted hover:bg-bg-subtle hover:text-text transition-all cursor-pointer ${
                    _isCollapsed ? 'justify-center p-2' : ''
                  }`}
                  title="Adjust LinkedIn Bridge"
                >
                  <Linkedin className="w-3.5 h-3.5 shrink-0 text-linkedin" />
                  {!_isCollapsed && <span className="truncate">LinkedIn Bridge</span>}
                </button>

                <button
                  onClick={() => {
                    generateProjectPDF();
                    if (showToast) showToast("Gathering system metadata and printing Architecture Report...", "success");
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-text-muted hover:bg-bg-subtle hover:text-text transition-all cursor-pointer ${
                    _isCollapsed ? 'justify-center p-2' : ''
                  }`}
                  title="Download System Specs Report"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-brand" />
                  {!_isCollapsed && <span className="truncate">Systems Specs (PDF)</span>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      {showTeamAdmin && (
        <div>
          <NavButton 
            active={activeView === 'TEAM_ADMIN'} 
            onClick={() => { setActiveView('TEAM_ADMIN'); setIsMobileMenuOpen(false); }}
            icon={Users}
            label="Team Admin"
            subLabel="Manage Organization"
            isCollapsed={_isCollapsed}
          />
          <AnimatePresence initial={false}>
            {activeView === 'TEAM_ADMIN' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={`overflow-hidden ml-5 pl-3 border-l border-brand/20 my-1 space-y-1 ${
                  _isCollapsed ? 'pl-0 ml-0 border-l-0' : ''
                }`}
              >
                <div className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-brand bg-brand/10 font-medium ${
                  _isCollapsed ? 'justify-center p-2' : ''
                }`}>
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  {!_isCollapsed && <span className="truncate">Members Profile</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {showSuperAdmin && (
        <div>
          <NavButton 
            active={activeView === 'SUPER_ADMIN'} 
            onClick={() => { setActiveView('SUPER_ADMIN'); setIsMobileMenuOpen(false); }}
            icon={ShieldCheck}
            label="Super Admin"
            subLabel="Platform Control"
            isCollapsed={_isCollapsed}
          />
          <AnimatePresence initial={false}>
            {activeView === 'SUPER_ADMIN' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={`overflow-hidden ml-5 pl-3 border-l border-brand/20 my-1 space-y-1 ${
                  _isCollapsed ? 'pl-0 ml-0 border-l-0' : ''
                }`}
              >
                <div className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-brand bg-brand/10 font-medium ${
                  _isCollapsed ? 'justify-center p-2' : ''
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  {!_isCollapsed && <span className="truncate">Console Registry</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </nav>
  );
};
