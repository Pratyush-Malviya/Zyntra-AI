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
  active:     { label: 'Active',      color: '#10b981', icon: <PlayCircle className="w-3 h-3" /> },
  paused:     { label: 'Paused',      color: '#f59e0b', icon: <PauseCircle className="w-3 h-3" /> },
  terminated: { label: 'Terminated',  color: '#ef4444', icon: <XCircle className="w-3 h-3" /> },
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
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
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
      <div className="p-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-surface-elevated text-text-secondary">
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <h2 className="text-lg font-bold">Add Affiliate Partner</h2>
            <p className="text-xs text-text-secondary">Partner will receive a unique referral tracking code</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: 'Full Name', key: 'fullName', placeholder: 'e.g. Jane Smith', type: 'text' },
            { label: 'Email Address', key: 'email', placeholder: 'jane@example.com', type: 'email' },
            { label: 'Country', key: 'country', placeholder: 'e.g. Kenya, India, UK', type: 'text' },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 block">{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-border text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1 block">
              Commission Rate: {form.commissionRate}%
            </label>
            <input
              type="range"
              min={5}
              max={40}
              step={5}
              value={form.commissionRate}
              onChange={e => setForm(p => ({ ...p, commissionRate: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-text-secondary mt-1">
              <span>5%</span>
              <span>40%</span>
            </div>
          </div>

          {/* Preview referral code */}
          {form.fullName && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Referral Code Preview</div>
              <code className="text-sm font-mono text-text">{generateReferralCode(form.fullName)}</code>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!form.fullName || !form.email || saving}
            className="w-full py-3 rounded-xl text-text font-semibold text-sm hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Create Affiliate Partner
          </button>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Affiliate Partners</h1>
          <p className="text-xs text-text-secondary mt-0.5">Manage referral partners and track commission earnings</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-text text-sm font-semibold hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Partners',   value: stats.total,         icon: Users,      color: '#6366f1' },
          { label: 'Active',           value: stats.active,        icon: Activity,   color: '#10b981' },
          { label: 'Total Referrals',  value: stats.totalReferrals,icon: TrendingUp, color: '#3b82f6' },
          { label: 'Commission Paid',  value: `$${stats.totalEarned.toLocaleString()}`, icon: DollarSign, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-xl" style={{ background: color + '15' }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-2xl font-bold text-text">{value}</span>
            </div>
            <div className="text-xs text-text-secondary">{label}</div>
          </div>
        ))}
      </div>

      {/* Affiliate list */}
      {affiliates.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div className="font-semibold">No affiliate partners yet</div>
          <div className="text-xs mt-1">Add your first partner to start tracking referrals</div>
        </div>
      ) : (
        <div className="space-y-3">
          {affiliates.map(affiliate => {
            const statusCfg = STATUS_BADGE[affiliate.status];
            const refLink = `https://zyntra.ai/ref/${affiliate.referralCode}`;
            return (
              <motion.div
                key={affiliate.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-5 cursor-pointer hover:border-primary/45 transition-colors"
                onClick={() => { setSelected(affiliate); setView('detail'); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-text font-bold text-sm flex-shrink-0">
                      {affiliate.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-text">{affiliate.fullName}</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: statusCfg.color + '15', color: statusCfg.color }}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">{affiliate.email}</div>
                      {affiliate.country && (
                        <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                          <Globe className="w-3 h-3" />
                          {affiliate.country}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-text">{affiliate.commissionRate}% commission</div>
                      <div className="text-xs text-text-secondary">{affiliate.totalReferrals} referrals</div>
                    </div>
                  </div>
                </div>

                {/* Referral code + link */}
                <div className="mt-4 p-3 rounded-xl bg-surface-elevated border border-border flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-0.5">Referral Code</div>
                    <code className="text-sm font-mono text-primary">{affiliate.referralCode}</code>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(affiliate.referralCode, `code-${affiliate.id}`)}
                      className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                      title="Copy code"
                    >
                      {copied === `code-${affiliate.id}` ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleCopy(refLink, `link-${affiliate.id}`)}
                      className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                      title="Copy referral link"
                    >
                      {copied === `link-${affiliate.id}` ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Referrals', value: affiliate.totalReferrals },
                    { label: 'Earned',    value: `$${affiliate.totalEarned.toLocaleString()}` },
                    { label: 'Rate',      value: `${affiliate.commissionRate}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-2 rounded-xl bg-surface-elevated">
                      <div className="text-xs font-bold text-text">{value}</div>
                      <div className="text-[10px] text-text-secondary">{label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Onboarding sequence info */}
      <div className="card p-4 border border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text">Affiliate Onboarding Sequence</div>
            <div className="text-xs text-text-secondary mt-1 leading-relaxed">
              New partners are automatically enrolled in a 4-touch onboarding sequence:
              Day 1: Welcome + referral link · Day 3: Pitch deck · Day 7: First referral guide · Day 14: Commission update
            </div>
            <div className="text-xs text-primary mt-1.5 font-semibold">Configure sequences in Email Manager →</div>
          </div>
        </div>
      </div>
    </div>
  );
}
