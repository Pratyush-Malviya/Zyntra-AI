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
    <div >
      {/* Header */}
      <div >
        <button
          onClick={onBack}
          
        >
          <ArrowLeft  />
        </button>
        <div>
          <h2 >{affiliate.fullName}</h2>
          <p >Affiliate Partner Profile</p>
        </div>
      </div>

      {/* Grid Summary */}
      <div >
        {[
          { label: 'Referred Leads', value: affiliate.totalReferrals, icon: Users, color: '#6366f1' },
          { label: 'Conversion Rate', value: `${getRate(funnelMetrics.closed, affiliate.totalReferrals)}%`, icon: TrendingUp, color: '#3b82f6' },
          { label: 'Commission Rate', value: `${affiliate.commissionRate}%`, icon: Award, color: '#10b981' },
          { label: 'Total Commission Paid', value: `$${affiliate.totalEarned.toLocaleString()}`, icon: DollarSign, color: '#f59e0b' },
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

      {/* Onboarding and Funnel Section */}
      <div >
        {/* Conversion Funnel */}
        <div >
          <div >
            <BarChart2  />
            <h3 >Referral Conversion Funnel</h3>
          </div>

          <div >
            {[
              { label: '1. Total Referred Leads', value: funnelMetrics.referred, pct: 100, color: 'bg-indigo-500' },
              { label: '2. Qualified Pipeline', value: funnelMetrics.qualified, pct: getRate(funnelMetrics.qualified, funnelMetrics.referred), color: 'bg-blue-500' },
              { label: '3. Closed Deals', value: funnelMetrics.closed, pct: getRate(funnelMetrics.closed, funnelMetrics.referred), color: 'bg-emerald-500' },
              { label: '4. Commission Paid', value: funnelMetrics.paid, pct: getRate(funnelMetrics.paid, funnelMetrics.referred), color: 'bg-amber-500' },
            ].map((step, idx) => (
              <div key={idx} >
                <div >
                  <span >{step.label}</span>
                  <span>{step.value} ({step.pct}%)</span>
                </div>
                <div >
                  <motion.div
                    
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
        <div >
          <div >
            <Mail  />
            <h3 >Partner Onboarding Flow</h3>
          </div>

          <div >
            {[
              { day: 'Day 1', label: 'Welcome & Link Share', done: true, desc: 'Intro guide with tracking parameters sent' },
              { day: 'Day 3', label: 'Pitch deck & ICP list', done: true, desc: 'Assets and templates shared' },
              { day: 'Day 7', label: 'Coaching resource check-in', done: false, desc: 'Scheduled checking email' },
              { day: 'Day 14', label: 'First payout strategy review', done: false, desc: 'Closing check-in sequence trigger' }
            ].map((step, idx) => (
              <div key={idx} >
                <span  />
                <div>
                  <div >
                    <span >{step.label}</span>
                    <span >{step.day}</span>
                  </div>
                  <p >{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referrals table */}
      <div >
        <h3 >Referred Leads Database</h3>

        {loading ? (
          <div ><Loader2  /></div>
        ) : referrals.length === 0 ? (
          <div >No referred leads recorded yet.</div>
        ) : (
          <div >
            <table >
              <thead>
                <tr >
                  <th >Lead Name</th>
                  <th >Status</th>
                  <th >Referred Date</th>
                  <th >Deal Value</th>
                  <th >Commission</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r, i) => {
                  const cfg = REFERRAL_STATUS_CONFIG[r.status] || { label: r.status, color: '#64748b', bg: 'rgba(0,0,0,0.1)' };
                  return (
                    <tr key={r.id || i} >
                      <td >{r.leadName || 'Unnamed'}</td>
                      <td >
                        <span  style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td >
                        {r.referredAt?.toDate ? r.referredAt.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td >
                        {r.dealValue ? `$${r.dealValue.toLocaleString()}` : '-'}
                      </td>
                      <td >
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
