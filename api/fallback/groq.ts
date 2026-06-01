export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, systemPrompt, isJson, apiKey, selectedModel } = req.body;
  const groqKey = apiKey || process.env.GROQ_API_KEY;

  if (!groqKey) {
    return res.status(500).json({ error: "GROQ_API_KEY is not configured on the server." });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt }
        ],
        temperature: 0.15,
        max_tokens: 8192,
        ...(isJson ? { response_format: { type: "json_object" } } : {})
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return res.status(response.status).json({ error: `Groq API response error: ${errorBody}` });
    }

    const data = await response.json();
    if (!data?.choices?.[0]?.message?.content) {
      return res.status(502).json({ error: "Invalid response format from Groq API." });
    }

    return res.status(200).json({ content: data.choices[0].message.content });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to contact Groq API" });
  }
}
