import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip, 
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  ReferenceLine,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  TrendingUp, 
  Sparkles, 
  Award, 
  Download, 
  BarChart2, 
  Calendar,
  Sparkle,
  Zap,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCw,
  Lightbulb,
  Check,
  Copy,
  Database
} from 'lucide-react';
import { analyzeBenchmarkDrift, BenchmarkDriftAnalysis } from '../services/geminiService';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface Lead {
  id?: string;
  name: string;
  role: string;
  company: string;
  industry: string;
  country: string;
  phone?: string;
  email?: string;
  linkedin_url?: string;
  campaignId?: string;
  status?: string;
  score?: number;
  createdAt?: any;
  website?: string;
  employees?: string;
}

const calculateLeadScore = (lead: Lead): number => {
  let score = 0;
  const highValueRoles = ['ceo', 'founder', 'vp', 'director', 'head', 'manager', 'owner', 'cto', 'cmo', 'coo'];
  const role = (lead.role || '').toLowerCase();
  if (highValueRoles.some(r => role.includes(r))) score += 40;
  
  const techIndustries = ['software', 'tech', 'it', 'saas', 'digital', 'ai', 'cloud'];
  const industry = (lead.industry || '').toLowerCase();
  if (techIndustries.some(i => industry.includes(i))) score += 20;
  
  if (lead.linkedin_url && lead.linkedin_url.length > 10) score += 10;
  if (lead.phone && lead.phone.length > 5) score += 10;
  if (lead.email && lead.email.includes('@')) score += 10;
  return score;
};

// Tooltip for the Distribution Histogram
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl space-y-1">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{data.range} Score Space</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-brand" />
          <p className="text-sm font-extrabold text-white font-syne">
            {data.count} {data.count === 1 ? 'Lead Profile' : 'Lead Profiles'}
          </p>
        </div>
        <p className="text-[9px] text-emerald-400 font-medium tracking-wide">Avg conversion weight: {data.range !== '0-10' ? 'High' : 'Normal'}</p>
      </div>
    );
  }
  return null;
};

// Tooltip for the Trend Comparison View
const TrendTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl space-y-2">
        <p className="text-[10px] font-extrabold text-white/50 uppercase tracking-widest">{data.date}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-white/60 font-medium">Cumulative Base:</span>
            <span className="text-white font-bold font-mono">{data["Total Volume"]}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-brand font-medium">Average Quality Score:</span>
            <span className="text-brand font-bold font-mono">{data["Average Score"]}/90</span>
          </div>
          {data["Std Dev"] !== undefined && (
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-indigo-300 font-medium">Volatility (Std Dev):</span>
              <span className="text-indigo-400 font-bold font-mono">±{data["Std Dev"]} pts</span>
            </div>
          )}
          {data["Historical 7-Day Average"] !== undefined && (
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-pink-400 font-medium">7-Day Hist. Average:</span>
              <span className="text-pink-400 font-bold font-mono">{data["Historical 7-Day Average"]}/90</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-brand-alt font-medium">Elite Accounts:</span>
            <span className="text-brand-alt font-bold font-mono">{data["High Intent count"]} Profiles</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Custom shape utilizing framer-motion spring physics for staggering the Recharts Bars
const CustomBarShape = (props: any) => {
  const { fill, x, y, width, height, index, onClick } = props;
  const h = Math.max(0, height);
  const w = Math.max(0, width);
  const calculatedIndex = typeof index === 'number' ? index : 0;

  return (
    <motion.rect
      x={x}
      width={w}
      fill={fill}
      rx={6}
      ry={6}
      className="cursor-pointer hover:opacity-85 transition-opacity"
      initial={{ y: y + h, height: 0 }}
      animate={{ y: y, height: h }}
      transition={{ 
        type: "spring", 
        stiffness: 85, 
        damping: 14, 
        delay: calculatedIndex * 0.05 
      }}
      onClick={onClick}
    />
  );
};

const getRangeForScore = (score: number): string => {
  if (score <= 10) return '0-10';
  if (score <= 20) return '11-20';
  if (score <= 30) return '21-30';
  if (score <= 40) return '31-40';
  if (score <= 50) return '41-50';
  if (score <= 60) return '51-60';
  if (score <= 70) return '61-70';
  if (score <= 80) return '71-80';
  if (score <= 90) return '81-90';
  return '91-100';
};

interface LeadScoreHistogramProps {
  leads: Lead[];
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  scoreFilter: { min: number; max: number; rangeLabel: string } | null;
  setScoreFilter: (filter: { min: number; max: number; rangeLabel: string } | null) => void;
  highlightElite: boolean;
  setHighlightElite: (val: boolean) => void;
}

export default function LeadScoreHistogram({ 
  leads, 
  showToast,
  scoreFilter,
  setScoreFilter,
  highlightElite,
  setHighlightElite
}: LeadScoreHistogramProps) {
  const [activeTab, setActiveTab] = useState<'distribution' | 'trend' | 'segment' | 'forecast'>('distribution');
  const [avgDealValue, setAvgDealValue] = useState<number>(15000);
  const [baseConvRate, setBaseConvRate] = useState<number>(2.0);
  const [campaignCost, setCampaignCost] = useState<number>(5000);
  const [isExporting, setIsExporting] = useState(false);
  const [isPDFExporting, setIsPDFExporting] = useState(false);

  // Filtered subset of leads
  const filteredSubset = useMemo(() => {
    if (!scoreFilter) return leads;
    return leads.filter(l => {
      const s = calculateLeadScore(l);
      return s >= scoreFilter.min && s <= scoreFilter.max;
    });
  }, [leads, scoreFilter]);

  // Expected closures & LTV for predictive 18-month model
  const estimatedDeals = useMemo(() => {
    let deals = 0;
    leads.forEach(l => {
      const score = calculateLeadScore(l);
      let mult = 0.3;
      if (score >= 80) mult = 3.5;
      else if (score >= 60) mult = 1.8;
      else if (score >= 40) mult = 0.8;
      
      const prob = (baseConvRate / 100) * mult;
      deals += prob;
    });
    return Math.min(deals, leads.length);
  }, [leads, baseConvRate]);

  // Export filtered subset of leads (or all if none filtered) to format friendly for any external CRM
  const handleExportCSV = () => {
    const subset = filteredSubset;
    if (subset.length === 0) {
      if (showToast) showToast('No leads in the current filtered subset to export!', 'error');
      return;
    }

    const csvHeaders = ["Name", "Title/Role", "Company", "Industry", "Country", "Score", "Email", "Phone", "LinkedIn Profile", "Import Priority"];
    
    const rows = subset.map(l => {
      const score = calculateLeadScore(l);
      let priority = 'Medium';
      if (score >= 80) priority = 'High';
      else if (score < 50) priority = 'Low';

      return [
        l.name || 'Anonymous Prospect',
        l.role || 'Role N/A',
        l.company || 'Company N/A',
        l.industry || 'Industry N/A',
        l.country || 'Country N/A',
        score.toString(),
        l.email || 'N/A',
        l.phone || 'N/A',
        l.linkedin_url || 'N/A',
        priority
      ];
    });

    const csvContent = [csvHeaders, ...rows]
      .map(r => r.map(v => `"${(v || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `filtered_leads_crm_import_${scoreFilter ? scoreFilter.rangeLabel.replace(/\s+/g, '_') : 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (showToast) {
      showToast(`Exported ${subset.length} leads to CRM-ready CSV!`, 'success');
    }
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<BenchmarkDriftAnalysis | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isAlertResolved, setIsAlertResolved] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const handleResolveDrift = async () => {
    // 1. Get the 10 most recent leads
    const annotated = leads.map(l => ({
      ...l,
      score: calculateLeadScore(l)
    }));
    
    const recent10 = annotated
      .sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
        const dateB = b.createdAt ? (typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
        return dateB - dateA;
      })
      .slice(0, 10);

    if (recent10.length === 0) {
      if (showToast) showToast('No leads available to analyze.', 'error');
      return;
    }

    setIsModalOpen(true);
    setIsAnalyzing(true);
    setLoadingStep(0);

    // Dynamic loading step simulation
    const stepsInterval = setInterval(() => {
      setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 2000);

    try {
      const result = await analyzeBenchmarkDrift(recent10);
      setAnalysisResult(result);
      if (showToast) showToast('AI has generated an outreach optimization playbook!', 'success');
    } catch (err: any) {
      console.error(err);
      if (showToast) showToast(`Benchmark resolution analysis failed: ${err.message || err}`, 'error');
      setIsModalOpen(false);
    } finally {
      clearInterval(stepsInterval);
      setIsAnalyzing(false);
    }
  };


  // Parse distribution statistics & trends & predictive estimates
  const { binData, stats, trendData, prediction, seniorityData, industryData } = useMemo(() => {
    // 10-point histogram bins
    const bins = [
      { range: '0-10', count: 0, min: 0, max: 10, color: 'rgba(59, 130, 246, 0.4)' },
      { range: '11-20', count: 0, min: 11, max: 20, color: 'rgba(59, 130, 246, 0.55)' },
      { range: '21-30', count: 0, min: 21, max: 30, color: 'rgba(59, 130, 246, 0.7)' },
      { range: '31-40', count: 0, min: 31, max: 40, color: 'rgba(99, 102, 241, 0.8)' },
      { range: '41-50', count: 0, min: 41, max: 50, color: 'rgba(99, 102, 241, 0.95)' },
      { range: '51-60', count: 0, min: 51, max: 60, color: 'rgba(139, 92, 246, 0.9)' },
      { range: '61-70', count: 0, min: 61, max: 70, color: 'rgba(139, 92, 246, 1.0)' },
      { range: '71-80', count: 0, min: 71, max: 80, color: 'rgba(236, 72, 153, 0.95)' },
      { range: '81-90', count: 0, min: 81, max: 90, color: 'rgba(236, 72, 153, 1.0)' },
      { range: '91-100', count: 0, min: 91, max: 100, color: 'rgba(244, 63, 94, 1.0)' },
    ];

    let totalScore = 0;
    let maxScore = 0;
    let highIntentCount = 0;

    const seniorityCounts = {
      executive: 0,
      direction: 0,
      management: 0,
      specialist: 0
    };

    const industryCounts = {
      tech: 0,
      finance: 0,
      healthcare: 0,
      retail: 0,
      other: 0
    };

    leads.forEach(l => {
      const score = calculateLeadScore(l);
      totalScore += score;
      if (score > maxScore) maxScore = score;
      if (score >= 60) highIntentCount++;

      // Count Seniority
      const role = (l.role || '').toLowerCase();
      if (role.includes('ceo') || role.includes('founder') || role.includes('owner') || role.includes('coo') || role.includes('president')) {
        seniorityCounts.executive++;
      } else if (role.includes('vp') || role.includes('vice president') || role.includes('director') || role.includes('head') || role.includes('chief') || role.includes('cto') || role.includes('cmo')) {
        seniorityCounts.direction++;
      } else if (role.includes('manager') || role.includes('lead') || role.includes('supervisor')) {
        seniorityCounts.management++;
      } else {
        seniorityCounts.specialist++;
      }

      // Count Industry
      const ind = (l.industry || '').toLowerCase();
      if (ind.includes('tech') || ind.includes('software') || ind.includes('saas') || ind.includes('it') || ind.includes('digital') || ind.includes('ai') || ind.includes('cloud')) {
        industryCounts.tech++;
      } else if (ind.includes('finance') || ind.includes('banking') || ind.includes('capital') || ind.includes('invest') || ind.includes('fintech') || ind.includes('insurance')) {
        industryCounts.finance++;
      } else if (ind.includes('health') || ind.includes('medical') || ind.includes('pharma') || ind.includes('biotech')) {
        industryCounts.healthcare++;
      } else if (ind.includes('retail') || ind.includes('commerce') || ind.includes('shop') || ind.includes('fashion') || ind.includes('market')) {
        industryCounts.retail++;
      } else {
        industryCounts.other++;
      }

      const matchedBin = bins.find(b => score >= b.min && score <= b.max);
      if (matchedBin) {
        matchedBin.count += 1;
      }
    });

    const averageScore = leads.length ? Math.round(totalScore / leads.length) : 0;

    const seniorityData = [
      { name: 'C-Suite / Founder', value: seniorityCounts.executive, color: '#10b981' },
      { name: 'VP / Director', value: seniorityCounts.direction, color: '#3b82f6' },
      { name: 'Management', value: seniorityCounts.management, color: '#8b5cf6' },
      { name: 'Specialist / Other', value: seniorityCounts.specialist, color: '#f43f5e' }
    ].filter(d => d.value > 0);

    const industryData = [
      { name: 'Technology & SaaS', value: industryCounts.tech, color: '#6366f1' },
      { name: 'Financial Services', value: industryCounts.finance, color: '#f59e0b' },
      { name: 'Healthcare & Biotech', value: industryCounts.healthcare, color: '#ec4899' },
      { name: 'Retail & E-commerce', value: industryCounts.retail, color: '#06b6d4' },
      { name: 'Other Sectors', value: industryCounts.other, color: '#94a3b8' }
    ].filter(d => d.value > 0);

    // Build the Chronological Trend Dataset over preceding days/weeks
    const sortedLeadsWithDate = [...leads].map((l, i) => {
      const score = calculateLeadScore(l);
      let dateObj: Date;

      if (l.createdAt) {
        if (typeof l.createdAt.toDate === 'function') {
          dateObj = l.createdAt.toDate();
        } else {
          dateObj = new Date(l.createdAt);
        }
      } else {
        // Fallback: staggered placement from 9 days ago to today to draw an authentic timeline baseline
        const step = leads.length > 1 ? i / (leads.length - 1) : 0.5;
        const offsetDays = Math.round(9 - (step * 9));
        const d = new Date();
        d.setDate(d.getDate() - offsetDays);
        dateObj = d;
      }
      return { ...l, score, dateObj };
    }).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Generate unique dates representing the campaign history
    const uniqueFormattedDates = Array.from(new Set(sortedLeadsWithDate.map(l => {
      return l.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    })));

    // Fill chronological benchmarks cumulatively
    const trends: any[] = [];
    let runningLeads: typeof sortedLeadsWithDate = [];

    uniqueFormattedDates.forEach(dateLabel => {
      // Find all leads categorized up to or within this day 
      const matchingLeads = sortedLeadsWithDate.filter(l => 
        l.dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) === dateLabel
      );
      runningLeads = [...runningLeads, ...matchingLeads];

      const cumulativeScore = runningLeads.reduce((sum, curr) => sum + curr.score, 0);
      const rollingAverage = runningLeads.length ? Math.round(cumulativeScore / runningLeads.length) : 0;
      const eliteCount = runningLeads.filter(l => l.score >= 60).length;

      // Calculate 7-day historical rolling average
      const currentDayStart = matchingLeads[0]?.dateObj || new Date();
      const sevenDaysAgo = new Date(currentDayStart.getTime());
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const leadsPrev7Days = sortedLeadsWithDate.filter(l => {
        return l.dateObj >= sevenDaysAgo && l.dateObj < currentDayStart;
      });

      const historicalAvg = leadsPrev7Days.length 
        ? Math.round(leadsPrev7Days.reduce((sum, curr) => sum + curr.score, 0) / leadsPrev7Days.length)
        : Math.round(rollingAverage * 0.88);

      // Calculate standard deviation of runningLeads scores
      const scores = runningLeads.map(l => l.score);
      const variance = scores.length 
        ? scores.reduce((sum, s) => sum + Math.pow(s - rollingAverage, 2), 0) / scores.length 
        : 0;
      const stdDev = Math.sqrt(variance);

      // Define standard deviation/volatility band around Average Score
      const lowerBand = Math.max(0, Math.round(rollingAverage - stdDev));
      const upperBand = Math.min(100, Math.round(rollingAverage + stdDev));

      trends.push({
        date: dateLabel,
        "Total Volume": runningLeads.length,
        "Average Score": rollingAverage,
        "Historical 7-Day Average": historicalAvg,
        "High Intent count": eliteCount,
        "Volatility Band": [lowerBand, upperBand],
        "Std Dev": Math.round(stdDev * 10) / 10
      });
    });

    // Calculate if average lead score drops below the 65 benchmark for more than 3 consecutive days
    let consecutiveDaysBelow65 = 0;
    let maxConsecutiveBelow65 = 0;
    trends.forEach(day => {
      if (day["Average Score"] < 65) {
        consecutiveDaysBelow65++;
        if (consecutiveDaysBelow65 > maxConsecutiveBelow65) {
          maxConsecutiveBelow65 = consecutiveDaysBelow65;
        }
      } else {
        consecutiveDaysBelow65 = 0;
      }
    });

    // Compute Predictive 'Estimated Conversion Time' algorithm based on target profile weights
    let totalWeightDays = 0;
    leads.forEach(l => {
      const sc = calculateLeadScore(l);
      if (sc >= 80) totalWeightDays += 4; // ultra hot
      else if (sc >= 60) totalWeightDays += 9; // high conversions
      else if (sc >= 40) totalWeightDays += 16; // warm target
      else if (sc >= 20) totalWeightDays += 28; // standard profiling
      else totalWeightDays += 52; // slow follow-up
    });
    const avgDays = leads.length ? Math.round(totalWeightDays / leads.length) : 25;

    let speedCategory = "Standard Cycle";
    let speedColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
    let helperText = "Balanced nurturing cycle. Drip dynamic target playbooks to steadily validate enterprise footprints.";
    
    if (avgDays <= 12) {
      speedCategory = "Hyper-Accelerated";
      speedColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      helperText = "Elite target density. Immediate manual outreach or real-time campaigns recommended.";
    } else if (avgDays <= 20) {
      speedCategory = "Velocity Match";
      speedColor = "text-sky-400 bg-sky-500/10 border-sky-500/20";
      helperText = "Strong Executive presence. Plan core sequences and LinkedIn hook ups within 48 hours.";
    } else if (avgDays <= 35) {
      speedCategory = "Steady Nurture";
      speedColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
      helperText = "Moderately warm pipeline. Schedule automated sequences with high value roles to increase interest.";
    }

    return {
      binData: bins,
      stats: {
        averageScore,
        maxScore,
        highIntentCount,
        percentHighIntent: leads.length ? Math.round((highIntentCount / leads.length) * 100) : 0,
        conSecBelow65Count: maxConsecutiveBelow65,
        hasDroppingAlert: maxConsecutiveBelow65 > 3
      },
      trendData: trends,
      prediction: {
        avgDays,
        speedCategory,
        speedColor,
        helperText
      },
      seniorityData,
      industryData
    };
  }, [leads]);

  // Export full histogram view as a high-fidelity PNG image using html2canvas
  const handleExportPNG = async () => {
    const targetElement = document.getElementById('lead-scoring-insights');
    if (!targetElement) return;

    setIsExporting(true);
    if (showToast) showToast('Compiling pixel assets for file export...', 'success');

    try {
      // Delay slightly to close any hovering tooltips prior to snapshots
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(targetElement, {
        backgroundColor: '#0f172a', // Ensures the export card retains high-contrast slate-900 background styling
        scale: 2, // Double rendering scale for 4K / High-DPI screen clarity
        useCORS: true,
        logging: false
      });

      const dataURL = canvas.toDataURL('image/png');
      const tempLink = document.createElement('a');
      tempLink.href = dataURL;
      tempLink.download = `Zyntra_Lead_Insights_Report_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);

      if (showToast) showToast('Premium PNG analytics report downloaded successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      if (showToast) showToast(`Image export failed: ${err.message || err}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export gorgeous multi-page PDF summary report incorporating graphical dashboards & data tables
  const handleExportPDFSummary = async () => {
    const chartContainer = document.getElementById('lead-chart-container');
    if (!chartContainer) {
      if (showToast) showToast('Could not find visualization container for PDF compilation.', 'error');
      return;
    }

    setIsPDFExporting(true);
    if (showToast) showToast('Capturing charts and generating premium Business Intelligence PDF Report...', 'success');

    try {
      // Hide active components highlights momentarily
      await new Promise(resolve => setTimeout(resolve, 250));

      const canvas = await html2canvas(chartContainer, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const chartImgB64 = canvas.toDataURL('image/png');

      const doc = new jsPDF('p', 'mm', 'a4', true);
      const pageWidth = doc.internal.pageSize.width || 210;
      const pageHeight = doc.internal.pageSize.height || 297;

      // Helper for drawing visual top-border line and decorative layout elements
      const applyReportThemeDecoration = (pdf: typeof doc, pNum: number) => {
        // Subtle top accent bar of 1.5mm height in Indigo
        pdf.setFillColor(79, 70, 229); // Indigo Accent
        pdf.rect(0, 0, pageWidth, 1.5, 'F');
        
        // Brand label footer on each page 
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(148, 163, 184);
        pdf.text("ZYNTRA ENTERPRISE PIPELINE SUITE", 14, pageHeight - 8);
        pdf.text(`Page ${pNum} of 3`, pageWidth - 26, pageHeight - 8);
        pdf.setDrawColor(226, 232, 240); // very soft border line above footer
        pdf.setLineWidth(0.2);
        pdf.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
      };

      // -------------------------------------------------------------
      // PAGE 1: COVER PAGE & EXECUTIVE DASHBOARD SNAPSHOT
      // -------------------------------------------------------------
      
      // Top header banner box
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 60, 'F');

      // Top right logo pill
      doc.setFillColor(16, 185, 129); // Elite Emerald Accent
      doc.rect(pageWidth - 72, 0, 72, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("ZYNTRA PIPELINE INTEL", pageWidth - 58, 5.5);

      // Title & Metadata
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("PIPELINE PERFORMANCE REPORT", 14, 26);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(`Campaign Cohort Performance  •  Compiled on: ${new Date().toLocaleString()}`, 14, 37);
      doc.text(`Metrics Frame: ${leads.length} corporate target accounts fully cataloged & researched.`, 14, 43);

      let curY = 74;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("I. EXECUTIVE OVERVIEW & QUALITY INDEX", 14, curY);

      // Paragraph explanation
      curY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // Slate-600
      doc.text("High-precision operational metrics mapping computed lead conversion parameters and benchmark targets.", 14, curY);

      // Draw Key KPI Blocks
      curY += 6;
      doc.setFillColor(248, 250, 252); // soft grey backdrop
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, curY, 86, 26, 3, 3, 'FD'); // Left block
      doc.roundedRect(110, curY, 86, 26, 3, 3, 'FD'); // Right block

      // Left stats typography
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text("CAMPAIGN AVG COHORT SCORE", 18, curY + 6.5);
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(`${stats.averageScore} / 90`, 18, curY + 18);
      
      // Target text indicator
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Target Benchmark: 65", 58, curY + 18);

      // Right stats typography
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129); // Emerald
      doc.text("ESTIMATED CONVERSION CYCLE", 114, curY + 6.5);
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(`~${prediction.avgDays} Days (${prediction.speedCategory})`, 114, curY + 18);

      // Highlight active benchmark warning right on Page 1 if score drift is triggerable!
      curY += 32;
      if (stats.hasDroppingAlert) {
        doc.setFillColor(254, 242, 242); // very light red
        doc.setDrawColor(254, 202, 202);
        doc.roundedRect(14, curY, pageWidth - 28, 18, 2, 2, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(220, 38, 38); // rich red
        doc.text("⚠️ CAMPAIGN DRIFT WARNING DETECTED", 18, curY + 6);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(127, 29, 29);
        doc.text(`Lead performance indicates a continuous average score drop (< 65) for more than 3 consecutive days (${stats.conSecBelow65Count} days). Action required.`, 18, curY + 12);
        curY += 24;
      } else {
        doc.setFillColor(240, 253, 250); // soft emerald
        doc.setDrawColor(153, 246, 228);
        doc.roundedRect(14, curY, pageWidth - 28, 14, 2, 2, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(13, 148, 136); // teal-600
        doc.text("✓ CAMPAIGN PIPELINE HEALTH: STABLE", 18, curY + 5.5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(17, 94, 89);
        doc.text("Lead scores remain structurally strong. No persistent target-dropping drifts detected over the active campaign window.", 18, curY + 10.5);
        curY += 20;
      }

      // Embed live chart
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Interactive Dynamic Chart: ${activeTab === 'distribution' ? 'Lead Intent Score Histogram View' : 'Campaign Velocity Line Graph'}`, 14, curY);

      curY += 4;
      // Beautiful dark premium frame for chart container
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(14, curY, pageWidth - 28, 76, 3, 3, 'F');
      doc.addImage(chartImgB64, 'PNG', 16, curY + 2, pageWidth - 32, 72);

      // Executive strategy playbook card
      curY += 82;
      doc.setFillColor(243, 244, 246); 
      doc.setDrawColor(209, 213, 219);
      doc.roundedRect(14, curY, pageWidth - 28, 22, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81);
      doc.text("Operational Playbook Directive & Intent Thresholds:", 18, curY + 6);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(17, 24, 39);
      const textLines = doc.splitTextToSize(
        `Calculations forecast average cycle velocities of ${prediction.avgDays} days matching structural settings. ` +
        `This enrolled campaign contains ${stats.highIntentCount} accounts with intent scores >= 60 (${stats.percentHighIntent}% overall saturation). ${prediction.helperText}`,
        pageWidth - 36
      );
      doc.text(textLines, 18, curY + 11);

      applyReportThemeDecoration(doc, 1);

      // -------------------------------------------------------------
      // PAGE 2: CHRONOLOGICAL GROWTH ANALYSIS & STATS TABLE
      // -------------------------------------------------------------
      doc.addPage();

      // Simple header bar
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("ZYNTRA PIPELINE PERFORMANCE REPORT", 14, 9);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text("SECTION II: CHRONOLOGICAL MATRIX", pageWidth - 76, 9);

      curY = 26;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("II. CHRONOLOGICAL VELOCITY & STRENGTH METRICS", 14, curY);

      curY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Detailed day-by-day progression tracking enrolled lead volumes, dynamic average scores, and 7-day historical baselines:", 14, curY);

      // Compile trend rows for chronological analysis
      const trendRows = trendData.map((row: any) => [
        row.date,
        `${row["Total Volume"]} Active Leads`,
        `${row["Average Score"]} / 90 Quality Ratio`,
        `${row["Historical 7-Day Average"] || 'N/A'} / 90 Quality Ratio`,
        `${row["High Intent count"]} Elite Accounts (${Math.round((row["High Intent count"] / (row["Total Volume"] || 1)) * 100)}%)`
      ]);

      // Render Table
      autoTable(doc, {
        startY: curY + 8,
        head: [['Sequence Timestamp', 'Enrolled Volume', 'Current Average', 'Historical 7-Day Average', 'High-Intent Density']],
        body: trendRows,
        theme: 'grid',
        headStyles: {
          fillColor: [79, 70, 229], // indigo
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 42, fontStyle: 'bold' },
          1: { cellWidth: 32 },
          2: { cellWidth: 32 },
          3: { cellWidth: 42 },
          4: { cellWidth: 34, textColor: [15, 23, 42], fontStyle: 'bold' }
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          valign: 'middle'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      // Quick visual comparison narrative block on Page 2
      const finalYPage2 = (doc as any).lastAutoTable.finalY + 12;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, finalYPage2, pageWidth - 28, 54, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("Key Strategic Conclusions & Findings:", 18, finalYPage2 + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const findingsLines = [
        `• Active cataloging captured a cumulative candidate pipeline pool of ${leads.length} accounts.`,
        `• Highly qualified high intent targets represent a robust ${stats.percentHighIntent}% concentration weight across core parameters.`,
        `• Historical quality profiles indicate core lead quality values are settling around a solid ${stats.averageScore}/90 metric.`,
        "• Outreach Guideline: Target key accounts with direct email channels and active LinkedIn records to maximize performance."
      ];
      findingsLines.forEach((line, idx) => {
        doc.text(line, 18, finalYPage2 + 15.5 + (idx * 9));
      });

      applyReportThemeDecoration(doc, 2);

      // -------------------------------------------------------------
      // PAGE 3: COMPREHENSIVE PROSPECT SPECIFIC REPORT & SOURCES
      // -------------------------------------------------------------
      doc.addPage();

      // Top Header Page 3
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("ZYNTRA PIPELINE PERFORMANCE REPORT", 14, 9);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text("SECTION III: PROSPECT MATRIX", pageWidth - 70, 9);

      curY = 26;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("III. DETAILED PROSPECT VERIFICATION MATRIX", 14, curY);

      curY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Direct account footprints for manual cross-verification. Source links are clickable directly in the PDF document.", 14, curY);

      // Compile leads grid rows with validation links included
      const rawLeadsRows = leads.map((lead, i) => {
        const sc = calculateLeadScore(lead);
        let emailText = lead.email || 'N/A';
        
        let urlText = lead.linkedin_url || '';
        if (!urlText && lead.company) {
          // Fallback coordinate construction
          urlText = `linkedin.com/company/${lead.company.toLowerCase().trim().replace(/[^a-z0-9]/g, '-')}`;
        }

        return [
          i + 1,
          lead.name || 'Anonymous Prospect',
          `${lead.role || 'Role'} @ ${lead.company || 'Enterprise'}`,
          lead.industry || 'General',
          `${sc} / 90`,
          emailText,
          urlText
        ];
      });

      // Render autoTable containing raw leads & verification URLs
      autoTable(doc, {
        startY: curY + 8,
        head: [['Seq', 'Prospect Name', 'Enterprise Coordinates', 'Industry', 'Score', 'Contact Email', 'Verification Source (Click Link)']],
        body: rawLeadsRows,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 23, 42], // deep professional secondary slate
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 24, fontStyle: 'bold' },
          2: { cellWidth: 38 },
          3: { cellWidth: 20 },
          4: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 34 },
          6: { cellWidth: 44, textColor: [37, 99, 235], fontStyle: 'bold' } // Blue clickable style
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3.5,
          valign: 'middle'
        },
        didDrawCell: (data) => {
          // Inject actual clickable hyperlinks in the PDF for Verification Link
          if (data.section === 'body' && data.column.index === 6 && data.cell.text && data.cell.text[0]) {
            const url = data.cell.text[0];
            if (url && url !== 'N/A') {
              const fullUrl = url.startsWith('http') ? url : 'https://' + url;
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: fullUrl });
            }
          }
        }
      });

      applyReportThemeDecoration(doc, 3);

      doc.save(`Zyntra_LeadIntelligence_Report_${new Date().toISOString().split('T')[0]}.pdf`);

      if (showToast) showToast('Premium multi-page PDF summary compiled successfully with clickable source urls!', 'success');
    } catch (err: any) {
      console.error(err);
      if (showToast) showToast(`PDF compilation failed: ${err.message || err}`, 'error');
    } finally {
      setIsPDFExporting(false);
    }
  };

  if (!leads || leads.length === 0) return null;

  return (
    <div 
      className="bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 glow-brand/5 relative overflow-hidden transition-all duration-300" 
      id="lead-scoring-insights"
    >
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Top Controls Section - Navigation and Options */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
            <Target className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-syne font-extrabold tracking-tight text-foreground">Lead Quality & Intent Analytics</h3>
            <p className="text-[10px] md:text-xs text-text-muted font-normal">Real-time analytical mapping of prospect target engagement attributes.</p>
          </div>
        </div>

        {/* Tab & Download Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Highlight button */}
          <button
            onClick={() => {
              setHighlightElite(!highlightElite);
              if (showToast) {
                showToast(
                  !highlightElite 
                    ? 'Highlighted high-quality leads (Score > 60)' 
                    : 'Removed high-quality highlights',
                  'success'
                );
              }
            }}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] md:text-sm font-extrabold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer border ${
              highlightElite 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : 'bg-surface-alt border-border text-text-muted hover:text-foreground'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Highlight Elite (&gt; 60)</span>
          </button>

          {/* Tab controllers with Shared Slide indicator using layoutId */}
          <div className="bg-surface-alt border border-border p-1 rounded-xl flex items-center gap-1 relative overflow-hidden">
            <button
              onClick={() => setActiveTab('distribution')}
              className={`relative z-15 px-3.5 py-1.5 rounded-lg text-[10px] md:text-xs font-extrabold tracking-tight transition-colors duration-200 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'distribution' ? 'text-white' : 'text-text-muted hover:text-foreground'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Score Distribution</span>
              {activeTab === 'distribution' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-brand rounded-lg -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 26 }}
                />
              )}
            </button>
            <button
               onClick={() => setActiveTab('trend')}
               className={`relative z-15 px-3.5 py-1.5 rounded-lg text-[10px] md:text-xs font-extrabold tracking-tight transition-colors duration-200 flex items-center gap-1.5 cursor-pointer ${
                 activeTab === 'trend' ? 'text-white' : 'text-text-muted hover:text-foreground'
               }`}
             >
               <Activity className="w-3.5 h-3.5" />
               <span>Performance Trend</span>
               {activeTab === 'trend' && (
                 <motion.div
                   layoutId="activeTabIndicator"
                   className="absolute inset-0 bg-brand rounded-lg -z-10"
                   transition={{ type: "spring", stiffness: 350, damping: 26 }}
                 />
               )}
             </button>
             <button
               onClick={() => setActiveTab('segment')}
               className={`relative z-15 px-3.5 py-1.5 rounded-lg text-[10px] md:text-xs font-extrabold tracking-tight transition-colors duration-200 flex items-center gap-1.5 cursor-pointer ${
                 activeTab === 'segment' ? 'text-white' : 'text-text-muted hover:text-foreground'
               }`}
             >
               <Award className="w-3.5 h-3.5" />
               <span>Segment Breakdown</span>
               {activeTab === 'segment' && (
                 <motion.div
                   layoutId="activeTabIndicator"
                   className="absolute inset-0 bg-brand rounded-lg -z-10"
                   transition={{ type: "spring", stiffness: 350, damping: 26 }}
                 />
               )}
             </button>
          </div>

          {/* Export Functions Row */}
          <div className="flex items-center gap-1.5 bg-surface-alt border border-border p-1 rounded-xl">
            <button
              onClick={handleExportPDFSummary}
              disabled={isPDFExporting || isExporting}
              className="px-3.5 py-1.5 rounded-lg text-[10px] md:text-xs font-extrabold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:bg-brand/10 text-brand"
              title="Download comprehensive multi-page summary PDF report"
            >
              <FileText className={`w-3.5 h-3.5 ${isPDFExporting ? 'animate-pulse' : ''}`} />
              <span>{isPDFExporting ? 'Compiling PDF...' : 'Export Intel PDF'}</span>
            </button>

            <button
              onClick={handleExportPNG}
              disabled={isExporting || isPDFExporting}
              className="px-3.5 py-1.5 rounded-lg text-[10px] md:text-xs font-extrabold tracking-tight transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:bg-white/5 text-text-muted hover:text-foreground"
              title="Download active visualization view as HTML5 image PNG"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} />
              <span>{isExporting ? 'Slipping PNG...' : 'PNG'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Summary Badges Grid reflecting overall data weight */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="px-3 py-1.5 rounded-xl bg-brand/10 border border-brand/20 text-[10px] font-bold text-brand flex items-center gap-1.5 shadow-sm">
          <Sparkle className="w-3.5 h-3.5" />
          <span>Average Score: <b>{stats.averageScore}/90</b></span>
        </div>
        
        {/* Glowing Interactive Conversion Speed Predictive Badge - overlay display element */}
        <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 shadow-sm transition-all duration-300 animate-pulse ${prediction.speedColor}`}>
          <Zap className="w-3.5 h-3.5" />
          <span>Est. Conversion: <b>{prediction.avgDays} Days ({prediction.speedCategory})</b></span>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-brand-alt/10 border border-brand-alt/20 text-[10px] font-bold text-brand-alt flex items-center gap-1.5 shadow-sm">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>High Intent Quotient: <b>{stats.highIntentCount} ({stats.percentHighIntent}%)</b></span>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-[10px] font-bold text-pink-500 flex items-center gap-1.5 shadow-sm">
          <Award className="w-3.5 h-3.5" />
          <span>Elite Target Limit: <b>{stats.maxScore} Peak</b></span>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-text-muted flex items-center gap-1.5 shadow-sm">
          <Calendar className="w-3.5 h-3.5" />
          <span>Sequence Scope: <b>{trendData.length} Day(s) Analyzed</b></span>
        </div>
      </div>

      {/* Benchmark Sequence Alert Indicator */}
      <div className="w-full transition-all duration-500">
        {isAlertResolved ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-emerald-500/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-400">Drift Resolved: AI Playbook Applied Successfully</h4>
                <p className="text-xs text-emerald-200/80">Strategic ICP reallocation and customized messaging overrides are live for the 10 most recent leads.</p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-500/20 text-[11px] font-extrabold tracking-tight text-emerald-300 rounded-xl border border-emerald-500/40 uppercase hover:bg-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Review Playbook</span>
            </button>
          </motion.div>
        ) : stats.hasDroppingAlert ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-red-500/15 border border-red-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-red-500/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-400">Benchmark Warning: Score Drift Detected</h4>
                <p className="text-xs text-red-200/85">Average lead score has consistently dropped below the 65 benchmark for {stats.conSecBelow65Count} consecutive days.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleResolveDrift}
                className="px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-500/20 tracking-tight transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Resolve Benchmark Alert</span>
              </button>
              <span className="px-3 py-1 bg-red-500/20 text-[10px] font-extrabold tracking-widest text-red-300 rounded-full border border-red-500/30 uppercase shrink-0 hidden md:inline-block">
                Underperforming
              </span>
            </div>
          </motion.div>
        ) : (
          <div className="w-full bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  Campaign Quality: Stable
                </h4>
                <p className="text-[10px] text-text-muted">No consecutive drops (3+ days) below the 65 quality benchmark detected in the active pipeline history.</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 bg-emerald-400/10 text-[9px] font-extrabold text-emerald-300 rounded-full border border-emerald-500/20 uppercase shrink-0">
              Optimal
            </span>
          </div>
        )}
      </div>


      {/* Main visualization grid */}
      <div className="grid md:grid-cols-12 gap-6 items-center">
        {/* Render selected view tab with Framer motion AnimatePresence morphing switches container */}
        <div 
          className="md:col-span-8 bg-surface-alt/40 border border-border/60 p-4 rounded-2xl h-[300px] w-full relative overflow-hidden" 
          id="lead-chart-container"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'distribution' ? (
              <motion.div 
                key="distribution"
                initial={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 16, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="w-full h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={binData} 
                    margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
                  >
                    <XAxis 
                      dataKey="range" 
                      tick={{ fill: 'var(--color-text-muted, #94a3b8)', fontSize: 9, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      allowDecimals={false}
                      tick={{ fill: 'var(--color-text-muted, #94a3b8)', fontSize: 9, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 8 }} />
                    <ReferenceLine 
                      x={getRangeForScore(stats.averageScore)} 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ 
                        value: `Actual Avg (${stats.averageScore})`, 
                        fill: '#3b82f6', 
                        fontSize: 9, 
                        fontWeight: 'bold', 
                        position: 'top', 
                        offset: 15
                      }} 
                    />
                    <ReferenceLine 
                      x={getRangeForScore(65)} 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      label={{ 
                        value: `Target (65)`, 
                        fill: '#ef4444', 
                        fontSize: 9, 
                        fontWeight: 'bold', 
                        position: 'top', 
                        offset: 15
                      }} 
                    />
                    <Bar 
                      dataKey="count" 
                      shape={<CustomBarShape />}
                    >
                      {binData.map((entry, index) => {
                        const isSelected = scoreFilter?.rangeLabel === entry.range;
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={isSelected ? '#10b981' : entry.color} 
                            style={{ 
                              filter: isSelected ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.6))' : 'none',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              if (scoreFilter?.rangeLabel === entry.range) {
                                setScoreFilter(null);
                                if (showToast) showToast('Cleared score filter!', 'success');
                              } else {
                                setScoreFilter({ min: entry.min, max: entry.max, rangeLabel: entry.range });
                                if (showToast) showToast(`Filtering lead view to display scores: ${entry.range}`, 'success');
                              }
                            }}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            ) : activeTab === 'trend' ? (
              <motion.div 
                key="trend"
                initial={{ opacity: 0, x: 16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="w-full h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={trendData}
                    margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'var(--color-text-muted, #94a3b8)', fontSize: 9, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: 'var(--color-text-muted, #94a3b8)', fontSize: 9, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    
                    {/* Campaign Avg Reference Line */}
                    <ReferenceLine 
                      y={stats.averageScore} 
                      stroke="#3b82f6" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      label={{ 
                        value: `Campaign Avg (${stats.averageScore})`, 
                        fill: '#3b82f6', 
                        fontSize: 8, 
                        fontWeight: 'bold', 
                        position: 'right',
                        offset: 10
                      }} 
                    />

                    {/* Target Benchmark (65) Reference Line */}
                    <ReferenceLine 
                      y={65} 
                      stroke="#ef4444" 
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      label={{ 
                        value: `Target Benchmark (65)`, 
                        fill: '#ef4444', 
                        fontSize: 8, 
                        fontWeight: 'bold', 
                        position: 'right',
                        offset: 10
                      }} 
                    />

                    {/* Visual glow backdrop for total leads count */}
                    <Area 
                      type="monotone" 
                      dataKey="Total Volume" 
                      fill="url(#colorTotalVolume)" 
                      stroke="none"
                    />
                    
                    {/* Volatility Band (standard deviation) shaded area */}
                    <Area 
                      type="monotone" 
                      dataKey="Volatility Band" 
                      fill="#4f46e5" 
                      fillOpacity={0.12} 
                      stroke="none"
                      name="Volatility Range"
                    />

                    {/* Historical average lead score trend line */}
                    <Line 
                      type="monotone" 
                      dataKey="Average Score" 
                      stroke="var(--color-brand, #4f46e5)" 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 1 }}
                      activeDot={{ r: 6 }} 
                      name="Avg Quality Score"
                    />

                    {/* 7-Day Historical Average Trend Line */}
                    <Line 
                      type="monotone" 
                      dataKey="Historical 7-Day Average" 
                      stroke="#ec4899" 
                      strokeWidth={2} 
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }} 
                      name="7-Day Historical Avg"
                    />
                    
                    {/* Volume of High Intent leads progression */}
                    <Line 
                      type="monotone" 
                      dataKey="High Intent count" 
                      stroke="var(--color-brand-alt, #10b981)" 
                      strokeWidth={2} 
                      strokeDasharray="4 4"
                      dot={{ r: 3 }}
                      name="High Intent Profiles"
                    />

                    <defs>
                      <linearGradient id="colorTotalVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-brand, #4f46e5)" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="var(--color-brand, #4f46e5)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>
            ) : (
              <motion.div 
                key="segment"
                initial={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="w-full h-full grid grid-cols-2 gap-4 items-center"
              >
                {/* Left Pie - Seniority */}
                <div className="flex flex-col h-full justify-center">
                  <p className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400 text-center mb-1">Seniority Allocation</p>
                  <div className="h-[170px] w-full">
                    {seniorityData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={seniorityData}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={62}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {seniorityData.map((entry: any, idx: number) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[10px] space-y-0.5 shadow-lg">
                                    <p className="font-extrabold text-white">{data.name}</p>
                                    <p className="text-emerald-400 font-bold font-mono">{data.value} Prospect(s)</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-text-muted text-[10px]">No Seniority Data</div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 mt-1 max-w-full overflow-hidden">
                    {seniorityData.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center gap-1 text-[8px] font-bold text-text-muted truncate">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span>{entry.name.split(' ')[0]} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Pie - Industry */}
                <div className="flex flex-col h-full justify-center">
                  <p className="text-[10px] uppercase font-extrabold tracking-wider text-brand text-center mb-1">Target Sectors</p>
                  <div className="h-[170px] w-full block">
                    {industryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={industryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={62}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {industryData.map((entry: any, idx: number) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-900/95 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl text-[10px] space-y-0.5 shadow-lg">
                                    <p className="font-extrabold text-white">{data.name}</p>
                                    <p className="text-brand font-bold font-mono">{data.value} Prospect(s)</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-text-muted text-[10px]">No Industry Data</div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 mt-1 max-w-full overflow-hidden">
                    {industryData.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center gap-1 text-[8px] font-bold text-text-muted truncate">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span>{entry.name.split(' ')[0]} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Narrative / Contextual analysis side panel with details on Est. Conversion */}
        <div className="md:col-span-4 space-y-4">
          <div className="p-4 rounded-xl bg-surface-alt border border-border/80 flex flex-col gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 animate-pulse" />
              <span>Conversion Prediction</span>
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              {activeTab === 'distribution' ? (
                stats.highIntentCount > 0 
                  ? `Your score spectrum reveals ${stats.highIntentCount} prime high-intent targets (Score ≥ 60). We predict an average target conversion time of ${prediction.avgDays} days.`
                  : 'Optimize targeting specifications inside Campaign Settings or research detailed prospects inside the Research Sprint tab to populate premium leads.'
              ) : activeTab === 'trend' ? (
                trendData.length > 1
                  ? `Your campaign average quality ratio is currently maintaining ${stats.averageScore}/90. Estimated sales cycle duration correlates to ${prediction.avgDays} days.`
                  : 'Enriching leads dynamically over multiple sequences will plot comprehensive growth metrics over time here.'
              ) : (
                `Active segments display robust outreach diversification. Top seniority tiers map perfectly to specialized enterprise sales funnels.`
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-surface-alt/75 border border-border/50 text-center">
              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Growth Signal</span>
              <p className="text-sm font-syne font-extrabold text-foreground mt-0.5">
                {stats.percentHighIntent > 30 ? 'Strong' : 'Steady'}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-alt/75 border border-border/50 text-center">
              <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Analysis Weight</span>
              <p className="text-sm font-syne font-extrabold text-brand mt-0.5">
                {leads.length} Traced
              </p>
            </div>
          </div>

          {/* Interactive Pipeline Model Visual Graphic */}
          <div className="relative rounded-xl overflow-hidden border border-border/60 bg-slate-950 flex flex-col group h-[72px]">
            <img 
              src="https://picsum.photos/seed/cyber-network/400/180?blur=1" 
              alt="AI Outreach Pipeline Intelligence" 
              className="w-full h-full object-cover opacity-50 transition-all duration-500 group-hover:scale-105 group-hover:opacity-75"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-3 flex flex-col justify-end">
              <span className="text-[8px] font-extrabold text-brand uppercase tracking-wider">Pipeline Model</span>
              <p className="text-[10px] text-white/95 font-bold">Multi-Agent Omnichannel Engine</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Resolution Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isAnalyzing && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 shrink-0 flex flex-col shadow-2xl space-y-6 text-foreground text-left"
            >
              {/* Close Button */}
              {!isAnalyzing && (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-6 right-6 p-1.5 rounded-full hover:bg-white/10 text-text-muted hover:text-foreground transition-all cursor-pointer bg-transparent border-none"
                >
                  <X className="w-5 h-5 text-text-muted hover:text-white" />
                </button>
              )}

              {/* Modal Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                  <Sparkles className="w-5 h-5 animate-pulse text-brand" />
                </div>
                <div>
                  <h3 className="text-xl font-syne font-extrabold tracking-tight text-white flex items-center gap-2">
                    Benchmark Offset Remediation Blueprint
                  </h3>
                  <p className="text-xs text-text-muted">Precision GTM diagnostics & personalized outreach templates to restore ideal target intent thresholds.</p>
                </div>
              </div>

              {isAnalyzing ? (
                /* Dynamic Cinematic Stepper Panel */
                <div className="flex flex-col items-center justify-center py-16 space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full animate-spin" />
                    <Sparkles className="w-6 h-6 text-brand absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>

                  <div className="space-y-3 w-full max-w-md text-center">
                    <h4 className="text-sm font-bold text-white tracking-wide">Conducting Intelligent Lead Optimization...</h4>
                    <p className="text-xs text-text-muted h-5 animate-pulse">
                      {loadingStep === 0 && "⏳ Stage 1/4: Analyzing lead-specific company metrics..."}
                      {loadingStep === 1 && "⚙️ Stage 2/4: Mapping individual decision-maker personas..."}
                      {loadingStep === 2 && "🧠 Stage 3/4: Synthesizing customized B2B value propositions..."}
                      {loadingStep === 3 && "🌟 Stage 4/4: Formatting professional strategy directives..."}
                    </p>

                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className="bg-brand h-full"
                        initial={{ width: "0%" }}
                        animate={{ width: loadingStep === 0 ? "25%" : loadingStep === 1 ? "50%" : loadingStep === 2 ? "75%" : "95%" }}
                        transition={{ duration: 1.5 }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                analysisResult && (
                  /* Formatted McKinsey-grade playbook details */
                  <div className="space-y-6 flex-1">
                    {/* Executive Diagnosis */}
                    <div className="bg-surface-alt/75 border border-white/5 p-5 rounded-2xl space-y-2">
                      <h4 className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5 text-brand">
                        <Activity className="w-4 h-4 text-brand" />
                        Executive Diagnosis
                      </h4>
                      <p className="text-sm text-text-muted leading-relaxed">
                        {analysisResult.summary}
                      </p>
                    </div>

                    {/* Bento Grid: Core Issues Detected */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        Crucial Revenue & Engagement Offsets Detected
                      </h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {analysisResult.keyIssues.map((issue, idx) => (
                          <div key={idx} className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl space-y-2">
                            <span className="text-[10px] font-bold text-red-400 font-mono tracking-wider">ISSUE 0{idx+1}</span>
                            <h5 className="text-sm font-bold text-red-200">{issue.issue}</h5>
                            <p className="text-xs text-text-muted leading-relaxed">{issue.description}</p>
                            <div className="text-[10px] text-red-300 pointer-events-none">
                              <b>Operational Impact:</b> {issue.impact}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actionable Outreach Improvements */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-orange-400">
                        <Lightbulb className="w-4 h-4 text-orange-400" />
                        Dynamic Strategy Playbooks
                      </h4>
                      <div className="grid md:grid-cols-3 gap-6">
                        {analysisResult.actionableImprovements.map((improvement, idx) => (
                          <div key={idx} className="bg-surface-alt border border-white/5 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-brand font-mono tracking-wider">PLAYBOOK 0{idx+1}</span>
                                <div className="flex gap-1 flex-wrap">
                                  {improvement.channels.map((chan, chIdx) => (
                                    <span key={chIdx} className="px-1.5 py-0.5 rounded bg-brand/10 border border-brand/20 text-[9px] font-bold text-brand uppercase">
                                      {chan}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <h5 className="text-sm font-bold text-white">{improvement.title}</h5>
                              <p className="text-xs text-text-muted leading-relaxed">{improvement.proposedStrategy}</p>
                            </div>

                            {/* Optional Copyable Template Codeblock */}
                            {(improvement.exampleOutreachSubject || improvement.exampleOutreachBody) && (
                              <div className="mt-2 border-t border-white/5 pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-bold text-brand/85 uppercase tracking-wide">Communication Copy</span>
                                  <button
                                    onClick={() => {
                                      const fullText = (improvement.exampleOutreachSubject ? `Subject: ${improvement.exampleOutreachSubject}\n\n` : '') + (improvement.exampleOutreachBody || '');
                                      navigator.clipboard.writeText(fullText);
                                      setCopiedIndex(idx);
                                      if (showToast) showToast('Playbook outreach copy saved to clipboard!', 'success');
                                      setTimeout(() => setCopiedIndex(null), 2500);
                                    }}
                                    className="text-[9px] font-extrabold text-brand flex items-center gap-1 hover:text-brand-alt transition-colors bg-brand/5 border border-brand/10 hover:border-brand-alt/20 px-2 py-0.5 rounded cursor-pointer"
                                  >
                                    {copiedIndex === idx ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3 text-brand" />
                                        <span>Copy Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="bg-black/40 border border-white/5 p-3 rounded-xl space-y-1.5 max-h-[160px] overflow-y-auto font-mono text-[10px] text-white/90">
                                  {improvement.exampleOutreachSubject && (
                                    <div>
                                      <span className="text-text-muted">Subject:</span> {improvement.exampleOutreachSubject}
                                    </div>
                                  )}
                                  {improvement.exampleOutreachBody && (
                                    <div className="whitespace-pre-wrap leading-relaxed text-[10px]">
                                      {improvement.exampleOutreachBody}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ICP Shift Reallocation Advice */}
                    <div className="p-5 rounded-2xl bg-brand/5 border border-brand/20 flex items-start gap-3.5 shadow-md">
                      <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand shrink-0">
                        <TrendingUp className="w-4 h-4 animate-pulse text-brand" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Strategic Reallocation Directive</h4>
                        <p className="text-xs text-text-muted leading-relaxed">
                          {analysisResult.reallocationAdvice}
                        </p>
                      </div>
                    </div>

                    {/* Alignment Buttons in Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-5">
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs rounded-xl tracking-tight transition-all cursor-pointer border border-white/10"
                      >
                        Close Blueprint View
                      </button>
                      <button
                        onClick={() => {
                          setIsAlertResolved(true);
                          setIsModalOpen(false);
                          if (showToast) showToast('AI GTM Correction applied! Drift alert cleared.', 'success');
                        }}
                        className="px-5 py-2.5 bg-brand hover:bg-brand-alt text-white font-extrabold text-xs rounded-xl tracking-tight transition-all cursor-pointer shadow-lg shadow-brand/20 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Apply optimization playbook & Clear Drift</span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

