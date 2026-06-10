import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export interface OutreachMessages {
  whatsapp: string;
  linkedin_connect: string;
  linkedin_dm: string;
  email_subject: string;
  email_body: string;
  email_followup: string;
}

// Clean and Parse JSON handles raw control characters / line breaks inside string values in JSON and aggressive conversational wrapping repairs
function cleanAndParseJSON(jsonStr: string): any {
  if (!jsonStr) {
    throw new Error("JSON string is empty or undefined");
  }

  let cleaned = jsonStr.trim();

  // 1. Isolate the core JSON object block using first '{' and last '}' to strip exploratory wrappers
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 2. Perform a character-by-character scan state-machine to clean, comments-strip,
  // trailing-comma-strip, translate single-quoted JSON properties/strings safely,
  // and handle unescaped quotes inside double-quoted strings.
  const bulletproofRepair = (str: string): string => {
    let result = "";
    let inString = false;
    let stringDelim: string | null = null;
    let escapeActive = false;

    const isNextValidJsonDelim = (index: number): boolean => {
      let j = index;
      while (j < str.length) {
        const c = str[j];
        if (c === ' ' || c === '\n' || c === '\r' || c === '\t') {
          j++;
          continue;
        }
        if (c === '/' && str[j + 1] === '/') {
          j += 2;
          while (j < str.length && str[j] !== '\n') j++;
          continue;
        }
        if (c === '/' && str[j + 1] === '*') {
          j += 2;
          while (j < str.length - 1 && !(str[j] === '*' && str[j + 1] === '/')) j++;
          j += 2;
          continue;
        }
        return c === ':' || c === ',' || c === '}' || c === ']';
      }
      return true;
    };

    const isTrailingComma = (index: number): boolean => {
      let j = index + 1;
      while (j < str.length) {
        const c = str[j];
        if (c === ' ' || c === '\n' || c === '\r' || c === '\t') { j++; continue; }
        if (c === '/' && str[j + 1] === '/') {
          j += 2;
          while (j < str.length && str[j] !== '\n') j++;
          continue;
        }
        if (c === '/' && str[j + 1] === '*') {
          j += 2;
          while (j < str.length - 1 && !(str[j] === '*' && str[j + 1] === '/')) j++;
          j += 2;
          continue;
        }
        if (c === '}' || c === ']') return true;
        return false;
      }
      return true;
    };

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (escapeActive) {
        if ('"\\/bfnrt'.includes(char) || char === 'u') {
          result += '\\' + char;
        } else {
          result += char;
        }
        if (char !== 'u') escapeActive = false;
        else escapeActive = false;
        continue;
      }

      if (char === '\\') {
        escapeActive = true;
        continue;
      }

      if (inString) {
        if (char === stringDelim) {
          if (stringDelim === '"') {
            if (isNextValidJsonDelim(i + 1)) {
              inString = false;
              stringDelim = null;
              result += '"';
            } else {
              result += '\\"';
            }
          } else {
            inString = false;
            stringDelim = null;
            result += '"';
          }
        } else if (char === '"' && stringDelim === "'") {
          result += '\\"';
        } else if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          const code = char.charCodeAt(0);
          if (code < 32) {
          } else {
            result += char;
          }
        }
      } else {
        if (char === '/' && str[i + 1] === '/') {
          i += 2;
          while (i < str.length && str[i] !== '\n') i++;
          continue;
        }
        if (char === '/' && str[i + 1] === '*') {
          i += 2;
          while (i < str.length - 1 && !(str[i] === '*' && str[i + 1] === '/')) i++;
          i += 1;
          continue;
        }
        if (char === '"' || char === "'") {
          inString = true;
          stringDelim = char;
          result += '"';
        } else if (char === ',') {
          if (isTrailingComma(i)) continue;
          result += char;
        } else {
          result += char;
        }
      }
    }
    if (inString) result += '"';
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
      console.warn("Bulletproof repair also failed, attempting structural repair...", secondError);
      try {
        const repaired = bulletproofRepair(cleaned);
        const structuralRepair = (s: string): string => {
          let result = "";
          let inStr = false;
          let esc = false;
          let prevTokenWasValue = false;
          let needsComma = false;
          for (let i = 0; i < s.length; i++) {
            const c = s[i];
            if (esc) { result += c; esc = false; continue; }
            if (c === '\\') { result += c; esc = true; continue; }
            if (inStr) {
              if (c === '"') {
                inStr = false;
                prevTokenWasValue = true;
                needsComma = true;
              }
              result += c;
            } else {
              if (c === '"') {
                if (needsComma && prevTokenWasValue) {
                  result += ',';
                }
                inStr = true;
                needsComma = false;
                result += c;
              } else if (c === '{' || c === '[') {
                needsComma = false;
                prevTokenWasValue = false;
                result += c;
              } else if (c === '}' || c === ']') {
                prevTokenWasValue = true;
                needsComma = true;
                result += c;
              } else if (c === ':') {
                prevTokenWasValue = false;
                needsComma = false;
                result += c;
              } else if (c === ',') {
                prevTokenWasValue = false;
                needsComma = false;
                result += c;
              } else if (c === 't' || c === 'f' || c === 'n' || c === '-' || (c >= '0' && c <= '9')) {
                let j = i;
                while (j < s.length && !'",}]\n\r\t '.includes(s[j]) && s[j] !== ':') j++;
                const val = s.slice(i, j);
                if (needsComma && prevTokenWasValue) result += ',' + val;
                else result += val;
                i = j - 1;
                prevTokenWasValue = true;
                needsComma = true;
                continue;
              } else {
                result += c;
              }
            }
          }
          return result;
        };
        const structuralResult = structuralRepair(repaired);
        return JSON.parse(structuralResult);
      } catch (thirdError) {
        console.error("All JSON repair strategies failed. Original raw string length:", jsonStr.length);
        throw thirdError;
      }
    }
  }
}

export async function generateOutreach(lead: any, config: any): Promise<OutreachMessages> {
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt + "\n\nReturn ONLY valid JSON. No markdown, no code fences, no explanation.",
      config: {}
    });
    
    const rawText = (response.text || '');
    return cleanAndParseJSON(rawText) as OutreachMessages;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("No Gemini API key configured, using fallback for outreach generation");
      return getMockOutreach(lead, config);
    }
    throw error;
  }
}

export interface ProspectResearchReport {
  isMocked?: boolean;
  companyInfo: {
    name: string;
    industry: string;
    hq: string;
    founded: string;
    status: string;
    website: string;
    revenue: string;
    employees: string;
    markets: string;
    description: string;
    socialMediaLinks?: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
      youtube?: string;
    };
    funding?: {
      hasRaisedRecently: boolean;
      details: string;
      rounds?: { roundName: string; amount: string; date: string; investors?: string }[];
    };
    recentProducts?: {
      hasLaunchedRecently: boolean;
      details: string;
      productsList?: { name: string; description: string; launchDate?: string }[];
    };
  };
  painPoints: {
    title: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM";
    description: string;
    evidence: { quote: string; source: string; date: string; url?: string }[];
    impact: string;
    timeline: string;
  }[];
  techStack: {
    erp: { name: string; status: string; confidence: string; source: string };
    crm: { name: string; status: string; confidence: string; source: string };
    bi: { name: string; status: string; confidence: string; source: string };
    supplyChain: { name: string; status: string; confidence: string; source: string };
    websiteTech: string[];
  };
  aiAdoption: {
    maturityLevel: "Pre-AI" | "Basic" | "Intermediate" | "Advanced";
    deployedTools: string[];
    plannedTools: string[];
    competitors: { name: string; aiMaturity: string; tools: string }[];
  };
  aiSolutions: {
    title: string;
    painPointCausal: string;
    mvp: string;
    features: string[];
    pricing: {
      model: string;
      monthlyFee: string;
      year1Contract: string;
      potentialLtv: string;
    };
    pricingJustification: string;
    whyYouWin: string[];
  }[];
  gtmStrategy: {
    decisionMaker: {
      name: string;
      title: string;
      phone: string;
      email: string;
      linkedinUrl: string;
      responsibilities: string;
      painOwns: string;
      motivation: string;
    };
    openingHook: string;
    coreMessage: string;
    cta: string;
    expectedObjections: { objection: string; response: string }[];
  };
  dealSizeForecast: {
    phase1QuickWin: string;
    phase2Expansion: string;
    phase3FullPlatform: string;
    totalRevenueLtv: string;
  };
  markdownReport: string;
}

export async function generateProspectResearch(companyInput: string): Promise<ProspectResearchReport> {
  const prompt = `
    You are an elite enterprise B2B management consultant and AI solutions architect.
    Your task is to conduct an automated, systematic, live-grounded research sprint on the company/domain: "${companyInput}".

    Since you are equipped with Google Search grounding, you MUST search the internet for exact details on "${companyInput}".
    Extract actual, real-world verified facts. Do NOT make up, approximate, or hallucinate information if verified details are discoverable.
    
    CRITICAL QUALITY DIRECTIVES to eliminate hallucination:
    1. COMPANY DETAILS: Verify the exact corporate name, active headquarters (HQ) city/country, real founded year, real website URL, actual status (Public, Private, Subsidiary), real annual revenues, true employee count, active sales markets, and direct social media links (LinkedIn company URL, Twitter/X handle URL, Facebook company URL, and YouTube channel URL if available). Do NOT invent these. Justify them through searches.
    2. REAL-WORLD PAIN POINTS: Identify at least 3 genuine corporate pain points using real news stories, press releases, financial reports, or industry-specific systemic issues for this exact business. Provide exact details, evidence quotes from executive statements or public news outlets (citing actual dates and sources), and quantify the actual corporate or operational impact.
    3. INFRASTRUCTURE & TECH STACK: Use web-scraping or indicators of technologies to identify active ERP systems (SAP, Oracle, NetSuite, etc.), CRMs (Salesforce, HubSpot, etc.), Business Intelligence stacks (Tableau, PowerBI, etc.), Supply Chain configurations, and dynamic website technologies (React, Next.js, HubSpot, Cloudflare, etc.). Specify exact product names and your realistic assessment confidence level ('High', 'Medium', 'Low') along with exact evidence indicators.
    4. AI ADOPTION & STRATEGY: Analyze any reported state of AI adoption, deployed machine learning algorithms, or plans. List real competitors of this company and their estimated relative AI maturity.
    5. CUSTOM FIT SOLUTIONS: Propose highly specific, granular AI/ML B2B software solutions tailored precisely to the identified pain points. Include detailed pricing structures with monthly subscriptions, Year-1 contracts, and estimated Life-Time Value (LTV) forecasts that make absolute commercial sense for a company of their size.
    6. TARGET STAKEHOLDER: Find the actual, current, real-world named executive or key decision-maker (e.g., actual CEO, CFO, CIO, CTO, VP, or Head of Operations) currently leading within that organization. Perform a precise look-up to find their real full name (e.g. \"Satya Nadella\"), exact title, a verified or highly realistic corporate phone number, a verified business corporate email address matched to their company domain, and their actual personal LinkedIn profile URL if available. Do NOT use fake placeholder text or dummy links like \"Jane Doe\" or \"example.com\".
    7. DETAILED MCKINSEY-GRADE WORK & OUTREACH PREPARATION ANALYSIS: In "markdownReport", generate a comprehensive, premium, 2000-3000 word consulting report. This must read like a Gartner Magic Quadrant or McKinsey analysis, incorporating real-world news dates (e.g., 2024-2026), specific executive quotes, and in-depth business model breakdowns. Rely directly on Google Search results to make this report exceptionally factual and precise.
    The report MUST contain these specific styled parts with clear headers and thorough, data-dense analysis:
    - # DETAILED CONSULTING REPORT: [COMPANY NAME]
    - ## PART 1: EXECUTIVE BRIEFING & CORE CORPORATE PROFILE
      Analyze the corporate profile, company scale, primary target markets, and competitive positioning.
    - ## PART 2: CAPITALIZATION, FUNDING ANALYSIS & RECENT RAISES
      Write an in-depth financial capitalization review. Explicitly answer: "Has the company raised funding recently?" (Look up recent venture capital rounds, series raises, public debt releases, or primary share expansions). Include details, exact funding amounts, dates, and named primary backing investors. If profitable or public, discuss their cash flow position, stock health, and buyback programs. Include markdown tables outlining round histories where details are available.
    - ## PART 3: LATEST PRODUCT & SERVICE INNOVATIONS
      Detail ALL major recent product and service launches, upgrades, or planned offerings in their pipeline. Describe their features, value proposition, and intended market impact.
    - ## PART 4: OPERATIONAL PAIN-POINT DIAGNOSTICS & SYSTEM RISK
      Outline active operational pain points with direct quoted evidence, news sources, dates, and impact analyses.
    - ## PART 5: TAILORED B2B AI/ML RESOLUTION ARCHITECTURE
      Outline specific blueprints for your custom-built SaaS integration models, complete with comprehensive Year-1 contract estimates and ROI analyses.
    - ## PART 6: OMNICHANNEL GTM EXECUTIVE OUTREACH SEQUENCE
      Provide exact sequences (LinkedIn & email) ready for action.
    8. FUNDING & LAUNCHED PRODUCTS: Research recent funding rounds, venture capital/private equity backing, or security filings to indicate if they have raised funding recently or not. Research recent press announcements or product logs to discover any latest products or services they have launched, or are planning to launch soon.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt + "\n\nReturn ONLY valid JSON. No markdown, no code fences, no explanation. Follow the exact schema described in the instructions.",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    const rawText = (response.text || '');
    return { ...cleanAndParseJSON(rawText) } as ProspectResearchReport;
  } catch (error) {
    console.error("Prospect Research Generation Error:", error);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("No Gemini API key configured, using fallback for prospect research");
      return getMockProspectResearch(companyInput);
    }
    throw error;
  }
}

export interface BenchmarkDriftAnalysis {
  summary: string;
  keyIssues: {
    issue: string;
    description: string;
    impact: string;
  }[];
  actionableImprovements: {
    title: string;
    channels: string[];
    proposedStrategy: string;
    exampleOutreachSubject?: string;
    exampleOutreachBody?: string;
  }[];
  reallocationAdvice: string;
}

export async function analyzeBenchmarkDrift(leads: any[]): Promise<BenchmarkDriftAnalysis> {
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt + "\n\nReturn ONLY valid JSON. No markdown, no code fences, no explanation. Follow the exact schema described in the instructions.",
      config: {}
    });
    
    const rawText = (response.text || '');
    return { ...cleanAndParseJSON(rawText) } as BenchmarkDriftAnalysis;
  } catch (error) {
    console.error("Benchmark Drift Analysis Error:", error);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("No Gemini API key configured, using fallback for benchmark drift analysis");
      return getMockBenchmarkDrift(leads);
    }
    throw error;
  }
}

export function getMockOutreach(lead: any, config: any): OutreachMessages {
  const leadName = lead.name || "there";
  const company = lead.company || "your company";
  const role = lead.role || "decision maker";
  const senderName = config.sender || "the GTM team";
  const senderCompany = config.company || "Zyntra AI";
  const product = config.product || "our GTM intelligence engine";

  return {
    whatsapp: `Hi ${leadName} - loved your team's background at ${company}! Noticed you are leading ${role} efforts. We built an automated workflow exactly for ${company} to double pipeline conversions. Worth a 1-minute read?`,
    linkedin_connect: `Hi ${leadName}, noticed your role as ${role} at ${company}. Would love to connect and follow your industry updates here!`,
    linkedin_dm: `Thanks for connecting ${leadName}! Following up on my invite - we are currently working with similar companies to automate key pipeline channels using ${product}. Let's exchange details when you have a moment.`,
    email_subject: `Scale pipeline conversions at ${company}?`,
    email_body: `Hi ${leadName},\n\nHope this message finds you well.\n\nNoticed your impressive work leading ${role} operations at ${company}. Managing multichannel GTM touchpoints while trying to maintain personalization is a significant bottleneck for growing organizations.\n\nAt ${senderCompany}, we've designed ${product} to solve this. Our customers typically see a 3x increase in decision-maker engagement by automating hyper-personalized outreach sequences across LinkedIn and SMTP.\n\nAre you open to a small 10-minute call next Tuesday at 10 AM to see how we can drive similar outcomes for ${company}?\n\nBest regards,\n\n${senderName}\n${senderCompany}`,
    email_followup: `Hi ${leadName} - just following up on my previous note. I know you're busy scale-heading operations at ${company}. Would love to share a 2-minute overview of how we optimize multichannel conversions. Let me know if you can sync up next week!`
  };
}

function defaultHQ(name: string): string {
  const norm = name.toLowerCase();
  if (norm.includes("tesla")) return "Austin, TX, USA";
  if (norm.includes("stripe")) return "San Francisco, CA, USA";
  if (norm.includes("salesforce")) return "San Francisco, CA, USA";
  return "San Francisco, CA, USA";
}

function defaultFounded(name: string): string {
  const norm = name.toLowerCase();
  if (norm.includes("tesla")) return "2003";
  if (norm.includes("stripe")) return "2010";
  if (norm.includes("salesforce")) return "1999";
  return "2013";
}

export function getMockProspectResearch(companyInput: string): ProspectResearchReport {
  const cleanName = companyInput.trim()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('.')[0];
  const companyName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  // Determine dynamic details for known companies
  const nameLower = companyName.toLowerCase();
  let defaultStatus = "Private (Scale-up)";
  let defaultRevenue = "$150M+ ARR (Estimated)";
  let defaultEmployees = "850 - 1,200";
  let defaultIndustry = "Enterprise SaaS & Business Infrastructure";
  let defaultDesc = `Premium high-growth enterprise platform specialized in automated scaling, custom process integrations, and business information workflows. Currently positioning to integrate deep cognitive learning models across legacy database operations.`;
  
  let mockFunding = {
    hasRaisedRecently: true,
    details: `${companyName} raised a significant Series C funding round to supercharge their cognitive enterprise integrations, scale outbound sales channels, and bolster developer tools globally.`,
    rounds: [
      { roundName: "Series C", amount: "$45,000,000", date: "2025-10-14", investors: "Accel Partners, Sequoia Capital, Bessemer Venture Partners" },
      { roundName: "Series B", amount: "$18,500,000", date: "2024-03-22", investors: "Y Combinator, Founders Fund" },
      { roundName: "Series A", amount: "$5,000,000", date: "2023-01-10", investors: "SV Angel, First Round Capital" }
    ]
  };

  let mockProducts = {
    hasLaunchedRecently: true,
    details: `${companyName} recently launched its highly anticipated commercial cognitive suites to streamline client integrations and optimize real-time data flow pipelines.`,
    productsList: [
      { name: "CognitiveFlow Core v3.0", description: "Zero-latency business process automation engine powered by localized small-language models.", launchDate: "2026-02" },
      { name: "IntegrateHQ Enterprise Studio", description: "Visual canvas enabling corporate operations analysts to link legacy custom ERP installations with modern secure cloud APIs.", launchDate: "2025-11" },
      { name: "SyncShield AI Guardrails", description: "Enterprise-grade safety middleware ensuring automated outbound GTM communications respect strict customer email security domains.", launchDate: "2025-08" }
    ]
  };

  if (nameLower.includes("tesla")) {
    defaultStatus = "Public (NASDAQ: TSLA)";
    defaultRevenue = "$96.7B USD (Annualized)";
    defaultEmployees = "140,000+ globally";
    defaultIndustry = "Automotive, Clean Energy & Cognitive Robotics";
    defaultDesc = "Tesla accelerates the world's transition to sustainable energy through electric vehicles, solar power, integrated batteries, and advanced robotics/autonomous systems.";
    mockFunding = {
      hasRaisedRecently: false,
      details: "Tesla is a highly profitable public enterprise with substantial operational cash flow ($10B+ free cash flow). It does not actively depend on private venture capital rounds, but occasionally conducts strategic capital raises or debt restructuring to fund massive gigafactory expansions.",
      rounds: [
        { roundName: "Strategic Debt Facility", amount: "$5,000,000,000", date: "2024-06-15", investors: "Consortium of International Sovereign Debt Markets" },
        { roundName: "Secondary Share Offering", amount: "$2,000,000,000", date: "2020-02-13", investors: "Public Equity Markets" }
      ]
    };
    mockProducts = {
      hasLaunchedRecently: true,
      details: "Tesla is aggressively transitioning into an AI & robotics powerhouse, driving major model refreshes and cutting-edge autonomous machine suites.",
      productsList: [
        { name: "Tesla Robotaxi (Cybercab)", description: "Purpose-built autonomous electric vehicle designed without steering wheels or pedals, powered completely by Tesla FSD (Full Self-Driving).", launchDate: "Launched Oct 2024 (Production target 2026)" },
        { name: "Tesla Optimus Gen 2", description: "Humanoid robot designed to perform repetitive or unsafe tasks, featuring hand upgrades with tactile sensing and faster movement speeds.", launchDate: "Unveiled Dec 2023 (Active internal factory deployment in 2025)" },
        { name: "Model Y Refresh 'Juniper'", description: "Upgraded aesthetic styling, whisper-quiet cabin acoustics, and energy efficient dual-motor configurations of the world's best selling SUV.", launchDate: "Launch Expected Late 2025 / Early 2026" }
      ]
    };
  } else if (nameLower.includes("stripe")) {
    defaultStatus = "Private (Scale-up)";
    defaultRevenue = "$14.3B Gross Revenue (Estimated)";
    defaultEmployees = "8,400+ globally";
    defaultIndustry = "Financial Infrastructure, fintech & Global Billing";
    defaultDesc = "Stripe is a suite of APIs powering online payment processing, global subscription billing, tax automation, corporate card issuance, and financial risk mitigation.";
    mockFunding = {
      hasRaisedRecently: true,
      details: "Stripe raised a substantial secondary round to provide comprehensive share liquidation for its early employees and investors, valuing the fintech absolute leader at $65 Billion.",
      rounds: [
        { roundName: "Secondary Market Tender Offer", amount: "$1,000,000,000+", date: "2024-02-15", investors: "Silver Lake, Sequoia Capital, DST Global" },
        { roundName: "Series I Preferred Raise", amount: "$6,500,000,000", date: "2023-03-15", investors: "Andreessen Horowitz, Founders Fund, General Catalyst, Temasek" }
      ]
    };
    mockProducts = {
      hasLaunchedRecently: true,
      details: "Stripe recently launched innovative financial products optimizing high-volume global billing, automated merchant multi-currency taxes, and crypto rails.",
      productsList: [
        { name: "Stripe Billing 2.0 Engine", description: "Flexible global recurring engine built to handle usage-based enterprise consumption metrics and custom contracts programmatically.", launchDate: "Launched May 2025" },
        { name: "Stripe Crypto Checkout (Inbound Usdc)", description: "Optimized payments API allows global merchants to receive stablecoin USDC settlements directly into their balance, auto-converting to local fiat.", launchDate: "Launched Oct 2024" },
        { name: "Stripe Tax for Multi-Platform Platforms", description: "Automated calculating, reporting, and physical filing of complex sales tax compliance constraints across 140+ countries.", launchDate: "Launched Jun 2025" }
      ]
    };
  } else if (nameLower.includes("salesforce")) {
    defaultStatus = "Public (NYSE: CRM)";
    defaultRevenue = "$34.9B USD (Annualized)";
    defaultEmployees = "72,000+ globally";
    defaultIndustry = "Enterprise CRM, Cloud Computing & AI Systems";
    defaultDesc = "Salesforce is the world's leading Customer Relationship Management provider, offering coordinated Customer 360 suites connecting marketing, sales, commerce, service, and data platforms.";
    mockFunding = {
      hasRaisedRecently: false,
      details: "Salesforce operates as a highly cash-generative public conglomerate. Key corporate backing comes from public shareholders. It maintains a $10 Billion active share buyback mandate and runs Salesforce Ventures, contributing massive investment capital back into the AI ecosystem.",
      rounds: [
        { roundName: "Salesforce AI Fund Expansion", amount: "$500,000,000", date: "2024-09-12", investors: "Salesforce Corporate Treasury (Salesforce Ventures)" },
        { roundName: "Senior Corporate Notes Issuance", amount: "$1,500,000,000", date: "2023-01-20", investors: "Institutional Debt Capital Buyers" }
      ]
    };
    mockProducts = {
      hasLaunchedRecently: true,
      details: "Salesforce is leading the paradigm shift from copilot wizards to fully autonomous AI agents designed to handle customer service, sales prospecting, and campaign creation.",
      productsList: [
        { name: "Salesforce Agentforce", description: "Autonomous AI agents platform operating across Sales Cloud and Service Cloud to resolve complex inquiries and guide sales autonomously with 95% accuracy.", launchDate: "Launched Sept 2024 (General Availability Oct 2024)" },
        { name: "Salesforce Data Cloud Zero Copy Partner Network", description: "Allows real-time bidirectionally synced customer profile queries with Snowflake, Databricks, BigQuery, and Redshift without expensive ETL pipelines.", launchDate: "Launched April 2024" },
        { name: "Einstein 1 Copilot Studio", description: "Visual low-code designer enabling system administrators to build custom automations and feed selective private customer context directly to large language model agents.", launchDate: "Launched Mar 2024" }
      ]
    };
  }

  const fundingText = mockFunding.hasRaisedRecently
    ? `### YES, ${companyName.toUpperCase()} HAS RAISED VENTURE CAPITAL FUNDING RECENTLY.
       
**Financial Summary**: ${mockFunding.details}

Below is the verified timeline of their capitalization rounds and major venture institutional backers:

| Funding Round | Invested Amount | Release Date | Key Institutional Investors & Lead Partners |
| :--- | :--- | :--- | :--- |
${mockFunding.rounds.map(r => `| **${r.roundName}** | \`${r.amount}\` | *${r.date}* | ${r.investors || 'N/A'} |`).join('\n')}`
    : `### NO, ${companyName.toUpperCase()} HAS NOT RECENTLY ENGAGED IN PRIVATE CAPITAL SECTOR DRAWS.
    
**Financial Summary**: ${mockFunding.details}

As ${defaultStatus.toLowerCase().includes("public") ? "a mature, highly liquid public enterprise" : "a highly profitable established enterprise"}, they operate primarily off internal equity, corporate cash flows, or direct strategic partner alliances. Their historic financial filings indicate solid corporate liquidity:

| Capital Event / Filings | Value Structure | Execution Date | Key Backers / Lead Institutions |
| :--- | :--- | :--- | :--- |
${mockFunding.rounds.map(r => `| **${r.roundName}** | \`${r.amount}\` | *${r.date}* | ${r.investors || 'N/A'} |`).join('\n')}`;

  const productsText = `### ACTIVE PRODUCT LAUNCHES & PIPELINE TRACKER
${mockProducts.details}

Below are the most notable active products and pipeline upgrades announced recently:

${mockProducts.productsList.map(p => `* **${p.name}** ${p.launchDate ? `*(${p.launchDate})*` : ''}:
  ${p.description}`).join('\n')}`;

  return {
    isMocked: true,
    companyInfo: {
      name: companyName,
      industry: defaultIndustry,
      hq: defaultHQ(companyName),
      founded: defaultFounded(companyName),
      status: defaultStatus,
      website: companyInput.includes(".") ? (companyInput.startsWith("http") ? companyInput : `https://${companyInput}`) : `https://www.google.com/search?q=${encodeURI(companyInput)}`,
      revenue: defaultRevenue,
      employees: defaultEmployees,
      markets: "Global (North America, Europe, APAC)",
      description: defaultDesc,
      socialMediaLinks: {
        linkedin: `https://linkedin.com/company/${cleanName}`,
        twitter: `https://twitter.com/${cleanName}`,
        facebook: `https://facebook.com/${cleanName}`,
        youtube: `https://youtube.com/c/${cleanName}`
      },
      funding: mockFunding,
      recentProducts: mockProducts
    },
    painPoints: [
      {
        title: "Manual GTM Intent Tracking Core Bottlenecks",
        severity: "CRITICAL",
        description: "Revenue operations teams spent average 14 hours per week manually consolidating outbound intent signals across disconnected CRM databases and tracking lists.",
        evidence: [
          {
            quote: "Operational efficiency is our single largest friction point in scaling mid-market outbound engagement this quarter.",
            source: "VP of Global Revenue Operations Internal Statement",
            date: "2025-11-14",
            url: "https://example.com/gtm-efficiency-report"
          }
        ],
        impact: "Reduces sales representative active selling time by 28% and creates 4.5 day delay in critical signal-to-response workflows.",
        timeline: "Unresolved for 3 quarters; listed as top commercial operational priority."
      },
      {
        title: "Cold Email Outreach Deliverability & High Bounce Rates",
        severity: "HIGH",
        description: "Due to lack of domain protection verification, multi-channel warmup protocols, and static outreach templates, general campaign domain trust has drifted downward.",
        evidence: [
          {
            quote: "Legacy mail provider changes require immediate engineering upgrades to keep outbound message delivery standards above 92%.",
            source: "Q3 Systems Infrastructure Audit Report",
            date: "2026-02-18"
          }
        ],
        impact: "Outbound campaign open rates dropped from 44% to 19.5%, directly impacting quarterly pipeline targets.",
        timeline: "Active issue since early 2026."
      },
      {
        title: "Inconsistent Post-Connection Personalization on Social Channels",
        severity: "MEDIUM",
        description: "Sales representatives lack unified, continuous AI personalization tools for after connection. Copy-pasted standard hooks result in low conversion rates.",
        evidence: [
          {
            quote: "Standard social networking hooks produce less than 4% demo booking rate because they lack company-specific situational context.",
            source: "Outreach Strategy Executive Summary",
            date: "2026-04-05"
          }
        ],
        impact: "Higher cost-of-acquisition and saturated prospect lists within key high-value ICP verticals.",
        timeline: "Under inspection by commercial enablement."
      }
    ],
    techStack: {
      erp: { name: "NetSuite Cloud ERP", status: "Active System", confidence: "High", source: "Public Job Postings & Technologies Profile" },
      crm: { name: "Salesforce Enterprise Operations Cloud", status: "Active System", confidence: "High", source: "Inbound pixel detection" },
      bi: { name: "Tableau Enterprise Server with Snowflake Data Warehouse", status: "Active System", confidence: "Medium", source: "Analytics tag fingerprints" },
      supplyChain: { name: "Legacy Internal Automation & Manual Spreadsheets", status: "Under Review for Migration", confidence: "Medium", source: "Employee reviews" },
      websiteTech: ["React v18.2", "Next.js", "Tailwind CSS", "Vercel Hosting", "Google Analytics v4", "HubSpot Tracking Code"]
    },
    aiAdoption: {
      maturityLevel: "Intermediate",
      deployedTools: ["Customer Service Auto-Responder Beta", "AI Copilot assist in Sales Development Workspace"],
      plannedTools: ["Cognitive Intent Scoring engine for CRM Hub", "Automated multichannel personalization router"],
      competitors: [
        { name: "Apex Solutions", aiMaturity: "Advanced", tools: "Full API-integrated pricing and demand modelers" },
        { name: "Zenith Core", aiMaturity: "Intermediate", tools: "AI-generated outbound personalization filters" },
        { name: "Vortex Systems", aiMaturity: "Basic", tools: "Rule-based scoring rules and templates" }
      ]
    },
    aiSolutions: [
      {
        title: "Cognitive GTM Signal Personalization Router",
        painPointCausal: "Manual GTM Intent Tracking Core Bottlenecks",
        mvp: "A centralized node intercepting inbound LinkedIn webhooks and auto-populating custom outbound structures within 90 seconds.",
        features: [
          "Zero-latency webhook synchronization with Salesforce",
          "Dynamic intent scoring utilizing deep customer profile vectors",
          "Custom multi-channel routing (WhatsApp/Email/LinkedIn)"
        ],
        pricing: {
          model: "Usage-based Subscription + Platform License",
          monthlyFee: "$2,450 / month",
          year1Contract: "$29,400 (billed annually)",
          potentialLtv: "$117,600 (based on 4-year client lifecycle forecast)"
        },
        pricingJustification: "Eliminates administrative CRM processing; increases direct client demo conversion by estimated 35%. Pays for itself within First 15 closed deals.",
        whyYouWin: [
          "Deeper search-grounding data fidelity compared to traditional scrapers",
          "Includes continuous WhatsApp auto-personalization hooks",
          "Direct zero-code API integration into legacy CRMs"
        ]
      }
    ],
    gtmStrategy: {
      decisionMaker: {
        name: "Marcus Sterling",
        title: "Vice President of Revenue Operations & Commercial Performance",
        phone: "+1 (415) 883-9124 ext. 410",
        email: `msterling@${cleanName || 'company'}.com`,
        linkedinUrl: `https://linkedin.com/in/msterling-revops-${cleanName || 'company'}`,
        responsibilities: "Responsible for commercial tool stack utilization, sales desk enablement, pipeline consistency, and scaling outbound SDR teams globally.",
        painOwns: "Loves pipeline velocity but hates low-quality SDR list management and CRM sync lags.",
        motivation: "Aims to achieve 40% year-over-year commercial efficiency gain using highly automated signal routing tools."
      },
      openingHook: `Hi Marcus - noticed that your SDR organization is heavily scaling mid-market outreach, but legacy delivery lag can delay intent response by up to 4 days.`,
      coreMessage: `We sync multi-channel outbound signals (LinkedIn, SMTP) with an automated cognitive intent score to route top-priority decision-makers to you within 90 seconds of signal detection.`,
      cta: `Worth a quick 10-minute look at how we decreased manual intent tasks by 14 hours/week for companies like ${companyName}?`,
      expectedObjections: [
        { objection: "We are currently locked into a Salesforce workflow engine contract.", response: "Our routing layers plug completely natively into your existing Salesforce stack as a lightweight API hook—no migration or workflow teardown required." },
        { objection: "I am worried about domain sender reputation with automated high-velocity emails.", response: "We utilize multi-inbox rotations and automated warmup patterns to guarantee your main domain is never exposed directly." }
      ]
    },
    dealSizeForecast: {
      phase1QuickWin: "$29,400 (10 seat pilot program)",
      phase2Expansion: "$78,500 (Full mid-market team transition)",
      phase3FullPlatform: "$145,000 (APAC + EMEA global expansion rollouts)",
      totalRevenueLtv: "$252,900"
    },
    markdownReport: `# DETAILED CONSULTING REPORT: ${companyName.toUpperCase()}
  
*Prepared by Senior AI Architects and Enterprise Strategy Leads*

---

## PART 1: EXECUTIVE BRIEFING & CORE CORPORATE PROFILE

**${companyName}** is operating at the forefront of the modern digital enterprise ecosystem within the **${defaultIndustry}** category. 

Founded in **${defaultFounded(companyName)}** with corporate headquarters situated in **${defaultHQ(companyName)}**, the company manages an estimated headcount of **${defaultEmployees}** professionals. The organization is actively capturing massive business volume across key geolocated markets including **Global (North America, Europe, APAC)**.

### Strategic Market Assessment
The firm positions its value proposition on offering robust core infrastructures tailored for deep commercial growth. Nevertheless, our structural operational diagnostics reveal measurable friction within their Go-to-Market workflows. Automated pipeline capture and multi-channel signal routing remain key operational targets for optimization to unlock their next layer of revenue productivity.

---

## PART 2: CAPITALIZATION, FUNDING ANALYSIS & RECENT RAISES

${fundingText}

---

## PART 3: LATEST PRODUCT & SERVICE INNOVATIONS

${productsText}

---

## PART 4: OPERATIONAL PAIN-POINT DIAGNOSTICS & SYSTEM RISK

Operational diagnostics conducted across their public footprint indicate three primary strategic workflow bottlenecks:

### 1. High Manual intent Signal Lag
Sales development and lead-management professionals currently spend an average of **14 hours per week** consolidating hot signals manually across disconnected systems. High-intent decision-makers remain unrouted for up to **4.5 days**, during which critical pipeline conversion rates decay significantly.
* **Quantified Impact**: Cuts active sales representative prospecting bandwidth by 28%.
* **Quoted Evidence**: *"Operational efficiency is our single largest friction point in scaling mid-market outbound engagement this quarter."* - VP of Global Revenue Operations Internal Audit.

### 2. Standardized Outbound Domain Exhaustion
Due to a lack of automated sandbox warmup routines and static templated sequencing, standard cold campaign delivery rates have suffered downward drift, dropping open rates to **19.5%**.
* **Quantified Impact**: Depletes response indices and flags main outbound communication domains.

### 3. Static Social Channel outreach Hooks
Social prospecting interactions rely primarily on non-personalized, static copies. Standard templates produce a low 4% conversion index due to a lack of buyer-specific situational context.

---

## PART 5: TAILORED B2B AI/ML RESOLUTION ARCHITECTURE

We propose the deployment of an enterprise **Cognitive GTM Signal Personalization Router** designed to link signal sources directly with optimized outbound pipelines:

* **Middle-Tier Webhook Router**: Intercepts hot signals from social APIs and runs lightweight, customized intent calculations under 90 seconds.
* **Financial Modeling & Projection**:
  * **Monthly Service Retainer**: \`$2,450 / month\`
  * **Billed Year-1 Value**: \`$29,400\`
  * **Potential Customer Lifetime Value (LTV)**: \`$117,600\`
* **Pricing Justification**: Completely automates manual verification workflows, saving the sales desk up to **55 combined hours per week**. Returns ROI parity within the first fifteen closed contracts.

---

## PART 6: OMNICHANNEL GTM EXECUTIVE OUTREACH SEQUENCE

To convert this research into a direct commercial engagement, we suggest executing the following targeted multi-touch funnel for **Marcus Sterling (VP of RevOps)**:

### Touch 1: Short LinkedIn Connection Invitation (Warm Hook)
> *"Marcus - following your updates on commercial efficiency. Noticed your mid-market sales desks have scaled quickly. Let's exchange terms on automation."*

### Touch 2: Omnichannel Strategic Value Proposition (Email Pitch)
> **Subject**: SDR intent signal response lag at ${companyName}
>
> Dear Marcus,
>
> Noticed that your outbound groups are actively scaling. However, manual consolidation across Salesforce and lists can trigger a 4.5-day response lag. When high-intent decision-makers show interest, standard SDRs miss the critical window.
>
> We help RevOps teams automate intent capture and route hyper-personalized WhatsApp or email triggers in under 90 seconds. We saved similar software companies up to 14 hours per desk week.
>
> Would you be open to a brief, 10-minute preview next Tuesday?
>
> Best regards,
> [Your Name]`
  };
}

export function getMockBenchmarkDrift(leads: any[]): BenchmarkDriftAnalysis {
  return {
    summary: `Your campaign's average lead intent score has drifted to ${leads.length ? Math.round(leads.reduce((acc: number, l: any) => acc + (l.score || 60), 0) / leads.length) : 58}, representing warning levels. Mismatch detected between target decision-makers titles (many lack direct budgetary oversight) and localized geographic segments.`,
    keyIssues: [
      {
        issue: "Decision Maker Juniority",
        description: "Over 45% of target leads in this cohort hold associate or assistant-level titles with zero direct P&L or budget approval authority.",
        impact: "Extends sales cycle length by estimated 35 days due to internal referral loops."
      },
      {
        issue: "Broad Vertical Demographics",
        description: "Target lists combine legacy logistics companies with advanced SaaS companies, diluting personalized outreach effectiveness.",
        impact: "Outbound campaign open and click-through rates fell by 22%."
      },
      {
        issue: "Geographic Inconsistencies",
        description: "Active message sequences are dispatched in non-localized time zones, resulting in low morning email placement.",
        impact: "Vast majority of messages land at the bottom of target executive inboxes."
      }
    ],
    actionableImprovements: [
      {
        title: "Target VP & C-Level Executives exclusively",
        channels: ["LinkedIn", "Email"],
        proposedStrategy: "Restrict smart filtering to only match 'VP', 'Director', 'Chief', or 'Head of' keywords.",
        exampleOutreachSubject: "Optimizing operations cost-efficiency",
        exampleOutreachBody: "Hi [Name], noticed your corporate focus on operational velocity. Let's sync on SDR benchmarks."
      },
      {
        title: "Implement Domain Rotation warmup sets",
        channels: ["Email"],
        proposedStrategy: "Route outgoing cold scripts through three unique auxiliary email domains in sequence to preserve main brand credibility.",
        exampleOutreachSubject: "Quick check: pipeline leakage audit",
        exampleOutreachBody: "Hi [Name], we built a lightweight analyzer to detect system leakages. Worth a 2-minute preview?"
      },
      {
        title: "Deploy localized sending windows",
        channels: ["LinkedIn", "WhatsApp"],
        proposedStrategy: "Align automations with the time zone of each individual lead contact automatically.",
        exampleOutreachSubject: "Sync scheduling",
        exampleOutreachBody: "Hi [Name], synchronizing GTM scheduling."
      }
    ],
    reallocationAdvice: "We recommend immediately pausing the generic mid-market IT list and re-directing SDR focus strictly toward Tier-1 VP of Sales and VP of Operations targets within the Financial Services and Advanced Tech segments."
  };
}


