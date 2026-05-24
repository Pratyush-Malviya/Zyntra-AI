import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Email Sending Route
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, body, config } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Use provided config or fallback to env variables
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

  // LinkedIn Automation Route (Simulated for now, as real automation requires complex setup)
  app.post("/api/linkedin/automate", async (req, res) => {
    const { type, lead, content } = req.body;

    if (!type || !lead) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Simulate automation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real scenario, this would call a LinkedIn automation API or a headless browser service
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
