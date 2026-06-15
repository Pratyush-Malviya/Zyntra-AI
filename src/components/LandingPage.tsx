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
    <div >
      {/* Structural Metadata for SEO Bots */}
      <h1 >Zyntra AI - Next Generation Omnichannel Sales Prospecting &amp; High-Conversion Outreach Platform</h1>
      
      {/* 1. Header/Navigation Bar */}
      <header >
        <div >
          <div >
            <div >
              <Zap  />
            </div>
            <span >
              ZYNTRA<span >.AI</span>
            </span>
          </div>

          {/* Nav Items */}
          <nav >
            <a href="#features" >Features</a>
            <a href="#prospecting-demo" >Intelligence Hub</a>
            <a href="#yield-calculator" >ROI Simulator</a>
            <a href="#faq" >Faq</a>
          </nav>

          <div >
            {/* Theme Toggle */}
            {!isMobileDevice && (
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                
              >
                {theme === 'dark' ? (
                  <span >☀️ Light</span>
                ) : (
                  <span >🌙 Dark</span>
                )}
              </button>
            )}

            <button 
              onClick={onLaunchApp}
              
            >
              <span>{isAuthenticated ? 'Go to Console' : 'Launch Console'}</span>
              <ArrowRight  />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section >
        {/* Subtle background mesh */}
        <div  />

        <div >
          <div >
            <span >LIVE NODE</span>
            <span >Omnichannel Pipeline intelligence with Gemini Models</span>
          </div>

          <h2 >
            Supercharge sales outreach with <br />
            <span >
              Interactive LLM Intel.
            </span>
          </h2>

          <p >
            Zyntra AI brings deep programmatic prospecting, live research indexing, multi-variable lead scoring, and automated omnichannel personalization triggers into a single integrated sales environment.
          </p>

          <div >
            <button 
              onClick={onLaunchApp}
              
            >
              <span>Get Started Now</span>
              <ArrowRight  />
            </button>
            <a 
              href="#yield-calculator"
              
            >
              Simulate ROI Yield
            </a>
          </div>
        </div>

        {/* Hero Interactive App Mockup Frame */}
        <div >
          {/* Accent decoration line */}
          <div  />
          
          {/* Header tabs mimic */}
          <div >
            <div >
              <span  />
              <span  />
              <span  />
              <span >https://zyntra.ai/console-preview</span>
            </div>
            <div >
              <Bot  />
              <span>Multi-agent Gemini Enabled</span>
            </div>
          </div>

          {/* Dashboard Preview mockup representation - Render style */}
          <div >
            {/* Block 1: Research Index */}
            <div >
              <div >
                <span >Prospect intelligence</span>
                <span  />
              </div>
              <div >
                <div >
                  <div >SP</div>
                  <div>
                    <h4 >Sarah Mitchell</h4>
                    <p >Head of Talent • SaaS Platform</p>
                  </div>
                </div>
                <div >
                  <div >
                    <span>Corporate Size</span>
                    <span >140 employees</span>
                  </div>
                  <div >
                    <span>Index Status</span>
                    <span >✔ Verified</span>
                  </div>
                </div>
              </div>

              <div >
                <div >
                  <span >Validation Speed/Rate</span>
                  <span >99.4% accuracy</span>
                </div>
                <div >
                  <div  />
                </div>
              </div>
            </div>

            {/* Block 2: Omnichannel Editor */}
            <div >
              <div >
                <span >Dynamic Campaign Personalization</span>
                <span >Active Channel: WhatsApp & SMTP</span>
              </div>
              
              <div >
                <div >
                  <span >WhatsApp Broadcast</span>
                  <span >LinkedIn InMail</span>
                  <span >SMTP Pro</span>
                </div>
                
                <p >
                  &quot;Hello <span >Sarah</span>, analyzed your corporate recruitment index at <span >GrowthCo UK</span>. Given your SaaS growth metrics, we compiled a tailored roadmap focusing on AI agency automation. Let&apos;s sync.&quot;
                </p>

                <div >
                  <span >
                    <Sparkles  /> Personalized with corporate dossier metadata.
                  </span>
                  <span >100% Custom</span>
                </div>
              </div>

              <div >
                <div >
                  <span >AVERAGE OPEN RATE</span>
                  <span >84.2%</span>
                </div>
                <div >
                  <span >RESPONSE MULTIPLIER</span>
                  <span >4.8x higher</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ROI Yield Simulator Section */}
      <section id="yield-calculator" >
        <div >
          <div >
            <span >ROI Calculator Simulator</span>
            <h3 >
              Model your pipeline yield.<br />Stop guessing outreach outcomes.
            </h3>
            <p >
              Adjust lead prospecting volumes, standard conversions and deals value constraints to simulate and contrast standard generic lists versus Zyntra&apos;s hyper-targeted hyper-personalized enterprise outreach yield.
            </p>

            <div >
              <div >
                <Award  />
              </div>
              <span >By utilizing specialized seniority roles and precise organizational research indexation, conversion outcomes boost up to 340% over traditional blanket sequences.</span>
            </div>
          </div>

          {/* Calculator Interface Box */}
          <div >
            
            {/* Input Slider 1 */}
            <div >
              <div >
                <span>Leads Target Volume</span>
                <span >{leadVolume} Qualified Leads</span>
              </div>
              <input 
                type="range"
                min="50"
                max="2500"
                step="50"
                value={leadVolume}
                onChange={(e) => setLeadVolume(parseInt(e.target.value))}
                
              />
            </div>

            {/* Input Slider 2 */}
            <div >
              <div >
                <span>Custom Hyper-Personalized Reply %</span>
                <span >{conversionRate.toFixed(1)}% Base Target</span>
              </div>
              <input 
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={conversionRate}
                onChange={(e) => setConversionRate(parseFloat(e.target.value))}
                
              />
            </div>

            {/* Input Slider 3 */}
            <div >
              <div >
                <span>Average Value of ACV Deal</span>
                <span >${dealValue.toLocaleString()}</span>
              </div>
              <input 
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={dealValue}
                onChange={(e) => setDealValue(parseInt(e.target.value))}
                
              />
            </div>

            {/* Simulated Comparison Board */}
            <div >
              <div >
                <span >Standard Replies (5%)</span>
                <span >{traditionalReplies} replies</span>
              </div>

              <div >
                <span >Zyntra Replies (~{Math.round(conversionRate * 12)}%)</span>
                <span >{zyntraReplies} replies</span>
              </div>
            </div>

            <div >
              <span >Estimated Revenue Added</span>
              <span >
                +${estimatedRevenue.toLocaleString()}
              </span>
              <p >Calculated with structured multi-agent scoring multipliers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Features Grid Section */}
      <section id="features" >
        <div >
          <span >ENGINEERED SPECS</span>
          <h3 >
            Built for enterprise pipeline stability &amp; volume control.
          </h3>
          <p >
            No tricks or gimmicks. Just a real-world B2B engine that researches target clients, validates signals, and runs reliable multi-channel campaigns.
          </p>
        </div>

        <div >
          {/* Card 1 */}
          <div >
            <div >
              <Bot  />
            </div>
            <h4 >Deep Gemini Profiling</h4>
            <p >
              Analyzes specific decision-makers. Scrape LinkedIn footprints, corporate roles, and custom industry tags to craft dynamic relevance vectors.
            </p>
          </div>

          {/* Card 2 */}
          <div >
            <div >
              <Network  />
            </div>
            <h4 >Omnichannel Sending</h4>
            <p >
              Trigger highly tailored messages to WhatsApp, LinkedIn active feeds, or inbox. Keeps conversation loops synced across all systems.
            </p>
          </div>

          {/* Card 3 */}
          <div >
            <div >
              <BarChart3  />
            </div>
            <h4 >Predictive Forecasting</h4>
            <p >
              Interactive histogram views, segment breakdown analytics, and simulated cycle velocities let your team forecast yield precisely.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Prospecting Demo Block */}
      <section id="prospecting-demo" >
        <div >
          <div >
            {/* Visual illustration of the research index */}
            <div >
              <div >
                <span >LEAD DATABASE REAL-TIME LOG</span>
                <span >Sync Enabled</span>
              </div>
              
              <div >
                {[
                  { name: "Sarah Mitchell", role: "Head of Talent", comp: "GrowthCo UK", score: 85, badge: "Elite Tier" },
                  { name: "Aditi Sharma", role: "HR Director", comp: "TechCorp India", score: 70, badge: "High Tier" },
                  { name: "James Ochieng", role: "CEO", comp: "Nairobi Staffing", score: 90, badge: "VIP Board" },
                ].map((l, i) => (
                  <div key={i} >
                    <div >
                      <h5 >{l.name}</h5>
                      <p >{l.role} • {l.comp}</p>
                    </div>
                    <div >
                      <span >{l.badge}</span>
                      <div >
                        <span >{l.score}/90</span>
                        <span >Match Ratio</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div >
            <span >Dynamic Prospecting Intelligence</span>
            <h3 >
              Qualify before reaching out. Always.
            </h3>
            <p >
              Standard campaigns spam everyone. Zyntra calculates a multi-factor score instantly based on job titles, active corporate domains, and verified social media links. Only spend resources on target accounts that warrant premium attention.
            </p>
            
            <div >
              <button 
                onClick={onLaunchApp}
                
              >
                <span>Process Your First List</span>
                <ChevronRight  />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Accordion Section */}
      <section id="faq" >
        <div >
          <span >FAQS ANSWERED</span>
          <h3 >
            Frequently Asked Questions
          </h3>
        </div>

        <div >
          {faqs.map((f, i) => (
            <div 
              key={i} 
              
            >
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                
              >
                <span>{f.q}</span>
                <ChevronDown  />
              </button>
              
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                     initial={{ height: 0, opacity: 0, marginTop: 0 }}
                     animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                     exit={{ height: 0, opacity: 0, marginTop: 0 }}
                     transition={{ duration: 0.2 }}
                     
                  >
                    <p >
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
      <footer >
        <div >
          {/* Action Call */}
          <div >
            
            <div >
              <h4 >
                Ready to accelerate your B2B pipelines?
              </h4>
              <p >
                Connect your campaigns, configure target decision factors, and trigger beautiful personalization streams across three channels today.
              </p>
            </div>

            <div >
              <button 
                onClick={onLaunchApp}
                
              >
                <span>Launch Enterprise Console</span>
                <ArrowRight  />
              </button>
            </div>
          </div>

          {/* Core Footer Lines */}
          <div >
            <div >
              <div >
                <Zap  />
              </div>
              <span >ZYNTRA.AI INC. © 2026. All Rights Reserved.</span>
            </div>

            <div >
              <a href="#" >Privacy Policy</a>
              <a href="#" >Terms of Use</a>
              <a href="#" >Enterprise SLA</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
