import React, { useState, useEffect } from "react";
import { 
  Kanban, List, Plus, Search, Filter, RefreshCw, Sparkles, AlertCircle, 
  MapPin, Clock, Calendar, Briefcase, User, UserCheck, Tag, Trash2, 
  CheckCircle, ChevronRight, Activity, FileText, Check, MoreVertical, 
  ArrowRight, ShieldAlert, BarChart3, Mail, Phone, Users, History, TrendingUp, X
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

interface DealMovement {
  id: string;
  dealId: string;
  fromStage: string;
  toStage: string;
  timestamp: string;
  agentName: string;
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
  
  // SLA, Movements, Swimlane & Stats Widget states
  const [movements, setMovements] = useState<DealMovement[]>([]);
  const [allActivities, setAllActivities] = useState<ActivityLog[]>([]);
  const [swimlaneMode, setSwimlaneMode] = useState<boolean>(true);
  const [showTeamActivityWidget, setShowTeamActivityWidget] = useState<boolean>(true);
  
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

      // 4. Fetch movements history
      const movementRes = await fetch("/api/deals/audit-movement");
      if (movementRes.ok) {
        const mv = await movementRes.json();
        setMovements(mv);
      }

      // 5. Fetch all activity logs
      const actRes = await fetch("/api/activities");
      if (actRes.ok) {
        const acts = await actRes.json();
        setAllActivities(acts);
      }
    } catch (err) {
      console.error("Error fetching CRM pipeline data state", err);
    }
  };

  useEffect(() => {
    refreshDbState();
  }, [initialLeads]);

  const getDaysInStage = (deal: Deal, stage: PipelineStage) => {
    const relevantMovements = movements.filter(
      m => m.dealId === deal.id && m.toStage === deal.stage
    );

    let entryDate = deal.createdAt && !isNaN(Date.parse(deal.createdAt)) ? new Date(deal.createdAt) : new Date();
    
    if (relevantMovements.length > 0) {
      relevantMovements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      entryDate = new Date(relevantMovements[0].timestamp);
    }

    const currentDate = new Date();
    const diffTime = currentDate.getTime() - entryDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return {
      days: diffDays >= 0 ? diffDays : 0,
      entryDate
    };
  };

  // SLA Breach Watchdog
  useEffect(() => {
    if (deals.length === 0 || !activePipeline) return;

    deals.forEach(async (deal) => {
      const stage = activePipeline.stages.find(s => s.id === deal.stage);
      if (!stage || stage.slaDays <= 0) return;

      const { days } = getDaysInStage(deal, stage);
      if (days > stage.slaDays) {
        // Yes, SLA breached! Check if we already logged an SLA breach for this deal in this stage
        const breachLogged = allActivities.some(
          act => act.dealId === deal.id && 
                 act.type === "sla_breach" && 
                 act.description.includes(stage.name)
        );

        if (!breachLogged) {
          try {
            const res = await fetch("/api/activities", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dealId: deal.id,
                type: "sla_breach",
                title: "🚨 SLA Breach Warning",
                description: `Deal "${deal.title}" has stayed in stage "${stage.name}" for ${days} days (defined SLA: ${stage.slaDays} days).`,
                agentName: deal.assignedAgent || "System Watchdog"
              })
            });
            if (res.ok) {
              const actsRes = await fetch("/api/activities");
              if (actsRes.ok) {
                const updatedActs = await actsRes.json();
                setAllActivities(updatedActs);
              }
            }
          } catch (err) {
            console.error("Failed to log SLA breach activity", err);
          }
        }
      }
    });
  }, [deals, movements, activePipeline, allActivities]);

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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 font-bold text-[9px] shadow-xs">🔥 Hot Close</span>;
      case "warm":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-850 border border-amber-200/60 font-bold text-[9px] shadow-xs">⚡ Warm Play</span>;
      case "cold":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200/60 font-bold text-[9px] shadow-xs">❄️ Cold Strobe</span>;
      case "lost":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 font-bold text-[9px] shadow-xs">💨 Closed Lost</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-55 text-blue-800 border border-blue-150 font-bold text-[9px] shadow-xs">⚡ Recalculating</span>;
    }
  };

  // Process Team Activity Chart Data (moves per assigned agent in last 30 days)
  const getChartData = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30DaysMovements = movements.filter(m => {
      const mDate = new Date(m.timestamp);
      return mDate >= thirtyDaysAgo;
    });

    const counts: Record<string, number> = {};
    last30DaysMovements.forEach(m => {
      const deal = deals.find(d => d.id === m.dealId);
      const agent = deal?.assignedAgent || m.agentName || "Workspace Agent";
      counts[agent] = (counts[agent] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      moves: value
    }));
  };

  const chartData = getChartData();

  return (
    <div id="crm-field-mapping-panel" className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 text-slate-800">
      {/* Upper header section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-bold font-syne flex items-center gap-2 tracking-tight text-slate-900">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Lead & Deal Journey Builder
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure isolated pipeline stages with probability indexes, configure assignment parameters, and deploy Claude Sonnet Always-on Close intelligence.
          </p>
        </div>

        {/* View Layout, Merge triggers, pipelines configuring row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Deduplication check */}
          <button 
            onClick={checkForDuplicates}
            className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100/80 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            De-Duplicate Leads Tool
          </button>

          {/* New Deal */}
          <button 
            onClick={() => setShowAddDealModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Deal
          </button>

          {/* Team Activity Widget Toggle */}
          <button 
            onClick={() => setShowTeamActivityWidget(!showTeamActivityWidget)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
              showTeamActivityWidget 
                ? "border-emerald-300 bg-emerald-50 text-emerald-800" 
                : "border-slate-250 bg-white text-slate-600 hover:text-slate-800 hover:border-slate-350"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Team Activity
          </button>

          {/* Swimlane mode Toggle */}
          {viewType === "kanban" && (
            <button 
              onClick={() => setSwimlaneMode(!swimlaneMode)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs ${
                swimlaneMode 
                  ? "border-blue-300 bg-blue-50 text-blue-800" 
                  : "border-slate-250 bg-white text-slate-600 hover:text-slate-800 hover:border-slate-350"
              }`}
            >
              <Kanban className="w-4 h-4" />
              {swimlaneMode ? "Swimlanes ON" : "Swimlanes OFF"}
            </button>
          )}

          {/* Toggle switcher layout state */}
          <div className="flex items-center bg-slate-200/60 p-1 rounded-xl border border-slate-300/60">
            <button
              onClick={() => toggleViewPreference("kanban")}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs cursor-pointer ${
                viewType === "kanban" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-950"
              }`}
              title="Kanban Board Staging"
            >
              <Kanban className="w-4 h-4 text-slate-600" />
              Board
            </button>
            <button
              onClick={() => toggleViewPreference("list")}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs cursor-pointer ${
                viewType === "list" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600 hover:text-slate-950"
              }`}
              title="List View Grid"
            >
              <List className="w-4 h-4 text-slate-600" />
              List Grid
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Advanced searching queries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 border border-slate-200 rounded-2xl shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search deals, contacts or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs select-text text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white outline-none transition-all"
          />
        </div>

        {/* Tag Selection filter */}
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-indigo-500" />
          <select 
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="grow bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white transition-all"
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
          <User className="w-4 h-4 text-blue-600" />
          <select 
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            className="grow bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-400 focus:bg-white transition-all"
          >
            <option value="all">Filter by Agent: All</option>
            <option value="Sarah Mitchell">Sarah Mitchell</option>
            <option value="James Ochieng">James Ochieng</option>
            <option value="User Pro">User Pro</option>
          </select>
        </div>
      </div>

      {/* Team Activity Widget */}
      {showTeamActivityWidget && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Team Activity Metrics (Deals Moved in Last 30 Days)</h3>
            </div>
            <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono font-bold">
              Total movements: {chartData.reduce((sum, d) => sum + d.moves, 0)}
            </span>
          </div>

          {chartData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-250">
              No deal movements logged by team agents over the last 30 days. Promote a deal between stages to record activity!
            </div>
          ) : (
            <div className="h-44 w-full pr-4 text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "10px", color: "#1e293b", fontSize: "11px" }}
                    itemStyle={{ color: "#2563eb", fontSize: "11px" }}
                    labelStyle={{ color: "#0f172a", fontSize: "11px", fontWeight: "bold" }}
                  />
                  <Bar dataKey="moves" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Main Board View vs List View layout splitter */}
      {viewType === "kanban" ? (
        swimlaneMode ? (
          /* SWIMLANE KANBAN BOARD */
          <div className="space-y-6 w-full text-left">
            {(() => {
              const swimlanes = [
                { key: "hot", label: "Hot Priority", colorClass: "text-rose-700", bgClass: "bg-rose-50 border-rose-200", icon: "🔥" },
                { key: "warm", label: "Warm Priority", colorClass: "text-amber-700", bgClass: "bg-amber-50 border-amber-200", icon: "⚡" },
                { key: "cold", label: "Cold & Others", colorClass: "text-slate-700", bgClass: "bg-slate-100 border-slate-200", icon: "❄️" }
              ];

              return (
                <div className="space-y-6 w-full">
                  {swimlanes.map((lane) => {
                    const laneDeals = filteredDeals.filter(d => {
                      if (lane.key === "hot") return d.status === "hot";
                      if (lane.key === "warm") return d.status === "warm";
                      return d.status === "cold" || d.status === "lost" || !d.status;
                    });

                    const totalValue = laneDeals.reduce((sum, d) => sum + d.value, 0);

                    return (
                      <div key={lane.key} className="space-y-3 bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
                        {/* Swimlane Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{lane.icon}</span>
                            <h3 className={`text-xs font-bold font-syne uppercase tracking-wider ${lane.colorClass}`}>
                              {lane.label}
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold font-mono">
                              {laneDeals.length} Deals
                            </span>
                          </div>
                          <span className="text-[11px] text-emerald-600 font-mono font-bold">
                            Cumulative: ${totalValue.toLocaleString()}
                          </span>
                        </div>

                        {/* Horizontal Stages Grid */}
                        <div className="flex lg:grid lg:grid-cols-5 gap-4 overflow-x-auto pb-4 scrollbar-thin w-full">
                          {activePipeline?.stages.map((stage) => {
                            const stageLaneDeals = laneDeals.filter(d => d.stage === stage.id);
                            const cumulativeStageValue = stageLaneDeals.reduce((sum, d) => sum + d.value, 0);

                            return (
                              <div 
                                key={stage.id}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                                className="flex flex-col bg-slate-50/70 border border-slate-200 p-3 rounded-xl min-w-[245px] lg:min-w-0 lg:w-auto shrink-0 min-h-[180px]"
                              >
                                {/* Stage name Inside Swimlane */}
                                <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 mb-2.5">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                                    <span className="text-[10px] font-bold text-slate-700 truncate uppercase" title={stage.name}>
                                      {stage.name}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-bold font-mono text-amber-700 bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 rounded">
                                    ${cumulativeStageValue.toLocaleString()}
                                  </span>
                                </div>

                                {/* Render stage lane deals */}
                                <div className="flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin max-h-[250px]">
                                  {stageLaneDeals.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-200 rounded-lg bg-white/40">
                                      <span className="text-[8px] text-slate-400 uppercase">No Matches</span>
                                    </div>
                                  ) : (
                                    stageLaneDeals.map((deal) => {
                                      const associatedLead = initialLeads.find(l => l.id === deal.leadId);
                                      const daysInfo = getDaysInStage(deal, stage);
                                      const isSlaBreached = stage.slaDays > 0 && daysInfo.days > stage.slaDays;

                                      return (
                                        <div
                                          key={deal.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, deal.id)}
                                          onClick={() => selectActiveDeal(deal)}
                                          className={`group relative bg-white border transition-all duration-300 rounded-xl p-3 cursor-grab active:cursor-grabbing text-left space-y-2 select-none ${
                                            selectedDeal?.id === deal.id 
                                              ? "border-blue-500 shadow-sm bg-blue-50/30" 
                                              : "border-slate-200 hover:border-slate-350 hover:shadow-xs"
                                          }`}
                                        >
                                          {/* SLA Breach visual warning alert */}
                                          {isSlaBreached && (
                                            <div className="bg-rose-50 border border-rose-150 text-rose-700 rounded-lg p-1.5 flex items-start gap-1 text-[9px] leading-tight font-bold">
                                              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-rose-600" />
                                              <span>SLA Overdue ({daysInfo.days}d / max {stage.slaDays}d)</span>
                                            </div>
                                          )}

                                          <div className="flex items-start justify-between gap-1.5">
                                            <h5 className="text-[10px] font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors" title={deal.title}>
                                              {deal.title}
                                            </h5>
                                            <button 
                                              onClick={(e) => handleDeleteDeal(deal.id, e)}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-600 text-slate-400 transition-all rounded-md"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>

                                          <div className="text-[9px] text-slate-500 line-clamp-1 font-medium">
                                            {associatedLead?.name || "Unassigned Lead"}
                                            <span className="text-[8px] text-slate-450 ml-1">@{associatedLead?.company || "N/A"}</span>
                                          </div>

                                          <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-[9px]">
                                            <span className="font-bold text-emerald-600">${deal.value.toLocaleString()}</span>
                                            <div className="flex items-center gap-1">
                                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded">
                                                {associatedLead?.score || 80}%
                                              </span>
                                              {getHealthBadge(deal.status)}
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between text-[8px] text-slate-400 uppercase tracking-wider font-mono pt-1">
                                            <span>Duration: {daysInfo.days}d / max {stage.slaDays}d</span>
                                            <span className="text-slate-500 truncate max-w-[70px]">{deal.assignedAgent || "No Operator"}</span>
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
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (
          /* STANDARD COLUMN KANBAN BOARD */
          <div className="flex lg:grid lg:grid-cols-5 gap-4 overflow-x-auto pb-4 scrollbar-thin w-full">
            {activePipeline?.stages.map((stage) => {
              const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
              const cumulativeValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

              return (
                <div 
                  key={stage.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className="flex flex-col bg-white border border-slate-200/90 p-4 rounded-2xl min-w-[280px] lg:min-w-0 lg:w-auto shrink-0 h-[520px] shadow-sm"
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                      <h4 className="text-xs font-bold text-slate-800 truncate uppercase tracking-wide" title={stage.name}>{stage.name}</h4>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold text-slate-600">{stageDeals.length}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono mb-3 flex items-center justify-between px-1.5 bg-slate-50 border border-slate-150 py-1 rounded-lg">
                    <span>Prob: {stage.probability}%</span>
                    <span className="text-emerald-700 font-bold">${cumulativeValue.toLocaleString()}</span>
                  </div>

                  {/* Cards rendering */}
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin text-left">
                    {stageDeals.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Briefcase className="w-5 h-5 text-slate-300 mb-1" />
                        <span className="text-[9px] text-slate-400">Stage Empty</span>
                        <span className="text-[7px] text-slate-400 uppercase mt-0.5">SLA limit: {stage.slaDays} days</span>
                      </div>
                    ) : (
                      stageDeals.map((deal) => {
                        const associatedLead = initialLeads.find(l => l.id === deal.leadId);
                        const isHovered = hoveredCardId === deal.id;
                        const daysInfo = getDaysInStage(deal, stage);
                        const isSlaBreached = stage.slaDays > 0 && daysInfo.days > stage.slaDays;

                        return (
                          <div
                            key={deal.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, deal.id)}
                            onMouseEnter={() => setHoveredCardId(deal.id)}
                            onMouseLeave={() => setHoveredCardId(null)}
                            onClick={() => selectActiveDeal(deal)}
                            className={`group relative bg-white border transition-all duration-300 rounded-xl p-3.5 cursor-grab active:cursor-grabbing text-left space-y-2 select-none ${
                              selectedDeal?.id === deal.id 
                                ? "border-blue-500 shadow-sm bg-blue-50/30" 
                                : "border-slate-200 hover:border-slate-350 hover:shadow-xs shadow-xs"
                            }`}
                          >
                            {/* SLA Breach visual warning alert */}
                            {isSlaBreached && (
                              <div className="bg-rose-50 border border-rose-150 text-rose-700 rounded-lg p-2 flex items-start gap-1 text-[10px] leading-tight font-bold">
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-600" />
                                <span>SLA Overdue ({daysInfo.days}d in stage / Limit {stage.slaDays}d)</span>
                              </div>
                            )}

                            {/* Deal title & Health Color Bar */}
                            <div className="flex items-start justify-between gap-1.5">
                              <h5 className="text-[11px] font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors truncate" title={deal.title}>
                                {deal.title}
                              </h5>
                              <button 
                                onClick={(e) => handleDeleteDeal(deal.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-600 text-slate-400 transition-all rounded-md"
                                title="Revoke Deal segment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Contact Info */}
                            <div className="text-[10px] text-slate-500 font-medium line-clamp-1">
                              {associatedLead?.name || "Unassigned Lead"}
                              <span className="text-[8px] text-slate-400 ml-1">@{associatedLead?.company || "N/A"}</span>
                            </div>

                            {/* Cost value & AI close score tags block */}
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                              <span className="font-bold text-emerald-600">${deal.value.toLocaleString()}</span>
                              
                              <div className="flex items-center gap-1">
                                {/* AI score rating */}
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-md">
                                  <Sparkles className="w-2.5 h-2.5 text-blue-600" />
                                  {associatedLead?.score || 80}%
                                </span>
                                {getHealthBadge(deal.status)}
                              </div>
                            </div>

                            {/* Tags indicator */}
                            {deal.tags && deal.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {deal.tags.slice(0, 2).map((t, idx) => (
                                  <span key={idx} className="text-[8px] bg-slate-50 font-bold text-slate-600 px-1.5 py-0.5 rounded border border-slate-150">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Assgined Agent visual element */}
                            <div className="flex items-center justify-between text-[8px] text-slate-400 uppercase tracking-wider font-mono pt-1">
                              <span>Stage Duration: {daysInfo.days}d / max {stage.slaDays}d</span>
                              <span className="text-slate-500">{deal.assignedAgent || "No Operator"}</span>
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
        )
      ) : (
        /* List view fallback with clean bulk support, pagination grids */
        <div className="overflow-x-auto bg-white border border-slate-200 shadow-sm rounded-2xl text-left">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-3 bg-slate-50/50">
                <th className="py-3 px-4 text-left">Deal Pipeline Item</th>
                <th className="py-3 px-4 text-left">Lead Associate</th>
                <th className="py-3 px-4 text-left">CRM Stage Staging</th>
                <th className="py-3 px-4 text-right">Value Volume</th>
                <th className="py-3 px-4 text-left">Assigned Agent</th>
                <th className="py-3 px-4 text-center">AI Deal Health</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {filteredDeals.map((deal) => {
                const lead = initialLeads.find(l => l.id === deal.leadId);
                const stage = activePipeline?.stages.find(s => s.id === deal.stage);

                return (
                  <tr 
                    key={deal.id}
                    onClick={() => selectActiveDeal(deal)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-bold text-slate-800">{deal.title}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{lead?.name || "Unassigned"}</div>
                      <div className="text-[10px] text-slate-500 select-none mt-0.5">{lead?.company || "N/A"}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${stage?.color}15`, color: stage?.color, border: `1px solid ${stage?.color}30` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color }} />
                        {stage?.name || deal.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      ${deal.value.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{deal.assignedAgent || "None"}</td>
                    <td className="py-3 px-4 text-center">{getHealthBadge(deal.status)}</td>
                    <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={(e) => handleDeleteDeal(deal.id, e)}
                        className="p-1 px-2.5 bg-rose-50 border border-rose-150 text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600 rounded-lg text-xs font-semibold transition-all"
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
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col focus:outline-none">
          {/* Sidebar Drawer Header */}
          <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-50">
            <div className="space-y-1">
              <span className="text-[10px] font-bold font-mono text-blue-600 uppercase tracking-wider">Lead & Deal Journey Detail Drawer</span>
              <h3 className="text-base font-bold text-slate-900 truncate max-w-sm">{selectedDeal.title}</h3>
            </div>
            <button 
              onClick={() => setSelectedDeal(null)}
              className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition-all cursor-pointer shadow-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body content (scrolls) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin bg-white">
            
            {/* 1. AI SONNET PROGRESSION AND INTELLIGENCE GAUGES */}
            <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-100 rounded-2xl p-5 space-y-4 shadow-xs relative overflow-hidden text-slate-800">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full filter blur-xl select-none" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider font-syne">Claude Close Analysis Engine</div>
                </div>

                <button
                  onClick={handleRefreshAiReport}
                  disabled={isRefreshingAi}
                  className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-40"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingAi ? "animate-spin" : ""}`} />
                  {isRefreshingAi ? "Analyzing..." : "Refresh Report"}
                </button>
              </div>

              {aiReport ? (
                <div className="space-y-4 text-left">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Prob widget gauge */}
                    <div className="bg-white border border-indigo-100 shadow-xs rounded-xl p-3 text-center space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Win Probability Gauge</div>
                      <div className="text-3xl font-extrabold text-indigo-600 font-mono">{aiReport.close_probability}%</div>
                      <div className="text-[9px] text-slate-400">Expected close: {aiReport.estimated_close_date || "N/A"}</div>
                    </div>

                    {/* Health Status card widget */}
                    <div className="bg-white border border-slate-150 shadow-xs rounded-xl p-3 text-center space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500">AI Health Status</div>
                      <div className="pt-1.5 flex justify-center">{getHealthBadge(aiReport.health_status)}</div>
                      <div className="text-[9px] text-slate-400 mt-1 select-none uppercase tracking-widest">Model: Claude 3.5 Sonnet</div>
                    </div>
                  </div>

                  {/* Summary paragraph */}
                  <div className="bg-white/90 border border-slate-200/80 rounded-xl p-3 text-xs leading-relaxed text-slate-600 shadow-xs">
                    <strong className="text-slate-800 block mb-1">Journey Intelligence Summary:</strong>
                    {aiReport.analysis_summary}
                  </div>

                  {/* Risk logs list */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-rose-700 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Key Negotiation Risks Identified
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-600">
                      {aiReport.key_risks?.map((risk: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-rose-500 select-none mt-0.5">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Next Step bullet points list */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-slate-800 flex items-center gap-1">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-600" />
                      Recommended Next Actions Target
                    </div>
                    <ol className="space-y-1 text-[11px] text-slate-600 list-decimal list-inside pl-1">
                      {aiReport.recommended_next_steps?.map((step: string, idx: number) => (
                        <li key={idx} className="text-slate-600">
                          <span className="text-slate-800 font-medium">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Curated Personal copy message template outreach */}
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-2 text-left">
                    <div className="text-[10px] uppercase font-bold text-indigo-700 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        Claude AI Curated Outreach Copy
                      </div>
                      <span className="text-[8px] opacity-60">Uses company knowledge-base context</span>
                    </div>
                    <div className="text-xs text-slate-850 leading-relaxed font-mono whitespace-pre-line p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                      {aiReport.ideal_outreach_message}
                    </div>
                  </div>

                  {/* History Logs comparison charts list */}
                  {aiHistory.length > 0 && (
                    <div className="border-t border-slate-150 pt-3">
                      <div className="text-[9px] uppercase font-bold text-slate-500 mb-2 tracking-wider flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        Historical Comparison (Sonnet Runs Audit)
                      </div>
                      <div className="flex items-center gap-2">
                        {aiHistory.map((hist, idx) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-center font-mono">
                            <span className="text-[8px] text-slate-400 block">{hist.date}</span>
                            <span className="text-xs text-indigo-650 font-bold">{hist.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-white border border-dashed border-slate-200 rounded-xl text-center">
                  <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-700">No Intelligence Compiled</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                    Deploy background Sonnet agents to parse negotiation risk blocks and recommend next actionable copy paths.
                  </p>
                  <button
                    onClick={handleRefreshAiReport}
                    disabled={isRefreshingAi}
                    className="mt-3 px-3 py-1 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAi ? "animate-spin" : ""}`} />
                    Compile Claude Intelligence Analysis
                  </button>
                </div>
              )}
            </div>

            {/* 2. TASK FOLLOW-UPS CHECKLISTS */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-widest text-slate-500 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Negotiation Checklist followups ({dealTasks.filter(t => t.completed).length}/{dealTasks.length})
              </h4>

              {/* Add Task bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <input 
                  type="text"
                  placeholder="Schedule follow-up reminder action..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 min-w-[180px] bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500"
                />
                <input 
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500"
                />
                <button 
                  onClick={handleAddTask}
                  className="px-4 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Schedule Actions
                </button>
              </div>

              {/* Tasks Checklist Grid */}
              <div className="space-y-2">
                {dealTasks.length === 0 ? (
                  <p className="text-[10px] italic text-slate-400 text-center font-mono">No scheduling tasks recorded. Keep track of customer SLAs.</p>
                ) : (
                  dealTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 shadow-xs rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <span className={`text-xs ${task.completed ? "line-through text-slate-400" : "text-slate-700 font-medium"}`}>
                          {task.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 font-mono text-[9px] text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>SLA: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. ACTIVITY TIMELINE CHRONOLOGY LOGS */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-bold tracking-widest text-slate-500 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-650" />
                Chronological Journey Activity Logs
              </h4>

              {/* Add Note text element */}
              <div className="space-y-2">
                <textarea
                  placeholder="Log manual notes, email triggers, or custom calls notes..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl p-3 text-xs outline-none focus:border-indigo-400 h-20 resize-none select-text focus:ring-1 focus:ring-indigo-400 shadow-xs"
                />
                <div className="flex justify-end">
                  <button 
                    onClick={handleAddNote}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    Log Negotiating Note
                  </button>
                </div>
              </div>

              {/* Timeline Items */}
              <div className="relative border-l border-slate-150 pl-4 space-y-6">
                {dealActivities.length === 0 ? (
                  <p className="text-[10px] italic text-slate-400 text-center select-none pt-2 font-mono">Timeline empty. Change stage or write notes above.</p>
                ) : (
                  dealActivities.map((act) => (
                    <div key={act.id} className="relative space-y-1 text-left">
                      {/* Anchor Timeline Ring */}
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-white bg-indigo-500 shadow-sm" />
                      
                      <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                        <span>{act.title}</span>
                        <span className="text-[8px] text-slate-400 font-mono">{new Date(act.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-relaxed select-text">{act.description}</p>
                      <div className="text-[8px] text-slate-400 italic flex items-center gap-1 pt-0.5 select-none font-mono">
                        <User className="w-2.5 h-2.5 opacity-60" />
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-left space-y-6 animate-in fade-in-50 zoom-in-95 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Initialize Journey Deal
              </h3>
              <button onClick={() => setShowAddDealModal(false)} className="text-slate-450 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Deal Action Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Enterprise Outreach Expansion Bundle"
                  value={newDealTitle}
                  onChange={(e) => setNewDealTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 select-text transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Associated Lead Target</label>
                  <select 
                    value={newDealLeadId}
                    onChange={(e) => setNewDealLeadId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="">Select Target...</option>
                    {initialLeads.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Deal Value Volume ($)</label>
                  <input 
                    type="number"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-255 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pipeline Stage Target</label>
                  <select 
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500"
                  >
                    {activePipeline?.stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Assigned Client Agent</label>
                  <select 
                    value={newDealAgent}
                    onChange={(e) => setNewDealAgent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500"
                  >
                    <option value="Sarah Mitchell">Sarah Mitchell</option>
                    <option value="James Ochieng">James Ochieng</option>
                    <option value="User Pro">User Pro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tags Config (comma separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. Enterprise, High-Value, SaaS"
                  value={newDealTags}
                  onChange={(e) => setNewDealTags(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none select-text focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setShowAddDealModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-205 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateDeal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                Initialize Target Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DUPLICATE MERGING DEDUPLICATION TOOL DIALOG (TASK 4) */}
      {showMergeModal && duplicateConflicts && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 text-left space-y-6 animate-in fade-in-50 zoom-in-95 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-rose-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Deduplication Lead Resolution Gate
              </h3>
              <button onClick={() => setShowMergeModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-150 text-xs text-rose-800 p-4 rounded-xl leading-relaxed">
              We identified dual duplicates conflicts mismatch records on work email or phone context pairings and companies similarities:
              <span className="font-mono block pt-1 font-bold text-rose-900 mb-0.5">Match Target ID: {duplicateConflicts.leadA.email}</span>
            </div>

            {/* Side-by-Side Values */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 text-left space-y-2 shadow-xs">
                <div className="font-bold text-blue-700 border-b border-slate-200 pb-1">Primary Duplicate Target</div>
                <div><span className="text-slate-400 uppercase text-[9px] block">Full name</span> <span className="text-slate-700 font-medium">{duplicateConflicts.leadA.name}</span></div>
                <div><span className="text-slate-400 uppercase text-[9px] block">Role Title</span> <span className="text-slate-700 font-medium">{duplicateConflicts.leadA.role}</span></div>
                <div><span className="text-slate-400 uppercase text-[9px] block">Phone link</span> <span className="text-slate-700 font-medium">{duplicateConflicts.leadA.phone || "No phone link"}</span></div>
                <div><span className="text-slate-400 uppercase text-[9px] block">LinkedIn</span> <span className="text-slate-700 font-medium">{duplicateConflicts.leadA.linkedin_url || "No link"}</span></div>
                <div><span className="text-slate-400 uppercase text-[9px] block">Country</span> <span className="text-slate-700 font-medium">{duplicateConflicts.leadA.country || "N/A"}</span></div>
              </div>

              <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 text-left space-y-2 shadow-xs">
                <div className="font-bold text-slate-700 border-b border-slate-200 pb-1">Conflicting Duplicate Target</div>
                <div><span className="text-slate-400 uppercase text-[9px] block">Full name</span> <span className="text-slate-700 font-medium">{duplicateConflicts.leadB.name}</span></div>
                <div><span className="text-slate-400 uppercase text-[9px] block">Role Title</span> <span className="text-slate-700 font-medium">{duplicateConflicts.leadB.role}</span></div>
                <div><span className="text-slate-400 uppercase text-[9px] block">Phone link</span> <span className="text-slate-700 font-medium">{duplicateConflicts.leadB.phone || "No phone link"}</span></div>
                <div><span className="text-slate-400 uppercase text-[9px] block">LinkedIn</span> <span className="text-slate-700 font-medium">{duplicateConflicts.leadB.linkedin_url || "No link"}</span></div>
                <div><span className="text-slate-400 uppercase text-[9px] block">Country</span> <span className="text-slate-700 font-medium">{duplicateConflicts.leadB.country || "N/A"}</span></div>
              </div>
            </div>

            {/* Merge options */}
            <div className="space-y-3">
              <div className="text-[10px] uppercase font-bold text-slate-500">Choose Field-Level Merging Override:</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  onClick={() => handleResolveMerge(duplicateConflicts.leadA.id, duplicateConflicts.leadB.id, {
                    role: duplicateConflicts.leadA.role || duplicateConflicts.leadB.role,
                    phone: duplicateConflicts.leadA.phone || duplicateConflicts.leadB.phone,
                    linkedin_url: duplicateConflicts.leadA.linkedin_url || duplicateConflicts.leadB.linkedin_url,
                    country: duplicateConflicts.leadA.country || duplicateConflicts.leadB.country
                  })}
                  className="p-3 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-150 rounded-xl text-left transition-all shadow-xs"
                >
                  <span className="font-bold text-blue-800 block mb-1">Retain Target A Value</span>
                  <span className="text-[11px] text-slate-600 leading-normal block">Resolves and combines records, prioritizing Lead A metadata.</span>
                </button>

                <button
                  onClick={() => handleResolveMerge(duplicateConflicts.leadA.id, duplicateConflicts.leadB.id, {
                    role: duplicateConflicts.leadB.role || duplicateConflicts.leadA.role,
                    phone: duplicateConflicts.leadB.phone || duplicateConflicts.leadA.phone,
                    linkedin_url: duplicateConflicts.leadB.linkedin_url || duplicateConflicts.leadA.linkedin_url,
                    country: duplicateConflicts.leadB.country || duplicateConflicts.leadA.country
                  })}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-250 rounded-xl text-left transition-all shadow-xs"
                >
                  <span className="font-bold text-slate-850 block mb-1">Retain Target B Value</span>
                  <span className="text-[11px] text-slate-600 leading-normal block">Resolves and combines records, prioritizing Lead B metadata.</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 text-xs">
              <button 
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-xl font-semibold cursor-pointer shadow-xs transition-colors"
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
