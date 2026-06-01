export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const openrouterKey = req.query.apiKey || process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the server." });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${openrouterKey}`
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `Failed fetching OpenRouter catalog: ${errorBody}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to contact OpenRouter catalog API" });
  }
}
