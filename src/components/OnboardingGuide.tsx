import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Compass, 
  HelpCircle, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  EyeOff, 
  RotateCcw,
  BookOpen,
  Info
} from 'lucide-react';

export interface GuideStep {
  title: string;
  detail: string;
  targetHint?: string;
}

export interface FeatureGuide {
  id: string;
  featureName: string;
  category: string;
  tagline: string;
  description: string;
  steps: GuideStep[];
}

interface OnboardingGuideProps {
  activeView: string;
  superAdminTab?: string;
}

// Comprehensive registry of guides corresponding to active views and tabs
const GUIDES_REGISTRY: Record<string, FeatureGuide> = {
  'SUPER_ADMIN_dashboard': {
    id: 'SUPER_ADMIN_dashboard',
    featureName: 'Global Revenue Monitor',
    category: 'Superadmin Admin Desk',
    tagline: 'System Governance & Global Tenant Allocation',
    description: 'This is your centralized control panel reporting high-level operational statistics, seat reservations, and server loads across all connected sub-organizations.',
    steps: [
      {
        title: 'Enterprise Analytics Tiles',
        detail: 'Track total aggregate ARR, signed organizations, active outbound lists, and current client seats registered under the Zyntra core.',
        targetHint: 'Upper grid metrics cards'
      },
      {
        title: 'Billing & Provisioning',
        detail: 'Review recent transaction ledgers, active trial tiers, and pending licensing agreements.',
        targetHint: 'Financial overview lists'
      }
    ]
  },
  'SUPER_ADMIN_organizations': {
    id: 'SUPER_ADMIN_organizations',
    featureName: 'Tenant Management Suite',
    category: 'Superadmin Admin Desk',
    tagline: 'Multi-Tenant Allocation & Provisioning Controls',
    description: 'Provision and configure core business variables, access policies, and seat parameters for individual tenant organizations.',
    steps: [
      {
        title: 'Provision New Organizations',
        detail: 'Launch customized tenants. Give them custom logos, seat parameters, and localized configurations.',
        targetHint: 'The "Add Organization" card action button'
      },
      {
        title: 'Seat Allocation & License Control',
        detail: 'Edit active employee quotas, revoke system keys, or toggle enterprise privilege configurations.',
        targetHint: 'Organization directory table rows'
      }
    ]
  },
  'SUPER_ADMIN_employees_list': {
    id: 'SUPER_ADMIN_employees_list',
    featureName: 'Global Employee Registry',
    category: 'Superadmin Admin Desk',
    tagline: 'Global Identity & Permission Moderation',
    description: 'Audit and moderate active corporate users across all sub-organizations. Perfect for troubleshooting access credentials.',
    steps: [
      {
        title: 'Global Employee Profiles',
        detail: 'Check names, corporate email addresses, and specific roles (SDR, Manager, AE, Viewer) mapping to individual tenants.',
        targetHint: 'The central employee data table'
      },
      {
        title: 'Active Quotas Moderation',
        detail: 'Adjust user permissions, reset credentials, or synchronize identities with tenant databases.',
        targetHint: 'Action column buttons'
      }
    ]
  },
  'SUPER_ADMIN_llm_config': {
    id: 'SUPER_ADMIN_llm_config',
    featureName: 'Connected Gateways Telemetry',
    category: 'Superadmin Admin Desk',
    tagline: 'Active Routing & LLM Fallback Control',
    description: 'Audit live latency response curves, declare secret API keys, and run failover simulations under active request stress.',
    steps: [
      {
        title: 'Real-time Latency Curves',
        detail: 'Compare ping speeds in milliseconds across Gemini, NVIDIA NIM partners, and OpenAI nodes.',
        targetHint: 'The Recharts moving latency graph'
      },
      {
        title: 'Secret Key Management',
        detail: 'Configure your primary Google Gemini keys and alternative fallback NVIDIA credentials securely.',
        targetHint: 'Credentials formulation inputs'
      },
      {
        title: 'Superadmin Outage Simulator',
        detail: 'Simulate server faults or region outages at the push of a button to verify background fallback code.',
        targetHint: 'The dashed Simulation Engine section'
      }
    ]
  },
  'SUPER_ADMIN_enterprise_suite': {
    id: 'SUPER_ADMIN_enterprise_suite',
    featureName: 'Enterprise Engine Playgrounds',
    category: 'Superadmin Admin Desk',
    tagline: 'Core Integration Tests',
    description: 'A sandboxed environment designed to let technical administrators preview layout options, evaluate brand overrides, and audit compliance schemas.',
    steps: [
      {
        title: 'Sandbox Validation',
        detail: 'Test customized system components in high-fidelity mock environments before releasing configuration schemas.',
        targetHint: 'Component frame containers'
      }
    ]
  },
  'SUPER_ADMIN_BILLING': {
    id: 'SUPER_ADMIN_BILLING',
    featureName: 'Superadmin Billing Ledger',
    category: 'Superadmin Admin Desk',
    tagline: 'Multi-Tenant Commercial Tracking',
    description: 'Inspect overall cash captures, contract values, corporate invoice runs, and localized billing adjustments.',
    steps: [
      {
        title: 'Invoice Auditing',
        detail: 'Verify multi-license subscription transactions, compute tax structures, and inspect custom enterprise quotes.',
        targetHint: 'Primary transaction table'
      }
    ]
  },
  'ORG_DASHBOARD': {
    id: 'ORG_DASHBOARD',
    featureName: 'Workspace Control Center',
    category: 'Tenant Administration',
    tagline: 'Workspace Branding, Security & Subscriptions',
    description: 'Setup and moderate specific corporate configurations, invite regional users, configure white-label domains, and manage billing plans.',
    steps: [
      {
        title: 'Organizational Identity',
        detail: 'Synchronize corporate logos, custom email variables, and localization elements to align GTM dispatches.',
        targetHint: 'Organizational panel sidebar sub-tabs'
      },
      {
        title: 'Members Directory',
        detail: 'Invite and manage specific seats for SDRs, Managers, and Account Executives inside this dedicated division.',
        targetHint: 'The Org Members tab view'
      }
    ]
  },
  'OUTREACH': {
    id: 'OUTREACH',
    featureName: 'Campaign & Yield Orchestrator',
    category: 'Lead Engagement',
    tagline: 'Omnichannel Sequence Sequencing and ROI Estimators',
    description: 'Draft outreach sequences crossing SMTP, LinkedIn connection lists, and WhatsApp templates. Pre-calculate outcomes before launching.',
    steps: [
      {
        title: 'Sequence Yield Knobs',
        detail: 'Toggle real-time campaign performance parameters -- speed, inbox rotations, and warmup delays -- to estimate your ARR flow and pipeline yield.',
        targetHint: 'The interactive dials/gauges panel'
      },
      {
        title: 'Multi-Touch Sequence Tracks',
        detail: 'Configure sequential outreach triggers mapping touchpoint steps, delay offsets, and personalized templates.',
        targetHint: 'Sequential campaign steps builder'
      },
      {
        title: 'Leads CSV Database',
        detail: 'Upload standard client spreadsheets using the AI CSV validator or inspect target accounts awaiting campaign dispatch.',
        targetHint: 'The Leads manager board'
      }
    ]
  },
  'RESEARCH': {
    id: 'RESEARCH',
    featureName: 'Prospect Intel Sprint',
    category: 'Prospect Discovery',
    tagline: 'Active Crawler-Driven B2B Research',
    description: 'Conduct active, search-grounded analytical sprints on target domains. Sift public subdomains, identify structural challenges, and compile reports.',
    steps: [
      {
        title: 'Active Research Submission',
        detail: 'Input any domain (e.g., chevron.com) to initiate live query formulate filters searching official SEC briefs, technology trace signatures, and public directories.',
        targetHint: 'Search input field'
      },
      {
        title: 'Firmographic & Technology Estimates',
        detail: 'Read outlier-insulated headcount dimensions, sector product ARR metrics, and proven confidence levels for active technology applications.',
        targetHint: 'The central calibration summary'
      },
      {
        title: 'Executive PDF/DOC Exports',
        detail: 'Export formatted McKinsey-grade consulting research reports as Word `.doc` assets instantly.',
        targetHint: 'Download specification controls'
      }
    ]
  },
  'SDR_DAILY': {
    id: 'SDR_DAILY',
    featureName: 'SDR Daily Workstation',
    category: 'Lead Engagement',
    tagline: 'Actionable Contact Queues & Personalized Copywriting',
    description: 'An execution dashboard dedicated to helping SDRs review message queues, run real-time contextual personalizations, and dispatch campaigns.',
    steps: [
      {
        title: 'Pending Sequence Queue',
        detail: 'Inspect active outbound steps sorted by scheduled priority. Review dynamic messages compiled by the campaign engine.',
        targetHint: 'Pending activities contact card column'
      },
      {
        title: 'Interactive AI Customizer',
        detail: 'Fine-tune specific variable attributes, custom templates, or write localized custom follow-up strings.',
        targetHint: 'Copywriting detail overlay'
      }
    ]
  },
  'MGR_DASHBOARD': {
    id: 'MGR_DASHBOARD',
    featureName: 'Manager Governance Center',
    category: 'Outbound Moderation',
    tagline: 'Content Sign-Off & Buyer Conversation Simulator',
    description: 'Review pending SDR campaign queues, listen to recorded sales training simulators, and monitor predicted performance curves.',
    steps: [
      {
        title: 'Executive Approval Filter',
        detail: 'Approve or edit outbound messaging copy before campaigns are dispatched, protecting domain sender scores.',
        targetHint: 'SDR Approvals board'
      },
      {
        title: 'Interactive Sales Simulator',
        detail: 'Listen to recorded simulation calls from autonomous buyer agents to audit objections and test script conversions.',
        targetHint: 'The call simulator table'
      }
    ]
  },
  'AE_PIPELINE': {
    id: 'AE_PIPELINE',
    featureName: 'AE Opportunity Desk',
    category: 'Deal Acceleration',
    tagline: 'Prospect Briefs & Interactive Objection Copilots',
    description: 'Access consolidated company briefs aggregated by the discovery engine, and prompt an interactive chat copilot to prepare deal strategy sheets.',
    steps: [
      {
        title: 'Target Prospect Briefs',
        detail: 'Map high-intent contacts with complete structural pain-point reports, verified tech stacks, and personalized hook scripts.',
        targetHint: 'AE Accounts grid'
      },
      {
        title: 'Interactive Objection Copilot',
        detail: 'Chat with the built-in partner assistant. Request structured elevator pitches or prepare custom response scripts for target enterprise objections.',
        targetHint: 'AE Copilot chat box'
      }
    ]
  },
  'ANALYTICS': {
    id: 'ANALYTICS',
    featureName: 'Outbound ROI & Analytics',
    category: 'Performance Metrics',
    tagline: 'Lead Intent Metrics & Interactive Performance Funnels',
    description: 'Inspect lead density metrics distribution, run conversion timelines, and audit SDR throughput logs with descriptive charts.',
    steps: [
      {
        title: 'Lead Density curves',
        detail: 'Assess target prospect classifications sorted by Lead Intent scores and corporate seniority tiers.',
        targetHint: 'Recharts intent histogram'
      },
      {
        title: 'ROI Conversion Projections',
        detail: 'Trace campaign funnel throughput crossing open rates, meetings converted, and projected annual ARR bookings curves.',
        targetHint: 'Conversion analytics graphs'
      }
    ]
  },
  'SETTINGS': {
    id: 'SETTINGS',
    featureName: 'User Profile Settings',
    category: 'Personal Sandbox',
    tagline: 'SMTP credentials & personal definitions',
    description: 'Setup and test individual mail connectors, custom variables, and basic security credentials.',
    steps: [
      {
        title: 'SMTP Mail Configuration',
        detail: 'Map active send domains, test custom sender aliases, and declare personal signatures.',
        targetHint: 'Settings parameters list'
      }
    ]
  }
};

export function OnboardingGuide({ activeView, superAdminTab }: OnboardingGuideProps) {
  const [guide, setGuide] = useState<FeatureGuide | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dismissedGuides, setDismissedGuides] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [skipAll, setSkipAll] = useState(false);

  // Sync state with localStorage. Treats as empty initially for "new user" simulation
  useEffect(() => {
    try {
      const savedDismissed = localStorage.getItem('zyntra_dismissed_guides');
      const savedSkipAll = localStorage.getItem('zyntra_skip_all_guides');
      if (savedDismissed) {
        setDismissedGuides(JSON.parse(savedDismissed));
      }
      if (savedSkipAll) {
        setSkipAll(savedSkipAll === 'true');
      }
    } catch (e) {
      console.warn("Storage limits - continuing tour online");
    }
  }, []);

  // Compute corresponding feature guide ID
  useEffect(() => {
    let guideId = activeView;
    if (activeView === 'SUPER_ADMIN' && superAdminTab) {
      guideId = `SUPER_ADMIN_${superAdminTab}`;
    } else if (activeView.startsWith('ORG_') && activeView !== 'ORG_DASHBOARD') {
      // Map other sub-org tabs to ORG_DASHBOARD generalized tour to keep it tight
      guideId = 'ORG_DASHBOARD';
    }

    const requestedGuide = GUIDES_REGISTRY[guideId];
    if (requestedGuide) {
      setGuide(requestedGuide);
      setCurrentStepIndex(0);
      setIsCollapsed(false);
    } else {
      setGuide(null);
    }
  }, [activeView, superAdminTab]);

  // If skipped all or specific guide is dismissed, don't show the card automatically
  const shouldShowGuidance = guide && !skipAll && !dismissedGuides[guide.id];

  const handleNext = () => {
    if (!guide) return;
    if (currentStepIndex < guide.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Finished guide
      handleCompleteCurrent();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleCompleteCurrent = () => {
    if (!guide) return;
    const updated = { ...dismissedGuides, [guide.id]: true };
    setDismissedGuides(updated);
    try {
      localStorage.setItem('zyntra_dismissed_guides', JSON.stringify(updated));
    } catch (_) {}
  };

  const handleSkipCurrent = () => {
    handleCompleteCurrent();
  };

  const handleSkipAll = () => {
    setSkipAll(true);
    try {
      localStorage.setItem('zyntra_skip_all_guides', 'true');
    } catch (_) {}
  };

  const handleResetAll = () => {
    setDismissedGuides({});
    setSkipAll(false);
    setCurrentStepIndex(0);
    setIsCollapsed(false);
    try {
      localStorage.removeItem('zyntra_dismissed_guides');
      localStorage.removeItem('zyntra_skip_all_guides');
    } catch (_) {}
  };

  // Re-launch collapsed panel
  const handleReLaunch = () => {
    if (!guide) return;
    setIsCollapsed(false);
    setSkipAll(false);
    // Remove this from dismissed to show it again
    const updated = { ...dismissedGuides };
    delete updated[guide.id];
    setDismissedGuides(updated);
    setCurrentStepIndex(0);
  };

  // Render a collapsed badge/bubble at bottom-right if guide exists but is hidden/dismissed
  if (!shouldShowGuidance) {
    if (guide) {
      return (
        <div id="onboarding-relaunch-bubble" className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
          {/* Subtle indicator to relaunch or reset */}
          <button
            onClick={handleReLaunch}
            className="flex items-center gap-1.5 bg-[#12131a] hover:bg-zinc-900 border border-zinc-800 text-cyan-400 hover:text-cyan-300 font-bold text-[10px] px-3.5 py-2.5 rounded-full shadow-2xl transition-all cursor-pointer select-none group uppercase tracking-wider"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>Guide Co-Pilot</span>
          </button>
          
          <button
            onClick={handleResetAll}
            title="Reset All Feature Tours"
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-805 text-zinc-500 hover:text-zinc-300 rounded-full cursor-pointer shadow-xl transition-all select-none"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    return null;
  }

  const currentStep = guide.steps[currentStepIndex];

  return (
    <div 
      id="onboarding-guide-panel" 
      className={`fixed bottom-4 right-4 z-50 max-w-sm w-full bg-[#12131a] border border-cyan-500/35 rounded-3xl p-5 shadow-[0_8px_32px_rgba(6,182,212,0.12)] transition-all space-y-4`}
    >
      
      {/* Mini Top Banner */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <BookOpen className="w-4 h-4 animate-bounce" />
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-widest font-extrabold font-mono text-cyan-400/80 block">
              {guide.category}
            </span>
            <span className="text-xs font-black text-white font-mono uppercase tracking-wide">
              {guide.featureName}
            </span>
          </div>
        </div>
        
        {/* Actions bar */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleSkipCurrent}
            title="Dismiss current guide"
            className="p-1.5 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guide Content Area */}
      <div className="space-y-3.5 text-left">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 block tracking-tight font-sans italic">
            "{guide.tagline}"
          </span>
          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
            {guide.description}
          </p>
        </div>

        {/* Current Active Step Box */}
        <div className="bg-[#171923] border border-zinc-800 rounded-2xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-extrabold font-mono px-2 py-0.5 rounded-full uppercase tracking-wider">
              Tip {currentStepIndex + 1} of {guide.steps.length}
            </span>
            {currentStep.targetHint && (
              <span className="text-[8px] text-zinc-500 font-mono flex items-center gap-1">
                <Info className="w-3 h-3 text-zinc-500" />
                Target: {currentStep.targetHint}
              </span>
            )}
          </div>
          
          <h4 className="text-xs font-bold text-white uppercase tracking-wide">
            {currentStep.title}
          </h4>
          <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
            {currentStep.detail}
          </p>
        </div>
      </div>

      {/* Progress Circles Indicator */}
      <div className="flex justify-between items-center bg-[#171923]/40 border border-zinc-800/60 p-2.5 rounded-xl text-xs">
        <div className="flex gap-1">
          {guide.steps.map((_, idx) => (
            <div 
              key={idx} 
              className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentStepIndex ? 'bg-cyan-400 w-3' : 'bg-zinc-700'}`} 
            />
          ))}
        </div>
        
        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider font-mono">
          Co-Pilot active
        </span>
      </div>

      {/* Action Controller row */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          onClick={handleSkipAll}
          className="text-[10px] text-zinc-500 hover:text-rose-400 font-bold transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-transparent border-0"
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span>Skip All Guides</span>
        </button>

        <div className="flex gap-2">
          {currentStepIndex > 0 && (
            <button
              onClick={handlePrev}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={handleNext}
            className="px-3.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/35 text-cyan-400 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all uppercase tracking-wide"
          >
            <span>{currentStepIndex === guide.steps.length - 1 ? 'Got it!' : 'Next'}</span>
            <ChevronRight className="w-3 h-3 text-cyan-400" />
          </button>
        </div>
      </div>

    </div>
  );
}
