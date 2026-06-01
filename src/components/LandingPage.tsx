import React, { useState } from 'react';
import { 
  Zap, 
  Bot, 
  ArrowRight, 
  BarChart3, 
  Network, 
  ChevronDown,
  Award,
  AlertTriangle,
  Database,
  Crosshair,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#090a0f] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 font-sans antialiased overflow-x-hidden selection:bg-brand/30`}>
      {/* Structural Metadata for SEO Bots */}
      <h1 className="sr-only">Zyntra AI - The Antidote to the Broken B2B Sales Process</h1>
      
      {/* 1. Header/Navigation Bar */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b ${theme === 'dark' ? 'border-white/[0.05] bg-[#090a0f]/80' : 'border-slate-200 bg-white/80'} transition-all`}>
        <div className="w-full px-6 md:px-12 lg:px-16 h-20 flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand-alt rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-xl font-mono">
              ZYNTRA<span className="text-brand">.AI</span>
            </span>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <a href="#pain-points" className={`hover:text-brand transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded px-2 py-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>The Problem</a>
            <a href="#prospecting-demo" className={`hover:text-brand transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded px-2 py-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Intelligence Hub</a>
            <a href="#yield-calculator" className={`hover:text-brand transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded px-2 py-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>ROI Simulator</a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            {!isMobileDevice && (
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl cursor-pointer transition-all duration-200 ease-out border active:scale-95 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                  theme === 'dark' 
                    ? 'bg-slate-900 border-white/[0.05] text-amber-400 hover:bg-slate-800' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {theme === 'dark' ? <span className="text-[10px] font-bold tracking-widest uppercase">Light</span> : <span className="text-[10px] font-bold tracking-widest uppercase">Dark</span>}
              </button>
            )}

            <button 
              onClick={onLaunchApp}
              aria-label="Launch Console"
              className="min-h-[44px] px-6 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-brand to-brand-alt hover:opacity-90 text-white shadow-xl shadow-brand/20 cursor-pointer flex items-center gap-2 transition-all duration-200 ease-out active:scale-95 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <span>{isAuthenticated ? 'Go to Console' : 'Launch Console'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* 2. Hero Section */}
        <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 px-6 md:px-12 lg:px-16 w-full flex flex-col items-center">
          {/* Subtle background mesh */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-gradient-to-b from-brand/10 to-transparent rounded-full blur-[100px] pointer-events-none" />

          <div className="text-center max-w-5xl space-y-10 z-10 relative">
            <div className={`inline-flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
              theme === 'dark' 
                ? 'bg-slate-900/80 border-white/[0.05] text-brand-alt' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <span className="px-2 py-0.5 rounded-full bg-brand text-white font-mono text-[10px] uppercase tracking-widest animate-pulse">LIVE</span>
              <span>The End of the Sales "Franken-Stack"</span>
            </div>

            <h2 className={`text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Stop guessing.<br />
              <span className="bg-gradient-to-r from-brand via-brand-alt to-emerald-400 bg-clip-text text-transparent">Start closing.</span>
            </h2>

            <p className={`text-lg md:text-2xl max-w-3xl mx-auto leading-relaxed font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Zyntra is the first AI-native CRM that kills manual data entry, auto-researches every lead, and writes hyper-personalized outreach—all in one unified workspace.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={onLaunchApp}
                className="min-h-[56px] w-full sm:w-auto px-8 rounded-2xl bg-brand hover:opacity-90 text-white font-extrabold text-base tracking-tight shadow-2xl shadow-brand/25 transition-all duration-200 ease-out active:scale-95 focus-visible:ring-4 focus-visible:ring-brand/50 focus-visible:outline-none flex items-center justify-center gap-2"
              >
                <span>Deploy Zyntra Free</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a 
                href="#yield-calculator"
                className={`min-h-[56px] w-full sm:w-auto px-8 rounded-2xl font-extrabold text-base tracking-tight border flex items-center justify-center transition-all duration-200 ease-out active:scale-95 focus-visible:ring-4 focus-visible:ring-slate-500/50 focus-visible:outline-none ${
                  theme === 'dark' 
                    ? 'border-white/[0.1] hover:bg-white/5 bg-slate-900/60 text-slate-200' 
                    : 'border-slate-300 hover:bg-slate-100 bg-white text-slate-700 shadow-sm'
                }`}
              >
                Simulate Your ROI
              </a>
            </div>
          </div>
        </section>

        {/* 3. Anchored Pain Points Section */}
        <section id="pain-points" className={`py-24 md:py-32 px-6 md:px-12 lg:px-16 w-full border-t ${theme === 'dark' ? 'border-white/[0.02] bg-[#0a0b10]' : 'border-slate-100 bg-white'}`}>
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-6 max-w-3xl mx-auto">
              <span className="text-xs uppercase font-extrabold tracking-widest text-rose-500">The B2B Sales Crisis</span>
              <h3 className={`text-4xl md:text-5xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Why your reps are failing to hit quota.
              </h3>
              <p className={`text-lg leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Modern sales teams are paralyzed by administrative bloat and decaying data. Zyntra targets and destroys the four major bottlenecks killing your pipeline.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* Pain Point 1 */}
              <div className={`p-8 rounded-3xl border transition-colors duration-300 ${theme === 'dark' ? 'bg-[#12131a] border-white/[0.05] hover:border-brand/30' : 'bg-slate-50 border-slate-200 hover:border-brand/30'}`}>
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-6">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-black mb-3">The "Franken-Stack"</h4>
                <p className={`text-base leading-relaxed mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Your team is duct-taping together a CRM, an email sequencer, a dialer, and a data scraper. Context is lost, syncs break, and reps waste 2 hours a day just switching tabs.
                </p>
                <div className={`p-4 rounded-2xl text-sm font-semibold border ${theme === 'dark' ? 'bg-brand/10 border-brand/20 text-brand-alt' : 'bg-brand/5 border-brand/10 text-brand'}`}>
                  <span className="block text-[10px] uppercase tracking-widest opacity-80 mb-1">The Zyntra Solution</span>
                  Natively integrated. One workspace for prospecting, multi-channel outreach, and pipeline management. Zero tab switching.
                </div>
              </div>

              {/* Pain Point 2 */}
              <div className={`p-8 rounded-3xl border transition-colors duration-300 ${theme === 'dark' ? 'bg-[#12131a] border-white/[0.05] hover:border-brand/30' : 'bg-slate-50 border-slate-200 hover:border-brand/30'}`}>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-6">
                  <Database className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-black mb-3">Dirty, Decaying CRM Data</h4>
                <p className={`text-base leading-relaxed mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  30% of B2B contact data decays every year. Reps are emailing people who left the company 6 months ago, tanking your domain reputation and wasting cycles.
                </p>
                <div className={`p-4 rounded-2xl text-sm font-semibold border ${theme === 'dark' ? 'bg-brand/10 border-brand/20 text-brand-alt' : 'bg-brand/5 border-brand/10 text-brand'}`}>
                  <span className="block text-[10px] uppercase tracking-widest opacity-80 mb-1">The Zyntra Solution</span>
                  Real-time AI Auto-Enrichment and Data Health Decay Monitor. Zyntra scrubs, verifies, and updates lead profiles continuously in the background.
                </div>
              </div>

              {/* Pain Point 3 */}
              <div className={`p-8 rounded-3xl border transition-colors duration-300 ${theme === 'dark' ? 'bg-[#12131a] border-white/[0.05] hover:border-brand/30' : 'bg-slate-50 border-slate-200 hover:border-brand/30'}`}>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
                  <Crosshair className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-black mb-3">Low-Conversion "Spray and Pray"</h4>
                <p className={`text-base leading-relaxed mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Generic {"Hi {{first_name}}"} templates get ignored by decision makers. But manually researching an account to write one highly-personalized email takes 15 minutes per lead.
                </p>
                <div className={`p-4 rounded-2xl text-sm font-semibold border ${theme === 'dark' ? 'bg-brand/10 border-brand/20 text-brand-alt' : 'bg-brand/5 border-brand/10 text-brand'}`}>
                  <span className="block text-[10px] uppercase tracking-widest opacity-80 mb-1">The Zyntra Solution</span>
                  Gemini LLM agents scan public corporate footprints to auto-generate hyper-personalized omnichannel outreach at scale, in seconds.
                </div>
              </div>

              {/* Pain Point 4 */}
              <div className={`p-8 rounded-3xl border transition-colors duration-300 ${theme === 'dark' ? 'bg-[#12131a] border-white/[0.05] hover:border-brand/30' : 'bg-slate-50 border-slate-200 hover:border-brand/30'}`}>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
                  <TrendingDown className="w-7 h-7" />
                </div>
                <h4 className="text-2xl font-black mb-3">Blind Forecasting & "Happy Ears"</h4>
                <p className={`text-base leading-relaxed mb-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Sales managers are forced to forecast revenue based on rep "gut feelings". Deals sit in "Negotiation" for 90 days with no real activity, skewing pipeline visibility.
                </p>
                <div className={`p-4 rounded-2xl text-sm font-semibold border ${theme === 'dark' ? 'bg-brand/10 border-brand/20 text-brand-alt' : 'bg-brand/5 border-brand/10 text-brand'}`}>
                  <span className="block text-[10px] uppercase tracking-widest opacity-80 mb-1">The Zyntra Solution</span>
                  Predictive Revenue Intelligence and AI Deal Scoring. Zyntra calculates deal health based on actual engagement signals, stripping emotion from the forecast.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. ROI Yield Simulator Section */}
        <section id="yield-calculator" className={`py-24 md:py-32 border-t ${theme === 'dark' ? 'border-white/[0.02] bg-slate-950/40' : 'border-slate-200 bg-slate-100/50'}`}>
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            <div className="space-y-8 lg:col-span-5">
              <span className="text-xs uppercase font-extrabold tracking-widest text-brand-alt">Yield Simulator</span>
              <h3 className={`text-4xl md:text-5xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Calculate the impact of hyper-personalization.
              </h3>
              <p className={`text-lg leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Adjust the volume, conversion, and ACV sliders to model the revenue difference between standard generic lists and Zyntra's AI-targeted outreach.
              </p>

              <div className="p-5 rounded-2xl border bg-brand/5 border-brand/20 text-sm text-brand-alt leading-relaxed flex items-start gap-4 shadow-sm">
                <Award className="w-6 h-6 shrink-0 mt-0.5" />
                <span className="font-medium">By utilizing specialized seniority roles and precise organizational research indexation, conversion outcomes boost up to 340% over traditional blanket sequences.</span>
              </div>
            </div>

            {/* Calculator Interface Box */}
            <div className={`lg:col-span-7 p-8 md:p-12 rounded-3xl border ${
              theme === 'dark' ? 'bg-[#12131a] border-white/[0.06] shadow-2xl shadow-brand/5' : 'bg-white border-slate-200 shadow-2xl shadow-slate-200/50'
            } relative space-y-10`}>
              
              {/* Input Slider 1 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>Leads Target Volume</span>
                  <span className="text-brand font-mono bg-brand/10 px-3 py-1 rounded-full">{leadVolume} Qualified Leads</span>
                </div>
                <input 
                  type="range"
                  min="50"
                  max="2500"
                  step="50"
                  value={leadVolume}
                  onChange={(e) => setLeadVolume(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand"
                  aria-label="Leads Target Volume"
                />
              </div>

              {/* Input Slider 2 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>Zyntra Hyper-Personalized Reply %</span>
                  <span className="text-brand-alt font-mono bg-brand-alt/10 px-3 py-1 rounded-full">{conversionRate.toFixed(1)}% Base Target</span>
                </div>
                <input 
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-alt"
                  aria-label="Zyntra Hyper-Personalized Reply %"
                />
              </div>

              {/* Input Slider 3 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                  <span>Average Deal Value (ACV)</span>
                  <span className="text-emerald-500 font-mono bg-emerald-500/10 px-3 py-1 rounded-full">${dealValue.toLocaleString()}</span>
                </div>
                <input 
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={dealValue}
                  onChange={(e) => setDealValue(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  aria-label="Average Deal Value"
                />
              </div>

              {/* Simulated Comparison Board */}
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 dark:border-white/[0.05]">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.03]">
                  <span className="text-xs text-slate-500 block uppercase font-extrabold tracking-wider mb-2">Standard (5%)</span>
                  <span className="text-2xl font-black text-slate-700 dark:text-slate-400">{traditionalReplies} replies</span>
                </div>

                <div className="p-4 rounded-2xl bg-brand/5 border border-brand/20">
                  <span className="text-xs text-brand block uppercase font-extrabold tracking-wider mb-2">Zyntra (~{Math.round(conversionRate * 12)}%)</span>
                  <span className="text-2xl font-black text-brand-alt">{zyntraReplies} replies</span>
                </div>
              </div>

              <div className={`p-6 rounded-2xl text-center flex flex-col items-center justify-center border shadow-sm ${
                theme === 'dark' ? 'bg-slate-900/80 border-white/[0.05]' : 'bg-white border-slate-200'
              }`}>
                <span className="text-xs text-slate-500 uppercase font-extrabold tracking-widest mb-2">Estimated Revenue Added</span>
                <span className="text-4xl md:text-5xl font-black text-brand font-mono">
                  +${estimatedRevenue.toLocaleString()}
                </span>
                <p className="text-xs text-slate-500 leading-tight mt-3 font-medium">Calculated assuming a conservative 20% close rate on high-intent replies.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. FAQ Accordion Section */}
        <section id="faq" className="py-24 md:py-32 px-6 md:px-12 lg:px-16 max-w-4xl w-full mx-auto space-y-16">
          <div className="text-center space-y-6">
            <span className="text-xs uppercase font-extrabold tracking-widest text-brand-alt">CLEARING THE AIR</span>
            <h3 className={`text-4xl md:text-5xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div 
                key={i} 
                className={`p-6 rounded-3xl border transition-all duration-300 ${
                  theme === 'dark' ? 'bg-[#12131a] border-white/[0.05] hover:border-brand/30' : 'bg-white border-slate-200 hover:border-brand/30 hover:shadow-md'
                }`}
              >
                <button 
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full flex justify-between items-center text-left min-h-[44px] cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded-xl"
                >
                  <span className="font-bold text-base md:text-lg pr-4">{f.q}</span>
                  <ChevronDown className={`w-6 h-6 text-slate-400 transition-transform duration-300 shrink-0 ${openFaq === i ? 'rotate-180 text-brand' : ''}`} />
                </button>
                
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className={`text-sm md:text-base leading-relaxed pt-4 mt-2 border-t ${theme === 'dark' ? 'border-white/[0.05] text-slate-400' : 'border-slate-100 text-slate-600'}`}>
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* 6. Action Block & Footer */}
      <footer className={`py-24 md:py-32 border-t ${theme === 'dark' ? 'border-white/[0.02] bg-[#090a0f]' : 'border-slate-200 bg-slate-50'}`}>
        <div className="w-full px-6 md:px-12 lg:px-16 text-center space-y-16 max-w-7xl mx-auto">
          {/* Action Call */}
          <div className={`p-12 md:p-24 rounded-[48px] bg-gradient-to-br from-brand/20 via-slate-900 to-[#090a0f] border ${
            theme === 'dark' ? 'border-white/[0.05]' : 'border-slate-800'
          } space-y-10 text-center relative overflow-hidden shadow-2xl`}>
            
            <div className="space-y-6 z-10 relative">
              <h4 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                Ready to fix your broken pipeline?
              </h4>
              <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
                Stop duct-taping tools together. Consolidate your stack, automate your research, and let AI generate pipeline for you today.
              </p>
            </div>

            <div className="flex justify-center z-10 relative pt-4">
              <button 
                onClick={onLaunchApp}
                aria-label="Launch Zyntra Console"
                className="min-h-[56px] px-10 rounded-2xl bg-gradient-to-r from-brand to-brand-alt hover:opacity-90 text-white font-extrabold text-base tracking-tight transition-all duration-200 ease-out active:scale-95 focus-visible:ring-4 focus-visible:ring-brand/50 focus-visible:outline-none flex items-center justify-center gap-2 shadow-2xl shadow-brand/20"
              >
                <span>Launch Enterprise Console Now</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Core Footer Lines */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-16 border-t border-slate-200 dark:border-white/[0.05] text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-brand" />
              </div>
              <span className="font-mono tracking-wide">ZYNTRA.AI INC. © 2026. All Rights Reserved.</span>
            </div>

            <div className="flex items-center gap-8">
              <a href="#" className="hover:text-brand transition-colors focus-visible:outline-brand px-2 py-1 rounded">Privacy Policy</a>
              <a href="#" className="hover:text-brand transition-colors focus-visible:outline-brand px-2 py-1 rounded">Terms of Use</a>
              <a href="#" className="hover:text-brand transition-colors focus-visible:outline-brand px-2 py-1 rounded">Enterprise SLA</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
