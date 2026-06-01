const organizations = [
  {
    id: "org-default",
    name: "Zyntra AI Workspace",
    slug: "zyntra-ai-workspace",
    created_by: "system",
    created_at: new Date().toISOString(),
    plan: "Professional SDR",
    status: "active",
    memberCount: 4,
    leadCount: 0,
    dealCount: 0,
    kbStatus: "Ready",
    lastActivity: new Date().toISOString(),
  },
  {
    id: "demo-second-org",
    name: "Zane Capital Group",
    slug: "zane-capital-group",
    created_by: "system",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    plan: "Starter SDR Plan",
    status: "active",
    memberCount: 2,
    leadCount: 0,
    dealCount: 0,
    kbStatus: "Empty",
    lastActivity: new Date().toISOString(),
  },
];

export default function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json(organizations);
  }

  if (req.method === "POST") {
    const name = req.body?.name?.trim();
    if (!name) return res.status(400).json({ error: "Organization Name is required." });

    const org = {
      id: `org-${Math.random().toString(36).slice(2, 7)}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      created_by: "vercel-api",
      created_at: new Date().toISOString(),
      plan: req.body?.plan || "Professional SDR",
      status: "active",
      memberCount: 1,
      leadCount: 0,
      dealCount: 0,
      kbStatus: "Empty",
      lastActivity: new Date().toISOString(),
    };

    organizations.push(org);
    return res.status(201).json(org);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
