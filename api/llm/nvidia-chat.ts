export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = req.headers["x-nvidia-api-key"] || process.env.NVIDIA_API_KEY;
  if (!apiKey || Array.isArray(apiKey)) {
    return res.status(500).json({ error: "NVIDIA_API_KEY is not configured on the server." });
  }

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("Content-Type") || "application/json");
    return res.send(text);
  } catch (error: any) {
    return res.status(502).json({ error: error?.message || "NVIDIA proxy request failed." });
  }
}
