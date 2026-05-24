# Zyntra AI Outreach Engine - Project Documentation

## 1. Project Overview
**Name:** Zyntra AI Outreach Engine
**Description:** A next-generation AI-powered omnichannel outreach platform designed to generate highly personalized WhatsApp, LinkedIn, and Email messages using advanced AI agents.

## 2. Core Features
- **Campaign Management:** Create and manage multiple outreach strategies with specific goals and product DNA.
- **Lead Management:** 
    - Bulk import from CSV/Excel.
    - Manual lead entry.
    - Automatic lead scoring based on role, company, and industry.
- **AI Personalization:** Uses Google Gemini API to generate custom messages for three distinct channels per lead.
- **LinkedIn Bridge:** Secure OAuth integration to connect personal LinkedIn profiles for automated sending.
- **SMTP Integration:** Custom SMTP configuration for direct email outreach.
- **Team Administration:** Role-Based Access Control (RBAC) with Super Admin, Org Admin, and User roles.
- **Real-time Sync:** Powered by Firebase Firestore for instant updates across the team.
- **Export Capabilities:** Download outreach data in CSV or JSON formats for integration with tools like n8n, Apollo, or Lemlist.

## 3. Tech Stack
- **Frontend:** React 19, TypeScript, Vite.
- **Styling:** Tailwind CSS 4.0 (Utility-first).
- **Animations:** Framer Motion (motion/react).
- **Icons:** Lucide React.
- **Backend/Database:** Firebase Firestore (NoSQL).
- **Authentication:** Firebase Authentication (Google Login, LinkedIn OAuth).
- **AI Engine:** Google Gemini API (@google/genai).
- **Data Processing:** XLSX (Excel/CSV parsing).

## 4. Security Architecture
- **Firestore Rules:** Strict "Default Deny" policy.
- **RBAC:**
    - **Super Admin:** Full platform control.
    - **Org Admin:** Manage organization users and data.
    - **User:** Manage own campaigns and leads.
- **Data Validation:** All writes are validated for schema integrity and size limits.

## 5. Deployment & Infrastructure
- **Hosting:** Cloud Run (Containerized).
- **Environment Management:** Managed via `.env` and `firebase-applet-config.json`.
- **Reverse Proxy:** Nginx layer for secure port 3000 routing.

---
*Generated on: 2026-04-12*
