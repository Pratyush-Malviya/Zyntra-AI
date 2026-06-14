# Multi-Tenant CRM + AI Outreach Engine
## Implementation Guide — C3A Labs / SarvaX.ai

> Based on the Sales Process Playbook v1.0 · June 2026  
> All 40 repositories listed are free and open-source (MIT or Apache 2.0 licensed)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Stack at a Glance](#2-stack-at-a-glance)
3. [Repository Reference — All 40 Repos](#3-repository-reference)
   - [CRM Foundation](#crm-foundation)
   - [Frontend & UI](#frontend--ui)
   - [Backend & Database](#backend--database)
   - [Auth & Multi-tenancy](#auth--multi-tenancy)
   - [AI Model Management](#ai-model-management)
   - [AI Workflow Builder](#ai-workflow-builder)
   - [Prospect Research](#prospect-research)
   - [Outreach Engine](#outreach-engine)
   - [Meeting Intelligence](#meeting-intelligence)
   - [Analytics & Observability](#analytics--observability)
   - [Search & Data](#search--data)
   - [DevOps & Self-hosting](#devops--self-hosting)
4. [Implementation by Playbook Activity](#4-implementation-by-playbook-activity)
5. [Integration Map](#5-integration-map)
6. [Free Hosting Plan](#6-free-hosting-plan)
7. [Environment Variables](#7-environment-variables)
8. [Getting Started Checklist](#8-getting-started-checklist)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND  (Next.js + shadcn/ui + Tailwind)                         │
│  ┌───────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  CRM Pipeline │  │  Outreach  │  │  Research  │  │  Meetings │  │
│  │  Kanban Board │  │  Manager   │  │  Reports   │  │  Intel    │  │
│  └───────────────┘  └────────────┘  └────────────┘  └───────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ tRPC + REST + Socket.io
┌──────────────────────────────▼──────────────────────────────────────┐
│  BACKEND  (Next.js API Routes + Node.js services)                   │
│  ┌───────────────┐  ┌────────────────┐  ┌──────────────────────┐   │
│  │  Auth (Auth.js)│  │  CRM Engine    │  │  AI Orchestration    │   │
│  │  + Permify    │  │  (Twenty API)  │  │  (LangGraph Agents)  │   │
│  └───────────────┘  └────────────────┘  └──────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│  DATA LAYER  (Supabase / PostgreSQL + Prisma ORM)                   │
│  Multi-tenant with Row-Level Security (org_id isolation)            │
└──────────────┬─────────────────────────────┬───────────────────────┘
               │                             │
┌──────────────▼──────────────┐  ┌──────────▼──────────────────────── ┐
│  AI LAYER                   │  │  INTEGRATION LAYER                  │
│  LiteLLM Gateway            │  │  n8n Workflow Automation            │
│  LangGraph Agents           │  │  Listmonk Email Sequences           │
│  Ollama Local LLMs          │  │  Mautic Lead Scoring                │
│  Flowise / Dify (no-code)   │  │  Whisper Meeting Transcription      │
│  Vercel AI SDK              │  │  Meilisearch Instant Search         │
└─────────────────────────────┘  └─────────────────────────────────────┘
```

---

## 2. Stack at a Glance

| Layer | Repository | Role | Free Tier |
|-------|-----------|------|-----------|
| CRM Base | `twentyhq/twenty` | Core CRM engine — pipeline, contacts, companies | Self-host free |
| Frontend | `vercel/next.js` | Full-stack React framework | Vercel free tier |
| UI Components | `shadcn-ui/ui` | Copy-paste component library | Open-source |
| CSS | `tailwindlabs/tailwindcss` | Utility-first styling | Open-source |
| Headless UI | `radix-ui/primitives` | Accessible, unstyled primitives | Open-source |
| Database | `supabase/supabase` | PostgreSQL + Auth + Realtime + RLS | Free (500MB) |
| ORM | `prisma/prisma` | Type-safe DB queries + migrations | Open-source |
| API Layer | `trpc/trpc` | End-to-end type-safe API | Open-source |
| Realtime | `socketio/socket.io` | Live pipeline board + agent status | Open-source |
| Auth | `nextauthjs/next-auth` | OAuth + magic links + sessions | Open-source |
| Authorization | `permify/permify` | Multi-tenant RBAC/ABAC | Self-host free |
| Permissions UI | `casl/casl` | In-app access control checks | Open-source |
| LLM Gateway | `BerriAI/litellm` | Route to any model via one API | Open-source |
| Agent Framework | `langchain-ai/langchainjs` | LLM chaining and retrieval | Open-source |
| Agent Orchestration | `langchain-ai/langgraph` | Stateful multi-agent workflows | Open-source |
| AI SDK | `vercel/ai` | Streaming + structured outputs | Open-source |
| Local LLMs | `ollama/ollama` | Run LLMs locally — zero API cost | Open-source |
| No-code AI | `dify-ai/dify` | Visual AI workflow platform | Self-host free |
| Visual AI Builder | `FlowiseAI/Flowise` | Drag-and-drop LLM flows | Self-host free |
| Workflow Automation | `n8n-io/n8n` | 400+ integrations + AI nodes | Fly.io free |
| Web Scraping | `mendableai/firecrawl` | Website → LLM-ready Markdown | Self-host free |
| AI Crawler | `unclecode/crawl4ai` | Async crawler for agent pipelines | Open-source |
| Research Agent | `assafelovic/gpt-researcher` | Autonomous prospect brief generator | Open-source |
| Browser Automation | `browser-use/browser-use` | AI-controlled browser for scraping | Open-source |
| Email Campaigns | `listmonk/listmonk` | Email sequences + analytics | Self-host free |
| Marketing Automation | `mautic/mautic` | Lead scoring + campaign branching | Self-host free |
| Email Delivery | `postal/postal` | Self-hosted SMTP server | Self-host free |
| Transcription | `openai/whisper` | Meeting recording → text | Open-source |
| Fast Transcription | `ggerganov/whisper.cpp` | C++ Whisper — 5x faster, CPU-only | Open-source |
| Desktop Transcription | `thewh1teagle/vibe` | No-setup local meeting transcription | Open-source |
| Product Analytics | `PostHog/posthog` | Pipeline funnels + session recording | 1M events/mo free |
| LLM Observability | `langfuse/langfuse` | Trace agents + log costs + run evals | Free cloud tier |
| Error Monitoring | `highlight/highlight` | Full-stack replay + error tracking | Free tier |
| Fast Search | `meilisearch/meilisearch` | Typo-tolerant instant lead search | Self-host free |
| Faceted Search | `typesense/typesense` | Filtered + geo search for contacts | Self-host free |
| Self-hosted PaaS | `caprover/caprover` | One-click Docker app deployment | Free on any VPS |
| Git Push Deploy | `dokku/dokku` | Heroku-like deploy from Git | Free on any VPS |
| Secrets Mgmt | `hashicorp/vault` | API keys + credential management | Self-host free |

---

## 3. Repository Reference

---

### CRM Foundation

---

#### `twentyhq/twenty`
**GitHub**: https://github.com/twentyhq/twenty  
**What it is**: The most complete open-source CRM available. Ships with contacts, companies, pipeline stages, tasks, notes, and a polished React UI. Think HubSpot, but self-hosted and free.  
**Where to use it**: This is your CRM core. Map its 8 default pipeline stages to the stages in the playbook. Extend its data model with BANT scoring fields, lead source, affiliate attribution, and research report links.

**Install**:
```bash
git clone https://github.com/twentyhq/twenty.git
cd twenty
cp .env.example .env
# Set DATABASE_URL and STORAGE_TYPE in .env
docker-compose up -d
# Access at http://localhost:3000
```

**Customisations for the playbook**:
- Add custom fields: `BANT Score (A/B/C/D)`, `Lead Source`, `Affiliate Partner`, `Research Report URL`, `ICP Segment`
- Configure pipeline stages exactly as the playbook defines: `Lead Identified → Meeting Booked → Discovery Completed → Demo Scheduled → Demo Completed → Proposal/Pilot → Closing → Customer Handoff`
- Use the Twenty API to push data from AI agents automatically

---

#### `erxes/erxes`
**GitHub**: https://github.com/erxes/erxes  
**What it is**: CRM + experience management platform with built-in plugins for marketing, sales, customer support, and a unified inbox.  
**Where to use it**: Use as an alternative to Twenty if you also need multi-channel inbox (email, WhatsApp, LinkedIn messages) and built-in marketing automation in one UI. Better suited for multi-product scenarios (SarvaX.ai + KaraX.ai under one platform).

**Install**:
```bash
git clone https://github.com/erxes/erxes.git
cd erxes
docker-compose up -d
```

---

#### `cortezaproject/corteza`
**GitHub**: https://github.com/cortezaproject/corteza  
**What it is**: Low-code CRM platform with drag-and-drop form builder, workflow automation rules, and a REST API.  
**Where to use it**: Use as the client-facing portal. Build custom-branded discovery questionnaires (from the playbook), proposal review screens, and pilot sign-off forms for clients — while Twenty handles the internal sales pipeline.

**Install**:
```bash
docker run -p 80:80 cortezaproject/corteza:latest
```

---

### Frontend & UI

---

#### `vercel/next.js`
**GitHub**: https://github.com/vercel/next.js  
**What it is**: Full-stack React framework. App Router + Server Actions + API Routes + Edge Runtime in one repository.  
**Where to use it**: Your entire frontend and backend API lives here. Use App Router for the CRM dashboard, pipeline Kanban board, research report viewer, outreach manager, meeting notes screen, and admin settings. Server Actions replace most REST calls for form submissions.

**Install**:
```bash
npx create-next-app@latest crm-app --typescript --tailwind --app
cd crm-app
npm run dev
```

---

#### `shadcn-ui/ui`
**GitHub**: https://github.com/shadcn-ui/ui  
**What it is**: Radix UI + Tailwind CSS components you copy directly into your project. Not a dependency — you own the code and can modify every component.  
**Where to use it**: Build your entire CRM interface with these components. Specifically:
- `DataTable` → Lead list view with sorting and filtering
- `Dialog` → Lead detail drawer / research report modal
- `Command` → Global search palette (Cmd+K)
- `Card` → Pipeline stage cards and metric summaries
- `Form` + `Select` → BANT qualification form, lead creation

**Install**:
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add table card dialog form command select badge tabs
```

---

#### `tailwindlabs/tailwindcss`
**GitHub**: https://github.com/tailwindlabs/tailwindcss  
**What it is**: Utility-first CSS framework. Included by default in the Next.js setup above.  
**Where to use it**: All styling in the app. Recommended colour conventions for the playbook:
- `blue` → active CRM stages and primary actions
- `green` → qualified leads (A leads), closed deals
- `amber` → in-progress leads, pending tasks
- `red` → at-risk deals, overdue follow-ups
- `slate` → neutral UI chrome, sidebar, headers

**Install**: Included automatically with `create-next-app --tailwind`.

---

#### `radix-ui/primitives`
**GitHub**: https://github.com/radix-ui/primitives  
**What it is**: The headless, accessible UI primitive layer underneath shadcn/ui. Dropdowns, tooltips, popovers, select menus, tabs — fully accessible with keyboard navigation and ARIA built in.  
**Where to use it**: Use directly when shadcn/ui does not have the exact component you need:
- Multi-select tag input for ICP segments
- Custom pipeline stage dropdown with exit criteria tooltip
- BANT score selector with inline descriptions
- Keyboard-navigable lead command menu

**Install**:
```bash
npm install @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-select
```

---

### Backend & Database

---

#### `supabase/supabase`
**GitHub**: https://github.com/supabase/supabase  
**What it is**: Firebase alternative. PostgreSQL + Row-Level Security + Auth + Realtime + Storage — all in one platform with a generous free tier.  
**Where to use it**: Primary database for the entire application. Every table scoped by `org_id` for multi-tenancy.

**Core tables**:
```
organizations    — multi-tenancy root (one row per customer org)
profiles         — users linked to org_id + role
leads            — CRM records with stage, BANT score, source
contacts         — persons linked to leads and companies
companies        — prospect organisations
research_reports — AI-generated prospect briefs
email_sequences  — outreach campaign definitions and status
meetings         — recorded calls with transcript and notes
affiliates       — partner records with referral tracking
```

**Multi-tenancy RLS policy** (apply to every table):
```sql
-- Add org_id to every table
ALTER TABLE leads ADD COLUMN org_id UUID REFERENCES organizations(id);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: users see only their org's data
CREATE POLICY "tenant_isolation" ON leads
  USING (org_id = (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));
```

**Install (cloud — recommended)**:
1. Create project at supabase.com (free)
2. Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`

**Install (self-hosted)**:
```bash
git clone https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
docker-compose up -d
```

---

#### `prisma/prisma`
**GitHub**: https://github.com/prisma/prisma  
**What it is**: TypeScript ORM with auto-generated migrations, a visual data browser, and full type safety on every database query.  
**Where to use it**: Use alongside Supabase for all complex queries, migrations, and type-safe DB access from Next.js API routes. Define the schema once in `schema.prisma` — Prisma generates the typed client automatically.

**Install**:
```bash
npm install prisma @prisma/client
npx prisma init
```

**Schema example**:
```prisma
model Lead {
  id          String       @id @default(cuid())
  org_id      String
  name        String
  company     String
  stage       Stage        @default(LEAD_IDENTIFIED)
  bant_score  BantScore?
  source      String?
  created_at  DateTime     @default(now())
  org         Organization @relation(fields: [org_id], references: [id])
  meetings    Meeting[]
  emails      EmailLog[]
}

enum Stage {
  LEAD_IDENTIFIED
  MEETING_BOOKED
  DISCOVERY_COMPLETED
  DEMO_SCHEDULED
  DEMO_COMPLETED
  PROPOSAL_PILOT
  CLOSING
  CUSTOMER_HANDOFF
}

enum BantScore {
  A
  B
  C
  D
}
```

---

#### `trpc/trpc`
**GitHub**: https://github.com/trpc/trpc  
**What it is**: End-to-end type-safe API layer between Next.js frontend and backend. No code generation, no schemas — just TypeScript shared across both sides.  
**Where to use it**: Replace all REST API calls with tRPC procedures. Key procedures to define:

```typescript
// Example router
leads.list          // fetch pipeline with filters and pagination
leads.updateStage   // move a card on the Kanban board
leads.updateBant    // record BANT qualification score
research.generate   // trigger AI research agent for a prospect
research.getReport  // retrieve stored research brief
outreach.createSeq  // set up an email sequence for a lead
meetings.transcribe // submit audio file for Whisper processing
meetings.getSummary // get AI-generated meeting summary
affiliates.list     // list affiliate partners and their referrals
```

**Install**:
```bash
npm install @trpc/server @trpc/client @trpc/next @trpc/react-query @tanstack/react-query zod
```

---

#### `socketio/socket.io`
**GitHub**: https://github.com/socketio/socket.io  
**What it is**: Bidirectional, event-based realtime communication layer.  
**Where to use it**:
- Live Kanban board — when one SDR moves a lead, every user sees it update in real time without refreshing
- AI agent status stream — emit "Researching company..." → "Extracting pain points..." → "Report ready" as the agent runs
- Meeting transcription progress — stream Whisper output tokens to the frontend as they are generated
- Pipeline notifications — "New lead assigned to you", "Meeting booked for tomorrow"
- Daily dashboard — live count of leads by stage, updated as the team works

**Install**:
```bash
npm install socket.io socket.io-client
```

---

### Auth & Multi-tenancy

---

#### `nextauthjs/next-auth`
**GitHub**: https://github.com/nextauthjs/next-auth  
**What it is**: All-in-one authentication for Next.js. OAuth providers, email magic links, and JWT session management.  
**Where to use it**: Primary auth layer for the entire CRM. Configure three providers:
- LinkedIn OAuth — sales team login (relevant to your workflow)
- Google OAuth — for enterprise client access to proposal portals
- Email magic link — for affiliate partners who do not have Google/LinkedIn

JWT session must carry `org_id` and `role` — these are passed to Supabase RLS on every request.

**Install**:
```bash
npm install next-auth
```

**Configuration**:
```typescript
// app/api/auth/[...nextauth]/route.ts
export default NextAuth({
  providers: [
    LinkedInProvider({ clientId: process.env.LINKEDIN_CLIENT_ID, clientSecret: process.env.LINKEDIN_CLIENT_SECRET }),
    GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }),
    EmailProvider({ server: process.env.EMAIL_SERVER })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        // Fetch org_id and role from Supabase on first login
        const profile = await getProfileByEmail(user.email);
        token.org_id = profile.org_id;
        token.role   = profile.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.org_id = token.org_id;
      session.user.role   = token.role;
      return session;
    }
  }
});
```

---

#### `permify/permify`
**GitHub**: https://github.com/Permify/permify  
**What it is**: Google Zanzibar-inspired authorization engine. Runs as a microservice. Handles fine-grained, multi-tenant RBAC and ABAC.  
**Where to use it**: Enforce role-based access across every tenant in the CRM:

```
admin       → full access to all org data, settings, and billing
sales       → read/write own leads, read all org leads, view pipeline
sdr         → create leads, update assigned leads, cannot close or propose
affiliate   → view own referrals and commission data only
viewer      → read-only pipeline access (for Product/Engineering briefings)
```

**Install**:
```bash
docker run -p 3476:3476 ghcr.io/permify/permify serve
```

---

#### `casl/casl`
**GitHub**: https://github.com/casl/casl  
**What it is**: Isomorphic JavaScript permission library. Define and check access rules in the same language on both client and server.  
**Where to use it**: UI-level access control — hide and disable interface elements based on role so users never even see actions they cannot perform:

```typescript
// Hide "Close Deal" button for SDRs
const ability = defineAbilityFor(user);

{can(ability, 'close', 'Lead') && (
  <Button onClick={handleClose}>Close Deal</Button>
)}

// Disable proposal editing for viewers
<Button disabled={cannot(ability, 'edit', 'Proposal')}>
  Edit Proposal
</Button>
```

**Install**:
```bash
npm install @casl/ability @casl/react
```

---

### AI Model Management

---

#### `BerriAI/litellm`
**GitHub**: https://github.com/BerriAI/litellm  
**What it is**: A single OpenAI-compatible API endpoint that routes calls to any LLM — Claude, GPT-4, Gemini, Groq, Mistral, or local Ollama. Handles retries, fallbacks, and cost logging.  
**Where to use it**: Every AI call in the app goes through LiteLLM. Define routing rules by task type to maximise free usage:

```yaml
# litellm_config.yaml
model_list:
  - model_name: fast-free          # for quick tasks: email drafts, summaries
    litellm_params:
      model: groq/llama3-8b-8192
      api_key: os.environ/GROQ_API_KEY

  - model_name: smart-free         # for complex tasks: research reports, BANT scoring
    litellm_params:
      model: gemini/gemini-1.5-flash
      api_key: os.environ/GEMINI_API_KEY

  - model_name: local              # for sensitive internal data: never leaves your server
    litellm_params:
      model: ollama/llama3
      api_base: http://localhost:11434

  - model_name: premium            # fallback only: use sparingly
    litellm_params:
      model: claude-sonnet-4-6
      api_key: os.environ/ANTHROPIC_API_KEY
```

**Routing logic**:
- Email drafts → `fast-free` (Groq/Llama3)
- Research reports → `smart-free` (Gemini Flash)
- Internal deal notes / sensitive data → `local` (Ollama)
- Complex reasoning / client-facing output → `premium` (Claude, only when needed)

**Install**:
```bash
pip install litellm
litellm --config litellm_config.yaml --port 8000
```

---

#### `langchain-ai/langchainjs`
**GitHub**: https://github.com/langchain-ai/langchainjs  
**What it is**: LLM chaining, retrieval, memory, and structured output extraction framework for JavaScript/TypeScript.  
**Where to use it**:
- Parse Firecrawl/web-scraped HTML into the 8-section prospect research format
- Extract BANT signals from raw discovery call transcripts
- Generate post-meeting follow-up email drafts from meeting notes
- Convert unstructured LinkedIn profile text into structured `Contact` records
- Build a RAG chain over your sales playbook PDF to answer SDR questions

**Install**:
```bash
npm install langchain @langchain/core @langchain/community @langchain/openai
```

---

#### `langchain-ai/langgraph`
**GitHub**: https://github.com/langchain-ai/langgraph  
**What it is**: Stateful multi-agent orchestration framework. Build agents that loop, branch, pause for human review, and recover from errors.  
**Where to use it**: Build the three core AI agents that run your playbook processes:

**Agent 1 — Pre-Call Research Agent** (triggered when meeting is booked):
```
START
  → Search company name + prospect name (SerpAPI / Tavily)
  → Scrape company website (Firecrawl)
  → Extract: overview, role, priorities, pain points
  → Match pain points to SarvaX.ai use cases
  → Generate discovery questions (tailored to ICP)
  → Write recommended pitch angle
  → Flag risks and objections
  → Store report in Supabase
  → Notify sales rep via Socket.io
END
```

**Agent 2 — Post-Meeting Intelligence Agent** (triggered after call):
```
START
  → Accept audio file or transcript
  → Transcribe with Whisper (if audio)
  → Extract: action items, pain points confirmed, objections raised
  → Score BANT (A/B/C/D) from conversation
  → Draft follow-up email (personalised, references specific pain)
  → Update CRM stage
  → Log meeting notes to Supabase
  → Queue follow-up email in Listmonk
END
```

**Agent 3 — Outreach Personalisation Agent** (triggered on new lead):
```
START
  → Scrape LinkedIn profile (browser-use)
  → Scrape company website (Firecrawl)
  → Identify ICP segment (Wealth Advisory / HR / Ops / Custom)
  → Score BANT signals from publicly available data
  → Select best email template for ICP segment
  → Personalise template with specific company pain + role
  → Queue sequence in Listmonk
  → Log outreach activity in CRM
END
```

**Install**:
```bash
pip install langgraph langchain langchain-community
```

---

#### `vercel/ai`
**GitHub**: https://github.com/vercel/ai  
**What it is**: Vercel AI SDK for Next.js — streaming text, tool use, structured object generation, and React hooks.  
**Where to use it**:
- Stream research report generation in real time to the frontend (user sees text appearing as it generates)
- `useChat` hook for the in-app AI assistant panel ("Summarise this lead's pain points", "Draft an objection response")
- `generateObject` with Zod schema for structured data extraction from meeting transcripts
- Stream email drafts character-by-character as they are composed by the agent

**Install**:
```bash
npm install ai
```

**Example — streaming a research report**:
```typescript
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const litellm = createOpenAI({ baseURL: 'http://localhost:8000' });

const result = await streamText({
  model: litellm('smart-free'),
  prompt: `Generate a prospect research brief for ${company} — ${prospect}`,
  onChunk: ({ chunk }) => { socket.emit('research-progress', chunk); }
});
```

---

#### `ollama/ollama`
**GitHub**: https://github.com/ollama/ollama  
**What it is**: Run LLMs locally on your machine or server — Llama 3, Mistral, Phi, Gemma. Zero API cost, data never leaves your device.  
**Where to use it**:
- All internal prospect research on sensitive deal data (no data sent to third-party APIs)
- Draft generation for EOD pipeline updates and internal memos
- Embedding generation for semantic search across contact notes and meeting transcripts
- Test and iterate on prompts locally before routing to paid models in production

**Install**:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3
ollama pull mistral
ollama serve   # exposes API at http://localhost:11434
```

---

### AI Workflow Builder

---

#### `dify-ai/dify`
**GitHub**: https://github.com/langgenius/dify  
**What it is**: Visual AI application platform with a no-code canvas, built-in RAG document pipeline, and API publishing. Non-technical users can build and run AI workflows.  
**Where to use it**:
- Build the prospect research workflow visually — no code required for SDRs to run it
- Create a discovery question generator: upload the sales playbook PDF as knowledge base, ask "What questions should I ask a wealth advisory prospect?"
- Build an objection handler app: input an objection, get a scripted response grounded in the playbook
- Publish each workflow as an API endpoint — call it from n8n or the Next.js backend

**Install**:
```bash
git clone https://github.com/langgenius/dify.git
cd dify/docker
cp .env.example .env
docker-compose up -d
# Access at http://localhost/
```

---

#### `FlowiseAI/Flowise`
**GitHub**: https://github.com/FlowiseAI/Flowise  
**What it is**: Drag-and-drop LLM flow builder with a node canvas. Wire agents, memory, tools, and APIs visually.  
**Where to use it**:
- Build the email personalisation pipeline visually (LinkedIn profile in → personalised email out)
- Create a BANT scoring agent (call transcript in → A/B/C/D score + justification out)
- Version-control your agent flows as JSON files in Git
- Use as the prototyping environment before moving a working flow into LangGraph production code

**Install**:
```bash
npm install -g flowise
npx flowise start
# Access at http://localhost:3000
```

---

#### `n8n-io/n8n`
**GitHub**: https://github.com/n8n-io/n8n  
**What it is**: Node-based workflow automation with 400+ integrations and native AI/LLM nodes. Your existing cold email workflow already runs on this.  
**Where to use it** (maps directly to playbook activities):

| Playbook Activity | n8n Workflow |
|-------------------|-------------|
| Meeting booked | Trigger → Research Agent → Send prep brief to sales rep → Calendar reminder |
| Pre-call prep | Trigger → Generate tailored deck outline → Create discovery question list |
| Post-meeting follow-up | Trigger → Transcribe audio → Extract actions → Draft email → Update CRM |
| Lead qualified | Trigger → Score BANT → Notify SDR → Queue outreach sequence |
| Daily pipeline review | 8am cron → Pull all active leads → Generate EOD summary → Post to Slack/email |
| Affiliate onboarding | New affiliate signed → Send welcome kit → Create referral link → Add to Listmonk sequence |
| CRM daily upkeep | 9am cron → Flag stale leads → Remind sales rep of follow-ups → Update stage counts |

**Install**:
```bash
docker run -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
# Access at http://localhost:5678
```

---

### Prospect Research

---

#### `mendableai/firecrawl`
**GitHub**: https://github.com/mendableai/firecrawl  
**What it is**: Turn any website into clean, LLM-ready Markdown. Handles JavaScript rendering, pagination, and sub-page crawling automatically.  
**Where to use it**:
- Scrape prospect company websites for the "Likely pain points" section of the research report
- Extract pricing pages to identify if they are already paying for competing tools (BANT budget signal)
- Scrape LinkedIn company pages for headcount, recent hires, and growth signals
- Pull press releases and news for the "Business priorities" section

**Install (self-hosted)**:
```bash
git clone https://github.com/mendableai/firecrawl.git
cd firecrawl
docker-compose up -d
```

**Usage**:
```python
from firecrawl import FirecrawlApp
app = FirecrawlApp(api_url='http://localhost:3002')
result = app.scrape_url('https://wealthfirm.com', params={'formats': ['markdown']})
print(result['markdown'])   # clean, LLM-ready text
```

---

#### `unclecode/crawl4ai`
**GitHub**: https://github.com/unclecode/crawl4ai  
**What it is**: Async, AI-optimised web crawler. Give it a URL and a Pydantic data schema — get structured data back.  
**Where to use it**:
- Extract structured company data (employee count, tech stack, funding) from web pages automatically
- Batch-crawl a list of prospect URLs overnight and populate CRM company fields
- Scrape job postings to infer operational pain points (e.g. "Hiring 5 ops managers" = scaling problem → SarvaX fit)

**Install**:
```bash
pip install crawl4ai
playwright install
```

---

#### `assafelovic/gpt-researcher`
**GitHub**: https://github.com/assafelovic/gpt-researcher  
**What it is**: Autonomous research agent. Given a question, it plans sub-questions, searches the web, scrapes sources, and writes a structured research report.  
**Where to use it**: Primary generator of the pre-call research brief. The output maps directly to the 8-section report format defined in your playbook.

**Example usage**:
```python
from gpt_researcher import GPTResearcher

researcher = GPTResearcher(
    query="Research [Company] — wealth advisory firm. Identify: company overview, key decision-makers, business priorities, likely operational pain points, AI readiness, and potential objections to adopting a new platform.",
    report_type="research_report",
    report_format="markdown"
)

report = await researcher.run()
# Returns structured Markdown matching the playbook's 8-section format
```

**Install**:
```bash
pip install gpt-researcher
```

---

#### `browser-use/browser-use`
**GitHub**: https://github.com/browser-use/browser-use  
**What it is**: AI-controlled browser automation. Give it a plain-English task — it navigates, extracts, and returns structured results.  
**Where to use it**:
- "Open this LinkedIn profile and extract job title, company, recent posts, and shared connections" → auto-populate contact record
- "Find the Head of Operations email at [company]" → lead enrichment
- Navigate and extract data from websites that block standard scrapers
- Fill demo scheduling forms automatically when a lead requests a demo

**Install**:
```bash
pip install browser-use
playwright install chromium
```

---

### Outreach Engine

---

#### `listmonk/listmonk`
**GitHub**: https://github.com/listmonk/listmonk  
**What it is**: Self-hosted email campaign and sequence manager. Handles subscriber lists, drip sequences, template rendering, click/open tracking, and a full REST API.  
**Where to use it**:
- Cold outreach sequences: 3-touch sequence (Day 1 → Day 4 → Day 8) per ICP segment
- Affiliate onboarding sequences: Welcome → Training materials → First referral nudge → Commission update
- Warm nurture sequences: Monthly product update for C-leads and uninterested prospects
- API-trigger a sequence from n8n the moment a new qualified lead is added to the CRM

**Install**:
```bash
docker-compose up -d   # using official docker-compose.yml from the repo
# Access at http://localhost:9000
```

---

#### `mautic/mautic`
**GitHub**: https://github.com/mautic/mautic  
**What it is**: Open-source marketing automation platform with lead scoring, campaign branching, and multi-channel tracking.  
**Where to use it**:
- Lead scoring:
  - +10 points — opened outreach email
  - +20 points — clicked demo link
  - +30 points — visited pricing page
  - +50 points — replied to email
  - -10 points — unsubscribed
- Score threshold: 70+ → auto-notify SDR for immediate follow-up call
- Campaign branching: if lead opens email 1 but not email 2 after 3 days → send variant with different subject line
- Track which content (ROI sheet, one-pager, demo video) drives the most downstream engagement

**Install**:
```bash
git clone https://github.com/mautic/docker-mautic.git
cd docker-mautic
docker-compose up -d
```

---

#### `postal/postal`
**GitHub**: https://github.com/postalserver/postal  
**What it is**: Self-hosted email delivery server — your own SendGrid or Mailgun. Full SMTP relay with delivery analytics.  
**Where to use it**:
- SMTP relay for both Listmonk and Mautic (all outbound email routes through your own server)
- Dedicated sending IP pools — separates cold outreach sending from transactional emails to protect domain reputation
- Delivery analytics: bounces, spam complaints, open tracking, click tracking
- Use a separate subdomain for cold outreach (e.g. `mail2.sarvax.ai`) to protect the main domain

**Install**:
```bash
git clone https://github.com/postalserver/postal.git
cd postal && docker-compose up -d
```

---

### Meeting Intelligence

---

#### `openai/whisper`
**GitHub**: https://github.com/openai/whisper  
**What it is**: OpenAI's open-source automatic speech recognition model. Runs 100% locally — no API cost, no data leaves your server.  
**Where to use it**: Transcribe all discovery call and demo recordings before feeding transcripts to the post-meeting AI agent.

**Install**:
```bash
pip install openai-whisper
```

**Usage**:
```python
import whisper

model = whisper.load_model("large-v3")   # highest accuracy
result = model.transcribe("discovery_call_2024_06.mp3")
print(result["text"])                    # full transcript as plain text
```

**Recommended models by use case**:
- `base.en` — fast, English-only, good for quick summaries
- `medium` — balanced speed and accuracy
- `large-v3` — highest accuracy, best for business conversations with domain terminology

---

#### `ggerganov/whisper.cpp`
**GitHub**: https://github.com/ggerganov/whisper.cpp  
**What it is**: C++ port of Whisper. 5–10x faster than the Python version, no GPU required, minimal memory footprint.  
**Where to use it**: Production transcription service. Wrap it in a FastAPI endpoint called by n8n when a meeting recording is uploaded.

**Install**:
```bash
git clone https://github.com/ggerganov/whisper.cpp.git
cd whisper.cpp
make
bash ./models/download-ggml-model.sh base.en
```

**Expose as HTTP endpoint**:
```python
# transcription_service.py (FastAPI wrapper)
from fastapi import FastAPI, UploadFile
import subprocess, tempfile, os

app = FastAPI()

@app.post("/transcribe")
async def transcribe(file: UploadFile):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await file.read())
        result = subprocess.run(
            ["./whisper.cpp/main", "-m", "./models/ggml-base.en.bin", "-f", tmp.name, "--output-txt"],
            capture_output=True, text=True
        )
    return {"transcript": result.stdout}
```

---

#### `thewh1teagle/vibe`
**GitHub**: https://github.com/thewh1teagle/vibe  
**What it is**: Desktop application for local meeting transcription using Whisper.cpp. No setup, no Python, no API keys — runs on macOS, Windows, and Linux.  
**Where to use it**: Immediate solution for the sales team before the server-side pipeline is built. Each sales rep installs Vibe, records calls locally, drops the audio file into Vibe, and gets a transcript they paste into the post-meeting n8n workflow.

**Install**: Download the latest release from https://github.com/thewh1teagle/vibe/releases for your OS.

---

### Analytics & Observability

---

#### `PostHog/posthog`
**GitHub**: https://github.com/PostHog/posthog  
**What it is**: Self-hostable product analytics with session recording, funnels, cohort analysis, feature flags, and A/B testing.  
**Where to use it**:
- Pipeline funnel analysis: visualise drop-off at each of the 8 sales stages
- Channel attribution: which outreach channel (LinkedIn / Email / Affiliate / Referral) produces the most Stage 3+ leads?
- Session recording: watch how SDRs use the CRM to identify workflow friction and UX issues
- Feature flags: roll out the new AI research panel to 20% of the team before full release
- Custom events to track:
  ```typescript
  posthog.capture('lead_stage_changed',       { from: 'meeting_booked', to: 'discovery_completed', lead_id });
  posthog.capture('research_report_viewed',   { lead_id, time_on_page });
  posthog.capture('outreach_email_sent',      { lead_id, template, channel });
  posthog.capture('meeting_transcribed',      { meeting_id, duration_seconds });
  ```

**Install (cloud)**: Sign up at posthog.com — 1 million events/month free, no credit card.

**Install (self-hosted)**:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/PostHog/posthog/HEAD/bin/deploy-hobby)"
```

---

#### `langfuse/langfuse`
**GitHub**: https://github.com/langfuse/langfuse  
**What it is**: LLM observability platform. Trace every agent call, log token costs, run prompt evaluations, and debug production failures.  
**Where to use it**:
- Trace every research report generation — see exactly which LLM calls ran, how long each took, and what they cost in tokens
- Alert when a research agent returns a low-confidence or hallucinated output
- A/B test prompts: is the "Problem-First" research prompt generating higher quality output than the "Company Overview" prompt?
- Track total AI spend per lead to calculate true cost-per-qualified-lead
- Session grouping: all LLM calls for one prospect research session grouped under one trace

**Install (cloud)**: Sign up at cloud.langfuse.com — free tier available.

**Install (self-hosted)**:
```bash
git clone https://github.com/langfuse/langfuse.git
cd langfuse
docker-compose up -d
```

---

#### `highlight/highlight`
**GitHub**: https://github.com/highlight/highlight  
**What it is**: Full-stack open-source observability. Session replay, frontend error tracking, backend error monitoring, and structured logging.  
**Where to use it**:
- Catch UI errors in the CRM pipeline board before sales reps report them verbally
- Session replay: when a rep says "the stage update button didn't work", watch the exact session
- Backend error tracking: failed AI agent calls, Whisper transcription errors, Listmonk API failures
- Structured logging: `H.log('research_report_generated', { lead_id, duration_ms, model_used, token_count })`

**Install**:
```bash
npm install @highlight-run/next
```

---

### Search & Data

---

#### `meilisearch/meilisearch`
**GitHub**: https://github.com/meilisearch/meilisearch  
**What it is**: Fast, typo-tolerant full-text search engine. Returns results in under 50ms.  
**Where to use it**:
- Instant lead and contact search — type "Eun" and immediately see "Eunice Koigu" with company and stage
- Search across all research reports — "find all leads where pain point mentions compliance"
- Global command palette (Cmd+K) — search leads, contacts, companies, emails, and tasks from anywhere in the CRM
- Sync Supabase tables to Meilisearch via an n8n webhook triggered on every insert/update

**Install**:
```bash
docker run -p 7700:7700 -e MEILI_MASTER_KEY='your-key' getmeili/meilisearch:latest
```

---

#### `typesense/typesense`
**GitHub**: https://github.com/typesense/typesense  
**What it is**: Open-source Algolia alternative. Faceted search, geo-filtering, and weighted ranking out of the box.  
**Where to use it**:
- Faceted lead search: filter simultaneously by industry, stage, geography, ICP segment, and BANT score
- Geo-search: "Show all leads within 100km of Nairobi" — useful for Kenya affiliate campaigns
- Auto-complete in outreach templates: type a company name and get suggestions from your database instantly

**Install**:
```bash
docker run -p 8108:8108 \
  -v /tmp/typesense-data:/data \
  typesense/typesense:latest \
  --data-dir /data --api-key=your-api-key
```

---

### DevOps & Self-hosting

---

#### `caprover/caprover`
**GitHub**: https://github.com/caprover/caprover  
**What it is**: Free, self-hosted PaaS. Deploy any Docker app with one click. SSL auto-managed via Let's Encrypt. Subdomain routing included.  
**Where to use it**: Deploy every service in the stack from one dashboard on a single VPS:

```
crm.yourdomain.com      → Next.js CRM app
n8n.yourdomain.com      → n8n workflow automation
mail.yourdomain.com     → Listmonk email campaigns
ai.yourdomain.com       → Dify AI platform
search.yourdomain.com   → Meilisearch
analytics.yourdomain.com → PostHog
trace.yourdomain.com    → Langfuse
flows.yourdomain.com    → Flowise
```

**Install** (run on a fresh Ubuntu 22.04 VPS, min 2GB RAM):
```bash
docker run -e ACCEPTED_TERMS=true \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /captain:/captain \
  -p 80:80 -p 443:443 -p 3000:3000 \
  caprover/caprover
```

---

#### `dokku/dokku`
**GitHub**: https://github.com/dokku/dokku  
**What it is**: Heroku-like self-hosted PaaS. Git push to deploy. Buildpacks and Dockerfile support.  
**Where to use it**: Deploy the Next.js CRM application specifically. Simpler than Caprover for code-based apps that deploy via Git. Use Caprover for all Docker-based services (n8n, Listmonk, etc.) and Dokku for the main app.

**Install**:
```bash
wget -NP . https://dokku.com/install/v0.34.4/bootstrap.sh
sudo DOKKU_TAG=v0.34.4 bash bootstrap.sh

# Deploy the CRM app
git remote add dokku dokku@your-vps-ip:crm-app
git push dokku main
```

---

#### `hashicorp/vault`
**GitHub**: https://github.com/hashicorp/vault  
**What it is**: Production secrets management. Centralised storage, rotation, and auditing of API keys, database credentials, and tokens.  
**Where to use it**:
- Store all API keys centrally: Gemini, Groq, Anthropic, Supabase, LinkedIn OAuth, Listmonk, Postal
- Rotate keys without redeploying any application
- Grant each service only the secrets it needs — n8n gets email API keys, Next.js gets DB credentials, agents get LLM keys
- Full audit log: every secret access is logged with timestamp and requesting service identity

**Install**:
```bash
docker run -p 8200:8200 \
  -e VAULT_DEV_ROOT_TOKEN_ID=root-token \
  hashicorp/vault server -dev
```

---

## 4. Implementation by Playbook Activity

---

### Activity: Pre-Call Research Report

**Triggered by**: Meeting booked (n8n webhook from calendar)

**Repos involved**: `gpt-researcher` → `firecrawl` → `crawl4ai` → `langchainjs` → `litellm` → `supabase` → `socketio`

**Flow**:
```
1. n8n receives meeting-booked webhook
2. Extracts prospect name, company, LinkedIn URL from CRM record
3. Calls gpt-researcher with research query
4. gpt-researcher uses firecrawl to scrape company website
5. crawl4ai extracts structured data: employee count, tech stack, recent news
6. LangChain structures data into the 8-section report format:
   - Company overview
   - Prospect role and background
   - Likely business priorities
   - Likely pain points
   - Relevant SarvaX.ai use cases
   - Suggested discovery questions
   - Recommended pitch angle
   - Risks and objections
7. LiteLLM routes to Gemini Free for final report generation
8. Report stored in Supabase (research_reports table)
9. Socket.io emits "report-ready" to sales rep's browser
10. n8n sends email summary of report to sales rep and internal stakeholders
```

---

### Activity: Discovery Call + Post-Meeting Processing

**Triggered by**: Audio file uploaded after call

**Repos involved**: `whisper.cpp` → `langgraph` → `langchainjs` → `vercel/ai` → `trpc` → `listmonk` → `socketio`

**Flow**:
```
1. Sales rep uploads call recording to CRM
2. tRPC endpoint receives upload → triggers n8n workflow
3. whisper.cpp transcription service processes audio → returns raw transcript
4. LangGraph post-meeting agent runs:
   a. Extract confirmed pain points from transcript
   b. Score BANT based on conversation signals
   c. Identify action items and next steps
   d. Draft personalised follow-up email referencing specific pain mentioned
5. CRM stage updated via tRPC
6. Follow-up email queued in Listmonk (sends within 2 hours)
7. Meeting notes stored in Supabase
8. Socket.io notifies rep: "Post-meeting processing complete"
```

---

### Activity: Cold Outreach Sequence

**Triggered by**: New qualified lead added (BANT score B or above)

**Repos involved**: `browser-use` → `firecrawl` → `langchainjs` → `litellm` → `listmonk` → `postal` → `mautic` → `n8n`

**Flow**:
```
1. n8n detects new lead with BANT score B+
2. browser-use scrapes LinkedIn profile for personalisation data
3. firecrawl scrapes company website for recent news and pain signals
4. LangChain selects outreach template based on ICP segment
5. LiteLLM (Groq/Llama3 — free) personalises template with scraped data
6. Email queued in Listmonk → 3-touch sequence over 8 days
7. Postal delivers email from dedicated sending domain
8. Mautic tracks engagement: opens, clicks, replies
9. If score reaches 70+: n8n notifies SDR for immediate follow-up
10. All activity logged back to CRM via tRPC
```

---

### Activity: Lead Qualification + BANT Scoring

**Repos involved**: `twenty` → `prisma` → `langgraph` → `posthog` → `trpc`

**Flow**:
```
1. SDR completes discovery call
2. BANT scoring agent analyses call transcript
3. Agent outputs: score (A/B/C/D) + supporting evidence for each dimension
4. SDR reviews and confirms score in the CRM UI (human-in-the-loop)
5. Stage advances to Discovery Completed in Twenty CRM
6. PostHog event fired: lead_qualified with BANT details
7. If A-lead: auto-schedule demo prep workflow in n8n
8. If D-lead: mark as poor fit, remove from active sequences
```

---

### Activity: Affiliate Partner Management

**Repos involved**: `nextauthjs/next-auth` → `casl` → `supabase` → `listmonk` → `posthog`

**Flow**:
```
1. New affiliate signs up → Auth.js issues session with role = 'affiliate'
2. CASL enforces affiliate-specific UI (sees only referral dashboard)
3. Supabase RLS isolates their data to their own referrals
4. n8n triggers welcome sequence in Listmonk (training PDFs, ICP guide, pitch materials)
5. Each referral generates a unique UTM-tracked link
6. PostHog tracks referral conversion through the pipeline
7. Commission calculated automatically on Closing stage event
```

---

## 5. Integration Map

```
Repository              Connects To                       Via
──────────────────────────────────────────────────────────────────────
Next.js (frontend)   ←→ Supabase                         Supabase JS client
                     ←→ tRPC procedures                   HTTP / React Query
                     ←→ Socket.io                         WebSocket
                     ←→ PostHog                           JS SDK
                     ←→ Highlight                         JS SDK

Supabase             ←→ Prisma                            DATABASE_URL
                     ←→ Auth.js                           Supabase Auth adapter
                     ←→ n8n                               Supabase webhook / REST API
                     ←→ Meilisearch                       n8n sync workflow

LiteLLM              ←→ Gemini API                        OpenAI-compatible REST
                     ←→ Groq API                          OpenAI-compatible REST
                     ←→ Ollama                            Local HTTP
                     ←→ Anthropic (fallback)              OpenAI-compatible REST

LangGraph agents     ←→ LiteLLM                           LangChain LLM wrapper
                     ←→ Firecrawl                         HTTP API
                     ←→ gpt-researcher                    Python module
                     ←→ Supabase                          REST API
                     ←→ Listmonk                          REST API

n8n                  ←→ Twenty CRM                        REST API
                     ←→ Listmonk                          REST API
                     ←→ LangGraph agents                  HTTP webhook / Python subprocess
                     ←→ whisper.cpp service               HTTP POST (audio upload)
                     ←→ Socket.io                         Emit events to frontend
                     ←→ Supabase                          REST API / Realtime webhook

Listmonk             ←→ Postal (SMTP relay)               SMTP
                     ←→ n8n                               REST API (trigger sequences)
                     ←→ Mautic                            Webhook on open/click events

Mautic               ←→ Listmonk                          Webhook (engagement events)
                     ←→ n8n                               Webhook (score threshold reached)
                     ←→ Supabase                          REST API (update lead score)

Langfuse             ←→ LiteLLM                           LiteLLM callback
                     ←→ LangGraph                         LangChain tracer callback

PostHog              ←→ Next.js frontend                  JS SDK
                     ←→ Next.js backend                   Node.js SDK

Meilisearch          ←→ Next.js frontend                  Meilisearch JS SDK
                     ←→ Supabase                          n8n sync on DB change
```

---

## 6. Free Hosting Plan

| Service | Host On | Monthly Cost | Free Tier Limit |
|---------|---------|-------------|-----------------|
| Next.js CRM App | Vercel | $0 | 100GB bandwidth, 100 deployments |
| PostgreSQL + Auth | Supabase Cloud | $0 | 500MB DB, 50k MAU auth |
| n8n Workflows | Fly.io (1 shared VM) | $0 | App sleeps when idle |
| Flowise | Render.com | $0 | Sleeps after 15 min inactivity |
| Dify | Fly.io | $0 | 3 shared VMs total |
| Langfuse | cloud.langfuse.com | $0 | 50k observations/month |
| PostHog | posthog.com | $0 | 1M events/month |
| Highlight | highlight.io | $0 | Limited sessions |
| LLM API (Gemini Flash) | Google AI Studio | $0 | 15 RPM, 1M tokens/day |
| LLM API (Groq) | groq.com | $0 | Rate-limited, generous |
| Local LLMs (Ollama) | Your machine | $0 | Unlimited (local) |
| Email sending (Resend) | resend.com | $0 | 3,000 emails/month |
| **Everything, no limits** | **1× VPS + Caprover** | **$6/month** | **Full control** |

**Recommended progression**:
1. Start with Vercel + Supabase cloud + Fly.io — $0/month, sufficient for early validation
2. When the team is active daily: move to a single $6/month DigitalOcean VPS with Caprover running all services in Docker
3. That single VPS handles: n8n, Listmonk, Langfuse, Meilisearch, Flowise, Dify, Postal, and PostHog simultaneously

---

## 7. Environment Variables

```env
# ─── Database ─────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ─── Auth ─────────────────────────────────────────────────────────
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=https://crm.yourdomain.com
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EMAIL_SERVER=smtp://resend:your-api-key@smtp.resend.com:465

# ─── LLMs — All Free Tiers ────────────────────────────────────────
GEMINI_API_KEY=              # Get at aistudio.google.com — free
GROQ_API_KEY=                # Get at console.groq.com — free
LITELLM_PROXY_URL=http://localhost:8000
ANTHROPIC_API_KEY=           # Fallback only — use sparingly

# ─── Outreach ─────────────────────────────────────────────────────
LISTMONK_URL=http://localhost:9000
LISTMONK_USERNAME=admin
LISTMONK_API_KEY=
RESEND_API_KEY=              # Get at resend.com — 3,000 emails/month free

# ─── Research ─────────────────────────────────────────────────────
FIRECRAWL_API_URL=http://localhost:3002   # Self-hosted
TAVILY_API_KEY=              # Free tier — used by gpt-researcher for web search
SERPER_API_KEY=              # Optional: serper.dev free tier (2,500 queries/month)

# ─── Observability ────────────────────────────────────────────────
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com
NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID=

# ─── Search ───────────────────────────────────────────────────────
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_MASTER_KEY=
TYPESENSE_HOST=localhost
TYPESENSE_API_KEY=

# ─── Authorization ────────────────────────────────────────────────
PERMIFY_ENDPOINT=http://localhost:3476

# ─── Secrets Management (production) ──────────────────────────────
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=

# ─── Transcription Service ────────────────────────────────────────
WHISPER_SERVICE_URL=http://localhost:8001   # Your whisper.cpp FastAPI wrapper

# ─── Realtime ─────────────────────────────────────────────────────
SOCKET_SERVER_URL=http://localhost:3001
```

---

## 8. Getting Started Checklist

**Week 1 — CRM Core**
- [ ] Fork `twentyhq/twenty` → configure the 8 pipeline stages from the playbook
- [ ] Set up Supabase project → run the multi-tenancy migration (add `org_id` to all tables → enable RLS policies)
- [ ] Deploy Next.js app to Vercel → install `shadcn-ui/ui` base components
- [ ] Configure Auth.js with LinkedIn + Google OAuth providers
- [ ] Create first organisation and user records in Supabase

**Week 2 — AI Layer**
- [ ] Install LiteLLM proxy with Gemini Free + Groq config
- [ ] Set up Langfuse cloud account → add tracing to all LLM calls
- [ ] Install Ollama locally → pull `llama3` for local/sensitive tasks
- [ ] Deploy Flowise on Render → build first email personalisation flow

**Week 3 — Research + Outreach**
- [ ] Self-host Firecrawl on Fly.io → test scraping 5 prospect websites
- [ ] Install gpt-researcher → run first prospect brief against a live prospect
- [ ] Install `browser-use` → test LinkedIn profile extraction
- [ ] Deploy n8n on Fly.io → import your existing cold email automation workflow

**Week 4 — Outreach Engine**
- [ ] Deploy Listmonk → configure the 3-touch cold outreach sequence per ICP
- [ ] Configure Resend as SMTP relay for Listmonk
- [ ] Set up Mautic → define lead scoring rules (see Section 4)
- [ ] Connect n8n → Listmonk → trigger sequences from new CRM leads

**Week 5 — Meeting Intelligence**
- [ ] Install Vibe on all sales reps' machines → test meeting transcription
- [ ] Set up whisper.cpp as a FastAPI service → test with real call recordings
- [ ] Build the post-meeting LangGraph agent → test end-to-end with a sample transcript

**Week 6 — Analytics + Polish**
- [ ] Configure PostHog → add the four core pipeline events (see Section 4)
- [ ] Deploy Meilisearch → sync Supabase contacts table via n8n
- [ ] Set up Highlight → instrument frontend and backend error tracking
- [ ] Move everything to a single VPS with Caprover if team is active daily

---

*Document version 1.0 · June 2026 · Internal — C3A Labs / SarvaX.ai*  
*All repositories listed are free and open-source. No paid licences required.*

---

## 9. Full Database Schema

Complete PostgreSQL schema for the multi-tenant CRM. Run this in Supabase SQL Editor in order.

```sql
-- ══════════════════════════════════════════════════════════════════
-- STEP 1: Core multi-tenancy tables
-- ══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organisations (one row per customer/tenant)
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  domain      TEXT UNIQUE,              -- e.g. wealthfirm.com
  plan        TEXT DEFAULT 'trial',     -- trial | starter | growth | enterprise
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (linked to Supabase auth.users)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id),
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'sdr', -- admin | sales | sdr | affiliate | viewer
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════
-- STEP 2: CRM core tables
-- ══════════════════════════════════════════════════════════════════

-- Companies (prospect organisations)
CREATE TABLE companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  name            TEXT NOT NULL,
  domain          TEXT,
  industry        TEXT,
  employee_count  INT,
  location        TEXT,
  linkedin_url    TEXT,
  website_url     TEXT,
  icp_segment     TEXT,  -- wealth_advisory | hr | ops | custom
  tech_stack      TEXT[],
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts (individual people)
CREATE TABLE contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  company_id      UUID REFERENCES companies(id),
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  linkedin_url    TEXT,
  job_title       TEXT,
  is_decision_maker BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (the 8-stage sales pipeline)
CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  company_id        UUID REFERENCES companies(id),
  contact_id        UUID REFERENCES contacts(id),
  owner_id          UUID REFERENCES profiles(id),       -- assigned sales rep
  sdr_id            UUID REFERENCES profiles(id),       -- SDR who sourced the lead
  affiliate_id      UUID REFERENCES affiliates(id),     -- if referred
  name              TEXT NOT NULL,                      -- lead display name
  stage             TEXT NOT NULL DEFAULT 'lead_identified',
  bant_score        TEXT CHECK (bant_score IN ('A','B','C','D')),
  bant_budget       TEXT,                               -- notes on budget signal
  bant_authority    TEXT,                               -- decision-maker details
  bant_need         TEXT,                               -- pain point summary
  bant_timeline     TEXT,                               -- urgency and timeline
  source            TEXT,                               -- linkedin | email | referral | event | affiliate
  deal_value        NUMERIC(12,2),
  currency          TEXT DEFAULT 'USD',
  close_date        DATE,
  is_active         BOOLEAN DEFAULT TRUE,
  lost_reason       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Lead stage history (audit trail for every stage change)
CREATE TABLE lead_stage_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_stage  TEXT,
  to_stage    TEXT NOT NULL,
  changed_by  UUID REFERENCES profiles(id),
  changed_at  TIMESTAMPTZ DEFAULT NOW(),
  notes       TEXT
);

-- ══════════════════════════════════════════════════════════════════
-- STEP 3: Research and intelligence tables
-- ══════════════════════════════════════════════════════════════════

-- AI-generated prospect research reports
CREATE TABLE research_reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  lead_id               UUID REFERENCES leads(id),
  company_id            UUID REFERENCES companies(id),
  company_overview      TEXT,
  prospect_background   TEXT,
  business_priorities   TEXT,
  pain_points           TEXT,
  use_cases             TEXT,          -- mapped SarvaX.ai use cases
  discovery_questions   TEXT,
  pitch_angle           TEXT,
  risks_objections      TEXT,
  raw_sources           JSONB,         -- scraped URLs and content used
  model_used            TEXT,          -- which LLM generated this
  token_count           INT,
  generation_time_ms    INT,
  version               INT DEFAULT 1,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════
-- STEP 4: Meeting intelligence tables
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE meetings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  lead_id           UUID REFERENCES leads(id),
  title             TEXT,
  meeting_type      TEXT,             -- discovery | demo | pilot_review | closing
  scheduled_at      TIMESTAMPTZ,
  duration_minutes  INT,
  recording_url     TEXT,
  transcript        TEXT,             -- full Whisper transcript
  summary           TEXT,             -- AI-generated summary
  action_items      JSONB,            -- array of {task, owner, due_date}
  pain_confirmed    TEXT[],           -- pain points confirmed in the call
  objections_raised TEXT[],           -- objections the prospect raised
  bant_signals      JSONB,            -- extracted BANT signals from call
  next_step         TEXT,
  attendees         TEXT[],
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════
-- STEP 5: Outreach tables
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE email_sequences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  lead_id         UUID REFERENCES leads(id),
  contact_id      UUID REFERENCES contacts(id),
  sequence_name   TEXT NOT NULL,
  status          TEXT DEFAULT 'active',  -- active | paused | completed | bounced
  listmonk_sub_id INT,                    -- Listmonk subscriber ID
  listmonk_seq_id INT,                    -- Listmonk sequence ID
  current_touch   INT DEFAULT 1,
  last_sent_at    TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  replied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id),
  lead_id     UUID REFERENCES leads(id),
  subject     TEXT,
  body        TEXT,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  opened_at   TIMESTAMPTZ,
  clicked_at  TIMESTAMPTZ,
  channel     TEXT DEFAULT 'email',   -- email | linkedin | whatsapp
  direction   TEXT DEFAULT 'outbound' -- outbound | inbound
);

-- ══════════════════════════════════════════════════════════════════
-- STEP 6: Affiliate tables
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE affiliates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id),
  profile_id      UUID REFERENCES profiles(id),
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  country         TEXT,
  referral_code   TEXT UNIQUE NOT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 20.0,  -- percentage
  status          TEXT DEFAULT 'active',       -- active | paused | terminated
  total_referrals INT DEFAULT 0,
  total_earned    NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE affiliate_referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id    UUID NOT NULL REFERENCES affiliates(id),
  lead_id         UUID REFERENCES leads(id),
  referral_code   TEXT NOT NULL,
  status          TEXT DEFAULT 'pending',    -- pending | qualified | closed | paid
  deal_value      NUMERIC(12,2),
  commission      NUMERIC(12,2),
  referred_at     TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ
);

-- ══════════════════════════════════════════════════════════════════
-- STEP 7: Row-Level Security (RLS) — CRITICAL for multi-tenancy
-- Apply the same pattern to EVERY table above
-- ══════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_stage_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's org_id from the profiles table
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Apply tenant isolation policy to each table (repeat for every table)
CREATE POLICY tenant_isolation ON leads
  USING (org_id = current_org_id());

CREATE POLICY tenant_isolation ON companies
  USING (org_id = current_org_id());

CREATE POLICY tenant_isolation ON contacts
  USING (org_id = current_org_id());

CREATE POLICY tenant_isolation ON meetings
  USING (org_id = current_org_id());

-- Affiliate-specific policy: affiliates see only their own records
CREATE POLICY affiliate_self_only ON affiliate_referrals
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates
      WHERE profile_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════
-- STEP 8: Indexes for performance
-- ══════════════════════════════════════════════════════════════════

CREATE INDEX idx_leads_org_stage     ON leads (org_id, stage);
CREATE INDEX idx_leads_owner         ON leads (owner_id);
CREATE INDEX idx_leads_created       ON leads (created_at DESC);
CREATE INDEX idx_meetings_lead       ON meetings (lead_id);
CREATE INDEX idx_email_logs_lead     ON email_logs (lead_id, sent_at DESC);
CREATE INDEX idx_research_lead       ON research_reports (lead_id);
CREATE INDEX idx_contacts_company    ON contacts (company_id);
CREATE INDEX idx_referrals_affiliate ON affiliate_referrals (affiliate_id);
```

---

## 10. Project Folder Structure

```
crm-app/
├── app/                              # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx            # Login with LinkedIn / Google / Email
│   │   └── onboarding/page.tsx       # New org setup flow
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Sidebar + auth guard
│   │   ├── pipeline/
│   │   │   ├── page.tsx              # Kanban board — 8 stage columns
│   │   │   └── [leadId]/page.tsx     # Lead detail drawer
│   │   ├── leads/
│   │   │   ├── page.tsx              # Lead list (DataTable)
│   │   │   └── new/page.tsx          # New lead form
│   │   ├── research/
│   │   │   ├── page.tsx              # Research report list
│   │   │   └── [reportId]/page.tsx   # Full report view
│   │   ├── outreach/
│   │   │   ├── page.tsx              # Active sequences overview
│   │   │   └── sequences/page.tsx    # Sequence templates
│   │   ├── meetings/
│   │   │   ├── page.tsx              # Meeting list + transcripts
│   │   │   └── [meetingId]/page.tsx  # Meeting detail + AI summary
│   │   ├── affiliates/
│   │   │   ├── page.tsx              # Affiliate partner list
│   │   │   └── [affiliateId]/page.tsx # Partner detail + referrals
│   │   ├── analytics/
│   │   │   └── page.tsx              # Pipeline funnel + metrics
│   │   └── settings/
│   │       ├── page.tsx              # Org settings
│   │       ├── team/page.tsx         # Team members + roles
│   │       └── integrations/page.tsx # API keys, n8n, Listmonk config
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── trpc/[trpc]/route.ts      # tRPC HTTP handler
│       ├── webhooks/
│       │   ├── n8n/route.ts          # Receives events from n8n
│       │   ├── listmonk/route.ts     # Email open/click events
│       │   └── mautic/route.ts       # Lead score threshold events
│       └── socket/route.ts           # Socket.io upgrade handler
│
├── server/
│   ├── trpc/
│   │   ├── router.ts                 # Root tRPC router
│   │   ├── routers/
│   │   │   ├── leads.ts              # leads.list, leads.create, leads.updateStage
│   │   │   ├── companies.ts          # companies.list, companies.create
│   │   │   ├── contacts.ts           # contacts.list, contacts.create
│   │   │   ├── research.ts           # research.generate, research.getReport
│   │   │   ├── meetings.ts           # meetings.create, meetings.transcribe
│   │   │   ├── outreach.ts           # outreach.createSequence, outreach.pause
│   │   │   └── affiliates.ts         # affiliates.list, affiliates.getReferrals
│   │   ├── context.ts                # Auth + Supabase context per request
│   │   └── middleware.ts             # Role enforcement middleware
│   ├── agents/
│   │   ├── research-agent.py         # LangGraph pre-call research agent
│   │   ├── post-meeting-agent.py     # LangGraph post-meeting processor
│   │   ├── outreach-agent.py         # LangGraph personalisation agent
│   │   └── prompts/
│   │       ├── research.txt          # Research report generation prompt
│   │       ├── bant-scoring.txt      # BANT extraction prompt
│   │       ├── email-draft.txt       # Follow-up email prompt
│   │       └── personalisation.txt   # Outreach personalisation prompt
│   ├── services/
│   │   ├── litellm.ts                # LiteLLM client wrapper
│   │   ├── supabase.ts               # Supabase server client
│   │   ├── listmonk.ts               # Listmonk API wrapper
│   │   ├── meilisearch.ts            # Meilisearch sync and search
│   │   └── socket.ts                 # Socket.io server instance
│   └── db/
│       ├── schema.prisma             # Prisma schema
│       └── migrations/               # Auto-generated Prisma migrations
│
├── components/
│   ├── pipeline/
│   │   ├── KanbanBoard.tsx           # 8-column pipeline view
│   │   ├── LeadCard.tsx              # Draggable lead card
│   │   └── StageColumn.tsx           # Individual stage column
│   ├── leads/
│   │   ├── LeadDrawer.tsx            # Slide-out lead detail
│   │   ├── BantScoreForm.tsx         # BANT qualification form
│   │   └── LeadTable.tsx             # shadcn DataTable for leads list
│   ├── research/
│   │   ├── ReportViewer.tsx          # Full research report display
│   │   ├── ReportStream.tsx          # Streaming generation progress
│   │   └── QuestionList.tsx          # Suggested discovery questions
│   ├── meetings/
│   │   ├── TranscriptViewer.tsx      # Full transcript + highlights
│   │   ├── ActionItems.tsx           # Extracted action items list
│   │   └── MeetingUpload.tsx         # Audio file upload for Whisper
│   ├── outreach/
│   │   ├── SequenceBuilder.tsx       # Create email sequence
│   │   └── EmailPreview.tsx          # Preview personalised email
│   ├── ai/
│   │   ├── AgentStatus.tsx           # Live agent progress via Socket.io
│   │   ├── AiAssistant.tsx           # Chat panel (useChat hook)
│   │   └── StreamingText.tsx         # Character-by-character text stream
│   └── ui/                           # shadcn/ui copied components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── table.tsx
│       └── command.tsx
│
├── lib/
│   ├── auth.ts                       # Auth.js config
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   └── server.ts                 # Server Supabase client (with service key)
│   ├── posthog.ts                    # PostHog client + event helpers
│   ├── langfuse.ts                   # Langfuse tracer setup
│   └── utils.ts                      # cn(), formatDate(), formatCurrency()
│
├── agents/                           # Python agent services (run separately)
│   ├── research_agent.py
│   ├── post_meeting_agent.py
│   ├── outreach_agent.py
│   ├── transcription_service.py      # whisper.cpp FastAPI wrapper
│   ├── requirements.txt
│   └── Dockerfile
│
├── n8n-workflows/                    # Exportable n8n workflow JSONs
│   ├── pre-call-prep.json
│   ├── post-meeting-processing.json
│   ├── cold-outreach-sequence.json
│   ├── daily-pipeline-review.json
│   └── affiliate-onboarding.json
│
├── docker-compose.yml                # Full local dev stack
├── .env.example                      # All env vars with descriptions
├── .env.local                        # Your local values (never commit)
└── package.json
```

---

## 11. Docker Compose — Full Local Dev Stack

Run every service locally with one command. Copy this to the root of your project.

```yaml
# docker-compose.yml
# Usage: docker-compose up -d
# Access the CRM at http://localhost:3000

version: "3.9"

services:

  # ── Database ──────────────────────────────────────────────────────
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: crmdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # ── Workflow Automation ───────────────────────────────────────────
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=postgres
      - DB_POSTGRESDB_PASSWORD=postgres
      - WEBHOOK_URL=http://localhost:5678
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  # ── Email Campaigns ───────────────────────────────────────────────
  listmonk:
    image: listmonk/listmonk:latest
    restart: unless-stopped
    command: [sh, -c, "yes | ./listmonk --install && ./listmonk"]
    environment:
      LISTMONK_app__address: "0.0.0.0:9000"
      LISTMONK_db__host: postgres
      LISTMONK_db__port: 5432
      LISTMONK_db__user: postgres
      LISTMONK_db__password: postgres
      LISTMONK_db__database: listmonk
    ports:
      - "9000:9000"
    depends_on:
      - postgres

  # ── LLM Gateway ───────────────────────────────────────────────────
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    command: ["--config", "/app/config.yaml", "--port", "8000"]
    environment:
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      GROQ_API_KEY: ${GROQ_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}

  # ── Visual AI Workflow Builder ────────────────────────────────────
  flowise:
    image: flowiseai/flowise:latest
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      PORT: 3001
      DATABASE_PATH: /root/.flowise
      FLOWISE_USERNAME: admin
      FLOWISE_PASSWORD: admin
    volumes:
      - flowise_data:/root/.flowise

  # ── LLM Observability ─────────────────────────────────────────────
  langfuse:
    image: langfuse/langfuse:latest
    restart: unless-stopped
    ports:
      - "3002:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/langfuse
      NEXTAUTH_SECRET: langfuse-secret-change-this
      NEXTAUTH_URL: http://localhost:3002
      SALT: langfuse-salt-change-this
    depends_on:
      - postgres

  # ── Fast Search ───────────────────────────────────────────────────
  meilisearch:
    image: getmeili/meilisearch:latest
    restart: unless-stopped
    ports:
      - "7700:7700"
    environment:
      MEILI_MASTER_KEY: "meilisearch-master-key"
      MEILI_NO_ANALYTICS: "true"
    volumes:
      - meilisearch_data:/meili_data

  # ── Product Analytics ─────────────────────────────────────────────
  posthog:
    image: posthog/posthog:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/posthog
      SECRET_KEY: posthog-secret-change-this
      SITE_URL: http://localhost:8080
    depends_on:
      - postgres

  # ── Transcription Service ─────────────────────────────────────────
  transcription:
    build:
      context: ./agents
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "8001:8001"
    volumes:
      - ./agents:/app
      - whisper_models:/app/models
    command: ["uvicorn", "transcription_service:app", "--host", "0.0.0.0", "--port", "8001"]

  # ── Secrets Management ────────────────────────────────────────────
  vault:
    image: hashicorp/vault:latest
    restart: unless-stopped
    ports:
      - "8200:8200"
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: dev-root-token
      VAULT_DEV_LISTEN_ADDRESS: "0.0.0.0:8200"
    cap_add:
      - IPC_LOCK

volumes:
  postgres_data:
  n8n_data:
  flowise_data:
  meilisearch_data:
  whisper_models:
```

**Start the full stack**:
```bash
docker-compose up -d

# Service URLs after startup:
# CRM App (Next.js):  http://localhost:3000   (run separately: npm run dev)
# n8n Automation:     http://localhost:5678
# Listmonk Email:     http://localhost:9000
# LiteLLM Gateway:    http://localhost:8000
# Flowise Flows:      http://localhost:3001
# Langfuse Tracing:   http://localhost:3002
# Meilisearch:        http://localhost:7700
# PostHog Analytics:  http://localhost:8080
# Transcription API:  http://localhost:8001
# Vault Secrets:      http://localhost:8200
```

---

## 12. AI Agent Prompt Templates

Exact prompts used inside the LangGraph agents. Save these in `server/agents/prompts/`.

---

### Prompt 1 — Pre-Call Research Report (`research.txt`)

```
You are a B2B sales intelligence analyst for SarvaX.ai, an AI Employee platform that automates meeting prep, meeting notes, follow-ups, CRM updates, and compliance documentation for wealth advisory firms, HR consultants, and operations teams.

Your task is to produce a concise, actionable prospect research brief for the sales team before a discovery call.

PROSPECT: {prospect_name}
COMPANY: {company_name}
ROLE: {prospect_role}
WEBSITE: {website_url}
LINKEDIN: {linkedin_url}

SCRAPED CONTENT:
{scraped_content}

Produce a structured report in the following format. Be specific — use data from the scraped content. Do not pad with generic statements.

---

## 1. Company Overview
[2–3 sentences: what the company does, size, markets served, type of firm]

## 2. Prospect Role and Background
[What this person actually does day-to-day. Their seniority. How long they have been in the role.]

## 3. Likely Business Priorities
[What strategic objectives is this firm probably pursuing right now? Reference any growth, regulatory, or operational signals from the web.]

## 4. Likely Pain Points
[Based on their role and company type, what operational problems are they likely facing? Be specific to wealth advisory / HR / ops context. List 3–5 concrete pains.]

## 5. Relevant SarvaX.ai Use Cases
[Which of these agents directly solve their pains: Meeting Prep Agent, Meeting Intelligence Agent, Post-Meeting Follow-Up Agent, CRM Update Agent, Compliance Notes Agent. Explain the connection for each.]

## 6. Suggested Discovery Questions
[List 6–8 questions tailored to this specific prospect. These should uncover urgency, current workflow, and decision-making process.]

## 7. Recommended Pitch Angle
[One sentence hook. Then the specific framing to use with this prospect based on their role and pains.]

## 8. Risks and Objections to Prepare For
[List 3–4 likely objections from this type of prospect and a one-line response to each.]
```

---

### Prompt 2 — BANT Scoring from Call Transcript (`bant-scoring.txt`)

```
You are a sales qualification analyst. You are given a transcript of a B2B discovery call between a SarvaX.ai sales representative and a prospect.

Your task is to extract BANT qualification signals from the conversation and assign a lead score.

TRANSCRIPT:
{transcript}

Analyse the transcript and return a structured JSON object with the following fields:

{
  "bant_score": "A | B | C | D",
  "budget": {
    "signal": "positive | neutral | negative | unknown",
    "evidence": "direct quote or paraphrase from the transcript",
    "notes": "your interpretation"
  },
  "authority": {
    "is_decision_maker": true | false,
    "influencer_level": "primary | secondary | unknown",
    "evidence": "direct quote or paraphrase",
    "other_stakeholders": ["name or role of others who need to approve"]
  },
  "need": {
    "pain_confirmed": true | false,
    "pain_summary": "2–3 sentence description of the specific pain they described",
    "urgency": "high | medium | low",
    "evidence": "direct quote or paraphrase"
  },
  "timeline": {
    "timeframe": "30 days | 60 days | 90 days | 6+ months | unknown",
    "driving_event": "what is creating urgency, if anything",
    "evidence": "direct quote or paraphrase"
  },
  "recommended_next_step": "specific next action to take with this lead",
  "score_rationale": "2–3 sentence explanation of why you assigned this score"
}

SCORING GUIDE:
A = Clear pain + decision-maker involved + budget likely + timeline within 60 days
B = Clear pain + some authority + timeline unclear + budget probable
C = Weak pain + low urgency + unclear budget + not a current priority
D = Poor fit, wrong ICP, or clear blocker — do not invest further sales time
```

---

### Prompt 3 — Post-Meeting Follow-Up Email (`email-draft.txt`)

```
You are a sales assistant for SarvaX.ai. You are drafting a personalised follow-up email after a discovery call.

Write in a professional but warm, human tone. No robotic AI language. No em dashes. Short paragraphs. Maximum 200 words total.

PROSPECT NAME: {prospect_name}
PROSPECT ROLE: {prospect_role}
COMPANY: {company_name}
CALL DATE: {call_date}

PAIN POINTS CONFIRMED IN THE CALL:
{pain_points}

ACTION ITEMS AGREED:
{action_items}

NEXT STEP:
{next_step}

Write a follow-up email with:
- Subject line referencing a specific point from the call (not generic)
- Opening: one sentence acknowledging a specific thing they said
- Middle: briefly reflect the pain they described in their own language, and connect it to SarvaX.ai's solution in one sentence
- Action items: bullet list of what each party agreed to do
- Closing: confirm the next step with a specific date/time reference if one was agreed
- Sign off as: Pratyush Malviya, Sales Manager, SarvaX.ai

Do not add marketing language. Do not add unsolicited company background. Write like a human who just had a real conversation.
```

---

### Prompt 4 — Outreach Email Personalisation (`personalisation.txt`)

```
You are a B2B sales copywriter for SarvaX.ai. You write short, personalised cold outreach emails that sound human — not like AI, not like a newsletter.

RULES:
- Maximum 120 words
- No em dashes
- No bullet points in the email body
- Never start with "I hope this email finds you well"
- Never open with "My name is..."
- Reference something specific about the prospect's company or role
- Name exactly one pain point in their language
- One clear call to action — a specific question or a soft ask for 15 minutes

PROSPECT PROFILE:
Name: {prospect_name}
Role: {prospect_role}
Company: {company_name}
ICP Segment: {icp_segment}
Specific detail to reference: {personalisation_hook}
Pain point to address: {pain_point}

Write 3 variants of the email with slightly different opening hooks and tones. Label them:
- Variant A: Problem-first (open with their pain)
- Variant B: Insight-first (open with a sharp observation about their industry)
- Variant C: Direct ask (open with the value proposition immediately)

Format output as JSON:
{
  "variant_a": { "subject": "...", "body": "..." },
  "variant_b": { "subject": "...", "body": "..." },
  "variant_c": { "subject": "...", "body": "..." }
}
```

---

## 13. n8n Workflow Blueprints

Descriptions of the five core n8n workflows. Import the exported JSON files from `n8n-workflows/` in your repo.

---

### Workflow 1 — Pre-Call Prep (triggered on meeting booked)

```
[Webhook: Calendar event created]
    ↓
[HTTP Request: Get lead record from Supabase by meeting ID]
    ↓
[HTTP Request: POST /research-agent with lead data]  ← calls Python LangGraph agent
    ↓
[Wait node: poll until report status = complete]
    ↓
[HTTP Request: Get report from Supabase]
    ↓
[Email node (Resend): Send research brief to sales rep + internal stakeholders]
    ↓
[HTTP Request: Update lead record — research_report_id, status = prep_complete]
    ↓
[Slack/Teams node (optional): Post summary to #sales-prep channel]
```

---

### Workflow 2 — Post-Meeting Intelligence (triggered on recording upload)

```
[Webhook: Recording uploaded to CRM]
    ↓
[HTTP Request: POST /transcribe to whisper.cpp service]  ← returns transcript
    ↓
[HTTP Request: POST /post-meeting-agent with transcript + lead_id]
    ↓
[Wait node: poll until processing = complete]
    ↓
[Parse JSON: extract bant_score, action_items, pain_confirmed, next_step, email_draft]
    ↓
[HTTP Request: Update meeting record in Supabase with all extracted data]
    ↓
[HTTP Request: Update lead BANT score in Supabase]
    ↓
[HTTP Request: Trigger Listmonk sequence — queue follow-up email]
    ↓
[Socket.io emit: notify rep "Post-meeting analysis complete"]
```

---

### Workflow 3 — Cold Outreach Sequence (triggered on new qualified lead)

```
[Webhook: New lead created with bant_score B or A]
    ↓
[HTTP Request: Get contact LinkedIn URL from Supabase]
    ↓
[HTTP Request: POST /outreach-agent with LinkedIn URL + company URL]
    ↓
[Parse response: get Variant A/B/C personalised email drafts]
    ↓
[Code node: select best variant based on ICP segment rules]
    ↓
[HTTP Request: Create subscriber in Listmonk]
    ↓
[HTTP Request: Subscribe to appropriate sequence in Listmonk]
    ↓
[HTTP Request: Log outreach activity to email_logs table in Supabase]
    ↓
[Wait 1 day → Check if opened: yes → skip touch 2, no → send touch 2]
```

---

### Workflow 4 — Daily Pipeline Review (9am cron)

```
[Cron: every weekday at 9:00am]
    ↓
[HTTP Request: GET all active leads from Supabase grouped by stage]
    ↓
[HTTP Request: GET leads with no activity in 5+ days]
    ↓
[HTTP Request: GET meetings scheduled for today]
    ↓
[LLM node (LiteLLM): generate pipeline summary — stage counts, stale leads, today's meetings]
    ↓
[Email (Resend): Send daily briefing to sales manager]
    ↓
[For each stale lead: create follow-up task in CRM via tRPC]
    ↓
[Slack node (optional): Post today's pipeline snapshot to #sales channel]
```

---

### Workflow 5 — Affiliate Onboarding (triggered on new affiliate record)

```
[Webhook: New affiliate record created in Supabase]
    ↓
[HTTP Request: Generate unique referral code and tracking link]
    ↓
[HTTP Request: Update affiliate record with referral_code]
    ↓
[HTTP Request: Create subscriber in Listmonk]
    ↓
[HTTP Request: Start affiliate-onboarding sequence in Listmonk]
    │   Touch 1 (Day 1): Welcome + referral link + ICP guide
    │   Touch 2 (Day 3): SarvaX.ai pitch deck + one-pager
    │   Touch 3 (Day 7): How to approach your first referral
    │   Touch 4 (Day 14): Commission structure + success stories
    ↓
[PostHog event: affiliate_onboarded — for funnel tracking]
    ↓
[Email to sales manager: notify of new affiliate + their profile]
```

---

## 14. tRPC API Route Map

All procedures available in the tRPC router. Consume directly from React components using `@trpc/react-query`.

```typescript
// Full procedure map

// ── Leads ──────────────────────────────────────────────────────────
leads.list          (input: { stage?, owner_id?, bant_score?, page?, limit? })
leads.getById       (input: { id: string })
leads.create        (input: { company_id, contact_id, source, name })
leads.updateStage   (input: { id, stage, notes? })
leads.updateBant    (input: { id, bant_score, bant_budget?, bant_authority?, bant_need?, bant_timeline? })
leads.updateOwner   (input: { id, owner_id })
leads.markLost      (input: { id, lost_reason })
leads.search        (input: { query: string })    // proxies to Meilisearch

// ── Companies ──────────────────────────────────────────────────────
companies.list      (input: { icp_segment?, page? })
companies.getById   (input: { id: string })
companies.create    (input: { name, domain?, industry?, website_url?, linkedin_url? })
companies.update    (input: { id, ...partial })
companies.enrich    (input: { id })               // triggers crawl4ai enrichment

// ── Contacts ───────────────────────────────────────────────────────
contacts.list       (input: { company_id?, page? })
contacts.create     (input: { company_id, full_name, email?, linkedin_url?, job_title? })
contacts.update     (input: { id, ...partial })

// ── Research ───────────────────────────────────────────────────────
research.generate   (input: { lead_id })          // triggers LangGraph research agent
research.getByLead  (input: { lead_id })
research.getLatest  (input: { lead_id })
research.list       (input: { page? })

// ── Meetings ───────────────────────────────────────────────────────
meetings.list       (input: { lead_id?, page? })
meetings.getById    (input: { id: string })
meetings.create     (input: { lead_id, title, meeting_type, scheduled_at })
meetings.uploadAudio(input: { meeting_id, audio_base64 }) // triggers Whisper
meetings.getSummary (input: { meeting_id })
meetings.updateNotes(input: { meeting_id, action_items, pain_confirmed, next_step })

// ── Outreach ───────────────────────────────────────────────────────
outreach.listSeqs   (input: { lead_id? })
outreach.createSeq  (input: { lead_id, contact_id, sequence_name })
outreach.pauseSeq   (input: { sequence_id })
outreach.resumeSeq  (input: { sequence_id })
outreach.getLogs    (input: { lead_id, page? })
outreach.draftEmail (input: { lead_id })          // triggers personalisation agent

// ── Affiliates ─────────────────────────────────────────────────────
affiliates.list     (input: { status?, page? })
affiliates.getById  (input: { id: string })
affiliates.create   (input: { full_name, email, country?, commission_rate? })
affiliates.getReferrals (input: { affiliate_id })
affiliates.getMyReferrals ()                      // scoped to session affiliate

// ── Analytics ──────────────────────────────────────────────────────
analytics.pipelineFunnel (input: { from_date?, to_date? })
analytics.channelAttrib  (input: { from_date?, to_date? })
analytics.stageVelocity  ()                        // avg days per stage
analytics.affiliatePerf  ()
```

---

## 15. Security Hardening Checklist

Before moving to production, complete every item in this list.

**Database**
- [ ] Row-Level Security enabled on every table — verify with `SELECT tablename FROM pg_tables WHERE schemaname='public'` and check `relrowsecurity` for each
- [ ] Service role key is never exposed to the browser — only used in server-side code
- [ ] `anon` Supabase key has no write permissions to sensitive tables
- [ ] Database connection only accessible from your application servers (Supabase project → Settings → Database → Connection Pooler → restrict IP)
- [ ] Daily automated backups enabled in Supabase or via pg_dump cron

**Authentication**
- [ ] `NEXTAUTH_SECRET` is a cryptographically random 32-byte string (`openssl rand -base64 32`)
- [ ] OAuth redirect URIs restricted to your domain only — not localhost in production
- [ ] Session duration set to 8 hours maximum for sales team accounts
- [ ] Affiliate sessions set to 24-hour duration
- [ ] MFA enforced for `admin` role accounts

**API and Application**
- [ ] All tRPC procedures validate input with Zod schemas — no raw user input reaches the DB
- [ ] Rate limiting on `/api/trpc/*` — max 100 requests/minute per session
- [ ] Rate limiting on `/api/webhooks/*` — validate webhook signatures (n8n shared secret, Listmonk HMAC)
- [ ] CORS restricted to your frontend domain only
- [ ] All AI agent HTTP endpoints require a shared secret header — never exposed publicly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` stored in Vault — not in `.env` in production

**Email**
- [ ] SPF record configured for your sending domain
- [ ] DKIM keys configured in Postal/Resend
- [ ] DMARC policy set to `p=quarantine` minimum
- [ ] Cold outreach sent from a subdomain (e.g. `outreach.sarvax.ai`) — never from the main domain
- [ ] Unsubscribe link present in every outreach email (CAN-SPAM / GDPR compliance)

**Infrastructure**
- [ ] All services behind HTTPS — Caprover handles Let's Encrypt automatically
- [ ] Vault used for all API key storage in production — no `.env` files with secrets on servers
- [ ] SSH access to VPS uses key-based authentication only — password auth disabled
- [ ] UFW firewall configured: allow 80, 443, 22 — block all other inbound ports
- [ ] Docker containers run as non-root users
- [ ] Langfuse and PostHog set to mask PII in production (disable IP capture, mask emails in events)

**Data**
- [ ] GDPR-compliant data deletion workflow: when a contact requests deletion, cascade delete from all tables
- [ ] Meeting recordings stored encrypted at rest (Supabase Storage with encryption enabled)
- [ ] Research reports do not store raw PII beyond what is in the contact record
- [ ] Affiliate referral data access-logged via Vault audit log

---

## 16. Scaling Guide

What to change as the team and pipeline grow.

| Stage | Team Size | Monthly Leads | Action |
|-------|-----------|--------------|--------|
| MVP | 1–3 users | < 100 | Vercel free + Supabase free + Fly.io free — $0/month |
| Early growth | 3–10 users | 100–500 | Move to $6/month VPS + Caprover. Upgrade Supabase to Pro ($25/month) |
| Growth | 10–30 users | 500–2,000 | Add read replica to Supabase. Move n8n to dedicated instance. Add Redis for session caching |
| Scale | 30+ users | 2,000+ | Split into microservices. Dedicated transcription server. Add horizontal scaling behind Caprover load balancer |

**Database scaling** (when Supabase free hits 500MB):
```sql
-- Add connection pooling (PgBouncer) — included in Supabase Pro
-- Archive closed leads older than 12 months to a separate archive table
-- Partition the lead_stage_history table by month
CREATE TABLE lead_stage_history_2025_06 PARTITION OF lead_stage_history
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
```

**LLM cost scaling** (when free tiers are not enough):
- Switch to `claude-haiku-4-5` for simple tasks (lowest cost Anthropic model)
- Cache research reports in Supabase — never re-generate a report for the same company within 30 days
- Batch overnight: run all research reports at 3am in a single n8n batch workflow — avoid rate limits

**Search scaling** (when Meilisearch index grows):
- Add dedicated indices per entity type: `leads`, `contacts`, `companies`, `reports`
- Set up scheduled re-indexing via n8n cron (every 15 minutes)
- Enable Meilisearch API key scoping — frontend only gets read-only search key

---

*Document version 1.1 · June 2026 · Internal — C3A Labs / SarvaX.ai*  
*Sections 9–16 added in continuation. Full guide: 16 sections, 40 repositories.*
