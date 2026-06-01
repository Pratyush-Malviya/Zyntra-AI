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

const inviteRequests: any[] = [];

function sendJson(res: any, status: number, data: unknown) {
  res.status(status).json(data);
}

function getPath(req: any): string[] {
  const rawPath = req.query?.path;
  if (Array.isArray(rawPath)) return rawPath;
  if (typeof rawPath === "string") return [rawPath];
  return [];
}

export default function handler(req: any, res: any) {
  const path = getPath(req);
  const route = path.join("/");

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET" && route === "organizations") {
    return sendJson(res, 200, organizations);
  }

  if (req.method === "POST" && route === "organizations") {
    const name = req.body?.name?.trim();
    if (!name) return sendJson(res, 400, { error: "Organization Name is required." });

    const id = `org-${Math.random().toString(36).slice(2, 7)}`;
    const org = {
      id,
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
    return sendJson(res, 201, org);
  }

  if (req.method === "POST" && path[0] === "organizations" && path[2] === "status") {
    const org = organizations.find((item) => item.id === path[1]);
    if (!org) return sendJson(res, 404, { error: "Organization not found." });
    if (req.body?.status !== "active" && req.body?.status !== "suspended") {
      return sendJson(res, 400, { error: "Invalid org status param." });
    }
    org.status = req.body.status;
    org.lastActivity = new Date().toISOString();
    return sendJson(res, 200, { success: true, org });
  }

  if (req.method === "POST" && path[0] === "organizations" && path[2] === "invite-manager") {
    if (!req.body?.email || !req.body?.name) {
      return sendJson(res, 400, { error: "Name and Email are required." });
    }
    const token = `tok-${Math.random().toString(36).slice(2, 11)}`;
    return sendJson(res, 200, {
      success: true,
      magicLink: `https://ai.studio/build/auth/magic-login?token=${token}`,
      magicOnboardingLink: `https://ai.studio/build/auth/magic-login?token=${token}`,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (req.method === "POST" && path[0] === "organizations" && path[2] === "switch") {
    const org = organizations.find((item) => item.id === path[1]);
    if (!org) return sendJson(res, 404, { error: "Organization target not found." });
    return sendJson(res, 200, { success: true, activeOrg: org });
  }

  if (req.method === "GET" && route === "invite-requests") {
    return sendJson(res, 200, inviteRequests);
  }

  if (req.method === "POST" && path[0] === "invite-requests" && path[2] === "resolve") {
    const invite = inviteRequests.find((item) => item.id === path[1]);
    if (!invite) return sendJson(res, 404, { error: "Invite request not found." });
    invite.status = req.body?.status || "approved";
    invite.resolved_at = new Date().toISOString();
    const token = `tok-${Math.random().toString(36).slice(2, 11)}`;
    return sendJson(res, 200, {
      success: true,
      invite,
      magicOnboardingLink: invite.status === "approved" ? `https://ai.studio/build/auth/magic-login?token=${token}` : "",
    });
  }

  if (req.method === "GET" && route === "enhanced-analytics") {
    return sendJson(res, 200, {
      overview: {
        totalTenants: organizations.length,
        totalUsers: organizations.reduce((sum, org) => sum + org.memberCount, 0),
        activeUsersLast7d: organizations.reduce((sum, org) => sum + org.memberCount, 0),
        platformLeads: organizations.reduce((sum, org) => sum + org.leadCount, 0),
        platformDeals: organizations.reduce((sum, org) => sum + org.dealCount, 0),
        orgAiCreditsUsed: 0,
      },
      crmSync: {
        totalMapped: 0,
        totalSyncing: 0,
        totalFailed: 0,
        recentSyncs: [],
      },
      auditTrail: [],
      usersList: [],
    });
  }

  return sendJson(res, 404, { error: `Unknown admin route: ${route}` });
}
