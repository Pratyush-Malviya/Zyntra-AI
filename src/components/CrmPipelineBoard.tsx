import React, { useState, useEffect } from "react";
import { 
  Kanban, List, Plus, PlusCircle, Search, Filter, RefreshCw, Sparkles, AlertCircle, 
  MapPin, Clock, Calendar, Briefcase, User, UserCheck, Tag, Trash2, 
  CheckCircle, ChevronRight, Activity, FileText, Check, MoreVertical, 
  ArrowRight, ShieldAlert, Mail, Phone, Users, History, TrendingUp, X, Linkedin,
  Send, ExternalLink, Globe, Smartphone, Download, MessageSquare, Info,
  ChevronDown, Save, FileSpreadsheet, Settings, Eye, Target
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, updateDoc, db, collection, addDoc, setDoc, deleteDoc, Timestamp } from "../firebase";
import { generateOutreach, OutreachMessages, generateProspectResearch, ProspectResearchReport } from "../services/geminiService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { SmartCsvImportModal } from "./SmartCsvImportModal";

// Define 6 salesperson-first stages
export interface Stage {
  id: string;
  name: string;
  color: string;
  probability: number;
}

export const PIPELINE_STAGES: Stage[] = [
  { id: 'Imported', name: 'Imported', color: '#8b5cf6', probability: 20 },
  { id: 'Pending Action', name: 'Pending Action', color: '#f59e0b', probability: 50 },
  { id: 'AI Generated', name: 'AI Generated', color: '#3b82f6', probability: 75 },
  { id: 'Outreach Sent', name: 'Outreach Sent', color: '#10b981', probability: 90 },
  { id: 'Responded', name: 'Responded', color: '#00d4aa', probability: 95 },
  { id: 'Failed / Disqualified', name: 'Failed / Disqualified', color: '#ef4444', probability: 0 }
];

const COUNTRY_FLAGS: Record<string, string> = {
  Kenya: '🇰🇪',
  India: '🇮🇳',
  UK: '🇬🇧',
  Australia: '🇦🇺',
  UAE: '🇦🇪',
  USA: '🇺🇸',
  Global: '🌍'
};

interface CrmPipelineBoardProps {
  leads: any[];
  campaigns: any[];
  currentCampaign: any | null;
  setCurrentCampaign: (c: any | null) => void;
  onCreateCampaign: (name: string) => Promise<any>;
  onDeleteCampaign: (id: string) => Promise<void>;
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  messages: Record<string, OutreachMessages>;
  config: any;
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  chState: { wa: boolean; li: boolean; em: boolean };
  setChState: React.Dispatch<React.SetStateAction<{ wa: boolean; li: boolean; em: boolean }>>;
  smtpConfig?: any;
  profile: any;
  user: any;
  handleUpdateLead: (leadId: string, updatedFields: Partial<any>) => Promise<void>;
  handleDeleteLead: (leadId: string) => Promise<void>;
  saveLeads: (parsed: any[]) => Promise<void>;
}

export const CrmPipelineBoard: React.FC<CrmPipelineBoardProps> = ({
  leads,
  campaigns,
  currentCampaign,
  setCurrentCampaign,
  onCreateCampaign,
  onDeleteCampaign,
  showToast,
  messages,
  config,
  setConfig,
  chState,
  setChState,
  smtpConfig,
  profile,
  user,
  handleUpdateLead,
  handleDeleteLead,
  saveLeads
}) => {
  // Navigation & filter states
  const [viewType, setViewType] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'outreach' | 'history' | 'intelligence'>('overview');
  
  // Intelligence execution state
  const [isExecutingIntelligence, setIsExecutingIntelligence] = useState(false);
  const [executedIntelligenceMap, setExecutedIntelligenceMap] = useState<Record<string, ProspectResearchReport>>({});

  const handleExecuteIntelligence = async () => {
    if (!selectedLead) return;
    setIsExecutingIntelligence(true);
    try {
      const query = selectedLead.company || selectedLead.email?.split('@')[1] || selectedLead.name;
      const report = await generateProspectResearch(query);
      setExecutedIntelligenceMap(prev => ({ ...prev, [selectedLead.id]: report }));
      showToast("Prospect Intelligence generated successfully", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to generate intelligence: " + (err.message || ""), "error");
    } finally {
      setIsExecutingIntelligence(false);
    }
  };
  
  // Modal states
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showSingleLeadModal, setShowSingleLeadModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [bulkAddRowsText, setBulkAddRowsText] = useState("");
  const [rawLeads, setRawLeads] = useState("");
  const [newLeadStage, setNewLeadStage] = useState("Imported");
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    role: "",
    company: "",
    email: "",
    phone: "",
    linkedin_url: ""
  });

  // Product DNA accordion panel
  const [showDnaPanel, setShowDnaPanel] = useState(false);

  // Lead editing state
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editedLeadData, setEditedLeadData] = useState<any>({});
  const [leadNotes, setLeadNotes] = useState("");

  // AI Generation state per lead
  const [isGeneratingLeadOutreach, setIsGeneratingLeadOutreach] = useState(false);

  // Active channel states
  const [selectedTone, setSelectedTone] = useState<Record<string, string>>({
    wa: "Conversational",
    li: "Professional B2B",
    em: "Professional B2B"
  });

  // Expandable summary lists
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Heuristic lead status mappings
  const getLeadStage = (lead: any): string => {
    if (lead.stage) {
      if (lead.stage === 'stage-discovery') return 'Imported';
      if (lead.stage === 'stage-proposal') return 'Pending Action';
      if (lead.stage === 'stage-negotiation') return 'AI Generated';
      if (lead.stage === 'stage-won') return 'Outreach Sent';
      if (lead.stage === 'stage-responded') return 'Responded';
      if (lead.stage === 'stage-lost') return 'Failed / Disqualified';
      return lead.stage;
    }
    // Fallback to old status
    if (lead.status === 'sent') return 'Outreach Sent';
    if (lead.status === 'failed') return 'Failed / Disqualified';
    if (lead.status === 'generated') return 'AI Generated';
    if (lead.status === 'pending') return 'Pending Action';
    return 'Imported';
  };

  const getStageColor = (stageId: string): string => {
    return PIPELINE_STAGES.find(s => s.id === stageId)?.color || "#8b5cf6";
  };

  const calculateLeadScore = (lead: any): number => {
    if (!lead) return 0;
    let score = 0;
    const highValueRoles = ['ceo', 'founder', 'vp', 'director', 'head', 'manager', 'owner', 'cto', 'cmo', 'coo'];
    const role = String(lead.role || '').toLowerCase();
    if (highValueRoles.some(r => role.includes(r))) score += 40;
    const techIndustries = ['software', 'tech', 'it', 'saas', 'digital', 'ai', 'cloud'];
    const industry = String(lead.industry || '').toLowerCase();
    if (techIndustries.some(i => industry.includes(i))) score += 20;
    const linkedin = String(lead.linkedin_url || '');
    if (linkedin && linkedin.length > 10) score += 10;
    const phone = String(lead.phone || '');
    if (phone && phone.length > 5) score += 10;
    const email = String(lead.email || '');
    if (email && email.includes('@')) score += 10;
    return score;
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 40) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  // PDF Report Downloader
  const downloadCampaignPDF = async (campaign: any) => {
    try {
      const doc = new jsPDF();
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(139, 92, 246); // Purple brand
      doc.text("ZYNTRA CRM CAMPAIGN REPORT", 20, 25);
      
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(`Campaign: ${campaign.name}`, 20, 35);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(20, 40, 190, 40);

      // Metadata Table
      const createdStr = campaign.createdAt?.toDate ? campaign.createdAt.toDate().toLocaleDateString() : 'N/A';
      const metaData = [
        ["Campaign Name", campaign.name],
        ["Current Status", campaign.status?.toUpperCase() || 'DRAFT'],
        ["Total Enrolled Leads", `${leads.length} Profiles`],
        ["Created At", createdStr]
      ];

      autoTable(doc, {
        startY: 45,
        head: [['Specification', 'Details']],
        body: metaData,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;

      if (leads.length > 0) {
        doc.setFontSize(12);
        doc.text("Enrolled Leads List:", 20, currentY);

        const leadsBody = leads.map(l => [
          l.name || 'N/A',
          l.company || 'N/A',
          l.role || 'N/A',
          l.email || 'N/A',
          getLeadStage(l)
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Full Name', 'Company', 'Role', 'Email', 'Current Pipeline Stage']],
          body: leadsBody,
          theme: 'grid',
          headStyles: { fillColor: [71, 85, 105] }
        });
      }

      doc.save(`Zyntra_Campaign_${campaign.name.replace(/\s+/g, '_')}_Report.pdf`);
      showToast("Campaign Report PDF downloaded successfully!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to compile Campaign PDF: " + err.message, "error");
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    const leadId = e.dataTransfer.getData("text/plain");
    const draggedLead = leads.find(l => l.id === leadId);
    
    if (draggedLead) {
      const currentStage = getLeadStage(draggedLead);
      if (currentStage !== targetStageId) {
        await handleUpdateLead(leadId, { stage: targetStageId });
        showToast(`Moved ${draggedLead.name} to ${targetStageId}`, "success");
      }
    }
  };

  // CSV Importer callback
  const handleSmartImportComplete = async (importedRows: any[], summary: any, campaignOption?: { type: 'existing' | 'new', id?: string, name?: string }) => {
    if (!user || !profile) return;
    
    let targetCampaignId = currentCampaign?.id;

    if (campaignOption?.type === 'new' && campaignOption.name) {
       const newCamp = await onCreateCampaign(campaignOption.name);
       if (newCamp && newCamp.id) {
         targetCampaignId = newCamp.id;
       }
    } else if (campaignOption?.type === 'existing' && campaignOption.id) {
       targetCampaignId = campaignOption.id;
       const selectedCamp = campaigns.find(c => c.id === targetCampaignId);
       if (selectedCamp) {
         setCurrentCampaign(selectedCamp);
       }
    }

    if (!targetCampaignId) {
      showToast("No target campaign found. Import aborted.", "error");
      return;
    }

    const mappedLeads = importedRows.map(row => ({
      userId: user.uid,
      orgId: profile.orgId,
      campaignId: targetCampaignId,
      name: row.name || "",
      role: row.role || "",
      company: row.company || "",
      industry: row.industry || "N/A",
      country: row.country || "N/A",
      phone: row.phone || "",
      email: row.email || "",
      linkedin_url: row.linkedin_url || "",
      status: "imported",
      stage: "Imported",
      score: Number(row.score) || Math.floor(65 + Math.random() * 25),
    }));

    await saveLeads(mappedLeads);
    setShowSmartImportModal(false);
    showToast(`Successfully imported ${mappedLeads.length} leads!`, "success");
  };

  // Parse manual text paste
  const parseManualLeads = async (input: string) => {
    const lines = input.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2 || !currentCampaign || !user) return;

    const headers = lines[0].split(',').map(h => (h || '').trim().toLowerCase().replace(/\s+/g, '_'));
    const parsed = lines.slice(1).map(line => {
      const vals = splitCSV(line);
      const obj: any = {
        userId: user.uid,
        orgId: profile.orgId,
        campaignId: currentCampaign.id,
        status: 'imported',
        stage: 'Imported'
      };
      headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
      return obj;
    }).filter(r => r.name);

    await saveLeads(parsed);
    setRawLeads("");
    setShowBulkAddModal(false);
    showToast(`Successfully pasted and parsed ${parsed.length} leads!`, "success");
  };

  const splitCSV = (line: string) => {
    const r = [];
    let cur = '', inQ = false;
    for (let c of line) {
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { r.push(cur); cur = ''; }
      else { cur += c; }
    }
    r.push(cur);
    return r;
  };

  const openSingleLeadModal = (stageId: string) => {
    if (!currentCampaign) {
      showToast("Select a campaign first to add leads.", "warning");
      return;
    }
    setNewLeadStage(stageId);
    setNewLeadForm({
      name: "",
      role: "",
      company: "",
      email: "",
      phone: "",
      linkedin_url: ""
    });
    setShowSingleLeadModal(true);
  };

  const handleCreateSingleLead = async () => {
    if (!currentCampaign || !user || !profile) return;
    if (!newLeadForm.name.trim() || !newLeadForm.company.trim()) {
      showToast("Add at least the lead name and company.", "warning");
      return;
    }

    const leadPayload = {
      userId: user.uid,
      orgId: profile.orgId,
      campaignId: currentCampaign.id,
      name: newLeadForm.name.trim(),
      role: newLeadForm.role.trim(),
      company: newLeadForm.company.trim(),
      industry: "N/A",
      country: "N/A",
      phone: newLeadForm.phone.trim(),
      email: newLeadForm.email.trim(),
      linkedin_url: newLeadForm.linkedin_url.trim(),
      status: "imported",
      stage: newLeadStage,
      score: calculateLeadScore(newLeadForm),
      createdAt: Timestamp.now()
    };

    try {
      const docRef = await addDoc(collection(db, 'leads'), leadPayload);
      await updateDoc(doc(db, 'campaigns', currentCampaign.id), {
        leadsCount: leads.length + 1
      });
      const createdLead = { id: docRef.id, ...leadPayload };
      setShowSingleLeadModal(false);
      openLeadDrawer(createdLead);
      showToast("Lead created. Add more details in the profile drawer.", "success");
    } catch (err: any) {
      console.error(err);
      showToast(`Failed to create lead: ${err.message || err}`, "error");
    }
  };

  // Lead Profile Drawer controls
  const openLeadDrawer = (lead: any, defaultTab: 'overview' | 'outreach' | 'history' | 'intelligence' = 'overview') => {
    setSelectedLead(lead);
    setLeadNotes(lead.notes || "");
    setEditedLeadData({ ...lead });
    setIsEditingLead(false);
    setSelectedTab(defaultTab);
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    await handleUpdateLead(selectedLead.id, { notes: leadNotes });
    showToast("Notes updated successfully", "success");
  };

  const handleSaveLeadEdit = async () => {
    if (!selectedLead) return;
    await handleUpdateLead(selectedLead.id, editedLeadData);
    setSelectedLead({ ...selectedLead, ...editedLeadData });
    setIsEditingLead(false);
    showToast("Contact details saved", "success");
  };

  // Generate / Regenerate AI outreach draft for a single lead
  const handleRegenerateOutreach = async (toneStyle: string) => {
    if (!selectedLead || !currentCampaign) return;
    setIsGeneratingLeadOutreach(true);
    showToast(`Drafting personalized messages with tone "${toneStyle}"...`, "info");
    try {
      const result = await generateOutreach(selectedLead, { ...config, tone: toneStyle });
      await setDoc(doc(db, 'messages', selectedLead.id), {
        ...result,
        leadId: selectedLead.id,
        campaignId: currentCampaign.id,
        userId: user.uid,
        orgId: profile.orgId,
        updatedAt: Timestamp.now()
      });
      // Move lead to AI Generated stage automatically if in Imported or Pending Action
      const currentStage = getLeadStage(selectedLead);
      if (currentStage === 'Imported' || currentStage === 'Pending Action') {
        await handleUpdateLead(selectedLead.id, { stage: 'AI Generated' });
      }
      showToast("AI Outreach drafts generated successfully!", "success");
    } catch (e: any) {
      console.error(e);
      showToast("Outreach generation failed: " + e.message, "error");
    } finally {
      setIsGeneratingLeadOutreach(false);
    }
  };

  // Send now outreach dispatcher
  const handleSendOutreach = async (channel: 'wa' | 'li' | 'em', text: string, subject?: string) => {
    if (!selectedLead) return;
    
    // Simulate integration dispatcher
    if (channel === 'wa') {
      const phone = (selectedLead.phone || '').replace(/\D/g, '');
      const encoded = encodeURIComponent(text);
      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    } else if (channel === 'em') {
      const mailSubject = encodeURIComponent(subject || config.email_subject || 'Outreach from Zyntra');
      const mailBody = encodeURIComponent(text);
      window.location.href = `mailto:${selectedLead.email}?subject=${mailSubject}&body=${mailBody}`;
    } else {
      const url = selectedLead.linkedin_url?.startsWith('http') ? selectedLead.linkedin_url : `https://${selectedLead.linkedin_url}`;
      if (url) window.open(url, '_blank');
    }

    // Automatically promote lead to "Outreach Sent" in the pipeline
    await handleUpdateLead(selectedLead.id, { stage: 'Outreach Sent', status: 'sent' });
    setSelectedLead({ ...selectedLead, stage: 'Outreach Sent', status: 'sent' });
    showToast("Outreach dispatched and stage updated to 'Outreach Sent'!", "success");
  };

  // Stats calculators
  const filteredLeads = leads.filter(l => {
    const searchMatch = 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.role.toLowerCase().includes(searchQuery.toLowerCase());
    return searchMatch;
  });

  const totalLeads = leads.length;
  const sentCount = leads.filter(l => getLeadStage(l) === 'Outreach Sent' || getLeadStage(l) === 'Responded').length;
  const respondedCount = leads.filter(l => getLeadStage(l) === 'Responded').length;
  const importedCount = leads.filter(l => getLeadStage(l) === 'Imported').length;
  const actionableCount = leads.filter(l => getLeadStage(l) === 'Pending Action' || getLeadStage(l) === 'AI Generated').length;
  const responseRate = sentCount > 0 ? Math.round((respondedCount / sentCount) * 100) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((respondedCount / totalLeads) * 100) : 0;
  const activePipelineRate = totalLeads > 0 ? Math.round(((totalLeads - importedCount) / totalLeads) * 100) : 0;

  return (
    <div className="space-y-5 min-w-0">
      {/* Smart CSV Importer Modal */}
      {showSmartImportModal && (
        <SmartCsvImportModal 
          onClose={() => setShowSmartImportModal(false)}
          onImportComplete={handleSmartImportComplete}
          existingLeads={leads}
          showToast={showToast}
          campaigns={campaigns}
        />
      )}

      {/* Manual Paste Importer Modal */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-[#090a10]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface border border-border rounded-3xl p-8 max-w-2xl w-full space-y-6 shadow-2xl relative select-text"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-syne font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-brand-alt" />
                  Bulk Paste Leads
                </h2>
                <p className="text-xs text-text-muted mt-0.5 font-medium">Paste CSV format data below. First row must contain column headers.</p>
              </div>
              <button 
                onClick={() => setShowBulkAddModal(false)}
                className="p-1 px-1.5 rounded-lg hover:bg-surface-alt text-text-muted transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-brand/5 border border-brand/10 rounded-xl text-[11px] text-brand shrink-0">
                <span className="font-bold">Required Columns: </span> <code className="bg-[#090a0f] p-1 rounded">name,role,company,industry,country,phone,email,linkedin_url</code>. Paste one lead per line.
              </div>
              <textarea 
                className="w-full bg-surface-alt border border-border rounded-2xl p-6 text-xs font-mono focus:border-brand outline-none transition-all min-h-[220px] resize-none"
                placeholder="Alice Smith,CEO,Acme Corp,Software,US,12345,alice@acme.com,linkedin.com/in/alice"
                value={bulkAddRowsText}
                onChange={e => setBulkAddRowsText(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setShowBulkAddModal(false)}
                className="px-4.5 py-2 rounded-xl text-xs font-semibold text-text-muted border border-border hover:bg-surface-alt cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => parseManualLeads(bulkAddRowsText)}
                className="px-6 py-2 bg-brand text-white hover:opacity-90 rounded-xl text-xs font-bold shadow-lg shadow-brand/20 cursor-pointer transition-all"
              >
                Parse & Insert Leads
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Single Lead Creator Modal */}
      {showSingleLeadModal && (
        <div className="fixed inset-0 bg-[#090a10]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface border border-border rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative text-left"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-syne font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-brand-alt" />
                  Add Lead
                </h2>
                <p className="text-[11px] text-text-muted mt-0.5 font-medium">
                  Create one basic lead in {newLeadStage}. Add richer context after the card is created.
                </p>
              </div>
              <button
                onClick={() => setShowSingleLeadModal(false)}
                className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Full name</label>
                <input
                  value={newLeadForm.name}
                  onChange={e => setNewLeadForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand"
                  placeholder="Lead name"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Role</label>
                <input
                  value={newLeadForm.role}
                  onChange={e => setNewLeadForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand"
                  placeholder="Director, VP, Founder"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Company</label>
                <input
                  value={newLeadForm.company}
                  onChange={e => setNewLeadForm(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand"
                  placeholder="Company"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={e => setNewLeadForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand"
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Phone</label>
                <input
                  value={newLeadForm.phone}
                  onChange={e => setNewLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand"
                  placeholder="+1 555 0100"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">LinkedIn URL</label>
                <input
                  value={newLeadForm.linkedin_url}
                  onChange={e => setNewLeadForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand"
                  placeholder="linkedin.com/in/contact"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setShowSingleLeadModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted border border-border hover:bg-surface-alt cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSingleLead}
                className="px-5 py-2 bg-brand text-white hover:opacity-90 rounded-xl text-xs font-bold shadow-lg shadow-brand/20 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Lead
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-[#090a10]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface border border-border rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl relative"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-syne font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-brand" />
                Create New Campaign
              </h2>
              <button 
                onClick={() => setShowCampaignModal(false)}
                className="p-1 px-1.5 rounded-lg hover:bg-surface-alt text-text-muted transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Campaign Name" 
                className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs text-white outline-none focus:border-brand"
                value={newCampaignName}
                onChange={e => setNewCampaignName(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setShowCampaignModal(false)}
                className="px-4.5 py-2 rounded-xl text-xs font-semibold text-text-muted border border-border hover:bg-surface-alt cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (newCampaignName.trim()) {
                    await onCreateCampaign(newCampaignName);
                    setNewCampaignName("");
                    setShowCampaignModal(false);
                  }
                }}
                className="px-6 py-2 bg-brand text-white hover:opacity-90 rounded-xl text-xs font-bold shadow-lg shadow-brand/20 cursor-pointer transition-all"
              >
                Create Campaign
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 1. Collapsible Campaign Stats Banner */}
      {currentCampaign && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-xl relative glow-brand/5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent pointer-events-none" />
          
          <div className="p-5 md:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5 relative z-10 text-left">
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 bg-brand/10 text-brand border border-brand/20 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  <span>Live Pipeline</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{activePipelineRate}% activated</span>
                </div>
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-tight font-syne truncate">
                  {currentCampaign.name}
                </h2>
                <p className="text-xs text-text-muted mt-1.5 leading-relaxed max-w-xl">
                  Manage target accounts, stage movement, personalized outreach, and active sales follow-up from one board.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-center shrink-0">
              <button 
                onClick={() => downloadCampaignPDF(currentCampaign)}
                className="px-4 py-2.5 bg-brand/10 border border-brand/20 text-brand hover:bg-brand hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download Report
              </button>
              <button 
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete campaign "${currentCampaign.name}"?`)) {
                    await onDeleteCampaign(currentCampaign.id);
                  }
                }}
                className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                title="Delete Campaign"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Bento Stats Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-border bg-surface-alt/25">
            {[
              { label: 'Total Leads', value: totalLeads, color: '#8b5cf6', icon: Users },
              { label: 'New Imports', value: importedCount, color: '#a78bfa', icon: Download },
              { label: 'Needs Action', value: actionableCount, color: '#f59e0b', icon: Clock },
              { label: 'Outreach Sent', value: sentCount, color: '#10b981', icon: Send },
              { label: 'Conversion', value: `${conversionRate}%`, color: '#3b82f6', icon: TrendingUp }
            ].map((stat, i) => (
              <div key={i} className={`p-4 md:p-5 border-r border-b lg:border-b-0 border-border lg:last:border-r-0 text-left space-y-2 min-w-0 ${i === 4 ? 'col-span-2 sm:col-span-1 border-r-0' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block truncate">{stat.label}</span>
                  <stat.icon className="w-3.5 h-3.5 shrink-0" style={{ color: stat.color }} />
                </div>
                <span className="text-xl md:text-2xl font-syne font-extrabold block" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Top-Bar Control Row */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 p-4 bg-surface border border-border rounded-2xl glow-brand/5">
        
        {/* Left search & Campaign dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto min-w-0">
          {/* Campaign Selector dropdown */}
          <div className="relative shrink-0 text-left w-full sm:w-auto">
            <select 
              value={currentCampaign?.id || ""}
              onChange={(e) => {
                const id = e.target.value;
                if (id === "__new__") {
                  setShowCampaignModal(true);
                } else {
                  const selected = campaigns.find(c => c.id === id);
                  setCurrentCampaign(selected || null);
                }
              }}
              className="w-full sm:w-auto bg-surface-alt border border-[#8b5cf6]/35 text-xs text-[#8b5cf6] font-bold rounded-xl py-2.5 px-4 outline-none focus:border-brand transition-all cursor-pointer sm:min-w-[220px]"
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>Campaign: {c.name}</option>
              ))}
              <option value="__new__" className="text-brand font-bold font-syne">➕ Create Campaign...</option>
            </select>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-80 xl:w-72 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Search prospects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-alt border border-border rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-white placeholder:text-text-muted outline-none focus:border-brand transition-all"
            />
          </div>
        </div>

        {/* Right buttons row */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
          {currentCampaign && (
            <button 
              onClick={() => setShowDnaPanel(!showDnaPanel)}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                showDnaPanel 
                  ? "border-brand/40 bg-brand/10 text-brand" 
                  : "border-border bg-surface-alt text-text-muted hover:text-white"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Product DNA
            </button>
          )}

          <div className="hidden sm:block w-[1px] h-6 bg-border mx-1" />

          {/* Action Buttons Grid on Mobile */}
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2.5">
            {/* Smart CSV Importer Trigger */}
            <button 
              onClick={() => {
                if (!currentCampaign) {
                  showToast("Select or create an active campaign first.", "warning");
                  return;
                }
                setShowSmartImportModal(true);
              }}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-brand-alt/10 border border-brand-alt/30 text-brand-alt rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Smart columns fuzzy-mapping CSV importer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="truncate">Smart Import</span>
            </button>

            {/* Manual paste trigger */}
            <button 
              onClick={() => {
                if (!currentCampaign) {
                  showToast("Select or create an active campaign first.", "warning");
                  return;
                }
                setShowBulkAddModal(true);
              }}
              className="w-full sm:w-auto px-3.5 py-2.5 border border-border bg-surface-alt hover:bg-border rounded-xl text-xs font-bold text-text-muted hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="truncate">Paste CSV</span>
            </button>
          </div>

          <div className="hidden sm:block w-[1px] h-6 bg-border mx-1" />

          {/* View switcher tabs */}
          <div className="flex items-center gap-3 bg-surface-alt/50 border border-border p-1 rounded-xl justify-center sm:justify-start">
            <button
              onClick={() => setViewType("kanban")}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                viewType === "kanban" ? "bg-brand text-white shadow-sm" : "text-text-muted hover:text-white"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setViewType("list")}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                viewType === "list" ? "bg-brand text-white shadow-sm" : "text-text-muted hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Product DNA Panel */}
      <AnimatePresence>
        {showDnaPanel && currentCampaign && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface border border-border rounded-3xl p-6 text-left space-y-4 overflow-hidden relative"
          >
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Briefcase className="w-5 h-5 text-brand" />
              <h3 className="text-sm font-bold text-white font-syne">Product DNA Configuration</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Company Name</label>
                    <input 
                      className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand"
                      placeholder="Company"
                      value={config.company}
                      onChange={e => setConfig((prev: any) => ({ ...prev, company: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Product / Solution</label>
                    <input 
                      className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand"
                      placeholder="Product"
                      value={config.product}
                      onChange={e => setConfig((prev: any) => ({ ...prev, product: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Value Proposition</label>
                  <textarea 
                    className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand min-h-[90px] resize-none"
                    placeholder="Describe your solution's core value hook..."
                    value={config.vp}
                    onChange={e => setConfig((prev: any) => ({ ...prev, vp: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Sender Representative</label>
                    <input 
                      className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand"
                      value={config.sender}
                      onChange={e => setConfig((prev: any) => ({ ...prev, sender: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Call To Action (CTA)</label>
                    <select 
                      className="w-full bg-surface-alt border border-border rounded-xl p-3 text-xs outline-none focus:border-brand cursor-pointer"
                      value={config.cta}
                      onChange={e => setConfig((prev: any) => ({ ...prev, cta: e.target.value }))}
                    >
                      <option>20-minute demo call</option>
                      <option>15-minute intro call</option>
                      <option>Reply with interest</option>
                      <option>Book via Calendly</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-end justify-end pt-5">
                  <button 
                    onClick={async () => {
                      await updateDoc(doc(db, 'campaigns', currentCampaign.id), { config });
                      showToast('Product DNA saved successfully!', 'success');
                      setShowDnaPanel(false);
                    }}
                    className="px-6 py-3 bg-brand text-white font-bold rounded-xl text-xs hover:opacity-95 flex items-center gap-1.5 shadow-lg shadow-brand/10 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Primary Board / List rendering */}
      {viewType === "kanban" ? (
        /* ── NEW KANBAN BOARD ── */
        <div
          className="flex gap-4 overflow-x-auto px-1 pb-5 pt-1 select-none items-stretch custom-scrollbar snap-x snap-mandatory scroll-p-1"
          style={{ minHeight: 'calc(100vh - 260px)' }}
        >
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter(l => getLeadStage(l) === stage.name);
            const isOver = dragOverStageId === stage.id;

            // Pick a subtle left-border accent color per stage
            const accentBorder = stage.color;

            return (
              <div
                key={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={() => setDragOverStageId(null)}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`flex flex-col flex-shrink-0 w-[85vw] sm:w-[286px] rounded-2xl border transition-all duration-300 overflow-hidden snap-center ${
                  isOver
                    ? 'border-dashed scale-[1.01]'
                    : 'border-[#1e2130]'
                }`}
                style={{
                  backgroundColor: '#141722',
                  borderColor: isOver ? accentBorder : '#1e2130',
                  boxShadow: isOver ? `0 0 0 2px ${accentBorder}33, 0 16px 40px rgba(0,0,0,0.35)` : '0 10px 30px rgba(0,0,0,0.18)',
                  // Full viewport height minus header — column scrolls independently
                  height: 'calc(100vh - 235px)',
                  minHeight: '520px',
                  maxHeight: '760px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* ── Column Header ── */}
                <div className="sticky top-0 z-20 px-4 pt-4 pb-3 flex items-start justify-between gap-2 shrink-0 bg-[#141722]/95 backdrop-blur-md border-b border-white/[0.04]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentBorder }} />
                      <h4 className="text-sm font-bold text-white leading-tight truncate" title={stage.name}>
                        {stage.name}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {stageLeads.length} {stageLeads.length === 1 ? 'lead' : 'leads'} · {stage.probability}% probability
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {/* Count badge */}
                    <span
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-extrabold font-mono"
                      style={{ backgroundColor: `${accentBorder}20`, color: accentBorder }}
                    >
                      {stageLeads.length}
                    </span>
                    <button className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer" title="Column options">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="sticky top-[65px] z-20 px-4 pb-3 shrink-0 bg-[#141722]/95 backdrop-blur-md">
                  <div className="h-[2px] w-full bg-[#1e2130] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (stageLeads.length / Math.max(filteredLeads.length, 1)) * 100)}%`,
                        backgroundColor: accentBorder
                      }}
                    />
                  </div>
                </div>

                {/* ── Cards — unlimited scroll ── */}
                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar scroll-smooth">
                  {stageLeads.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed rounded-xl mt-2 bg-black/10"
                      style={{ borderColor: `${accentBorder}40` }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${accentBorder}16`, color: accentBorder }}>
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">No leads here yet</span>
                      <span className="text-[9px] text-slate-600 mt-1">Drag a card or add a lead</span>
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const score = lead.score ?? calculateLeadScore(lead);
                      const msg = messages[lead.id];
                      const hasEmail  = chState.em && lead.email;
                      const hasWa     = chState.wa && lead.phone;
                      const hasLi     = chState.li && lead.linkedin_url;
                      // Derive a short date label
                      const dateLabel = lead.createdAt?.toDate
                        ? lead.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Recently';
                      // Avatar color from name
                      const avatarColor = (name: string) => {
                        const hues = [210, 150, 30, 0, 270, 180, 320];
                        const idx = (name || 'A').charCodeAt(0) % hues.length;
                        return `hsl(${hues[idx]}, 65%, 55%)`;
                      };

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => openLeadDrawer(lead)}
                          className="rounded-xl border cursor-grab active:cursor-grabbing text-left transition-all duration-200 hover:translate-y-[-2px] hover:border-white/15 hover:shadow-xl group overflow-hidden"
                          style={{
                            backgroundColor: '#0b0d14',
                            borderColor: '#1e2333',
                            borderLeftWidth: '3px',
                            borderLeftColor: accentBorder,
                            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                          }}
                        >
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h5
                                className="text-[13px] font-bold text-white leading-snug group-hover:text-blue-300 transition-colors line-clamp-2"
                                title={lead.name}
                              >
                                {lead.name || "Unnamed lead"}
                              </h5>
                              <span
                                className="shrink-0 px-2 py-1 rounded-lg text-[9px] font-extrabold border"
                                style={{
                                  backgroundColor: score >= 70 ? 'rgba(16,185,129,0.12)' : score >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(244,63,94,0.12)',
                                  borderColor: score >= 70 ? 'rgba(16,185,129,0.22)' : score >= 40 ? 'rgba(245,158,11,0.22)' : 'rgba(244,63,94,0.22)',
                                  color: score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#fb7185'
                                }}
                              >
                                {score}
                              </span>
                            </div>

                            {/* Description = role + company */}
                            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-3 min-h-[32px]">
                              {lead.role}{lead.company ? ` · ${lead.company}` : ''}
                              {lead.industry ? ` · ${lead.industry}` : ''}
                            </p>

                             {/* Outreach channel mini-badges & Intel option */}
                             <div className="flex items-center justify-between mb-3 min-h-[22px]">
                               <div className="flex flex-wrap items-center gap-1.5">
                                 {hasEmail && (
                                   <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">✉ Email</span>
                                 )}
                                 {hasWa && (
                                   <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">📱 WA</span>
                                 )}
                                 {hasLi && (
                                   <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">in LI</span>
                                 )}
                                 {msg && (
                                   <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/20">AI ✓</span>
                                 )}
                               </div>

                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   openLeadDrawer(lead, 'intelligence');
                                 }}
                                 className="px-2 py-0.5 bg-brand/10 border border-brand/20 hover:bg-brand text-brand hover:text-white rounded-lg text-[8.5px] font-extrabold transition-all cursor-pointer flex items-center gap-0.5 shrink-0"
                                 title="View AI dossier"
                               >
                                 <span>🔍 Intel</span>
                               </button>
                             </div>

                            {/* Bottom row: avatars + date */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                              {/* Avatar stack */}
                              <div className="flex items-center -space-x-2">
                                {/* Lead avatar */}
                                <div
                                  className="w-7 h-7 rounded-full border-2 border-[#0e1019] flex items-center justify-center text-[10px] font-extrabold text-white shrink-0"
                                  style={{ backgroundColor: avatarColor(lead.name) }}
                                  title={lead.name}
                                >
                                  {(lead.name || '?')[0].toUpperCase()}
                                </div>
                                {/* Company avatar */}
                                {lead.company && (
                                  <div
                                    className="w-7 h-7 rounded-full border-2 border-[#0e1019] flex items-center justify-center text-[10px] font-extrabold text-white shrink-0"
                                    style={{ backgroundColor: avatarColor(lead.company + '1') }}
                                    title={lead.company}
                                  >
                                    {lead.company[0].toUpperCase()}
                                  </div>
                                )}
                                <div className="w-7 h-7 rounded-full border-2 border-[#0e1019] flex items-center justify-center text-[8px] font-extrabold shrink-0 bg-slate-800 text-slate-300" title={getLeadStage(lead)}>
                                  {getLeadStage(lead).slice(0, 2).toUpperCase()}
                                </div>
                              </div>

                              {/* Date badge */}
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <Calendar className="w-3 h-3" />
                                <span>{dateLabel}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* ── Add New pinned footer ── */}
                <div className="sticky bottom-0 z-20 p-3 shrink-0 border-t border-[#1e2130] bg-[#141722]/95 backdrop-blur-md shadow-[0_-16px_28px_rgba(9,10,15,0.62)]">
                  <button
                    onClick={() => openSingleLeadModal(stage.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer hover:brightness-110 active:scale-[0.99]"
                    style={{
                      backgroundColor: accentBorder,
                      color: '#fff',
                      boxShadow: `0 4px 14px ${accentBorder}40`
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Add New
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* list layout */
        <div className="bg-surface border border-border shadow-xl rounded-3xl p-6 text-left select-none space-y-4">
          <div className="space-y-1 border-b border-border/30 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white font-syne flex items-center gap-2">
                <List className="w-5 h-5 text-brand" />
                Campaign Target Prospects List
              </h3>
              <p className="text-[10px] text-text-muted">A structured table containing all target prospects synced within campaign boundaries.</p>
            </div>
            
            {selectedLeadIds.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete ${selectedLeadIds.length} prospects?`)) {
                      for (const id of selectedLeadIds) {
                        await handleDeleteLead(id);
                      }
                      setSelectedLeadIds([]);
                      showToast("Bulk delete completed", "success");
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Bulk Delete ({selectedLeadIds.length})
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-[9px] uppercase font-bold text-text-muted tracking-widest bg-surface-alt/50">
                  <th className="py-4 px-6 text-left w-12">
                    <input 
                      type="checkbox"
                      checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeadIds(filteredLeads.map(l => l.id));
                        } else {
                          setSelectedLeadIds([]);
                        }
                      }}
                      className="w-4 h-4 rounded text-brand border-border bg-[#090a0f] focus:ring-brand focus:ring-offset-0 focus:ring-1"
                    />
                  </th>
                  <th className="py-4 px-6 text-left">Prospect</th>
                  <th className="py-4 px-6 text-left">Score</th>
                  <th className="py-4 px-6 text-left">Contact channels</th>
                  <th className="py-4 px-6 text-left">Pipeline Stage</th>
                  <th className="py-4 px-6 text-left">Location</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/65 text-xs text-text">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted italic bg-surface-alt/5 font-mono">
                      No prospects discovered in campaign workspace search segment.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const stage = PIPELINE_STAGES.find(s => s.name === getLeadStage(lead));
                    const score = calculateLeadScore(lead);
                    const isSelected = selectedLeadIds.includes(lead.id);

                    return (
                      <tr 
                        key={lead.id}
                        className={`hover:bg-surface-alt/45 transition-colors cursor-pointer ${isSelected ? 'bg-brand/5' : ''}`}
                        onClick={() => openLeadDrawer(lead)}
                      >
                        <td className="py-3.5 px-6" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeadIds(prev => [...prev, lead.id]);
                              } else {
                                setSelectedLeadIds(prev => prev.filter(id => id !== lead.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-brand border-border bg-[#090a0f] focus:ring-brand focus:ring-offset-0"
                          />
                        </td>
                        <td className="py-3.5 px-6">
                          <div className="font-extrabold text-white">{lead.name}</div>
                          <div className="text-[10px] text-text-muted mt-0.5">{lead.role} @ {lead.company}</div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`px-1.5 py-0.5 rounded font-mono font-bold border ${getScoreColor(score)}`}>
                            {score}%
                          </span>
                        </td>
                        <td className="py-3.5 px-6" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2.5 text-text-muted">
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className="hover:text-brand transition-all" title={lead.phone}><Phone className="w-4 h-4" /></a>
                            ) : (
                              <Phone className="w-4 h-4 opacity-20" />
                            )}
                            {lead.email ? (
                              <a href={`mailto:${lead.email}`} className="hover:text-brand transition-all" title={lead.email}><Mail className="w-4 h-4" /></a>
                            ) : (
                              <Mail className="w-4 h-4 opacity-20" />
                            )}
                            {lead.linkedin_url ? (
                              <a href={lead.linkedin_url.startsWith('http') ? lead.linkedin_url : `https://${lead.linkedin_url}`} target="_blank" rel="noreferrer" className="hover:text-brand transition-all" title={lead.linkedin_url}><Linkedin className="w-4 h-4" /></a>
                            ) : (
                              <Linkedin className="w-4 h-4 opacity-20" />
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${stage?.color}15`, color: stage?.color, border: `1px solid ${stage?.color}30` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color }} />
                            {stage?.name || 'Imported'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-mono text-[10px] text-text-muted">
                          {COUNTRY_FLAGS[lead.country] || '🌍'} {lead.country || 'Global'}
                        </td>
                        <td className="py-3.5 px-6 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => openLeadDrawer(lead, 'intelligence')}
                              className="px-2.5 py-1.5 bg-brand/10 border border-brand/20 text-brand hover:bg-brand hover:text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              🔍 Intel
                            </button>
                            <button 
                              onClick={() => openLeadDrawer(lead)}
                              className="px-2.5 py-1.5 bg-surface-alt border border-border text-slate-300 hover:bg-border hover:text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Interactive 4-Tab Lead Profile Drawer (Right Slide Out) */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end">
            <div className="absolute inset-0 w-full h-full" onClick={() => setSelectedLead(null)} />

            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full sm:max-w-2xl bg-[#0b0c10]/95 backdrop-blur-md border-l border-border/80 shadow-[-10px_0_40px_rgba(0,0,0,0.6)] flex flex-col h-full z-10"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-border/60 flex items-center justify-between bg-surface-alt/70">
                <div className="space-y-1 text-left">
                  <span className="px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest text-[#8b5cf6] bg-[#8b5cf6]/10 border border-[#8b5cf6]/25 rounded-md">
                    Salesperson Prospect File
                  </span>
                  <h3 className="text-base font-extrabold text-white truncate max-w-sm mt-1">{selectedLead.name}</h3>
                  <p className="text-[10px] text-text-muted font-medium font-mono">{selectedLead.role} @ {selectedLead.company}</p>
                </div>
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="p-1.5 bg-surface-alt border border-border hover:bg-border text-text-muted hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Four Tab Headers */}
              <div className="flex border-b border-border bg-surface-alt/30 select-none">
                {[
                  { key: 'overview', label: '🏠 Overview' },
                  { key: 'outreach', label: '✉️ AI Outreach' },
                  { key: 'history', label: '⏳ History' },
                  { key: 'intelligence', label: '🔍 Prospect Intelligence' }
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setSelectedTab(t.key as any)}
                    className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 ${
                      selectedTab === t.key 
                        ? 'text-brand border-brand bg-brand/5' 
                        : 'text-text-muted border-transparent hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-surface text-left">
                
                {/* TAB 1 — Overview */}
                {selectedTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Header edit action */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Contact Specifications</h4>
                      <button 
                        onClick={() => {
                          if (isEditingLead) {
                            handleSaveLeadEdit();
                          } else {
                            setEditedLeadData({ ...selectedLead });
                            setIsEditingLead(true);
                          }
                        }}
                        className="px-3 py-1.5 bg-brand/10 border border-brand/20 hover:bg-brand text-brand hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {isEditingLead ? <Save className="w-3 h-3" /> : <Settings className="w-3 h-3" />}
                        {isEditingLead ? "Save Details" : "Edit Contact"}
                      </button>
                    </div>

                    {isEditingLead ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted font-bold uppercase">Name</label>
                          <input 
                            type="text" 
                            className="w-full bg-surface-alt border border-border rounded-xl p-2.5 text-white" 
                            value={editedLeadData.name || ""} 
                            onChange={e => setEditedLeadData({ ...editedLeadData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted font-bold uppercase">Role Title</label>
                          <input 
                            type="text" 
                            className="w-full bg-surface-alt border border-border rounded-xl p-2.5 text-white" 
                            value={editedLeadData.role || ""} 
                            onChange={e => setEditedLeadData({ ...editedLeadData, role: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted font-bold uppercase">Company Name</label>
                          <input 
                            type="text" 
                            className="w-full bg-surface-alt border border-border rounded-xl p-2.5 text-white" 
                            value={editedLeadData.company || ""} 
                            onChange={e => setEditedLeadData({ ...editedLeadData, company: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted font-bold uppercase">Email Address</label>
                          <input 
                            type="email" 
                            className="w-full bg-surface-alt border border-border rounded-xl p-2.5 text-white" 
                            value={editedLeadData.email || ""} 
                            onChange={e => setEditedLeadData({ ...editedLeadData, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted font-bold uppercase">Phone Number</label>
                          <input 
                            type="text" 
                            className="w-full bg-surface-alt border border-border rounded-xl p-2.5 text-white" 
                            value={editedLeadData.phone || ""} 
                            onChange={e => setEditedLeadData({ ...editedLeadData, phone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-text-muted font-bold uppercase">LinkedIn Profile Link</label>
                          <input 
                            type="text" 
                            className="w-full bg-surface-alt border border-border rounded-xl p-2.5 text-white" 
                            value={editedLeadData.linkedin_url || ""} 
                            onChange={e => setEditedLeadData({ ...editedLeadData, linkedin_url: e.target.value })}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="bg-surface-alt border border-border p-3.5 rounded-2xl">
                          <span className="text-[8px] text-text-muted uppercase tracking-wider block mb-0.5">Corporate Role</span>
                          <span className="text-white font-bold block truncate">{selectedLead.role || "N/A"}</span>
                        </div>
                        <div className="bg-surface-alt border border-border p-3.5 rounded-2xl">
                          <span className="text-[8px] text-text-muted uppercase tracking-wider block mb-0.5">Enterprise Company</span>
                          <span className="text-white font-bold block truncate">{selectedLead.company || "N/A"}</span>
                        </div>
                        <div className="bg-surface-alt border border-border p-3.5 rounded-2xl">
                          <span className="text-[8px] text-text-muted uppercase tracking-wider block mb-0.5">Verified Email</span>
                          <span className="text-brand font-mono font-bold block truncate">{selectedLead.email || "N/A"}</span>
                        </div>
                        <div className="bg-surface-alt border border-border p-3.5 rounded-2xl">
                          <span className="text-[8px] text-text-muted uppercase tracking-wider block mb-0.5">Verified Phone</span>
                          <span className="text-white font-mono font-bold block truncate">{selectedLead.phone || "N/A"}</span>
                        </div>
                      </div>
                    )}

                    {/* Staging & Rep selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 text-xs">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Pipeline Stage</label>
                        <select 
                          value={getLeadStage(selectedLead)}
                          onChange={async (e) => {
                            const newStage = e.target.value;
                            await handleUpdateLead(selectedLead.id, { stage: newStage });
                            setSelectedLead({ ...selectedLead, stage: newStage });
                          }}
                          className="w-full bg-surface-alt border border-border text-white rounded-xl p-3 text-xs font-bold outline-none cursor-pointer focus:border-brand"
                        >
                          {PIPELINE_STAGES.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 text-xs">
                        <label className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Assigned representative</label>
                        <select 
                          value={selectedLead.assignedAgent || profile.displayName || "SDR Operator"}
                          onChange={async (e) => {
                            const agent = e.target.value;
                            await handleUpdateLead(selectedLead.id, { assignedAgent: agent });
                            setSelectedLead({ ...selectedLead, assignedAgent: agent });
                          }}
                          className="w-full bg-surface-alt border border-border text-white rounded-xl p-3 text-xs font-bold outline-none cursor-pointer focus:border-brand"
                        >
                          <option value="Sarah Mitchell">Sarah Mitchell</option>
                          <option value="James Ochieng">James Ochieng</option>
                          <option value={profile.displayName}>{profile.displayName}</option>
                        </select>
                      </div>
                    </div>

                    {/* Lead Score Rationale bento grid */}
                    <div className="bg-[#0f111a] border border-border/80 rounded-3xl p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-border/25 pb-2">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-brand">Prospect Score Alignment</span>
                        <span className={`px-2 py-0.5 rounded font-mono font-extrabold text-[10px] border ${getScoreColor(calculateLeadScore(selectedLead))}`}>
                          Score: {calculateLeadScore(selectedLead)}%
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted leading-relaxed">
                        High lead scores represent decision maker seniority, product relevance alignment, and active channels discoverability.
                      </p>
                    </div>

                    {/* Notes field */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Representative Internal Notes</h4>
                      <textarea
                        value={leadNotes}
                        onChange={(e) => setLeadNotes(e.target.value)}
                        placeholder="Log custom prospect specifications or callback notes here..."
                        className="w-full bg-surface-alt border border-border text-slate-200 placeholder:text-text-muted rounded-2xl p-4 text-xs outline-none focus:border-brand h-28 resize-none select-text"
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={handleSaveNotes}
                          className="px-4.5 py-2 bg-[#10b981] hover:bg-[#10b981]/90 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-md"
                        >
                          <Save className="w-3.5 h-3.5 text-slate-950" />
                          Update Notes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2 — AI Outreach */}
                {selectedTab === 'outreach' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Omnichannel message drafts</h4>
                        <p className="text-[10px] text-text-muted mt-0.5">Draft cold outreach personalized across active channels simultaneously.</p>
                      </div>

                      <button
                        onClick={() => handleRegenerateOutreach(selectedTone.wa)}
                        disabled={isGeneratingLeadOutreach}
                        className="px-4 py-2 bg-brand text-white hover:opacity-90 rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all shadow-md"
                      >
                        <RefreshCw className={`w-3 h-3 ${isGeneratingLeadOutreach ? 'animate-spin' : ''}`} />
                        {isGeneratingLeadOutreach ? "Regenerating..." : "Generate drafts"}
                      </button>
                    </div>

                    {/* AI Draft cards */}
                    {(() => {
                      const msg = messages[selectedLead.id];

                      if (!msg) {
                        return (
                          <div className="text-center py-12 border border-dashed border-border rounded-3xl space-y-3 bg-surface-alt/25">
                            <Sparkles className="w-8 h-8 text-slate-700 mx-auto" />
                            <h5 className="text-xs font-bold text-white">No drafts ready yet</h5>
                            <p className="text-[10px] text-text-muted max-w-sm mx-auto">Click "Generate drafts" to personal messages for WhatsApp, LinkedIn InMail, and Email customized for this prospect.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {/* Tone selector */}
                          <div className="flex items-center gap-3 text-xs bg-surface-alt p-3 rounded-2xl border border-border">
                            <span className="font-bold text-white">Outreach Tone:</span>
                            <select
                              value={selectedTone.wa}
                              onChange={(e) => {
                                const newTone = e.target.value;
                                setSelectedTone({ wa: newTone, li: newTone, em: newTone });
                                handleRegenerateOutreach(newTone);
                              }}
                              className="bg-[#0b0c10] border border-border text-xs text-[#8b5cf6] font-bold rounded-lg py-1 px-3 outline-none cursor-pointer"
                            >
                              <option>Conversational</option>
                              <option>Professional B2B</option>
                              <option>Concise</option>
                            </select>
                          </div>

                          {/* Email Draft Card */}
                          <div className="bg-surface-alt border border-border rounded-3xl p-5 space-y-3 relative overflow-hidden">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-email flex items-center gap-1.5"><Mail className="w-4 h-4 text-email" /> Email Pitch Draft</span>
                              <button 
                                onClick={() => handleSendOutreach('em', msg.email_body, msg.email_subject)}
                                className="px-3 py-1.5 bg-email/15 border border-email/30 hover:bg-email text-email hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                Send Now
                              </button>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="p-2.5 bg-[#090a0f] border border-border rounded-xl">
                                <span className="text-[8px] text-text-muted uppercase tracking-wider block mb-0.5">Subject Line</span>
                                <strong className="text-white font-mono">{msg.email_subject}</strong>
                              </div>
                              <div 
                                contentEditable
                                onBlur={async (e) => {
                                  await updateDoc(doc(db, 'messages', selectedLead.id), { email_body: e.currentTarget.innerText });
                                }}
                                className="p-3 bg-[#090a0f] border border-border rounded-xl font-mono text-[11px] text-slate-350 leading-relaxed outline-none min-h-[80px]"
                                dangerouslySetInnerHTML={{ __html: (msg.email_body || '').replace(/\n/g, '<br>') }}
                              />
                            </div>
                          </div>

                          {/* WhatsApp Draft Card */}
                          <div className="bg-surface-alt border border-border rounded-3xl p-5 space-y-3">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-whatsapp flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-whatsapp" /> WhatsApp conversational</span>
                              <button 
                                onClick={() => handleSendOutreach('wa', msg.whatsapp)}
                                className="px-3 py-1.5 bg-whatsapp/15 border border-whatsapp/30 hover:bg-whatsapp text-whatsapp hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                Send Now
                              </button>
                            </div>
                            <div 
                              contentEditable
                              onBlur={async (e) => {
                                await updateDoc(doc(db, 'messages', selectedLead.id), { whatsapp: e.currentTarget.innerText });
                              }}
                              className="p-3 bg-[#090a0f] border border-border rounded-xl font-mono text-[11px] text-slate-350 leading-relaxed outline-none min-h-[60px]"
                              dangerouslySetInnerHTML={{ __html: msg.whatsapp }}
                            />
                          </div>

                          {/* LinkedIn Draft Card */}
                          <div className="bg-surface-alt border border-border rounded-3xl p-5 space-y-3">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-linkedin flex items-center gap-1.5"><Linkedin className="w-4 h-4 text-linkedin" /> LinkedIn Connection note</span>
                              <button 
                                onClick={() => handleSendOutreach('li', msg.linkedin_connect)}
                                className="px-3 py-1.5 bg-linkedin/15 border border-linkedin/30 hover:bg-linkedin text-linkedin hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                Send Now
                              </button>
                            </div>
                            <div 
                              contentEditable
                              onBlur={async (e) => {
                                await updateDoc(doc(db, 'messages', selectedLead.id), { linkedin_connect: e.currentTarget.innerText });
                              }}
                              className="p-3 bg-[#090a0f] border border-border rounded-xl font-mono text-[11px] text-slate-350 leading-relaxed outline-none min-h-[60px]"
                              dangerouslySetInnerHTML={{ __html: msg.linkedin_connect }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* TAB 3 — Message History */}
                {selectedTab === 'history' && (
                  <div className="space-y-5">
                    <div className="border-b border-border/45 pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Sent Outreach Timeline</h4>
                      <p className="text-[10px] text-text-muted mt-0.5">A chronological feed containing all outreach dispatched from Zyntra bridge.</p>
                    </div>

                    {selectedLead.status === 'sent' || getLeadStage(selectedLead) === 'Outreach Sent' ? (
                      <div className="relative border-l border-border pl-4 space-y-6">
                        <div className="relative space-y-1.5 text-left">
                          <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-surface bg-emerald-450" />
                          <div className="text-[11px] font-extrabold text-white flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-syne"><Mail className="w-3.5 h-3.5 text-brand" /> Cold Outreach Dispatched</span>
                            <span className="text-[8px] text-text-muted font-mono">Dispatched</span>
                          </div>
                          <p className="text-[10px] text-text-muted leading-relaxed">
                            Personalized campaign pitch sent to {selectedLead.email || 'prospect destinations'}.
                          </p>
                          <div className="px-2.5 py-1 bg-surface-alt border border-border text-[9px] rounded-lg text-text-muted font-mono flex items-center gap-1 w-max">
                            <Check className="w-3 h-3 text-[#10b981]" /> Status: Delivered
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 opacity-30 space-y-3 font-mono text-xs">
                        <History className="w-12 h-12 mx-auto" />
                        <p>Timeline is currently inactive. Dispatch drafts to log communications.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4 — Intelligence */}
                {selectedTab === 'intelligence' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Prospect dossier preview</h4>
                        <p className="text-[10px] text-text-muted mt-0.5">Structured AI company news signals, likely B2B pain points, and value hooks.</p>
                      </div>

                      <button
                        onClick={handleExecuteIntelligence}
                        disabled={isExecutingIntelligence}
                        className={`px-3.5 py-1.5 border rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                          executedIntelligenceMap[selectedLead.id]
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                            : 'bg-brand/10 border-brand/20 text-brand hover:bg-brand hover:text-white'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isExecutingIntelligence ? 'animate-spin' : ''}`} />
                        {isExecutingIntelligence ? "Executing..." : executedIntelligenceMap[selectedLead.id] ? "Refresh Intelligence" : "Execute Intelligence"}
                      </button>
                    </div>

                    {!executedIntelligenceMap[selectedLead.id] ? (
                      <div className="text-center py-16 opacity-50 space-y-3 font-mono text-xs">
                        <Sparkles className="w-10 h-10 mx-auto text-brand opacity-60" />
                        <p className="text-white">No intelligence generated yet.</p>
                        <p className="text-[10px] text-text-muted max-w-[200px] mx-auto leading-relaxed">
                          Click "Execute Intelligence" to run deep research on this prospect.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-5 text-xs text-slate-350 animate-fadeIn">
                        
                        {/* Company Firmographics */}
                        <div className="bg-surface-alt border border-border p-5 rounded-2xl space-y-4">
                          <strong className="text-white uppercase font-mono tracking-wider text-xs block">Company Firmographics</strong>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div><span className="text-text-muted">Industry:</span> <span className="text-white font-bold block mt-1">{executedIntelligenceMap[selectedLead.id].companyInfo?.industry || "Unknown"}</span></div>
                            <div><span className="text-text-muted">Revenue:</span> <span className="text-white font-bold block mt-1">{executedIntelligenceMap[selectedLead.id].companyInfo?.revenue || "Unknown"}</span></div>
                            <div><span className="text-text-muted">Employees:</span> <span className="text-white font-bold block mt-1">{executedIntelligenceMap[selectedLead.id].companyInfo?.employees || "Unknown"}</span></div>
                            <div><span className="text-text-muted">HQ:</span> <span className="text-white font-bold block mt-1">{executedIntelligenceMap[selectedLead.id].companyInfo?.hq || "Unknown"}</span></div>
                          </div>
                        </div>

                        {/* Tech Stack */}
                        <div className="bg-surface-alt border border-border p-5 rounded-2xl space-y-4">
                          <strong className="text-indigo-400 uppercase font-mono tracking-wider text-xs block">Detected Tech Stack</strong>
                          <div className="flex flex-wrap gap-2.5">
                            {executedIntelligenceMap[selectedLead.id].techStack?.erp?.name && <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-xs text-indigo-300">ERP: {executedIntelligenceMap[selectedLead.id].techStack.erp.name}</span>}
                            {executedIntelligenceMap[selectedLead.id].techStack?.crm?.name && <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-xs text-indigo-300">CRM: {executedIntelligenceMap[selectedLead.id].techStack.crm.name}</span>}
                            {executedIntelligenceMap[selectedLead.id].techStack?.bi?.name && <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-xs text-indigo-300">BI: {executedIntelligenceMap[selectedLead.id].techStack.bi.name}</span>}
                            {executedIntelligenceMap[selectedLead.id].techStack?.websiteTech?.slice(0, 3).map(tech => <span key={tech} className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-xs text-indigo-300">{tech}</span>)}
                          </div>
                        </div>

                        {/* Detailed Pain Points */}
                        <div className="space-y-4">
                          <strong className="text-rose-400 uppercase font-mono tracking-wider text-xs block">Verified Pain Points</strong>
                          {executedIntelligenceMap[selectedLead.id].painPoints?.map((pain, idx) => (
                            <div key={idx} className="bg-surface-alt border border-rose-500/20 p-5 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white">{pain.title}</span>
                                <span className={`text-[10px] px-2.5 py-1 rounded-md uppercase font-extrabold ${pain.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : pain.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'}`}>{pain.severity}</span>
                              </div>
                              <p className="text-text-muted text-xs leading-relaxed">{pain.description}</p>
                              <div className="text-xs border-l-2 border-border pl-3 mt-3 space-y-2">
                                <span className="text-text font-medium block">Impact: {pain.impact}</span>
                                {pain.evidence?.[0] && <span className="text-text-muted italic block text-xs">"{pain.evidence[0].quote}"<br/><span className="text-[10px] text-text-muted mt-1 block">— {pain.evidence[0].source}</span></span>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* AI Solutions & Target Value Proposition */}
                        <div className="space-y-4">
                          <strong className="text-[#00d4aa] uppercase font-mono tracking-wider text-xs block">Target Value Proposition Hooks</strong>
                          {executedIntelligenceMap[selectedLead.id].aiSolutions?.map((sol, idx) => (
                            <div key={idx} className="bg-surface-alt border border-[#00d4aa]/20 p-5 rounded-xl space-y-3">
                              <span className="text-sm font-bold text-white block">{sol.title}</span>
                              <p className="text-text-muted text-xs leading-relaxed">{sol.mvp}</p>
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div className="bg-[#090a0f] p-3 rounded-lg border border-border">
                                  <span className="text-[10px] text-text-muted uppercase block mb-1">Potential LTV</span>
                                  <span className="text-sm font-mono text-[#00d4aa] font-bold">{sol.pricing?.potentialLtv || 'Unknown'}</span>
                                </div>
                                <div className="bg-[#090a0f] p-3 rounded-lg border border-border">
                                  <span className="text-[10px] text-text-muted uppercase block mb-1">Year 1 Contract</span>
                                  <span className="text-sm font-mono text-[#00d4aa] font-bold">{sol.pricing?.year1Contract || 'Unknown'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Decision Maker & GTM Strategy */}
                        <div className="bg-surface-alt border border-brand/20 p-5 rounded-2xl space-y-4">
                          <strong className="text-brand uppercase font-mono tracking-wider text-xs block">GTM Strategy & Decision Maker</strong>
                          
                          {executedIntelligenceMap[selectedLead.id].gtmStrategy?.decisionMaker && (
                            <div className="bg-[#090a0f] p-4 rounded-xl border border-border flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                                <Target className="w-5 h-5 text-brand" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-sm font-bold text-white block">{executedIntelligenceMap[selectedLead.id].gtmStrategy.decisionMaker.name || 'Unknown Executive'}</span>
                                <span className="text-xs text-brand uppercase font-bold block">{executedIntelligenceMap[selectedLead.id].gtmStrategy.decisionMaker.title || 'Decision Maker'}</span>
                                <div className="mt-2 space-y-2 pt-2 border-t border-border/50">
                                  <span className="text-xs text-text-muted block"><strong className="text-text">Motivations:</strong> {executedIntelligenceMap[selectedLead.id].gtmStrategy.decisionMaker.motivation || 'N/A'}</span>
                                  <span className="text-xs text-text-muted block"><strong className="text-text">Owns Pain:</strong> {executedIntelligenceMap[selectedLead.id].gtmStrategy.decisionMaker.painOwns || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-4 pt-3 border-t border-border/50">
                            <div>
                              <span className="text-[10px] text-text-muted uppercase block mb-1.5 font-bold">Cold Outreach Opening Hook</span>
                              <p className="text-xs text-white italic border-l-2 border-brand/40 pl-3 bg-brand/5 py-2 pr-2 rounded-r-lg leading-relaxed">"{executedIntelligenceMap[selectedLead.id].gtmStrategy?.openingHook || 'N/A'}"</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-text-muted uppercase block mb-1.5 font-bold">Core Pitch Message</span>
                              <p className="text-xs text-white italic border-l-2 border-brand/40 pl-3 bg-brand/5 py-2 pr-2 rounded-r-lg leading-relaxed">"{executedIntelligenceMap[selectedLead.id].gtmStrategy?.coreMessage || 'N/A'}"</p>
                            </div>
                          </div>
                        </div>

                        {/* AI Adoption & Competitors */}
                        <div className="bg-surface-alt border border-border p-5 rounded-2xl space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <strong className="text-amber-500 uppercase font-mono tracking-wider text-xs block">Market & Competitors</strong>
                            <span className="text-[10px] px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-md font-bold border border-amber-500/20 uppercase w-fit">
                              AI Maturity: {executedIntelligenceMap[selectedLead.id].aiAdoption?.maturityLevel || 'Unknown'}
                            </span>
                          </div>
                          
                          <div className="space-y-3 mt-3">
                            {executedIntelligenceMap[selectedLead.id].aiAdoption?.competitors?.map((comp, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                                <span className="font-bold text-white">{comp.name}</span>
                                <span className="text-text-muted font-medium bg-surface px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">{comp.aiMaturity} AI</span>
                              </div>
                            ))}
                            {(!executedIntelligenceMap[selectedLead.id].aiAdoption?.competitors || executedIntelligenceMap[selectedLead.id].aiAdoption!.competitors.length === 0) && (
                              <span className="text-xs text-text-muted">No competitor data found.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
