import React, { useState } from 'react';
import { 
  Building, CreditCard, Users, ShieldCheck, Globe, Zap, Settings, 
  ArrowRight, ShieldAlert, Check, RefreshCw, Smartphone, Award,
  Lock, Calendar, PlusCircle, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'super_admin' | 'org_admin' | 'user' | 'sdr' | 'manager' | 'ae' | 'viewer';
  orgId: string;
}

export function OrgAdminPanel({ 
  profile, 
  users: initialUsers, 
  showToast,
  onRoleUpdate
}: { 
  profile: UserProfile; 
  users: any[]; 
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onRoleUpdate?: (uid: string, newRole: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'branding' | 'domain' | 'billing' | 'features' | 'security'>('overview');
  
  // States for domain config
  const [domainName, setDomainName] = useState('mail.co.zyntra.ai');
  const [domainVerified, setDomainVerified] = useState({
    spf: false,
    dkim: false,
    dmarc: false
  });
  const [isVerifying, setIsVerifying] = useState(false);

  // States for branding
  const [orgName, setOrgName] = useState('Acme Enterprise Solutions');
  const [brandColor, setBrandColor] = useState('#00d4aa');
  const [timezone, setTimezone] = useState('UTC-5 (EST)');
  const [logoPreview, setLogoPreview] = useState('https://picsum.photos/seed/zyntra-logo/200');

  // States for features mapping
  const [activeModules, setActiveModules] = useState({
    outreach: true,
    crm: true,
    conv_intel: true,
    forecasting: true,
    intent_data: false,
    ai_agent: false
  });

  // State for security
  const [mfaRequired, setMfaRequired] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30m');
  const [ipRestrictedRanges, setIpRestrictedRanges] = useState('192.168.1.1/24, 10.0.0.1/16');

  // Simulated members list (for org isolation testing)
  const [members, setMembers] = useState([
    { uid: 'u1', displayName: 'John Doe', email: 'john.doe@company.com', role: 'sdr', status: 'Active' },
    { uid: 'u2', displayName: 'Sarah Jenkins', email: 'sarah.j@company.com', role: 'manager', status: 'Active' },
    { uid: 'u3', displayName: 'Michael Mercer', email: 'mercer@company.com', role: 'ae', status: 'Active' },
    { uid: 'u4', displayName: 'Aditi Sharma', email: 'aditi.sharma@company.com', role: 'viewer', status: 'Active' },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('sdr');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    const name = inviteEmail.split('@')[0].replace('.', ' ');
    const newMember = {
      uid: 'u' + (members.length + 1),
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      email: inviteEmail,
      role: inviteRole,
      status: 'Active'
    };
    setMembers([...members, newMember]);
    setInviteEmail('');
    showToast(`Successfully invited ${inviteEmail} as ${inviteRole.toUpperCase()}`, 'success');
  };

  const handleVerifyDns = () => {
    setIsVerifying(true);
    showToast('Checking DNS records with active root Nameservers...', 'info');
    setTimeout(() => {
      setDomainVerified({ spf: true, dkim: true, dmarc: true });
      setIsVerifying(false);
      showToast('TXT records correctly set. Domain mail.co.zyntra.ai successfully routed!', 'success');
    }, 2200);
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Sidebar Controls */}
      <div className="md:col-span-1 space-y-2">
        <div className="p-4 bg-[#0a0b10] border border-border/80 rounded-2xl mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase truncate max-w-[120px]">{orgName}</div>
              <div className="text-[9px] text-[#60a5fa] font-extrabold uppercase tracking-wide">Tier 2 Admin Profile</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {[
            { id: 'overview', label: 'Tenant Overview', icon: Building },
            { id: 'members', label: 'Member Management', icon: Users },
            { id: 'branding', label: 'Custom Branding', icon: Settings },
            { id: 'domain', label: 'Branded Domain / DNS', icon: Globe },
            { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
            { id: 'features', label: 'Feature Controls', icon: Zap },
            { id: 'security', label: 'Security & Access', icon: ShieldCheck },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
                  isActive 
                    ? 'bg-brand/10 text-brand border border-brand/30' 
                    : 'text-text-muted hover:bg-surface-alt hover:text-text border border-transparent'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'text-text-muted'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="md:col-span-3 min-h-[500px]">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Organization Profile & Tenant Overview</h1>
              <p className="text-text-muted text-xs md:text-sm">Manage multi-tenant settings and monitor regional activity.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-surface border border-border rounded-2xl p-6 space-y-2">
                <div className="text-3xl font-syne font-bold text-brand">{members.length + 1} / 10</div>
                <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Active Seats Allocated</div>
                <div className="w-full bg-[#12131a] h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-brand h-full rounded-full" style={{ width: `${((members.length + 1) / 10) * 100}%` }}></div>
                </div>
              </div>
              <div className="bg-surface border border-border rounded-2xl p-6 space-y-2">
                <div className="text-3xl font-syne font-bold text-[#60a5fa]">$245.80</div>
                <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Remaining AI Credits</div>
                <div className="text-[10px] text-emerald-400 font-bold">Auto Top-Up Active &gt; $50</div>
              </div>
              <div className="bg-surface border border-border rounded-2xl p-6 space-y-2">
                <div className="text-3xl font-syne font-bold text-amber-500">Enterprise</div>
                <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Pricing Plan Tier</div>
                <div className="text-[10px] text-[#a78bfa] font-semibold">Renews in 18 days</div>
              </div>
            </div>

            {/* Platform status cards */}
            <div className="bg-[#0c0d12] border border-border rounded-3xl p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Tenant Regional Infrastructure</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-surface border border-border/60 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Default Data Residency</div>
                    <div className="text-[10px] text-text-muted mt-1">EU (Frankfurt Region)</div>
                  </div>
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[8px] px-2 py-0.5 rounded uppercase">GDPR COMPLIANT</span>
                </div>
                <div className="bg-surface border border-border/60 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">SSO Directory Mapping</div>
                    <div className="text-[10px] text-text-muted mt-1">SAML 2.0 Identity Provider</div>
                  </div>
                  <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[8px] px-2 py-0.5 rounded uppercase">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEMBER MANAGEMENT TAB */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Organization Member Management</h1>
              <p className="text-text-muted text-xs md:text-sm">Add seats, modify permissions, or configure workflows.</p>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInvite} className="bg-surface border border-border rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Invite Team Employee</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs text-white focus:border-brand outline-none transition-all"
                />
              </div>
              <div className="w-full sm:w-44 space-y-1">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Select Access Role</label>
                <select 
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs text-white focus:border-brand outline-none transition-all"
                >
                  <option value="sdr">SDR (Prospect & Out)</option>
                  <option value="ae">Account Executive (AE)</option>
                  <option value="manager">Manager / Coach</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full sm:w-auto bg-brand hover:bg-brand/90 text-[#07080c] font-extrabold h-11 px-5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                Invite Member
              </button>
            </form>

            {/* List */}
            <div className="bg-surface border border-border rounded-3xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-alt border-b border-border">
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-text-muted">User</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-text-muted">Workspace Scope</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-text-muted">Status</th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-text-muted text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-[#0c0d12]/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center font-bold text-xs text-[#0a0b10]">
                          O
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{profile.displayName || 'You'} (Org Admin)</div>
                          <div className="text-[10px] text-text-muted">{profile.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full bg-brand-alt/10 border border-brand-alt/20 text-brand-alt text-[9px] font-extrabold uppercase">
                        Org Admin
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                        ACTIVE
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-[10px] text-text-muted font-bold">
                      Full Privilege
                    </td>
                  </tr>

                  {members.map(m => (
                    <tr key={m.uid} className="hover:bg-[#0c0d12]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-surface-alt border border-border flex items-center justify-center font-bold text-xs text-text-muted">
                            {m.displayName[0]}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{m.displayName}</div>
                            <div className="text-[10px] text-text-muted">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-1.5">
                        <select 
                          value={m.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            setMembers(members.map(x => x.uid === m.uid ? { ...x, role: newRole } : x));
                            showToast(`Updated role profile for customer to ${newRole.toUpperCase()}`, 'success');
                          }}
                          className="bg-[#0c0d12] border border-border rounded-lg text-[10px] p-1 text-white focus:border-brand outline-none"
                        >
                          <option value="sdr">SDR Workspace</option>
                          <option value="ae">Account Exec</option>
                          <option value="manager">Manager / Coach</option>
                          <option value="viewer">Viewer Scope</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-alt" />
                          {m.status.toUpperCase()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            setMembers(members.filter(x => x.uid !== m.uid));
                            showToast(`Revoked access license for ${m.email}`, 'warning');
                          }}
                          className="text-[10px] text-rose-500 hover:underline font-extrabold cursor-pointer"
                        >
                          Revoke Seat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CUSTOM BRANDING TAB */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">White-Label Branding Controls</h1>
              <p className="text-text-muted text-xs md:text-sm">Customize visual identifiers to match your corporate layout.</p>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Organization Name</label>
                  <input 
                    type="text" 
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs text-white focus:border-brand outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Timezone Preference</label>
                  <select 
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs text-white focus:border-brand outline-none"
                  >
                    <option value="UTC-5 (EST)">UTC-5 (Eastern Standard Time)</option>
                    <option value="UTC+0 (GMT)">UTC+0 (Greenwich Mean Time)</option>
                    <option value="UTC+1 (CET)">UTC+1 (Central European Time)</option>
                    <option value="UTC+8 (SGT)">UTC+8 (Singapore Standard Time)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Primary Theme Color</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={brandColor}
                    onChange={e => setBrandColor(e.target.value)}
                    className="w-12 h-12 rounded-xl bg-transparent border border-border cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-extrabold text-white">{brandColor}</div>
                    <div className="text-[10px] text-text-muted">Primary brand accent applied across elements</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Dashboard Tenant Logo</label>
                <div className="flex items-center gap-6 p-4 rounded-2xl bg-[#0c0d12]/80 border border-border">
                  <img src={logoPreview} className="w-16 h-16 rounded-xl border border-border object-cover" />
                  <div className="space-y-1">
                    <button 
                      type="button"
                      onClick={() => {
                        const seed = Math.floor(Math.random() * 100);
                        setLogoPreview(`https://picsum.photos/seed/${seed}/200`);
                        showToast('Simulated corporate logo upload success!', 'success');
                      }}
                      className="px-4 py-2 bg-surface border border-border hover:border-brand/40 text-text rounded-xl text-xs font-bold transition-all"
                    >
                      Upload Vector Logo
                    </button>
                    <div className="text-[9px] text-text-muted">PNG / SVG up to 2MB. Dynamic transparency supported.</div>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => showToast('Branding preferences successfully deployed to client portal!', 'success')}
                className="w-full bg-brand text-[#0a0b10] py-4 rounded-xl text-xs font-extrabold"
              >
                Deploy Custom Branding Settings
              </button>
            </div>
          </div>
        )}

        {/* DOMAIN SETUP TAB */}
        {activeTab === 'domain' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Sending Domain & DNS Records Wizard</h1>
              <p className="text-text-muted text-xs md:text-sm">Configure DKIM/SPF/DMARC routing to maximize email deliverability.</p>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Corporate Domain Name</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={domainName}
                    onChange={e => setDomainName(e.target.value)}
                    className="flex-1 bg-surface-alt border border-border rounded-xl p-3 text-xs text-white focus:border-brand outline-none font-mono"
                  />
                  <button 
                    onClick={handleVerifyDns}
                    disabled={isVerifying}
                    className="bg-brand text-[#0a0b10] px-4 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Run DNS Lookup'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Required DNS TXT Parameters</h3>
                
                <div className="border border-border rounded-2xl overflow-hidden text-xs">
                  {/* SPF */}
                  <div className="p-4 bg-[#0c0d12]/50 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold uppercase text-[10px]">SPF Record</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                          domainVerified.spf ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-red-500/10 text-rose-400 border-rose-500/25'
                        }`}>
                          {domainVerified.spf ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-text-muted bg-surface p-2 rounded truncate">
                        TXT @ "v=spf1 include:spf.zyntra.ai ~all"
                      </div>
                    </div>
                  </div>

                  {/* DKIM */}
                  <div className="p-4 bg-[#0c0d12]/50 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold uppercase text-[10px]">DKIM (zyntra._domainkey)</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                          domainVerified.dkim ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-red-500/10 text-rose-400 border-rose-500/25'
                        }`}>
                          {domainVerified.dkim ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-text-muted bg-surface p-2 rounded truncate">
                        TXT zyntra._domainkey "k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
                      </div>
                    </div>
                  </div>

                  {/* DMARC */}
                  <div className="p-4 bg-[#0c0d12]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold uppercase text-[10px]">DMARC (_dmarc)</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                          domainVerified.dmarc ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-red-500/10 text-rose-400 border-rose-500/25'
                        }`}>
                          {domainVerified.dmarc ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                      <div className="font-mono text-[9px] text-text-muted bg-surface p-2 rounded truncate">
                        TXT _dmarc "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@co.zyntra.ai"
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Billing & Plans Portal</h1>
              <p className="text-text-muted text-xs md:text-sm">Manage enterprise licensing and buy auxiliary AI credits packages.</p>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-brand/5 border border-brand/20">
                <div>
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Current Licensing Bundle</div>
                  <div className="text-lg font-bold text-white mt-1">Enterprise Plus Subscription</div>
                  <div className="text-[10px] text-text-muted mt-0.5">10 total user seats, priority failover SLA routing.</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-brand">$1,299/mo</div>
                  <div className="text-[9px] text-text-muted uppercase font-bold mt-1">Next bill on June 18, 2026</div>
                </div>
              </div>

              {/* Department Budgets */}
              <div className="space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-text-muted">Department-Level AI Credit Budgets</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#0c0d12] border border-border rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">SDR Outbound Team</span>
                      <span className="font-semibold text-text-muted">$150 / $250</span>
                    </div>
                    <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                      <div className="bg-brand h-full rounded-full" style={{ width: '60%' }} />
                    </div>
                  </div>
                  <div className="bg-[#0c0d12] border border-border rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">AE Account Team</span>
                      <span className="font-semibold text-text-muted">$80 / $100</span>
                    </div>
                    <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                      <div className="bg-[#4da6ff] h-full rounded-full" style={{ width: '80%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => showToast('Connecting to payment provider Gateway...', 'info')}
                  className="bg-surface border border-border hover:border-brand/40 text-text text-center py-4 rounded-xl text-xs font-bold transition-all"
                >
                  Download Last Invoices
                </button>
                <button 
                  onClick={() => showToast('Purchasing additional 50,000 credit package...', 'success')}
                  className="bg-brand text-[#0a0b10] py-4 rounded-xl text-xs font-extrabold hover:bg-brand/90 transition-all cursor-pointer"
                >
                  Buy Overage AI Credits
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FEATURE CONTROLS TAB */}
        {activeTab === 'features' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Active Module & Feature Controls</h1>
              <p className="text-text-muted text-xs md:text-sm">Turn specific capabilities on or off for employees within your workspace.</p>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'outreach', label: 'AI Outreach Engine', desc: 'Allows multi-channel sequencing and deep personalization.' },
                  { id: 'crm', label: 'AI CRM Co-pilot', desc: 'SDR/AE workspace sidebar containing interactive leads pipeline.' },
                  { id: 'conv_intel', label: 'Conversation Intelligence', desc: 'BETA. Automated speech analytics, talk-to-listen tracking.' },
                  { id: 'forecasting', label: 'AI Forecasting Module', desc: 'Quarterly close rate algorithms and anomaly projection.' },
                  { id: 'intent_data', label: 'Third-Party Intent Data', desc: 'Access Bombora and 6sense buyer intent signals directly.' },
                  { id: 'ai_agent', label: 'Autonomous AI Deal Agent', desc: 'Allows AI agents to reschedule and update records automatically.' },
                ].map(mod => {
                  const val = activeModules[mod.id as keyof typeof activeModules];
                  return (
                    <div key={mod.id} className="bg-[#0b0c11] border border-border rounded-2xl p-4 flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="text-xs font-bold text-white mb-0.5">{mod.label}</div>
                        <div className="text-[10px] text-text-muted leading-relaxed font-semibold">{mod.desc}</div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveModules({ ...activeModules, [mod.id]: !val });
                          showToast(`Successfully toggled ${mod.label}`, 'info');
                        }}
                        className={`w-11 h-6 rounded-full p-0.5 transition-all outline-none ${
                          val ? 'bg-brand' : 'bg-zinc-800'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-all ${val ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Security Settings & Encryption Policy</h1>
              <p className="text-text-muted text-xs md:text-sm">Enforce Multi-Factor Authentication (MFA) and construct corporate access corridors.</p>
            </div>

            <div className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6">
              <div className="bg-[#0c0d12] border border-border/80 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-white mb-0.5">Enforce Multi-Factor Authentication (MFA)</div>
                  <div className="text-[10px] text-text-muted font-semibold">Force physical keys or SMS validation for all employee roles.</div>
                </div>
                <button
                  onClick={() => {
                    setMfaRequired(!mfaRequired);
                    showToast('SMS MFA policy updated!', 'warning');
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 transition-all outline-none ${
                    mfaRequired ? 'bg-brand' : 'bg-zinc-800'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-all ${mfaRequired ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Session Idle Timeout</label>
                  <select
                    value={sessionTimeout}
                    onChange={e => {
                      setSessionTimeout(e.target.value);
                      showToast(`Idle timeout limit changed to ${e.target.value}`, 'success');
                    }}
                    className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs text-white"
                  >
                    <option value="15m">15 Minutes</option>
                    <option value="30m">30 Minutes</option>
                    <option value="2h">2 Hours</option>
                    <option value="none">No Expiry (Not recommended)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-muted uppercase tracking-widest block">Allowed IP Access Corridors</label>
                  <input
                    type="text"
                    value={ipRestrictedRanges}
                    onChange={e => setIpRestrictedRanges(e.target.value)}
                    placeholder="e.g. 192.168.1.1/24"
                    className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs text-white focus:border-brand outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-brand-alt/5 border border-brand-alt/10 rounded-2xl flex items-start gap-3">
                <Lock className="w-5 h-5 text-brand-alt shrink-0" />
                <div className="text-[10px] text-text-muted leading-relaxed">
                  <strong>Encryption Standard:</strong> All tenant databases are dynamically logical partitioned and encrypted utilizing hardware security modules (HSM) at rest under premium AES-256 TLS protocols.
                </div>
              </div>

              <button
                onClick={() => showToast('Security parameters committed to tenant vault!', 'success')}
                className="w-full bg-brand text-[#0a0b10] py-4 rounded-xl text-xs font-extrabold hover:bg-brand/90 transition-all"
              >
                Save Security Safeguards
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
