# Product Requirements Document (PRD): Zyntra AI Outreach Engine

## 1. Executive Summary & Product Vision
Zyntra AI Outreach Engine is an enterprise-grade, multi-tenant B2B outreach and relationship intelligence platform. It is designed to replace manual Sales Development Representative (SDR) workflows by combining deep, search-grounded market intelligence, high-fidelity message personalization across WhatsApp, LinkedIn, and Email, and a structured CRM interface.

The platform enables sales teams to import leads, execute real-time research sprints that extract McKinsey-grade corporate dossiers, automatically score and triage opportunities, manage deals across customizable pipelines via a drag-and-drop interface, and track activities in real time.

---

## 2. System Architecture & Core Technologies
The platform is built on a modern, decoupled stack, prioritizing responsive front-end execution, secure real-time data sync, and high API resilience.

### 2.1 Technology Stack
*   **Frontend**: React 19, TypeScript, Vite.
*   **Styling & Design System**: Tailwind CSS 4.0 (configured with dark and light themes).
*   **Animations**: Framer Motion (`motion/react`) for interface transitions and drag-and-drop feedback.
*   **Icons**: Lucide React.
*   **Backend Server**: Node.js, Express, WebSocket (`ws`) server for real-time collaboration.
*   **Primary Database**: Firebase Firestore (NoSQL, structured around organizations, users, leads, campaigns, and messages).
*   **Authentication**: Firebase Authentication (Google OAuth, LinkedIn OAuth, Role-Based Access Control token assertions).
*   **AI Models & SDKs**: `@google/genai` (Google Gemini 3.5), `@anthropic-ai/sdk` (Claude 3.5 Sonnet), NVIDIA NIM API (Llama 3.3 70B), and a local high-fidelity sandbox heuristic generator.

### 2.2 Core Infrastructure Patterns
*   **Multi-Tenancy**: Users are isolated into organizations (`orgId`). Every query is scoped to the tenant's organization ID.
*   **Role-Based Access Control (RBAC)**: Supports three core operational roles:
    1.  **Super Admin**: Access to system-wide health, LLM configurations, organizations management, magic invite generation, and global telemetry.
    2.  **Org Admin (Manager)**: Manage organization settings, import templates, SMTP configurations, webhook registrations, and user invites.
    3.  **User (Agent)**: Create campaigns, research prospects, modify leads, generate outreach copy, and manage CRM deals.
*   **Real-Time Sync**: Real-time listeners bind Firestore collections to the client state, updating campaigns, leads, and messages dynamically.
*   **WebSocket Updates**: A server-side WebSocket server broadcasts deal movement, sync activities, and system alerts to active workspace sessions.

---

## 3. Detailed Feature Specifications

### 3.1 Zyntra AI Prospect Intelligence Engine
The core value proposition of Zyntra is its live-grounded B2B research sprinting module, which generates deep corporate reports rather than relying on stale cached databases.

#### 3.1.1 End-to-End Execution Flow
1.  **Initialization**: User enters a company domain or name. The system verifies active API configurations and checks tenant rate limits.
2.  **Live Grounded Search Formulations**: Formulates multiple search vectors using `@google/genai` with `tools: [{ googleSearch: {} }]` configured.
3.  **Data Harvesting**: Scraping vectors extract:
    *   Corporate financials and headquarters address details.
    *   Core technology dependencies (ERP, CRM, frontend stacks) via script fingerprinting and job postings.
    *   Decision-maker titles, names, and contact details.
4.  **McKinsey-Grade Report Synthesis**: Compiles a consulting dossier (1500–2500 words) containing ARR projections, AI maturity indexing, tech stack auditing, corporate pain-point clustering, commercial pricing heuristics, and recommended outreach strategies.
5.  **Data Export**: Renders a markdown consulting dossier and exports structured PDF reports using `jspdf` and `jspdf-autotable`.

#### 3.1.2 Financial & Firmographic Heuristics
When direct financial records are incomplete, the engine applies industry-standard bounding formulas:
*   **Employee Median Formula**:
    $$\text{Med}_{\text{employees}} = \frac{\text{Limit}_{\text{lower}} + \text{Limit}_{\text{upper}}}{2}$$
*   **Estimated Annual Recurring Revenue (ARR)**:
    $$\text{Est. Revenue} = \text{Med}_{\text{employees}} \times \text{HPFR}$$
    Where $\text{HPFR}$ (Heuristic Productivity Factor Ratio) is set to $\$150,000$ to $\$250,000$ depending on the industry vertical (e.g., SaaS is modeled at $\$220,000$/employee, industrial is modeled at $\$160,000$/employee).

#### 3.1.3 Tech Stack Auditing & Confidence Level Scoring
The engine analyzes script pixel fingerprints and active job boards to verify software dependencies, assigning a confidence score:
$$\text{Confidence Score } (S) = \sum_{j} W_j$$
$$\text{Confidence Level} = \begin{cases} 
\text{High} & \text{if } S \ge 8 \\
\text{Medium} & \text{if } 4 \le S < 8 \\
\text{Low} & \text{if } S < 4 
\end{cases}$$
*   *Evidence Weights ($W_j$)*:
    *   DNS / MX / script tags found on primary site (e.g., HubSpot tag, LinkedIn pixel): $+8$ points.
    *   Targeted job description posted within last 120 days (e.g., "Must have NetSuite CRM experience"): $+5$ points.
    *   Industry default assumptions for company size and vertical: $+3$ points.

#### 3.1.4 AI Adoption Quadrant & Competitor Competitive Index
Target companies are evaluated across four AI Adoption levels (Pre-AI, Basic, Intermediate, Advanced) and evaluated against competitor benchmarks:
$$\text{Competitive Index (CI)} = \frac{\text{Average AI Maturity of Competitors}}{\text{AI Maturity of Target Company}}$$
A $\text{CI} > 1.0$ indicates the target is lagging behind its peers, creating a value-based sales hook.

#### 3.1.5 Software Solution Mapping & Commercial Pricing Models
The platform matches identified organizational challenges to specific software recommendations and models commercial terms using dynamic formulas:
*   **Monthly Subscription Fee**:
    $$\text{Fee}_{\text{monthly}} = \text{BaseFee}_{\text{vertical}} \times \left(1 + \log_{10}\left(\frac{\text{Med}_{\text{employees}}}{10}\right)\right) \times C_{\text{modifier}}$$
    Where $\text{BaseFee}_{\text{vertical}}$ is the standard price for the software vertical, and $C_{\text{modifier}}$ scales the price based on geographic headquarters and tiering (e.g., US tier-1 enterprises are weighted at $1.2$, APAC at $0.7$).
*   **Year 1 Contract Value**:
    $$\text{Val}_{\text{year1}} = \left(\text{Fee}_{\text{monthly}} \times 12\right) \times (1 - \text{Discount}_{\text{annual}})$$
    Where $\text{Discount}_{\text{annual}}$ defaults to $0.15$ ($15\%$) for annual lock-ins.
*   **LTV Forecast**:
    $$\text{LTV}_{\text{forecast}} = \text{Val}_{\text{year1}} \times \text{Expected Lifecycle}$$
    Expected Lifecycle is modeled as $4.0 \text{ Years}$ (typical B2B enterprise SaaS retention).

---

### 3.2 Resilient Multi-Provider Priority Failover & Escalation Chain
To guarantee high availability and prevent disruptions due to network timeouts or rate limits (e.g., Gemini `429 Resource Exhausted`), Zyntra implements a robust server-side failover system.

```
       +---------------------------------------------+
       |   User Triggers SDR / Prospect Research     |
       +----------------------+----------------------+
                              |
                              v
       +---------------------------------------------+
       | Retrieve Prioritized Provider List          |
       | (Firestore configuration sorted by priority)|
       +----------------------+----------------------+
                              |
                              v
       +---------------------------------------------+
       | Run Intelligent Model Escalation            |
       | Elevates lightweight to reasoning model     |
       | (e.g., gemini-flash -> gemini-pro for R&D)  |
       +----------------------+----------------------+
                              |
                              v
       +---------------------------------------------+
       | Execute Primary Model Call                  |
       +----------------------+----------------------+
                              |
            +-----------------+-----------------+
            |                                   |
     [HTTP 200 Success]               [API Failure / Timeout]
            |                                   |
            v                                   v
    +---------------+                 +-------------------------+
    | Return Output |                 | Log Telemetry Diagnostic|
    +---------------+                 +------------+------------+
                                                   |
                                                   v
                                      +-------------------------+
                                      | Sweep Next Provider     |
                                      | (OpenAI -> NIM -> etc.) |
                                      +------------+------------+
                                                   |
                                     +-------------+-------------+
                                     |                           |
                              [API Success]             [All APIs Exhausted]
                                     |                           |
                                     v                           v
                             +---------------+         +-------------------------+
                             | Return Output |         | Execute Local High-     |
                             +---------------+         | Fidelity Sandbox Engine |
                                                       +-------------------------+
```

#### 3.2.1 Core Failover Features
*   **Sequential Provider Sweep**: The server reads active configurations from the Firestore `llm_config` collection, executing requests in priority order:
    1.  Google Gemini 3.5
    2.  Anthropic Claude 3.5 Sonnet
    3.  OpenAI GPT-4o
    4.  NVIDIA NIM (Llama 3.3 70B Instruct)
    5.  OpenRouter Proxy
*   **Intelligent Model Escalation**: When a complex "research" action is run, the engine automatically escalates lightweight models to their high-reasoning counterparts (e.g., `gemini-3.5-flash` is elevated to `gemini-3.5-pro` on the fly). Simple outreach templates remain routed to lightweight models to keep speeds high and costs low.
*   **High-Fidelity Local Knowledge Sandbox Engine**: If all external APIs fail, the system falls back to a local processing module. It normalizes company domains, parses corporate suffixes, and maps company names against structural industry verticals to generate a complete, realistic dataset without returning empty fields.
*   **Real-time Diagnostic Telemetry**: Logs provider execution, latency, tokens consumed, calculated cost, status, and failure error messages to database records.

---

### 3.3 Multi-Pipeline CRM Board & Deal Journeys
The platform features an interactive CRM pipeline interface that tracks prospects through distinct sales and onboarding milestones.

#### 3.3.1 Kanban & List Layouts
*   Users can toggle between a card-based Kanban Board (rendered with Framer Motion) and a high-density tabular List View. View preferences are saved in user profiles and loaded dynamically.

#### 3.3.2 Custom Pipelines & Swimlanes
*   Supports multiple pipeline configurations based on tenant organizational requirements:
    1.  **Enterprise Sales Pipeline**: Incident Discovery $\to$ Solution Proposal $\to$ Contract Negotiation $\to$ Closed Won $\to$ Closed Lost.
    2.  **Customer Onboarding & Success**: Kickoff Meeting $\to$ Data Integration $\to$ Team Training $\to$ Fully Activated $\to$ Complete Handoff.
    3.  **Support & Incident Escalation**: Level 1 Triage $\to$ Team Investigation $\to$ Hotfix Development $\to$ QA Verification $\to$ Ticket Resolved.
*   Deals are grouped into horizontal swimlanes based on deal health categories (`hot`, `warm`, `cold`, `lost`) or assigned agents.

#### 3.3.3 SLA Breach Watchdog
*   A background daemon runs continuous SLA reviews. If a deal remains in a pipeline stage longer than its defined SLA threshold (e.g., 5 days in Discovery), the system automatically flags an **SLA Breach Warning** and logs a diagnostic record on the deal's timeline.

#### 3.3.4 Real-time Drag-and-Drop UX
*   Deals can be moved across stages with real-time UI updates. Drag-and-drop actions perform optimistic updates on the client side before writing changes to `/api/deals/${id}`.

#### 3.3.5 Deal Side-Panel Drawer
Clicking a deal card opens an inspector drawer containing:
*   **AI Close Probability Analyzer**: Estimates deal closing metrics (0-100%), flags critical deal risks, details recommended next steps, and drafts customized follow-up text.
*   **Chronological Activity Log**: Shows stage changes, internal notes, mail dispatch updates, and manual activities.
*   **Follow-Up Task Checklist**: Interactive checklists mapping tasks, due-dates, and completed states.

#### 3.3.6 Deduplication & Conflict Resolution
*   An internal deduplication parser evaluates lead registers for duplicate names, emails, phones, or companies. When an anomaly is detected, a conflict-resolution modal prompts the user to select which data values to keep, merging records in-place without data loss.

#### 3.3.7 Bulk Lead Import & Campaign Ingestion
*   Agents can select multiple lead checkboxes and bulk-import them into a pipeline, automatically converting leads into journey deals with associated values, assigned agents, deal health ratings, and default SLA tasks.

---

### 3.4 Data Ingestion & Integration Configurations

#### 3.4.1 Smart CSV/Excel Import Modal
*   Allows bulk uploads of target lead files.
*   Supports Excel and CSV formats parsed client-side using `xlsx`.
*   Features **Automatic Header Mapping**: Automatically detects and maps file column names (e.g., "Full Name", "E-Mail Address") to the standard Zyntra database schema.
*   Validates data types row-by-row (verifying telephone area codes and email format checks) and reports progress via progress bars and log files.

#### 3.4.2 Direct Webhook Dispatch & Retry Infrastructure
*   Managers can register webhooks to sync actions with external systems (such as Lemlist, Apollo, or Zapier).
*   Monitors events including `lead.created`, `lead.updated`, `crm.sync_failed`, and `deal.stage_changed`.
*   Implements **Exponential Backoff Retries**: Webhook delivery failures trigger an automatic retry routine (up to 3 times) with progressive delay intervals.
*   Logs complete webhook payloads, server responses, and response status codes to a Firestore sync logs dashboard.

---

### 3.5 Programmatic Copywriting & Omnichannel Outreach
For each lead, the platform uses context from the Campaign's "Product DNA" configurations to draft a cohesive, multi-step messaging sequence across three communication channels.

#### 3.5.1 Omnichannel Messaging Rules

| Outreach Stage / Channel | Word Count Bounding | стратегический NLP Prompts & Constraints | Output Actions |
| :--- | :--- | :--- | :--- |
| **WhatsApp Outreach** | `< 100 Words` | Low-friction introductory copy, conversational, zero external links, direct value hook. | Opens `wa.me/${phone}?text=${content}` in a new tab. |
| **LinkedIn Connection Request** | `< 40 Words` | Casual networking hook, mentions shared focus areas, strictly no sales pitch. | Opens LinkedIn profile target URL in a new tab. |
| **LinkedIn Follow-up Message** | `< 80 Words` | References role alignment, shares context on specific solutions, low-friction request. | Copies text to clipboard; easy paste. |
| **Cold Email Subject** | `< 7 Words` | Pattern-interrupting subject line, references company placeholder markers. | Injected into email body forms. |
| **Cold Email Body** | `120 - 150 Words` | Structured flow: Context hook $\to$ Problem statement citing researched filings $\to$ ROI metrics $\to$ Clear demo CTA. | Dispatches using configured SMTP. |
| **Cold Email Follow-up** | `< 60 Words` | Short check-in referencing identified operational issues, highlights time sensitivity. | Dispatches using SMTP. |

#### 3.5.2 Inline Review & Copy Editing
*   Message copy is rendered within custom review cards using `contentEditable` fields.
*   Edits are captured on-blur and synced directly to the Firestore `messages` collection, ensuring customization is preserved before sending.

---

### 3.6 Mobile Device Responsive Optimizations
The entire portal is optimized for mobile sales team access.
*   **Mobile Device Detection**: A viewport listener checks window dimensions ($< 1024\text{px}$) and user-agent strings.
*   **Forced Light Mode**: For maximum visibility on mobile devices and outdoor field settings, the portal automatically forces light-mode rendering on mobile devices.
*   **Collapsible Navigation**: Responsive menus collapse into a top branding bar with touch-friendly drawer overlays.
*   **Adaptive Grid & Touch Layouts**: Compact touch points, swipeable stage cards, full-screen card overlays, and vertical layout arrangements adapt the pipeline board and analytics widgets for smaller touch screens.

---

## 4. Database Schema Specifications (Firestore)

### 4.1 `organizations` Collection
```json
{
  "id": "org-default",
  "name": "Pearson Hardman LLC",
  "slug": "pearson-hardman-llc",
  "created_by": "user-specter-uid",
  "created_at": "2026-05-29T15:18:15.000Z",
  "plan": "Enterprise Omnichannel",
  "status": "active"
}
```

### 4.2 `users` Collection
```json
{
  "uid": "user-specter-uid",
  "email": "malviya.pratyush26@gmail.com",
  "displayName": "Pratyush Malviya",
  "photoURL": "https://picsum.photos/seed/specter/150",
  "role": "super_admin",
  "orgId": "org-default",
  "lastLogin": "Timestamp",
  "smtpConfig": {
    "host": "smtp.mailgun.org",
    "port": "587",
    "secure": false,
    "user": "postmaster@zyntra.ai",
    "pass": "decrypted_password_hash",
    "from": "Pratyush <pratyush@zyntra.ai>"
  },
  "linkedinAccount": {
    "connected": true,
    "name": "Pratyush Malviya",
    "avatar": "https://media.licdn.com/avatar/pratyush",
    "uid": "li-uid-12345"
  }
}
```

### 4.3 `leads` Collection
```json
{
  "id": "lead-12345",
  "campaignId": "camp-default",
  "userId": "user-specter-uid",
  "orgId": "org-default",
  "name": "Sarah Mitchell",
  "role": "VP Growth",
  "company": "GrowthCo UK",
  "email": "sarah@growthco.io",
  "phone": "+447911123456",
  "status": "generated",
  "score": 85,
  "industry": "Software",
  "country": "United Kingdom",
  "linkedin_url": "https://linkedin.com/in/sarah",
  "website": "https://growthco.io",
  "employees": "120",
  "createdAt": "Timestamp"
}
```

### 4.4 `deals` Collection
```json
{
  "id": "deal-98765",
  "orgId": "org-default",
  "leadId": "lead-12345",
  "title": "Enterprise Outreach Partnership",
  "value": 45000,
  "stage": "stage-negotiation",
  "createdAt": "2026-05-29T15:18:15.000Z",
  "assignedAgent": "pratyush@zyntra.ai",
  "tags": ["B2B", "SaaS"],
  "status": "hot"
}
```

### 4.5 `pipelines` Collection
```json
{
  "id": "pipe-default",
  "orgId": "org-default",
  "name": "Enterprise Sales Pipeline",
  "stages": [
    { 
      "id": "stage-discovery", 
      "name": "Incident Discovery", 
      "color": "#3b82f6", 
      "probability": 20, 
      "slaDays": 5, 
      "statuses": ["Awaiting Intro", "Discovery Booked"] 
    },
    { 
      "id": "stage-proposal", 
      "name": "Solution Proposal", 
      "color": "#f59e0b", 
      "probability": 50, 
      "slaDays": 10, 
      "statuses": ["Drafting proposal", "Proposal Delivered"] 
    }
  ]
}
```

---

## 5. Security & Validation Rules
1.  **Default Deny Firestore Rules**: Firestore security policies strictly enforce that reads and writes are rejected unless the user's logged-in UID matches the resource `userId` or their organization ID matches the resource `orgId`.
2.  **Schema and Type Checks**: All writes to critical CRM fields (e.g., deal valuations, email addresses, phone digits) are validated server-side and client-side before submission.
3.  **Encrypted API Keys Store**: API Keys for third-party tools (Gemini, Anthropic, Custom webhooks) are stored using cryptographic hashes, returning only the key prefix (e.g., `zy_live_...`) to active users.
