import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Plus, TrendingUp, DollarSign, Link2, Copy, CheckCircle2,
  ChevronRight, Loader2, ExternalLink, Award, Globe, Mail,
  Activity, ArrowUpRight, Filter, MoreVertical, Edit3, Trash2,
  BadgeCheck, Clock, XCircle, PlayCircle, PauseCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from '../../firebase';
import { db } from '../../firebase';
import type { Affiliate, AffiliateReferral, AffiliateStatus, ReferralStatus } from '../../services/firestoreSchema';
import { createAffiliate, generateReferralCode } from '../../services/firestoreSchema';
import { updateDoc, doc } from '../../firebase';
import AffiliateDetail from './AffiliateDetail';

interface AffiliatesPanelProps {
  orgId: string;
  profile: any;
}

const STATUS_BADGE: Record<AffiliateStatus, { label: string; color: string; icon: React.ReactNode }> = {
  active:     { label: 'Active',      color: '#10b981', icon: <PlayCircle  /> },
  paused:     { label: 'Paused',      color: '#f59e0b', icon: <PauseCircle  /> },
  terminated: { label: 'Terminated',  color: '#ef4444', icon: <XCircle  /> },
};

const REFERRAL_BADGE: Record<ReferralStatus, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: '#64748b' },
  qualified: { label: 'Qualified', color: '#6366f1' },
  closed:    { label: 'Closed',    color: '#10b981' },
  paid:      { label: 'Paid',      color: '#f59e0b' },
};

export default function AffiliatesPanel({ orgId, profile }: AffiliatesPanelProps) {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selected, setSelected] = useState<Affiliate | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    country: '',
    commissionRate: 20,
  });

  useEffect(() => {
    const q = query(
      collection(db, 'affiliates'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setAffiliates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Affiliate)));
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  const handleCreate = async () => {
    if (!form.fullName || !form.email) return;
    setSaving(true);
    try {
      const { addDoc } = await import('../../firebase');
      const { collection: col, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'affiliates'), {
        orgId,
        fullName: form.fullName,
        email: form.email,
        country: form.country,
        commissionRate: form.commissionRate,
        referralCode: generateReferralCode(form.fullName),
        status: 'active',
        totalReferrals: 0,
        totalEarned: 0,
        createdAt: new Date(),
      });
      setView('list');
      setForm({ fullName: '', email: '', country: '', commissionRate: 20 });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const stats = {
    total: affiliates.length,
    active: affiliates.filter(a => a.status === 'active').length,
    totalReferrals: affiliates.reduce((s, a) => s + a.totalReferrals, 0),
    totalEarned: affiliates.reduce((s, a) => s + a.totalEarned, 0),
  };

  if (loading) {
    return <div ><Loader2  /></div>;
  }

  if (view === 'detail' && selected) {
    return (
      <AffiliateDetail
        affiliate={selected}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'create') {
    return (
      <div >
        <div >
          <button onClick={() => setView('list')} >
            <ChevronRight  />
          </button>
          <div>
            <h2 >Add Affiliate Partner</h2>
            <p >Partner will receive a unique referral tracking code</p>
          </div>
        </div>

        <div >
          {[
            { label: 'Full Name', key: 'fullName', placeholder: 'e.g. Jane Smith', type: 'text' },
            { label: 'Email Address', key: 'email', placeholder: 'jane@example.com', type: 'email' },
            { label: 'Country', key: 'country', placeholder: 'e.g. Kenya, India, UK', type: 'text' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label >{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                
              />
            </div>
          ))}

          <div>
            <label >
              Commission Rate: {form.commissionRate}%
            </label>
            <input
              type="range"
              min={5}
              max={40}
              step={5}
              value={form.commissionRate}
              onChange={e => setForm(p => ({ ...p, commissionRate: Number(e.target.value) }))}
              
            />
            <div >
              <span>5%</span>
              <span>40%</span>
            </div>
          </div>

          {/* Preview referral code */}
          {form.fullName && (
            <div >
              <div >Referral Code Preview</div>
              <code >{generateReferralCode(form.fullName)}</code>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!form.fullName || !form.email || saving}
            
          >
            {saving ? <Loader2  /> : <Users  />}
            Create Affiliate Partner
          </button>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div >
      <div >
        <div>
          <h1 >Affiliate Partners</h1>
          <p >Manage referral partners and track commission earnings</p>
        </div>
        <button
          onClick={() => setView('create')}
          
        >
          <Plus  />
          Add Partner
        </button>
      </div>

      {/* Stats */}
      <div >
        {[
          { label: 'Total Partners',   value: stats.total,         icon: Users,      color: '#6366f1' },
          { label: 'Active',           value: stats.active,        icon: Activity,   color: '#10b981' },
          { label: 'Total Referrals',  value: stats.totalReferrals,icon: TrendingUp, color: '#3b82f6' },
          { label: 'Commission Paid',  value: `$${stats.totalEarned.toLocaleString()}`, icon: DollarSign, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} >
            <div >
              <div  style={{ background: color + '15' }}>
                <Icon  style={{ color }} />
              </div>
              <span >{value}</span>
            </div>
            <div >{label}</div>
          </div>
        ))}
      </div>

      {/* Affiliate list */}
      {affiliates.length === 0 ? (
        <div >
          <Users  />
          <div >No affiliate partners yet</div>
          <div >Add your first partner to start tracking referrals</div>
        </div>
      ) : (
        <div >
          {affiliates.map(affiliate => {
            const statusCfg = STATUS_BADGE[affiliate.status];
            const refLink = `https://zyntra.ai/ref/${affiliate.referralCode}`;
            return (
              <motion.div
                key={affiliate.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                
                onClick={() => { setSelected(affiliate); setView('detail'); }}
              >
                <div >
                  <div >
                    <div >
                      {affiliate.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div >
                        <span >{affiliate.fullName}</span>
                        <span 
                          style={{ background: statusCfg.color + '15', color: statusCfg.color }}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </div>
                      <div >{affiliate.email}</div>
                      {affiliate.country && (
                        <div >
                          <Globe  />
                          {affiliate.country}
                        </div>
                      )}
                    </div>
                  </div>

                  <div >
                    <div >
                      <div >{affiliate.commissionRate}% commission</div>
                      <div >{affiliate.totalReferrals} referrals</div>
                    </div>
                  </div>
                </div>

                {/* Referral code + link */}
                <div >
                  <div >
                    <div >Referral Code</div>
                    <code >{affiliate.referralCode}</code>
                  </div>
                  <div >
                    <button
                      onClick={() => handleCopy(affiliate.referralCode, `code-${affiliate.id}`)}
                      
                      title="Copy code"
                    >
                      {copied === `code-${affiliate.id}` ? <CheckCircle2  /> : <Copy  />}
                    </button>
                    <button
                      onClick={() => handleCopy(refLink, `link-${affiliate.id}`)}
                      
                      title="Copy referral link"
                    >
                      {copied === `link-${affiliate.id}` ? <CheckCircle2  /> : <Link2  />}
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div >
                  {[
                    { label: 'Referrals', value: affiliate.totalReferrals },
                    { label: 'Earned',    value: `$${affiliate.totalEarned.toLocaleString()}` },
                    { label: 'Rate',      value: `${affiliate.commissionRate}%` },
                  ].map(({ label, value }) => (
                    <div key={label} >
                      <div >{value}</div>
                      <div >{label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Onboarding sequence info */}
      <div >
        <div >
          <div >
            <Mail  />
          </div>
          <div>
            <div >Affiliate Onboarding Sequence</div>
            <div >
              New partners are automatically enrolled in a 4-touch onboarding sequence:
              Day 1: Welcome + referral link · Day 3: Pitch deck · Day 7: First referral guide · Day 14: Commission update
            </div>
            <div >Configure sequences in Email Manager →</div>
          </div>
        </div>
      </div>
    </div>
  );
}
