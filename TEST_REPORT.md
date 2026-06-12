# Zyntra-AI — Web Application Test Report

**Date:** 12 June 2026  
**Tester:** Automated (Playwright + anthropics/webapp-testing skill)  
**Repository:** Zyntra-AI (react-example)

---

## 1. Test Environment

| Component | Version |
|---|---|
| Node.js | v24.14.0 |
| Python | 3.14.3 |
| Playwright (npm) | ^1.60.0 |
| Playwright (Python) | 1.60.0 |
| Chromium | 148.0.7778.96 (Playwright bundle) |
| Browser mode | Headless |
| Server port | 3000 |
| Server command | `tsx server.ts` (Express + Vite middleware) |
| Test runner | `with_server.py` (server lifecycle manager) |

### Infrastructure

- **`with_server.py`** (adapted from `anthropics/skills/.../webapp-testing`) manages server startup, waits for port readiness, runs the test script, then terminates the server.
- Tests are standalone Python scripts using `playwright.sync_api`.
- Server architecture: Express backend (port 3000) with Vite in middleware mode serving the React SPA. WebSocket endpoint at `/crm-sync/{workspace_id}`.

---

## 2. Test Results Summary

| # | Test | Result | Screenshots | Duration |
|---|---|---|---|---|
| 1 | Smoke test | **PASSED** | `landing.png`, `login.png` | ~45s |
| 2 | Login flow | **PASSED** | `login_all_roles.png`, `sdr_dashboard.png` | ~45s |
| 3 | Outreach campaign | **PASSED** | `outreach_campaigns.png`, `outreach_all_tabs.png` | ~50s |

**All 3 tests pass with 0 runtime errors.**

---

## 3. Detailed Test Results

### 3.1 Smoke Test (`tests/smoke_test.py`)

**Purpose:** Verify the application loads without crashes and basic navigation works.

**Steps performed:**
1. Navigate to `http://localhost:3000`
2. Assert Zyntra branding is present in `<body>`
3. Assert "Get Started Now" CTA button is visible
4. Assert FAQ section (`#faq`) is visible
5. Take screenshot of landing page
6. Click "Get Started Now"
7. Assert Google Sign-In button is visible
8. Assert "Instant Demo Presets" section is visible
9. Take screenshot of login page

**Assertions:**
- `'ZYNTRA' in page.text_content('body')` — PASS
- `page.locator('text=Get Started Now').is_visible()` — PASS
- `page.locator('#faq').is_visible()` — PASS
- `page.locator('text=Sign in with Google Account').is_visible()` — PASS
- `page.locator('text=Instant Demo Presets').is_visible()` — PASS

**Console errors detected:** None  
**Page errors detected:** None

---

### 3.2 Login Flow Test (`tests/login_test.py`)

**Purpose:** Verify all 6 demo presets are rendered and SDR login transitions to the workspace.

**Steps performed:**
1. Navigate to landing page, click "Get Started Now"
2. Assert all 6 demo user names are visible: Pratyush Malviya, Harvey Specter, Mike Ross, Louis Litt, Rachel Zane, Donna Paulsen
3. Assert Google OAuth button exists
4. Take screenshot of login page with all roles
5. Click "Mike Ross" (SDR role) to trigger demo login
6. Assert SDR workspace loads with "Outreach" header
7. Take screenshot of SDR dashboard

**Assertions:**
- All 6 demo users visible — PASS
- Google OAuth button visible — PASS
- SDR workspace shows "Outreach" after login — PASS

**Page errors after login:** None

**Notes:**
- Demo login bypasses Firebase Auth and uses fallback local state (Firestore seed may fail in non-emulator environments, but the app handles this gracefully).

---

### 3.3 Outreach Campaign Test (`tests/outreach_flow.py`)

**Purpose:** Verify SDR campaign workspace tabs are functional.

**Steps performed:**
1. Navigate to landing page, click "Get Started Now"
2. Login as SDR (Mike Ross)
3. Take screenshot of Outreach campaigns view
4. Iterate through all 5 campaign tabs and click each:
   - Configure
   - Import Leads
   - Generate Copy
   - Send Outreach
   - Reports
5. Take screenshot of final state

**Assertions:**
- Each tab button found and clickable via `get_by_role('button', name=...)` — PASS

---

## 4. Application Architecture Overview

```

User → Browser → Vite Dev Middleware → Express API (port 3000)
                     ↓
               React SPA (Vite HMR)
                     ↓
         Firebase (Firestore, Auth) — simulated/demo mode
```

| Layer | Technology |
|---|---|
| Frontend | React 19, Chakra UI 2, Saas UI 2, Tailwind CSS 4, Framer Motion |
| Backend | Express 4, Vite middleware mode, WebSocket (ws) |
| AI | OpenAI SDK (NVIDIA NIM proxy), Anthropic SDK |
| Auth | Firebase Auth (Google OAuth + demo presets) |
| Data | Firebase Firestore (with in-memory fallback) |
| Integrations | Composio (Gmail, Slack, HubSpot, etc.), Nodemailer |

### Roles (6)

- Super Admin, Org Admin, SDR, Manager, AE, Viewer

### Key Pages/Views (24)

Landing → Login → Outreach Campaigns | Prospect Intel | SDR Workspace | Manager Dashboard | AE Pipeline | Admin Panels | Settings

---

## 5. Screenshots

| File | Size | Content |
|---|---|---|
| `tests/screenshots/landing.png` | 560 KB | Full-page landing page with Zyntra branding, CTA, ROI calculator, FAQ |
| `tests/screenshots/login.png` | 142 KB | Login view with Google OAuth and 6 demo user cards |
| `tests/screenshots/login_all_roles.png` | 132 KB | Same login view (alternate capture) |
| `tests/screenshots/sdr_dashboard.png` | 6 KB | SDR workspace after login (compact capture) |
| `tests/screenshots/outreach_campaigns.png` | 6 KB | Outreach campaigns initial view |
| `tests/screenshots/outreach_all_tabs.png` | 80 KB | All 5 campaign tabs visited |

---

## 6. Known Issues & Observations

### A. TypeScript Compilation Errors
`npm run lint` reports **43 TypeScript errors**:
- `src/App.tsx:2704` — `Kanban` component referenced but not imported
- `src/components/layout/AppShell.tsx` — Multiple prop-type mismatches (`label`, `bgOpacity`, `align`) likely due to @saas-ui/react version incompatibility

These do not prevent runtime execution (Vite/tsx compiles at runtime), but should be addressed for type safety.

### B. Demo Login Firebase Dependency
Demo login attempts to write to Firebase Firestore, which fails without an active Firebase project. The app has a `try/catch` fallback to local state — this works correctly but logs a warning to console.

### C. Server Port
The app listens on **port 3000** (Express), not 5173 (Vite default). Vite runs in middleware mode embedded within Express.

---

## 7. Recommendations

1. **Fix TypeScript errors** — Resolve the 43 lint errors for type safety (especially AppShell NavItem props and missing Kanban import).
2. **Add more test coverage** — Extend tests to cover:
   - Manager dashboard (team feed, approvals, call coaching)
   - AE pipeline (Kanban deal drag-and-drop)
   - Super Admin / Org Admin panels
   - Settings & API key management
   - Prospect Research panel
3. **Add `tests/screenshots/` to `.gitignore`** (already done).
4. **Consider pytest migration** — Convert standalone scripts to pytest fixtures for better assertions, parametrization, and reporting.

---

## 8. How to Run

```bash
# Quick smoke test
npm run test:smoke

# Login flow test
npm run test:login

# Outreach campaign test
npm run test:outreach

# All tests (requires pytest)
npm run test
```
