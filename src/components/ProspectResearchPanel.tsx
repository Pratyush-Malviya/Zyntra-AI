import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Sparkles, 
  Loader2, 
  Plus, 
  AlertCircle, 
  AlertTriangle,
  Calendar, 
  Globe, 
  CreditCard, 
  ExternalLink,
  Clipboard,
  Check,
  ArrowRight,
  Database,
  Cpu,
  Target,
  FileText,
  UserCheck,
  ShieldAlert,
  Download,
  PlusCircle,
  TrendingUp,
  History,
  Trash2,
  Maximize2,
  Minimize2,
  Linkedin,
  Twitter,
  Facebook,
  Youtube,
  Phone,
  Mail,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { generateProspectResearch, ProspectResearchReport } from '../services/aiService';
import { db, Timestamp } from '../firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Pre-defined enterprise examples matching customer success playbooks
const ALL_PRESETS_POOL: { name: string; url: string }[] = [
  { name: 'Tesla', url: 'tesla.com' },
  { name: 'Salesforce', url: 'salesforce.com' },
  { name: 'Stripe', url: 'stripe.com' },
  { name: 'Shopify', url: 'shopify.com' },
  { name: 'Himadri Speciality', url: 'Himadri Speciality Chemical' },
  { name: 'SpaceX', url: 'spacex.com' },
  { name: 'Nvidia', url: 'nvidia.com' },
  { name: 'Spotify', url: 'spotify.com' },
  { name: 'Airbnb', url: 'airbnb.com' },
  { name: 'Uber', url: 'uber.com' },
  { name: 'Netflix', url: 'netflix.com' },
  { name: 'Nike', url: 'nike.com' },
  { name: 'Apple', url: 'apple.com' },
  { name: 'Microsoft', url: 'microsoft.com' },
  { name: 'Tata Motors', url: 'tatamotors.com' },
  { name: 'Sony', url: 'sony.com' },
  { name: 'Adobe', url: 'adobe.com' },
  { name: 'Slack', url: 'slack.com' },
  { name: 'Zoom', url: 'zoom.us' },
  { name: 'Figma', url: 'figma.com' }
];

export const sanitizeResearchReport = (report: any): ProspectResearchReport => {
  if (!report) return {} as any;
  const info = report?.companyInfo || {};
  return {
    ...report,
    companyInfo: {
      name: info?.name || '',
      industry: info?.industry || '',
      hq: info?.hq || '',
      founded: info?.founded || '',
      status: info?.status || '',
      website: info?.website || '',
      revenue: info?.revenue || '',
      employees: info?.employees || '',
      markets: info?.markets || '',
      description: info?.description || '',
      socialMediaLinks: {
        linkedin: info?.socialMediaLinks?.linkedin || '',
        twitter: info?.socialMediaLinks?.twitter || '',
        facebook: info?.socialMediaLinks?.facebook || '',
        youtube: info?.socialMediaLinks?.youtube || '',
        ...info?.socialMediaLinks
      },
      funding: {
        hasRaisedRecently: info?.funding?.hasRaisedRecently || false,
        details: info?.funding?.details || '',
        rounds: info?.funding?.rounds || [],
        ...info?.funding
      },
      recentProducts: {
        hasLaunchedRecently: info?.recentProducts?.hasLaunchedRecently || false,
        details: info?.recentProducts?.details || '',
        productsList: info?.recentProducts?.productsList || [],
        ...info?.recentProducts
      }
    },
    painPoints: report.painPoints || [],
    techStack: {
      erp: report?.techStack?.erp || {},
      crm: report?.techStack?.crm || {},
      bi: report?.techStack?.bi || {},
      supplyChain: report?.techStack?.supplyChain || {},
      websiteTech: report?.techStack?.websiteTech || [],
      ...report?.techStack
    },
    aiAdoption: {
      maturityLevel: report?.aiAdoption?.maturityLevel || '',
      deployedTools: report?.aiAdoption?.deployedTools || [],
      plannedTools: report?.aiAdoption?.plannedTools || [],
      competitors: report?.aiAdoption?.competitors || [],
      ...report?.aiAdoption
    },
    aiSolutions: report.aiSolutions || [],
    gtmStrategy: {
      decisionMaker: {
        name: report?.gtmStrategy?.decisionMaker?.name || '',
        title: report?.gtmStrategy?.decisionMaker?.title || '',
        phone: report?.gtmStrategy?.decisionMaker?.phone || '',
        email: report?.gtmStrategy?.decisionMaker?.email || '',
        linkedinUrl: report?.gtmStrategy?.decisionMaker?.linkedinUrl || '',
        responsibilities: report?.gtmStrategy?.decisionMaker?.responsibilities || '',
        painOwns: report?.gtmStrategy?.decisionMaker?.painOwns || '',
        motivation: report?.gtmStrategy?.decisionMaker?.motivation || '',
        ...report?.gtmStrategy?.decisionMaker
      },
      openingHook: report?.gtmStrategy?.openingHook || '',
      coreMessage: report?.gtmStrategy?.coreMessage || '',
      cta: report?.gtmStrategy?.cta || '',
      expectedObjections: report?.gtmStrategy?.expectedObjections || [],
      ...report?.gtmStrategy
    },
    dealSizeForecast: {
      phase1QuickWin: report?.dealSizeForecast?.phase1QuickWin || '',
      phase2Expansion: report?.dealSizeForecast?.phase2Expansion || '',
      phase3FullPlatform: report?.dealSizeForecast?.phase3FullPlatform || '',
      totalRevenueLtv: report?.dealSizeForecast?.totalRevenueLtv || '',
      ...report?.dealSizeForecast
    },
    markdownReport: report.markdownReport || ''
  };
};

interface ProspectResearchPanelProps {
  key?: any;
  user: any;
  profile: any;
  campaigns: any[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function ProspectResearchPanel({ user, profile, campaigns, showToast }: ProspectResearchPanelProps) {
  const [inputVal, setInputVal] = useState('');
  const [linkedinVal, setLinkedinVal] = useState('');
  const [currentPresets, setCurrentPresets] = useState<{ name: string; url: string }[]>([]);

  const randomizePresets = () => {
    const shuffled = [...ALL_PRESETS_POOL].sort(() => 0.5 - Math.random());
    setCurrentPresets(shuffled.slice(0, 5));
  };

  useEffect(() => {
    const initial = [...ALL_PRESETS_POOL].sort(() => 0.5 - Math.random()).slice(0, 5);
    setCurrentPresets(initial);

    // Swap an individual preset with a random unused one every 7 seconds to keep it dynamic
    const timer = setInterval(() => {
      setCurrentPresets(prev => {
        if (prev.length === 0) return prev;
        const indexToSwap = Math.floor(Math.random() * prev.length);
        const unused = ALL_PRESETS_POOL.filter(p => !prev.some(u => u.name === p.name));
        if (unused.length === 0) return prev;
        const randomUnused = unused[Math.floor(Math.random() * unused.length)];
        const next = [...prev];
        next[indexToSwap] = randomUnused;
        return next;
      });
    }, 7000);

    return () => clearInterval(timer);
  }, []);

  const [researches, setResearches] = useState<any[]>([]);
  const [activeResearch, setActiveResearch] = useState<ProspectResearchReport | null>(null);
  const [activeResearchId, setActiveResearchId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Interactive Research Sprint simulation states
  const [sprintPhase, setSprintPhase] = useState<number>(0);
  const [sprintTime, setSprintTime] = useState<number>(0);
  
  // Dashboard Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'pain' | 'tech' | 'solutions' | 'gtm' | 'deal' | 'report'>('overview');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [targetCampaignId, setTargetCampaignId] = useState('');
  const [exportingLead, setExportingLead] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState<boolean>(() => {
    return localStorage.getItem('zyntra-research-full-width') === 'true';
  });

  const toggleFullWidth = () => {
    const newVal = !isFullWidth;
    setIsFullWidth(newVal);
    localStorage.setItem('zyntra-research-full-width', String(newVal));
  };

  useEffect(() => {
    fetchResearches();
  }, [profile?.orgId]);

  const fetchResearches = async () => {
    if (!profile?.orgId) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'prospect_researches'),
        where('orgId', '==', profile.orgId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in-memory to simplify secondary indexes
      list.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setResearches(list);
    } catch (err) {
      console.error("Error fetching researches:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startResearch = async (company: string, linkedin: string = '') => {
    if (!company.trim()) {
      showToast('Please enter a company website or name.', 'error');
      return;
    }
    setLoading(true);
    setSprintPhase(0);
    setSprintTime(0);

    // Simulated 80-minute Sprint Speed Run
    const intervalTime = setInterval(() => {
      setSprintTime(prev => {
        if (prev >= 80) {
          clearInterval(intervalTime);
          return 80;
        }
        const nextTime = prev + 1;
        // Phase Boundaries matching research stages
        if (nextTime <= 15) setSprintPhase(0); // Company scale
        else if (nextTime <= 35) setSprintPhase(1); // Pain points
        else if (nextTime <= 60) setSprintPhase(2); // Tech stack
        else setSprintPhase(3); // Solutions & GTM
        return nextTime;
      });
    }, 100);

    try {
      const payloadString = JSON.stringify({ website: company, linkedin: linkedin.trim() });
      const report = await generateProspectResearch(payloadString);
      clearInterval(intervalTime);
      setSprintTime(80);
      setSprintPhase(4);

      const sanitized = sanitizeResearchReport(report);

      // Save to Firebase
      const payload = {
        companyName: sanitized.companyInfo.name || company,
        userId: user.uid,
        orgId: profile.orgId,
        reportJSON: JSON.stringify(sanitized),
        createdAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'prospect_researches'), payload);
      const newRecord = { id: docRef.id, ...payload };
      
      setResearches(prev => [newRecord, ...prev]);
      setActiveResearch(sanitized);
      setActiveResearchId(docRef.id);
      setActiveSubTab('overview');
      showToast('Research Sprint completed successfully! Report compiled.', 'success');
    } catch (err: any) {
      clearInterval(intervalTime);
      console.error(err);
      showToast(`Research failed: ${err.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteResearch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      // Automatically clear confirm indicator after 3.5 seconds
      setTimeout(() => {
        setConfirmDeleteId(prev => prev === id ? null : prev);
      }, 3500);
      return;
    }
    try {
      await deleteDoc(doc(db, 'prospect_researches', id));
      setResearches(prev => prev.filter(r => r.id !== id));
      if (activeResearchId === id) {
        setActiveResearch(null);
        setActiveResearchId(null);
      }
      setConfirmDeleteId(null);
      showToast('Research report deleted.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete report.', 'error');
    }
  };

  const selectHistory = (r: any) => {
    try {
      const parsed = JSON.parse(r.reportJSON);
      setActiveResearch(sanitizeResearchReport(parsed));
      setActiveResearchId(r.id);
      setActiveSubTab('overview');
    } catch (err) {
      console.error(err);
      showToast('Failed to parse saved report.', 'error');
    }
  };

  const exportAsLead = async () => {
    if (!activeResearch) return;
    if (!targetCampaignId) {
      showToast('Please select a target campaign first.', 'error');
      return;
    }
    setExportingLead(true);
    try {
      const gtm = activeResearch.gtmStrategy || {} as any;
      const info = activeResearch.companyInfo || {} as any;
      
      const newLead = {
        name: gtm?.decisionMaker?.name || 'Decision Maker',
        role: gtm?.decisionMaker?.title || 'COO',
        company: info.name || 'Company name',
        industry: info.industry || 'Speciality Chem/Industrial',
        country: info.hq || 'India',
        phone: gtm?.decisionMaker?.phone || '+919876543210',
        email: gtm?.decisionMaker?.email || `contact@${(info.website || 'zyntra.ai').replace(/https?:\/\//, '').split('/')[0]}`,
        linkedin_url: gtm?.decisionMaker?.linkedinUrl || `linkedin.com/company/${(info.name || 'company').toLowerCase().replace(/\s+/g, '')}`,
        website: info.website || 'N/A',
        employees: info.employees || 'N/A',
        userId: user.uid,
        orgId: profile.orgId,
        campaignId: targetCampaignId,
        status: 'imported',
        score: 85
      };

      await addDoc(collection(db, 'leads'), newLead);
      
      // Update Campaign Leads Count
      const targetCamp = campaigns.find(c => c.id === targetCampaignId);
      if (targetCamp) {
        await updateDoc(doc(db, 'campaigns', targetCampaignId), {
          leadsCount: (targetCamp.leadsCount || 0) + 1
        });
      }

      showToast(`Added decision maker from ${info.name || 'Company'} as a Lead to selected campaign!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Export failed: ${err.message}`, 'error');
    } finally {
      setExportingLead(false);
    }
  };

  const handleCopyClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    showToast('Copied to clipboard!', 'success');
  };

  const downloadPDFReport = (reportToDownload?: ProspectResearchReport | null) => {
    const report = reportToDownload || activeResearch;
    if (!report) return;
    const doc = new jsPDF();
    const info = report.companyInfo || {} as any;
    const painPoints = report.painPoints || [];
    const aiSolutions = report.aiSolutions || [];
    const gtmStrategy = report.gtmStrategy || {} as any;
    const decisionMaker = gtmStrategy.decisionMaker || {};

    // Headings / Header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Brand Accent (#2563eb)
    doc.text(`PROSPECT INTELLIGENCE REPORT`, 20, 25);
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900 (#0f172a)
    doc.text(`${(info.name || 'COMPANY').toUpperCase()}`, 20, 35);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 40, 190, 40);

    // Profile Details
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");

    const linkedinLink = info.socialMediaLinks?.linkedin || `https://linkedin.com/company/${(info.name || 'company').toLowerCase().replace(/\s+/g, '')}`;
    const twitterLink = info.socialMediaLinks?.twitter || `https://twitter.com/${(info.name || 'company').toLowerCase().replace(/\s+/g, '')}`;
    const facebookLink = info.socialMediaLinks?.facebook || `https://facebook.com/${(info.name || 'company').toLowerCase().replace(/\s+/g, '')}`;
    const youtubeLink = info.socialMediaLinks?.youtube || `https://youtube.com/@${(info.name || 'company').toLowerCase().replace(/\s+/g, '')}`;

    const basicDetails = [
      ["Industry", info.industry || 'N/A'],
      ["Headquarters", info.hq || 'N/A'],
      ["Founded", info.founded || 'N/A'],
      ["Status", info.status || 'N/A'],
      ["Revenue Estimate", info.revenue || 'N/A'],
      ["Employee Count", info.employees || 'N/A'],
      ["Markets served", info.markets || 'N/A'],
      ["Website", info.website || 'N/A'],
      ["LinkedIn Company", linkedinLink],
      ["Twitter / X Profile", twitterLink],
      ["Facebook Profile", facebookLink],
      ["YouTube Channel", youtubeLink]
    ];

    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Operational Asset Data']],
      body: basicDetails,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 20, right: 20 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // Description
    if (info.description) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Business Operations Overview:", 20, currentY);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      
      const splitDesc = doc.splitTextToSize(info.description || "", 170);
      doc.text(splitDesc, 20, currentY + 7);
      
      currentY += (splitDesc.length * 5) + 20;
    }

    // Add a new page for detailed consulting recommendations
    doc.addPage();
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text("Strategic B2B Consultation Insights", 20, 25);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 30, 190, 30);

    // Pain points table
    const pains = painPoints.map(p => [
      p?.title || 'N/A',
      p?.severity || 'N/A',
      p?.impact || 'N/A',
      p?.timeline || 'N/A'
    ]);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Identified Corporate Pain Points:", 20, 40);

    autoTable(doc, {
      startY: 45,
      head: [['Pain Point Title', 'Severity', 'Financial/Operational Impact', 'Urgency Timeline']],
      body: pains,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 20, right: 20 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // AI Solutions Recommendation
    doc.setFont("Helvetica", "bold");
    doc.text("Recommended Custom AI Products:", 20, currentY);

    const solutions = aiSolutions.map(s => [
      s?.title || 'N/A',
      s?.mvp || 'N/A',
      s?.pricing?.monthlyFee || 'N/A',
      s?.pricing?.potentialLtv || 'N/A'
    ]);

    autoTable(doc, {
      startY: currentY + 7,
      head: [['Proposed Solution Product', 'MVP Scope Overview', 'Estimated Fee', '18-mo LTV value']],
      body: solutions,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105] }, // Accent-2 color (059669)
      margin: { left: 20, right: 20 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Go-to-Market Strategy Section
    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Target Decision Maker & Outreach Strategy:", 20, currentY);
    
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    const gtmDetails = [
      ["Target Stakeholder Title", decisionMaker.title || 'N/A'],
      ["Core Responsibilities", decisionMaker.responsibilities || 'N/A'],
      ["Pain Points Owned", decisionMaker.painOwns || 'N/A'],
      ["Core Value Opening Anchor", gtmStrategy.openingHook || 'N/A'],
      ["Value Proposition Proposal", gtmStrategy.coreMessage || 'N/A'],
      ["Call To Action Alignment", gtmStrategy.cta || 'N/A']
    ];

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Field', 'Strategic Positioning Details']],
      body: gtmDetails,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105] }, // slate-600
      margin: { left: 20, right: 20 }
    });

    doc.save(`Zyntra_Research_${(info.name || 'Report').replace(/\s+/g, '_')}.pdf`);
    showToast(`Consulting PDF for ${info.name || 'Company'} downloaded successfully!`, 'success');
  };

  return (
    <div className="space-y-6 md:space-y-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Prospect Intelligence</h1>
          <p className="text-text-muted text-xs md:text-sm">Accelerate deal closing with consulting-grade insights generated in seconds.</p>
        </div>
        
        {/* Presets shortcut bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentPresets.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest mr-1">Demo Presets:</span>
              <button
                onClick={randomizePresets}
                className="p-1.5 rounded-xl hover:bg-brand/10 hover:text-brand border border-border text-xs transition-colors cursor-pointer mr-1 relative group"
                title="Shuffle Presets Now"
              >
                <RefreshCw className="w-3.5 h-3.5 transition-transform duration-500 group-hover:rotate-180" />
              </button>
              
              <AnimatePresence mode="popLayout">
                {currentPresets.map((p) => (
                  <motion.button
                    key={p.name}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -5 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    onClick={() => {
                      setInputVal(p.url);
                      showToast(`Loaded ${p.name} URL`, 'success');
                    }}
                    className="px-3 py-1.5 rounded-xl hover:bg-brand/10 hover:text-brand border border-border text-xs transition-colors font-medium cursor-pointer"
                  >
                    {p.name}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
          {activeResearch && (
            <button
              onClick={toggleFullWidth}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isFullWidth
                  ? 'bg-brand/15 text-brand border-brand/30 hover:bg-brand/20'
                  : 'bg-surface-alt hover:bg-bg-subtle text-text-muted hover:text-text border-border'
              }`}
              title={isFullWidth ? "Split View" : "Full Width View"}
            >
              {isFullWidth ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullWidth ? "Split View" : "Full Width"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Control Room / History Column */}
        <div className={`space-y-6 transition-all duration-300${isFullWidth && activeResearch ? 'hidden lg:hidden' : 'lg:col-span-4 block'}`}>
          {/* Research Engine Launcher Card */}
          <div className="border border-border/80 rounded-xl p-6 md:p-8 space-y-6 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-primary/10 rounded-full pointer-events-none group-hover:bg-primary/20 transition-all duration-500" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-syne font-bold tracking-tight text-text">Research Launcher</h2>
                <span className="text-[9px] text-primary font-bold uppercase tracking-wider block -mt-0.5">Deep Intelligence Engine</span>
              </div>
            </div>
            
            <p className="text-xs text-text-secondary leading-relaxed">
              Execute a deep intelligence sprint across public data, corporate filings, and professional profiles to customize absolute pain alignment.
            </p>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-widest block">Company Info / Website URL</label>
                <div className="relative group/input">
                  <input
                    className="w-full border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl p-4 pl-12 text-sm outline-none transition-all duration-300 placeholder:text-text-tertiary text-text hover:border-primary/40"
                    placeholder="e.g. https://birlatyre.com"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    disabled={loading}
                    onKeyDown={e => { if (e.key === 'Enter') startResearch(inputVal, linkedinVal); }}
                  />
                  <Globe className="w-4.5 h-4.5 text-text-secondary group-focus-within/input:text-primary transition-colors absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-text-secondary font-bold uppercase tracking-widest block">Prospect LinkedIn URL</label>
                <div className="relative group/input">
                  <input
                    className="w-full border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl p-4 pl-12 text-sm outline-none transition-all duration-300 placeholder:text-text-tertiary text-text hover:border-primary/40"
                    placeholder="e.g. https://linkedin.com/in/prospect-profile"
                    value={linkedinVal}
                    onChange={e => setLinkedinVal(e.target.value)}
                    disabled={loading}
                    onKeyDown={e => { if (e.key === 'Enter') startResearch(inputVal, linkedinVal); }}
                  />
                  <Linkedin className="w-4.5 h-4.5 text-text-secondary group-focus-within/input:text-primary transition-colors absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                onClick={() => startResearch(inputVal, linkedinVal)}
                disabled={loading}
                className="w-full hover:from-primary-dark hover:to-primary text-text font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-sm disabled:opacity-50 hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Launch Research Sprint
              </button>
            </div>
          </div>

          {/* Past Researches History Card */}
          <div className="bg-surface border border-border rounded-xl md:rounded-[28px] p-5 md:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 text-text-muted" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Reports Database</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-bg text-[10px] font-mono font-bold text-text-muted border border-border">
                {researches.length} Saved
              </span>
            </div>

            {loadingHistory ? (
              <div className="py-8 text-center text-text-muted text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading reports...
              </div>
            ) : researches.length === 0 ? (
              <div className="py-12 border border-dashed border-border/50 rounded-xl text-center opacity-40 text-xs">
                <Database className="w-8 h-8 mx-auto mb-2 text-text-muted" />
                No saved research runs yet. Build one above.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {researches.map(r => (
                  <div
                    key={r.id}
                    onClick={() => selectHistory(r)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex justify-between items-center group ${
                      activeResearchId === r.id 
                        ? 'bg-brand/10 border-brand/40 text-brand' 
                        : 'bg-surface-alt border-border hover:border-brand-alt/40 text-text'
                    }`}
                  >
                    <div className="overflow-hidden space-y-1">
                      <div className="text-xs font-bold truncate group-hover:text-brand-alt transition-colors">{r.companyName}</div>
                      <div className="text-[9px] text-text-muted font-mono">
                        {r.createdAt?.toDate().toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            const parsed = JSON.parse(r.reportJSON);
                            downloadPDFReport(parsed);
                          } catch (err) {
                            console.error(err);
                            showToast('Failed to generate PDF for this report.', 'error');
                          }
                        }}
                        className="p-1.5 hover:bg-brand/10 text-text-muted hover:text-brand rounded-xl transition-colors cursor-pointer"
                        title="Download PDF report directly"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => deleteResearch(r.id, e)}
                        className={`p-1.5 rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                          confirmDeleteId === r.id 
                            ? 'bg-red-500 text-white hover:bg-red-600 px-2' 
                            : 'p-1.5 hover:bg-red-500/10 text-text-muted hover:text-red-500'
                        }`}
                        title={confirmDeleteId === r.id ? "Click again to confirm deletion" : "Delete report"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {confirmDeleteId === r.id && (
                          <span className="text-[9px] font-bold uppercase tracking-wider animate-pulse">Confirm</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action / Visualization Dashboard Area */}
        <div className={`lg:col-span-8${isFullWidth && activeResearch ? 'lg:col-span-12' : 'lg:col-span-8'}`}>
          <AnimatePresence mode="wait">
            {/* 1. Loading Sprint Simulation screen */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border rounded-xl md:rounded-[32px] p-6 md:p-12 text-center space-y-8 min-h-[500px] flex flex-col justify-center items-center"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-xl bg-brand/10 flex items-center justify-center text-brand animate-pulse">
                    <Cpu className="w-12 h-12" />
                  </div>
                  <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-brand-alt flex items-center justify-center text-text text-[10px] font-bold">
                    80m
                  </div>
                </div>

                <div className="space-y-2 max-w-md">
                  <h3 className="text-2xl font-syne font-extrabold tracking-tight">AI Sales Sprint Active</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Analyzing target domains, harvesting corporate earnings logs, validating technology indicators, and generating the B2B customized opportunity roadmap.
                  </p>
                </div>

                {/* Simulated sprint progress details */}
                <div className="w-full max-w-lg border border-border rounded-xl p-6 space-y-4">
                  <div className="flex justify-between items-center text-xs font-mono font-bold">
                    <span className="text-brand">PHASE {sprintPhase + 1}/4: {
                      sprintPhase === 0 ? 'Scale & Asset Review' :
                      sprintPhase === 1 ? 'Pain Points Verification' :
                      sprintPhase === 2 ? 'Tech Adoption Auditing' :
                      'B2B Solutions Customization'
                    }</span>
                    <span className="text-text-muted">Elapsed Sprint: {sprintTime} / 80 Mins ({Math.min(100, Math.round((sprintTime / 80) * 100))}%)</span>
                  </div>

                  {/* Horizontal visual bar */}
                  <div className="w-full bg-bg h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-100 rounded-full"
                      style={{ width: `${Math.min(100, (sprintTime / 80) * 100)}%` }}
                    />
                  </div>

                  {/* Live updates ticker */}
                  <div className="pt-2 border-t border-border/60 text-[10px] font-mono text-left bg-bg/50 p-3 rounded-xl h-[90px] overflow-hidden flex flex-col justify-end relative">
                    <div className="space-y-1.5 flex flex-col justify-end w-full">
                      <AnimatePresence mode="popLayout">
                        {sprintTime >= 1 && (
                          <motion.div 
                            key="phase1"
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-brand-alt shrink-0"
                          >
                            ✓ [Phase 1] Harvested web profile scale, revenue estimates, and core market verticals
                          </motion.div>
                        )}
                        {sprintTime >= 16 && (
                          <motion.div 
                            key="phase2"
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-brand-alt shrink-0"
                          >
                            ✓ [Phase 2] HARVESTING pain citations from SEBI filings, earnings transcripts, transcripts
                          </motion.div>
                        )}
                        {sprintTime >= 36 && (
                          <motion.div 
                            key="phase3"
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-brand-alt shrink-0"
                          >
                            ✓ [Phase 3] AUDITING enterprise indicators matching ERP (SAP/Oracle), CRM databases, and hiring scopes
                          </motion.div>
                        )}
                        {sprintTime >= 61 && (
                          <motion.div 
                            key="phase4"
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-brand-alt shrink-0"
                          >
                            ✓ [Phase 4] COMPILING 5 custom AI products with ROI contract values and pipeline briefs
                          </motion.div>
                        )}
                        {sprintTime < 80 && (
                          <motion.div 
                            key="processing"
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            className="text-text-muted flex items-center gap-1.5 pt-1 animate-pulse shrink-0"
                          >
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing next objective...
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. Completed Report Dashboard View */}
            {!loading && activeResearch && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Visual Header Overview Card */}
                <div className="border border-border rounded-xl md:rounded-[32px] p-5 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full bg-brand-alt animate-pulse" />
                       <span className="text-[10px] text-brand-alt font-mono font-bold uppercase tracking-widest">Research Synthesis Complete</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-syne font-extrabold tracking-tight">{activeResearch?.companyInfo?.name || 'Company Name'}</h2>
                    <p className="text-xs text-text-muted font-medium">{activeResearch?.companyInfo?.industry || 'Unknown Industry'} • {activeResearch?.companyInfo?.hq || 'Unknown HQ'}</p>
                  </div>

                  <div className="flex flex-col gap-3 min-w-[200px]">
                    <div className="bg-bg/40 p-3.5 rounded-xl border border-border text-center">
                      <div className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Estimated LTV Forecast</div>
                      <div className="text-xl font-syne font-extrabold text-brand mt-0.5">{activeResearch?.dealSizeForecast?.totalRevenueLtv || 'N/A'}</div>
                    </div>

                    <button
                      onClick={() => downloadPDFReport(activeResearch)}
                      className="w-full bg-surface border border-border text-text text-xs font-bold p-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4 text-brand-alt" />
                      Save Intelligence (PDF)
                    </button>
                  </div>
                </div>

                {/* Sub-tabs Selection Row with layout toggler */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface p-1.5 border border-border rounded-xl">
                  <div className="flex items-center gap-1 overflow-x-auto seq-strip pb-1 lg:pb-0">
                    {[
                      { id: 'overview', label: 'Company Scale', icon: Building2 },
                      { id: 'pain', label: 'Pain Points', icon: ShieldAlert },
                      { id: 'tech', label: 'Tech Stack & AI', icon: Database },
                      { id: 'solutions', label: 'AI Solutions', icon: Cpu },
                      { id: 'gtm', label: 'GTM Strategy', icon: Target },
                      { id: 'deal', label: 'Deal Size Bento', icon: TrendingUp },
                      { id: 'report', label: 'Raw Report', icon: FileText }
                    ].map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSubTab(tab.id as any)}
                          className={`flex items-center gap-2 px-4 py-2.5 md:px-4.5 md:py-3 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            activeSubTab === tab.id 
                              ? 'bg-brand text-white shadow-md' 
                              : 'text-text-muted hover:text-text hover:bg-surface-alt'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={toggleFullWidth}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer hover:bg-bg-subtle border border-border text-text hover:border-brand-alt/30"
                    title={isFullWidth ? "Collapse back to standard Split View (Show Sidebar)" : "Expand to Full Width Report (Hide Sidebar)"}
                  >
                    {isFullWidth ? (
                      <>
                        <Minimize2 className="w-4 h-4 text-brand-alt" />
                        <span>Split View</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-4 h-4 text-brand-alt" />
                        <span>Full Width</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sub-tab Panels */}
                <div className="bg-surface border border-border rounded-xl md:rounded-[32px] p-5 md:p-8">
                  {/* Panel A: Overview */}
                  {activeSubTab === 'overview' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-syne font-bold border-b border-border pb-3">Corporate Scale & Firmographic Profile</h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Founded', val: activeResearch?.companyInfo?.founded || 'N/A', icon: Calendar },
                          { label: 'Status', val: activeResearch?.companyInfo?.status || 'N/A', icon: UserCheck },
                          { label: 'Annual Revenue', val: activeResearch?.companyInfo?.revenue || 'N/A', icon: CreditCard },
                          { label: 'Employees', val: activeResearch?.companyInfo?.employees || 'N/A', icon: Building2 }
                        ].map((m, i) => (
                          <div key={i} className="border border-border p-5 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-text-muted">
                              <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                              <m.icon className="w-4 h-4" />
                            </div>
                            <div className="text-base font-syne font-extrabold">{m.val}</div>
                          </div>
                        ))}
                      </div>

                      <div className="border border-border p-6 rounded-xl space-y-2">
                        <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Business Model Description</div>
                        <p className="text-sm text-text-muted leading-relaxed font-sans">{activeResearch?.companyInfo?.description || 'No description available.'}</p>
                      </div>

                      {/* Funding & Recent Products Sections */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Funding Card */}
                        <div className="border border-border p-6 rounded-xl space-y-4">
                          <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div className="space-y-1">
                              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block">Funding & Capitalization</span>
                              <h4 className="text-sm font-syne font-bold text-text">Investment & Funding Status</h4>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                              activeResearch?.companyInfo?.funding?.hasRaisedRecently 
                                ? 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20' 
                                : 'bg-[#6b7280]/10 text-text-muted border border-border'
                            }`}>
                              {activeResearch?.companyInfo?.funding?.hasRaisedRecently ? 'Raised Funding Recently' : 'Funded / Public Equity'}
                            </span>
                          </div>
                          
                          <p className="text-xs text-text-muted leading-relaxed font-sans">
                            {activeResearch?.companyInfo?.funding?.details || `${activeResearch?.companyInfo?.name || 'This company'} is currently funded as ${activeResearch?.companyInfo?.status || 'Private'} with an estimated annual revenue of ${activeResearch?.companyInfo?.revenue || 'N/A'}.`}
                          </p>

                          {activeResearch?.companyInfo?.funding?.rounds && activeResearch.companyInfo.funding.rounds.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Rounds History</div>
                              <div className="relative border-l border-border/80 pl-4 space-y-3 mt-1 ml-1.5">
                                {activeResearch.companyInfo.funding.rounds.map((round: any, idx: number) => (
                                  <div key={idx} className="relative space-y-0.5">
                                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-brand" />
                                    <div className="flex justify-between text-xs font-semibold">
                                      <span className="text-text font-syne font-bold">{round.roundName}</span>
                                      <span className="text-brand pr-1">{round.amount}</span>
                                    </div>
                                    <div className="text-[10px] text-text-muted font-mono flex items-center gap-1.5">
                                      <span>{round.date}</span>
                                      {round.investors && (
                                        <>
                                          <span>•</span>
                                          <span className="truncate max-w-[200px]" title={round.investors}>Inv: {round.investors}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Recent Products Card */}
                        <div className="border border-border p-6 rounded-xl space-y-4">
                          <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <div className="space-y-1">
                              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block">Innovation Tracker</span>
                              <h4 className="text-sm font-syne font-bold text-text">Latest Products & Services</h4>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                              activeResearch?.companyInfo?.recentProducts?.hasLaunchedRecently 
                                ? 'bg-brand/10 text-brand-alt border border-brand/20' 
                                : 'bg-[#6b7280]/10 text-text-muted border border-border'
                            }`}>
                              {activeResearch?.companyInfo?.recentProducts?.hasLaunchedRecently ? 'Active Product Log' : 'Stable Product Line'}
                            </span>
                          </div>
                          
                          <p className="text-xs text-text-muted leading-relaxed font-sans">
                            {activeResearch?.companyInfo?.recentProducts?.details || `Core services focus on ${activeResearch?.companyInfo?.industry || 'industry'} enterprise solutions with targeted global deployments.`}
                          </p>

                          {activeResearch?.companyInfo?.recentProducts?.productsList && activeResearch.companyInfo.recentProducts.productsList.length > 0 && (
                            <div className="space-y-2.5 pt-1">
                              <div className="text-[9px] text-text-muted font-bold uppercase tracking-widest">Recent Launches & Pipeline</div>
                              <div className="space-y-2.5 mt-1">
                                {activeResearch.companyInfo.recentProducts.productsList.slice(0, 3).map((prod: any, idx: number) => (
                                  <div key={idx} className="bg-bg/40 border border-border/60 p-2.5 rounded-xl space-y-1 border-border transition-colors">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-bold text-text font-syne">{prod.name}</span>
                                      {prod.launchDate && (
                                        <span className="text-[9px] font-mono text-text-muted bg-border/40 px-1.5 py-0.5 rounded-xl">{prod.launchDate}</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-text-muted leading-relaxed font-sans">{prod.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Social Media & Digital Footprint Section */}
                      <div className="border border-border p-6 rounded-xl space-y-4">
                        <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Digital Footprint & Social Media Channels</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { 
                              name: 'LinkedIn', 
                              url: activeResearch?.companyInfo?.socialMediaLinks?.linkedin || `https://linkedin.com/company/${(activeResearch?.companyInfo?.name || 'company').toLowerCase().replace(/\s+/g, '')}`, 
                              icon: Linkedin, 
                              color: 'text-[#0a66c2] bg-[#0a66c2]/10 border-[#0a66c2]/25 hover:bg-[#0a66c2]/20' 
                            },
                            { 
                              name: 'Twitter / X', 
                              url: activeResearch?.companyInfo?.socialMediaLinks?.twitter || `https://twitter.com/${(activeResearch?.companyInfo?.name || 'company').toLowerCase().replace(/\s+/g, '')}`, 
                              icon: Twitter, 
                              color: 'text-[#0f1419] bg-[#0f1419]/10 border-[#0f1419]/25 hover:bg-[#0f1419]/20 dark:text-white dark:bg-white/10 dark:border-white/25 dark:hover:bg-white/20' 
                            },
                            { 
                              name: 'Facebook', 
                              url: activeResearch?.companyInfo?.socialMediaLinks?.facebook || `https://facebook.com/${(activeResearch?.companyInfo?.name || 'company').toLowerCase().replace(/\s+/g, '')}`, 
                              icon: Facebook, 
                              color: 'text-[#1877f2] bg-[#1877f2]/10 border-[#1877f2]/25 hover:bg-[#1877f2]/20' 
                            },
                            { 
                              name: 'YouTube', 
                              url: activeResearch?.companyInfo?.socialMediaLinks?.youtube || `https://youtube.com/@${(activeResearch?.companyInfo?.name || 'company').toLowerCase().replace(/\s+/g, '')}`, 
                              icon: Youtube, 
                              color: 'text-[#ff0000] bg-[#ff0000]/10 border-[#ff0000]/25 hover:bg-[#ff0000]/20' 
                            }
                          ].map((social, i) => {
                            let validUrl = social.url;
                            if (validUrl && !validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
                              validUrl = `https://${validUrl}`;
                            }
                            return (
                              <a 
                                key={i}
                                href={validUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold transition-all duration-200${social.color}`}
                              >
                                <social.icon className="w-4 h-4 shrink-0" />
                                <span className="truncate">{social.name}</span>
                                <ExternalLink className="w-3 h-3 ml-auto opacity-50 shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs font-mono text-text-muted bg-bg/40 p-4 rounded-xl">
                        <span>Corporate Target Markets: <b>{activeResearch?.companyInfo?.markets || 'N/A'}</b></span>
                        <span>Official Website: <a href={activeResearch?.companyInfo?.website} target="_blank" className="text-brand hover:underline inline-flex items-center gap-1">{activeResearch?.companyInfo?.website || 'N/A'} <ExternalLink className="w-3.5 h-3.5" /></a></span>
                      </div>
                    </div>
                  )}

                  {/* Panel B: Pain Points */}
                  {activeSubTab === 'pain' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-syne font-bold border-b border-border pb-3">Verified Corporate Bottlenecks & Gaps</h3>
                      
                      <div className="space-y-4">
                        {activeResearch.painPoints.map((p, i) => (
                          <div key={i} className="border border-border rounded-xl p-6 space-y-4 transition-all">
                            <div className="flex justify-between items-start gap-3">
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-text">{p.title}</h4>
                                <p className="text-xs text-text-muted font-medium">{p.description}</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest ${
                                p.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                p.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              }`}>
                                {p.severity}
                              </span>
                            </div>

                            {/* Citations/Evidence block */}
                            {p.evidence && p.evidence.length > 0 && (
                              <div className="border-l-2 border-border pl-4 space-y-1 bg-bg/30 p-3 rounded-xl">
                                <div className="text-xs text-text italic font-medium leading-relaxed">
                                  "{p.evidence[0].quote}"
                                </div>
                                <div className="text-[10px] text-text-muted font-mono flex items-center gap-2">
                                  <span>— Source: <b>{p.evidence[0].source}</b></span>
                                  <span>•</span>
                                  <span>{p.evidence[0].date}</span>
                                </div>
                              </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-4 pt-1 text-xs">
                              <div>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block">Quantified Impact</span>
                                <span className="text-text font-bold">{p.impact}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block">Urgency Window</span>
                                <span className="text-text font-semibold">{p.timeline}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Panel C: Tech Stack */}
                  {activeSubTab === 'tech' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-syne font-bold border-b border-border pb-3">Enterprise Software Inventory & AI Maturity</h3>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Systems Grid */}
                        <div className="space-y-3">
                          <h4 className="text-xs text-text-muted font-bold uppercase tracking-widest">Enterprise Operations Systems</h4>
                          {[
                            { category: 'ERP System', data: activeResearch.techStack.erp },
                            { category: 'CRM Database', data: activeResearch.techStack.crm },
                            { category: 'BI / Dashboards', data: activeResearch.techStack.bi },
                            { category: 'Logistics/SCM Stack', data: activeResearch.techStack.supplyChain }
                          ].map((sys, idx) => (
                            <div key={idx} className="border border-border rounded-xl p-4 flex justify-between items-center text-xs">
                              <div className="space-y-0.5">
                                <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{sys.category}</div>
                                <div className="font-bold text-text">{sys.data.name || 'Not Found'}</div>
                                <div className="text-[9px] text-text-muted">Source: {sys.data.source || 'Standard Industry Benchmark'}</div>
                              </div>
                              <div className="text-right space-y-1">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                                  sys.data.status === 'Confirmed' ? 'bg-brand-alt/10 text-brand-alt' :
                                  sys.data.status === 'Likely' ? 'bg-brand/10 text-brand' : 'bg-surface text-text-muted/60'
                                }`}>
                                  {sys.data.status || 'Not Found'}
                                </span>
                                <div className="text-[8px] text-text-muted">Confidence: {sys.data.confidence}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* AI & Competitors column */}
                        <div className="space-y-5">
                          {/* Maturity Score */}
                          <div className="bg-brand/10 border border-border p-5 rounded-xl relative overflow-hidden">
                            <div className="text-xs text-brand font-bold uppercase tracking-widest">AI Maturity Assessment</div>
                            <div className="text-4xl font-syne font-extrabold tracking-tight text-text mt-1">
                              {activeResearch.aiAdoption.maturityLevel}
                            </div>
                            <p className="text-[10px] text-text-muted mt-2">
                              Target is operating below maximum capacity. Integration of custom GTM workflows represents critical high-ROI leverage.
                            </p>
                          </div>

                          {/* Website Tech Tags */}
                          <div className="space-y-2">
                            <h4 className="text-xs text-text-muted font-bold uppercase tracking-widest">Detected Website Technologies</h4>
                            <div className="flex gap-2 flex-wrap">
                              {activeResearch.techStack.websiteTech?.map((tag, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-xl border border-border text-[10px] text-text-muted font-mono">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Competitors Adoption */}
                          <div className="space-y-2">
                            <h4 className="text-xs text-text-muted font-bold uppercase tracking-widest">Competitive Dynamic</h4>
                            {activeResearch.aiAdoption.competitors?.map((comp, idx) => (
                              <div key={idx} className="border border-border p-3.5 rounded-xl flex justify-between items-center text-xs">
                                <div>
                                  <div className="font-bold">{comp.name}</div>
                                  <div className="text-[10px] text-text-muted">AI Scope: {comp.tools}</div>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-brand-alt uppercase tracking-widest bg-brand-alt/5 px-2 py-0.5 rounded-xl border border-brand-alt/10">
                                  {comp.aiMaturity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Panel D: AI Solutions */}
                  {activeSubTab === 'solutions' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-syne font-bold border-b border-border pb-3">Targeted Custom AI Solution Opportunities</h3>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        {activeResearch.aiSolutions.map((sol, index) => (
                          <div key={index} className="border border-border rounded-xl p-6 space-y-4 hover:border-brand-alt/40 transition-all flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-brand-alt/10 flex items-center justify-center text-brand-alt">
                                  <Cpu className="w-4 h-4" />
                                </div>
                                <h4 className="text-sm font-bold text-text truncate">{sol.title}</h4>
                              </div>

                              <div className="text-[10px] text-brand/90 font-mono font-bold">
                                TARGETING: {sol.painPointCausal}
                              </div>

                              <p className="text-xs text-text-muted font-medium bg-bg/40 p-3.5 rounded-xl border border-border/60">
                                <b>MVP Scope:</b> {sol.mvp}
                              </p>

                              <ul className="space-y-1 text-xs text-text-muted list-disc pl-4">
                                {sol.features.map((f, fi) => (
                                  <li key={fi}>{f}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="pt-4 border-t border-border mt-4">
                              <div className="grid grid-cols-2 gap-3 text-xs mb-3 text-center">
                                <div className="bg-bg/40 p-2.5 rounded-xl border border-border">
                                  <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Est. Price</span>
                                  <div className="font-bold font-mono text-brand-alt mt-0.5">{sol.pricing.monthlyFee}</div>
                                </div>
                                <div className="bg-bg/40 p-2.5 rounded-xl border border-border">
                                  <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider">Potential LTV</span>
                                  <div className="font-bold font-mono text-brand mt-0.5">{sol.pricing.potentialLtv}</div>
                                </div>
                              </div>
                              <p className="text-[10px] text-text-muted italic leading-relaxed">{sol.pricingJustification}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Panel E: GTM & Objections */}
                  {activeSubTab === 'gtm' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-4">
                        <h3 className="text-lg font-syne font-bold">Cold GTM Delivery & Objection Flashcards</h3>
                        
                        {/* Expand Leads Injector menu dropdown */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-secondary font-semibold font-sans">Select Campaign:</span>
                          <select
                            className="border border-border text-xs rounded-xl px-4 py-2.5 font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none hover:border-primary/40 transition-all text-text cursor-pointer"
                            value={targetCampaignId}
                            onChange={(e) => setTargetCampaignId(e.target.value)}
                          >
                            <option value="">-- Choose Campaign --</option>
                            {campaigns.map(c => (
                              <option key={c.id} value={c.id} className="text-text">{c.name.toUpperCase()}</option>
                            ))}
                          </select>
                          <button
                            onClick={exportAsLead}
                            disabled={exportingLead}
                            className="hover:from-primary-dark hover:to-primary text-text font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                            {exportingLead ? 'Injecting...' : 'Inject as Lead'}
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Target Stakeholder Profile Card */}
                        <div className="border border-border p-6 rounded-xl space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                              <UserCheck className="w-4 h-4" />
                            </div>
                            <h4 className="text-sm font-bold text-text">Target Decision Maker Profile</h4>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="bg-bg/40 p-4 rounded-xl border border-border space-y-3">
                              <div>
                                <span className="text-[8px] text-text-muted font-extrabold uppercase tracking-widest block">Current Named Decision Maker</span>
                                <div className="font-extrabold text-sm text-text">{activeResearch.gtmStrategy.decisionMaker.name || 'N/A'}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                                <div>
                                  <span className="text-[8px] text-text-muted font-bold uppercase tracking-widest block">Designation / Title</span>
                                  <div className="font-semibold text-xs text-brand truncate">{activeResearch.gtmStrategy.decisionMaker.title || 'N/A'}</div>
                                </div>
                                <div>
                                  <span className="text-[8px] text-text-muted font-bold uppercase tracking-widest block">Individual LinkedIn</span>
                                  {activeResearch.gtmStrategy.decisionMaker.linkedinUrl ? (
                                    <a 
                                      href={activeResearch.gtmStrategy.decisionMaker.linkedinUrl.startsWith('http') ? activeResearch.gtmStrategy.decisionMaker.linkedinUrl : `https://${activeResearch.gtmStrategy.decisionMaker.linkedinUrl}`} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="text-text hover:text-brand-alt font-medium text-xs flex items-center gap-1 transition-colors"
                                    >
                                      <Linkedin className="w-3.5 h-3.5" /> Profile <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  ) : (
                                    <span className="text-text-muted font-medium text-xs">N/A</span>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                                <div>
                                  <span className="text-[8px] text-text-muted font-bold uppercase tracking-widest block">Verified Business Email</span>
                                  {activeResearch.gtmStrategy.decisionMaker.email ? (
                                    <a href={`mailto:${activeResearch.gtmStrategy.decisionMaker.email}`} className="text-text hover:text-brand font-medium text-xs flex items-center gap-1 transition-colors truncate">
                                      <Mail className="w-3.5 h-3.5 text-brand shrink-0" /> {activeResearch.gtmStrategy.decisionMaker.email}
                                    </a>
                                  ) : (
                                    <span className="text-text-muted font-medium text-xs">N/A</span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-[8px] text-text-muted font-bold uppercase tracking-widest block">Verified Telephone</span>
                                  {activeResearch.gtmStrategy.decisionMaker.phone ? (
                                    <span className="text-text font-medium text-xs flex items-center gap-1 truncate">
                                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {activeResearch.gtmStrategy.decisionMaker.phone}
                                    </span>
                                  ) : (
                                    <span className="text-text-muted font-medium text-xs">N/A</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block mb-0.5">Core Responsibilities</span>
                              <p className="text-xs text-text-muted font-medium">{activeResearch.gtmStrategy.decisionMaker.responsibilities}</p>
                            </div>

                            <div>
                              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block mb-0.5">Primary Pain Owner</span>
                              <p className="text-xs text-brand font-medium">{activeResearch.gtmStrategy.decisionMaker.painOwns}</p>
                            </div>

                            <div>
                              <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest block mb-0.5">Buying Motivations</span>
                              <p className="text-xs text-text-muted font-medium italic">"{activeResearch.gtmStrategy.decisionMaker.motivation}"</p>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Pitch Builder Card */}
                        <div className="border border-border p-6 rounded-xl space-y-4">
                          <div className="flex items-center gap-3 justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-brand-alt/10 flex items-center justify-center text-brand-alt">
                                <Sparkles className="w-4 h-4" />
                              </div>
                              <h4 className="text-sm font-bold text-text">B2B Custom Outreach Frame</h4>
                            </div>
                            <button
                              onClick={() => handleCopyClipboard(
                                `${activeResearch.gtmStrategy.openingHook}\n\n${activeResearch.gtmStrategy.coreMessage}\n\n${activeResearch.gtmStrategy.cta}`,
                                99
                              )}
                              className="p-1.5 hover:bg-brand/10 text-brand rounded-xl transition-colors"
                            >
                              {copiedIndex === 99 ? <Check className="w-4 h-4 text-brand-alt animate-pulse" /> : <Clipboard className="w-4 h-4" />}
                            </button>
                          </div>

                          <div className="space-y-3 font-sans text-xs bg-bg/40 p-4.5 rounded-xl border border-border leading-relaxed text-text-muted pr-1">
                            <p className="text-brand font-semibold select-all">"{activeResearch.gtmStrategy.openingHook}"</p>
                            <p className="select-all">"{activeResearch.gtmStrategy.coreMessage}"</p>
                            <p className="text-brand-alt font-medium select-all">"{activeResearch.gtmStrategy.cta}"</p>
                          </div>
                          <div className="text-[9px] text-text-muted font-mono uppercase tracking-[0.1em] text-right">
                            *Click lines directly to copy details
                          </div>
                        </div>
                      </div>

                      {/* Objections flashcards */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs text-text-muted font-bold uppercase tracking-widest">Expected Sales Objections & Safe Handling Responses</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {activeResearch.gtmStrategy.expectedObjections?.map((obj, i) => (
                            <div key={i} className="border border-border rounded-xl p-5 space-y-3">
                              <div className="flex items-start gap-2 text-xs">
                                <ShieldAlert className="w-4.5 h-4.5 text-orange-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">Objection Signal</span>
                                  <div className="font-bold text-text">{obj.objection}</div>
                                </div>
                              </div>
                              <div className="border-t border-border pt-3 flex items-start gap-2 text-xs text-text-muted">
                                <div className="p-1 bg-brand-alt/15 text-brand-alt rounded-xl uppercase tracking-widest text-[8px] font-mono font-bold mt-0.5">REPLY</div>
                                <div className="leading-relaxed font-sans text-xs italic">
                                  "{obj.response}"
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Panel F: Deal Size Bento */}
                  {activeSubTab === 'deal' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-syne font-bold border-b border-border pb-3">Growth Projections & Deal Sizing</h3>
                      
                      <div className="grid md:grid-cols-3 gap-6">
                        {[
                          { title: 'Phase 1: Quick Win Pilot', timeline: '2-4 Weeks scope', desc: activeResearch.dealSizeForecast.phase1QuickWin, color: 'border-brand/30 hover:border-brand' },
                          { title: 'Phase 2: Product Expansion', timeline: '2-3 Months scale', desc: activeResearch.dealSizeForecast.phase2Expansion, color: 'border-brand-alt/30 hover:border-brand-alt' },
                          { title: 'Phase 3: Full Platform SaaS', timeline: '6-12 Months contract', desc: activeResearch.dealSizeForecast.phase3FullPlatform, color: 'border-[#ff9f1c]/30 hover:border-[#ff9f1c]' }
                        ].map((p, i) => (
                          <div key={i} className={`border rounded-xl p-6 space-y-4 transition-all flex flex-col justify-between${p.color}`}>
                            <div className="space-y-2">
                              <div className="text-[10px] text-text-muted font-bold font-mono uppercase tracking-wider">{p.timeline}</div>
                              <h4 className="text-base font-syne font-bold text-text leading-tight">{p.title}</h4>
                            </div>
                            
                            <p className="text-xs text-text-muted leading-relaxed italic bg-bg/40 p-4 rounded-xl border border-zinc-800">
                              "{p.desc}"
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-brand/15 border border-border p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold">18-Month Combined Customer Life-Time Value (LTV)</h4>
                          <p className="text-xs text-text-muted leading-relaxed">
                            Full implementation of our recommended custom AI opportunity pipeline for this high value target.
                          </p>
                        </div>
                        <div className="text-2xl font-syne font-extrabold text-brand-alt">
                          {activeResearch.dealSizeForecast.totalRevenueLtv}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Panel G: Raw Report */}
                  {activeSubTab === 'report' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-border pb-3">
                        <h3 className="text-lg font-syne font-bold">Consulting Intelligence Report</h3>
                        <button
                          onClick={() => handleCopyClipboard(activeResearch.markdownReport, 999)}
                          className="px-4 py-2 border border-border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          {copiedIndex === 999 ? <Check className="w-4 h-4 text-brand-alt" /> : <Clipboard className="w-4 h-4" />}
                          Copy Markdown
                        </button>
                      </div>

                      {/* Display Markdown view with premium consulting styling */}
                      <div className="border border-border rounded-xl p-6 md:p-8 font-sans text-xs text-text-muted leading-relaxed select-all max-h-[600px] overflow-y-auto markdown-body">
                        <ReactMarkdown
                          components={{
                            h1: ({node, ...props}) => <h1 id={props.id} className="text-xl font-syne font-extrabold text-brand mt-6 mb-3 border-b border-border pb-1 tracking-tight text-text uppercase" {...props} />,
                            h2: ({node, ...props}) => <h2 id={props.id} className="text-base font-syne font-bold text-text mt-5 mb-2 border-l-2 border-border pl-2 tracking-tight" {...props} />,
                            h3: ({node, ...props}) => <h3 id={props.id} className="text-sm font-syne font-semibold text-white/90 mt-4 mb-1.5" {...props} />,
                            h4: ({node, ...props}) => <h4 id={props.id} className="text-xs font-syne font-semibold text-white/80 mt-3 mb-1" {...props} />,
                            p: ({node, ...props}) => <p className="text-xs text-text-muted mb-3.5 leading-relaxed font-sans" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1.5 text-xs text-text-muted" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-xs text-text-muted" {...props} />,
                            li: ({node, ...props}) => <li className="text-xs text-text-muted leading-relaxed" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-white/95" {...props} />,
                            em: ({node, ...props}) => <em className="italic text-text-muted/95" {...props} />,
                            code: ({node, className, children, ...props}: any) => {
                              const match = /language-(\w+)/.exec(className || '');
                              const inline = !match;
                              return inline ? (
                                <code className="bg-surface/80 border border-border px-1.5 py-0.5 rounded-xl font-mono text-[11px] text-brand-alt" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <pre className="border border-border/50 p-4 rounded-xl font-mono text-[11px] text-text-muted overflow-x-auto my-4 whitespace-pre-wrap block">
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              );
                            },
                            blockquote: ({node, ...props}) => (
                              <blockquote className="border-l-4 border-brand pl-4 italic text-xs text-text-muted bg-brand/5 py-2.5 my-4 rounded-xl font-sans" {...props} />
                            ),
                            table: ({node, ...props}) => (
                              <div className="overflow-x-auto my-4 border border-border rounded-xl">
                                <table className="min-w-full divide-y divide-border" {...props} />
                              </div>
                            ),
                            thead: ({node, ...props}) => <thead className="" {...props} />,
                            tbody: ({node, ...props}) => <tbody className="divide-y divide-border/60" {...props} />,
                            th: ({node, ...props}) => <th className="px-3.5 py-2 text-left text-[10px] font-bold uppercase tracking-widest border-b border-border/60" {...props} />,
                            td: ({node, ...props}) => <td className="px-3.5 py-2 text-xs text-text-muted font-sans" {...props} />,
                            hr: ({node, ...props}) => <hr className="border-border/60 my-6" {...props} />
                          }}
                        >
                          {activeResearch.markdownReport}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. Empty Initial State / Introduction block */}
            {!loading && !activeResearch && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-surface border border-border rounded-xl md:rounded-[32px] p-6 md:p-12 text-center space-y-6 min-h-[500px] flex flex-col justify-center items-center opacity-70"
              >
                <div className="w-16 h-16 rounded-xl bg-brand/10 border border-border flex items-center justify-center text-brand">
                  <Database className="w-8 h-8" />
                </div>
                
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-xl font-syne font-bold">Launch a B2B Intelligence Sprint</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Identify high-intent pain points, map verified tools, and propose strategic custom AI agents to secure larger enterprise deals.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-brand uppercase tracking-wider">
                  <span>Enter Profile</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>Execute Sprint</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>Harvest Custom CRM Leads</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
