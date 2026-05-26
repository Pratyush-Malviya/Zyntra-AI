import React, { useState } from 'react';
import { 
  Zap, 
  Users, 
  Bot, 
  Linkedin, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  ChevronRight, 
  ArrowRight, 
  Shield, 
  Sparkles, 
  Layers, 
  BarChart3, 
  Network, 
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Award,
  Globe,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LandingPageProps {
  onLaunchApp: () => void;
  isAuthenticated: boolean;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  isMobileDevice?: boolean;
}

export default function LandingPage({ onLaunchApp, isAuthenticated, theme, setTheme, isMobileDevice }: LandingPageProps) {
  // Calculator state
  const [leadVolume, setLeadVolume] = useState<number>(500);
  const [conversionRate, setConversionRate] = useState<number>(2.5);
  const [dealValue, setDealValue] = useState<number>(10000);

  // Computed values
  const traditionalReplies = Math.round(leadVolume * 0.05); // 5% reply
  const zyntraReplies = Math.round(leadVolume * (conversionRate * 12) / 100); 
  const estimatedRevenue = Math.round(zyntraReplies * (dealValue * 0.2)); // 20% close rate on high replies

  // FAQ states
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does Zyntra's deep intelligence matching work?",
      a: "Zyntra leverages specialized Gemini LLM agents to research leads in real-time. By scanning public profiles, website copy, and corporate social footprints, the system assigns a Lead Intent Score (between 0-90) aligned to executive seniority tiers, saving your sales development reps dozens of hours in manual prospecting."
    },
    {
      q: "Can I connect my own SMTP accounts and LinkedIn profiles?",
      a: "Yes. Zyntra provides a secure decentralized network bridge. You can integrate your custom enterprise SMTP configurations with precise TLS limits, and securely link high-authority sender signals to coordinate omnichannel sequences seamlessly."
    },
    {
      q: "Are the outreach templates fully dynamic?",
      a: "Absolutely. Zyntra creates hyper-personalized context variables for every lead target. It structures bespoke templates tailored specifically for WhatsApp, LinkedIn direct outreach, and multi-sequence cold emails. No generic 'Hi [First_Name]' placeholders."
    },
    {
      q: "What makes Zyntra AI different from other sales platforms?",
      a: "Traditional tools import raw, dry contact lists with zero verification. Zyntra behaves like a real-time research and validation engine, filtering out bad emails, scoring enterprise authority, and running live simulator knobs to forecast your pipe conversion ROI before you run your campaigns."
    }
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#090a0f] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-all duration-300 font-sans antialiased overflow-x-hidden`}>
      {/* Structural Metadata for SEO Bots */}
      <h1 className="sr-only">Zyntra AI - Next Generation Omnichannel Sales Prospecting &amp; High-Conversion Outreach Platform</h1>
      
      {/* 1. Header/Navigation Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${theme === 'dark' ? 'border-white/[0.05] bg-[#090a0f]/80' : 'border-slate-200 bg-white/80'} transition-all`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg font-mono">
              ZYNTRA<span className="text-blue-500">.AI</span>
            </span>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className={`hover:text-blue-500 transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Features</a>
            <a href="#prospecting-demo" className={`hover:text-blue-500 transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Intelligence Hub</a>
            <a href="#yield-calculator" className={`hover:text-blue-500 transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>ROI Simulator</a>
            <a href="#faq" className={`hover:text-blue-500 transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Faq</a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            {!isMobileDevice && (
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`p-2 rounded-lg cursor-pointer transition-colors border ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-white/[0.05] text-amber-400 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {theme === 'dark' ? (
                  <span className="text-xs font-mono">☀️ Light</span>
                ) : (
                  <span className="text-xs font-mono">🌙 Dark</span>
                )}
              </button>
            )}

            <button 
              onClick={onLaunchApp}
              className="px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white shadow-lg shadow-blue-500/10 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <span>{isAuthenticated ? 'Go to Console' : 'Launch Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative py-20 px-6 max-w-7xl mx-auto flex flex-col items-center">
        {/* Subtle background mesh */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[90%] md:w-[60%] h-[400px] bg-gradient-to-r from-blue-600/10 to-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="text-center max-w-3xl space-y-6 z-10 relative">
          <div className={`inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-[11px] font-semibold border ${
            theme === 'dark' 
              ? 'bg-slate-900/60 border-white/[0.05] text-emerald-400' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-700'
          }`}>
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[9px] animate-pulse">LIVE</span>
            <span className="tracking-tight text-xs flex items-center gap-1">Omnichannel Pipeline intelligence with Gemini Models</span>
          </div>

          <h2 className={`text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Supercharge sales outreach with <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">Interactive LLM Intel.</span>
          </h2>

          <p className={`text-base md:text-lg max-w-2xl mx-auto leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Zyntra AI brings deep programmatic prospecting, live research indexing, multi-variable lead scoring, and automated omnichannel personalization triggers into a single integrated sales environment.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-tight shadow-xl shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
            <a 
              href="#yield-calculator"
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold tracking-tight border text-center transition-all ${
                theme === 'dark' 
                  ? 'border-white/[0.08] hover:bg-white/5 bg-slate-900/40 text-slate-200' 
                  : 'border-slate-200 hover:bg-slate-50 bg-white text-slate-700'
              }`}
            >
              Simulate ROI Yield
            </a>
          </div>
        </div>

        {/* Hero Interactive App Mockup Frame */}
        <div className={`mt-16 w-full max-w-5xl rounded-2xl border ${
          theme === 'dark' ? 'bg-[#12131a]/60 border-white/[0.06]' : 'bg-white border-slate-200'
        } shadow-2xl p-4 md:p-6 relative overflow-hidden group`}>
          {/* Accent decoration line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-500" />
          
          {/* Header tabs mimic */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className={`text-[10px] ml-2 font-mono ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>https://zyntra.ai/console-preview</span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold border ${
              theme === 'dark' ? 'bg-slate-900 border-white/[0.05] text-blue-400' : 'bg-slate-50 border-slate-100 text-blue-600'
            }`}>
              <Bot className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>Multi-agent Gemini Enabled</span>
            </div>
          </div>

          {/* Dashboard Preview mockup representation - Render style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Block 1: Research Index */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-950/60 border-white/[0.04]' : 'bg-slate-50 border-slate-200/60'
            } space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#059669]">Prospect intelligence</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className={`p-2.5 rounded-lg border text-left ${theme === 'dark' ? 'bg-slate-900/60 border-white/[0.04]' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">SP</div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">Sarah Mitchell</h4>
                    <p className="text-[9px] text-slate-500">Head of Talent • SaaS Platform</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-700/10 space-y-1">
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Corporate Size</span>
                    <span className="font-semibold text-slate-400">140 employees</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Index Status</span>
                    <span className="text-emerald-400 flex items-center gap-0.5">✔ Verified</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <div className="flex justify-between text-[9px]">
                  <span className="text-slate-500">Validation Speed/Rate</span>
                  <span className="text-blue-400 font-mono">99.4% accuracy</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full w-[94%]" />
                </div>
              </div>
            </div>

            {/* Block 2: Omnichannel Editor */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-950/60 border-white/[0.04]' : 'bg-slate-50 border-slate-200/60'
            } md:col-span-2 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400">Dynamic Campaign Personalization</span>
                <span className="text-[9px] text-slate-400 font-mono">Active Channel: WhatsApp & SMTP</span>
              </div>
              
              <div className={`p-3 rounded-lg border text-left ${theme === 'dark' ? 'bg-slate-900/60 border-white/[0.04]' : 'bg-white border-slate-200'} space-y-2`}>
                <div className="flex gap-2 text-[10px] font-bold border-b border-white/[0.05] pb-2">
                  <span className="text-emerald-400 border-b border-emerald-400 pb-1">WhatsApp Broadcast</span>
                  <span className="text-slate-500 pb-1">LinkedIn InMail</span>
                  <span className="text-slate-500 pb-1">SMTP Pro</span>
                </div>
                
                <p className="text-[10.5px] leading-relaxed text-slate-300 font-mono">
                  &quot;Hello <span className="text-purple-400">Sarah</span>, analyzed your corporate recruitment index at <span className="text-blue-400">GrowthCo UK</span>. Given your SaaS growth metrics, we compiled a tailored roadmap focusing on AI agency automation. Let&apos;s sync.&quot;
                </p>

                <div className="flex items-center justify-between pt-1 text-[9px] text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" /> Personalized with corporate dossier metadata.
                  </span>
                  <span className="bg-[#2563eb]/20 text-blue-400 rounded px-1.5 py-0.5 font-bold">100% Custom</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.03]">
                  <span className="text-slate-500 block text-[8px]">AVERAGE OPEN RATE</span>
                  <span className="font-extrabold text-[#059669] text-xs">84.2%</span>
                </div>
                <div className="p-2 rounded bg-white/[0.02] border border-white/[0.03]">
                  <span className="text-slate-500 block text-[8px]">RESPONSE MULTIPLIER</span>
                  <span className="font-extrabold text-[#2563eb] text-xs">4.8x higher</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ROI Yield Simulator Section */}
      <section id="yield-calculator" className={`py-20 border-t ${theme === 'dark' ? 'border-white/[0.04] bg-slate-950/20' : 'border-slate-200 bg-slate-100/50'}`}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">ROI Calculator Simulator</span>
            <h3 className={`text-3xl md:text-4xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Model your pipeline yield. Stop guessing outreach outcomes.
            </h3>
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Adjust lead prospecting volumes, standard conversions and deals value constraints to simulate and contrast standard generic lists versus Zyntra&apos;s hyper-targeted hyper-personalized enterprise outreach yield.
            </p>

            <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-xs text-emerald-400 leading-relaxed flex items-center gap-3">
              <Award className="w-5 h-5 shrink-0" />
              <span>By utilizing specialized seniority roles and precise organizational research indexation, conversion outcomes boost up to 340% over traditional blanket sequences.</span>
            </div>
          </div>

          {/* Calculator Interface Box */}
          <div className={`p-6 md:p-8 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#12131a] border-white/[0.06] shadow-emerald-500/5' : 'bg-white border-slate-200 shadow-xl'
          } shadow-2xl relative space-y-6`}>
            
            {/* Input Slider 1 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>Leads Target Volume</span>
                <span className="text-blue-400 font-mono">{leadVolume} Qualified Leads</span>
              </div>
              <input 
                type="range"
                min="50"
                max="2500"
                step="50"
                value={leadVolume}
                onChange={(e) => setLeadVolume(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Input Slider 2 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>Custom Hyper-Personalized Reply %</span>
                <span className="text-emerald-400 font-mono">{conversionRate.toFixed(1)}% Base Target</span>
              </div>
              <input 
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={conversionRate}
                onChange={(e) => setConversionRate(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Input Slider 3 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>Average Value of ACV Deal</span>
                <span className="text-slate-100 font-mono">${dealValue.toLocaleString()}</span>
              </div>
              <input 
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={dealValue}
                onChange={(e) => setDealValue(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Simulated Comparison Board */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/[0.05]">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Standard Replies (5%)</span>
                <span className="text-lg font-bold text-slate-400">{traditionalReplies} replies</span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-500 block uppercase font-bold">Zyntra Replies (~{Math.round(conversionRate * 12)}%)</span>
                <span className="text-lg font-bold text-emerald-400">{zyntraReplies} replies</span>
              </div>
            </div>

            <div className={`p-4 rounded-xl text-center flex flex-col items-center justify-center ${
              theme === 'dark' ? 'bg-slate-900/80' : 'bg-slate-50'
            }`}>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Estimated Revenue Added</span>
              <span className="text-2xl md:text-3xl font-extrabold text-blue-500 font-mono mt-1">
                +${estimatedRevenue.toLocaleString()}
              </span>
              <p className="text-[9px] text-slate-500 leading-tight mt-1">Calculated with structured multi-agent scoring multipliers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Core Features Grid Section */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="text-xs uppercase font-extrabold tracking-widest text-blue-500">ENGINEERED SPECS</span>
          <h3 className={`text-3xl md:text-4xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Built for enterprise pipeline stability &amp; volume control.
          </h3>
          <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            No tricks or gimmicks. Just a real-world B2B engine that researches target clients, validates signals, and runs reliable multi-channel campaigns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className={`p-6 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#12131a] border-white/[0.06] hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300'
          } transition-all space-y-4 text-left`}>
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold">Deep Gemini Profiling</h4>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Analyzes specific decision-makers. Scrape LinkedIn footprints, corporate roles, and custom industry tags to craft dynamic relevance vectors.
            </p>
          </div>

          {/* Card 2 */}
          <div className={`p-6 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#12131a] border-white/[0.06] hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300'
          } transition-all space-y-4 text-left`}>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Network className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold">Omnichannel Sending</h4>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Trigger highly tailored messages to WhatsApp, LinkedIn active feeds, or inbox. Keeps conversation loops synced across all systems.
            </p>
          </div>

          {/* Card 3 */}
          <div className={`p-6 rounded-2xl border ${
            theme === 'dark' ? 'bg-[#12131a] border-white/[0.06] hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300'
          } transition-all space-y-4 text-left`}>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold">Predictive Forecasting</h4>
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Interactive histogram views, segment breakdown analytics, and simulated cycle velocities let your team forecast yield precisely.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Prospecting Demo Block */}
      <section id="prospecting-demo" className={`py-16 ${theme === 'dark' ? 'bg-slate-950/40 border-y border-white/[0.04]' : 'bg-slate-100 border-y border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative group rounded-2xl overflow-hidden border border-white/[0.05] shadow-2xl">
            {/* Visual illustration of the research index */}
            <div className={`p-6 space-y-4 ${theme === 'dark' ? 'bg-[#12131a]' : 'bg-white'}`}>
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                <span className="text-[11px] font-mono text-slate-500">LEAD DATABASE REAL-TIME LOG</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold">Sync Enabled</span>
              </div>
              
              <div className="space-y-3">
                {[
                  { name: "Sarah Mitchell", role: "Head of Talent", comp: "GrowthCo UK", score: 85, badge: "Elite Tier" },
                  { name: "Aditi Sharma", role: "HR Director", comp: "TechCorp India", score: 70, badge: "High Tier" },
                  { name: "James Ochieng", role: "CEO", comp: "Nairobi Staffing", score: 90, badge: "VIP Board" },
                ].map((l, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${
                    theme === 'dark' ? 'bg-slate-900/60 border-white/[0.04]' : 'bg-slate-50 border-slate-200/60'
                  } flex justify-between items-center`}>
                    <div className="text-left">
                      <h5 className="text-xs font-bold">{l.name}</h5>
                      <p className="text-[9px] text-slate-500">{l.role} • {l.comp}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-extrabold">{l.badge}</span>
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-400 font-mono font-bold block">{l.score}/90</span>
                        <span className="text-[7px] text-slate-500 block uppercase">Match Ratio</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6 text-left">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#2563eb]">Dynamic Prospecting Intelligence</span>
            <h3 className={`text-3xl md:text-4xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Qualify before reaching out. Always.
            </h3>
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Standard campaigns spam everyone. Zyntra calculates a multi-factor score instantly based on job titles, active corporate domains, and verified social media links. Only spend resources on target accounts that warrant premium attention.
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={onLaunchApp}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-tight shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <span>Process Your First List</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Accordion Section */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">FAQS ANSWERED</span>
          <h3 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-4">
          {faqs.map((f, i) => (
            <div 
              key={i} 
              className={`p-5 rounded-2xl border transition-all ${
                theme === 'dark' ? 'bg-[#12131a] border-white/[0.05]' : 'bg-white border-slate-200'
              }`}
            >
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex justify-between items-center text-left font-bold text-sm md:text-base cursor-pointer"
              >
                <span>{f.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className={`text-xs md:text-sm leading-relaxed border-t border-white/[0.05] pt-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {f.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Action Block & Footer */}
      <footer className={`py-16 border-t ${theme === 'dark' ? 'border-white/[0.05] bg-[#090a0f]' : 'border-slate-200 bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          {/* Action Call */}
          <div className={`p-8 md:p-12 rounded-[32px] bg-gradient-to-br from-blue-900/40 via-slate-900 to-black border ${
            theme === 'dark' ? 'border-white/[0.05]' : 'border-slate-200'
          } space-y-6 max-w-4xl mx-auto text-center relative overflow-hidden shadow-2xl`}>
            
            <div className="space-y-3 z-10 relative">
              <h4 className="text-2xl md:text-4xl font-extrabold text-white">
                Ready to accelerate your B2B pipelines?
              </h4>
              <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
                Connect your campaigns, configure target decision factors, and trigger beautiful personalization streams across three channels today.
              </p>
            </div>

            <div className="flex justify-center z-10 relative pt-2">
              <button 
                onClick={onLaunchApp}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 hover:opacity-90 text-white font-extrabold text-xs md:text-sm tracking-tight transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
              >
                <span>Launch Enterprise Console Now</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Core Footer Lines */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 border-t border-white/[0.05] text-[11px] font-semibold text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-blue-500" />
              </div>
              <span className="font-mono">ZYNTRA.AI INC. © 2026. All Rights Reserved.</span>
            </div>

            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-blue-500 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-blue-500 transition-colors">Terms of Use</a>
              <a href="#" className="hover:text-blue-500 transition-colors">Enterprise SLA</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
