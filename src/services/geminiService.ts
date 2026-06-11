export interface OutreachMessages {
  whatsapp: string;
  linkedin_connect: string;
  linkedin_dm: string;
  email_subject: string;
  email_body: string;
  email_followup: string;
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

export function getNvidiaApiKey(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("zy_nvidia_api_key");
    if (saved) return saved;
  }
  return "";
}

export function getNvidiaSelectedModel(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("zy_nvidia_selected_model");
    if (saved) return saved;
  }
  return "google/gemma-3n-e2b-it";
}

// Low-overhead client-side helper to call the secure Express server-side Gemini routes
async function fetchSecureGemini(endpoint: string, body: any): Promise<any> {
  const nvidiaKey = getNvidiaApiKey();
  const nvidiaModel = getNvidiaSelectedModel();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        customNvidia: {
          apiKey: nvidiaKey || undefined,
          model: nvidiaModel || undefined
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Server execution failure: ${errBody || response.statusText}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(json.error);
    }
    return json;
  } catch (err: any) {
    console.error(`Secure Gemini API call to ${endpoint} failed:`, err);
    throw err;
  }
}

export async function generateOutreach(lead: any, config: any): Promise<OutreachMessages> {
  return fetchSecureGemini('/api/gemini/generate-outreach', { lead, config });
}

export async function generateProspectResearch(companyInput: string): Promise<ProspectResearchReport> {
  return fetchSecureGemini('/api/gemini/generate-prospect-research', { companyInput });
}

export async function analyzeBenchmarkDrift(leads: any[]): Promise<BenchmarkDriftAnalysis> {
  return fetchSecureGemini('/api/gemini/analyze-benchmark-drift', { leads });
}
