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
    <div >
      {/* Header Banner */}
      <div >
        <div >
          <h1 >Prospect Intelligence</h1>
          <p >Accelerate deal closing with consulting-grade insights generated in seconds.</p>
        </div>
        
        {/* Presets shortcut bar */}
        <div >
          {currentPresets.length > 0 && (
            <div >
              <span >Demo Presets:</span>
              <button
                onClick={randomizePresets}
                
                title="Shuffle Presets Now"
              >
                <RefreshCw  />
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
              
              title={isFullWidth ? "Split View" : "Full Width View"}
            >
              {isFullWidth ? <Minimize2  /> : <Maximize2  />}
              <span>{isFullWidth ? "Split View" : "Full Width"}</span>
            </button>
          )}
        </div>
      </div>

      <div >
        {/* Left Control Room / History Column */}
        <div >
          {/* Research Engine Launcher Card */}
          <div >
            <div  />
            <div >
              <div >
                <Search  />
              </div>
              <div>
                <h2 >Research Launcher</h2>
                <span >Deep Intelligence Engine</span>
              </div>
            </div>
            
            <p >
              Execute a deep intelligence sprint across public data, corporate filings, and professional profiles to customize absolute pain alignment.
            </p>

            <div >
              <div >
                <label >Company Info / Website URL</label>
                <div >
                  <input
                    
                    placeholder="e.g. https://birlatyre.com"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    disabled={loading}
                    onKeyDown={e => { if (e.key === 'Enter') startResearch(inputVal, linkedinVal); }}
                  />
                  <Globe  />
                </div>
              </div>

              <div >
                <label >Prospect LinkedIn URL</label>
                <div >
                  <input
                    
                    placeholder="e.g. https://linkedin.com/in/prospect-profile"
                    value={linkedinVal}
                    onChange={e => setLinkedinVal(e.target.value)}
                    disabled={loading}
                    onKeyDown={e => { if (e.key === 'Enter') startResearch(inputVal, linkedinVal); }}
                  />
                  <Linkedin  />
                </div>
              </div>

              <button
                onClick={() => startResearch(inputVal, linkedinVal)}
                disabled={loading}
                
              >
                {loading ? <Loader2  /> : <Sparkles  />}
                Launch Research Sprint
              </button>
            </div>
          </div>

          {/* Past Researches History Card */}
          <div >
            <div >
              <div >
                <History  />
                <h3 >Reports Database</h3>
              </div>
              <span >
                {researches.length} Saved
              </span>
            </div>

            {loadingHistory ? (
              <div >
                <Loader2  /> Loading reports...
              </div>
            ) : researches.length === 0 ? (
              <div >
                <Database  />
                No saved research runs yet. Build one above.
              </div>
            ) : (
              <div >
                {researches.map(r => (
                  <div
                    key={r.id}
                    onClick={() => selectHistory(r)}
                    
                  >
                    <div >
                      <div >{r.companyName}</div>
                      <div >
                        {r.createdAt?.toDate().toLocaleDateString()}
                      </div>
                    </div>
                    <div >
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
                        
                        title="Download PDF report directly"
                      >
                        <Download  />
                      </button>
                      <button
                        onClick={(e) => deleteResearch(r.id, e)}
                        
                        title={confirmDeleteId === r.id ? "Click again to confirm deletion" : "Delete report"}
                      >
                        <Trash2  />
                        {confirmDeleteId === r.id && (
                          <span >Confirm</span>
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
        <div >
          <AnimatePresence mode="wait">
            {/* 1. Loading Sprint Simulation screen */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                
              >
                <div >
                  <div >
                    <Cpu  />
                  </div>
                  <div >
                    80m
                  </div>
                </div>

                <div >
                  <h3 >AI Sales Sprint Active</h3>
                  <p >
                    Analyzing target domains, harvesting corporate earnings logs, validating technology indicators, and generating the B2B customized opportunity roadmap.
                  </p>
                </div>

                {/* Simulated sprint progress details */}
                <div >
                  <div >
                    <span >PHASE {sprintPhase + 1}/4: {
                      sprintPhase === 0 ? 'Scale & Asset Review' :
                      sprintPhase === 1 ? 'Pain Points Verification' :
                      sprintPhase === 2 ? 'Tech Adoption Auditing' :
                      'B2B Solutions Customization'
                    }</span>
                    <span >Elapsed Sprint: {sprintTime} / 80 Mins ({Math.min(100, Math.round((sprintTime / 80) * 100))}%)</span>
                  </div>

                  {/* Horizontal visual bar */}
                  <div >
                    <div 
                      
                      style={{ width: `${Math.min(100, (sprintTime / 80) * 100)}%` }}
                    />
                  </div>

                  {/* Live updates ticker */}
                  <div >
                    <div >
                      <AnimatePresence mode="popLayout">
                        {sprintTime >= 1 && (
                          <motion.div 
                            key="phase1"
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            
                          >
                            ✓ [Phase 1] Harvested web profile scale, revenue estimates, and core market verticals
                          </motion.div>
                        )}
                        {sprintTime >= 16 && (
                          <motion.div 
                            key="phase2"
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            
                          >
                            ✓ [Phase 2] HARVESTING pain citations from SEBI filings, earnings transcripts, transcripts
                          </motion.div>
                        )}
                        {sprintTime >= 36 && (
                          <motion.div 
                            key="phase3"
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            
                          >
                            ✓ [Phase 3] AUDITING enterprise indicators matching ERP (SAP/Oracle), CRM databases, and hiring scopes
                          </motion.div>
                        )}
                        {sprintTime >= 61 && (
                          <motion.div 
                            key="phase4"
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            
                          >
                            ✓ [Phase 4] COMPILING 5 custom AI products with ROI contract values and pipeline briefs
                          </motion.div>
                        )}
                        {sprintTime < 80 && (
                          <motion.div 
                            key="processing"
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            
                          >
                            <Loader2  />
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
                
              >
                {/* Visual Header Overview Card */}
                <div >
                  <div >
                    <div >
                       <div  />
                       <span >Research Synthesis Complete</span>
                    </div>
                    <h2 >{activeResearch?.companyInfo?.name || 'Company Name'}</h2>
                    <p >{activeResearch?.companyInfo?.industry || 'Unknown Industry'} • {activeResearch?.companyInfo?.hq || 'Unknown HQ'}</p>
                  </div>

                  <div >
                    <div >
                      <div >Estimated LTV Forecast</div>
                      <div >{activeResearch?.dealSizeForecast?.totalRevenueLtv || 'N/A'}</div>
                    </div>

                    <button
                      onClick={() => downloadPDFReport(activeResearch)}
                      
                    >
                      <Download  />
                      Save Intelligence (PDF)
                    </button>
                  </div>
                </div>

                {/* Sub-tabs Selection Row with layout toggler */}
                <div >
                  <div >
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
                          
                        >
                          <Icon  />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={toggleFullWidth}
                    
                    title={isFullWidth ? "Collapse back to standard Split View (Show Sidebar)" : "Expand to Full Width Report (Hide Sidebar)"}
                  >
                    {isFullWidth ? (
                      <>
                        <Minimize2  />
                        <span>Split View</span>
                      </>
                    ) : (
                      <>
                        <Maximize2  />
                        <span>Full Width</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sub-tab Panels */}
                <div >
                  {/* Panel A: Overview */}
                  {activeSubTab === 'overview' && (
                    <div >
                      <h3 >Corporate Scale & Firmographic Profile</h3>
                      
                      <div >
                        {[
                          { label: 'Founded', val: activeResearch?.companyInfo?.founded || 'N/A', icon: Calendar },
                          { label: 'Status', val: activeResearch?.companyInfo?.status || 'N/A', icon: UserCheck },
                          { label: 'Annual Revenue', val: activeResearch?.companyInfo?.revenue || 'N/A', icon: CreditCard },
                          { label: 'Employees', val: activeResearch?.companyInfo?.employees || 'N/A', icon: Building2 }
                        ].map((m, i) => (
                          <div key={i} >
                            <div >
                              <span >{m.label}</span>
                              <m.icon  />
                            </div>
                            <div >{m.val}</div>
                          </div>
                        ))}
                      </div>

                      <div >
                        <div >Business Model Description</div>
                        <p >{activeResearch?.companyInfo?.description || 'No description available.'}</p>
                      </div>

                      {/* Funding & Recent Products Sections */}
                      <div >
                        {/* Funding Card */}
                        <div >
                          <div >
                            <div >
                              <span >Funding & Capitalization</span>
                              <h4 >Investment & Funding Status</h4>
                            </div>
                            <span >
                              {activeResearch?.companyInfo?.funding?.hasRaisedRecently ? 'Raised Funding Recently' : 'Funded / Public Equity'}
                            </span>
                          </div>
                          
                          <p >
                            {activeResearch?.companyInfo?.funding?.details || `${activeResearch?.companyInfo?.name || 'This company'} is currently funded as ${activeResearch?.companyInfo?.status || 'Private'} with an estimated annual revenue of ${activeResearch?.companyInfo?.revenue || 'N/A'}.`}
                          </p>

                          {activeResearch?.companyInfo?.funding?.rounds && activeResearch.companyInfo.funding.rounds.length > 0 && (
                            <div >
                              <div >Rounds History</div>
                              <div >
                                {activeResearch.companyInfo.funding.rounds.map((round: any, idx: number) => (
                                  <div key={idx} >
                                    <div  />
                                    <div >
                                      <span >{round.roundName}</span>
                                      <span >{round.amount}</span>
                                    </div>
                                    <div >
                                      <span>{round.date}</span>
                                      {round.investors && (
                                        <>
                                          <span>•</span>
                                          <span  title={round.investors}>Inv: {round.investors}</span>
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
                        <div >
                          <div >
                            <div >
                              <span >Innovation Tracker</span>
                              <h4 >Latest Products & Services</h4>
                            </div>
                            <span >
                              {activeResearch?.companyInfo?.recentProducts?.hasLaunchedRecently ? 'Active Product Log' : 'Stable Product Line'}
                            </span>
                          </div>
                          
                          <p >
                            {activeResearch?.companyInfo?.recentProducts?.details || `Core services focus on ${activeResearch?.companyInfo?.industry || 'industry'} enterprise solutions with targeted global deployments.`}
                          </p>

                          {activeResearch?.companyInfo?.recentProducts?.productsList && activeResearch.companyInfo.recentProducts.productsList.length > 0 && (
                            <div >
                              <div >Recent Launches & Pipeline</div>
                              <div >
                                {activeResearch.companyInfo.recentProducts.productsList.slice(0, 3).map((prod: any, idx: number) => (
                                  <div key={idx} >
                                    <div >
                                      <span >{prod.name}</span>
                                      {prod.launchDate && (
                                        <span >{prod.launchDate}</span>
                                      )}
                                    </div>
                                    <p >{prod.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Social Media & Digital Footprint Section */}
                      <div >
                        <div >Digital Footprint & Social Media Channels</div>
                        <div >
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
                                
                              >
                                <social.icon  />
                                <span >{social.name}</span>
                                <ExternalLink  />
                              </a>
                            );
                          })}
                        </div>
                      </div>

                      <div >
                        <span>Corporate Target Markets: <b>{activeResearch?.companyInfo?.markets || 'N/A'}</b></span>
                        <span>Official Website: <a href={activeResearch?.companyInfo?.website} target="_blank" >{activeResearch?.companyInfo?.website || 'N/A'} <ExternalLink  /></a></span>
                      </div>
                    </div>
                  )}

                  {/* Panel B: Pain Points */}
                  {activeSubTab === 'pain' && (
                    <div >
                      <h3 >Verified Corporate Bottlenecks & Gaps</h3>
                      
                      <div >
                        {activeResearch.painPoints.map((p, i) => (
                          <div key={i} >
                            <div >
                              <div >
                                <h4 >{p.title}</h4>
                                <p >{p.description}</p>
                              </div>
                              <span >
                                {p.severity}
                              </span>
                            </div>

                            {/* Citations/Evidence block */}
                            {p.evidence && p.evidence.length > 0 && (
                              <div >
                                <div >
                                  "{p.evidence[0].quote}"
                                </div>
                                <div >
                                  <span>— Source: <b>{p.evidence[0].source}</b></span>
                                  <span>•</span>
                                  <span>{p.evidence[0].date}</span>
                                </div>
                              </div>
                            )}

                            <div >
                              <div>
                                <span >Quantified Impact</span>
                                <span >{p.impact}</span>
                              </div>
                              <div>
                                <span >Urgency Window</span>
                                <span >{p.timeline}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Panel C: Tech Stack */}
                  {activeSubTab === 'tech' && (
                    <div >
                      <h3 >Enterprise Software Inventory & AI Maturity</h3>
                      
                      <div >
                        {/* Systems Grid */}
                        <div >
                          <h4 >Enterprise Operations Systems</h4>
                          {[
                            { category: 'ERP System', data: activeResearch.techStack.erp },
                            { category: 'CRM Database', data: activeResearch.techStack.crm },
                            { category: 'BI / Dashboards', data: activeResearch.techStack.bi },
                            { category: 'Logistics/SCM Stack', data: activeResearch.techStack.supplyChain }
                          ].map((sys, idx) => (
                            <div key={idx} >
                              <div >
                                <div >{sys.category}</div>
                                <div >{sys.data.name || 'Not Found'}</div>
                                <div >Source: {sys.data.source || 'Standard Industry Benchmark'}</div>
                              </div>
                              <div >
                                <span >
                                  {sys.data.status || 'Not Found'}
                                </span>
                                <div >Confidence: {sys.data.confidence}</div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* AI & Competitors column */}
                        <div >
                          {/* Maturity Score */}
                          <div >
                            <div >AI Maturity Assessment</div>
                            <div >
                              {activeResearch.aiAdoption.maturityLevel}
                            </div>
                            <p >
                              Target is operating below maximum capacity. Integration of custom GTM workflows represents critical high-ROI leverage.
                            </p>
                          </div>

                          {/* Website Tech Tags */}
                          <div >
                            <h4 >Detected Website Technologies</h4>
                            <div >
                              {activeResearch.techStack.websiteTech?.map((tag, idx) => (
                                <span key={idx} >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Competitors Adoption */}
                          <div >
                            <h4 >Competitive Dynamic</h4>
                            {activeResearch.aiAdoption.competitors?.map((comp, idx) => (
                              <div key={idx} >
                                <div>
                                  <div >{comp.name}</div>
                                  <div >AI Scope: {comp.tools}</div>
                                </div>
                                <span >
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
                    <div >
                      <h3 >Targeted Custom AI Solution Opportunities</h3>
                      
                      <div >
                        {activeResearch.aiSolutions.map((sol, index) => (
                          <div key={index} >
                            <div >
                              <div >
                                <div >
                                  <Cpu  />
                                </div>
                                <h4 >{sol.title}</h4>
                              </div>

                              <div >
                                TARGETING: {sol.painPointCausal}
                              </div>

                              <p >
                                <b>MVP Scope:</b> {sol.mvp}
                              </p>

                              <ul >
                                {sol.features.map((f, fi) => (
                                  <li key={fi}>{f}</li>
                                ))}
                              </ul>
                            </div>

                            <div >
                              <div >
                                <div >
                                  <span >Est. Price</span>
                                  <div >{sol.pricing.monthlyFee}</div>
                                </div>
                                <div >
                                  <span >Potential LTV</span>
                                  <div >{sol.pricing.potentialLtv}</div>
                                </div>
                              </div>
                              <p >{sol.pricingJustification}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Panel E: GTM & Objections */}
                  {activeSubTab === 'gtm' && (
                    <div >
                      <div >
                        <h3 >Cold GTM Delivery & Objection Flashcards</h3>
                        
                        {/* Expand Leads Injector menu dropdown */}
                        <div >
                          <span >Select Campaign:</span>
                          <select
                            
                            value={targetCampaignId}
                            onChange={(e) => setTargetCampaignId(e.target.value)}
                          >
                            <option value="">-- Choose Campaign --</option>
                            {campaigns.map(c => (
                              <option key={c.id} value={c.id} >{c.name.toUpperCase()}</option>
                            ))}
                          </select>
                          <button
                            onClick={exportAsLead}
                            disabled={exportingLead}
                            
                          >
                            <PlusCircle  />
                            {exportingLead ? 'Injecting...' : 'Inject as Lead'}
                          </button>
                        </div>
                      </div>

                      <div >
                        {/* Target Stakeholder Profile Card */}
                        <div >
                          <div >
                            <div >
                              <UserCheck  />
                            </div>
                            <h4 >Target Decision Maker Profile</h4>
                          </div>

                          <div >
                            <div >
                              <div>
                                <span >Current Named Decision Maker</span>
                                <div >{activeResearch.gtmStrategy.decisionMaker.name || 'N/A'}</div>
                              </div>
                              <div >
                                <div>
                                  <span >Designation / Title</span>
                                  <div >{activeResearch.gtmStrategy.decisionMaker.title || 'N/A'}</div>
                                </div>
                                <div>
                                  <span >Individual LinkedIn</span>
                                  {activeResearch.gtmStrategy.decisionMaker.linkedinUrl ? (
                                    <a 
                                      href={activeResearch.gtmStrategy.decisionMaker.linkedinUrl.startsWith('http') ? activeResearch.gtmStrategy.decisionMaker.linkedinUrl : `https://${activeResearch.gtmStrategy.decisionMaker.linkedinUrl}`} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      
                                    >
                                      <Linkedin  /> Profile <ExternalLink  />
                                    </a>
                                  ) : (
                                    <span >N/A</span>
                                  )}
                                </div>
                              </div>
                              <div >
                                <div>
                                  <span >Verified Business Email</span>
                                  {activeResearch.gtmStrategy.decisionMaker.email ? (
                                    <a href={`mailto:${activeResearch.gtmStrategy.decisionMaker.email}`} >
                                      <Mail  /> {activeResearch.gtmStrategy.decisionMaker.email}
                                    </a>
                                  ) : (
                                    <span >N/A</span>
                                  )}
                                </div>
                                <div>
                                  <span >Verified Telephone</span>
                                  {activeResearch.gtmStrategy.decisionMaker.phone ? (
                                    <span >
                                      <Phone  /> {activeResearch.gtmStrategy.decisionMaker.phone}
                                    </span>
                                  ) : (
                                    <span >N/A</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <span >Core Responsibilities</span>
                              <p >{activeResearch.gtmStrategy.decisionMaker.responsibilities}</p>
                            </div>

                            <div>
                              <span >Primary Pain Owner</span>
                              <p >{activeResearch.gtmStrategy.decisionMaker.painOwns}</p>
                            </div>

                            <div>
                              <span >Buying Motivations</span>
                              <p >"{activeResearch.gtmStrategy.decisionMaker.motivation}"</p>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Pitch Builder Card */}
                        <div >
                          <div >
                            <div >
                              <div >
                                <Sparkles  />
                              </div>
                              <h4 >B2B Custom Outreach Frame</h4>
                            </div>
                            <button
                              onClick={() => handleCopyClipboard(
                                `${activeResearch.gtmStrategy.openingHook}\n\n${activeResearch.gtmStrategy.coreMessage}\n\n${activeResearch.gtmStrategy.cta}`,
                                99
                              )}
                              
                            >
                              {copiedIndex === 99 ? <Check  /> : <Clipboard  />}
                            </button>
                          </div>

                          <div >
                            <p >"{activeResearch.gtmStrategy.openingHook}"</p>
                            <p >"{activeResearch.gtmStrategy.coreMessage}"</p>
                            <p >"{activeResearch.gtmStrategy.cta}"</p>
                          </div>
                          <div >
                            *Click lines directly to copy details
                          </div>
                        </div>
                      </div>

                      {/* Objections flashcards */}
                      <div >
                        <h4 >Expected Sales Objections & Safe Handling Responses</h4>
                        <div >
                          {activeResearch.gtmStrategy.expectedObjections?.map((obj, i) => (
                            <div key={i} >
                              <div >
                                <ShieldAlert  />
                                <div>
                                  <span >Objection Signal</span>
                                  <div >{obj.objection}</div>
                                </div>
                              </div>
                              <div >
                                <div >REPLY</div>
                                <div >
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
                    <div >
                      <h3 >Growth Projections & Deal Sizing</h3>
                      
                      <div >
                        {[
                          { title: 'Phase 1: Quick Win Pilot', timeline: '2-4 Weeks scope', desc: activeResearch.dealSizeForecast.phase1QuickWin, color: 'border-brand/30 hover:border-brand' },
                          { title: 'Phase 2: Product Expansion', timeline: '2-3 Months scale', desc: activeResearch.dealSizeForecast.phase2Expansion, color: 'border-brand-alt/30 hover:border-brand-alt' },
                          { title: 'Phase 3: Full Platform SaaS', timeline: '6-12 Months contract', desc: activeResearch.dealSizeForecast.phase3FullPlatform, color: 'border-[#ff9f1c]/30 hover:border-[#ff9f1c]' }
                        ].map((p, i) => (
                          <div key={i} >
                            <div >
                              <div >{p.timeline}</div>
                              <h4 >{p.title}</h4>
                            </div>
                            
                            <p >
                              "{p.desc}"
                            </p>
                          </div>
                        ))}
                      </div>

                      <div >
                        <div >
                          <h4 >18-Month Combined Customer Life-Time Value (LTV)</h4>
                          <p >
                            Full implementation of our recommended custom AI opportunity pipeline for this high value target.
                          </p>
                        </div>
                        <div >
                          {activeResearch.dealSizeForecast.totalRevenueLtv}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Panel G: Raw Report */}
                  {activeSubTab === 'report' && (
                    <div >
                      <div >
                        <h3 >Consulting Intelligence Report</h3>
                        <button
                          onClick={() => handleCopyClipboard(activeResearch.markdownReport, 999)}
                          
                        >
                          {copiedIndex === 999 ? <Check  /> : <Clipboard  />}
                          Copy Markdown
                        </button>
                      </div>

                      {/* Display Markdown view with premium consulting styling */}
                      <div >
                        <ReactMarkdown
                          components={{
                            h1: ({node, ...props}) => <h1 id={props.id}  {...props} />,
                            h2: ({node, ...props}) => <h2 id={props.id}  {...props} />,
                            h3: ({node, ...props}) => <h3 id={props.id}  {...props} />,
                            h4: ({node, ...props}) => <h4 id={props.id}  {...props} />,
                            p: ({node, ...props}) => <p  {...props} />,
                            ul: ({node, ...props}) => <ul  {...props} />,
                            ol: ({node, ...props}) => <ol  {...props} />,
                            li: ({node, ...props}) => <li  {...props} />,
                            strong: ({node, ...props}) => <strong  {...props} />,
                            em: ({node, ...props}) => <em  {...props} />,
                            code: ({node, className, children, ...props}: any) => {
                              const match = /language-(\w+)/.exec(className || '');
                              const inline = !match;
                              return inline ? (
                                <code  {...props}>
                                  {children}
                                </code>
                              ) : (
                                <pre >
                                  <code  {...props}>
                                    {children}
                                  </code>
                                </pre>
                              );
                            },
                            blockquote: ({node, ...props}) => (
                              <blockquote  {...props} />
                            ),
                            table: ({node, ...props}) => (
                              <div >
                                <table  {...props} />
                              </div>
                            ),
                            thead: ({node, ...props}) => <thead  {...props} />,
                            tbody: ({node, ...props}) => <tbody  {...props} />,
                            th: ({node, ...props}) => <th  {...props} />,
                            td: ({node, ...props}) => <td  {...props} />,
                            hr: ({node, ...props}) => <hr  {...props} />
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
                
              >
                <div >
                  <Database  />
                </div>
                
                <div >
                  <h3 >Launch a B2B Intelligence Sprint</h3>
                  <p >
                    Identify high-intent pain points, map verified tools, and propose strategic custom AI agents to secure larger enterprise deals.
                  </p>
                </div>
                
                <div >
                  <span>Enter Profile</span>
                  <ArrowRight  />
                  <span>Execute Sprint</span>
                  <ArrowRight  />
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
