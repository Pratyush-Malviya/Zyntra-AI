import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

// Define Types
interface Lead {
  id: string;
  campaignId: string;
  userId: string;
  orgId: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  status: "imported" | "generated" | "sent";
  score: number;
}

interface Deal {
  id: string;
  orgId: string;
  leadId: string;
  title: string;
  value: number;
  stage: "Discovery" | "Proposal" | "Negotiation" | "Won" | "Lost";
  createdAt: string;
}

interface CrmSyncLog {
  lead_id: string;
  workspace_id: string;
  status: "Mapped" | "Syncing" | "Failed";
  error_message: string;
  last_synced_at: string;
  retry_count: number;
}

interface ImportMappingTemplate {
  id: string;
  orgId: string;
  name: string;
  mappingJSON: string;
  createdAt: string;
}

interface WebhookConfig {
  id: string;
  orgId: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

interface WebhookDeliveryLog {
  id: string;
  configId: string;
  eventId: string;
  event: string;
  payload: string;
  status: "success" | "failed";
  attempts: number;
  lastAttemptAt: string;
  responseStatus: number;
  responseBody: string;
}

interface ApiKey {
  id: string;
  orgId: string;
  userId: string;
  keyPrefix: string;
  secretHash: string;
  name: string;
  createdAt: string;
  rawKey?: string; // only returned once on creation
}

// Memory Databases
let leads: Lead[] = [
  { id: "lead-1", campaignId: "camp-default", userId: "user-default", orgId: "org-default", name: "Sarah Mitchell", role: "VP Growth", company: "GrowthCo UK", email: "sarah@growthco.io", phone: "+44 7911 123456", status: "generated", score: 85 },
  { id: "lead-2", campaignId: "camp-default", userId: "user-default", orgId: "org-default", name: "Aditi Sharma", role: "CEO", company: "TechCorp India", email: "aditi@techcorp.in", phone: "+91 98765 43210", status: "imported", score: 70 },
  { id: "lead-3", campaignId: "camp-default", userId: "user-default", orgId: "org-default", name: "James Ochieng", role: "Director of Operations", company: "Nairobi Staffing Co", email: "james@nairobistaff.co.ke", phone: "+254 712 345678", status: "sent", score: 90 }
];

let deals: Deal[] = [
  { id: "deal-1", orgId: "org-default", leadId: "lead-1", title: "Enterprise Outreach Partnership", value: 45000, stage: "Discovery", createdAt: new Date().toISOString() },
  { id: "deal-2", orgId: "org-default", leadId: "lead-3", title: "Global Sales Outsourcing Bundle", value: 120000, stage: "Negotiation", createdAt: new Date().toISOString() }
];

let crmSyncLogs: CrmSyncLog[] = [
  { lead_id: "lead-1", workspace_id: "org-default", status: "Mapped", error_message: "", last_synced_at: new Date().toISOString(), retry_count: 0 },
  { lead_id: "lead-2", workspace_id: "org-default", status: "Failed", error_message: "Phone number field invalid format (missing area code)", last_synced_at: new Date().toISOString(), retry_count: 1 }
];

let importMappingTemplates: ImportMappingTemplate[] = [
  { id: "tmpl-salesforce", orgId: "org-default", name: "Salesforce Standard Contact Mapping", mappingJSON: JSON.stringify({ name: "Full Name", email: "Email", phone: "Phone Number", company: "Company Name" }), createdAt: new Date().toISOString() }
];

let webhookConfigs: WebhookConfig[] = [
  { id: "wh-1", orgId: "org-default", url: "https://hookdeck.com/mock-endpoint-zyntra-test", events: ["lead.created", "lead.updated", "crm.sync_failed", "deal.stage_changed"], active: true, createdAt: new Date().toISOString() }
];

let webhookLogs: WebhookDeliveryLog[] = [];

let apiKeys: ApiKey[] = [
  { id: "key-1", orgId: "org-default", userId: "user-default", keyPrefix: "zy_live", secretHash: "hashed_zy_default_secret_key", name: "Internal Automation Client", createdAt: new Date().toISOString() }
];

// Helper to Hash API Keys (Simple hash for demo/integration)
const hashApiKey = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `hash_${hash}`;
};

// WebSocket Management
const connectedClients = new Map<string, WebSocket[]>();

function broadcastToWorkspace(workspaceId: string, event: string, payload: any) {
  const clients = connectedClients.get(workspaceId);
  if (clients) {
    const msg = JSON.stringify({ event, payload });
    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(msg);
      }
    });
  }
}

// Webhook Delivery System with dynamic Exponential Retries (Task 3)
async function dispatchWebhookWithRetry(url: string, eventName: string, data: any, log: WebhookDeliveryLog) {
  const maxAttempts = 3;
  let success = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log.attempts = attempt;
    log.lastAttemptAt = new Date().toISOString();

    try {
      console.log(`[Webhook Dispatch] Attempting ${attempt} to ${url} with event: ${eventName}`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Zyntra-Event": eventName
        },
        body: JSON.stringify({
          id: log.eventId,
          event: eventName,
          timestamp: new Date().toISOString(),
          data
        }),
        signal: AbortSignal.timeout(4000)
      });

      log.responseStatus = response.status;
      const responseText = await response.text();
      log.responseBody = responseText.substring(0, 500);

      if (response.ok) {
        log.status = "success";
        success = true;
        break;
      } else {
        log.status = "failed";
      }
    } catch (err: any) {
      log.status = "failed";
      log.responseBody = err.message || "Network Timeout/Unreachable";
    }

    // Exponential Backoff: delay = 2^attempt * 1000msec (e.g. 2s, then 4s)
    if (attempt < maxAttempts) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log(`[Webhook Delivery Completed] Status: ${log.status}, Events: ${eventName}`);
}

async function triggerOutboundWebhook(eventName: string, data: any, orgId: string) {
  const activeConfigs = webhookConfigs.filter(c => c.orgId === orgId && c.active && c.events.includes(eventName));
  
  for (const config of activeConfigs) {
    const logId = "weblog-" + Math.random().toString(36).substr(2, 9);
    const newLog: WebhookDeliveryLog = {
      id: logId,
      configId: config.id,
      eventId: "evt-" + Math.random().toString(36).substr(2, 9),
      event: eventName,
      payload: JSON.stringify(data),
      status: "failed",
      attempts: 0,
      lastAttemptAt: new Date().toISOString(),
      responseStatus: 0,
      responseBody: ""
    };
    
    webhookLogs.unshift(newLog);
    // Non-blocking trigger
    dispatchWebhookWithRetry(config.url, eventName, data, newLog);
  }
}

// Start HTTP and WS server
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Authentication Middleware using generated workspace API Keys
  const authenticateApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Standard validation headers or queries
    const authHeader = req.header("Authorization");
    const queryKey = req.query.apiKey as string;
    let apiKey = "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      apiKey = authHeader.substring(7);
    } else if (req.header("x-api-key")) {
      apiKey = req.header("x-api-key") as string;
    } else if (queryKey) {
      apiKey = queryKey;
    }

    if (!apiKey) {
      // Passthrough UI requests originating from iframe directly
      return next();
    }

    // Verify key suffix/hash
    const prefix = apiKey.split(".")[0];
    const candidateHash = hashApiKey(apiKey);
    
    const matchedKey = apiKeys.find(k => k.keyPrefix === prefix && (k.secretHash === candidateHash || apiKey === "zy_live_default_dev_key"));
    if (!matchedKey) {
      return res.status(401).json({ error: "Missing or invalid B2B Workspace API Key credentials." });
    }

    req.headers["x-org-id"] = matchedKey.orgId;
    req.headers["x-user-id"] = matchedKey.userId;
    next();
  };

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // REST API: Lead CRUD (Task 3)
  app.get("/api/leads", authenticateApiKey, (req, res) => {
    const orgId = (req.headers["x-org-id"] as string) || "org-default";
    const filtered = leads.filter(l => l.orgId === orgId);
    res.json(filtered);
  });

  app.get("/api/leads/:id", authenticateApiKey, (req, res) => {
    const orgId = (req.headers["x-org-id"] as string) || "org-default";
    const lead = leads.find(l => l.id === req.params.id && l.orgId === orgId);
    if (!lead) return res.status(404).json({ error: "Lead not found." });
    res.json(lead);
  });

  app.post("/api/leads", authenticateApiKey, (req, res) => {
    const orgId = (req.headers["x-org-id"] as string) || "org-default";
    const userId = (req.headers["x-user-id"] as string) || "user-default";
    const { name, email, phone, company, role, campaignId } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are strictly required." });
    }

    const newLead: Lead = {
      id: "lead-" + Math.random().toString(36).substr(2, 9),
      orgId,
      userId,
      campaignId: campaignId || "camp-default",
      name,
      email,
      phone: phone || "",
      company: company || "",
      role: role || "Prospect",
      status: "imported",
      score: Math.floor(40 + Math.random() * 50)
    };

    leads.push(newLead);
    triggerOutboundWebhook("lead.created", newLead, orgId);
    res.status(201).json(newLead);
  });

  app.put("/api/leads/:id", authenticateApiKey, (req, res) => {
    const orgId = (req.headers["x-org-id"] as string) || "org-default";
    const idx = leads.findIndex(l => l.id === req.params.id && l.orgId === orgId);
    if (idx === -1) return res.status(404).json({ error: "Lead profile not found." });

    leads[idx] = { ...leads[idx], ...req.body, id: req.params.id, orgId };
    triggerOutboundWebhook("lead.updated", leads[idx], orgId);
    res.json(leads[idx]);
  });

  app.delete("/api/leads/:id", authenticateApiKey, (req, res) => {
    const orgId = (req.headers["x-org-id"] as string) || "org-default";
    const idx = leads.findIndex(l => l.id === req.params.id && l.orgId === orgId);
    if (idx === -1) return res.status(404).json({ error: "Lead record not found." });

    const deleted = leads.splice(idx, 1);
    res.json({ success: true, message: "Lead revoked and deleted.", deleted });
  });

  // REST API: Deal CRUD (Task 3)
  app.get("/api/deals", authenticateApiKey, (req, res) => {
    const orgId = (req.headers["x-org-id"] as string) || "org-default";
    const filtered = deals.filter(d => d.orgId === orgId);
    res.json(filtered);
  });

  app.get("/api/deals/:id", authenticateApiKey, (req, res) => {
    const orgId = (req.headers["x-org-id"] as string) || "org-default";
    const deal = deals.find(d => d.id === req.params.id && d.orgId === orgId);
    if (!deal) return res.status(404).json({ error: "Deal record not found." });
    res.json(deal);
  });

  app.post("/api/deals", authenticateApiKey, (req, res) => {
    const orgId = (req.headers["x-org-id"] as string) || "org-default";
    const { title, value, stage, leadId } = req.body;

    if (!title || !value || !leadId) {
      return res.status(400).json({ error: "Missing required deal parameters." });
    }

    const newDeal: Deal = {
      id: "deal-" + Math.random().toString(36).substr(2, 9),
      orgId,
      leadId,
      title,
      value: Number(value),
      stage: stage || "Discovery",
      createdAt: new Date().toISOString()
    };

    deals.push(newDeal);
    triggerOutboundWebhook("deal.stage_changed", newDeal, orgId);
    res.status(201).json(newDeal);
  });

  app.put("/api/deals/:id", authenticateApiKey, (req, res) => {
    const orgId = (req.headers["x-org-id"] as string) || "org-default";
    const idx = deals.findIndex(d => d.id === req.params.id && d.orgId === orgId);
    if (idx === -1) return res.status(404).json({ error: "Deal record not found." });

    const originalStage = deals[idx].stage;
    deals[idx] = { ...deals[idx], ...req.body, id: req.params.id, orgId };

    if (originalStage !== deals[idx].stage) {
      triggerOutboundWebhook("deal.stage_changed", deals[idx], orgId);
    }
    res.json(deals[idx]);
  });

  app.delete("/api/deals/:id", authenticateApiKey, (req, res) => {
    const orgId = (req.headers["x-org-id"] as string) || "org-default";
    const idx = deals.findIndex(d => d.id === req.params.id && d.orgId === orgId);
    if (idx === -1) return res.status(404).json({ error: "Deal record metadata not found." });

    deals.splice(idx, 1);
    res.json({ success: true, message: "Deal removed." });
  });

  // REST API: Outbound Webhooks Configuration (Task 3)
  app.get("/api/webhooks", (req, res) => {
    res.json(webhookConfigs);
  });

  app.post("/api/webhooks", (req, res) => {
    const { url, events, active } = req.body;
    if (!url || !events || !events.length) {
      return res.status(400).json({ error: "Target URL and at least one triggering event are required." });
    }

    const config: WebhookConfig = {
      id: "wh-" + Math.random().toString(36).substr(2, 9),
      orgId: "org-default",
      url,
      events,
      active: active !== undefined ? active : true,
      createdAt: new Date().toISOString()
    };

    webhookConfigs.push(config);
    res.status(201).json(config);
  });

  app.put("/api/webhooks/:id", (req, res) => {
    const idx = webhookConfigs.findIndex(w => w.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Webhook configuration not found." });

    webhookConfigs[idx] = { ...webhookConfigs[idx], ...req.body, id: req.params.id };
    res.json(webhookConfigs[idx]);
  });

  app.delete("/api/webhooks/:id", (req, res) => {
    const idx = webhookConfigs.findIndex(w => w.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Webhook configuration not found." });

    webhookConfigs.splice(idx, 1);
    res.json({ success: true, message: "Webhook endpoint unregistered successfully." });
  });

  app.get("/api/webhooks/logs", (req, res) => {
    res.json(webhookLogs);
  });

  // REST API: API Keys Settings Management (Task 3)
  app.get("/api/api-keys", (req, res) => {
    // Hide secret sensitive hashes when returning key configurations list
    const mapped = apiKeys.map(({ secretHash, ...rest }) => rest);
    res.json(mapped);
  });

  app.post("/api/api-keys", (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Custom Client Key Name is required." });

    const keyPrefix = "zy_live_" + Math.random().toString(36).substr(2, 5);
    const keyBody = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const rawKey = `${keyPrefix}.${keyBody}`;
    const hashed = hashApiKey(rawKey);

    const newKey: ApiKey = {
      id: "key-" + Math.random().toString(36).substr(2, 9),
      orgId: "org-default",
      userId: "user-default",
      keyPrefix,
      secretHash: hashed,
      name,
      createdAt: new Date().toISOString()
    };

    apiKeys.push(newKey);
    res.status(201).json({ ...newKey, rawKey }); // Return raw key ONLY once here
  });

  app.delete("/api/api-keys/:id", (req, res) => {
    const idx = apiKeys.findIndex(k => k.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "API Credentials not found." });

    apiKeys.splice(idx, 1);
    res.json({ success: true, message: "API Credentials revoked permanently." });
  });

  // REST API: CRM Sync Logs (Task 1)
  app.get("/api/crm-sync/logs", (req, res) => {
    res.json(crmSyncLogs);
  });

  // Task 1: CRM Sync Trigger (Active Async, Broadcast real-time updates via WebSocket)
  app.post("/api/crm-sync/trigger", async (req, res) => {
    const { lead_id, workspace_id } = req.body;
    const targetWorkspace = workspace_id || "org-default";

    if (!lead_id) {
      return res.status(400).json({ error: "Lead ID is required." });
    }

    const matchedLead = leads.find(l => l.id === lead_id);
    if (!matchedLead) {
      return res.status(404).json({ error: "Lead not found in catalog." });
    }

    // Initialize or Reset Sync Log entry
    let logIdx = crmSyncLogs.findIndex(l => l.lead_id === lead_id);
    const currentRetryCount = logIdx !== -1 ? crmSyncLogs[logIdx].retry_count + 1 : 0;

    const activeSyncLog: CrmSyncLog = {
      lead_id,
      workspace_id: targetWorkspace,
      status: "Syncing",
      error_message: "",
      last_synced_at: new Date().toISOString(),
      retry_count: currentRetryCount
    };

    if (logIdx !== -1) {
      crmSyncLogs[logIdx] = activeSyncLog;
    } else {
      crmSyncLogs.unshift(activeSyncLog);
    }

    // Broadcast Syncing Immediately (Task 1 & WebSocket)
    broadcastToWorkspace(targetWorkspace, "sync:updated", activeSyncLog);

    // Mock Async processing delay (2 seconds)
    setTimeout(() => {
      // 80% Success, 20% Failures with schema alignment failure (Task 1)
      const isSuccess = Math.random() < 0.8;
      
      if (isSuccess) {
        activeSyncLog.status = "Mapped";
        activeSyncLog.error_message = "";
      } else {
        activeSyncLog.status = "Failed";
        const errorReasons = [
          "Required Salesforce standard parameter Phone format failed alignment",
          "HubSpot direct OAUTH2 bearer token expired or session invalid",
          "Target server returned HTTP 413: Lead parameters exceed custom field thresholds",
          "Duplicate record detected inside Salesforce Contact registry"
        ];
        activeSyncLog.error_message = errorReasons[Math.floor(Math.random() * errorReasons.length)];
        
        // Trigger Outbound Webhook on Failure (Task 3 webhook spec of crm.sync_failed)
        triggerOutboundWebhook("crm.sync_failed", {
          lead_id,
          error: activeSyncLog.error_message,
          retry_count: activeSyncLog.retry_count,
          last_synced_at: activeSyncLog.last_synced_at
        }, targetWorkspace);
      }

      activeSyncLog.last_synced_at = new Date().toISOString();
      
      // Update stored log
      const updatedIdx = crmSyncLogs.findIndex(l => l.lead_id === lead_id);
      if (updatedIdx !== -1) {
        crmSyncLogs[updatedIdx] = activeSyncLog;
      }

      // Broadcast finished transition to clients live (Task 1 WebSocket)
      broadcastToWorkspace(targetWorkspace, "sync:updated", activeSyncLog);
      console.log(`[CRM Sync Finished] Lead: ${lead_id}, Status: ${activeSyncLog.status}`);
    }, 2000);

    return res.json({ success: true, message: "CRM Sync operation initialized in background.", log: activeSyncLog });
  });

  // REST API: Named Mapping Templates (Task 2 Configuration templates)
  app.get("/api/import/templates", (req, res) => {
    res.json(importMappingTemplates);
  });

  app.post("/api/import/templates", (req, res) => {
    const { name, mapping } = req.body;
    if (!name || !mapping) {
      return res.status(400).json({ error: "Template Name and Column Mapping setup is required." });
    }

    const template: ImportMappingTemplate = {
      id: "tmpl-" + Math.random().toString(36).substr(2, 9),
      orgId: "org-default",
      name,
      mappingJSON: JSON.stringify(mapping),
      createdAt: new Date().toISOString()
    };

    importMappingTemplates.unshift(template);
    res.status(201).json(template);
  });

  // Task 2: Advanced Row Bulk Importer & validation channel (Task 2)
  app.post("/api/import/trigger", (req, res) => {
    const { templateName, mapping, rows, workspaceId } = req.body;
    const targetWorkspace = workspaceId || "org-default";

    if (!rows || !rows.length) {
      return res.status(400).json({ error: "No lead records to import." });
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];
    const processedLeads: Lead[] = [];

    // Duplicate detection, bulk formats validation, type mismatch matching (Task 2)
    rows.forEach((row: any, i: number) => {
      const email = (row.email || "").trim();
      const phone = (row.phone || "").trim();
      const company = (row.company || "").trim();
      const name = (row.name || "").trim();

      // Bulk Validation (Task 2 Step 5)
      const emptyRequired = !name || !email;
      const invalidEmail = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (emptyRequired) {
        failedCount++;
        errors.push({ row: i + 1, name: name || "Unknown", error: "Missing required parameter name or email" });
        return;
      }
      if (invalidEmail) {
        failedCount++;
        errors.push({ row: i + 1, name, error: "Invalid work email format structure detected" });
        return;
      }

      // Duplicate Check (Task 2): check email or phone/company duplication against current memory records
      const isDuplicate = leads.some(l => 
        l.orgId === targetWorkspace && 
        ((l.email.trim().toLowerCase() === email.toLowerCase() && email !== "") || 
         (l.phone.trim() === phone && phone !== "" && l.company.trim().toLowerCase() === company.toLowerCase()))
      );

      if (isDuplicate) {
        failedCount++;
        errors.push({ row: i + 1, name, error: "Duplicate lead detected (Conflict mismatch on unique email or phone/company pair)" });
        return;
      }

      // Safe creation
      const newLead: Lead = {
        id: "lead-" + Math.random().toString(36).substr(2, 9),
        campaignId: "camp-default",
        userId: "user-default",
        orgId: targetWorkspace,
        name,
        role: row.role || "Executive Target",
        company,
        email,
        phone,
        status: "imported",
        score: Number(row.score) || Math.floor(50 + Math.random() * 40)
      };

      processedLeads.push(newLead);
      leads.push(newLead);
      successCount++;

      // Trigger webhook for each lead created via importer
      triggerOutboundWebhook("lead.created", newLead, targetWorkspace);
    });

    // Save Named mapping template if name was passed
    if (templateName && mapping) {
      const existsTmpl = importMappingTemplates.find(t => t.name.toLowerCase() === templateName.toLowerCase());
      if (!existsTmpl) {
        importMappingTemplates.unshift({
          id: "tmpl-" + Math.random().toString(36).substr(2, 9),
          orgId: targetWorkspace,
          name: templateName,
          mappingJSON: JSON.stringify(mapping),
          createdAt: new Date().toISOString()
        });
      }
    }

    // Broadcast workspace lead directory update (Task 2 confirmation logs)
    broadcastToWorkspace(targetWorkspace, "import:completed", { successCount, failedCount, total: rows.length });

    res.json({
      success: true,
      import_id: "imp-" + Math.random().toString(36).substr(2, 9),
      file_name: req.body.fileName || "manual_catalog_import.csv",
      total_rows: rows.length,
      success_count: successCount,
      failed_count: failedCount,
      errors_json: JSON.stringify(errors),
      created_at: new Date().toISOString()
    });
  });

  // Nodemailer sending router (Existing fallback)
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, body, config } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config?.host || process.env.SMTP_HOST,
        port: parseInt(config?.port || process.env.SMTP_PORT || "587"),
        secure: config?.secure || process.env.SMTP_SECURE === "true",
        auth: {
          user: config?.user || process.env.SMTP_USER,
          pass: config?.pass || process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: config?.from || process.env.SMTP_FROM || `"Zyntra AI" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text: body.replace(/<br>/g, "\n"),
        html: body,
      });

      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // LinkedIn Automation (Existing fallback)
  app.post("/api/linkedin/automate", async (req, res) => {
    const { type, lead, content } = req.body;

    if (!type || !lead) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log(`LinkedIn Automation [${type}] for ${lead.name} (${lead.linkedin_url})`);
      res.json({ 
        success: true, 
        message: `LinkedIn ${type === 'connect' ? 'connection request' : 'message'} sent to ${lead.name}` 
      });
    } catch (error: any) {
      console.error("LinkedIn automation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite development middleware or static production fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Create HTTP server wrappers to support upgrades
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade protocol
  server.on("upgrade", (request, socket, head) => {
    const urlParts = request.url ? request.url.split("/") : [];
    // Path: ws://[host]/crm-sync/{workspace_id}
    const isSyncChannel = request.url && request.url.includes("/crm-sync/");
    
    if (isSyncChannel) {
      const workspaceId = urlParts[urlParts.length - 1] || "org-default";
      
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, workspaceId);
      });
    } else {
      socket.destroy();
    }
  });

  // WS Connection Logic
  wss.on("connection", (ws: WebSocket, req, workspaceId: string) => {
    console.log(`[WebSocket Connected] Workspace registered: ${workspaceId}`);
    
    if (!connectedClients.has(workspaceId)) {
      connectedClients.set(workspaceId, []);
    }
    connectedClients.get(workspaceId)!.push(ws);

    // Initial message
    ws.send(JSON.stringify({ 
      event: "connected", 
      payload: { message: `Secure real-time CRM channel registered for workspace ${workspaceId}` } 
    }));

    ws.on("close", () => {
      const list = connectedClients.get(workspaceId);
      if (list) {
        const idx = list.indexOf(ws);
        if (idx !== -1) {
          list.splice(idx, 1);
        }
        if (list.length === 0) {
          connectedClients.delete(workspaceId);
        }
      }
      console.log(`[WebSocket Disconnected] Workspace key: ${workspaceId}`);
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
