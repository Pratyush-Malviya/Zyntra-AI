import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, orderBy } from '../../firebase';
import { motion } from 'motion/react';
import {
  Users, DollarSign, ArrowLeft, Loader2, Award, Calendar,
  TrendingUp, CheckCircle2, Clock, Mail, ShieldAlert, BarChart2
} from 'lucide-react';
import type { Affiliate, AffiliateReferral, ReferralStatus } from '../../services/firestoreSchema';
import { BANT_SCORE_CONFIG } from '../../services/firestoreSchema';

interface AffiliateDetailProps {
  affiliate: Affiliate;
  onBack: () => void;
}

const REFERRAL_STATUS_CONFIG: Record<ReferralStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Pending',   color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  qualified: { label: 'Qualified', color: '#6366f1', bg: 'rgba(99,102,241,0.12)'  },
  closed:    { label: 'Closed',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  paid:      { label: 'Paid',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
};

export default function AffiliateDetail({ affiliate, onBack }: AffiliateDetailProps) {
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!affiliate.id) return;
    const q = query(
      collection(db, 'affiliate_referrals'),
      where('affiliateId', '==', affiliate.id)
    );
    const unsub = onSnapshot(q, snap => {
      setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() } as AffiliateReferral)));
      setLoading(false);
    }, (error) => {
      console.error("Error loading referrals:", error);
      setLoading(false);
    });
    return unsub;
  }, [affiliate.id]);

  const funnelMetrics = {
    referred: referrals.length,
    qualified: referrals.filter(r => r.status === 'qualified' || r.status === 'closed' || r.status === 'paid').length,
    closed: referrals.filter(r => r.status === 'closed' || r.status === 'paid').length,
    paid: referrals.filter(r => r.status === 'paid').length,
  };

  const getRate = (part: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-text">{affiliate.fullName}</h2>
          <p className="text-xs text-text-secondary">Affiliate Partner Profile</p>
        </div>
      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Referred Leads', value: affiliate.totalReferrals, icon: Users, color: '#6366f1' },
          { label: 'Conversion Rate', value: `${getRate(funnelMetrics.closed, affiliate.totalReferrals)}%`, icon: TrendingUp, color: '#3b82f6' },
          { label: 'Commission Rate', value: `${affiliate.commissionRate}%`, icon: Award, color: '#10b981' },
          { label: 'Total Commission Paid', value: `$${affiliate.totalEarned.toLocaleString()}`, icon: DollarSign, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-1.5 rounded-lg" style={{ background: color + '15' }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xl font-bold text-text">{value}</span>
            </div>
            <div className="text-xs text-text-secondary">{label}</div>
          </div>
        ))}
      </div>

      {/* Onboarding and Funnel Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Conversion Funnel */}
        <div className="card p-5 md:col-span-8 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-text">Referral Conversion Funnel</h3>
          </div>

          <div className="space-y-3">
            {[
              { label: '1. Total Referred Leads', value: funnelMetrics.referred, pct: 100, color: 'bg-indigo-500' },
              { label: '2. Qualified Pipeline', value: funnelMetrics.qualified, pct: getRate(funnelMetrics.qualified, funnelMetrics.referred), color: 'bg-blue-500' },
              { label: '3. Closed Deals', value: funnelMetrics.closed, pct: getRate(funnelMetrics.closed, funnelMetrics.referred), color: 'bg-emerald-500' },
              { label: '4. Commission Paid', value: funnelMetrics.paid, pct: getRate(funnelMetrics.paid, funnelMetrics.referred), color: 'bg-amber-500' },
            ].map((step, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-text">
                  <span className="text-text-secondary">{step.label}</span>
                  <span>{step.value} ({step.pct}%)</span>
                </div>
                <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${step.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${step.pct}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Onboarding status */}
        <div className="card p-5 md:col-span-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-text">Partner Onboarding Flow</h3>
          </div>

          <div className="relative border-l border-border pl-4 ml-2 space-y-4 text-xs">
            {[
              { day: 'Day 1', label: 'Welcome & Link Share', done: true, desc: 'Intro guide with tracking parameters sent' },
              { day: 'Day 3', label: 'Pitch deck & ICP list', done: true, desc: 'Assets and templates shared' },
              { day: 'Day 7', label: 'Coaching resource check-in', done: false, desc: 'Scheduled checking email' },
              { day: 'Day 14', label: 'First payout strategy review', done: false, desc: 'Closing check-in sequence trigger' }
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <span className={`absolute -left-[21px] top-0.5 flex items-center justify-center w-3 h-3 rounded-full border ${
                  step.done ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-surface border-border'
                }`} />
                <div>
                  <div className="flex items-center justify-between font-semibold">
                    <span className={step.done ? 'text-indigo-400' : 'text-text-secondary'}>{step.label}</span>
                    <span className="text-[10px] text-text-secondary font-mono">{step.day}</span>
                  </div>
                  <p className="text-text-muted mt-0.5 text-[10px]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referrals table */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text mb-4">Referred Leads Database</h3>

        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-8 text-xs text-text-secondary">No referred leads recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-text-secondary">
                  <th className="py-2.5 font-semibold">Lead Name</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold">Referred Date</th>
                  <th className="py-2.5 font-semibold text-right">Deal Value</th>
                  <th className="py-2.5 font-semibold text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r, i) => {
                  const cfg = REFERRAL_STATUS_CONFIG[r.status] || { label: r.status, color: '#64748b', bg: 'rgba(0,0,0,0.1)' };
                  return (
                    <tr key={r.id || i} className="border-b border-border/40 hover:bg-surface-elevated/40">
                      <td className="py-2.5 font-semibold text-text">{r.leadName || 'Unnamed'}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 text-text-secondary">
                        {r.referredAt?.toDate ? r.referredAt.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-text">
                        {r.dealValue ? `$${r.dealValue.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-primary">
                        {r.commission ? `$${r.commission.toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
