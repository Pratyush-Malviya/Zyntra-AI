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
    <div className={`min-h-screen${theme === 'dark' ? 'bg-[#040508] text-slate-100' : 'bg-slate-50 text-slate-900'}transition-all duration-300 font-sans antialiased overflow-x-hidden relative`}>
      {/* Structural Metadata for SEO Bots */}
      <h1 className="sr-only">Zyntra AI - Next Generation Omnichannel Sales Prospecting &amp; High-Conversion Outreach Platform</h1>
      
      {/* 1. Header/Navigation Bar */}
      <header className={`sticky top-0 z-50 border-b${theme === 'dark' ? 'border-white/[0.04] bg-[#040508]/80' : 'border-slate-200/60 bg-white/80'}transition-all`}>
        <div className="max-w-7xl mx-auto px-8 sm:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-transform duration-350">
              <Zap className="w-5.5 h-5.5 text-text" />
            </div>
            <span className="font-extrabold tracking-tight text-xl font-mono">
              ZYNTRA<span className="text-blue-550 font-bold">.AI</span>
            </span>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-10 text-[10.5px] uppercase tracking-widest font-extrabold">
            <a href="#features" className={`hover:text-blue-500 transition-colors${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Features</a>
            <a href="#prospecting-demo" className={`hover:text-blue-500 transition-colors${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Intelligence Hub</a>
            <a href="#yield-calculator" className={`hover:text-blue-500 transition-colors${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>ROI Simulator</a>
            <a href="#faq" className={`hover:text-blue-500 transition-colors${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Faq</a>
          </nav>

          <div className="flex items-center gap-4.5">
            {/* Theme Toggle */}
            {!isMobileDevice && (
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  theme === 'dark' 
                    ? 'bg-slate-950 border-white/[0.06] text-amber-400 hover:bg-slate-900' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 shadow-xs'
                }`}
              >
                {theme === 'dark' ? (
                  <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold">☀️ Light</span>
                ) : (
                  <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold">🌙 Dark</span>
                )}
              </button>
            )}

            <button 
              onClick={onLaunchApp}
              className="px-5 py-2.5 text-xs font-bold rounded-xl hover:from-blue-500 hover:to-emerald-500 text-text cursor-pointer flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <span>{isAuthenticated ? 'Go to Console' : 'Launch Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative py-28 md:py-36 px-6 max-w-7xl mx-auto flex flex-col items-center">
        {/* Subtle background mesh */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[90%] md:w-[70%] h-[400px] rounded-full pointer-events-none" />

        <div className="text-center max-w-4xl space-y-8 z-10 relative">
          <div className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-[10px] uppercase font-mono tracking-widest font-extrabold border ${
            theme === 'dark' 
              ? 'bg-slate-950/80 border-white/[0.06] text-emerald-400' 
              : 'bg-emerald-50 border-emerald-100 text-emerald-700'
          }`}>
            <span className="px-1.5 py-0.5 rounded-xl bg-emerald-500 text-text font-mono text-[9px] animate-pulse">LIVE NODE</span>
            <span className="tracking-wide text-xs flex items-center gap-1 font-bold">Omnichannel Pipeline intelligence with Gemini Models</span>
          </div>

          <h2 className={`text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]${theme === 'dark' ? 'text-white' : 'text-slate-955'}`}>
            Supercharge sales outreach with <br />
            <span className="bg-clip-text text-transparent">
              Interactive LLM Intel.
            </span>
          </h2>

          <p className={`text-sm sm:text-base md:text-lg max-w-3xl mx-auto leading-relaxed${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Zyntra AI brings deep programmatic prospecting, live research indexing, multi-variable lead scoring, and automated omnichannel personalization triggers into a single integrated sales environment.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 max-w-md mx-auto">
            <button 
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-text font-bold text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a 
              href="#yield-calculator"
              className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest border text-center transition-all ${
                theme === 'dark' 
                  ? 'border-white/[0.08] hover:bg-white/[0.04] bg-slate-900/40 text-slate-200' 
                  : 'border-slate-200 hover:bg-slate-50 bg-white text-slate-700 shadow-xs'
              }`}
            >
              Simulate ROI Yield
            </a>
          </div>
        </div>

        {/* Hero Interactive App Mockup Frame */}
        <div className={`mt-24 w-full max-w-5.2xl rounded-3xl border ${
          theme === 'dark' ? 'bg-[#0f1016]/90 border-white/[0.05]' : 'bg-white border-slate-200/80 shadow-2xl'
        } shadow-2xl p-5 md:p-8 relative overflow-hidden group hover:border-[#3b82f6]/20 transition-all duration-500`}>
          {/* Accent decoration line */}
          <div className="absolute top-0 left-0 right-0 h-[3px]" />
          
          {/* Header tabs mimic */}
          <div className="flex items-center justify-between pb-4.5 mb-4.5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500/80 hover:scale-110 transition-transform" />
              <span className="w-3.5 h-3.5 rounded-full bg-amber-500/80 hover:scale-110 transition-transform" />
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/80 hover:scale-110 transition-transform" />
              <span className={`text-[11px] ml-2.5 font-mono${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>https://zyntra.ai/console-preview</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-extrabold border uppercase tracking-wider ${
              theme === 'dark' ? 'bg-slate-900 border-white/[0.05] text-blue-400' : 'bg-slate-50 border-slate-200 text-blue-600'
            }`}>
              <Bot className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>Multi-agent Gemini Enabled</span>
            </div>
          </div>

          {/* Dashboard Preview mockup representation - Render style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Block 1: Research Index */}
            <div className={`p-4.5 rounded-2xl border ${
              theme === 'dark' ? 'bg-black/30 border-white/[0.03]' : 'bg-slate-50/60 border-slate-200/60'
            } space-y-3.5 text-left`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-mono tracking-widest font-extrabold">Prospect intelligence</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className={`p-3.5 rounded-xl border text-left${theme === 'dark' ? 'bg-[#08090d] border-white/[0.04]' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/25 text-blue-400 flex items-center justify-center font-bold text-xs">SP</div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">Sarah Mitchell</h4>
                    <p className="text-[10px] text-slate-500 font-medium">Head of Talent • SaaS Platform</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Corporate Size</span>
                    <span className="font-bold text-text">140 employees</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Index Status</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">✔ Verified</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Validation Speed/Rate</span>
                  <span className="text-blue-400 font-mono font-bold">99.4% accuracy</span>
                </div>
                <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                  <div className="h-full rounded-full w-[94%]" />
                </div>
              </div>
            </div>

            {/* Block 2: Omnichannel Editor */}
            <div className={`p-4.5 rounded-2xl border ${
              theme === 'dark' ? 'bg-black/30 border-white/[0.03]' : 'bg-slate-50/60 border-slate-200/60'
            } md:col-span-2 space-y-3.5 text-left`}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-mono tracking-widest font-extrabold text-blue-400">Dynamic Campaign Personalization</span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">Active Channel: WhatsApp & SMTP</span>
              </div>
              
              <div className={`p-3.5 rounded-xl border text-left${theme === 'dark' ? 'bg-[#08090d] border-white/[0.04]' : 'bg-white border-slate-200 shadow-xs'}space-y-2.5`}>
                <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest border-b border-border pb-2">
                  <span className="text-emerald-400 border-b border-emerald-400 pb-1.5">WhatsApp Broadcast</span>
                  <span className="text-slate-500 pb-1.5">LinkedIn InMail</span>
                  <span className="text-slate-500 pb-1.5">SMTP Pro</span>
                </div>
                
                <p className="text-xs leading-relaxed text-text font-mono">
                  &quot;Hello <span className="text-purple-400 font-medium">Sarah</span>, analyzed your corporate recruitment index at <span className="text-blue-400 font-medium">GrowthCo UK</span>. Given your SaaS growth metrics, we compiled a tailored roadmap focusing on AI agency automation. Let&apos;s sync.&quot;
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-border text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Personalized with corporate dossier metadata.
                  </span>
                  <span className="text-blue-400 rounded-xl px-2 py-0.5 font-bold uppercase text-[9px]">100% Custom</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center text-[10px]">
                <div className="p-3 rounded-xl bg-white/[0.012] border border-border">
                  <span className="text-slate-500 block text-[9px] uppercase tracking-widest font-extrabold pb-0.5">AVERAGE OPEN RATE</span>
                  <span className="font-extrabold text-sm md:text-base">84.2%</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.012] border border-border">
                  <span className="text-slate-500 block text-[9px] uppercase tracking-widest font-extrabold pb-0.5">RESPONSE MULTIPLIER</span>
                  <span className="font-extrabold text-sm md:text-base">4.8x higher</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ROI Yield Simulator Section */}
      <section id="yield-calculator" className={`py-28 md:py-36 border-t${theme === 'dark' ? 'border-[#ffffff06] bg-[#06070a]' : 'border-slate-200/80 bg-slate-100/40'}`}>
        <div className="max-w-7xl mx-auto px-8 sm:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center">
          <div className="space-y-8 text-left">
            <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 font-mono">ROI Calculator Simulator</span>
            <h3 className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight${theme === 'dark' ? 'text-white' : 'text-slate-955'}`}>
              Model your pipeline yield.<br />Stop guessing outreach outcomes.
            </h3>
            <p className={`text-sm sm:text-base leading-relaxed${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Adjust lead prospecting volumes, standard conversions and deals value constraints to simulate and contrast standard generic lists versus Zyntra&apos;s hyper-targeted hyper-personalized enterprise outreach yield.
            </p>

            <div className="p-5 rounded-xl border bg-emerald-500/5 border-emerald-500/10 text-xs md:text-sm text-emerald-400 leading-relaxed flex items-center gap-4.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Award className="w-5.5 h-5.5" />
              </div>
              <span className="font-medium">By utilizing specialized seniority roles and precise organizational research indexation, conversion outcomes boost up to 340% over traditional blanket sequences.</span>
            </div>
          </div>

          {/* Calculator Interface Box */}
          <div className={`p-6 md:p-10 rounded-3xl border ${
            theme === 'dark' ? 'bg-[#0f1015]' : 'bg-white border-slate-200 shadow-xl'
          } shadow-2xl relative space-y-8`}>
            
            {/* Input Slider 1 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-extrabold uppercase tracking-widest text-text">
                <span>Leads Target Volume</span>
                <span className="text-blue-400 font-mono text-xs">{leadVolume} Qualified Leads</span>
              </div>
              <input 
                type="range"
                min="50"
                max="2500"
                step="50"
                value={leadVolume}
                onChange={(e) => setLeadVolume(parseInt(e.target.value))}
                className="w-full h-1.5 bg-surface rounded-xl appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Input Slider 2 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-extrabold uppercase tracking-widest text-text">
                <span>Custom Hyper-Personalized Reply %</span>
                <span className="text-emerald-400 font-mono text-xs">{conversionRate.toFixed(1)}% Base Target</span>
              </div>
              <input 
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={conversionRate}
                onChange={(e) => setConversionRate(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-surface rounded-xl appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Input Slider 3 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-extrabold uppercase tracking-widest text-text">
                <span>Average Value of ACV Deal</span>
                <span className="text-text font-mono text-xs">${dealValue.toLocaleString()}</span>
              </div>
              <input 
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={dealValue}
                onChange={(e) => setDealValue(parseInt(e.target.value))}
                className="w-full h-1.5 bg-surface rounded-xl appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Simulated Comparison Board */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="p-4 rounded-xl bg-white/[0.012] border border-border text-left">
                <span className="text-[10px] text-slate-500 block uppercase font-extrabold font-mono tracking-wider pb-0.5">Standard Replies (5%)</span>
                <span className="text-lg font-bold text-text">{traditionalReplies} replies</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-left">
                <span className="text-[10px] text-emerald-500 block uppercase font-extrabold font-mono tracking-wider pb-0.5 font-bold">Zyntra Replies (~{Math.round(conversionRate * 12)}%)</span>
                <span className="text-lg font-bold">{zyntraReplies} replies</span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl text-center flex flex-col items-center justify-center ${
              theme === 'dark' ? 'bg-[#06070a]' : 'bg-slate-50 shadow-inner'
            }`}>
              <span className="text-[10px] text-text uppercase font-extrabold tracking-widest font-mono">Estimated Revenue Added</span>
              <span className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-blue-500 font-mono mt-1 select-none">
                +${estimatedRevenue.toLocaleString()}
              </span>
              <p className="text-[10px] text-slate-500 font-medium leading-tight mt-1.5">Calculated with structured multi-agent scoring multipliers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Features Grid Section */}
      <section id="features" className="py-28 md:py-36 px-6 max-w-7xl mx-auto space-y-20">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs uppercase font-extrabold tracking-widest text-blue-500 font-mono">ENGINEERED SPECS</span>
          <h3 className={`text-4xl sm:text-5xl font-extrabold tracking-tight${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
            Built for enterprise pipeline stability &amp; volume control.
          </h3>
          <p className={`text-sm sm:text-base leading-relaxed${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            No tricks or gimmicks. Just a real-world B2B engine that researches target clients, validates signals, and runs reliable multi-channel campaigns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {/* Card 1 */}
          <div className={`p-8 rounded-3xl border ${
            theme === 'dark' ? 'bg-[#0e0f14] border-white/[0.04] hover:border-[#3b82f6]/20' : 'bg-white border-slate-200/80 hover:border-slate-300'
          } transition-all duration-350 space-y-5 text-left hover:scale-[1.01]`}>
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-extrabold">Deep Gemini Profiling</h4>
            <p className={`text-xs md:text-sm leading-relaxed${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Analyzes specific decision-makers. Scrape LinkedIn footprints, corporate roles, and custom industry tags to craft dynamic relevance vectors.
            </p>
          </div>

          {/* Card 2 */}
          <div className={`p-8 rounded-3xl border ${
            theme === 'dark' ? 'bg-[#0e0f14] border-white/[0.04] hover:border-[#3b82f6]/20' : 'bg-white border-slate-200/80 hover:border-slate-300'
          } transition-all duration-350 space-y-5 text-left hover:scale-[1.01]`}>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Network className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-extrabold">Omnichannel Sending</h4>
            <p className={`text-xs md:text-sm leading-relaxed${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Trigger highly tailored messages to WhatsApp, LinkedIn active feeds, or inbox. Keeps conversation loops synced across all systems.
            </p>
          </div>

          {/* Card 3 */}
          <div className={`p-8 rounded-3xl border ${
            theme === 'dark' ? 'bg-[#0e0f14] border-white/[0.04] hover:border-[#3b82f6]/20' : 'bg-white border-slate-200/80 hover:border-slate-300'
          } transition-all duration-350 space-y-5 text-left hover:scale-[1.01]`}>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-extrabold">Predictive Forecasting</h4>
            <p className={`text-xs md:text-sm leading-relaxed${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Interactive histogram views, segment breakdown analytics, and simulated cycle velocities let your team forecast yield precisely.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Prospecting Demo Block */}
      <section id="prospecting-demo" className={`py-28 md:py-36${theme === 'dark' ? 'bg-[#06070a]/40 border-y border-white/[0.04]' : 'bg-slate-100/40 border-y border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-8 sm:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 items-center">
          <div className="relative group rounded-xl overflow-hidden border border-border">
            {/* Visual illustration of the research index */}
            <div className={`p-6 space-y-4${theme === 'dark' ? 'bg-[#0f1015]' : 'bg-white'}`}>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider">LEAD DATABASE REAL-TIME LOG</span>
                <span className="px-2.5 py-1 rounded-xl bg-blue-500/20 text-blue-400 text-[10px] font-extrabold tracking-wide uppercase">Sync Enabled</span>
              </div>
              
              <div className="space-y-3.5">
                {[
                  { name: "Sarah Mitchell", role: "Head of Talent", comp: "GrowthCo UK", score: 85, badge: "Elite Tier" },
                  { name: "Aditi Sharma", role: "HR Director", comp: "TechCorp India", score: 70, badge: "High Tier" },
                  { name: "James Ochieng", role: "CEO", comp: "Nairobi Staffing", score: 90, badge: "VIP Board" },
                ].map((l, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${
                    theme === 'dark' ? 'bg-black/20 border-white/[0.03]' : 'bg-slate-50 border-slate-200/60'
                  } flex justify-between items-center`}>
                    <div className="text-left">
                      <h5 className="text-xs md:text-sm font-bold">{l.name}</h5>
                      <p className="text-[10px] md:text-xs text-slate-500 font-medium">{l.role} • {l.comp}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-400 text-[10px] font-extrabold uppercase tracking-wide">{l.badge}</span>
                      <div className="text-right">
                        <span className="text-xs text-emerald-400 font-mono font-bold block">{l.score}/90</span>
                        <span className="text-[8px] text-slate-500 block uppercase font-bold tracking-wider">Match Ratio</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8 text-left">
            <span className="text-xs uppercase font-extrabold tracking-widest font-mono">Dynamic Prospecting Intelligence</span>
            <h3 className={`text-4xl sm:text-5xl font-extrabold tracking-tight${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>
              Qualify before reaching out. Always.
            </h3>
            <p className={`text-sm sm:text-base leading-relaxed${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Standard campaigns spam everyone. Zyntra calculates a multi-factor score instantly based on job titles, active corporate domains, and verified social media links. Only spend resources on target accounts that warrant premium attention.
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={onLaunchApp}
                className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-text font-extrabold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <span>Process Your First List</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Accordion Section */}
      <section id="faq" className="py-28 md:py-36 px-6 max-w-4xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <span className="text-xs uppercase font-extrabold tracking-widest font-mono">FAQS ANSWERED</span>
          <h3 className={`text-4xl font-extrabold tracking-tight${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-5">
          {faqs.map((f, i) => (
            <div 
              key={i} 
              className={`p-6 md:p-8 rounded-2xl border transition-all ${
                theme === 'dark' ? 'bg-[#0e0f14] border-white/[0.04]' : 'bg-white border-slate-200/80 shadow-xs'
              }`}
            >
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex justify-between items-center text-left font-bold text-sm md:text-base cursor-pointer"
              >
                <span>{f.q}</span>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                     initial={{ height: 0, opacity: 0, marginTop: 0 }}
                     animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                     exit={{ height: 0, opacity: 0, marginTop: 0 }}
                     transition={{ duration: 0.2 }}
                     className="overflow-hidden"
                  >
                    <p className={`text-xs md:text-sm leading-relaxed border-t border-border pt-4${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
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
      <footer className={`py-20 border-t${theme === 'dark' ? 'border-white/[0.04] bg-[#040508]' : 'border-slate-200 bg-slate-50'}`}>
        <div className="max-w-7xl mx-auto px-8 sm:px-12 text-center space-y-16">
          {/* Action Call */}
          <div className={`p-10 md:p-16 rounded-[40px] bg-gradient-to-br from-blue-950/40 via-slate-900 to-[#040508] border ${
            theme === 'dark' ? 'border-white/[0.04]' : 'border-slate-250 shadow-lg'
          } space-y-8 max-w-4xl mx-auto text-center relative overflow-hidden shadow-2xl`}>
            
            <div className="space-y-4 z-10 relative">
              <h4 className="text-3xl md:text-5xl font-extrabold text-text tracking-tight">
                Ready to accelerate your B2B pipelines?
              </h4>
              <p className="text-xs md:text-sm text-text max-w-xl mx-auto leading-relaxed font-medium">
                Connect your campaigns, configure target decision factors, and trigger beautiful personalization streams across three channels today.
              </p>
            </div>

            <div className="flex justify-center z-10 relative pt-2">
              <button 
                onClick={onLaunchApp}
                className="px-10 py-4.5 rounded-xl hover:opacity-90 text-text font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02]"
              >
                <span>Launch Enterprise Console</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Core Footer Lines */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 border-t border-border text-[10.5px] uppercase tracking-wider font-extrabold text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600/10 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <span className="font-mono">ZYNTRA.AI INC. © 2026. All Rights Reserved.</span>
            </div>

            <div className="flex items-center gap-8">
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
