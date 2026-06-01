# Product Requirement Document (PRD): Zyntra B2B CRM & AI Outreach Platform
**Version 2.0 — Revised for Salesperson Workflow**

---

## 1. Executive Summary

Zyntra is a B2B sales automation CRM built around the way salespeople actually work — not around dashboards for dashboards' sake. The core loop is simple: **import leads → qualify them → send AI-crafted outreach → track responses → close**. Every screen in Zyntra serves this loop. Clutter that doesn't serve the pipeline is hidden or removed.

The platform combines a Kanban-first lead board, per-lead AI outreach generation (WhatsApp, Email, LinkedIn), a full message history timeline, prospect intelligence dossiers, and a robust AI routing engine — all accessible from a clean, collapsible sidebar.

---

## 2. Navigation & Sidebar Structure

The sidebar is collapsible and contains exactly five primary sections. No more, no less.

```
├── 🏠  Pipeline          ← Primary workspace (Kanban + Lead Profiles)
├── 🔍  Prospect Intel    ← Research & Dossiers
├── 📊  Analytics         ← Journey & Funnel Stats
├── 👥  Team              ← Member management
└── ⚙️  Settings          ← API keys, Webhooks, AI Routing (Admin only)
```

Campaigns are managed **inside** Pipeline, not as a top-level tab. This reduces cognitive load and reflects how a salesperson thinks: they think in leads, not in abstract campaign objects.

---

## 3. Module Specifications

---

### A. Pipeline (Primary Workspace)

This is where salespeople spend 80% of their time. It has two sub-views toggled at the top: **Kanban Board** and **List View**.

---

#### A1. Kanban Board *(Core Feature)*

The Kanban board is the default view when a salesperson opens Zyntra. It gives an immediate visual read of where every lead stands.

**Pipeline Columns (left to right):**

| Stage | Color | Meaning |
|---|---|---|
| Imported | Purple | Lead has been pulled in, not yet reviewed |
| Pending Action | Amber | Needs a decision — call, message, or disqualify |
| AI Generated | Blue | Outreach copy has been drafted, pending review/send |
| Outreach Sent | Emerald | At least one message has been dispatched |
| Responded | Teal | Lead replied on any channel |
| Failed / Disqualified | Red | Bounced, unsubscribed, or manually removed |

**Card Behavior:**
- Each card shows: Lead name, company, title, lead score badge, and active channel indicators (📧 📱 🔗).
- **Drag-and-drop** moves a lead between stages instantly. Stage change is logged in the lead's activity timeline.
- Clicking a card opens the **Lead Profile Drawer** (see A3) without leaving the Kanban view.
- Column headers show live counts and a %-of-total so reps can spot bottlenecks instantly.
- Columns are filterable by campaign, assigned rep, lead score range, and date added.

---

#### A2. List View

A compact tabular alternative for power users who manage high-volume pipelines.

- Columns: Name, Company, Title, Score, Stage, Last Activity, Channels, Assigned Rep.
- Sortable and filterable on every column.
- Bulk actions: reassign, move stage, delete, export to CSV.
- Inline expand row to preview the lead summary without opening the full drawer.

---

#### A3. Lead Profile Drawer *(Replaces Separate Outreach Page)*

Clicking any lead — from Kanban or List — opens a right-side drawer. This is the single place for everything about that lead. There is no separate outreach page.

The drawer has four tabs:

---

**Tab 1 — Overview**
- Full contact details: name, title, company, email, phone, LinkedIn URL.
- Lead score with scoring rationale (seniority, company size, engagement signals).
- Editable notes field.
- Stage selector (dropdown, mirrors Kanban column).
- Assigned rep with reassignment control.

---

**Tab 2 — AI Outreach** *(Core Feature)*

This is where AI-generated messages live. The rep never needs to leave this drawer to review, edit, or send.

**How it works:**

1. On lead import (or on-demand via "Generate" button), Zyntra's AI drafts personalized outreach for all three channels simultaneously.
2. The rep sees three message panels side by side (or stacked on mobile):

```
┌─────────────────────────────────────────────────────────────────────┐
│  📧 Email Draft                                                      │
│  Subject: [Auto-generated subject line]                              │
│  Body: [Personalized 3-paragraph cold email]                        │
│  [ Edit ]  [ Regenerate ]  [ Send Now ▸ ]                           │
├─────────────────────────────────────────────────────────────────────┤
│  💬 WhatsApp Draft                                                   │
│  [Concise, conversational 2-line message]                           │
│  [ Edit ]  [ Regenerate ]  [ Send Now ▸ ]                           │
├─────────────────────────────────────────────────────────────────────┤
│  🔗 LinkedIn Draft                                                   │
│  [Connection note or InMail — professional tone, under 300 chars]   │
│  [ Edit ]  [ Regenerate ]  [ Send Now ▸ ]                           │
└─────────────────────────────────────────────────────────────────────┘
```

3. Each channel has independent **Edit**, **Regenerate**, and **Send Now** controls.
4. "Send Now" dispatches the message via the connected integration (Gmail/SMTP for email, WhatsApp Business API, LinkedIn API) and moves the lead to "Outreach Sent" on the Kanban automatically.
5. Reps can schedule sends (e.g., "Send tomorrow at 9 AM IST").
6. Tone selector per channel: Professional / Friendly / Direct / Follow-Up.

> **Design note:** There is no standalone "Outreach Engine" tab in the sidebar. All outreach flows through the Lead Profile Drawer. This eliminates the context-switch that causes reps to lose track of who they're writing to.

---

**Tab 3 — Message History**

A chronological activity feed showing every message ever sent to this lead, across all channels, in one unified timeline.

```
Timeline:
  ● [May 28, 2026 — 10:14 AM]  📧 Email sent — "Following up on our AI demo"
      Status: Opened ✓  Clicked ✓
  ● [May 26, 2026 — 3:02 PM]   🔗 LinkedIn connection request sent
      Status: Pending
  ● [May 25, 2026 — 9:30 AM]   💬 WhatsApp sent — "Hi Rahul, just wanted to..."
      Status: Delivered ✓  Read ✓
```

- Each entry shows: timestamp, channel icon, message preview, and delivery/read status.
- Tapping an entry expands the full message body.
- Filter timeline by channel (All / Email / WhatsApp / LinkedIn).
- Reply directly from the timeline if a response was received.

---

**Tab 4 — Intelligence**

A compact view of the prospect's auto-generated dossier (pulled from Prospect Intel module).

- Company overview, tech stack signals, pain points, suggested value props.
- Link to open the full dossier in the Prospect Intel module.
- "Re-research" button triggers a fresh deep-research pull.

---

#### A4. Campaign Management (Inside Pipeline)

Campaigns are not a standalone page — they are **filters and containers** applied to the Pipeline view.

- A top-bar dropdown lets reps switch between campaigns: "All Leads," "Campaign: Q3 Enterprise Push," etc.
- New campaigns are created from this dropdown: name, description, start date, target segment.
- Campaign-level stats (total leads, outreach sent, response rate, conversion rate) appear as a collapsible banner at the top of the Pipeline board when a specific campaign is selected.
- PDF Campaign Report is downloadable from the campaign banner.
- CSV import drops leads directly into the selected campaign.

---

### B. Prospect Intelligence

Used before or during outreach to understand a company or executive deeply.

**Search & Generate Dossier:**
- Input: executive name, company name, role, or LinkedIn URL.
- Output: a structured intelligence report containing company background, recent news signals, likely pain points, recommended value propositions, and conversation entry points.
- Generated reports are saved to the Dossier Repository automatically.

**Dossier Repository:**
- List of all saved research documents with: target name, company, date generated, and a one-line summary.
- Each dossier links to the related lead profile if one exists.
- Export individual dossiers as PDF or copy key sections to clipboard.

---

### C. Analytics (Lead Journey)

Replaces what was called "Lead Journey Analytics." Simplified to three views:

**Funnel View:** Visual conversion waterfall — how many leads move from Imported → Outreach Sent → Responded → Closed. Shows drop-off rates at each stage.

**Score Distribution:** Histogram of lead quality scores across the active pipeline. Highlights the concentration of high-value vs low-value leads.

**Activity Feed:** Team-level activity log — messages sent, leads moved, dossiers generated — filterable by rep and date range.

No vanity charts. Every chart in Analytics connects to a decision a sales manager actually makes.

---

### D. Team

- Add/remove team members with roles: Super Admin, CRO Consultant, Sales Representative.
- Assign leads or campaigns to specific reps.
- Per-rep performance stats: leads owned, outreach sent this week, response rate, conversion rate.
- Activity audit trail per member.

---

### E. Settings

Accessible to admins only. Consolidated into a single settings page with tabbed sections:

**API & Webhooks:**
- Generate and rotate REST API keys (prefixed by subdomain anchor).
- Define webhook endpoints for events: `lead.created`, `outreach.sent`, `lead.responded`, `lead.stage_changed`.
- Webhook test log with chronological payload history.

**AI Routing (Super Admin):**
- Configure primary and fallback LLM models for outreach generation:
  - Primary: Gemini 2.0 Pro/Flash, GPT-4o
  - Fallback: NVIDIA NIM (Llama 3.3 70B, Gemma-3N-it), OpenRouter
- Per-model: toggle active, set custom API key, view latency stats, trigger health ping.
- Failover audit log: shows when and why the system switched models, with timestamps and latency deltas.

**Integrations:**
- Connect Gmail / SMTP for email sending.
- Connect WhatsApp Business API.
- Connect LinkedIn for InMail and connection requests.
- Connect CRM exports: HubSpot, Salesforce (push/pull sync).

---

### F. CSV Import

Available from any Pipeline view via a persistent "Import Leads" button.

- Drag-and-drop or paste raw CSV.
- Auto-maps columns: First Name, Last Name, Company, Title, Email, Phone, LinkedIn URL, Apollo ID, Sector.
- Preview mapped data before confirming import.
- Lead score calculated automatically on import based on title seniority, company size signals, and sector weighting.
- Imported leads land in the "Imported" column of the active campaign's Kanban.

---

## 4. Key UX Principles (What Was Fixed)

| Before | After |
|---|---|
| "Outreach Engine" was a separate top-level module | Outreach lives inside each Lead Profile — no context switching |
| Kanban was buried inside the Outreach Engine | Kanban is the default landing view of the app |
| No message history per lead | Unified timeline of all sent messages per lead |
| Campaigns were a standalone section | Campaigns are filters inside Pipeline |
| 6 sidebar items creating navigation overhead | 5 focused sidebar items matching the salesperson's mental model |
| Separate page for drafting + reviewing copy | Review and send directly from Lead Profile drawer |

---

## 5. Recommended Additions for Enterprise-Grade Product

The following features are not in the current scope but would meaningfully elevate Zyntra to an enterprise-ready platform:

### 5.1 AI Reply Detection & Smart Follow-Up Sequences
Automatically detect when a lead replies (email, LinkedIn, WhatsApp) and pause further outreach. Trigger a suggested reply draft for the rep to review. Set multi-step sequences (Day 1 email → Day 3 LinkedIn → Day 7 WhatsApp) that pause intelligently on response.

### 5.2 Lead Enrichment Engine
On import, automatically enrich lead records using third-party data (Clearbit, Apollo, Hunter.io) to fill in missing emails, phone numbers, LinkedIn URLs, company headcount, funding stage, and technology stack. Flag enriched fields visually so reps know what was auto-filled.

### 5.3 Email & LinkedIn Inbox Integration
Surface reply threads from Gmail and LinkedIn directly inside the Lead Profile drawer. Reps never need to leave Zyntra to respond. Full two-way sync — send from Zyntra, replies appear in Zyntra.

### 5.4 Lead Scoring with Behavioral Signals
Augment the static import-time score with real-time behavioral signals: email open rate, link clicks, website visits (via pixel), LinkedIn profile views. Automatically escalate high-engagement leads to "Hot" status and surface them in a priority queue on the Kanban.

### 5.5 Meeting Scheduler Integration
Add a "Book a Call" action inside the Lead Profile that generates a Calendly/Cal.com link and inserts it into the outreach copy. When a meeting is booked, automatically move the lead to a "Meeting Scheduled" stage on the Kanban and notify the assigned rep.

### 5.6 A/B Outreach Testing
For campaigns with large lead lists, let admins define two outreach variants (e.g., different subject lines or CTAs) and split the audience 50/50. Report open rates, reply rates, and conversions per variant with statistical significance indicators.

### 5.7 Conversation Intelligence (Call Recording & Transcription)
Integrate with Zoom, Google Meet, or a VoIP provider. Auto-transcribe sales calls, extract action items, and link the transcript to the lead's activity timeline. AI highlights objections raised, buying signals, and suggested next steps.

### 5.8 Role-Based Pipeline Visibility
Sales reps see only their assigned leads. Managers see their team's pipeline. CRO consultants get a cross-campaign aggregate view. Enforced at the data layer, not just the UI.

### 5.9 Custom Lead Stages per Campaign
Allow admins to define custom Kanban column names per campaign. A campaign targeting enterprise accounts might have stages like "Champion Identified" or "Legal Review" that don't apply to SMB campaigns.

### 5.10 Slack / Teams Notifications
Push real-time alerts to Slack or Microsoft Teams when a lead replies, books a meeting, or changes stage. Rep-level digests at the start of each day: "You have 4 leads in Pending Action."

---

*Document Version 2.0 — Updated by: Zyntra Product Team*
*Changes from v1.0: Kanban promoted to primary view; outreach consolidated into Lead Profile drawer; message history added; Campaign section restructured; enterprise feature roadmap added.*
