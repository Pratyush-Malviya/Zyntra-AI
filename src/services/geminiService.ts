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

// Clean and Parse JSON handles raw control characters / line breaks inside string values in JSON
function cleanAndParseJSON(jsonStr: string): any {
  let cleaned = jsonStr.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    console.warn("Standard JSON parse failed, attempting sanitization...", firstError);
    try {
      // Escape raw control characters (ASCII 0-31) inside quoted string values
      const sanitized = cleaned.replace(/[\u0000-\u001F]/g, (char) => {
        if (char === '\n') return '\\n';
        if (char === '\r') return '\\r';
        if (char === '\t') return '\\t';
        return '';
      });
      return JSON.parse(sanitized);
    } catch (secondError) {
      console.error("Sanitizing JSON failed too. Raw text length:", cleaned.length);
      throw secondError;
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
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatsapp: { type: Type.STRING },
            linkedin_connect: { type: Type.STRING },
            linkedin_dm: { type: Type.STRING },
            email_subject: { type: Type.STRING },
            email_body: { type: Type.STRING },
            email_followup: { type: Type.STRING },
          },
          required: ["whatsapp", "linkedin_connect", "linkedin_dm", "email_subject", "email_body", "email_followup"],
        }
      }
    });
    
    const rawText = (response.text || '');
    return cleanAndParseJSON(rawText) as OutreachMessages;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}

export interface ProspectResearchReport {
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
    7. DETAILED MCKINSEY-GRADE WORK: In "markdownReport", generate a complete, premium, comprehensive, 1500-2500 word consulting report. This must read like a Gartner Magic Quadrant or McKinsey analysis, incorporating real-world news dates (e.g., 2024-2026), specific executive quotes, and in-depth business model breakdowns. Rely directly on Google Search results to make this report exceptionally factual and precise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyInfo: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                industry: { type: Type.STRING },
                hq: { type: Type.STRING },
                founded: { type: Type.STRING },
                status: { type: Type.STRING },
                website: { type: Type.STRING },
                revenue: { type: Type.STRING },
                employees: { type: Type.STRING },
                markets: { type: Type.STRING },
                description: { type: Type.STRING },
                socialMediaLinks: {
                  type: Type.OBJECT,
                  properties: {
                    linkedin: { type: Type.STRING },
                    twitter: { type: Type.STRING },
                    facebook: { type: Type.STRING },
                    youtube: { type: Type.STRING },
                  },
                  required: ["linkedin"]
                }
              },
              required: ["name", "industry", "hq", "founded", "status", "website", "revenue", "employees", "markets", "description", "socialMediaLinks"],
            },
            painPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  description: { type: Type.STRING },
                  evidence: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        quote: { type: Type.STRING },
                        source: { type: Type.STRING },
                        date: { type: Type.STRING },
                      },
                      required: ["quote", "source", "date"],
                    }
                  },
                  impact: { type: Type.STRING },
                  timeline: { type: Type.STRING },
                },
                required: ["title", "severity", "description", "evidence", "impact", "timeline"],
              }
            },
            techStack: {
              type: Type.OBJECT,
              properties: {
                erp: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    status: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    source: { type: Type.STRING },
                  },
                  required: ["name", "status", "confidence", "source"]
                },
                crm: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    status: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    source: { type: Type.STRING },
                  },
                  required: ["name", "status", "confidence", "source"]
                },
                bi: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    status: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    source: { type: Type.STRING },
                  },
                  required: ["name", "status", "confidence", "source"]
                },
                supplyChain: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    status: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    source: { type: Type.STRING },
                  },
                  required: ["name", "status", "confidence", "source"]
                },
                websiteTech: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                }
              },
              required: ["erp", "crm", "bi", "supplyChain", "websiteTech"],
            },
            aiAdoption: {
              type: Type.OBJECT,
              properties: {
                maturityLevel: { type: Type.STRING },
                deployedTools: { type: Type.ARRAY, items: { type: Type.STRING } },
                plannedTools: { type: Type.ARRAY, items: { type: Type.STRING } },
                competitors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      aiMaturity: { type: Type.STRING },
                      tools: { type: Type.STRING },
                    },
                    required: ["name", "aiMaturity", "tools"],
                  }
                }
              },
              required: ["maturityLevel", "deployedTools", "plannedTools", "competitors"],
            },
            aiSolutions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  painPointCausal: { type: Type.STRING },
                  mvp: { type: Type.STRING },
                  features: { type: Type.ARRAY, items: { type: Type.STRING } },
                  pricing: {
                    type: Type.OBJECT,
                    properties: {
                      model: { type: Type.STRING },
                      monthlyFee: { type: Type.STRING },
                      year1Contract: { type: Type.STRING },
                      potentialLtv: { type: Type.STRING },
                    },
                    required: ["model", "monthlyFee", "year1Contract", "potentialLtv"],
                  },
                  pricingJustification: { type: Type.STRING },
                  whyYouWin: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["title", "painPointCausal", "mvp", "features", "pricing", "pricingJustification", "whyYouWin"],
              }
            },
            gtmStrategy: {
              type: Type.OBJECT,
              properties: {
                decisionMaker: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    title: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    email: { type: Type.STRING },
                    linkedinUrl: { type: Type.STRING },
                    responsibilities: { type: Type.STRING },
                    painOwns: { type: Type.STRING },
                    motivation: { type: Type.STRING },
                  },
                  required: ["name", "title", "phone", "email", "linkedinUrl", "responsibilities", "painOwns", "motivation"],
                },
                openingHook: { type: Type.STRING },
                coreMessage: { type: Type.STRING },
                cta: { type: Type.STRING },
                expectedObjections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      objection: { type: Type.STRING },
                      response: { type: Type.STRING },
                    },
                    required: ["objection", "response"],
                  }
                }
              },
              required: ["decisionMaker", "openingHook", "coreMessage", "cta", "expectedObjections"],
            },
            dealSizeForecast: {
              type: Type.OBJECT,
              properties: {
                phase1QuickWin: { type: Type.STRING },
                phase2Expansion: { type: Type.STRING },
                phase3FullPlatform: { type: Type.STRING },
                totalRevenueLtv: { type: Type.STRING },
              },
              required: ["phase1QuickWin", "phase2Expansion", "phase3FullPlatform", "totalRevenueLtv"],
            },
            markdownReport: { type: Type.STRING },
          },
          required: [
            "companyInfo",
            "painPoints",
            "techStack",
            "aiAdoption",
            "aiSolutions",
            "gtmStrategy",
            "dealSizeForecast",
            "markdownReport"
          ],
        },
        tools: [{ googleSearch: {} }]
      }
    });
    
    const rawText = (response.text || '');
    return cleanAndParseJSON(rawText) as ProspectResearchReport;
  } catch (error) {
    console.error("Prospect Research Generation Error:", error);
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
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyIssues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  issue: { type: Type.STRING },
                  description: { type: Type.STRING },
                  impact: { type: Type.STRING }
                },
                required: ["issue", "description", "impact"]
              }
            },
            actionableImprovements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  channels: { type: Type.ARRAY, items: { type: Type.STRING } },
                  proposedStrategy: { type: Type.STRING },
                  exampleOutreachSubject: { type: Type.STRING },
                  exampleOutreachBody: { type: Type.STRING }
                },
                required: ["title", "channels", "proposedStrategy"]
              }
            },
            reallocationAdvice: { type: Type.STRING }
          },
          required: ["summary", "keyIssues", "actionableImprovements", "reallocationAdvice"]
        }
      }
    });

    const rawText = (response.text || '');
    return cleanAndParseJSON(rawText) as BenchmarkDriftAnalysis;
  } catch (error) {
    console.error("Benchmark Drift Analysis Error:", error);
    throw error;
  }
}

