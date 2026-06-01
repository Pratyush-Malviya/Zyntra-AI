# Product Requirement Document (PRD): Zyntra B2B CRM & AI Outreach Platform

## 1. Executive Summary
Zyntra is an elite B2B sales automation CRM and intelligent outreach suite. It features highly responsive candidate pipeline controls, sophisticated AI routing architectures with instant failovers (Gemini 1.5/2.0 paired with NVIDIA NIM fallbacks), structured consultative prospect intelligence reports, team management consoles, system credential keys, webhook endpoints, and detailed visual statistics.

---

## 2. Core Navigation & Workspace Modules

The sidebar is collapsible and provides responsive access across any layout to several main workspaces:

### A. Outreach Engine (Campaigns & Leads)
The primary execution center of Zyntra where campaign pipelines originate and live leads are managed.
* **Campaign Dashboard:** List campaigns with key metrics (Number of Leads, status indicators like Draft vs Sending), action controls to sync pre-validated executive lead contacts, and PDF Campaign Report downloads.
* **Leads Board Views:**
  * **Unified List Feed:** Tabular display of target executives containing scores, positions, organization, contact methods (active indicators for phone, email, LinkedIn), and expansion details.
  * **Interactive Pipeline Board:** Visualizes leads classified into functional horizontal pipeline columns with beautiful colored badges and counts:
    1. **Imported Leads** (Purple)
    2. **Pending Action** (Amber)
    3. **AI Generated** (Blue)
    4. **Outreach Sent** (Emerald)
    5. **Failed Outreach** (Red)
  * **Drag-and-Drop Operations:** Fluid drag-and-drop interface supporting immediate lead status transitions by physical placement onto separate destination panels.
  * **Expanding Detail Drawers:** Direct tap toggle reveals executive primary email, phone lines, and individual detail editing fields.

### B. Prospect Intelligence (Saved Dossiers & Deep Research)
* **Smart Search Dossiers:** Input executive company names/roles to generate enterprise B2B consultant intelligence documents, architecture strategies, and profiles.
* **Dossier Repository:** A responsive list of all historically gathered research documents containing client summaries, pain points, structured value propositions, and dynamic exports.

### C. Lead Journey Analytics
* **Interactive Histograms:** Beautifully detailed D3/Recharts-powered statistical distributions of lead quality scores.
* **Drift & Funnel Visualization:** Visual charts mapping contact scoring metrics, activity trends, and conversion analytics.

### D. Team Administration Consolidation
* **Dynamic Member Rails:** Manage team personnel roles (Super Admin, Sales Representative, CRO Consultant) with profile settings and platform level access controls.
* **Activity Metrics Trackers:** Continuous audits of individual sales members running active outreach routines.

### E. System Settings (API Key Management)
* **REST API Credentials:** Generate elite cryptographic API verification tokens prefixed by customized sub-domain security anchors.
* **Webhook Gateways:** Define live subscription trigger endpoints (e.g., `lead.created`) with chronological ping test payload logs and execution responses.

### F. Super Admin Control Center (AI & LLM Routing Engine)
A dedicated administrative dashboard supervising system infrastructure, fallback clusters, and routing configurations:
* **Hybrid Multimodal Routing Matrix:** Customize active primary and failover models for:
  * **Gemini Web Gateway** (Pro/Flash models)
  * **NVIDIA NIM Fallback Hub** (Google Gemma-3N-it, Meta Llama 3.3 70B, etc.)
  * **Microsoft/OpenAI GPT-4o Gateway**
  * **OpenRouter Free Routing Hub**
* **Dynamic API Key & Variant Override:** Super administrators can securely customize individual custom secrets, rotate active routing models via localStorage cache parameters, toggle system status, view latency statistics, and trigger instant health ping tests.
* **Failover Chronological Audit Log:** Complete, visual list monitoring of system operations, failover sweeps, warning responses, and latency.

---

## 3. Data Integration & CSV Import Pipelines
* **Automated Lead Parser:** Paste raw CSV format data or drag-and-drop spreadsheets to automatically populate active campaign databases. 
* **Intelligent Mapping Heuristic:** Seamless conversion matching variable attributes (e.g., First Name, Apollo ID, Sector, Corporate Phone lines) to standardized CRM layouts and calculating dynamic priority scoring based on seniority attributes.
