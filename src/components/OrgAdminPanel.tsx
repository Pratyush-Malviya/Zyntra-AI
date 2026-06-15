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
    <div >
      {/* Sidebar Controls */}
      <div >
        <div >
          <div >
            <div >
              <Building  />
            </div>
            <div>
              <div >{orgName}</div>
              <div >Tier 2 Admin Profile</div>
            </div>
          </div>
        </div>

        <div >
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
                
              >
                <tab.icon  />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Panel Content */}
      <div >
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div >
            <div >
              <h1 >Organization Profile & Tenant Overview</h1>
              <p >Manage multi-tenant settings and monitor regional activity.</p>
            </div>

            <div >
              <div >
                <div >{members.length + 1} / 10</div>
                <div >Active Seats Allocated</div>
                <div >
                  <div  style={{ width: `${((members.length + 1) / 10) * 100}%` }}></div>
                </div>
              </div>
              <div >
                <div >$245.80</div>
                <div >Remaining AI Credits</div>
                <div >Auto Top-Up Active &gt; $50</div>
              </div>
              <div >
                <div >Enterprise</div>
                <div >Pricing Plan Tier</div>
                <div >Renews in 18 days</div>
              </div>
            </div>

            {/* Platform status cards */}
            <div >
              <h3 >Tenant Regional Infrastructure</h3>
              <div >
                <div >
                  <div>
                    <div >Default Data Residency</div>
                    <div >EU (Frankfurt Region)</div>
                  </div>
                  <span >GDPR COMPLIANT</span>
                </div>
                <div >
                  <div>
                    <div >SSO Directory Mapping</div>
                    <div >SAML 2.0 Identity Provider</div>
                  </div>
                  <span >ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MEMBER MANAGEMENT TAB */}
        {activeTab === 'members' && (
          <div >
            <div >
              <h1 >Organization Member Management</h1>
              <p >Add seats, modify permissions, or configure workflows.</p>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInvite} >
              <div >
                <label >Invite Team Employee</label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="name@organization.com"
                  
                />
              </div>
              <div >
                <label >Select Access Role</label>
                <select 
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  
                >
                  <option value="sdr">SDR (Prospect & Out)</option>
                  <option value="ae">Account Executive (AE)</option>
                  <option value="manager">Manager / Coach</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>
              <button 
                type="submit"
                
              >
                <PlusCircle  />
                Invite Member
              </button>
            </form>

            {/* List */}
            <div >
              <table >
                <thead>
                  <tr >
                    <th >User</th>
                    <th >Workspace Scope</th>
                    <th >Status</th>
                    <th >Actions</th>
                  </tr>
                </thead>
                <tbody >
                  <tr >
                    <td >
                      <div >
                        <div >
                          O
                        </div>
                        <div>
                          <div >{profile.displayName || 'You'} (Org Admin)</div>
                          <div >{profile.email}</div>
                        </div>
                      </div>
                    </td>
                    <td >
                      <span >
                        Org Admin
                      </span>
                    </td>
                    <td >
                      <div >
                        <span  />
                        ACTIVE
                      </div>
                    </td>
                    <td >
                      Full Privilege
                    </td>
                  </tr>

                  {members.map(m => (
                    <tr key={m.uid} >
                      <td >
                        <div >
                          <div >
                            {m.displayName[0]}
                          </div>
                          <div>
                            <div >{m.displayName}</div>
                            <div >{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td >
                        <select 
                          value={m.role}
                          onChange={(e) => {
                            const newRole = e.target.value;
                            setMembers(members.map(x => x.uid === m.uid ? { ...x, role: newRole } : x));
                            showToast(`Updated role profile for customer to ${newRole.toUpperCase()}`, 'success');
                          }}
                          
                        >
                          <option value="sdr">SDR Workspace</option>
                          <option value="ae">Account Exec</option>
                          <option value="manager">Manager / Coach</option>
                          <option value="viewer">Viewer Scope</option>
                        </select>
                      </td>
                      <td >
                        <div >
                          <span  />
                          {m.status.toUpperCase()}
                        </div>
                      </td>
                      <td >
                        <button 
                          onClick={() => {
                            setMembers(members.filter(x => x.uid !== m.uid));
                            showToast(`Revoked access license for ${m.email}`, 'warning');
                          }}
                          
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
          <div >
            <div >
              <h1 >White-Label Branding Controls</h1>
              <p >Customize visual identifiers to match your corporate layout.</p>
            </div>

            <div >
              <div >
                <div >
                  <label >Organization Name</label>
                  <input 
                    type="text" 
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    
                  />
                </div>
                <div >
                  <label >Timezone Preference</label>
                  <select 
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    
                  >
                    <option value="UTC-5 (EST)">UTC-5 (Eastern Standard Time)</option>
                    <option value="UTC+0 (GMT)">UTC+0 (Greenwich Mean Time)</option>
                    <option value="UTC+1 (CET)">UTC+1 (Central European Time)</option>
                    <option value="UTC+8 (SGT)">UTC+8 (Singapore Standard Time)</option>
                  </select>
                </div>
              </div>

              <div >
                <label >Primary Theme Color</label>
                <div >
                  <input 
                    type="color" 
                    value={brandColor}
                    onChange={e => setBrandColor(e.target.value)}
                    
                  />
                  <div>
                    <div >{brandColor}</div>
                    <div >Primary brand accent applied across elements</div>
                  </div>
                </div>
              </div>

              <div >
                <label >Dashboard Tenant Logo</label>
                <div >
                  <img src={logoPreview}  />
                  <div >
                    <button 
                      type="button"
                      onClick={() => {
                        const seed = Math.floor(Math.random() * 100);
                        setLogoPreview(`https://picsum.photos/seed/${seed}/200`);
                        showToast('Simulated corporate logo upload success!', 'success');
                      }}
                      
                    >
                      Upload Vector Logo
                    </button>
                    <div >PNG / SVG up to 2MB. Dynamic transparency supported.</div>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => showToast('Branding preferences successfully deployed to client portal!', 'success')}
                
              >
                Deploy Custom Branding Settings
              </button>
            </div>
          </div>
        )}

        {/* DOMAIN SETUP TAB */}
        {activeTab === 'domain' && (
          <div >
            <div >
              <h1 >Sending Domain & DNS Records Wizard</h1>
              <p >Configure DKIM/SPF/DMARC routing to maximize email deliverability.</p>
            </div>

            <div >
              <div >
                <label >Corporate Domain Name</label>
                <div >
                  <input 
                    type="text" 
                    value={domainName}
                    onChange={e => setDomainName(e.target.value)}
                    
                  />
                  <button 
                    onClick={handleVerifyDns}
                    disabled={isVerifying}
                    
                  >
                    {isVerifying ? <RefreshCw  /> : 'Run DNS Lookup'}
                  </button>
                </div>
              </div>

              <div >
                <h3 >Required DNS TXT Parameters</h3>
                
                <div >
                  {/* SPF */}
                  <div >
                    <div >
                      <div >
                        <span >SPF Record</span>
                        <span >
                          {domainVerified.spf ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                      <div >
                        TXT @ "v=spf1 include:spf.zyntra.ai ~all"
                      </div>
                    </div>
                  </div>

                  {/* DKIM */}
                  <div >
                    <div >
                      <div >
                        <span >DKIM (zyntra._domainkey)</span>
                        <span >
                          {domainVerified.dkim ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                      <div >
                        TXT zyntra._domainkey "k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
                      </div>
                    </div>
                  </div>

                  {/* DMARC */}
                  <div >
                    <div >
                      <div >
                        <span >DMARC (_dmarc)</span>
                        <span >
                          {domainVerified.dmarc ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                      <div >
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
          <div >
            <div >
              <h1 >Billing & Plans Portal</h1>
              <p >Manage enterprise licensing and buy auxiliary AI credits packages.</p>
            </div>

            <div >
              <div >
                <div>
                  <div >Current Licensing Bundle</div>
                  <div >Enterprise Plus Subscription</div>
                  <div >10 total user seats, priority failover SLA routing.</div>
                </div>
                <div >
                  <div >$1,299/mo</div>
                  <div >Next bill on June 18, 2026</div>
                </div>
              </div>

              {/* Department Budgets */}
              <div >
                <h3 >Department-Level AI Credit Budgets</h3>
                <div >
                  <div >
                    <div >
                      <span >SDR Outbound Team</span>
                      <span >$150 / $250</span>
                    </div>
                    <div >
                      <div  style={{ width: '60%' }} />
                    </div>
                  </div>
                  <div >
                    <div >
                      <span >AE Account Team</span>
                      <span >$80 / $100</span>
                    </div>
                    <div >
                      <div  style={{ width: '80%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div >
                <button 
                  onClick={() => showToast('Connecting to payment provider Gateway...', 'info')}
                  
                >
                  Download Last Invoices
                </button>
                <button 
                  onClick={() => showToast('Purchasing additional 50,000 credit package...', 'success')}
                  
                >
                  Buy Overage AI Credits
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FEATURE CONTROLS TAB */}
        {activeTab === 'features' && (
          <div >
            <div >
              <h1 >Active Module & Feature Controls</h1>
              <p >Turn specific capabilities on or off for employees within your workspace.</p>
            </div>

            <div >
              <div >
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
                    <div key={mod.id} >
                      <div >
                        <div >{mod.label}</div>
                        <div >{mod.desc}</div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveModules({ ...activeModules, [mod.id]: !val });
                          showToast(`Successfully toggled ${mod.label}`, 'info');
                        }}
                        
                      >
                        <div  />
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
          <div >
            <div >
              <h1 >Security Settings & Encryption Policy</h1>
              <p >Enforce Multi-Factor Authentication (MFA) and construct corporate access corridors.</p>
            </div>

            <div >
              <div >
                <div>
                  <div >Enforce Multi-Factor Authentication (MFA)</div>
                  <div >Force physical keys or SMS validation for all employee roles.</div>
                </div>
                <button
                  onClick={() => {
                    setMfaRequired(!mfaRequired);
                    showToast('SMS MFA policy updated!', 'warning');
                  }}
                  
                >
                  <div  />
                </button>
              </div>

              <div >
                <div >
                  <label >Session Idle Timeout</label>
                  <select
                    value={sessionTimeout}
                    onChange={e => {
                      setSessionTimeout(e.target.value);
                      showToast(`Idle timeout limit changed to ${e.target.value}`, 'success');
                    }}
                    
                  >
                    <option value="15m">15 Minutes</option>
                    <option value="30m">30 Minutes</option>
                    <option value="2h">2 Hours</option>
                    <option value="none">No Expiry (Not recommended)</option>
                  </select>
                </div>
                <div >
                  <label >Allowed IP Access Corridors</label>
                  <input
                    type="text"
                    value={ipRestrictedRanges}
                    onChange={e => setIpRestrictedRanges(e.target.value)}
                    placeholder="e.g. 192.168.1.1/24"
                    
                  />
                </div>
              </div>

              <div >
                <Lock  />
                <div >
                  <strong>Encryption Standard:</strong> All tenant databases are dynamically logical partitioned and encrypted utilizing hardware security modules (HSM) at rest under premium AES-256 TLS protocols.
                </div>
              </div>

              <button
                onClick={() => showToast('Security parameters committed to tenant vault!', 'success')}
                
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
