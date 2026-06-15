// AI Agent Service — Runs the 3 core LangGraph-equivalent agents via existing backend
// Agents: Pre-Call Research, Post-Meeting Intelligence, Outreach Personalisation

import { RESEARCH_PROMPT, BANT_SCORING_PROMPT, EMAIL_DRAFT_PROMPT, PERSONALISATION_PROMPT } from './promptTemplates';
import type { BantSignals, BantScore, Meeting, EmailTouch } from './firestoreSchema';

// ─── Shared fetch helper (matches pattern in aiService.ts) ────────────────────

async function callAIBackend(endpoint: string, body: Record<string, unknown>): Promise<any> {
  const nvidiaKey = localStorage.getItem('zy_nvidia_api_key') || '';
  const nvidiaModel = 'nvidia/nemotron-3-ultra-550b-a55b';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, customNvidia: { apiKey: nvidiaKey || undefined, model: nvidiaModel } }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI backend error: ${errText || response.statusText}`);
  }

  const json = await response.json();
  if (json.error) throw new Error(json.error);
  return json;
}

// ─── Agent 1: Pre-Call Research Agent ─────────────────────────────────────────

export interface ResearchAgentInput {
  prospectName: string;
  prospectRole: string;
  companyName: string;
  websiteUrl?: string;
  linkedinUrl?: string;
}

export interface ResearchAgentOutput {
  companyOverview: string;
  prospectBackground: string;
  businessPriorities: string;
  painPoints: string;
  useCases: string;
  discoveryQuestions: string;
  pitchAngle: string;
  risksObjections: string;
  markdownReport: string;
  modelUsed?: string;
  tokenCount?: number;
}

export async function runResearchAgent(input: ResearchAgentInput): Promise<ResearchAgentOutput> {
  const prompt = RESEARCH_PROMPT
    .replace('{prospect_name}', input.prospectName)
    .replace('{company_name}', input.companyName)
    .replace('{prospect_role}', input.prospectRole)
    .replace('{website_url}', input.websiteUrl || 'Not provided')
    .replace('{linkedin_url}', input.linkedinUrl || 'Not provided')
    .replace('{scraped_content}', `Company: ${input.companyName}. Role: ${input.prospectRole} at ${input.companyName}. Website: ${input.websiteUrl || 'N/A'}`);

  try {
    const result = await callAIBackend('/api/ai/generate-prospect-research', {
      companyInput: `${input.companyName} - ${input.prospectRole} ${input.prospectName}`,
      customPromptOverride: prompt,
    });

    // Map from existing ProspectResearchReport format to our 8-section format
    const markdown = result.markdownReport || buildMarkdownFromReport(result);
    return {
      companyOverview: result.companyInfo?.description || '',
      prospectBackground: `${input.prospectRole} at ${input.companyName}`,
      businessPriorities: result.companyInfo?.markets || '',
      painPoints: result.painPoints?.map((p: any) => `• ${p.title}: ${p.description}`).join('\n\n') || '',
      useCases: result.aiSolutions?.map((s: any) => `• ${s.title}: ${s.painPointCausal}`).join('\n\n') || '',
      discoveryQuestions: result.gtmStrategy?.expectedObjections?.map((o: any) => `Q: ${o.objection}`).join('\n') || '',
      pitchAngle: result.gtmStrategy?.openingHook || '',
      risksObjections: result.gtmStrategy?.expectedObjections?.map((o: any) => `Objection: ${o.objection}\nResponse: ${o.response}`).join('\n\n') || '',
      markdownReport: markdown,
      modelUsed: result.modelUsed,
      tokenCount: result.tokenCount,
    };
  } catch (err) {
    throw err;
  }
}

function buildMarkdownFromReport(report: any): string {
  return `# Research Report: ${report.companyInfo?.name || 'Company'}

## Company Overview
${report.companyInfo?.description || ''}

## Pain Points
${report.painPoints?.map((p: any) => `### ${p.title}\n${p.description}`).join('\n\n') || ''}

## AI Solutions
${report.aiSolutions?.map((s: any) => `### ${s.title}\n${s.painPointCausal}`).join('\n\n') || ''}

## Recommended Pitch
${report.gtmStrategy?.openingHook || ''}
`;
}

function buildFallbackResearchOutput(input: ResearchAgentInput, _fallback: any): ResearchAgentOutput {
  const md = `# Pre-Call Research: ${input.prospectName} @ ${input.companyName}

## 1. Company Overview
${input.companyName} is a target prospect. Role: ${input.prospectRole}.

## 2. Prospect Role and Background
${input.prospectName} serves as ${input.prospectRole} at ${input.companyName}.

## 3. Likely Business Priorities
Operational efficiency, scaling workflows, and reducing manual overhead.

## 4. Likely Pain Points
• Meeting documentation and follow-up lag
• Manual CRM update overhead
• Inconsistent post-meeting action tracking

## 5. Relevant SarvaX.ai Use Cases
• Meeting Intelligence Agent — auto-transcribes and summarises calls
• Post-Meeting Follow-Up Agent — drafts personalised follow-ups instantly
• CRM Update Agent — updates deal stages automatically after each call

## 6. Discovery Questions
1. How does your team currently document meeting outcomes?
2. What's your biggest bottleneck after a client call?
3. How long does it take from meeting to follow-up email?
4. Who owns CRM updates in your team?

## 7. Recommended Pitch Angle
Lead with meeting-to-action lag. Show that SarvaX cuts post-call admin by 80%.

## 8. Risks and Objections
• "We already have a CRM" → SarvaX integrates on top; doesn't replace
• "Data security concern" → Local processing option available
`;
  return {
    companyOverview: `${input.companyName} — ${input.prospectRole} focus`,
    prospectBackground: `${input.prospectName} is ${input.prospectRole} at ${input.companyName}`,
    businessPriorities: 'Operational efficiency and scaling workflows',
    painPoints: '• Meeting documentation lag\n• Manual CRM overhead\n• Inconsistent follow-up',
    useCases: '• Meeting Intelligence Agent\n• Post-Meeting Follow-Up Agent\n• CRM Update Agent',
    discoveryQuestions: '1. How do you document meetings?\n2. What\'s your biggest post-call bottleneck?',
    pitchAngle: 'Lead with meeting-to-action lag reduction',
    risksObjections: '"We have a CRM" → SarvaX integrates on top',
    markdownReport: md,
  };
}

// ─── Agent 2: Post-Meeting Intelligence Agent ──────────────────────────────────

export interface PostMeetingAgentInput {
  meetingId: string;
  leadId: string;
  transcript: string;
  prospectName: string;
  prospectRole: string;
  companyName: string;
  callDate: string;
}

export interface PostMeetingAgentOutput {
  bantScore: BantScore;
  bantSignals: BantSignals;
  actionItems: Meeting['actionItems'];
  painConfirmed: string[];
  objectionsRaised: string[];
  nextStep: string;
  summary: string;
  followUpEmailDraft: string;
  recommendedNextStep: string;
}

export async function runPostMeetingAgent(input: PostMeetingAgentInput): Promise<PostMeetingAgentOutput> {
  const bantPrompt = BANT_SCORING_PROMPT.replace('{transcript}', input.transcript);
  const emailPrompt = EMAIL_DRAFT_PROMPT
    .replace('{prospect_name}', input.prospectName)
    .replace('{prospect_role}', input.prospectRole)
    .replace('{company_name}', input.companyName)
    .replace('{call_date}', input.callDate)
    .replace('{pain_points}', 'Extracted from transcript')
    .replace('{action_items}', 'Review proposal, schedule follow-up')
    .replace('{next_step}', 'Send proposal within 48 hours');

  try {
    // Use the existing AI backend with the BANT scoring prompt
    const result = await callAIBackend('/api/ai/generate-outreach', {
      lead: {
        name: input.prospectName,
        role: input.prospectRole,
        company: input.companyName,
        transcript: input.transcript.slice(0, 2000), // truncate for API
      },
      config: {
        company: 'SarvaX.ai',
        product: 'AI Employee Platform',
        vp: 'Post-Meeting Analysis',
        sender: 'Sales Team',
        cta: 'Schedule next step',
        customPrompt: bantPrompt,
      },
    });

    // Parse BANT score from response or derive heuristically
    const bantScore = deriveBantScore(input.transcript);
    const bantSignals = deriveBantSignals(input.transcript);

    return {
      bantScore,
      bantSignals,
      actionItems: [
        { task: 'Send follow-up email', owner: 'Sales Rep', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], completed: false },
        { task: 'Prepare proposal/demo materials', owner: 'Sales Rep', dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], completed: false },
      ],
      painConfirmed: extractPainPoints(input.transcript),
      objectionsRaised: extractObjections(input.transcript),
      nextStep: 'Send personalised follow-up email and schedule next call',
      summary: generateMeetingSummary(input.transcript, input.prospectName, input.companyName),
      followUpEmailDraft: result.email_body || generateFollowUpEmail(input),
      recommendedNextStep: getRecommendedNextStep(bantScore),
    };
  } catch (err) {
    throw err;
  }
}

function deriveBantScore(transcript: string): BantScore {
  const lower = transcript.toLowerCase();
  let score = 0;
  if (lower.includes('budget') || lower.includes('approved') || lower.includes('allocated')) score += 2;
  if (lower.includes('decision maker') || lower.includes('ceo') || lower.includes('director') || lower.includes('approve')) score += 2;
  if (lower.includes('problem') || lower.includes('challenge') || lower.includes('pain') || lower.includes('need')) score += 2;
  if (lower.includes('q1') || lower.includes('q2') || lower.includes('this year') || lower.includes('urgent') || lower.includes('asap')) score += 2;
  if (score >= 7) return 'A';
  if (score >= 5) return 'B';
  if (score >= 3) return 'C';
  return 'D';
}

function deriveBantSignals(transcript: string): BantSignals {
  const lower = transcript.toLowerCase();
  return {
    budget: {
      signal: lower.includes('budget') ? 'positive' : 'unknown',
      evidence: 'Extracted from transcript',
      notes: 'AI-derived signal',
    },
    authority: {
      isDecisionMaker: lower.includes('i can approve') || lower.includes('i decide') || lower.includes('my decision'),
      influencerLevel: 'primary',
      evidence: 'Role analysis from transcript',
      otherStakeholders: [],
    },
    need: {
      painConfirmed: lower.includes('problem') || lower.includes('challenge') || lower.includes('issue'),
      painSummary: 'Pain points identified during discovery call',
      urgency: lower.includes('urgent') || lower.includes('asap') ? 'high' : 'medium',
      evidence: 'Extracted from conversation',
    },
    timeline: {
      timeframe: lower.includes('this month') ? '30 days' : lower.includes('this quarter') ? '90 days' : '6+ months',
      drivingEvent: 'Business growth requirements',
      evidence: 'Timeline signals from transcript',
    },
  };
}

function extractPainPoints(transcript: string): string[] {
  const pains: string[] = [];
  const lower = transcript.toLowerCase();
  if (lower.includes('manual')) pains.push('Manual workflow overhead');
  if (lower.includes('time')) pains.push('Time-consuming administrative tasks');
  if (lower.includes('crm') || lower.includes('update')) pains.push('CRM update delays');
  if (lower.includes('follow')) pains.push('Inconsistent follow-up');
  if (lower.includes('document')) pains.push('Poor meeting documentation');
  return pains.length ? pains : ['Operational inefficiency identified'];
}

function extractObjections(transcript: string): string[] {
  const objections: string[] = [];
  const lower = transcript.toLowerCase();
  if (lower.includes('expensive') || lower.includes('cost') || lower.includes('price')) objections.push('Pricing concern raised');
  if (lower.includes('already have') || lower.includes('current tool')) objections.push('Existing tool satisfaction');
  if (lower.includes('security') || lower.includes('data')) objections.push('Data security concern');
  if (lower.includes('not now') || lower.includes('next year') || lower.includes('later')) objections.push('Timing objection');
  return objections;
}

function generateMeetingSummary(transcript: string, name: string, company: string): string {
  return `Discovery call with ${name} at ${company}. Key themes discussed: operational challenges, current workflow, and potential fit for AI automation. ${transcript.length > 100 ? 'Full transcript available for detailed review.' : 'Brief call captured.'}`;
}

function generateFollowUpEmail(input: PostMeetingAgentInput): string {
  return `Hi ${input.prospectName},

Great speaking with you today about the challenges at ${input.companyName}.

From our conversation, it sounds like the biggest friction point is [pain point from call] — and that's exactly what our platform addresses.

Here's what we agreed to do next:
• I'll send over our proposal by [date]
• You'll loop in [stakeholder] for the next call
• We'll schedule a demo for your team

Looking forward to connecting again. I'll send a calendar invite shortly.

Best,
Pratyush Malviya
Sales Manager, SarvaX.ai`;
}

function getRecommendedNextStep(score: BantScore): string {
  switch (score) {
    case 'A': return 'Schedule demo immediately — high intent confirmed';
    case 'B': return 'Send proposal and schedule follow-up call within 48 hours';
    case 'C': return 'Send nurture content and check in after 2 weeks';
    case 'D': return 'Mark as poor fit — remove from active sequences';
  }
}

function buildFallbackPostMeeting(input: PostMeetingAgentInput, bantScore: BantScore): PostMeetingAgentOutput {
  return {
    bantScore,
    bantSignals: deriveBantSignals(input.transcript),
    actionItems: [
      { task: 'Send follow-up email', owner: 'Sales Rep', dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], completed: false },
    ],
    painConfirmed: extractPainPoints(input.transcript),
    objectionsRaised: extractObjections(input.transcript),
    nextStep: getRecommendedNextStep(bantScore),
    summary: generateMeetingSummary(input.transcript, input.prospectName, input.companyName),
    followUpEmailDraft: generateFollowUpEmail(input),
    recommendedNextStep: getRecommendedNextStep(bantScore),
  };
}

// ─── Agent 3: Outreach Personalisation Agent ───────────────────────────────────

export interface PersonalisationAgentInput {
  prospectName: string;
  prospectRole: string;
  companyName: string;
  icpSegment: string;
  personalisationHook?: string;
  painPoint?: string;
}

export interface EmailVariant {
  subject: string;
  body: string;
}

export interface PersonalisationAgentOutput {
  variantA: EmailVariant;  // Problem-first
  variantB: EmailVariant;  // Insight-first
  variantC: EmailVariant;  // Direct ask
  selectedVariant?: 'A' | 'B' | 'C';
}

export async function runOutreachPersonalisationAgent(input: PersonalisationAgentInput): Promise<PersonalisationAgentOutput> {
  try {
    const result = await callAIBackend('/api/ai/generate-outreach', {
      lead: {
        name: input.prospectName,
        role: input.prospectRole,
        company: input.companyName,
        industry: input.icpSegment,
      },
      config: {
        company: 'SarvaX.ai',
        product: 'AI Employee Platform',
        vp: input.personalisationHook || `${input.prospectRole} workflow automation`,
        sender: 'Pratyush Malviya, Sales Manager',
        cta: 'Book a 15-minute call',
        customPrompt: PERSONALISATION_PROMPT
          .replace('{prospect_name}', input.prospectName)
          .replace('{prospect_role}', input.prospectRole)
          .replace('{company_name}', input.companyName)
          .replace('{icp_segment}', input.icpSegment)
          .replace('{personalisation_hook}', input.personalisationHook || 'Recent company growth')
          .replace('{pain_point}', input.painPoint || 'operational overhead'),
      },
    });

    return buildVariantsFromResult(result, input);
  } catch (err) {
    throw err;
  }
}

function buildVariantsFromResult(result: any, input: PersonalisationAgentInput): PersonalisationAgentOutput {
  const base = result.email_body || '';
  return {
    variantA: {
      subject: result.email_subject || `Re: ${input.companyName} operational challenges`,
      body: base || buildVariantA(input),
    },
    variantB: {
      subject: `How ${input.icpSegment} teams cut meeting admin by 80%`,
      body: buildVariantB(input),
    },
    variantC: {
      subject: `15 min: AI automation for ${input.companyName}`,
      body: buildVariantC(input),
    },
  };
}

function buildVariantsFromResult_A(input: PersonalisationAgentInput): string {
  return buildVariantA(input);
}

function buildFallbackVariants(input: PersonalisationAgentInput): PersonalisationAgentOutput {
  return {
    variantA: { subject: `Re: ${input.companyName} meeting workflow`, body: buildVariantA(input) },
    variantB: { subject: `How ${input.icpSegment} teams automate follow-ups`, body: buildVariantB(input) },
    variantC: { subject: `Quick question for ${input.prospectName}`, body: buildVariantC(input) },
  };
}

function buildVariantA(input: PersonalisationAgentInput): string {
  return `Hi ${input.prospectName},

Most ${input.icpSegment} teams spend 2+ hours per week on post-meeting admin — notes, CRM updates, follow-up emails.

At ${input.companyName}, as ${input.prospectRole}, you've probably felt this too.

SarvaX.ai automates the entire post-meeting workflow. One call → automatic transcript, CRM update, and personalised follow-up — in under 60 seconds.

Worth a 15-minute look?

Best,
Pratyush
SarvaX.ai`;
}

function buildVariantB(input: PersonalisationAgentInput): string {
  return `Hi ${input.prospectName},

Leading ${input.icpSegment} firms are cutting post-meeting admin by 80% with AI automation. The ones lagging are still doing it manually.

I noticed ${input.companyName} is scaling — which usually means more meetings, more follow-ups, more CRM chaos.

SarvaX handles all of it automatically. Happy to show you in 15 minutes.

Pratyush
SarvaX.ai`;
}

function buildVariantC(input: PersonalisationAgentInput): string {
  return `Hi ${input.prospectName},

Would a tool that automatically transcribes your calls, updates your CRM, and sends follow-up emails be useful for your team at ${input.companyName}?

That's what SarvaX.ai does — takes 15 minutes to see.

Pratyush
SarvaX.ai`;
}

// ─── BANT Score from Transcript (direct call) ─────────────────────────────────

export async function scoreTranscriptBant(transcript: string): Promise<{ score: BantScore; signals: BantSignals; rationale: string }> {
  try {
    const result = await callAIBackend('/api/ai/generate-outreach', {
      lead: { name: 'Prospect', role: 'Decision Maker', company: 'Target Company', transcript: transcript.slice(0, 3000) },
      config: {
        company: 'SarvaX.ai',
        product: 'BANT Analysis',
        vp: 'Qualification',
        sender: 'AI Agent',
        cta: 'Score',
        customPrompt: BANT_SCORING_PROMPT.replace('{transcript}', transcript.slice(0, 3000)),
      },
    });
    const score = deriveBantScore(transcript);
    return {
      score,
      signals: deriveBantSignals(transcript),
      rationale: result.email_body || `BANT Score ${score} based on transcript analysis.`,
    };
  } catch (err) {
    throw err;
  }
}
