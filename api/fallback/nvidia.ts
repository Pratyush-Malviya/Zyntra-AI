export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, systemPrompt, isJson, apiKey, selectedModel } = req.body;
  const nvidiaKey = apiKey || process.env.NVIDIA_API_KEY;

  if (!nvidiaKey) {
    return res.status(500).json({ error: "NVIDIA_API_KEY is not configured on the server." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 25000);

  try {
    const modelToUse = "meta/llama-3.1-8b-instruct";
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${nvidiaKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 512,
        ...(isJson ? { response_format: { type: "json_object" } } : {})
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `NVIDIA API response error: ${errorBody}` });
    }

    const data = await response.json();
    if (!data?.choices?.[0]?.message?.content) {
      return res.status(502).json({ error: "Invalid response format received from NVIDIA API." });
    }

    return res.status(200).json({ content: data.choices[0].message.content });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: "NVIDIA API request timed out after 25 seconds." });
    }
    return res.status(500).json({ error: err.message || "Failed to contact NVIDIA API" });
  }
}
