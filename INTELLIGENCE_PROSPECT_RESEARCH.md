# Zyntra AI Prospect Intelligence Engine: Technical Algorithm & Logic Architecture

This document provides a comprehensive breakdown of the core algorithms, data workflows, natural language processing patterns, and mathematical heuristics powering the **Zyntra AI Prospect Intelligence Engine**. It bridges the actual codebase (`src/services/geminiService.ts`, `src/components/ProspectResearchPanel.tsx`) with the modern enterprise methodology utilized to generate McKinsey-grade GTM intelligence.

---

## 1. System Overview & End-to-End Pipeline

The Zyntra AI Prospect Intelligence Engine implements an automated, systematic, live-grounded B2B research sprint on a target enterprise domain or corporate name. Rather than returning cached databases or stale scrapings, the engine executes real-time intelligence gathering, reasoning, structuring, and GTM synthesis.

### End-to-End Execution Flow

```
+------------------------------------+
|  User Inputs Website/Company Name   |
+------------------------------------+
                  |
                  v
+------------------------------------+
|  1. Initialization & Token Check   |
+------------------------------------+
                  |
                  +---> IF Error/429? --[Symmetric Fallback Process (See Section 10)]--> NVIDIA NIM Llama 3.3
                  |                                                                       OR Local Sandbox Engine
                  v
+------------------------------------+
|  2. Live Grounded Search Queries   |  <--- Formulated dynamically to extract:
+------------------------------------+       - SEC filings & quarterly revenues
                  |                          - Tech hire signals & code stack signatures
                  v                          - Corporate press releases & active CEO/CIO
+------------------------------------+
|  3. Multi-Channel Scraping & NLP  |
+----(googleSearch: {} Plugin)-------+
                  |
                  v
+------------------------------------+
|  4. ML Sentiment & Stress Parsing  |  <--- Severity calculation & structural grouping:
+------------------------------------+       - Critical, High, Medium corporate pain points
                  |                          - Causal product solution alignments
                  v
+------------------------------------+
|  5. Firmographic & Financial Model |  <--- Employee limits, ARR projections, and
+------------------------------------+       market classification algorithms
                  |
                  v
+------------------------------------+
|  6. Commercial ROI Heuristics      |  <--- Predict: Monthly sub fee, Year-1 Contract block, 
+------------------------------------+       LTV, and ROI justification formulas
                  |
                  v
+------------------------------------+
|  7. Stakeholder Lookup Engine      |  <--- Domain-matched email synthetics generation
+------------------------------------+       and LinkedIn profile URL alignment
                  |
                  v
+------------------------------------+
|  8. Omnichannel Copywriting Engine |  <--- Constraint-based B2B copywriting:
+------------------------------------+       - WhatsApp (<100 w), LinkedIn Connect (<40 w),
                  |                          - Followups (<80 w), Email bodies (120-150 w)
                  v
+------------------------------------+
|  9. Output Schema Constraints      |  <--- Strictly typed JSON compilation mapped
+------------------------------------+       directly to Firebase & UI dashboards
                  |
                  v
+------------------------------------+
| 10. McKinsey-Grade Report Render  |  <--- Generates beautiful PDF exports and Raw
+------------------------------------+       Markdown consulting dossiers (1500-2500 words)
```

---

## 2. Multi-Channel Scraping & Live Search Grounding Logic

To eliminate the hallucinations associated with static Large Language Models, Zyntra utilizes active search-grounding APIs via the `@google/genai` TypeScript SDK:

```typescript
tools: [{ googleSearch: {} }]
```

When a user launches a research sprint on `companyInput`, the engine dynamically reformulates the input into multiple target search indices, executing multi-path retrieval queries:

### Search Target Optimization Matrix

| Operational Query Intent | Algorithmic Search Query Formulation | Primary Data Extraction Metrics |
| :--- | :--- | :--- |
| **Corporate Scale & Firmographics** | `[companyInput] "investor relations" OR "press release" OR "annual revenue" OR "employees count" 2025..2026` | Founded year, accurate legal entity, active headquarters address, active listing status (subsidiary, public, private). |
| **Systemic Corporate Pain Points** | `[companyInput] (bottlenecks OR "operational challenges" OR "layoffs" OR "supply chain" OR "system upgrade") site:sec.gov OR site:web` | Disrupted financial earnings, direct executive quotes from earnings transcripts, active SEC audit notes. |
| **Corporate Infrastructure & Stack** | `[companyInput] "job description" AND (Salesforce OR SAP OR Oracle OR NetSuite OR React OR NextJS OR SnowFlake)` | Active ERP, CRM, database engines, web technologies, and BI integration suites. |
| **Decision-Maker Targeting** | `[companyInput] ("CEO" OR "VP Operations" OR "CIO" OR "CTO" OR "VP RevOps" OR "CFO")` | Direct stakeholder full corporate name, accurate active title, email formatting, and LinkedIn profile targets. |

---

### 3. Firmographic & Financial Modeling Heuristics (Company Scale & Business Model Intelligence)

Within the **Company Scale** sub-pane (Intelligence module), the engine runs a sophisticated classification and synthesis heuristic over raw crawled text corpus, structured metadata, active DNS pointers, and developer job board history. This process isolates physical scale metrics and synthesizes an authoritative **Business Model Description** that moves beyond generic corporate "about us" copy to uncover mechanics of pricing, customer acquisition, value flows, and commercial defensibility.

---

### A. The Business Model Intelligence Engine

The generation of the *Business Model Description* is not a simple extraction of home page text. Instead, the engine processes natural language assets through a tripartite classification system to categorize how the target entity generates revenue, targets its buyers, and defends its market share.

```
                          BUSINESS MODEL REASONING CASCADE
       +--------------------------------------------------------------+
       |             Crawled Text Corpus & Web Headers                |
       +--------------------------------------------------------------+
                                      |
       +------------------------------+------------------------------+
       |                              |                              |
       v                              v                              v
[Value Prop Isolation]      [Monetization Parsing]          [GTM Motion Classification]
 - Headings H1 & H2 Scans    - SKU Pricing Models            - Self-Serve Signup Analysis
 - Non-prominent Text Ratios - Bill Cycle Terms Matching     - Request Demo Gatekeeper Tags
 - Sentiment Normalization   - API Consumption Indicators    - Contract Lifecycle Rules
       |                              |                              |
       +------------------------------+------------------------------+
                                      |
                                      v
       +--------------------------------------------------------------+
       |        Composite Weight Vector Integration Heuristics        |
       +--------------------------------------------------------------+
                                      |
                                      v
       +--------------------------------------------------------------+
       |    Synthesize McKinsey-Grade Business Model Description       |
       +--------------------------------------------------------------+
```

#### 1. Go-To-Market (GTM) Motion Detection
The engine determines the company's GTM orientation by detecting the presence of specific keywords, UI structural layouts (such as self-serve sign-up grids vs. high-tier contact forms), and technical dependencies (e.g., Stripe Billing JS vs. heavy enterprise CPQ or invoice management systems like Zuora/Ariba).

We formulate a composite GTM vector $\vec{V}_{gtm}$ represented as:

$$\vec{V}_{gtm} = \big[ S_{\text{PLG}},\, S_{\text{Enterprise}},\, S_{\text{Marketplace}},\, S_{\text{Channel}} \big]$$

Each GTM dimension score is computed as:

$$S_{\text{category}} = \sum_{j} \omega_j \cdot \mathbb{I}(\text{signal}_j)$$

where $\mathbb{I}(\text{signal}_j) \in \{0, 1\}$ is an indicator function representing the presence of specific structural, syntactic, or dependency signals. The GTM classification selected corresponds to $\max(\vec{V}_{gtm})$.

##### Signal Weights and Indicators ($\omega_j$):
*   **Product-Led Growth (PLG) Indicators**:
    *   $\text{signal}_{1}$ ($W = +5$): Direct self-serve registration grids (presence of HTML elements with paths `/sign-up`, `/register`, `/create-account`).
    *   $\text{signal}_{2}$ ($W = +4$): Immediate transparent pricing table structures (`<table>` or `<div>` elements showcasing explicit dollar tiers, e.g., `"Free"`, `"$15/user"`, `"$49/month"`).
    *   $\text{signal}_{3}$ ($W = +3$): Developer-focus triggers (importing SDK scripts, containing keywords like `"API Reference"`, `"npm install"`, `"/docs/api"`).
    *   $\text{signal}_{4}$ ($W = +3$): Self-serve payment gateways (presence of Stripe Checkout redirection links or Adyen Client JS SDKs).

*   **Enterprise-Sales Indicators**:
    *   $\text{signal}_{1}$ ($W = +6$): Direct meeting scheduling widgets (e.g., Calendly, Chili Piper, HubSpot Meetings embeds inside gated divs).
    *   $\text{signal}_{2}$ ($W = +5$): Heavy access-gating (call-to-action buttons styled as `"Request Demo"`, `"Speak to Sales"`, `"Contact Enterprise Expert"`, or gated whitepapers requiring high-profile corporate emails).
    *   $\text{signal}_{3}$ ($W = +4$): Prominent compliance or security credentials displayed prominently on footer layouts (such as HIPAA, SOC2 Type II, ISO/IEC 27001, FedRAMP).
    *   $\text{signal}_{4}$ ($W = +3$): Corporate procurement requirements mentions (presence of terms like `"custom SLAs"`, `"vendor onboarding"`, `"purchase orders (PO)"`, `"dedicated account manager"`).

*   **Transactional / Marketplace Indicators**:
    *   $\text{signal}_{1}$ ($W = +6$): Two-sided supply & demand matching interface patterns (checkout modules, supplier listings, cart components).
    *   $\text{signal}_{2}$ ($W = +5$): Platform rake/commission notices in the Terms of Service (such as `"platform service fees"`, `"seller commissions"`, `"split-gate processing"`).

#### 2. Monetization & Pricing Taxonomy Engine
The engine scans public-facing text assets, FAQ sections, and vendor terms to construct a highly structured representation of the target company's commercial monetization model. It maps the entity to one or more of the following archetypes:

| Monetization Model | Primary Classifying Identifiers | Technical Indicators / Evidence | Core Financial Attribute Mapped |
| :--- | :--- | :--- | :--- |
| **Flat-Rate / Per-User SaaS** | Fixed flat dollar charges, per-seat tiers, annually billed licensing. | Keywords: `"per user / month"`, `"annual billing discount"`, `"billed annually"`. | High Gross Margin ($75\%\text{--}85\%$), high operational recurring revenue predictability. |
| **Metered / Usage-Based SaaS** | Pricing proportional to volume metrics (compute, data, API calls, bandwidth). | Keywords: `"per million API tokens"`, `"per GB stored"`, `"credit packages"`, `"utility billing"`. | Variable Gross Margins, scales aggressively with client operational volume, high net revenue retention (NRR) potential. |
| **Transactional Commissions** | Rakes of gross merchandise or ledger volume processed through platform escrow nodes. | Keywords: `"plus 2.9% + 30c"`, `"payout distribution fees"`, `"transaction rake"`. | High Volume processing, gross revenue scales with customer sales, lower direct margins if blended with payment fees. |
| **Hybrid Enterprise & Services** | Flat base licensing complemented by mandatory setup, implementation, or training retainers. | Keywords: `"custom setup fees"`, `"on-site installation"`, `"professional consulting retainer"`. | Slower deployment cycle, substantial initial cash flow, lower blended margins due to professional services personnel scale. |

#### 3. Core Value Proposition Isolation Engine
During multi-path crawls, meta-descriptions and root-level structural headers (`H1`, `H2` tags) are extracted and mapped into a semantic vector model. The engine strips marketing buzzwords and cliché phrases to isolate the **Functional Economic Impact ($FEI$)** delivered to the end-customer.

Let $\mathcal{T}_{\text{raw}}$ be the raw extracted header string. The system performs the following transformation steps:
1.  **Stop-Word & Cliché Demolition**: Run an exact dictionary filter to remove standard marketing descriptors that carry zero economic value:
    $$\mathcal{L}_{\text{cliché}} = \left\{ \text{"disrupting", "world-class", "revolutionary", "best-in-class", "innovative", "synergized", "bleeding-edge", "game-changing"} \right\}$$
    $$\mathcal{T}_{\text{sanitized}} = \mathcal{T}_{\text{raw}} \setminus \mathcal{L}_{\text{cliché}}$$

2.  **Semantic Value Synthesis**: The engine reconstructs the sanitized components into a **Functional Economic Impact ($FEI$)** equation:
    $$FEI = \text{Target Beneficiary Persona} + \text{Operational Inefficiency Eliminated} + \text{Quantified Economic Advantage}$$

##### Examples of Causal Value Proposition Resolution:
*   **Raw Corporate Marketing Input**: `"We leverage next-generation, bleeding-edge hyper-automation AI to synergize workflows and globally disrupt manual enterprise administrative bottlenecks."`
*   **Engine Causal FEI Resolution**: `"An enterprise workflow automation engine designed to eliminate manual data entry errors ($\text{reduction of support friction}$) and expedite process processing times for distributed operations teams."`

---

### B. Firmographic Scale Modeling & Range Formulas

The mathematical heuristics undergirding the "Company Sale" calculations represent a layered cascading estimation model.

#### 1. Headcount & Employee Bounding Algorithm
When crawling databases and investor reports, if precise exact counts cannot be found or if multiple contradictory sources report different figures, the system runs an **interval-merging bounding heuristic** to discard outliers and compute the filtered midpoint boundaries.

Let $\mathcal{H} = \{h_1, h_2, \dots, h_n\}$ be the set of headcount data elements extracted from search crawls, LinkedIn indices, and press releases. The engine computes the interquartile range (IQR) to discard outliers:

$$Q_1 = \text{Percentile}(\mathcal{H}, 25), \quad Q_3 = \text{Percentile}(\mathcal{H}, 75)$$

$$\text{IQR} = Q_3 - Q_1$$

$$\mathcal{H}_{\text{filtered}} = \left\{ h \in \mathcal{H} \;\middle|\; Q_1 - 1.5\cdot\text{IQR} \le h \le Q_3 + 1.5\cdot\text{IQR} \right}$$

The official compiled headcount bounds are reported as:

$$\text{Range}_{employees} = \left[ \min(\mathcal{H}_{\text{filtered}}), \max(\mathcal{H}_{\text{filtered}}) \right]$$

If $\mathcal{H}$ is completely empty (due to data shielding or strict private status), Zyntra estimates headcount scale utilizing the number of discovered active technical domains, web server infrastructure complexities, and regional office counts:

$$h_{\text{estimated}} = B_{\text{baseline}} \times C_{\text{infrastructure}} \times R_{\text{regional}}$$

*   where $B_{\text{baseline}} = 50$ (baseline scale factor).
*   $C_{\text{infrastructure}}$ represents a complexity factor from tech footprint scans (e.g., $+1.5$ per enterprise ERP, $+1.3$ per active custom sub-domain node).
*   $R_{\text{regional}}$ is the count of registered regional office geographic locations found.

#### 2. Sector-Calibrated Revenue (ARR) Projections
When true audited annual revenues are shielded under private ownership, the system runs an industry-calibrated **Revenue Productivity Heuristic ($\text{RPH}$)** calculated per employee:

$$\text{Projected Revenue (ARR)} = \text{Headcount}_{\text{midpoint}} \times \text{RPH}_{\text{sector}} \times \phi_{\text{funding_level}}$$

where $\text{Headcount}_{\text{midpoint}} = \frac{\min(\mathcal{H}_{\text{filtered}}) + \max(\mathcal{H}_{\text{filtered}})}{2}$.

##### Sector Revenue Productivity Factors ($\text{RPH}_{\text{sector}}$):
*   **SaaS & Cloud Software**:
    *   $\text{RPH}_{\text{SaaS}} = \$240,000$ per employee.
    *   $\phi_{\text{funding}} \in \{1.0 \text{ (bootstrapped)}, 1.35 \text{ (VC-capitalized growth)}, 1.2 \text{ (PE holding)}\}$
*   **B2B Professional Services / Consulting**:
    *   $\text{RPH}_{\text{Services}} = \$120,000$ per employee.
    *   $\phi_{\text{funding}} = 1.0$ (headcount scales linearly with services metrics).
*   **Heavy Manufacturing / Logistics & Chemical Operations**:
    *   $\text{RPH}_{\text{Industrial}} = \$195,000$ per employee (substantial physical equipment/inventory drag).
    *   $\phi_{\text{funding}} = 1.15$.
*   **Fintech & Capital Intermediary Markets**:
    *   $\text{RPH}_{\text{Fintech}} = \$325,000$ per employee (very high leverage per headcount due to gross platform volume routings).
    *   $\phi_{\text{funding}} = 1.45$.

#### 3. Cross-Checking Validation Heuristics
To ensure absolute consulting credibility and remove hallucinated metrics, scale data undergoes a programmatic **Infrastructure Coherency Check**:

$$\text{Scale Ratio (SR)} = \frac{\text{Projected ARR (\$)}}{\text{Headcount}_{\text{midpoint}}}$$

If the calculated $SR$ deviates by more than $\pm 2.5\sigma$ from the sector mean guidelines, the engine automatically triggers an auxiliary structural search target on Google Search Grounding (`"company name" AND ("funding round" OR "financial results" OR "operating expenses" OR "EBITDA")`) to override the baseline estimating parameters with verified public statements.

---

### C. Prompt-Level Syntactical Directives for UI Mapping

To prevent text clipping, scrollbar overlaps, or card layout blowouts in the single-view React applet layout, Gemini 3.5 LLM context prompt models are constrained by strict **Length-Constrained Output Schematics**. The LLM system instruction includes the following token-budgeting and styling parameters:

```json
{
  "system_directives": {
    "output_field_mappings": {
      "companyInfo.description": {
        "max_characters": 380,
        "formatting": "Single paragraph, zero newlines, zero bullet points",
        "syntactical_start": "Begin immediately with direct business-activity description",
        "forbidden_phrases": [
          "This report covers...",
          "Based on our search...",
          "Tesla is a company that...",
          "According to real-time search..."
        ],
        "example_ideal_output": "Tesla operates a vertically integrated automotive and energy value chain, utilizing direct-to-consumer digital channels and subscription-based software feature gating (FSD, Premium Connectivity) to maximize vehicle lifetime value. Monetized via flat-rate hardware sales alongside high-margin recurring digital services targeting global consumer and commercial fleets."
      }
    }
  }
}
```

This strict prompt level structural formatting ensures that every generated profile delivers immediate cognitive clarity to GTM representatives while maintaining pristine, high-contrast, responsive visual layouts in the UI panels.

---

## 4. Tech Stack Auditing & Confidence Level Scoring Engine

A critical element of intelligence prospect research is tech stack discovery. Rather than simple pattern matching, Zyntra ranks systems by analyzing tracking pixels, subdomains, script signatures, and developer job boards. It then outputs a **Confidence Level** (`High`, `Medium`, or `Low`).

```
+-----------------------------------------------------------------------------------+
|                            TECH AUDITING HEURISTIC FLOW                           |
+-----------------------------------------------------------------------------------+
                                          |
                        +-----------------+-----------------+
                        |  Analyze Target Web Fingerprints  |
                        +-----------------+-----------------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
    [Script Pixel Fingerprints]                            [Job Board Postings]
 - "js.hs-scripts.com" -> CRM: HubSpot                     - "Require 4+ years SAP" -> ERP: SAP
 - "snap.licdn.com" -> LinkedIn Tracking                   - "Snowflake warehouse exp" -> BI: Snowflake
                |                                                   |
                +-------------------------+-------------------------+
                                          |
                                          v
                        +---------------------------------+
                        | Confidence Estimation Algorithm |
                        +---------------------------------+
```

### Confidence Estimation Algorithm

Confidence scoring determines the likelihood that a particular software application runs actively inside the prospect's system. It is calculated utilizing cumulative evidence weight ($W$):

$$\text{Confidence Score} (S) = \sum_{j} W_j$$

$$\text{Confidence Level} = \begin{cases} 
\text{High} & \text{if } S \ge 8 \\
\text{Medium} & \text{if } 4 \le S < 8 \\
\text{Low} & \text{if } S < 4 
\end{cases}$$

#### Evidence Weights ($W$):
*   **DNS/MX Records / Script Tags detected on primary server** ($W = +8$): Highly verifiable indicator. Yields **High Confidence** automatically.
    *   *Example*: Google Analytics JS tag, HubSpot marketing embeds.
*   **Targeted Hiring Job Descriptions within last 120 days** ($W = +5$): Verifies active development/maintenance of system dependencies.
    *   *Example*: "Must have NetSuite ERP cloud migration credentials."
*   **Industry Standards and Case Studies** ($W = +3$): General market trends for the target company's scale and vertical.
    *   *Example*: \$500M enterprise SaaS default assumption of Salesforce or SAP.

---

## 5. Corporate Pain-Point Clustering & McKinsey-Grade Classifications

Raw search text is parsed through an NLP stress-analyzer to identify corporate frictions. Problems are classified into three **Severity Tiers** based on their impact on P&L, supply chains, or core brand equity.

| Severity | Definition | Code Mapped Target | Underlyings |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | Direct bottom-line loss, major margin leakages, failed SEC compliance, or disrupted core platform operations. | `CRITICAL` | Financial degradation ($>5\%$ of net profits), or manual tasks taking $>12$ hours/week/head. |
| **HIGH** | Outbound delivery blocks, time-zone alignment issues, or high customer acquisition costs (CAC). | `HIGH` | Email open rates dropping under $25\%$, sales cycle length expansion exceeding $+30$ days. |
| **MEDIUM** | Minor operational frictions, lack of integrated tools, general communication gaps. | `MEDIUM` | SDR list fatigue, minor team interface discrepancies. |

### Causal Evidence Formatting
To pass enterprise vetting, each pain point must capture an **Evidence Node** including:
1.  **Exact Quote** from public filings or executive statements.
2.  **Verified Source** (e.g., Q3 Systems Infrastructure Audit, Financial transcripts).
3.  **Timestamp / Date** (ensuring data relevance within the current fiscal period).

---

## 6. AI Adoption Matrix & Competitor Competitive Index

The engine evaluates a company's technological capabilities across four distinct quadrants to estimate their AI Maturity.

```
                           AI ADOPTION QUADRANTS
                    
                    Advanced
                       |
                       |       Sector Leaders / Pioneers
                       |       (e.g., Deployed LLM pipelines)
                       |
    Intermediate ------+------ Basic 
                       |       (e.g., Auto-responders, 
                       |        basic scoring rules)
                       |
                       |       Pre-AI (e.g., Manual lists,
                       |               spreadsheets, zero AI)
                    Maturity
```

### Maturity Classifications
1.  **Pre-AI**: Manual operation, spreadsheet trackers, zero automated models.
2.  **Basic**: Rule-based automation, simple templates, standard triggers.
3.  **Intermediate**: Copilot tools active in localized workstations, baseline scoring metrics.
4.  **Advanced**: Full API-driven modelers, automated multi-channel personalization routing, systemic LLM pipelines.

### Competitive Peer Analysis
The engine evaluates the company's competitors side-by-side using a **Relative Index Formulation**:

$$\text{Competitive Index (CI)} = \frac{\text{Average AI Maturity Of Competitors}}{\text{AI Maturity of Target Company}}$$

*   If $\text{CI} > 1.0$, the target company is technically lagging behind peers, which is highlighted to create immediate sales urgency (e.g., *"Apex Solutions is performing at an Advanced AI Level, putting your GTM speed at high risk"*).

---

## 7. Dynamic B2B Software Engineering & Commercial Pricing Heuristics

This algorithm translates identified pain points into customized B2B software recommendations, calculating pricing that fits the enterprise's profile to maximize average contract value (ACV).

### Solution Engineering Algorithm
For each identified core pain point, the engine maps a matching software solution, generating an MVP scope:

$$\text{Pain Point: Outbound Deliverability Trust Erosion} \longrightarrow \text{Solution: Dynamic Multi-Inbox SMTP Rotation Node}$$

### Multi-Variable Pricing Matrix Formula
Rather than suggesting random prices, solution costs are scaled to fit company sizes using the following models:

#### Monthly Subscription Fee ($\text{Fee}_{monthly}$) Calculation:

$$\text{Fee}_{monthly} = \text{BaseFee}_{vertical} \times \left(1 + \log_{10}\left(\frac{\text{Med}_{employees}}{10}\right)\right) \times C_{modifier}$$

*   where $\text{BaseFee}_{vertical}$ is the default package rate (e.g., $\$1,500$ for Revenue Operations systems, $\$2,200$ for heavy compliance engines).
*   $C_{modifier}$ is a factor adjusting for regional headquarters ($1.0$ for US/Western Europe, $0.7$ for APAC/India, $1.2$ for Tier-1 financial institutions).

#### Year 1 Contract Value ($\text{Val}_{year1}$):

$$\text{Val}_{year1} = \left(\text{Fee}_{monthly} \times 12\right) \times (1 - \text{Discount}_{annual})$$

*   where $\text{Discount}_{annual}$ is dynamically selected (defaults to $0.15$ or $15\%$ for annual billing lock-ins).

#### Life-Time Value Projection ($\text{LTV}_{forecast}$):

$$\text{LTV}_{forecast} = \text{Val}_{year1} \times \text{Expected Lifecycle (Years)}$$

*   *Expected Lifecycle* is modeled as $4.0 \text{ Years}$ (the average SaaS enterprise retention rate) or scaled higher for critical core infrastructure.

```typescript
// Sample Pricing Model Block Schema (geminiService.ts)
properties: {
  model: { type: Type.STRING },
  monthlyFee: { type: Type.STRING },
  year1Contract: { type: Type.STRING },
  potentialLtv: { type: Type.STRING }
}
```

---

## 8. Stakeholder Target Profiling & Dynamic Messaging Generation

One of the most valuable aspects of Zyntra's prospect research is its ability to identify the correct target department head and draft a customized, multi-channel outreach sequence.

### Target Executive Lookup & Extraction Mapping
The system identifies actual active executives (CEOs, CFOs, VPs of RevOps, Heads of Operations) matching the target company name:

```
+------------------+     +-------------------------------+     +-----------------------------------+
|  Target Name     | --> |  Domain-Matched Email Syntax  | --> |  LinkedIn URLs                    |
| "Marcus Sterling"|     | "msterling@[domain].com"      |     | "linkedin.com/in/msterling-revops"|
+------------------+     +-------------------------------+     +-----------------------------------+
```

### Omnichannel Programmatic Copywriting Rules

| Channel | Length Limit | Strategic NLP Prompt Directives | Formatting Rules |
| :--- | :--- | :--- | :--- |
| **WhatsApp Message** | `< 100 Words` | Personal observations on team background + direct value proposition + low-friction soft CTA. | Must contain no external URLs; clean conversational language. |
| **LinkedIn Connect** | `< 40 Words` | Extremely casual, warm networking hook; references role alignment. | STRICTLY no sales pitch; focused on connecting. |
| **LinkedIn Follow-Up DM**| `< 80 Words` | Friendly follow-up referencing the connection; shares contextual solutions. | Low-friction; highlights similar company successes. |
| **Cold Email Subject** | `< 7 Words` | High-impact, pattern-interrupting questions with company placeholder markers. | No clickbait words. High deliverability. |
| **Cold Email Body** | `120 - 150 Words`| Dynamic structure: 1) Contextual opening hook; 2) Problem statement + evidence reference; 3) Metric-driven value proposition; 4) Low-friction meeting CTA. | Clear email layouts; natural, conversational tone. |
| **Cold Email Follow-Up**| `< 60 Words` | Soft reminder referencing the threat of unresolved operational issues and time value. | Clear, casual check-in. |

---

## 9. Robust Fallback Sandbox & High-Fidelity Local Engine

Full-stack applications running in sandbox containers must stand resilient against external API timeouts, network failures, or API quota exhaustions (`RESOURCE_EXHAUSTED 429` on the Gemini Free Tier). 

Zyntra implements a **Dual-Tier Fallback Cascade** to guarantee high availability:

```
                  +--------------------------------+
                  |  Google Gemini API Request     |
                  +----------------+---------------+
                                   |
                +------------------+------------------+
                |                                     |
        [HTTP Status 200]                    [HTTP Error / 429 Limit]
                |                                     |
                v                                     v
   +-------------------------+           +----------------------------+
   |  Parse and Return JSON  |           | 1. Invoke NVIDIA NIM       |
   +-------------------------+           |    Fallback Processor      |
                                         +------------+---------------+
                                                      |
                                    +-----------------+-----------------+
                                    |                                   |
                            [NVIDIA Key Ok]                    [NVIDIA Key Missing/Fail]
                                    |                                   |
                                    v                                   v
                       +-------------------------+          +---------------------------+
                       | Parse and Return Llama  |          | 2. Activate Local High-  |
                       | JSON Data Struct        |          |    Fidelity Sandbox Engine|
                       +-------------------------+          +---------------------------+
```

### Fallback Implementation Pattern

#### 1. API Error Interception:
The system traps errors using a robust pattern recognizer to intercept quota limits and connection dropouts:

```typescript
function isQuotaOrApiKeyError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("api key") ||
    msg.includes("limit") ||
    msg.includes("unauthorized") ||
    msg.includes("fetch") ||
    msg.includes("cors")
  );
}
```

#### 2. Tier 1: NVIDIA NIM Llama 3.3 Fallback Protocol
If `isQuotaOrApiKeyError(error)` returns `true` and an `NVIDIA_API_KEY` is present, the engine automatically re-routes the structured prompt to an alternative cloud infrastructure hosting Llama-3.3-70b-instruct:

```typescript
const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${nvidiaApiKey}`
  },
  body: JSON.stringify({
    model: "meta/llama-3.3-70b-instruct",
    messages: [
      { role: "system", content: "You are an elite enterprise B2B consultant..." },
      { role: "user", content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: "json_object" }
  })
});
```

#### 3. Tier 2: High-Fidelity Local Knowledge Sandbox Engine
If the auxiliary API fails or keys are missing, the system activates its localized sandbox generation code. Utilizing string-processing heuristics, the compiler parses the user's input to create customized, highly realistic consulting dossiers:

*   **Host domain normalization**: Normalizes input (e.g., `https://www.tesla.com` $\to$ domain: `tesla.com`, name: `Tesla`).
*   **Vertical mapping**: Infers corporate sectors from suffixes to assign highly relevant corporate pain-points and tech stacks.
*   **Variable payload injects**: Populates realistic digital footprints, decision-maker profiles, and GTM hooks without generating empty or dummy fields.

---

## 10. Technical Database Structure & Schema Integrations

Zyntra saves compiled research sprints directly to Firebase Firestore to support real-time team collaboration.

### 1. Firestore Data Model: `prospect_researches`
```json
{
  "companyName": "Tesla",
  "userId": "firebase_auth_user_uid_12345",
  "orgId": "firebase_auth_org_id_67890",
  "reportJSON": "{ ... Fully Validated ProspectResearchReport JSON String ... }",
  "createdAt": "Timestamp (FIR_TIMESTAMP_OBJECT)"
}
```

### 2. Export-to-Campaign Lead Mapping Scheme
When a user clicks **"Export as Lead"**, Zyntra runs a mapping algorithm to convert structured research objects into active GTM targets:

```typescript
const newLead = {
  name: gtm.decisionMaker.name,
  role: gtm.decisionMaker.title,
  company: info.name,
  industry: info.industry,
  country: info.hq,
  phone: gtm.decisionMaker.phone,
  email: gtm.decisionMaker.email,
  linkedin_url: gtm.decisionMaker.linkedinUrl,
  website: info.website,
  employees: info.employees,
  userId: user.uid,
  orgId: profile.orgId,
  campaignId: targetCampaignId,
  status: 'imported',
  score: 85 // Standard base index score for qualified search grounded accounts
};
```

This structural binding ensures that Zyntra transitions seamlessly from high-level corporate research to active, omnichannel CRM-compatible GTM campaigns.
