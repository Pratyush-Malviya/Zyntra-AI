export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, systemPrompt, apiKey, selectedModel } = req.body;
  const openaiKey = apiKey || process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });
  }

  try {
    const modelToUse = selectedModel || "gpt-4o";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          {
            role: "system",
            content: (systemPrompt || "") + "\n\nIMPORTANT: You MUST return ONLY a raw JSON object. Do NOT wrap it in markdown code fences. Do NOT include any explanation. Start your response with { and end with }."
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 8000
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `OpenAI API error: ${errorBody}` });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "Invalid response format from OpenAI API." });
    }

    return res.status(200).json({ content });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to contact OpenAI API" });
  }
}
