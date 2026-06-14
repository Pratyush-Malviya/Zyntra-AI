// Firestore Schema — Extended CRM Collections
// Matches the schema from CRM_AI_Outreach_Implementation_Guide.md Section 9

import {
  collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp
} from '../firebase';
import { db } from '../firebase';

// ─── Core Types ────────────────────────────────────────────────────────────────

export type BantScore = 'A' | 'B' | 'C' | 'D';

export type PipelineStage =
  | 'lead_identified'
  | 'meeting_booked'
  | 'discovery_completed'
  | 'demo_scheduled'
  | 'demo_completed'
  | 'proposal_pilot'
  | 'closing'
  | 'customer_handoff';

export type MeetingType = 'discovery' | 'demo' | 'pilot_review' | 'closing';
export type SequenceStatus = 'active' | 'paused' | 'completed' | 'bounced';
export type AffiliateStatus = 'active' | 'paused' | 'terminated';
export type ReferralStatus = 'pending' | 'qualified' | 'closed' | 'paid';
export type IcpSegment = 'wealth_advisory' | 'hr' | 'ops' | 'custom';

// ─── Pipeline Stage Config ─────────────────────────────────────────────────────

export const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string; slaDays: number }[] = [
  { id: 'lead_identified',    label: 'Lead Identified',      color: '#6366f1', slaDays: 3  },
  { id: 'meeting_booked',     label: 'Meeting Booked',       color: '#8b5cf6', slaDays: 2  },
  { id: 'discovery_completed',label: 'Discovery Completed',  color: '#3b82f6', slaDays: 5  },
  { id: 'demo_scheduled',     label: 'Demo Scheduled',       color: '#06b6d4', slaDays: 3  },
  { id: 'demo_completed',     label: 'Demo Completed',       color: '#10b981', slaDays: 5  },
  { id: 'proposal_pilot',     label: 'Proposal / Pilot',     color: '#f59e0b', slaDays: 10 },
  { id: 'closing',            label: 'Closing',              color: '#f97316', slaDays: 7  },
  { id: 'customer_handoff',   label: 'Customer Handoff',     color: '#22c55e', slaDays: 3  },
];

export const BANT_SCORE_CONFIG: Record<BantScore, { label: string; color: string; bg: string }> = {
  A: { label: 'A — Hot',      color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  B: { label: 'B — Warm',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  C: { label: 'C — Cool',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  D: { label: 'D — Cold',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
};

export const ICP_SEGMENTS: { id: IcpSegment; label: string }[] = [
  { id: 'wealth_advisory', label: 'Wealth Advisory' },
  { id: 'hr',              label: 'HR Consulting'   },
  { id: 'ops',             label: 'Operations'      },
  { id: 'custom',          label: 'Custom'          },
];

// ─── Lead Stage History ────────────────────────────────────────────────────────

export interface LeadStageHistory {
  id?: string;
  leadId: string;
  orgId: string;
  fromStage: PipelineStage | null;
  toStage: PipelineStage;
  changedBy: string;    // user UID
  changedByName: string;
  changedAt: any;
  notes?: string;
}

export async function logStageChange(entry: Omit<LeadStageHistory, 'id' | 'changedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'lead_stage_history'), {
    ...entry,
    changedAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Meeting Intelligence ──────────────────────────────────────────────────────

export interface ActionItem {
  task: string;
  owner: string;
  dueDate: string;
  completed: boolean;
}

export interface BantSignals {
  budget: { signal: 'positive' | 'neutral' | 'negative' | 'unknown'; evidence: string; notes: string };
  authority: { isDecisionMaker: boolean; influencerLevel: 'primary' | 'secondary' | 'unknown'; evidence: string; otherStakeholders: string[] };
  need: { painConfirmed: boolean; painSummary: string; urgency: 'high' | 'medium' | 'low'; evidence: string };
  timeline: { timeframe: string; drivingEvent: string; evidence: string };
}

export interface Meeting {
  id?: string;
  orgId: string;
  leadId: string;
  leadName?: string;
  title: string;
  meetingType: MeetingType;
  scheduledAt: string;
  durationMinutes?: number;
  recordingUrl?: string;
  transcript?: string;
  summary?: string;
  actionItems?: ActionItem[];
  painConfirmed?: string[];
  objectionsRaised?: string[];
  bantSignals?: BantSignals;
  bantScore?: BantScore;
  nextStep?: string;
  attendees?: string[];
  followUpEmailDraft?: string;
  processingStatus?: 'pending' | 'transcribing' | 'analyzing' | 'complete' | 'error';
  createdAt?: any;
  updatedAt?: any;
}

export async function createMeeting(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'meetings'), {
    ...meeting,
    processingStatus: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMeeting(id: string, data: Partial<Meeting>): Promise<void> {
  await updateDoc(doc(db, 'meetings', id), { ...data, updatedAt: serverTimestamp() });
}

// ─── Email Sequences ───────────────────────────────────────────────────────────

export interface EmailTouch {
  day: number;
  subject: string;
  body: string;
  variantUsed?: 'A' | 'B' | 'C';
}

export interface EmailSequence {
  id?: string;
  orgId: string;
  leadId: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  sequenceName: string;
  icpSegment?: IcpSegment;
  status: SequenceStatus;
  touches: EmailTouch[];
  currentTouch: number;
  lastSentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  repliedAt?: string;
  listmonkSubId?: number;
  listmonkSeqId?: number;
  createdAt?: any;
  updatedAt?: any;
}

export async function createEmailSequence(seq: Omit<EmailSequence, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'email_sequences'), {
    ...seq,
    currentTouch: 1,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEmailSequence(id: string, data: Partial<EmailSequence>): Promise<void> {
  await updateDoc(doc(db, 'email_sequences', id), { ...data, updatedAt: serverTimestamp() });
}

// ─── Affiliates ────────────────────────────────────────────────────────────────

export interface Affiliate {
  id?: string;
  orgId: string;
  profileId?: string;
  fullName: string;
  email: string;
  country?: string;
  referralCode: string;
  commissionRate: number;  // percentage e.g. 20.0
  status: AffiliateStatus;
  totalReferrals: number;
  totalEarned: number;
  notes?: string;
  createdAt?: any;
}

export interface AffiliateReferral {
  id?: string;
  affiliateId: string;
  affiliateName?: string;
  leadId?: string;
  leadName?: string;
  referralCode: string;
  status: ReferralStatus;
  dealValue?: number;
  commission?: number;
  referredAt?: any;
  closedAt?: string;
  paidAt?: string;
}

export function generateReferralCode(name: string): string {
  const slug = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ZY-${slug}-${rand}`;
}

export async function createAffiliate(affiliate: Omit<Affiliate, 'id' | 'createdAt' | 'totalReferrals' | 'totalEarned'>): Promise<string> {
  const ref = await addDoc(collection(db, 'affiliates'), {
    ...affiliate,
    totalReferrals: 0,
    totalEarned: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createAffiliateReferral(referral: Omit<AffiliateReferral, 'id' | 'referredAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'affiliate_referrals'), {
    ...referral,
    referredAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Extended Lead fields ──────────────────────────────────────────────────────

export interface ExtendedLead {
  // existing Lead fields +
  pipelineStage?: PipelineStage;
  bantScore?: BantScore;
  bantBudget?: string;
  bantAuthority?: string;
  bantNeed?: string;
  bantTimeline?: string;
  dealValue?: number;
  currency?: string;
  closeDate?: string;
  icpSegment?: IcpSegment;
  researchReportId?: string;
  affiliateId?: string;
  isActive?: boolean;
  lostReason?: string;
}

// ─── Research Report (extended) ────────────────────────────────────────────────

export interface ResearchReport {
  id?: string;
  orgId: string;
  leadId?: string;
  companyId?: string;
  companyOverview?: string;
  prospectBackground?: string;
  businessPriorities?: string;
  painPoints?: string;
  useCases?: string;
  discoveryQuestions?: string;
  pitchAngle?: string;
  risksObjections?: string;
  rawSources?: any[];
  modelUsed?: string;
  tokenCount?: number;
  generationTimeMs?: number;
  version?: number;
  markdownReport?: string;
  createdAt?: any;
}
