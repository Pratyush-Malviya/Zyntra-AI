import React, { useState, useEffect } from "react";
import { 
  Kanban, List, Plus, Search, Filter, RefreshCw, Sparkles, AlertCircle, 
  MapPin, Clock, Calendar, Briefcase, User, UserCheck, Tag, Trash2, 
  CheckCircle, ChevronRight, Activity, FileText, Check, MoreVertical, 
  ArrowRight, ShieldAlert, BarChart3, Mail, Phone, Users, History, TrendingUp, X
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  status: "imported" | "generated" | "sent";
  score: number;
  tags?: string[];
  assignedAgent?: string;
  industry?: string;
  country?: string;
  linkedin_url?: string;
}

interface Deal {
  id: string;
  leadId: string;
  title: string;
  value: number;
  stage: string;
  createdAt: string;
  assignedAgent?: string;
  tags?: string[];
  status?: "hot" | "warm" | "cold" | "lost";
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  probability: number;
  slaDays: number;
  statuses: string[];
}

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
}

interface Task {
  id: string;
  leadId?: string;
  dealId?: string;
  title: string;
  dueDate: string;
  completed: boolean;
  assignedAgent: string;
}

interface ActivityLog {
  id: string;
  dealId?: string;
  leadId?: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  agentName: string;
}

interface DealAiReport {
  dealId: string;
  reportJson: string;
  generatedAt: string;
  modelVersion: string;
}

interface CrmPipelineBoardProps {
  leads: Lead[];
  onLeadsUpdated?: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const CrmPipelineBoard: React.FC<CrmPipelineBoardProps> = ({ 
  leads: initialLeads, 
  onLeadsUpdated, 
  showToast 
}) => {
  // States
  const [viewType, setViewType] = useState<"kanban" | "list">("kanban");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelinesList, setPipelinesList] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<Pipeline | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [dealTasks, setDealTasks] = useState<Task[]>([]);
  const [dealActivities, setDealActivities] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("all");
  const [selectedAgentFilter, setSelectedAgentFilter] = useState("all");
  
  // UI Panels
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [showConfigPipelineModal, setShowConfigPipelineModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  
  // Creation Forms
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealValue, setNewDealValue] = useState(25000);
  const [newDealLeadId, setNewDealLeadId] = useState("");
  const [newDealAgent, setNewDealAgent] = useState("Sarah Mitchell");
  const [newDealStage, setNewDealStage] = useState("");
  const [newDealTags, setNewDealTags] = useState("");

  // Quick Action State
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newNoteText, setNewNoteText] = useState("");

  // Deduplication Duplicate Matches List
  const [duplicateConflicts, setDuplicateConflicts] = useState<{ leadA: Lead; leadB: Lead; fieldConflicts: string[] } | null>(null);

  // Load preferences, pipelines, and deals
  const refreshDbState = async () => {
    try {
      // 1. Fetch prefered views
      const prefRes = await fetch("/api/user-preferences");
      if (prefRes.ok) {
        const prefs = await prefRes.json();
        const defaultView = prefs.find((p: any) => p.key === "default_lead_view")?.value;
        if (defaultView === "list" || defaultView === "kanban") {
          setViewType(defaultView);
        }
      }

      // 2. Fetch pipelines
      const pipeRes = await fetch("/api/pipelines");
      if (pipeRes.ok) {
        const pipes = await pipeRes.json();
        setPipelinesList(pipes);
        if (pipes.length > 0) {
          setActivePipeline(pipes[0]);
        }
      }

      // 3. Fetch deals
      const dealsRes = await fetch("/api/deals");
      if (dealsRes.ok) {
        const d = await dealsRes.json();
        setDeals(d);
      }
    } catch (err) {
      console.error("Error fetching CRM pipeline data state", err);
    }
  };

  useEffect(() => {
    refreshDbState();
  }, [initialLeads]);

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("text/plain", dealId);
  };

  // Handle Drop Card Stage shift
  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain");
    const draggedDeal = deals.find(d => d.id === dealId);
    
    if (draggedDeal && draggedDeal.stage !== targetStageId) {
      // Optimistic state
      const updatedDeals = deals.map(d => d.id === dealId ? { ...d, stage: targetStageId } : d);
      setDeals(updatedDeals);

      try {
        const res = await fetch(`/api/deals/${dealId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: targetStageId, agentName: draggedDeal.assignedAgent || "Workspace Agent" })
        });
        
        if (res.ok) {
          showToast(`Deal promoted & stage changed to "${targetStageId}"!`, "success");
          if (onLeadsUpdated) onLeadsUpdated();
          refreshDbState();
        } else {
          showToast("Failed to drag deal to new pipeline stage.", "error");
          refreshDbState();
        }
      } catch (err) {
        showToast("Communication loss updating deal stage.", "error");
        refreshDbState();
      }
    }
  };

  // Load secondary Deal Context details (Notes, Tasks, AI Sonnet Close score reports)
  const selectActiveDeal = async (deal: Deal) => {
    setSelectedDeal(deal);
    setNewNoteText("");
    setNewTaskTitle("");
    
    try {
      // Fetch tasks
      const taskRes = await fetch("/api/tasks");
      if (taskRes.ok) {
        const allTasks: Task[] = await taskRes.json();
        setDealTasks(allTasks.filter(t => t.dealId === deal.id));
      }

      // Fetch dynamic timeline logs
      const actRes = await fetch("/api/activities");
      if (actRes.ok) {
        const allActs: ActivityLog[] = await actRes.json();
        setDealActivities(allActs.filter(a => a.dealId === deal.id));
      }

      // Fetch AI Sonnet close reports
      const aiRes = await fetch(`/api/deals/${deal.id}/ai-report`);
      if (aiRes.ok) {
        const rp = await aiRes.json();
        setAiReport(JSON.parse(rp.reportJson));
      } else {
        setAiReport(null);
      }
    } catch (err) {
      console.error("Error loaded deal secondary info panel", err);
    }
  };

  // Toggle View Preference Persistence
  const toggleViewPreference = async (type: "kanban" | "list") => {
    setViewType(type);
    try {
      await fetch("/api/user-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "default_lead_view", value: type })
      });
      showToast(`Saved ${type.toUpperCase()} layout as workspace preference.`, "info");
    } catch (err) {
      console.warn("Could not persist workspace layout preference.");
    }
  };

  // Add Task followup
  const handleAddTask = async () => {
    if (!selectedDeal || !newTaskTitle || !newTaskDueDate) {
      showToast("Please enter task action title and target reminder date.", "error");
      return;
    }
    
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          dueDate: newTaskDueDate,
          dealId: selectedDeal.id,
          assignedAgent: selectedDeal.assignedAgent || "Workspace Operator"
        })
      });

      if (res.ok) {
        showToast("Followup checklist reminder created successfully.", "success");
        setNewTaskTitle("");
        setNewTaskDueDate("");
        // Reload tasks
        const tRes = await fetch("/api/tasks");
        if (tRes.ok) {
          const allTasks = await tRes.json();
          setDealTasks(allTasks.filter((t: any) => t.dealId === selectedDeal.id));
        }
      }
    } catch (err) {
      showToast("Cannot initialize task.", "error");
    }
  };

  // Checkbox complete task toggle
  const handleToggleTask = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed })
      });
      if (res.ok) {
        const tRes = await fetch("/api/tasks");
        if (tRes.ok) {
          const allTasks = await tRes.json();
          setDealTasks(allTasks.filter((t: any) => t.dealId === selectedDeal!.id));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add notes logging timeline action
  const handleAddNote = async () => {
    if (!selectedDeal || !newNoteText.trim()) return;

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: selectedDeal.id,
          type: "note_added",
          title: "Internal Note logged",
          description: newNoteText,
          agentName: selectedDeal.assignedAgent || "Workspace Team"
        })
      });

      if (res.ok) {
        showToast("Negotiation note logged on chronological journey path.", "success");
        setNewNoteText("");
        const actRes = await fetch("/api/activities");
        if (actRes.ok) {
          const allActs = await actRes.json();
          setDealActivities(allActs.filter(a => a.dealId === selectedDeal.id));
        }
      }
    } catch (err) {
      showToast("Network error publishing notes log.", "error");
    }
  };

  // Trigger On-Demand AI Analyzer Recalculation (Claude Sonnet B2B engine)
  const handleRefreshAiReport = async () => {
    if (!selectedDeal) return;
    setIsRefreshingAi(true);
    showToast("Launching background Claude Closed Analyzer thread...", "info");

    try {
      const res = await fetch(`/api/deals/${selectedDeal.id}/ai-report/refresh`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setAiReport(data.report);
        // Save history logs comparison mapping (up to last 5 score items)
        setAiHistory(prev => [{ score: data.report.close_probability, date: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
        showToast("Claude Sonnet Close intelligence compiling complete!", "success");
        refreshDbState();
      } else {
        showToast("AI intelligence server returned error.", "error");
      }
    } catch (err) {
      showToast("Error invoking Claude API endpoint.", "error");
    } finally {
      setIsRefreshingAi(false);
    }
  };

  // Merge Duplicate Deduplication algorithm triggers
  const checkForDuplicates = () => {
    // Check every lead against other leads to see if we have email matches, phone matches or company name similarities
    for (let i = 0; i < initialLeads.length; i++) {
      for (let j = i + 1; j < initialLeads.length; j++) {
        const a = initialLeads[i];
        const b = initialLeads[j];
        
        const emailMatch = a.email && b.email && a.email.toLowerCase().trim() === b.email.toLowerCase().trim();
        const phoneMatch = a.phone && b.phone && a.phone.trim() === b.phone.trim();
        const companyMatch = a.company && b.company && a.company.toLowerCase().trim() === b.company.toLowerCase().trim() && a.name.toLowerCase().trim() === b.name.toLowerCase().trim();

        if (emailMatch || phoneMatch || companyMatch) {
          const conflicts: string[] = [];
          if (a.role !== b.role) conflicts.push("role");
          if (a.phone !== b.phone) conflicts.push("phone");
          if (a.linkedin_url !== b.linkedin_url) conflicts.push("linkedin_url");
          if (a.score !== b.score) conflicts.push("score");

          setDuplicateConflicts({ leadA: a, leadB: b, fieldConflicts: conflicts });
          setShowMergeModal(true);
          return;
        }
      }
    }
    showToast("No unresolved lead duplicates or contacts anomalies detected.", "info");
  };

  // Confirm Merge conflict resolution
  const handleResolveMerge = async (primaryId: string, secondaryId: string, overrides: any) => {
    try {
      const res = await fetch("/api/leads/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryId,
          secondaryId,
          resolvedFields: overrides
        })
      });

      if (res.ok) {
        showToast("Leads safely combined! Mismatch conflict overrides synchronized.", "success");
        setShowMergeModal(false);
        setDuplicateConflicts(null);
        if (onLeadsUpdated) onLeadsUpdated();
        refreshDbState();
      } else {
        showToast("Failed resolving duplicates merge log.", "error");
      }
    } catch (err) {
      showToast("Deduplication merge error.", "error");
    }
  };

  // Add Deal
  const handleCreateDeal = async () => {
    if (!newDealTitle || !newDealLeadId || !newDealValue) {
      showToast("Please input a Deal Title, associate with a target Lead record, and input appropriate deal Value index.", "error");
      return;
    }

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDealTitle,
          value: Number(newDealValue),
          leadId: newDealLeadId,
          stage: newDealStage || activePipeline?.stages[0].id || "stage-discovery",
          assignedAgent: newDealAgent,
          tags: newDealTags ? newDealTags.split(",").map(t => t.trim()) : ["Key Target"]
        })
      });

      if (res.ok) {
        showToast("Deal successfully initialized on Journey Pipeline!", "success");
        setNewDealTitle("");
        setNewDealValue(25000);
        setNewDealLeadId("");
        setNewDealStage("");
        setNewDealTags("");
        setShowAddDealModal(false);
        refreshDbState();
      } else {
        showToast("Failed provisioning lead journey deal.", "error");
      }
    } catch (err) {
      showToast("Cannot write new Deal path.", "error");
    }
  };

  // Delete Deal
  const handleDeleteDeal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently revoke this deal segment?")) return;
    try {
      const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Deal path revoked.", "info");
        setSelectedDeal(null);
        refreshDbState();
      }
    } catch {
      showToast("Failed to revoke deal path.", "error");
    }
  };

  // Active Filter state evaluation
  const filteredDeals = deals.filter(deal => {
    const lead = initialLeads.find(l => l.id === deal.leadId);
    const searchMatch = 
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead?.company || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const tagMatch = 
      selectedTagFilter === "all" || 
      deal.tags?.includes(selectedTagFilter) || 
      lead?.tags?.includes(selectedTagFilter);

    const agentMatch = 
      selectedAgentFilter === "all" || 
      deal.assignedAgent === selectedAgentFilter;

    return searchMatch && tagMatch && agentMatch;
  });

  // Hot, warm, cold style mappings
  const getHealthBadge = (health: string | undefined) => {
    switch(health) {
      case "hot":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold text-[9px] border border-rose-500/20">🔥 Hot Close</span>;
      case "warm":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold text-[9px] border border-amber-500/20">⚡ Warm Play</span>;
      case "cold":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-bold text-[9px] border border-cyan-500/20">❄️ Cold Strobe</span>;
      case "lost":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 font-bold text-[9px] border border-gray-500/20">💨 Closed Lost</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/10 text-brand font-bold text-[9px] border border-brand/20">⚡ Recalculating</span>;
    }
  };

  return (
    <div id="crm-field-mapping-panel" className="bg-surface/80 border border-border rounded-3xl p-6 glow-brand/5 space-y-6">
      {/* Upper header section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-border/40 pb-6">
        <div>
          <h2 className="text-xl font-bold font-syne flex items-center gap-2 tracking-tight">
            <TrendingUp className="w-5 h-5 text-brand" />
            Lead & Deal Journey Builder
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Configure isolated pipeline stages with probability indexes, configure assignment parameters, and deploy Claude Sonnet Always-on Close intelligence.
          </p>
        </div>

        {/* View Layout, Merge triggers, pipelines configuring row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Deduplication check */}
          <button 
            onClick={checkForDuplicates}
            className="px-3.5 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/15 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
            De-Duplicate Leads Tool
          </button>

          {/* New Deal */}
          <button 
            onClick={() => setShowAddDealModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand to-brand-alt hover:opacity-90 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-brand/10"
          >
            <Plus className="w-4 h-4" />
            Create Deal
          </button>

          {/* Toggle switcher layout state */}
          <div className="flex items-center bg-[#090a0f] p-1 rounded-xl border border-border">
            <button
              onClick={() => toggleViewPreference("kanban")}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs cursor-pointer ${
                viewType === "kanban" ? "bg-brand text-white font-bold" : "text-text-muted hover:text-text"
              }`}
              title="Kanban Board Staging"
            >
              <Kanban className="w-4 h-4" />
              Board
            </button>
            <button
              onClick={() => toggleViewPreference("list")}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs cursor-pointer ${
                viewType === "list" ? "bg-brand text-white font-bold" : "text-text-muted hover:text-text"
              }`}
              title="List View Grid"
            >
              <List className="w-4 h-4" />
              List Grid
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Advanced searching queries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#090a0f]/40 p-4 border border-border/55 rounded-2xl">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            type="text"
            placeholder="Search deals, contacts or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-alt border border-border/70 rounded-xl py-2 pl-10 pr-4 text-xs select-text text-text placeholder:text-text-muted focus:border-brand/40 outline-none transition-all"
          />
        </div>

        {/* Tag Selection filter */}
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-brand-alt" />
          <select 
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="grow bg-surface-alt border border-border/70 text-text rounded-xl py-2 px-3 text-xs outline-none focus:border-brand/40 transition-all"
          >
            <option value="all">Filter by Tag: All</option>
            <option value="Enterprise">Enterprise</option>
            <option value="SaaS">SaaS</option>
            <option value="High-Value">High-Value</option>
            <option value="B2B">B2B</option>
            <option value="Recruiting">Recruiting</option>
          </select>
        </div>

        {/* Agent selection filter */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-brand" />
          <select 
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            className="grow bg-surface-alt border border-border/70 text-text rounded-xl py-2 px-3 text-xs outline-none focus:border-brand/40 transition-all"
          >
            <option value="all">Filter by Agent: All</option>
            <option value="Sarah Mitchell">Sarah Mitchell</option>
            <option value="James Ochieng">James Ochieng</option>
            <option value="User Pro">User Pro</option>
          </select>
        </div>
      </div>

      {/* Main Board View vs List View layout splitter */}
      {viewType === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {activePipeline?.stages.map((stage) => {
            const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
            const cumulativeValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

            return (
              <div 
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="flex flex-col bg-[#090a0f]/40 border border-border/40 p-4 rounded-2xl min-w-[240px] h-[520px]"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <h4 className="text-xs font-bold text-text truncate uppercase tracking-wide" title={stage.name}>{stage.name}</h4>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-1.5 py-0.5 rounded-md bg-border text-[9px] font-bold text-text-muted">{stageDeals.length}</span>
                  </div>
                </div>

                <div className="text-[10px] text-text-muted font-mono mb-3 flex items-center justify-between px-1 bg-surface-alt/50 py-1 rounded-lg">
                  <span>Prob: {stage.probability}%</span>
                  <span className="text-amber-400 font-bold">${cumulativeValue.toLocaleString()} val</span>
                </div>

                {/* Cards rendering */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                  {stageDeals.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-border/30 rounded-xl bg-surface-alt/10">
                      <Briefcase className="w-5 h-5 text-text-muted/20 mb-1" />
                      <span className="text-[9px] text-text-muted/60">Stage Empty</span>
                      <span className="text-[7px] text-text-muted/40 uppercase mt-0.5">SLA limit: {stage.slaDays} days</span>
                    </div>
                  ) : (
                    stageDeals.map((deal) => {
                      const associatedLead = initialLeads.find(l => l.id === deal.leadId);
                      const isHovered = hoveredCardId === deal.id;

                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          onMouseEnter={() => setHoveredCardId(deal.id)}
                          onMouseLeave={() => setHoveredCardId(null)}
                          onClick={() => selectActiveDeal(deal)}
                          className={`group relative bg-surface border transition-all duration-300 rounded-xl p-3.5 cursor-grab active:cursor-grabbing text-left space-y-2 select-none ${
                            selectedDeal?.id === deal.id 
                              ? "border-brand shadow-lg shadow-brand/10 bg-[#0c0d16]" 
                              : "border-border/80 hover:border-border-muted"
                          }`}
                        >
                          {/* Deal title & Health Color Bar */}
                          <div className="flex items-start justify-between gap-1.5">
                            <h5 className="text-[11px] font-bold text-text tracking-tight group-hover:text-brand transition-colors truncate" title={deal.title}>
                              {deal.title}
                            </h5>
                            <button 
                              onClick={(e) => handleDeleteDeal(deal.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 text-text-muted/40 transition-all rounded-md"
                              title="Revoke Deal segment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Contact Info */}
                          <div className="text-[10px] text-text-muted font-medium line-clamp-1">
                            {associatedLead?.name || "Unassigned Lead"}
                            <span className="text-[8px] opacity-60 ml-1">@{associatedLead?.company || "N/A"}</span>
                          </div>

                          {/* Cost value & AI close score tags block */}
                          <div className="flex items-center justify-between border-t border-border/20 pt-2 text-[10px]">
                            <span className="font-bold text-[#00d4aa]">${deal.value.toLocaleString()}</span>
                            
                            <div className="flex items-center gap-1">
                              {/* AI score rating */}
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold text-brand bg-brand/10 border border-brand/20 rounded-md">
                                <Sparkles className="w-2.5 h-2.5 text-brand" />
                                {associatedLead?.score || 80}%
                              </span>
                              {getHealthBadge(deal.status)}
                            </div>
                          </div>

                          {/* Tags indicator */}
                          {deal.tags && deal.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {deal.tags.slice(0, 2).map((t, idx) => (
                                <span key={idx} className="text-[8px] bg-surface-alt font-bold text-text-muted px-1.5 py-0.5 rounded border border-border/30">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Assgined Agent visual element */}
                          <div className="flex items-center justify-between text-[8px] text-text-muted uppercase tracking-wider font-mono pt-1">
                            <span>SLA Target: {stage.slaDays}d</span>
                            <span className="text-text-muted/60">{deal.assignedAgent || "No Operator"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view fallback with clean bulk support, pagination grids */
        <div className="overflow-x-auto bg-[#090a0f]/20 border border-border/40 rounded-2xl text-left">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-[10px] uppercase font-bold text-text-muted tracking-widest pl-3">
                <th className="py-3 px-4">Deal Pipeline Item</th>
                <th className="py-3 px-4">Lead Associate</th>
                <th className="py-3 px-4">CRM Stage Staging</th>
                <th className="py-3 px-4 text-right">Value Volume</th>
                <th className="py-3 px-4">Assigned Agent</th>
                <th className="py-3 px-4 text-center">AI Deal Health</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-xs">
              {filteredDeals.map((deal) => {
                const lead = initialLeads.find(l => l.id === deal.leadId);
                const stage = activePipeline?.stages.find(s => s.id === deal.stage);

                return (
                  <tr 
                    key={deal.id}
                    onClick={() => selectActiveDeal(deal)}
                    className="hover:bg-surface-alt/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-bold text-text">{deal.title}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-text">{lead?.name || "Unassigned"}</div>
                      <div className="text-[10px] text-text-muted select-none mt-0.5">{lead?.company || "N/A"}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${stage?.color}15`, color: stage?.color, border: `1px solid ${stage?.color}30` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color }} />
                        {stage?.name || deal.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#00d4aa]">
                      ${deal.value.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-text-muted">{deal.assignedAgent || "None"}</td>
                    <td className="py-3 px-4 text-center">{getHealthBadge(deal.status)}</td>
                    <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => handleDeleteDeal(deal.id, e)}
                        className="p-1 px-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dynamic Detail Collapsible Side Drawer Panel */}
      {selectedDeal && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl bg-[#090a10] border-l border-border shadow-2xl flex flex-col focus:outline-none">
          {/* Sidebar Drawer Header */}
          <div className="p-6 border-b border-border/40 flex items-center justify-between bg-surface bg-gradient-to-r from-surface to-surface-alt/40">
            <div className="space-y-1">
              <span className="text-[10px] font-bold font-mono text-brand uppercase tracking-wider">Lead & Deal Journey Detail Drawer</span>
              <h3 className="text-base font-bold text-text truncate max-w-sm">{selectedDeal.title}</h3>
            </div>
            <button 
              onClick={() => setSelectedDeal(null)}
              className="p-1.5 bg-surface border border-border hover:bg-bg-subtle text-text-muted hover:text-text rounded-lg transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body content (scrolls) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
            
            {/* 1. AI SONNET PROGRESSION AND INTELLIGENCE GAUGES */}
            <div className="bg-[#0b0c14] border border-brand/20 rounded-2xl p-5 space-y-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full filter blur-xl select-none" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand" />
                  <div className="text-xs font-bold text-text uppercase tracking-wider font-syne">Claude Close Analysis Engine</div>
                </div>

                <button
                  onClick={handleRefreshAiReport}
                  disabled={isRefreshingAi}
                  className="px-2.5 py-1 bg-brand/10 border border-brand/35 text-brand hover:bg-brand hover:text-white rounded-lg text-[10px] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingAi ? "animate-spin" : ""}`} />
                  {isRefreshingAi ? "Analyzing..." : "Refresh Report"}
                </button>
              </div>

              {aiReport ? (
                <div className="space-y-4 text-left">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Prob widget gauge */}
                    <div className="bg-surface border border-border/80 rounded-xl p-3 text-center space-y-1">
                      <div className="text-[10px] uppercase font-bold text-text-muted">Win Probability Gauge</div>
                      <div className="text-3xl font-extrabold text-brand font-mono">{aiReport.close_probability}%</div>
                      <div className="text-[9px] text-text-muted">Expected close: {aiReport.estimated_close_date || "N/A"}</div>
                    </div>

                    {/* Health Status card widget */}
                    <div className="bg-surface border border-border/80 rounded-xl p-3 text-center space-y-1">
                      <div className="text-[10px] uppercase font-bold text-text-muted">AI Health Status</div>
                      <div className="pt-1.5 flex justify-center">{getHealthBadge(aiReport.health_status)}</div>
                      <div className="text-[9px] text-text-muted/65 mt-1 select-none uppercase tracking-widest">Model: Claude 3.5 Sonnet</div>
                    </div>
                  </div>

                  {/* Summary paragraph */}
                  <div className="bg-surface/50 border border-border/30 rounded-xl p-3 text-xs leading-relaxed text-text-muted">
                    <strong className="text-text block mb-1">Journey Intelligence Summary:</strong>
                    {aiReport.analysis_summary}
                  </div>

                  {/* Risk logs list */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Key Negotiation Risks Identified
                    </div>
                    <ul className="space-y-1 text-[11px] text-text-muted">
                      {aiReport.key_risks?.map((risk: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-rose-400 select-none mt-0.5">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Next Step bullet points list */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-brand-alt flex items-center gap-1">
                      <ChevronRight className="w-3.5 h-3.5 text-brand" />
                      Recommended Next Actions Target
                    </div>
                    <ol className="space-y-1 text-[11px] text-text-muted list-decimal list-inside pl-1">
                      {aiReport.recommended_next_steps?.map((step: string, idx: number) => (
                        <li key={idx} className="text-text-muted">
                          <span className="text-text font-medium">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Curated Personal copy message template outreach */}
                  <div className="bg-surface border border-border/40 rounded-xl p-3.5 space-y-2 text-left">
                    <div className="text-[10px] uppercase font-bold text-brand flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        Claude AI Curated Outreach Copy
                      </div>
                      <span className="text-[8px] opacity-60">Uses company knowledge-base context</span>
                    </div>
                    <div className="text-xs text-text leading-relaxed font-mono whitespace-pre-line p-2 bg-[#090a0f] border border-border/50 rounded-lg">
                      {aiReport.ideal_outreach_message}
                    </div>
                  </div>

                  {/* History Logs comparison charts list */}
                  {aiHistory.length > 0 && (
                    <div className="border-t border-border/20 pt-3">
                      <div className="text-[9px] uppercase font-bold text-text-muted mb-2 tracking-wider flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        Historical Comparison (Sonnet Runs Audit)
                      </div>
                      <div className="flex items-center gap-2">
                        {aiHistory.map((hist, idx) => (
                          <div key={idx} className="bg-surface/80 border border-border/50 rounded-lg px-2 py-1 text-center font-mono">
                            <span className="text-[8px] text-text-muted block">{hist.date}</span>
                            <span className="text-xs text-brand font-bold">{hist.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-[#090a10]/60 border border-dashed border-border/30 rounded-xl text-center">
                  <Sparkles className="w-8 h-8 text-text-muted/40 mb-2" />
                  <p className="text-xs font-bold text-text-muted">No Intelligence Compiled</p>
                  <p className="text-[10px] text-text-muted/60 mt-1 max-w-sm">
                    Deploy background Sonnet agents to parse negotiation risk blocks and recommend next actionable copy paths.
                  </p>
                  <button
                    onClick={handleRefreshAiReport}
                    disabled={isRefreshingAi}
                    className="mt-3 px-3 py-1 bg-brand text-white hover:opacity-90 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAi ? "animate-spin" : ""}`} />
                    Compile Claude Intelligence Analysis
                  </button>
                </div>
              )}
            </div>

            {/* 2. TASK FOLLOW-UPS CHECKLISTS */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-widest text-text-muted flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-brand-alt" />
                Negotiation Checklist followups ({dealTasks.filter(t => t.completed).length}/{dealTasks.length})
              </h4>

              {/* Add Task bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <input 
                  type="text"
                  placeholder="Schedule follow-up reminder action..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 min-w-[180px] bg-surface border border-border text-text rounded-xl py-2 px-3 text-xs outline-none focus:border-brand/40"
                />
                <input 
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="bg-surface border border-border text-text rounded-xl py-2 px-3 text-xs outline-none focus:border-brand/40"
                />
                <button 
                  onClick={handleAddTask}
                  className="px-4 py-2 bg-surface border border-border hover:bg-bg-subtle text-text hover:text-brand rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Schedule Actions
                </button>
              </div>

              {/* Tasks Checklist Grid */}
              <div className="space-y-2">
                {dealTasks.length === 0 ? (
                  <p className="text-[10px] italic text-text-muted/65 text-center">No scheduling tasks recorded. Keep track of customer SLAs.</p>
                ) : (
                  dealTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-surface border border-border/80 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task)}
                          className="w-4 h-4 text-brand border-border rounded focus:ring-brand animate-pulse"
                        />
                        <span className={`text-xs ${task.completed ? "line-through text-text-muted" : "text-text font-medium"}`}>
                          {task.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 font-mono text-[9px] text-text-muted">
                        <Calendar className="w-3.5 h-3.5 text-text-muted/75" />
                        <span>SLA: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. ACTIVITY TIMELINE CHRONOLOGY LOGS */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-widest text-text-muted flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand" />
                Chronological Journey Activity Logs
              </h4>

              {/* Add Note text element */}
              <div className="space-y-2">
                <textarea
                  placeholder="Log manual notes, email triggers, or custom calls notes..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full bg-surface border border-border text-text placeholder:text-text-muted rounded-xl p-3 text-xs outline-none focus:border-brand/40 h-20 resize-none select-text focus:ring-1 focus:ring-brand"
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handleAddNote}
                    className="px-3.5 py-1.5 bg-brand text-white hover:opacity-95 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Log Negotiating Note
                  </button>
                </div>
              </div>

              {/* Timeline Items */}
              <div className="relative border-l border-border/60 pl-4 space-y-6">
                {dealActivities.length === 0 ? (
                  <p className="text-[10px] italic text-text-muted/60 text-center select-none pt-2">Timeline empty. Change stage or write notes above.</p>
                ) : (
                  dealActivities.map((act) => (
                    <div key={act.id} className="relative space-y-1 text-left">
                      {/* Anchor Timeline Ring */}
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-surface bg-brand shadow-lg" />
                      
                      <div className="text-[11px] font-bold text-text flex items-center justify-between">
                        <span>{act.title}</span>
                        <span className="text-[8px] text-text-muted font-mono">{new Date(act.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] text-text-muted leading-relaxed select-text">{act.description}</p>
                      <div className="text-[8px] text-text-muted/65 italic flex items-center gap-1 pt-0.5 select-none font-mono">
                        <User className="w-2.5 h-2.5 opacity-50" />
                        Logged by: {act.agentName}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRM NEW DEAL CREATION MODAL */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#090a0f] border border-border rounded-3xl max-w-md w-full p-6 text-left space-y-6 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-text flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-brand" />
                Initialize Journey Deal
              </h3>
              <button onClick={() => setShowAddDealModal(false)} className="text-text-muted hover:text-text cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Deal Action Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Enterprise Outreach Expansion Bundle"
                  value={newDealTitle}
                  onChange={(e) => setNewDealTitle(e.target.value)}
                  className="w-full bg-surface-alt border border-border text-text rounded-xl py-2 px-3 text-xs outline-none focus:border-brand/40 select-text"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Associated Lead Target</label>
                  <select 
                    value={newDealLeadId}
                    onChange={(e) => setNewDealLeadId(e.target.value)}
                    className="w-full bg-surface-alt border border-border text-text rounded-xl py-2 px-3 text-xs outline-none focus:border-brand/40"
                  >
                    <option value="">Select Target...</option>
                    {initialLeads.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Deal Value Volume ($)</label>
                  <input 
                    type="number"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(Number(e.target.value))}
                    className="w-full bg-surface-alt border border-border text-text rounded-xl py-2 px-3 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Pipeline Stage Target</label>
                  <select 
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value)}
                    className="w-full bg-surface-alt border border-border text-text rounded-xl py-2 px-3 text-xs outline-none focus:border-brand/40"
                  >
                    {activePipeline?.stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Assigned Client Agent</label>
                  <select 
                    value={newDealAgent}
                    onChange={(e) => setNewDealAgent(e.target.value)}
                    className="w-full bg-surface-alt border border-border text-text rounded-xl py-2 px-3 text-xs outline-none focus:border-brand/40"
                  >
                    <option value="Sarah Mitchell">Sarah Mitchell</option>
                    <option value="James Ochieng">James Ochieng</option>
                    <option value="User Pro">User Pro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Tags Config (comma separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. Enterprise, High-Value, SaaS"
                  value={newDealTags}
                  onChange={(e) => setNewDealTags(e.target.value)}
                  className="w-full bg-surface-alt border border-border text-text rounded-xl py-2 px-3 text-xs outline-none select-text focus:border-brand/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
              <button 
                onClick={() => setShowAddDealModal(false)}
                className="px-4 py-2 bg-surface hover:bg-bg-subtle border border-border text-text-muted rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateDeal}
                className="px-4 py-2 bg-gradient-to-r from-brand to-brand-alt hover:opacity-90 text-white rounded-xl text-xs font-bold cursor-pointer transition-all"
              >
                Initialize Target Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DUPLICATE MERGING DEDUPLICATION TOOL DIALOG (TASK 4) */}
      {showMergeModal && duplicateConflicts && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#090a0f] border border-border rounded-3xl max-w-xl w-full p-6 text-left space-y-6 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Deduplication Lead Resolution Gate
              </h3>
              <button onClick={() => setShowMergeModal(false)} className="text-text-muted hover:text-text cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 p-4 rounded-xl leading-relaxed">
              We identified dual duplicates conflicts mismatch records on work email or phone context pairings and companies similarities:
              <span className="font-mono block pt-1 font-bold text-rose-400">Match Target ID: {duplicateConflicts.leadA.email}</span>
            </div>

            {/* Side-by-Side Values */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-border p-4 rounded-xl bg-surface/50 text-left space-y-2">
                <div className="font-bold text-brand border-b border-border/40 pb-1">Primary Duplicate Target</div>
                <div><span className="text-text-muted uppercase text-[9px] block">Full name</span> {duplicateConflicts.leadA.name}</div>
                <div><span className="text-text-muted uppercase text-[9px] block">Role Title</span> {duplicateConflicts.leadA.role}</div>
                <div><span className="text-text-muted uppercase text-[9px] block">Phone link</span> {duplicateConflicts.leadA.phone || "No phone link"}</div>
                <div><span className="text-text-muted uppercase text-[9px] block">LinkedIn</span> {duplicateConflicts.leadA.linkedin_url || "No link"}</div>
                <div><span className="text-text-muted uppercase text-[9px] block">Country</span> {duplicateConflicts.leadA.country || "N/A"}</div>
              </div>

              <div className="border border-border p-4 rounded-xl bg-surface/50 text-left space-y-2">
                <div className="font-bold text-brand-alt border-b border-border/40 pb-1">Conflicting Duplicate Target</div>
                <div><span className="text-text-muted uppercase text-[9px] block">Full name</span> {duplicateConflicts.leadB.name}</div>
                <div><span className="text-text-muted uppercase text-[9px] block">Role Title</span> {duplicateConflicts.leadB.role}</div>
                <div><span className="text-text-muted uppercase text-[9px] block">Phone link</span> {duplicateConflicts.leadB.phone || "No phone link"}</div>
                <div><span className="text-text-muted uppercase text-[9px] block">LinkedIn</span> {duplicateConflicts.leadB.linkedin_url || "No link"}</div>
                <div><span className="text-text-muted uppercase text-[9px] block">Country</span> {duplicateConflicts.leadB.country || "N/A"}</div>
              </div>
            </div>

            {/* Merge options */}
            <div className="space-y-3">
              <div className="text-[10px] uppercase font-bold text-text-muted">Choose Field-Level Merging Override:</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  onClick={() => handleResolveMerge(duplicateConflicts.leadA.id, duplicateConflicts.leadB.id, {
                    role: duplicateConflicts.leadA.role || duplicateConflicts.leadB.role,
                    phone: duplicateConflicts.leadA.phone || duplicateConflicts.leadB.phone,
                    linkedin_url: duplicateConflicts.leadA.linkedin_url || duplicateConflicts.leadB.linkedin_url,
                    country: duplicateConflicts.leadA.country || duplicateConflicts.leadB.country
                  })}
                  className="p-3 bg-brand/10 hover:bg-brand/20 border border-brand/25 rounded-xl text-left transition-all"
                >
                  <span className="font-bold text-brand block mb-1">Retain Target A Value</span>
                  Resolves and combines records, prioritizing Lead A metadata.
                </button>

                <button
                  onClick={() => handleResolveMerge(duplicateConflicts.leadA.id, duplicateConflicts.leadB.id, {
                    role: duplicateConflicts.leadB.role || duplicateConflicts.leadA.role,
                    phone: duplicateConflicts.leadB.phone || duplicateConflicts.leadA.phone,
                    linkedin_url: duplicateConflicts.leadB.linkedin_url || duplicateConflicts.leadA.linkedin_url,
                    country: duplicateConflicts.leadB.country || duplicateConflicts.leadA.country
                  })}
                  className="p-3 bg-brand-alt/10 hover:bg-brand-alt/20 border border-brand-alt/25 rounded-xl text-left transition-all"
                >
                  <span className="font-bold text-brand-alt block mb-1">Retain Target B Value</span>
                  Resolves and combines records, prioritizing Lead B metadata.
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40 text-xs">
              <button 
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 bg-surface hover:bg-bg-subtle border border-border text-text-muted rounded-xl font-semibold cursor-pointer"
              >
                Keep Separately
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
