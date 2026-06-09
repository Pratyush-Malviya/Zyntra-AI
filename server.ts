import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- Interfaces ---
interface Lead {
  id: string; campaignId: string; name: string; role: string; company: string;
  email: string; phone: string; status: "imported" | "generated" | "sent";
  score: number; tags?: string[]; industry?: string; country?: string; linkedin_url?: string; createdAt?: string;
}
interface Deal {
  id: string; leadId: string; title: string; value: number; currency: string;
  stage: string; createdAt: string; tags?: string[]; status?: "hot" | "warm" | "cold" | "lost"; summaryNote?: string;
}
interface PipelineStage { id: string; name: string; color: string; probability: number; slaDays: number; statuses: string[]; }
interface Pipeline { id: string; name: string; stages: PipelineStage[]; }
interface Campaign { id: string; name: string; status: "draft" | "active" | "completed"; leadsCount: number; createdAt: string; config?: any; }
interface Contact { id: string; firstName: string; lastName: string; email: string; phone: string; jobTitle: string; company: string; linkedin: string; notes: string; createdAt: string; }
interface Account { id: string; name: string; industry: string; website: string; email: string; phone: string; city: string; country: string; employees: number; createdAt: string; }
interface Quote { id: string; number: string; type: "quote" | "invoice" | "contract"; title: string; accountName: string; amount: number; currency: string; status: string; dueDate: string; createdAt: string; }
interface Task { id: string; title: string; description: string; status: "pending" | "completed"; dueDate: string; priority: "low" | "medium" | "high"; createdAt: string; }
interface Activity { id: string; type: string; description: string; relatedId: string; relatedType: string; createdAt: string; }
interface KbFile { id: string; file_name: string; file_type: string; summary: string; uploaded_at: string; status: "processing" | "ready" | "failed"; }
interface KbSummary { summary_text: string; key_products: string[]; key_services: string[]; usp: string[]; tone?: string; }
interface ApiKey { id: string; keyPrefix: string; name: string; createdAt: string; rawKey?: string; }
interface ImportTemplate { id: string; name: string; mappingJSON: string; createdAt: string; }

// --- Data Stores ---
let leads: Lead[] = [
  { id: "lead-1", campaignId: "camp-default", name: "Sarah Mitchell", role: "VP Growth", company: "GrowthCo UK", email: "sarah@growthco.io", phone: "+44 7911 123456", status: "generated", score: 85, tags: ["Enterprise"], industry: "Software", country: "UK", linkedin_url: "https://linkedin.com/in/sarah" },
  { id: "lead-2", campaignId: "camp-default", name: "Aditi Sharma", role: "CEO", company: "TechCorp India", email: "aditi@techcorp.in", phone: "+91 98765 43210", status: "imported", score: 70, tags: ["SaaS"], industry: "SaaS", country: "India" },
];
let deals: Deal[] = [
  { id: "deal-1", leadId: "lead-1", title: "Enterprise Outreach Partnership", value: 45000, currency: "USD", stage: "stage-lead", createdAt: new Date().toISOString(), tags: ["B2B"], status: "hot" },
  { id: "deal-2", leadId: "lead-2", title: "Global Sales Bundle", value: 120000, currency: "USD", stage: "stage-active", createdAt: new Date().toISOString(), status: "warm" },
];
let pipelines: Pipeline[] = [
  { id: "pipe-default", name: "Sales Pipeline", stages: [
    { id: "stage-lead", name: "Lead", color: "#ff7043", probability: 25, slaDays: 5, statuses: ["Awaiting Intro", "Discovery Booked"] },
    { id: "stage-prospect", name: "Prospect", color: "#ffb300", probability: 50, slaDays: 10, statuses: ["Drafting proposal", "Proposal Delivered"] },
    { id: "stage-active", name: "Active", color: "#26a69a", probability: 75, slaDays: 7, statuses: ["SLA Review", "Contracting"] },
    { id: "stage-closed", name: "Closed Won", color: "#42a5f5", probability: 100, slaDays: 0, statuses: ["Onboarding"] },
  ]},
];
let campaigns: Campaign[] = [
  { id: "camp-default", name: "Q2 Outreach", status: "active", leadsCount: 2, createdAt: new Date().toISOString() },
];
let contacts: Contact[] = [];
let accounts: Account[] = [];
let quotes: Quote[] = [];
let tasks: Task[] = [];
let activities: Activity[] = [];
let kbFiles: KbFile[] = [];
let kbSummaries: KbSummary[] = [];
let apiKeys: ApiKey[] = [];
let importTemplates: ImportTemplate[] = [];

// --- Auth Middleware ---
const authenticateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.headers["x-user-id"] = req.header("x-user-id") || "user-default";
  next();
};

function hashApiKey(key: string): string {
  let hash = 0; for (let i = 0; i < key.length; i++) { hash = ((hash << 5) - hash) + key.charCodeAt(i); hash |= 0; }
  return "hash_" + Math.abs(hash).toString(36);
}

// --- Routes ---
app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// NVIDIA AI Proxy
app.post("/api/ai/nvidia", express.json(), async (req, res) => {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) return res.status(400).json({ error: "NVIDIA_API_KEY not configured" });
  const { model, messages, systemPrompt, temperature, max_tokens, top_p, frequency_penalty, presence_penalty, response_format } = req.body;
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${nvidiaKey}` },
      body: JSON.stringify({
        model: model || "google/gemma-3n-e2b-it",
        messages: [...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []), ...(messages || [])],
        ...(temperature !== undefined ? { temperature } : { temperature: 0.20 }),
        ...(max_tokens !== undefined ? { max_tokens } : { max_tokens: 3000 }),
        ...(top_p !== undefined ? { top_p } : {}),
        ...(frequency_penalty !== undefined ? { frequency_penalty } : {}),
        ...(presence_penalty !== undefined ? { presence_penalty } : {}),
        ...(response_format ? { response_format } : {}),
      }),
    });
    if (!response.ok) return res.status(response.status).json({ error: await response.text() });
    res.json(await response.json());
  } catch (err: any) { res.status(502).json({ error: err.message }); }
});

// --- Leads CRUD ---
app.get("/api/leads", (req, res) => res.json(leads));
app.get("/api/leads/:id", (req, res) => { const l = leads.find(l => l.id === req.params.id); if (!l) return res.status(404).json({ error: "Not found" }); res.json(l); });
app.post("/api/leads", (req, res) => {
  const lead: Lead = { id: "lead-" + Date.now(), campaignId: "camp-default", ...req.body, createdAt: new Date().toISOString() };
  leads.push(lead); activities.unshift({ id: "act-" + Date.now(), type: "lead.created", description: `Lead ${lead.name} created`, relatedId: lead.id, relatedType: "lead", createdAt: new Date().toISOString() });
  res.status(201).json(lead);
});
app.put("/api/leads/:id", (req, res) => {
  const idx = leads.findIndex(l => l.id === req.params.id); if (idx === -1) return res.status(404).json({ error: "Not found" });
  leads[idx] = { ...leads[idx], ...req.body }; res.json(leads[idx]);
});
app.delete("/api/leads/:id", (req, res) => { leads = leads.filter(l => l.id !== req.params.id); res.json({ success: true }); });

// --- Deals CRUD ---
app.get("/api/deals", (req, res) => res.json(deals));
app.get("/api/deals/:id", (req, res) => { const d = deals.find(d => d.id === req.params.id); if (!d) return res.status(404).json({ error: "Not found" }); res.json(d); });
app.post("/api/deals", (req, res) => {
  const deal: Deal = { id: "deal-" + Date.now(), currency: "USD", ...req.body, createdAt: new Date().toISOString() };
  deals.push(deal); res.status(201).json(deal);
});
app.put("/api/deals/:id", (req, res) => {
  const idx = deals.findIndex(d => d.id === req.params.id); if (idx === -1) return res.status(404).json({ error: "Not found" });
  deals[idx] = { ...deals[idx], ...req.body }; res.json(deals[idx]);
});
app.delete("/api/deals/:id", (req, res) => { deals = deals.filter(d => d.id !== req.params.id); res.json({ success: true }); });

// --- Pipelines ---
app.get("/api/pipelines", (req, res) => res.json(pipelines));
app.post("/api/pipelines", (req, res) => { pipelines.push({ id: "pipe-" + Date.now(), ...req.body }); res.status(201).json(pipelines[pipelines.length - 1]); });
app.put("/api/pipelines/:id", (req, res) => {
  const idx = pipelines.findIndex(p => p.id === req.params.id); if (idx === -1) return res.status(404).json({ error: "Not found" });
  pipelines[idx] = { ...pipelines[idx], ...req.body }; res.json(pipelines[idx]);
});

// --- Campaigns ---
app.get("/api/campaigns", (req, res) => res.json(campaigns));
app.post("/api/campaigns", (req, res) => {
  const c: Campaign = { id: "camp-" + Date.now(), status: "draft", leadsCount: 0, ...req.body, createdAt: new Date().toISOString() };
  campaigns.push(c); res.status(201).json(c);
});
app.put("/api/campaigns/:id", (req, res) => {
  const idx = campaigns.findIndex(c => c.id === req.params.id); if (idx === -1) return res.status(404).json({ error: "Not found" });
  campaigns[idx] = { ...campaigns[idx], ...req.body }; res.json(campaigns[idx]);
});
app.delete("/api/campaigns/:id", (req, res) => { campaigns = campaigns.filter(c => c.id !== req.params.id); res.json({ success: true }); });

// --- Contacts CRUD ---
app.get("/api/contacts", (req, res) => res.json(contacts));
app.post("/api/contacts", (req, res) => {
  const c: Contact = { id: "con-" + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  contacts.push(c); res.status(201).json(c);
});
app.put("/api/contacts/:id", (req, res) => {
  const idx = contacts.findIndex(c => c.id === req.params.id); if (idx === -1) return res.status(404).json({ error: "Not found" });
  contacts[idx] = { ...contacts[idx], ...req.body }; res.json(contacts[idx]);
});
app.delete("/api/contacts/:id", (req, res) => { contacts = contacts.filter(c => c.id !== req.params.id); res.json({ success: true }); });

// --- Accounts CRUD ---
app.get("/api/accounts", (req, res) => res.json(accounts));
app.post("/api/accounts", (req, res) => {
  const a: Account = { id: "acc-" + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  accounts.push(a); res.status(201).json(a);
});
app.put("/api/accounts/:id", (req, res) => {
  const idx = accounts.findIndex(a => a.id === req.params.id); if (idx === -1) return res.status(404).json({ error: "Not found" });
  accounts[idx] = { ...accounts[idx], ...req.body }; res.json(accounts[idx]);
});
app.delete("/api/accounts/:id", (req, res) => { accounts = accounts.filter(a => a.id !== req.params.id); res.json({ success: true }); });

// --- Quotes CRUD ---
app.get("/api/quotes", (req, res) => res.json(quotes));
app.post("/api/quotes", (req, res) => {
  const q: Quote = { id: "qte-" + Date.now(), number: "QTE-" + String(quotes.length + 1).padStart(4, "0"), type: "quote", status: "draft", currency: "USD", ...req.body, createdAt: new Date().toISOString() };
  quotes.push(q); res.status(201).json(q);
});
app.put("/api/quotes/:id", (req, res) => {
  const idx = quotes.findIndex(q => q.id === req.params.id); if (idx === -1) return res.status(404).json({ error: "Not found" });
  quotes[idx] = { ...quotes[idx], ...req.body }; res.json(quotes[idx]);
});
app.delete("/api/quotes/:id", (req, res) => { quotes = quotes.filter(q => q.id !== req.params.id); res.json({ success: true }); });

// --- Tasks ---
app.get("/api/tasks", (req, res) => res.json(tasks));
app.post("/api/tasks", (req, res) => {
  const t: Task = { id: "task-" + Date.now(), status: "pending", priority: "medium", ...req.body, createdAt: new Date().toISOString() };
  tasks.push(t); res.status(201).json(t);
});
app.put("/api/tasks/:id", (req, res) => {
  const idx = tasks.findIndex(t => t.id === req.params.id); if (idx === -1) return res.status(404).json({ error: "Not found" });
  tasks[idx] = { ...tasks[idx], ...req.body }; res.json(tasks[idx]);
});
app.delete("/api/tasks/:id", (req, res) => { tasks = tasks.filter(t => t.id !== req.params.id); res.json({ success: true }); });

// --- Activities ---
app.get("/api/activities", (req, res) => res.json(activities));
app.post("/api/activities", (req, res) => {
  const a: Activity = { id: "act-" + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  activities.unshift(a); res.status(201).json(a);
});

// --- User Preferences ---
let userPreferences: Record<string, any> = {};
app.get("/api/user-preferences", (req, res) => res.json(userPreferences));
app.post("/api/user-preferences", (req, res) => { userPreferences = { ...userPreferences, ...req.body }; res.json(userPreferences); });

// --- API Keys ---
app.get("/api/api-keys", (req, res) => res.json(apiKeys.map(({ rawKey, ...rest }) => rest)));
app.post("/api/api-keys", (req, res) => {
  const { name } = req.body; if (!name) return res.status(400).json({ error: "Name required" });
  const keyPrefix = "zy_" + Math.random().toString(36).substr(2, 5);
  const keyBody = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const rawKey = `${keyPrefix}.${keyBody}`;
  const newKey: ApiKey = { id: "ak-" + Date.now(), keyPrefix, name, createdAt: new Date().toISOString(), rawKey };
  apiKeys.push(newKey); res.status(201).json(newKey);
});
app.delete("/api/api-keys/:id", (req, res) => {
  const idx = apiKeys.findIndex(k => k.id === req.params.id); if (idx === -1) return res.status(404).json({ error: "Not found" });
  apiKeys.splice(idx, 1); res.json({ success: true });
});

// --- Knowledge Base ---
app.get("/api/kb", (req, res) => res.json({ files: kbFiles, summary: kbSummaries[0] || null }));
app.post("/api/kb/files", (req, res) => {
  const { file_name, file_type, content } = req.body;
  if (!file_name || !content) return res.status(400).json({ error: "Name and content required" });
  const file: KbFile = { id: "kb-" + Date.now(), file_name, file_type: file_type || "text", summary: content.substring(0, 200), uploaded_at: new Date().toISOString(), status: "ready" };
  kbFiles.push(file); res.status(201).json(file);
});
app.delete("/api/kb/files/:id", (req, res) => { kbFiles = kbFiles.filter(f => f.id !== req.params.id); res.json({ success: true }); });
app.post("/api/kb/generate-outreach", async (req, res) => {
  const { leadId } = req.body; const lead = leads.find(l => l.id === leadId);
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  const kbCtx = kbSummaries[0] || { summary_text: "B2B Outreach platform", key_products: ["Zyntra AI"], key_services: [], usp: ["High conversion"], tone: "Professional" };
  const prompt = `Generate personalized outreach for ${lead.name} at ${lead.company}...`;
  res.json({ generated: true, message: `Mock outreach for ${lead.name} using KB context` });
});

// --- Import ---
app.post("/api/import/ai-align", async (req, res) => {
  const { headers } = req.body; if (!headers) return res.status(400).json({ error: "Headers required" });
  const mapping: Record<string, string> = {};
  const headerLower = headers.map((h: string) => h.toLowerCase());
  const fieldMap: Record<string, string> = { name: "name", email: "email", company: "company", phone: "phone", role: "role", title: "role", industry: "industry", country: "country", linkedin: "linkedin_url", website: "website", score: "score" };
  headerLower.forEach((h: string, i: number) => {
    for (const [key, val] of Object.entries(fieldMap)) { if (h.includes(key)) { mapping[headers[i]] = val; break; } }
  });
  res.json({ mapping, confidence: 0.85 });
});
app.get("/api/import/templates", (req, res) => res.json(importTemplates));
app.post("/api/import/templates", (req, res) => {
  const t: ImportTemplate = { id: "tmpl-" + Date.now(), ...req.body, createdAt: new Date().toISOString() };
  importTemplates.push(t); res.status(201).json(t);
});
app.post("/api/import/trigger", async (req, res) => {
  const { leads: importLeads } = req.body; if (!importLeads?.length) return res.status(400).json({ error: "No leads provided" });
  let imported = 0, errors = 0;
  importLeads.forEach((ld: any) => {
    if (ld.name && ld.email) { leads.push({ id: "lead-" + Date.now() + Math.random(), campaignId: "camp-default", status: "imported", score: 50, ...ld, createdAt: new Date().toISOString() }); imported++; }
    else errors++;
  });
  res.json({ imported, errors, total: importLeads.length });
});

// --- Send Email (SMTP) ---
app.post("/api/send-email", async (req, res) => {
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: "Missing fields" });
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com", port: Number(process.env.SMTP_PORT) || 587,
      secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html: body,
    });
    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// --- Production static serving ---
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => { res.sendFile(path.join(distPath, "index.html")); });

// --- Export for Vercel ---
export default app;
module.exports = app;

// --- Local dev server ---
if (process.env.VERCEL !== '1') {
  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://0.0.0.0:${PORT}`));
}
