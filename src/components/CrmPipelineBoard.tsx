import React, { useState, useEffect } from "react";
import { 
  Kanban, List, Plus, Search, Filter, RefreshCw, Sparkles, AlertCircle, 
  MapPin, Clock, Calendar, Briefcase, User, UserCheck, Tag, Trash2, 
  CheckCircle, ChevronRight, Activity, FileText, Check, MoreVertical, 
  ArrowRight, ShieldAlert, BarChart3, Mail, Phone, Users, History, TrendingUp, X, Flag, Layers
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";

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
  completed?: boolean;
  priority?: "low" | "medium" | "high" | "urgent" | "none";
  summaryNote?: string;
  syncStatus?: "Synced" | "Syncing" | "Failed";
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
  profile?: {
    role: "super_admin" | "org_admin" | "user" | "sdr" | "manager" | "ae" | "viewer";
    orgId?: string;
    displayName?: string;
  };
}

export const CrmPipelineBoard: React.FC<CrmPipelineBoardProps> = ({ 
  leads: initialLeads, 
  onLeadsUpdated, 
  showToast,
  profile
}) => {
  // States
  const [viewType, setViewType] = useState<"kanban" | "list">("kanban");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pulsingColumnId, setPulsingColumnId] = useState<string | null>(null);
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
  const [mobileActiveStageId, setMobileActiveStageId] = useState<string | null>(null);
  
  // Account Hierarchy, Buying Committee, Org Chart States
  const [drawerTab, setDrawerTab] = useState<"ai" | "account" | "tasks">("ai");
  const [parentCompany, setParentCompany] = useState<string>("GrowthCo Holding Corp");
  const [businessUnit, setBusinessUnit] = useState<string>("Global Cloud Infrastructure Operations");
  const [buyingCommittee, setBuyingCommittee] = useState<Array<{ name: string; role: string; influence: "high" | "medium" | "low"; seniority: "C-Level" | "VP" | "Director" | "Manager" | "Contributor"; engagementScore: number }>>([
    { name: "Sarah Mitchell", role: "VP Growth", influence: "high", seniority: "VP", engagementScore: 85 },
    { name: "John Doe", role: "Chief Security Officer", influence: "high", seniority: "C-Level", engagementScore: 92 },
    { name: "Michael Vance", role: "Director of Systems", influence: "medium", seniority: "Director", engagementScore: 70 },
  ]);
  const [newCommitteeName, setNewCommitteeName] = useState("");
  const [newCommitteeRole, setNewCommitteeRole] = useState("");
  const [newCommitteeInfluence, setNewCommitteeInfluence] = useState<"high" | "medium" | "low">("medium");
  const [newCommitteeSeniority, setNewCommitteeSeniority] = useState<"C-Level" | "VP" | "Director" | "Manager" | "Contributor">("Manager");
  const [newCommitteeEngagement, setNewCommitteeEngagement] = useState<number>(75);

  // SLA, Movements, Swimlane & Stats Widget states
  const [movements, setMovements] = useState<DealMovement[]>([]);
  const [allActivities, setAllActivities] = useState<ActivityLog[]>([]);
  const [swimlaneMode, setSwimlaneMode] = useState<boolean>(false);
  const [showTeamActivityWidget, setShowTeamActivityWidget] = useState<boolean>(true);

  // Custom priority popover & administration
  const [activePriorityMenuId, setActivePriorityMenuId] = useState<string | null>(null);
  const [showAddColumnModal, setShowAddColumnModal] = useState<boolean>(false);
  const [newColumnName, setNewColumnName] = useState<string>("");
  const [newColumnColor, setNewColumnColor] = useState<string>("#3b82f6");
  const [newColumnSlaDays, setNewColumnSlaDays] = useState<number>(7);
  const [newColumnProbability, setNewColumnProbability] = useState<number>(50);

  const isAuthorizedToManageColumns = profile?.role === "super_admin" || profile?.role === "org_admin" || !profile;
  
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
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraftText, setNoteDraftText] = useState("");

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

  useEffect(() => {
    if (activePipeline?.stages && activePipeline.stages.length > 0) {
      if (!mobileActiveStageId || !activePipeline.stages.some(s => s.id === mobileActiveStageId)) {
        setMobileActiveStageId(activePipeline.stages[0].id);
      }
    }
  }, [activePipeline, mobileActiveStageId]);

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
  const handleDrop = async (e: React.DragEvent, targetStageId: string, targetPriority?: "high" | "medium" | "low") => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain");
    const draggedDeal = deals.find(d => d.id === dealId);
    
    if (draggedDeal) {
      const isStageChanged = draggedDeal.stage !== targetStageId;
      let isPriorityChanged = false;
      let newPriority: "low" | "medium" | "high" | "urgent" | "none" | undefined = undefined;

      if (targetPriority) {
        if (targetPriority === "high" && draggedDeal.priority !== "high" && draggedDeal.priority !== "urgent") {
          newPriority = "high";
          isPriorityChanged = true;
        } else if (targetPriority === "medium" && draggedDeal.priority !== "medium") {
          newPriority = "medium";
          isPriorityChanged = true;
        } else if (targetPriority === "low" && draggedDeal.priority !== "low" && draggedDeal.priority !== "none" && draggedDeal.priority !== undefined) {
          newPriority = "low";
          isPriorityChanged = true;
        }
      }

      if (isStageChanged || isPriorityChanged) {
        // Optimistic state
        const updatedDeals = deals.map(d => {
          if (d.id === dealId) {
            return {
              ...d,
              ...(isStageChanged ? { stage: targetStageId } : {}),
              ...(isPriorityChanged ? { priority: newPriority } : {})
            };
          }
          return d;
        });
        setDeals(updatedDeals);
        setPulsingColumnId(targetStageId);
        setTimeout(() => {
          setPulsingColumnId(null);
        }, 1200);

        try {
          const putParams: any = {};
          if (isStageChanged) putParams.stage = targetStageId;
          if (isPriorityChanged) putParams.priority = newPriority;
          putParams.agentName = draggedDeal.assignedAgent || "Workspace Agent";

          const res = await fetch(`/api/deals/${dealId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(putParams)
          });
          
          if (res.ok) {
            if (isStageChanged && isPriorityChanged) {
              showToast(`Deal promoted & set to ${newPriority} priority!`, "success");
            } else if (isStageChanged) {
              showToast(`Deal promoted & stage changed to "${targetStageId}"!`, "success");
            } else if (isPriorityChanged) {
              showToast(`Deal set to ${newPriority} priority!`, "success");
            }
            if (onLeadsUpdated) onLeadsUpdated();
            refreshDbState();
          } else {
            showToast("Failed to update deal parameters in CRM.", "error");
            refreshDbState();
          }
        } catch (err) {
          showToast("Communication loss updating deal.", "error");
          refreshDbState();
        }
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

  // Add a quick-action "Summary Note" field save function
  const handleSaveSummaryNote = async (dealId: string, text: string) => {
    try {
      // Optimistic state update
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, summaryNote: text } : d));
      setEditingNoteId(null);

      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryNote: text })
      });

      if (res.ok) {
        showToast("Summary Note updated on card.", "success");
        // Also log activity to the timeline for transparency
        if (text) {
          await fetch("/api/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dealId: dealId,
              type: "note_added",
              title: "Quick Summary Comment Added",
              description: text,
              agentName: profile?.displayName || "Workspace Operator"
            })
          });
        }
        refreshDbState();
      } else {
        showToast("Failed to save comment.", "error");
        refreshDbState();
      }
    } catch (err) {
      showToast("Communication loss saving note text.", "error");
      refreshDbState();
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

  // Update properties on a deal (completed status or priority)
  const updateDealProperty = async (dealId: string, updates: Partial<Deal>) => {
    // Optimistic state update
    setDeals(prevDeals => prevDeals.map(d => d.id === dealId ? { ...d, ...updates } : d));
    setActivePriorityMenuId(null);
    
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        showToast("Card updated successfully!", "success");
        if (onLeadsUpdated) onLeadsUpdated();
        refreshDbState();
      } else {
        showToast("Failed to save changes to card.", "error");
        refreshDbState();
      }
    } catch (err) {
      showToast("Communication error updating card.", "error");
      refreshDbState();
    }
  };

  // Add Pipeline stage (column)
  const handleAddPipelineColumn = async () => {
    if (!activePipeline) return;
    if (!newColumnName.trim()) {
      showToast("Column name is required.", "error");
      return;
    }

    const newStage: PipelineStage = {
      id: "stage-" + Math.random().toString(36).substr(2, 9),
      name: newColumnName.trim(),
      color: newColumnColor,
      probability: Number(newColumnProbability) || 50,
      slaDays: Number(newColumnSlaDays) || 7,
      statuses: ["Initial"]
    };

    const updatedStages = [...activePipeline.stages, newStage];
    
    // Optimistically update
    const updatedPipeline = { ...activePipeline, stages: updatedStages };
    setActivePipeline(updatedPipeline);
    setPipelinesList(prev => prev.map(p => p.id === activePipeline.id ? updatedPipeline : p));
    setShowAddColumnModal(false);

    try {
      const res = await fetch(`/api/pipelines/${activePipeline.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages: updatedStages })
      });
      if (res.ok) {
        showToast(`Column "${newColumnName.trim()}" created successfully!`, "success");
        setNewColumnName("");
        refreshDbState();
      } else {
        showToast("Failed to create pipeline column on server.", "error");
        refreshDbState();
      }
    } catch (err) {
      showToast("Communication error creating column.", "error");
      refreshDbState();
    }
  };

  // Delete Pipeline stage (column)
  const handleDeletePipelineColumn = async (stageId: string) => {
    if (!activePipeline) return;
    
    // Warn if deals are present inside this stage
    const count = deals.filter(d => d.stage === stageId).length;
    if (count > 0) {
      if (!window.confirm(`This column contains ${count} card(s). If you delete it, they will be disconnected. Proceed?`)) {
        return;
      }
    } else {
      if (!window.confirm("Are you sure you want to delete this column?")) {
        return;
      }
    }

    const updatedStages = activePipeline.stages.filter(s => s.id !== stageId);
    
    // Optimistically update
    const updatedPipeline = { ...activePipeline, stages: updatedStages };
    setActivePipeline(updatedPipeline);
    setPipelinesList(prev => prev.map(p => p.id === activePipeline.id ? updatedPipeline : p));

    try {
      const res = await fetch(`/api/pipelines/${activePipeline.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages: updatedStages })
      });
      if (res.ok) {
        showToast("Column removed successfully.", "success");
        refreshDbState();
      } else {
        showToast("Failed to delete column.", "error");
        refreshDbState();
      }
    } catch (err) {
      showToast("Communication error.", "error");
      refreshDbState();
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

  // BANT score styles mapping
  const getBantBadge = (bantScore?: string) => {
    if (!bantScore) return null;
    const config: Record<string, { label: string, bg: string, text: string }> = {
      A: { label: 'BANT: A', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', text: 'text-emerald-400' },
      B: { label: 'BANT: B', bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400', text: 'text-blue-400' },
      C: { label: 'BANT: C', bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', text: 'text-amber-400' },
      D: { label: 'BANT: D', bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', text: 'text-rose-400' },
    };
    const cfg = config[bantScore] || { label: `BANT: ${bantScore}`, bg: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400', text: 'text-zinc-400' };
    return (
      <span >
        {cfg.label}
      </span>
    );
  };

  // Hot, warm, cold style mappings
  const getHealthBadge = (health: string | undefined) => {
    switch(health) {
      case "hot":
        return <span >🔥 Hot Close</span>;
      case "warm":
        return <span >⚡ Warm Play</span>;
      case "cold":
        return <span >❄️ Cold Strobe</span>;
      case "lost":
        return <span >💨 Closed Lost</span>;
      default:
        return <span >⚡ Recalculating</span>;
    }
  };

  const getSyncStatusBadge = (deal: Deal) => {
    // Generate deterministic baseline status if not explicitly set
    const status = deal.syncStatus || (deal.value % 3 === 0 ? "Failed" : "Synced");

    const triggerSync = (e: React.MouseEvent) => {
      e.stopPropagation();
      showToast(`Initiating CRM sync for "${deal.title}"...`, "info");
      updateDealProperty(deal.id, { syncStatus: "Syncing" });

      setTimeout(() => {
        const result: "Synced" | "Failed" = Math.random() > 0.15 ? "Synced" : "Failed";
        updateDealProperty(deal.id, { syncStatus: result });
        if (result === "Synced") {
          showToast(`Successfully synced "${deal.title}" to external CRM!`, "success");
        } else {
          showToast(`CRM sync failed for "${deal.title}". Check connection rules.`, "error");
        }
      }, 1500);
    };

    if (status === "Synced") {
      return (
        <button
          onClick={triggerSync}
          
          title="Synced. Click to re-sync."
        >
          <span  />
          <span>Synced</span>
        </button>
      );
    } else if (status === "Syncing") {
      return (
        <div
          onClick={(e) => e.stopPropagation()}
          
          title="Integrating payload in background..."
        >
          <RefreshCw  />
          <span>Syncing</span>
        </div>
      );
    } else {
      return (
        <button
          onClick={triggerSync}
          
          title="Sync failed. Click to rebuild and retry."
        >
          <span  />
          <span>Failed</span>
        </button>
      );
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
    <div id="crm-field-mapping-panel" >
      {/* Upper header section */}
      <div >
        <div>
          <h2 >
            <TrendingUp  />
            Lead & Deal Journey Builder
          </h2>
          <p >
            Configure isolated pipeline stages with probability indexes, configure assignment parameters, and deploy Claude Sonnet Always-on Close intelligence.
          </p>
        </div>

        {/* View Layout, Merge triggers, pipelines configuring row */}
        <div >
          {/* Pipeline Dropdown Selector */}
          <div >
            <span >
              PIPELINE:
            </span>
            <select
              value={activePipeline?.id || ""}
              onChange={(e) => {
                const selected = pipelinesList.find(p => p.id === e.target.value);
                if (selected) {
                  setActivePipeline(selected);
                  if (selected.stages && selected.stages.length > 0) {
                    setMobileActiveStageId(selected.stages[0].id);
                  }
                }
              }}
              
            >
              {pipelinesList.map(p => (
                <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Deduplication check */}
          <button 
            onClick={checkForDuplicates}
            
          >
            <ShieldAlert  />
            De-Duplicate Leads Tool
          </button>

          {/* New Deal */}
          <button 
            onClick={() => setShowAddDealModal(true)}
            
          >
            <Plus  />
            Create Deal
          </button>

          {/* Team Activity Widget Toggle */}
          <button 
            onClick={() => setShowTeamActivityWidget(!showTeamActivityWidget)}
            
          >
            <BarChart3  />
            Team Activity
          </button>

          {/* Swimlane Toggle Button */}
          {viewType === "kanban" && (
            <button 
              onClick={() => setSwimlaneMode(!swimlaneMode)}
              
              title="Toggle horizontal swimlanes categorized by Lead Priority"
            >
              <Layers  />
              <span>Swimlanes {swimlaneMode ? "ON" : "OFF"}</span>
            </button>
          )}

          {/* Toggle switcher layout state */}
          <div >
            <button
              onClick={() => toggleViewPreference("kanban")}
              
              title="Kanban Board Staging"
            >
              <Kanban  />
              Board
            </button>
            <button
              onClick={() => toggleViewPreference("list")}
              
              title="List View"
            >
              <List  />
              List View
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Advanced searching queries */}
      <div >
        {/* Search */}
        <div >
          <Search  />
          <input 
            type="text"
            placeholder="Search deals, contacts or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            
          />
        </div>

        {/* Tag Selection filter */}
        <div >
          <Tag  />
          <select 
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            
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
        <div >
          <User  />
          <select 
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            
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
        <div >
          <div >
            <div >
              <BarChart3  />
              <h3 >Team Activity Metrics (Deals Moved in Last 30 Days)</h3>
            </div>
            <span >
              Total movements: {chartData.reduce((sum, d) => sum + d.moves, 0)}
            </span>
          </div>

          {chartData.length === 0 ? (
            <div >
              No deal movements logged by team agents over the last 30 days. Promote a deal between stages to record activity!
            </div>
          ) : (
            <div >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                  <XAxis dataKey="name" stroke="var(--muted)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", borderRadius: "10px", color: "var(--text)", fontSize: "11px" }}
                    itemStyle={{ color: "var(--accent)", fontSize: "11px" }}
                    labelStyle={{ color: "var(--text)", fontSize: "11px", fontWeight: "bold" }}
                  />
                  <Bar dataKey="moves" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
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
          <div >
            {(() => {
              const swimlanes = [
                { key: "high", label: "High Lead Priority", colorClass: "text-rose-600 dark:text-rose-400", bgClass: "bg-rose-500/10 border-rose-500/20", icon: "🔥" },
                { key: "medium", label: "Medium Lead Priority", colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10 border-amber-500/20", icon: "⚡" },
                { key: "low", label: "Low / No Lead Priority", colorClass: "text-text-muted", bgClass: "bg-surface-alt border-border", icon: "❄️" }
              ];

              return (
                <div >
                  {swimlanes.map((lane) => {
                    const laneDeals = filteredDeals.filter(d => {
                      if (lane.key === "high") return d.priority === "high" || d.priority === "urgent";
                      if (lane.key === "medium") return d.priority === "medium";
                      return d.priority === "low" || d.priority === "none" || !d.priority;
                    });

                    const totalValue = laneDeals.reduce((sum, d) => sum + d.value, 0);

                    return (
                      <div key={lane.key} >
                        {/* Swimlane Header */}
                        <div >
                          <div >
                            <span >{lane.icon}</span>
                            <h3 >
                              {lane.label}
                            </h3>
                            <span >
                              {laneDeals.length} Deals
                            </span>
                          </div>
                          <span >
                            Cumulative: ${totalValue.toLocaleString()}
                          </span>
                        </div>

                        {/* Horizontal Stages Grid */}
                        <div >
                          {activePipeline?.stages.map((stage) => {
                            const stageLaneDeals = laneDeals.filter(d => d.stage === stage.id);
                            const cumulativeStageValue = stageLaneDeals.reduce((sum, d) => sum + d.value, 0);

                            return (
                              <motion.div 
                                key={stage.id}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id, lane.key as any)}
                                animate={pulsingColumnId === stage.id ? { scale: [1, 1.015, 1], borderColor: ["var(--border)", "var(--brand)", "var(--border)"] } : {}}
                                transition={{ duration: 0.8 }}
                                
                              >
                                {/* Stage name Inside Swimlane */}
                                <motion.div 
                                  animate={pulsingColumnId === stage.id ? { y: [0, -3, 0], opacity: [1, 0.7, 1] } : {}}
                                  transition={{ duration: 0.8 }}
                                  
                                >
                                  <div >
                                    <span  style={{ backgroundColor: stage.color }} />
                                    <span  title={stage.name}>
                                      {stage.name}
                                    </span>
                                  </div>
                                  <span >
                                    ${cumulativeStageValue.toLocaleString()}
                                  </span>
                                </motion.div>

                                {/* Render stage lane deals */}
                                <div >
                                  {stageLaneDeals.length === 0 ? (
                                    <div >
                                      <span >No Matches</span>
                                    </div>
                                  ) : (
                                    stageLaneDeals.map((deal) => {
                                      const associatedLead = initialLeads.find(l => l.id === deal.leadId);
                                      const daysInfo = getDaysInStage(deal, stage);
                                      const isSlaBreached = stage.slaDays > 0 && daysInfo.days > stage.slaDays;

                                      return (
                                        <motion.div
                                          key={deal.id}
                                          initial={{ opacity: 0, x: -15 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          layout
                                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e as any, deal.id)}
                                          onClick={() => selectActiveDeal(deal)}
                                          
                                        >
                                          {/* SLA Breach visual warning alert */}
                                          {isSlaBreached && (
                                            <div >
                                              <AlertCircle  />
                                              <span>SLA Overdue ({daysInfo.days}d / max {stage.slaDays}d)</span>
                                            </div>
                                          )}

                                          <div >
                                            <h5  title={deal.title}>
                                              {deal.title}
                                            </h5>
                                            <button 
                                              onClick={(e) => handleDeleteDeal(deal.id, e)}
                                              
                                            >
                                              <Trash2  />
                                            </button>
                                          </div>

                                          <div >
                                            <div >
                                              {associatedLead?.name || "Unassigned Lead"}
                                              <span >@{associatedLead?.company || "N/A"}</span>
                                            </div>
                                            {getSyncStatusBadge(deal)}
                                          </div>
                                          <div >
                                            {associatedLead?.name || "Unassigned Lead"}
                                            <span >@{associatedLead?.company || "N/A"}</span>
                                          </div>

                                          <div >
                                            <span >${deal.value.toLocaleString()}</span>
                                            <div >
                                              {getBantBadge((associatedLead as any)?.bantScore)}
                                              <span >
                                                {associatedLead?.score || 80}%
                                              </span>
                                              {getHealthBadge(deal.status)}
                                            </div>
                                          </div>

                                          <div >
                                            <span>Duration: {daysInfo.days}d / max {stage.slaDays}d</span>
                                            <span >{deal.assignedAgent || "No Operator"}</span>
                                          </div>

                                          {/* Quick Summary Note */}
                                          <div 
                                            
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {editingNoteId === deal.id ? (
                                              <div >
                                                <textarea
                                                  autoFocus
                                                  value={noteDraftText}
                                                  onChange={(e) => setNoteDraftText(e.target.value)}
                                                  onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                      e.preventDefault();
                                                      handleSaveSummaryNote(deal.id, noteDraftText);
                                                    } else if (e.key === "Escape") {
                                                      setEditingNoteId(null);
                                                    }
                                                  }}
                                                  placeholder="Short note..."
                                                  
                                                />
                                                <div >
                                                  <button
                                                    onClick={() => setEditingNoteId(null)}
                                                    
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    onClick={() => handleSaveSummaryNote(deal.id, noteDraftText)}
                                                    
                                                  >
                                                    <Check  /> Save
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div 
                                                onClick={() => {
                                                  setEditingNoteId(deal.id);
                                                  setNoteDraftText(deal.summaryNote || "");
                                                }}
                                                
                                                title="Click to edit summary note"
                                              >
                                                <div >
                                                  <FileText  />
                                                  {deal.summaryNote ? (
                                                    <p >
                                                      "{deal.summaryNote}"
                                                    </p>
                                                  ) : (
                                                    <span >
                                                      Add summary note...
                                                    </span>
                                                  )}
                                                </div>
                                                <span >
                                                  Edit
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </motion.div>
                                      );
                                    })
                                  )}
                                </div>
                              </motion.div>
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
          <div >
            {/* Mobile Stage Selector Tabs */}
            <div >
              {activePipeline?.stages.map((stage) => {
                const isSelected = mobileActiveStageId === stage.id;
                const count = filteredDeals.filter(d => d.stage === stage.id).length;
                return (
                  <button
                    key={stage.id}
                    onClick={() => setMobileActiveStageId(stage.id)}
                    
                  >
                    <span  style={{ backgroundColor: stage.color }} />
                    <span>{stage.name}</span>
                    <span >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div >
              {activePipeline?.stages.map((stage) => {
                const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
                const cumulativeValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
                
                const isMobileHidden = mobileActiveStageId && mobileActiveStageId !== stage.id;

                // Map custom colors according to the image requested
                const getStageHeaderStyles = (stageName: string, defaultColor: string) => {
                  const norm = stageName.toLowerCase().replace(/\s+/g, "");
                  if (norm === "lead") return { headerBg: "bg-[#ff7043]", textColor: "text-white", chipBg: "bg-[#d84315]" };
                  if (norm === "prospect") return { headerBg: "bg-[#ffb300]", textColor: "text-white", chipBg: "bg-[#ff8f00]" };
                  if (norm === "activeuser") return { headerBg: "bg-[#26a69a]", textColor: "text-white", chipBg: "bg-[#00796b]" };
                  if (norm === "betatester") return { headerBg: "bg-[#42a5f5]", textColor: "text-white", chipBg: "bg-[#1565c0]" };
                  return { headerBg: "", headerStyle: { backgroundColor: defaultColor }, textColor: "text-white", chipBg: "bg-black/20" };
                };

                const theme = getStageHeaderStyles(stage.name, stage.color);

                return (
                  <motion.div 
                    key={stage.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                    animate={pulsingColumnId === stage.id ? { scale: [1, 1.015, 1] } : {}}
                    transition={{ duration: 0.8 }}
                    
                  >
                  {/* Dynamic Colored Stage Header */}
                  <motion.div 
                    animate={pulsingColumnId === stage.id ? { opacity: [1, 0.4, 1] } : {}}
                    transition={{ duration: 0.8 }}
                    
                    style={theme.headerStyle}
                  >
                    <div >
                      <h4  title={stage.name}>
                        {stage.name}
                      </h4>
                    </div>
                    
                    <div >
                      {/* Active items counter box */}
                      <span >
                        {stageDeals.length}
                      </span>
                      {/* Direct Column Delete button for admins */}
                      {isAuthorizedToManageColumns && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePipelineColumn(stage.id);
                          }}
                          
                          title="Delete Segment Stage Column"
                        >
                          <X  />
                        </button>
                      )}
                    </div>
                  </motion.div>

                  <div >
                    <div >
                      <span>Prob: {stage.probability}%</span>
                      <span >${cumulativeValue.toLocaleString()}</span>
                    </div>

                    {/* Cards rendering */}
                    <div >
                      {stageDeals.length === 0 ? (
                        <div >
                          <Briefcase  />
                          <span >Stage Empty</span>
                          <span >SLA limit: {stage.slaDays} days</span>
                        </div>
                      ) : (
                        stageDeals.map((deal) => {
                          const associatedLead = initialLeads.find(l => l.id === deal.leadId);
                          const daysInfo = getDaysInStage(deal, stage);
                          const isSlaBreached = stage.slaDays > 0 && daysInfo.days > stage.slaDays;

                          return (
                            <motion.div
                              key={deal.id}
                              initial={{ opacity: 0, x: -15 }}
                              animate={{ opacity: 1, x: 0 }}
                              layout
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              draggable
                              onDragStart={(e) => handleDragStart(e as any, deal.id)}
                              onClick={() => selectActiveDeal(deal)}
                              
                            >
                              {/* SLA Breach visual warning alert */}
                              {isSlaBreached && (
                                <div >
                                  <AlertCircle  />
                                  <span>SLA Overdue ({daysInfo.days}d / Limit {stage.slaDays}d)</span>
                                </div>
                              )}

                              {/* Row 1: Checkbox + Title + Flag */}
                              <div >
                                <div >
                                  <input 
                                    type="checkbox" 
                                    checked={!!deal.completed} 
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateDealProperty(deal.id, { completed: !deal.completed });
                                    }}
                                    
                                  />
                                  <h5  title={deal.title}>
                                    {deal.title}
                                  </h5>
                                </div>

                                <div >
                                  {/* Flag setter dropdown */}
                                  <div >
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePriorityMenuId(activePriorityMenuId === deal.id ? null : deal.id);
                                      }}
                                      
                                      title="Set Priority Flag"
                                    >
                                      <Flag  />
                                    </button>
                                    {activePriorityMenuId === deal.id && (
                                      <div 
                                         
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <div >Set Priority</div>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateDealProperty(deal.id, { priority: "urgent" });
                                          }} 
                                          
                                        >
                                          🚩 Urgent
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateDealProperty(deal.id, { priority: "high" });
                                          }} 
                                          
                                        >
                                          🚩 High
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateDealProperty(deal.id, { priority: "medium" });
                                          }} 
                                          
                                        >
                                          🚩 Medium
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateDealProperty(deal.id, { priority: "low" });
                                          }} 
                                          
                                        >
                                          🚩 Low
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateDealProperty(deal.id, { priority: "none" });
                                          }} 
                                          
                                        >
                                          🏳️ None
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <button 
                                    onClick={(e) => handleDeleteDeal(deal.id, e)}
                                    
                                    title="Delete Deal"
                                  >
                                    <Trash2  />
                                  </button>
                                </div>
                              </div>

                              {/* Row 2: Assigned Agent / Contact name */}
                              <div >
                                Operator: <span >{deal.assignedAgent || "No Operator Assigned"}</span>
                              </div>

                              {/* Row 3: Meta details check */}
                              <div >
                                <div >
                                  <span >{associatedLead?.name || "Unassigned"}</span>
                                  {associatedLead?.company && (
                                    <span >
                                      @{associatedLead.company}
                                    </span>
                                  )}
                                </div>
                                {getSyncStatusBadge(deal)}
                              </div>
                              <div >
                                <span >{associatedLead?.name || "Unassigned"}</span>
                                {associatedLead?.company && (
                                  <span >
                                    @{associatedLead.company}
                                  </span>
                                )}
                              </div>

                              {/* Cost value & AI close score tags block */}
                              <div >
                                <span >${deal.value.toLocaleString()}</span>
                                
                                <div >
                                  {getBantBadge((associatedLead as any)?.bantScore)}
                                  {/* AI score rating */}
                                  <span >
                                    <Sparkles  />
                                    {associatedLead?.score || 80}%
                                  </span>
                                  {getHealthBadge(deal.status)}
                                </div>
                              </div>

                              {/* Tags indicator */}
                              {deal.tags && deal.tags.length > 0 && (
                                <div >
                                  {deal.tags.slice(0, 2).map((t, idx) => (
                                    <span key={idx} >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Stage Duration tracking */}
                              <div >
                                <span>In Stage: {daysInfo.days}d</span>
                                {stage.slaDays > 0 && <span>Max: {stage.slaDays}d</span>}
                              </div>

                              {/* Summary Note Field */}
                              <div 
                                
                                onClick={(e) => e.stopPropagation()}
                              >
                                {editingNoteId === deal.id ? (
                                  <div >
                                    <textarea
                                      autoFocus
                                      value={noteDraftText}
                                      onChange={(e) => setNoteDraftText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          handleSaveSummaryNote(deal.id, noteDraftText);
                                        } else if (e.key === "Escape") {
                                          setEditingNoteId(null);
                                        }
                                      }}
                                      placeholder="Write short comment..."
                                      
                                    />
                                    <div >
                                      <button
                                        onClick={() => setEditingNoteId(null)}
                                        
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSaveSummaryNote(deal.id, noteDraftText)}
                                        
                                      >
                                        <Check  /> Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => {
                                      setEditingNoteId(deal.id);
                                      setNoteDraftText(deal.summaryNote || "");
                                    }}
                                    
                                    title="Click to edit summary note"
                                  >
                                    <div >
                                      <FileText  />
                                      {deal.summaryNote ? (
                                        <p >
                                          "{deal.summaryNote}"
                                        </p>
                                      ) : (
                                        <span >
                                          Add summary note...
                                        </span>
                                      )}
                                    </div>
                                    <span >
                                      Edit
                                    </span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Special Add Column card for Authorized Roles */}
            {isAuthorizedToManageColumns && (
              <button 
                onClick={() => setShowAddColumnModal(true)}
                
              >
                <div >
                  <Plus  />
                </div>
                <div >
                  <h5 >Add Column</h5>
                  <p >Create a new customizable stage segment</p>
                </div>
              </button>
            )}
          </div>
          </div>
        )
      ) : (
        /* List view fallback with clean bulk support, pagination grids */
        <div id="journey-list-view-container" >
          {filteredDeals.length === 0 ? (
            <div >
              No active journey deals found in this pipeline segment.
            </div>
          ) : (
            <div >
              {filteredDeals.map((deal) => {
                const lead = initialLeads.find(l => l.id === deal.leadId);
                const stage = activePipeline?.stages.find(s => s.id === deal.stage);
                const daysInfo = stage ? getDaysInStage(deal, stage) : { days: 0 };
                const isSlaOverdue = stage && stage.slaDays > 0 && daysInfo.days > stage.slaDays;

                let priorityEmoji = "🏳️";
                let priorityColor = "text-text-muted";
                if (deal.priority === "urgent") { priorityEmoji = "🚩 Urgent"; priorityColor = "text-red-500 font-bold"; }
                else if (deal.priority === "high") { priorityEmoji = "🚩 High"; priorityColor = "text-orange-500 font-bold"; }
                else if (deal.priority === "medium") { priorityEmoji = "🚩 Medium"; priorityColor = "text-yellow-500 font-bold"; }
                else if (deal.priority === "low") { priorityEmoji = "🚩 Low"; priorityColor = "text-blue-500 font-bold"; }

                const isSelected = selectedDeal?.id === deal.id;

                return (
                  <motion.div 
                    key={deal.id}
                    layout
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    onClick={() => selectActiveDeal(deal)}
                    
                  >
                    <div >
                      {/* Active check indicators */}
                      <div >
                        <input 
                          type="checkbox" 
                          checked={deal.completed || false} 
                          onChange={(e) => { 
                            e.stopPropagation(); 
                            updateDealProperty(deal.id, { completed: !deal.completed }); 
                          }} 
                          
                        />
                      </div>

                      {/* Initials avatar matching lead index design */}
                      <div >
                        {(lead?.name || deal.title || "?")[0].toUpperCase()}
                      </div>

                      {/* Main identity metadata details column */}
                      <div >
                        <div >
                          <span >
                            {deal.title}
                          </span>
                          {deal.priority && deal.priority !== "none" && (
                            <span >
                              {priorityEmoji}
                            </span>
                          )}
                          {isSlaOverdue && (
                            <span >
                              <AlertCircle  />
                              SLA Breach
                            </span>
                          )}
                        </div>
                        
                        <div >
                          <span >
                            <span>Lead:</span>
                            <span >{lead?.name || "Unassigned Lead"}</span>
                          </span>
                          {lead?.company && (
                            <span >
                              <span >
                                @{lead.company}
                              </span>
                            </span>
                          )}
                          {lead?.score && (
                            <span >
                              <Sparkles  />
                              {lead.score}%
                            </span>
                          )}
                          {getSyncStatusBadge(deal)}
                        </div>
                      </div>
                    </div>

                    {/* Secondary layout tags columns */}
                    <div >
                      
                      {/* Operator assignments & SLA statuses */}
                      <div >
                        <div>
                          <span  style={{ backgroundColor: `${stage?.color}15`, color: stage?.color, border: `1px solid ${stage?.color}25` }}>
                            <span  style={{ backgroundColor: stage?.color }} />
                            {stage?.name || deal.stage}
                          </span>
                        </div>
                        <div >
                          <span>Operator:</span>
                          <span >{deal.assignedAgent || "Unassigned"}</span>
                        </div>
                        <div >
                          Duration: {daysInfo.days}d {stage?.slaDays ? `/ max ${stage.slaDays}d` : ""}
                        </div>
                      </div>

                      {/* Deal Health & Dollar Volume highlight */}
                      <div >
                        <span >
                          ${deal.value.toLocaleString()}
                        </span>
                        <div>
                          {getHealthBadge(deal.status)}
                        </div>
                      </div>

                      {/* Quick delete actions */}
                      <div  onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleDeleteDeal(deal.id, e)}
                          
                        >
                          Delete
                        </button>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dynamic Detail Collapsible Side Drawer Panel */}
      {selectedDeal && (
        <div >
          {/* Sidebar Drawer Header */}
          <div >
            <div >
              <span >Lead & Deal Journey Detail Drawer</span>
              <h3 >{selectedDeal.title}</h3>
            </div>
            <button 
              onClick={() => setSelectedDeal(null)}
              
            >
              <X  />
            </button>
          </div>

          {/* Tabs bar selector */}
          <div >
            <button
              onClick={() => setDrawerTab("ai")}
              
            >
              ✨ AI Intelligence
            </button>
            <button
              onClick={() => setDrawerTab("account")}
              
            >
              🏢 Account & Buying Committee
            </button>
            <button
              onClick={() => setDrawerTab("tasks")}
              
            >
              ✅ Actions & Logs
            </button>
          </div>

          {/* Drawer Body content (scrolls) */}
          <div >
            
            {drawerTab === "ai" && (
              <div >
                {/* 1. AI SONNET PROGRESSION AND INTELLIGENCE GAUGES */}
            <div >
              <div  />
              
              <div >
                <div >
                  <Sparkles  />
                  <div >Claude Close Analysis Engine</div>
                </div>

                <button
                  onClick={handleRefreshAiReport}
                  disabled={isRefreshingAi}
                  
                >
                  <RefreshCw  />
                  {isRefreshingAi ? "Analyzing..." : "Refresh Report"}
                </button>
              </div>

              {aiReport ? (
                <div >
                  <div >
                    {/* Prob widget gauge */}
                    <div >
                      <div >Win Probability Gauge</div>
                      <div >{aiReport.close_probability}%</div>
                      <div >Expected close: {aiReport.estimated_close_date || "N/A"}</div>
                    </div>

                    {/* Health Status card widget */}
                    <div >
                      <div >AI Health Status</div>
                      <div >{getHealthBadge(aiReport.health_status)}</div>
                      <div >Model: Claude 3.5 Sonnet</div>
                    </div>
                  </div>

                  {/* Summary paragraph */}
                  <div >
                    <strong >Journey Intelligence Summary:</strong>
                    {aiReport.analysis_summary}
                  </div>

                  {/* Risk logs list */}
                  <div >
                    <div >
                      <AlertCircle  />
                      Key Negotiation Risks Identified
                    </div>
                    <ul >
                      {aiReport.key_risks?.map((risk: string, idx: number) => (
                        <li key={idx} >
                          <span >•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Next Step bullet points list */}
                  <div >
                    <div >
                      <ChevronRight  />
                      Recommended Next Actions Target
                    </div>
                    <ol >
                      {aiReport.recommended_next_steps?.map((step: string, idx: number) => (
                        <li key={idx} >
                          <span >{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Curated Personal copy message template outreach */}
                  <div >
                    <div >
                      <div >
                        <Mail  />
                        Claude AI Curated Outreach Copy
                      </div>
                      <span >Uses company knowledge-base context</span>
                    </div>
                    <div >
                      {aiReport.ideal_outreach_message}
                    </div>
                  </div>

                  {/* History Logs comparison charts list */}
                  {aiHistory.length > 0 && (
                    <div >
                      <div >
                        <History  />
                        Historical Comparison (Sonnet Runs Audit)
                      </div>
                      <div >
                        {aiHistory.map((hist, idx) => (
                          <div key={idx} >
                            <span >{hist.date}</span>
                            <span >{hist.score}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div >
                  <Sparkles  />
                  <p >No Intelligence Compiled</p>
                  <p >
                    Deploy background Sonnet agents to parse negotiation risk blocks and recommend next actionable copy paths.
                  </p>
                  <button
                    onClick={handleRefreshAiReport}
                    disabled={isRefreshingAi}
                    
                  >
                    <RefreshCw  />
                    Compile Claude Intelligence Analysis
                  </button>
                </div>
              )}
              </div>
              </div>
            )}

            {drawerTab === "account" && (
              <div >
                {/* Account details */}
                <div >
                  <h4 >
                    <Briefcase  />
                    Corporate Account Hierarchy Context
                  </h4>
                  <div >
                    <div >
                      <label >Parent Company Group</label>
                      <input 
                        type="text"
                        value={parentCompany}
                        onChange={(e) => setParentCompany(e.target.value)}
                        
                      />
                    </div>
                    <div >
                      <label >Business Unit / Department</label>
                      <input 
                        type="text"
                        value={businessUnit}
                        onChange={(e) => setBusinessUnit(e.target.value)}
                        
                      />
                    </div>
                  </div>
                </div>

                {/* Org tree builder preview */}
                <div >
                  <h4 >
                    <Users  />
                    Interactive Company Org Hierarchy Map
                  </h4>
                  <div >
                    {/* Root company node */}
                    <div >
                      🏢 {parentCompany} (Parent Organization)
                    </div>
                    <div  />
                    {/* Business unit node */}
                    <div >
                      📂 {businessUnit} (Subsidiary)
                    </div>
                    <div  />
                    
                    {/* Horizontal connector line for children */}
                    <div >
                      <div  />
                      <div  />
                      <div  />
                    </div>
                    
                    {/* Buying committee members nodes */}
                    <div >
                      {buyingCommittee.map((m, idx) => (
                        <div key={idx} >
                          <div >{m.name}</div>
                          <div >{m.role}</div>
                          <div >
                            <span >
                              {m.seniority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Buying Committee list table / editor */}
                <div >
                  <h4 >
                    <span >
                      <UserCheck  />
                      Stakeholder Buying Committee Mapping
                    </span>
                    <span >{buyingCommittee.length} Stakeholders</span>
                  </h4>

                  {/* Add stakeholder form */}
                  <div >
                    <div >Map New Stakeholder Card</div>
                    <div >
                      <input 
                        type="text" 
                        placeholder="Stakeholder Name..." 
                        value={newCommitteeName}
                        onChange={e => setNewCommitteeName(e.target.value)}
                        
                      />
                      <input 
                        type="text" 
                        placeholder="Corporate Role / Title..." 
                        value={newCommitteeRole}
                        onChange={e => setNewCommitteeRole(e.target.value)}
                        
                      />
                      <div >
                        <label >Influence Level</label>
                        <select
                          value={newCommitteeInfluence}
                          onChange={e => setNewCommitteeInfluence(e.target.value as any)}
                          
                        >
                          <option value="high">🔥 High Influence</option>
                          <option value="medium">⚡ Medium Influence</option>
                          <option value="low">🌱 Low Influence</option>
                        </select>
                      </div>
                      <div >
                        <label >Seniority Title</label>
                        <select
                          value={newCommitteeSeniority}
                          onChange={e => setNewCommitteeSeniority(e.target.value as any)}
                          
                        >
                          <option value="C-Level">🏆 C-Level Exec</option>
                          <option value="VP">⭐ VP Senior</option>
                          <option value="Director">💼 Director</option>
                          <option value="Manager">🧑‍💼 Manager</option>
                          <option value="Contributor">💻 Contributor</option>
                        </select>
                      </div>
                    </div>
                    <div >
                      <div >
                        <span >Engagement: {newCommitteeEngagement}%</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={newCommitteeEngagement}
                          onChange={e => setNewCommitteeEngagement(Number(e.target.value))}
                          
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!newCommitteeName || !newCommitteeRole) {
                            showToast("Please supply stakeholder Name and Corporate Role.", "error");
                            return;
                          }
                          setBuyingCommittee(prev => [
                            ...prev, 
                            { 
                              name: newCommitteeName, 
                              role: newCommitteeRole, 
                              influence: newCommitteeInfluence, 
                              seniority: newCommitteeSeniority, 
                              engagementScore: newCommitteeEngagement 
                            }
                          ]);
                          setNewCommitteeName("");
                          setNewCommitteeRole("");
                          showToast("Stakeholder mapped successfully to the Buying Committee.", "success");
                        }}
                        
                      >
                        + Map Lead Stakeholder
                      </button>
                    </div>
                  </div>

                  {/* Operational Committee Table view */}
                  <div >
                    <table >
                      <thead>
                        <tr >
                          <th >Stakeholder</th>
                          <th >Company Level</th>
                          <th >Influence</th>
                          <th >Engagement</th>
                        </tr>
                      </thead>
                      <tbody >
                        {buyingCommittee.map((m, idx) => (
                          <tr key={idx} >
                            <td >
                              <div >{m.name}</div>
                              <div >{m.role}</div>
                            </td>
                            <td >{m.seniority}</td>
                            <td >
                              <span >
                                {m.influence}
                              </span>
                            </td>
                            <td >
                              <div >
                                <div >
                                  <div  style={{ width: `${m.engagementScore}%` }} />
                                </div>
                                <span >{m.engagementScore}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {drawerTab === "tasks" && (
              <div >
                {/* 2. TASK FOLLOW-UPS CHECKLISTS */}
            <div >
              <h4 >
                <CheckCircle  />
                Negotiation Checklist followups ({dealTasks.filter(t => t.completed).length}/{dealTasks.length})
              </h4>

              {/* Add Task bar */}
              <div >
                <input 
                  type="text"
                  placeholder="Schedule follow-up reminder action..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  
                />
                <input 
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  
                />
                <button 
                  onClick={handleAddTask}
                  
                >
                  Schedule Actions
                </button>
              </div>

              {/* Tasks Checklist Grid */}
              <div >
                {dealTasks.length === 0 ? (
                  <p >No scheduling tasks recorded. Keep track of customer SLAs.</p>
                ) : (
                  dealTasks.map((task) => (
                    <div key={task.id} >
                      <div >
                        <input 
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => handleToggleTask(task)}
                          
                        />
                        <span >
                          {task.title}
                        </span>
                      </div>
                      
                      <div >
                        <Calendar  />
                        <span>SLA: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. ACTIVITY TIMELINE CHRONOLOGY LOGS */}
            <div >
              <h4 >
                <Activity  />
                Chronological Journey Activity Logs
              </h4>

              {/* Add Note text element */}
              <div >
                <textarea
                  placeholder="Log manual notes, email triggers, or custom calls notes..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  
                />
                <div >
                  <button 
                    onClick={handleAddNote}
                    
                  >
                    Log Negotiating Note
                  </button>
                </div>
              </div>

              {/* Timeline Items */}
              <div >
                {dealActivities.length === 0 ? (
                  <p >Timeline empty. Change stage or write notes above.</p>
                ) : (
                  dealActivities.map((act) => (
                    <div key={act.id} >
                      {/* Anchor Timeline Ring */}
                      <span  />
                      
                      <div >
                        <span>{act.title}</span>
                        <span >{new Date(act.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p >{act.description}</p>
                      <div >
                        <User  />
                        Logged by: {act.agentName}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            </div>
            )}

          </div>
        </div>
      )}

      {/* ADD CUSTOM PIPELINE COLUMN MODAL */}
      {showAddColumnModal && (
        <div >
          <div >
            <div >
              <h3 >
                <Plus  />
                Add Custom Pipeline Stage
              </h3>
              <button onClick={() => setShowAddColumnModal(false)} >
                <X  />
              </button>
            </div>

            <div >
              <div >
                <label >Stage/Column Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Beta tester, Qualified Lead..."
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  
                />
              </div>

              <div >
                <label >Theme Color</label>
                <div >
                  {[
                    { hex: "#ff7043", label: "Orange" },
                    { hex: "#ffb300", label: "Yellow" },
                    { hex: "#26a69a", label: "Teal" },
                    { hex: "#42a5f5", label: "Blue" },
                    { hex: "#7e57c2", label: "Indigo" },
                    { hex: "#ec407a", label: "Pink" },
                    { hex: "#546e7a", label: "Slate" }
                  ].map((colorObj) => (
                    <button
                      key={colorObj.hex}
                      type="button"
                      onClick={() => setNewColumnColor(colorObj.hex)}
                      
                      style={{ backgroundColor: colorObj.hex }}
                      title={colorObj.label}
                    />
                  ))}
                </div>
                <div >
                  <span >Custom Hex:</span>
                  <input
                    type="text"
                    value={newColumnColor}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    
                  />
                </div>
              </div>

              <div >
                <div >
                  <label >SLA Days Limit</label>
                  <input 
                    type="number"
                    min="1"
                    value={newColumnSlaDays}
                    onChange={(e) => setNewColumnSlaDays(Number(e.target.value))}
                    
                  />
                </div>
                
                <div >
                  <label >Close Probability (%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={newColumnProbability}
                    onChange={(e) => setNewColumnProbability(Number(e.target.value))}
                    
                  />
                </div>
              </div>
            </div>

            <div >
              <button 
                onClick={() => setShowAddColumnModal(false)}
                
              >
                Cancel
              </button>
              <button 
                onClick={handleAddPipelineColumn}
                
              >
                <Plus  />
                Create Column
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM NEW DEAL CREATION MODAL */}
      {showAddDealModal && (
        <div >
          <div >
            <div >
              <h3 >
                <Briefcase  />
                Initialize Journey Deal
              </h3>
              <button onClick={() => setShowAddDealModal(false)} >
                <X  />
              </button>
            </div>

            <div >
              <div >
                <label >Deal Action Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Enterprise Outreach Expansion Bundle"
                  value={newDealTitle}
                  onChange={(e) => setNewDealTitle(e.target.value)}
                  
                />
              </div>

              <div >
                <div >
                  <label >Associated Lead Target</label>
                  <select 
                    value={newDealLeadId}
                    onChange={(e) => setNewDealLeadId(e.target.value)}
                    
                  >
                    <option value="">Select Target...</option>
                    {initialLeads.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
                    ))}
                  </select>
                </div>

                <div >
                  <label >Deal Value Volume ($)</label>
                  <input 
                    type="number"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(Number(e.target.value))}
                    
                  />
                </div>
              </div>

              <div >
                <div >
                  <label >Pipeline Stage Target</label>
                  <select 
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value)}
                    
                  >
                    {activePipeline?.stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div >
                  <label >Assigned Client Agent</label>
                  <select 
                    value={newDealAgent}
                    onChange={(e) => setNewDealAgent(e.target.value)}
                    
                  >
                    <option value="Sarah Mitchell">Sarah Mitchell</option>
                    <option value="James Ochieng">James Ochieng</option>
                    <option value="User Pro">User Pro</option>
                  </select>
                </div>
              </div>

              <div >
                <label >Tags Config (comma separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. Enterprise, High-Value, SaaS"
                  value={newDealTags}
                  onChange={(e) => setNewDealTags(e.target.value)}
                  
                />
              </div>
            </div>

            <div >
              <button 
                onClick={() => setShowAddDealModal(false)}
                
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateDeal}
                
              >
                Initialize Target Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DUPLICATE MERGING DEDUPLICATION TOOL DIALOG (TASK 4) */}
      {showMergeModal && duplicateConflicts && (
        <div >
          <div >
            <div >
              <h3 >
                <ShieldAlert  />
                Deduplication Lead Resolution Gate
              </h3>
              <button onClick={() => setShowMergeModal(false)} >
                <X  />
              </button>
            </div>

            <div >
              We identified dual duplicates conflicts mismatch records on work email or phone context pairings and companies similarities:
              <span >Match Target ID: {duplicateConflicts.leadA.email}</span>
            </div>

            {/* Side-by-Side Values */}
            <div >
              <div >
                <div >Primary Duplicate Target</div>
                <div><span >Full name</span> <span >{duplicateConflicts.leadA.name}</span></div>
                <div><span >Role Title</span> <span >{duplicateConflicts.leadA.role}</span></div>
                <div><span >Phone link</span> <span >{duplicateConflicts.leadA.phone || "No phone link"}</span></div>
                <div><span >LinkedIn</span> <span >{duplicateConflicts.leadA.linkedin_url || "No link"}</span></div>
                <div><span >Country</span> <span >{duplicateConflicts.leadA.country || "N/A"}</span></div>
              </div>

              <div >
                <div >Conflicting Duplicate Target</div>
                <div><span >Full name</span> <span >{duplicateConflicts.leadB.name}</span></div>
                <div><span >Role Title</span> <span >{duplicateConflicts.leadB.role}</span></div>
                <div><span >Phone link</span> <span >{duplicateConflicts.leadB.phone || "No phone link"}</span></div>
                <div><span >LinkedIn</span> <span >{duplicateConflicts.leadB.linkedin_url || "No link"}</span></div>
                <div><span >Country</span> <span >{duplicateConflicts.leadB.country || "N/A"}</span></div>
              </div>
            </div>

            {/* Merge options */}
            <div >
              <div >Choose Field-Level Merging Override:</div>
              <div >
                <button
                  onClick={() => handleResolveMerge(duplicateConflicts.leadA.id, duplicateConflicts.leadB.id, {
                    role: duplicateConflicts.leadA.role || duplicateConflicts.leadB.role,
                    phone: duplicateConflicts.leadA.phone || duplicateConflicts.leadB.phone,
                    linkedin_url: duplicateConflicts.leadA.linkedin_url || duplicateConflicts.leadB.linkedin_url,
                    country: duplicateConflicts.leadA.country || duplicateConflicts.leadB.country
                  })}
                  
                >
                  <span >Retain Target A Value</span>
                  <span >Resolves and combines records, prioritizing Lead A metadata.</span>
                </button>

                <button
                  onClick={() => handleResolveMerge(duplicateConflicts.leadA.id, duplicateConflicts.leadB.id, {
                    role: duplicateConflicts.leadB.role || duplicateConflicts.leadA.role,
                    phone: duplicateConflicts.leadB.phone || duplicateConflicts.leadA.phone,
                    linkedin_url: duplicateConflicts.leadB.linkedin_url || duplicateConflicts.leadA.linkedin_url,
                    country: duplicateConflicts.leadB.country || duplicateConflicts.leadA.country
                  })}
                  
                >
                  <span >Retain Target B Value</span>
                  <span >Resolves and combines records, prioritizing Lead B metadata.</span>
                </button>
              </div>
            </div>

            <div >
              <button 
                onClick={() => setShowMergeModal(false)}
                
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
