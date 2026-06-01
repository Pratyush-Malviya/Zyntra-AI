import React, { useState, useRef, useEffect } from 'react';
import { Shield, TrendingUp, Award, Send, HeartHandshake, Eye, Webhook, ChevronDown, Check } from 'lucide-react';
import { Role } from '../lib/rbac';
import { motion, AnimatePresence } from 'motion/react';

interface RoleWorkspaceSelectorProps {
  activeRole: Role;
  onRoleChange: (role: Role) => void;
}

const roleConfig: Record<Role, { icon: React.ElementType, color: string, description: string }> = {
  'Org Admin': { icon: Shield, color: 'text-purple-400', description: 'Territory, Compliance & Deliverability' },
  'Sales Manager': { icon: TrendingUp, color: 'text-green-400', description: 'Forecasts, Coaching & Performance' },
  'Account Executive': { icon: Award, color: 'text-amber-400', description: 'Pipeline, Quotes & Copilot' },
  'SDR': { icon: Send, color: 'text-blue-400', description: 'Outreach, Inbox & Leads' },
  'Customer Success': { icon: HeartHandshake, color: 'text-rose-400', description: 'Churn, Health & SLAs' },
  'Viewer': { icon: Eye, color: 'text-slate-400', description: 'Read-only Dashboards' },
  'Integration User': { icon: Webhook, color: 'text-cyan-400', description: 'API & Webhooks' }
};

export const RoleWorkspaceSelector: React.FC<RoleWorkspaceSelectorProps> = ({ activeRole, onRoleChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ActiveIcon = roleConfig[activeRole]?.icon || Shield;
  const activeColor = roleConfig[activeRole]?.color || 'text-brand';

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#12131a] border border-white/10 px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.15)] hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all shrink-0 cursor-pointer group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-brand/10 to-brand-alt/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider hidden lg:inline relative z-10">Workspace:</span>
        <div className="flex items-center gap-1.5 relative z-10">
          <ActiveIcon className={`w-3.5 h-3.5 ${activeColor}`} />
          <span className="text-xs font-bold text-white whitespace-nowrap">{activeRole}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-64 bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="p-2 space-y-1">
              {(Object.keys(roleConfig) as Role[]).map(role => {
                const Icon = roleConfig[role].icon;
                const isSelected = activeRole === role;
                return (
                  <button
                    key={role}
                    onClick={() => {
                      onRoleChange(role);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected ? 'bg-white/5' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 ${roleConfig[role].color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{role}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand" />}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5 leading-tight pr-2">
                        {roleConfig[role].description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
