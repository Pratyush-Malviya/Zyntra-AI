import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || "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",
  baseURL: "https://integrate.api.nvidia.com/v1",
  timeout: 90000,
});

// Clean and Parse JSON handles raw control characters / line breaks inside string values in JSON and aggressive conversational wrapping repairs
function cleanAndParseJSON(jsonStr: string): any {
  if (!jsonStr) {
    throw new Error("JSON string is empty or undefined");
  }

  let cleaned = jsonStr.trim();

  // 1. Isolate the core JSON object block using first '{' and last '}' if they exist
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace !== -1) {
    cleaned = cleaned.substring(firstBrace);
  }

  // 2. Perform a character-by-character scan state-machine to clean, comments-strip,
  // trailing-comma-strip, resolve unescaped internal double quotes, and close truncated entities.
  const bulletproofRepair = (str: string): string => {
    let result = "";
    let inString = false;
    let escapeActive = false;
    const stack: ('{' | '[')[] = [];

    // Helper to check if a comma at `index` is a trailing comma
    const isTrailingComma = (index: number): boolean => {
      let j = index + 1;
      while (j < str.length) {
        const c = str[j];
        if (c === ' ' || c === '\n' || c === '\r' || c === '\t') {
          j++;
          continue;
        }
        if (c === '/' && str[j + 1] === '/') {
          j += 2;
          while (j < str.length && str[j] !== '\n') {
            j++;
          }
          continue;
        }
        if (c === '/' && str[j + 1] === '*') {
          j += 2;
          while (j < str.length - 1 && !(str[j] === '*' && str[j + 1] === '/')) {
            j++;
          }
          j += 2;
          continue;
        }
        if (c === '}' || c === ']') {
          return true;
        }
        return false;
      }
      return true; // trailing/extraneous
    };

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      // Handle escape sequences inside strings
      if (inString) {
        if (escapeActive) {
          result += char;
          escapeActive = false;
          continue;
        }

        if (char === '\\') {
          result += char;
          escapeActive = true;
          continue;
        }

        if (char === '"') {
          // Check if this double quote is a real closing quote.
          // In standard JSON, a closing quote is followed by whitespace, comma, colon, close-brace, close-bracket, or end of string.
          let isRealClose = false;
          let j = i + 1;
          while (j < str.length) {
            const nextChar = str[j];
            if (nextChar === ' ' || nextChar === '\n' || nextChar === '\r' || nextChar === '\t') {
              j++;
              continue;
            }
            if (nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === ':') {
              isRealClose = true;
            }
            break;
          }

          if (i === str.length - 1) {
            isRealClose = true;
          }

          if (isRealClose) {
            inString = false;
            result += '"';
          } else {
            // This is an unescaped double quote inside a string! Escape it.
            result += '\\"';
          }
        } else if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          const code = char.charCodeAt(0);
          if (code < 32) {
            // Strip non-printable raw control chars under 32 but keep spaces/printable chars
          } else {
            result += char;
          }
        }
      } else {
        // Outside string
        if (char === '/' && str[i + 1] === '/') {
          // Skip single-line comment
          i += 2;
          while (i < str.length && str[i] !== '\n') {
            i++;
          }
          continue;
        }
        if (char === '/' && str[i + 1] === '*') {
          // Skip block comment
          i += 2;
          while (i < str.length - 1 && !(str[i] === '*' && str[i + 1] === '/')) {
            i++;
          }
          i += 1; // pointer will be incremented by the loop for '/'
          continue;
        }
        if (char === '"') {
          inString = true;
          result += '"';
        } else if (char === '{') {
          stack.push('{');
          result += char;
        } else if (char === '[') {
          stack.push('[');
          result += char;
        } else if (char === '}') {
          if (stack.length > 0 && stack[stack.length - 1] === '{') {
            stack.pop();
          }
          result += char;
        } else if (char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === '[') {
            stack.pop();
          }
          result += char;
        } else if (char === ',') {
          // Skip trailing commas
          if (isTrailingComma(i)) {
            continue;
          }
          result += char;
        } else {
          result += char;
        }
      }
    }

    // Handle end-of-string states for truncated payloads
    if (inString) {
      result += '"';
    }

    // Clean up any trailing hanging colon/commas due to truncation
    let loop = true;
    while (loop && result.length > 0) {
      const trimmed = result.trim();
      if (trimmed.endsWith(':') || trimmed.endsWith(',')) {
        const lastComma = result.lastIndexOf(',');
        const lastOpenBrace = result.lastIndexOf('{');
        const cutIndex = Math.max(lastComma, lastOpenBrace);
        if (cutIndex !== -1) {
          result = result.substring(0, cutIndex);
          if (cutIndex === lastOpenBrace) {
            result += '{';
          }
        } else {
          break;
        }
      } else {
        loop = false;
      }
    }

    // Determine final correct stack of remaining open elements
    const finalStack: ('{' | '[')[] = [];
    let finalInString = false;
    let finalEscape = false;
    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      if (finalInString) {
        if (finalEscape) {
          finalEscape = false;
        } else if (char === '\\') {
          finalEscape = true;
        } else if (char === '"') {
          finalInString = false;
        }
      } else {
        if (char === '"') {
          finalInString = true;
        } else if (char === '{') {
          finalStack.push('{');
        } else if (char === '[') {
          finalStack.push('[');
        } else if (char === '}') {
          if (finalStack.length > 0 && finalStack[finalStack.length - 1] === '{') {
            finalStack.pop();
          }
        } else if (char === ']') {
          if (finalStack.length > 0 && finalStack[finalStack.length - 1] === '[') {
            finalStack.pop();
          }
        }
      }
    }

    if (finalInString) {
      result += '"';
    }

    while (finalStack.length > 0) {
      const top = finalStack.pop();
      if (top === '{') result += '}';
      else if (top === '[') result += ']';
    }

    return result;
  };

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("Standard JSON parse failed, initiating character-by-character repair...", err);
    try {
      const repaired = bulletproofRepair(cleaned);
      return JSON.parse(repaired);
    } catch (secondError) {
      console.error("Bulletproof JSON repair failed. Original raw string length:", jsonStr.length);
      throw secondError;
    }
  }
}

function isQuotaOrApiKeyError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("quota") ||
    msg.includes("api key") ||
    msg.includes("limit") ||
    msg.includes("unauthorized") ||
    msg.includes("fetch") ||
    msg.includes("cors")
  );
}

// Exponential backoff helper for transient remote API issues (like 503 unavailable, 429 rate limit, or timeout)
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1500,
  contextMessage = "API Call"
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const msg = String(error.message || "").toLowerCase();
      const status = error.status || (error.error && error.error.code) || 0;
      const isTransient = 
        status === 503 || 
        status === 429 ||
        msg.includes("503") ||
        msg.includes("429") ||
        msg.includes("unavailable") ||
        msg.includes("timeout") ||
        msg.includes("timed out") ||
        msg.includes("rate limit") ||
        msg.includes("quota") ||
        msg.includes("busy") ||
        msg.includes("overloaded");

      if (attempt < retries && isTransient) {
        const backoffDelay = delay * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[Retry] ${contextMessage} failed (attempt ${attempt}/${retries}). Retrying in ${Math.round(backoffDelay)}ms... Error:`, error.message || error);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      } else {
        throw error;
      }
    }
  }
}

// -------------------------------------------------------------
// Backends IMPLEMENTATIONS
// -------------------------------------------------------------

export async function generateOutreachBackend(lead: any, config: any, customNvidia?: any): Promise<any> {
  const prompt = `
    You are a B2B sales expert writing omnichannel cold outreach. 
    Return a structured JSON object.

    Rules:
    - whatsapp: <100 words, observation + value + soft CTA, no links.
    - linkedin_connect: <40 words, warm, no pitch.
    - linkedin_dm: <80 words, follow up after connection.
    - email_subject: <7 words.
    - email_body: 120-150 words, human, not robotic.
    - email_followup: <60 words.

    Context:
    Sender: ${config.sender} from ${config.company}
    Product: ${config.product}
    Value Prop: ${config.vp}
    CTA: ${config.cta}
    Lead: Name=${lead.name}, Role=${lead.role || '?'}, Company=${lead.company || '?'}, Industry=${lead.industry || '?'}, Country=${lead.country || '?'}
  `;

  try {
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: "nvidia/nemotron-3-ultra-550b-a55b",
        messages: [
          {
            role: "user",
            content: `${prompt}

Please return ONLY a valid, raw, and parsable JSON object conforming to the structured template we need. No preamble or conversational introduction, just the raw JSON structure.`
          }
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 4096,
        extra_body: {
          "chat_template_kwargs": { "enable_thinking": true },
          "reasoning_budget": 2048
        },
        stream: false
      } as any);
    }, 3, 1500, "NVIDIA Nemotron Outreach");

    const rawText = completion.choices[0]?.message?.content || '';
    if (rawText.trim()) {
      return cleanAndParseJSON(rawText);
    }
    throw new Error("Empty response received from NVIDIA Nemotron API");
  } catch (error) {
    console.error("NVIDIA Generation Error on server:", error);
    throw error;
  }
}

export async function generateProspectResearchBackend(companyInput: string, customNvidia?: any): Promise<any> {
  let targetCompany = "";
  let targetLinkedin = "";

  try {
    if (companyInput.trim().startsWith("{")) {
      const parsed = JSON.parse(companyInput);
      targetCompany = parsed.website || parsed.company || "";
      targetLinkedin = parsed.linkedin || "";
    } else {
      targetCompany = companyInput;
    }
  } catch (e) {
    targetCompany = companyInput;
  }

  // Handle case where both are empty
  if (!targetCompany.trim() && !targetLinkedin.trim()) {
    throw new Error("No company name/website or LinkedIn URL was provided to research.");
  }

  const prompt = `
    You are an elite enterprise B2B management consultant, live researcher, and AI solutions architect.

    ${!targetCompany.trim() && targetLinkedin.trim() ? `Your task is to conduct research starting from the prospect decision-maker at LinkedIn: "${targetLinkedin}". First use Google Search grounding to identify which company they work for (their title, company role, and organization), and then perform a systematic, live-grounded research sprint on that target company alongside detailed profile alignment options.` : ""}
    ${targetCompany.trim() && !targetLinkedin.trim() ? `Your task is to conduct an automated, systematic, live-grounded research sprint on the company/domain/website: "${targetCompany}". Since no individual prospect LinkedIn URL is provided, perform a lookup to identify a real-world named executive leader (e.g. CEO, CFO, VP of Revenue Operations, etc.) currently associated with this company, and outline their persona and customized outreach.` : ""}
    ${targetCompany.trim() && targetLinkedin.trim() ? `Your task is to conduct an automated, systematic, live-grounded research sprint combining both the company/domain/website: "${targetCompany}" and the specific prospect decision-maker at LinkedIn: "${targetLinkedin}". You must analyze both elements to show the exact pain points, tech stack, and strategic positioning connecting this leader's corporate responsibilities with the organization's business needs.` : ""}

    Since you are equipped with Google Search grounding, you MUST search the internet for exact details on the targets${targetCompany.trim() ? ` ("${targetCompany}")` : ""}${targetLinkedin.trim() ? ` and retrieve search results/LinkedIn profile info for "${targetLinkedin}"` : ""}.
    Extract actual, real-world verified facts. Do NOT make up, approximate, or hallucinate information if verified details are discoverable.
    
    CRITICAL QUALITY DIRECTIVES to eliminate hallucination:
    1. COMPANY DETAILS: Verify the exact corporate name, active headquarters (HQ) city/country, real founded year, real website URL, actual status (Public, Private, Subsidiary), real annual revenues, true employee count, active sales markets, and direct social media links (LinkedIn company URL, Twitter/X handle URL, Facebook company URL, and YouTube channel URL if available). Do NOT invent these. Justify them through searches.
    2. REAL-WORLD PAIN POINTS: Identify at least 3 genuine corporate pain points using real news stories, press releases, financial reports, or industry-specific systemic issues for this exact business. Provide exact details, evidence quotes from executive statements or public news outlets (citing actual dates and sources), and quantify the actual corporate or operational impact.
    3. INFRASTRUCTURE & TECH STACK: Use web-scraping or indicators of technologies to identify active ERP systems (SAP, Oracle, NetSuite, etc.), CRMs (Salesforce, HubSpot, etc.), Business Intelligence stacks (Tableau, PowerBI, etc.), Supply Chain configurations, and dynamic website technologies (React, Next.js, HubSpot, Cloudflare, etc.). Specify exact product names and your realistic assessment confidence level ('High', 'Medium', 'Low') along with exact evidence indicators.
    4. AI ADOPTION & STRATEGY: Analyze any reported state of AI adoption, deployed machine learning algorithms, or plans. List real competitors of this company and their estimated relative AI maturity.
    5. CUSTOM FIT SOLUTIONS: Propose highly specific, granular AI/ML B2B software solutions tailored precisely to the identified pain points. Include detailed pricing structures with monthly subscriptions, Year-1 contracts, and estimated Life-Time Value (LTV) forecasts that make absolute commercial sense for a company of their size.
    6. TARGET STAKEHOLDER: ${targetLinkedin.trim() ? `The user provided a target LinkedIn profile: "${targetLinkedin}". Search the internet specifically to locate the real name, exact corporate title, company name, responsibilities, pain owns, and professional motivation of this person at LinkedIn URL "${targetLinkedin}". If public information for this exact individual is scarce, generate highly realistic and professional business contact information based on their website domain and corporate role, ensuring the name aligns with the profile owner/representative.` : `Find the actual, current, real-world named executive or key decision-maker (e.g., actual CEO, CFO, CIO, CTO, VP, or Head of Operations) currently leading within that organization. Perform a precise look-up to find their real full name (e.g. "Satya Nadella"), exact title, a verified or highly realistic corporate phone number, a verified business corporate email address matched to their company domain, and their actual personal LinkedIn profile URL if available.`} Do NOT use fake placeholder text or dummy links like "Jane Doe" or "example.com".
    7. DETAILED MCKINSEY-GRADE WORK & OUTREACH PREPARATION ANALYSIS: In "markdownReport", generate a comprehensive, premium, data-dense 1500-2500 word consulting dossier. This must read like an extremely detailed Gartner Magic Quadrant or McKinsey strategy analysis, incorporating real-world news dates (e.g., 2024-2026), specific executive codes, and in-depth business model breakdowns. Rely directly on Google Search results to make this report exceptionally factual and precise. You must include a full SWOT Analysis table under Part 1, financial capitalization tables under Part 2, and math calculations of sector-calibrated revenues.
    The report MUST contain these specific styled parts with clear headers and thorough, dense analysis:
    - # DETAILED CONSULTING REPORT: [COMPANY NAME]
    - ## PART 1: EXECUTIVE BRIEFING & CORE CORPORATE PROFILE
      Analyze the corporate profile, company scale, primary target markets, and competitive positioning. Include a beautifully structured SWOT Analysis Markdown table.
    - ## PART 2: CAPITALIZATION, FUNDING ANALYSIS & RECENT RAISES
      Write an in-depth financial capitalization review. Explicitly answer: "Has the company raised funding recently?" (Look up recent venture capital rounds, series raises, public debt releases, or primary share expansions). Include details, exact funding amounts, dates, and named primary backing investors. If profitable or public, discuss their cash flow position, stock health, and buyback programs. Include markdown tables outlining round histories where details are available. Detail the employee ranges and ARR using Sector Productivity Factors (RPH, e.g. $240k per head).
    - ## PART 3: LATEST PRODUCT & SERVICE INNOVATIONS
      Detail ALL major recent product and service launches, upgrades, or planned offerings in their pipeline. Describe their features, value proposition, and intended market impact.
    - ## PART 4: OPERATIONAL PAIN-POINT DIAGNOSTICS & SYSTEM RISK
      Outline active operational pain points with direct quoted evidence, news sources, dates, and impact analyses.
    - ## PART 5: TAILORED B2B AI/ML RESOLUTION ARCHITECTURE
      Outline specific blueprints for your custom-built SaaS integration models, complete with comprehensive Year-1 contract estimates and ROI analyses.
    - ## PART 6: OMNICHANNEL GTM EXECUTIVE OUTREACH SEQUENCE
      Provide exact sequences (WhatsApp, LinkedIn connection under 40 words, LinkedIn followup under 80 words, email subject, email body under 150 words, and email followup).
    - ## PART 7: DECISION-MAKER ALIGNMENT
      Provide custom commentary demonstrating how your pitch aligns perfectly with the target profile's responsibilities, background, and LinkedIn positioning.
    - ## PART 8: OMNICHANNEL AUDITING & BENCHMARK ANALYSIS
      Outline actionable metrics and outreach recommendations.
    8. FUNDING & LAUNCHED PRODUCTS: Research recent funding rounds, venture capital/private equity backing, or security filings to indicate if they have raised funding recently or not. Research recent press announcements or product logs to discover any latest products or services they have launched, or are planning to launch soon.
  `;

  const isVercel = process.env.VERCEL === "1";
  const searchRetries = isVercel ? 1 : 3;
  const backoffBase = isVercel ? 500 : 1500;
  const mainTimeoutMs = isVercel ? 55000 : 90000;

  try {
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: "nvidia/nemotron-3-ultra-550b-a55b",
        messages: [
          {
            role: "user",
            content: `${prompt}

Please return ONLY a valid, raw, and parsable JSON object conforming to the structured template we need. No preamble or conversational introduction, just the raw JSON structure.`
          }
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 4096,
        extra_body: {
          "chat_template_kwargs": { "enable_thinking": true },
          "reasoning_budget": 2048
        },
        stream: false
      } as any, {
        timeout: mainTimeoutMs
      });
    }, searchRetries, backoffBase, "NVIDIA Nemotron Research");

    const rawText = completion.choices[0]?.message?.content || '';
    if (rawText.trim()) {
      return cleanAndParseJSON(rawText);
    }
    throw new Error("Empty response received from NVIDIA Nemotron API");
  } catch (error) {
    console.error("NVIDIA Prospect Research Generation Error on server:", error);
    throw error;
  }
}

export async function analyzeBenchmarkDriftBackend(leads: any[], customNvidia?: any): Promise<any> {
  const leadsContext = leads.map((l, i) => 
    `Lead ${i+1}: Name="${l.name}", Role="${l.role || 'unknown'}", Company="${l.company || 'unknown'}", Industry="${l.industry || 'unknown'}", Country="${l.country || 'unknown'}", Score=${l.score || 'N/A'}`
  ).join("\n");

  const prompt = `
    You are an elite enterprise B2B sales strategist and CRO consultant.
    The outreach campaign's lead intent benchmark score has dropped below 65, triggering a drift warning.
    Conduct a comprehensive analysis of the most recent ${leads.length} leads to diagnose outreach issues and provide actionable strategy improvements.

    Recent Leads Context:
    ${leadsContext}

    Your output must be a highly structured, actionable JSON report outlining:
    1. A concise, professional executive summary outlining why these accounts might be underperforming (e.g., mismatch in decision-maker seniority, generic industry targeting, geographic limitations).
    2. Exactly 3 key specific issues detected in this cohort's parameters, including operational impact.
    3. Exactly 3 granular outreach improvements (e.g., highly customized email subjects, revised LinkedIn connection hooks, personalized messaging templates) designed to address these specific types of personas (with concrete templates/copy).
    4. Strategic target reallocation or ICP adjustment advice to restore benchmark scores.
  `;

  try {
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: "nvidia/nemotron-3-ultra-550b-a55b",
        messages: [
          {
            role: "user",
            content: `${prompt}

Please return ONLY a valid, raw, and parsable JSON object conforming to the structured template we need. No preamble or conversational introduction, just the raw JSON structure.`
          }
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 4096,
        extra_body: {
          "chat_template_kwargs": { "enable_thinking": true },
          "reasoning_budget": 2048
        },
        stream: false
      } as any);
    }, 3, 1500, "NVIDIA Nemotron Benchmark Drift");

    const rawText = completion.choices[0]?.message?.content || '';
    if (rawText.trim()) {
      return cleanAndParseJSON(rawText);
    }
    throw new Error("Empty response received from NVIDIA Nemotron API");
  } catch (error) {
    console.error("NVIDIA Benchmark Drift Analysis Error on server:", error);
    throw error;
  }
}

export async function generateCrmHelpBackend(actionType: string, payload: any): Promise<any> {
  try {
    let prompt = "";
    let systemInstruction = "You are Zyntra, an elite enterprise sales GTM enablement AI assistant.";

    if (actionType === "email_draft_assist") {
      prompt = `You are a legendary B2B sales copywriter. Review the following draft email body and improve it to be highly persuasive, concise, professional, and value-oriented. Keep formatting clean.

Draft Email Body:
${payload.emailBody}

Lead Context:
Name: ${payload.leadContext?.name || 'Prospect'}
Role: ${payload.leadContext?.role || 'Executive'}
Company: ${payload.leadContext?.company || 'Organization'}
Industry: ${payload.leadContext?.industry || 'B2B'}

Provide the response in the following JSON structure:
{
  "improved_subject": "A compelling, open-rate optimized subject line under 7 words",
  "improved_body": "The revised, ready-to-send email body with newline spaced paragraphs",
  "reasoning": "A 1-sentence description of the improvement tactic used."
}`;
    } else if (actionType === "call_notes_assist") {
      const todayString = new Date().toISOString().split('T')[0];
      prompt = `You are an AI-powered CRM administrative agent. Process these call/meeting notes, summarize the interaction, identify meeting sentiment/risks, and extract concrete follow-up tasks with deadlines.
      
Today's Date: ${todayString}

Call Notes:
${payload.callNotes}

Lead Context:
Name: ${payload.leadContext?.name || 'Prospect'}
Role: ${payload.leadContext?.role || 'Executive'}
Company: ${payload.leadContext?.company || 'Organization'}

Provide the response in the exact following JSON structure:
{
  "summary": "A clean, 2-sentence summary of the meeting.",
  "sentiment": "Positive" | "Neutral" | "Risk / Hesitant" | "Urgent / Critical Risk",
  "key_points": ["Key bullet point 1", "Key bullet point 2"],
  "risk_analysis": "A brief analysis of risk factors or objections identified, if any.",
  "extracted_tasks": [
    {
      "title": "Precise task description starting with an action verb",
      "dueDate": "ISO Date (YYYY-MM-DD)"
    }
  ]
}`;
    } else if (actionType === "lead_deal_score") {
      prompt = `You are a sales operations analyst. Analyze the following lead profile and calculate recommended deal parameters optimized for CRM pipeline board initialization.

Lead Profile:
Name: ${payload.leadContext?.name}
Role: ${payload.leadContext?.role}
Company: ${payload.leadContext?.company}
Industry: ${payload.leadContext?.industry}
Country: ${payload.leadContext?.country}
Employees: ${payload.leadContext?.employees || 'Not specified'}
Website: ${payload.leadContext?.website || 'Not specified'}

Provide the response in the exact following JSON structure:
{
  "recommended_deal_value": number (reasonable contract value in USD, e.g. 15000 to 150000 based on company size and seniority),
  "recommended_probability": number (estimated conversion win rate percentage, integer between 10 and 90),
  "suggested_tags": ["relevant", "CRM", "tags"],
  "closing_strategy": "A 2-sentence tailored account-based marketing plan to win this exact prospect."
}`;
    } else {
      throw new Error(`Unsupported action type: ${actionType}`);
    }

    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: "nvidia/nemotron-3-ultra-550b-a55b",
        messages: [
          {
            role: "system",
            content: systemInstruction
          },
          {
            role: "user",
            content: `${prompt}

Please return ONLY a valid, raw, and parsable JSON object conforming to the requested structure. No preamble or conversational introduction, just the raw JSON structure.`
          }
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 4096,
        extra_body: {
          "chat_template_kwargs": { "enable_thinking": true },
          "reasoning_budget": 2048
        },
        stream: false
      } as any);
    }, 3, 1500, "NVIDIA Nemotron CRM Help");

    const rawText = completion.choices[0]?.message?.content || '';
    if (rawText.trim()) {
      return cleanAndParseJSON(rawText);
    }
    throw new Error("Empty response received from NVIDIA Nemotron API");
  } catch (err: any) {
    console.error("[NVIDIA CRM Help AI Error]:", err);
    throw err;
  }
}

