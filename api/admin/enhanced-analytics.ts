export default function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    overview: {
      totalTenants: 2,
      totalUsers: 6,
      activeUsersLast7d: 6,
      platformLeads: 0,
      platformDeals: 0,
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
