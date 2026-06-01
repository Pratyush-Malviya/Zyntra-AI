export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, systemPrompt, isJson, apiKey, selectedModel } = req.body;
  const openrouterKey = apiKey || process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the server." });
  }

  const freeModels = [
    "deepseek/deepseek-r1:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free"
  ];

  const modelsToTry = selectedModel && selectedModel !== "openrouter/free"
    ? [selectedModel, ...freeModels]
    : freeModels;

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openrouterKey}`,
          "HTTP-Referer": "https://zyntra-ai.vercel.app",
          "X-Title": "Zyntra AI"
        },
        body: JSON.stringify({
          model: model,
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
        lastError = new Error(`OpenRouter API response error for ${model} (${response.status}): ${errorBody}`);
        continue;
      }

      const data = await response.json();
      if (!data?.choices?.[0]?.message?.content) {
        lastError = new Error(`Invalid response format received from OpenRouter API for ${model}`);
        continue;
      }

      return res.status(200).json({ content: data.choices[0].message.content, modelUsed: model });
    } catch (err: any) {
      lastError = err;
    }
  }

  const errMsg = lastError?.message || "All OpenRouter models failed to respond.";
  return res.status(502).json({ error: errMsg });
}
