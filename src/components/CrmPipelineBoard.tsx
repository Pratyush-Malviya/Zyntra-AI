import React, { useState, useEffect } from "react";
import { 
  Kanban, List, Plus, Search, Filter, RefreshCw, Sparkles, AlertCircle, 
  MapPin, Clock, Calendar, Briefcase, User, UserCheck, Tag, Trash2, 
  CheckCircle, ChevronRight, Activity, FileText, Check, MoreVertical, 
  ArrowRight, ShieldAlert, BarChart3, Mail, Phone, Users, History, TrendingUp, X
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "motion/react";

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
  const [showTeamActivityWidget, setShowTeamActivityWidget] = useState<boolean>(false);
  
  // UI Panels
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [selectedLeadsForBulk, setSelectedLeadsForBulk] = useState<string[]>([]);
  const [bulkDealValue, setBulkDealValue] = useState<number>(35000);
  const [bulkStage, setBulkStage] = useState<string>("stage-discovery");
  const [bulkAgent, setBulkAgent] = useState<string>("Sarah Mitchell");
  const [bulkStatus, setBulkStatus] = useState<"hot" | "warm" | "cold">("warm");
  const [bulkTags, setBulkTags] = useState<string>("Bulk, Core Prospect");
  const [isBulkImporting, setIsBulkImporting] = useState<boolean>(false);
  
  // Creation Forms
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealValue, setNewDealValue] = useState(25000);
  const [newDealLeadId, setNewDealLeadId] = useState("");
  const [newDealAgent, setNewDealAgent] = useState("Sarah Mitchell");
  const [newDealStage, setNewDealStage] = useState("");
  const [newDealTags, setNewDealTags] = useState("");

  // Quick Action State
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newNoteText, setNewNoteText] = useState("");

  // Deduplication Duplicate Matches List
  const [duplicateConflicts, setDuplicateConflicts] = useState<{ leadA: Lead; leadB: Lead; fieldConflicts: string[] } | null>(null);

  // Load preferences, pipelines, and deals
  const refreshDbState = async () => {
    try {
      // 1. Fetch preferred views
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

  // Drag handlers
  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("text/plain", dealId);
    setDraggingDealId(dealId);
  };

  const handleDragEnd = () => {
    setDraggingDealId(null);
    setDragOverStageId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDraggingDealId(null);
    setDragOverStageId(null);
    const dealId = e.dataTransfer.getData("text/plain");
    const draggedDeal = deals.find(d => d.id === dealId);
    
    if (draggedDeal && draggedDeal.stage !== targetStageId) {
      // Optimistic physical update for ultra fast UI feel
      const updatedDeals = deals.map(d => d.id === dealId ? { ...d, stage: targetStageId } : d);
      setDeals(updatedDeals);

      try {
        const res = await fetch(`/api/deals/${dealId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: targetStageId, agentName: draggedDeal.assignedAgent || "Workspace Agent" })
        });
        
        if (res.ok) {
          showToast(`Deal stage promoted to "${targetStageId}" Successfully!`, "success");
          if (onLeadsUpdated) onLeadsUpdated();
          refreshDbState();
        } else {
          showToast("Failed to promote deal to target stage.", "error");
          refreshDbState();
        }
      } catch (err) {
        showToast("Communication loss updating deal stage.", "error");
        refreshDbState();
      }
    }
  };

  // Select deal to reveal drawer attributes
  const selectActiveDeal = async (deal: Deal) => {
    setSelectedDeal(deal);
    setNewNoteText("");
    setNewTaskTitle("");
    
    try {
      // Fetch tasks checklist
      const taskRes = await fetch("/api/tasks");
      if (taskRes.ok) {
        const allTasks: Task[] = await taskRes.json();
        setDealTasks(allTasks.filter(t => t.dealId === deal.id));
      }

      // Fetch timeline logs
      const actRes = await fetch("/api/activities");
      if (actRes.ok) {
        const allActs: ActivityLog[] = await actRes.json();
        setDealActivities(allActs.filter(a => a.dealId === deal.id));
      }

      // Fetch Claude intelligence closing reports
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
        const tRes = await fetch("/api/tasks");
        if (tRes.ok) {
          const allTasks = await tRes.json();
          setDealTasks(allTasks.filter((t: any) => t.dealId === selectedDeal.id));
        }
      }
    } catch (err) {
      showToast("Cannot initialize task follow-up.", "error");
    }
  };

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

  const checkForDuplicates = () => {
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
          if (a.score !== b.score) conflicts.push("score");

          setDuplicateConflicts({ leadA: a, leadB: b, fieldConflicts: conflicts });
          setShowMergeModal(true);
          return;
        }
      }
    }
    showToast("No unresolved lead duplicates or contact anomalies detected.", "info");
  };

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
        showToast("Duplicate leads combined! Conflicts resolved in-place.", "success");
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

  const handlePopulateDemoData = async () => {
    try {
      const demoDeals = [
        { title: "NetApp Secure Cloud Transformation Upgrade", company: "NetApp Inc.", value: 125000, stage: "stage-discovery", agent: "Sarah Mitchell", status: "hot", tags: ["Enterprise", "Cloud"] },
        { title: "Retool Data Workflow Automation Consult", company: "Retool Inc", value: 35000, stage: "stage-proposal", agent: "James Ochieng", status: "warm", tags: ["SaaS", "Consulting"] },
        { title: "Stripe Unified Payment API Implementation", company: "Stripe", value: 195000, stage: "stage-negotiation", agent: "Sarah Mitchell", status: "hot", tags: ["High-Value", "FinTech"] },
        { title: "Slack Conversational Agent licenses", company: "Slack Technologies", value: 18000, stage: "stage-discovery", agent: "User Pro", status: "cold", tags: ["SaaS", "Internal"] },
        { title: "Canva Design Seat Bundle Onboarding", company: "Canva Pro", value: 48000, stage: "stage-won", agent: "James Ochieng", status: "warm", tags: ["Creative", "B2B"] },
        { title: "Snowflake Enterprise Analytics Warehouse Integration", company: "Snowflake Corp", value: 220000, stage: "stage-proposal", agent: "Sarah Mitchell", status: "hot", tags: ["Enterprise", "Data"] }
      ];

      let createdCount = 0;

      for (const d of demoDeals) {
        // Find if we can link it to an existing lead, or use standard options
        const matchingLead = initialLeads.find(l => l.company && l.company.toLowerCase().includes(d.company.split(" ")[0].toLowerCase())) || initialLeads[Math.floor(Math.random() * initialLeads.length)];
        
        const leadId = matchingLead?.id || "lead-default";

        const res = await fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: d.title,
            value: Number(d.value),
            leadId: leadId,
            stage: d.stage,
            assignedAgent: d.agent,
            tags: d.tags
          })
        });

        if (res.ok) {
          const newD = await res.json();
          createdCount++;

          // Update status health (hot, warm, etc.)
          await fetch(`/api/deals/${newD.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...newD,
              status: d.status
            })
          });

          // Seed timeline activities
          await fetch("/api/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dealId: newD.id,
              type: "stage_change",
              title: "Opportunity Segment Seeding",
              description: `Generated premium realistic demo tracker for "${d.title}" with default close ratios.`,
              agentName: d.agent
            })
          });

          // Seed dynamic checklist item
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dealId: newD.id,
              title: "🚀 Align with VP of Architecture regarding performance specs",
              dueDate: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split("T")[0],
              completed: false,
              assignedAgent: d.agent
            })
          });
        }
      }

      showToast(`Successfully populated ${createdCount} top-notch demo deals on your Active Kanban Board!`, "success");
      refreshDbState();
    } catch {
      showToast("Could not synthesize demo pipeline data.", "error");
    }
  };

  const handleBulkImportLeads = async () => {
    if (selectedLeadsForBulk.length === 0) {
      showToast("Select at least one high-value lead checkbox to proceed.", "error");
      return;
    }

    setIsBulkImporting(true);
    let successCount = 0;

    try {
      for (const leadId of selectedLeadsForBulk) {
        const lead = initialLeads.find(l => l.id === leadId);
        if (!lead) continue;

        const dealTitle = `${lead.company || lead.name} Strategic Expansion Account`;

        const res = await fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: dealTitle,
            value: Number(bulkDealValue),
            leadId: lead.id,
            stage: bulkStage || activePipeline?.stages[0].id || "stage-discovery",
            assignedAgent: bulkAgent,
            tags: bulkTags ? bulkTags.split(",").map(t => t.trim()) : ["Bulk-Converted"]
          })
        });

        if (res.ok) {
          const newD = await res.json();
          successCount++;

          // Update status
          await fetch(`/api/deals/${newD.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...newD,
              status: bulkStatus
            })
          });

          // Write activity
          await fetch("/api/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dealId: newD.id,
              type: "stage_change",
              title: "Bulk Deal Initialized",
              description: `Batch-converted lead "${lead.name}" (@${lead.company || "N/A"}) into a live Kanban journey opportunity tracker.`,
              agentName: bulkAgent
            })
          });

          // Create standard SLA task
          await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              dealId: newD.id,
              title: `📅 Dispatch Initial Discovery Message Alignment Checklist`,
              dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split("T")[0],
              completed: false,
              assignedAgent: bulkAgent
            })
          });
        }
      }

      showToast(`Conversion complete! ${successCount} leads are now active journey opportunities.`, "success");
      setSelectedLeadsForBulk([]);
      setShowBulkImportModal(false);
      refreshDbState();
    } catch {
      showToast("Error occurred during bulk lead import.", "error");
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleCreateDeal = async () => {
    if (!newDealTitle || !newDealLeadId || !newDealValue) {
      showToast("Please input a Deal Title, associate with a target Lead, and specify Deal Value.", "error");
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

  const handleDeleteDeal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently revoke this deal segment?")) return;
    try {
      const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Deal path revoked successfully.", "info");
        setSelectedDeal(null);
        refreshDbState();
      }
    } catch {
      showToast("Failed to revoke deal path.", "error");
    }
  };

  const filteredDeals = deals.filter(deal => {
    // Multi-Pipeline Filter Support: only show deals in stages of the current active pipeline
    const pipelineStageIds = activePipeline?.stages.map(s => s.id) || [];
    const isInPipeline = pipelineStageIds.includes(deal.stage);
    if (!isInPipeline) return false;

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

  const getHealthBadge = (health: string | undefined) => {
    switch(health) {
      case "hot":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold text-[9px] shadow-xs">🔥 Hot Close</span>;
      case "warm":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold text-[9px] shadow-xs">⚡ Warm Play</span>;
      case "cold":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold text-[9px] shadow-xs">❄️ Cold Strobe</span>;
      case "lost":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/30 font-bold text-[9px] shadow-xs font-mono">💨 Closed Lost</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00d4aa]/15 text-[#00d4aa] border border-[#00d4aa]/30 font-bold text-[9px] shadow-xs font-mono animate-pulse">⚡ Auto Assess</span>;
    }
  };

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

  const getAiNextBestAction = (deal: Deal) => {
    if (deal.stage.includes("discovery") || deal.stage.includes("kickoff") || deal.stage.includes("triage")) {
      return "📅 Arrange Initial Call & Needs Discovery Blueprint";
    }
    if (deal.stage.includes("proposal") || deal.stage.includes("integration") || deal.stage.includes("investigate")) {
      return "📝 Share Custom Specs Estimate & Proposal";
    }
    if (deal.stage.includes("negotiation") || deal.stage.includes("training") || deal.stage.includes("hotfix")) {
      return "🔑 SLA/Deal Terms Review With Key Stakeholders";
    }
    if (deal.stage.includes("won") || deal.stage.includes("active") || deal.stage.includes("qa") || deal.stage.includes("success")) {
      return "🚀 Post-sale Onboarding Sync Call Scheduled";
    }
    return "⚡ Conduct Comprehensive Pipeline Calibration Review";
  };

  const chartData = getChartData();
  const totalDealVolume = filteredDeals.reduce((sum, d) => sum + d.value, 0);

  // Compute probability-weighted predictive expected revenue (AI Forecast value)
  const expectedForecastVolume = filteredDeals.reduce((sum, d) => {
    const stage = activePipeline?.stages.find(s => s.id === d.stage);
    const probPct = stage ? stage.probability : 20;
    return sum + (d.value * (probPct / 100));
  }, 0);

  // Count active hazards (SLA breaches + simulated Ghosting risks i.e. 4+ days duration)
  const getHazardsCount = () => {
    let count = 0;
    filteredDeals.forEach(d => {
      const stage = activePipeline?.stages.find(s => s.id === d.stage);
      if (stage) {
        const daysInfo = getDaysInStage(d, stage);
        const isSlaBreached = stage.slaDays > 0 && daysInfo.days > stage.slaDays;
        const isGhosted = daysInfo.days >= 4; // flag simulated ghosted if 4 days with no action
        if (isSlaBreached || isGhosted) count++;
      }
    });
    return count;
  };

  const hazardsCount = getHazardsCount();

  return (
    <div className="space-y-6">
      {/* 1. Header Information Section and Quick KPI Stats Widget */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border/40 pb-6">
        <div className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest text-[#00d4aa] bg-[#00d4aa]/10 rounded-full border border-[#00d4aa]/20">
              AI Intelligent Kanban Board
            </span>
            <div className="flex items-center gap-1 text-[#00d4aa]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Predictive Revenue Intelligence</span>
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-syne flex items-center gap-2.5">
            <Kanban className="w-6 h-6 text-[#00d4aa]" />
            Deal Journeys & Kanban Pipelines
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Manage your sales stages, track work-in-progress (WIP) thresholds, visualize velocity bottlenecks, and automate predictive forecasting algorithms.
          </p>
        </div>

        {/* 3 Core CRM Stats Mini KPI Cards (AI Weighted Expected Revenue & Ghosting/SLA Alerts) */}
        <div className="flex flex-wrap items-center gap-4 text-left">
          <div className="bg-surface border border-border/80 rounded-2xl p-3.5 px-5 min-w-[130px] relative overflow-hidden group">
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block font-mono">Absolute Volume</span>
            <span className="text-lg font-syne font-extrabold text-[#00d4aa] mt-1 block">
              ${totalDealVolume.toLocaleString()}
            </span>
            <span className="text-[8px] text-text-muted font-mono">{filteredDeals.length} opportunity items</span>
          </div>

          <div className="bg-surface border border-[#00d4aa]/30 rounded-2xl p-3.5 px-5 min-w-[155px] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#00d4aa]/5 rounded-full filter blur-md" />
            <span className="text-[9px] text-[#00d4aa] font-black uppercase tracking-widest block font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#00d4aa] animate-pulse" />
              AI Expected revenue
            </span>
            <span className="text-lg font-syne font-extrabold text-white mt-1 block">
              ${Math.round(expectedForecastVolume).toLocaleString()}
            </span>
            <span className="text-[8.5px] text-text-muted font-mono">Stage probability weighted</span>
          </div>

          <div className="bg-surface border border-border/80 rounded-2xl p-3.5 px-5 min-w-[130px] relative overflow-hidden group">
            <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block font-mono">Hazards & SLA Risks</span>
            <span className={`text-lg font-syne font-extrabold mt-1 block ${hazardsCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {hazardsCount} Active
            </span>
            <span className="text-[8px] text-text-muted font-mono">SLA delays & ghosting flags</span>
          </div>
        </div>
      </div>

      {/* 2. Unified Master Action Toolbar with Premium Styling */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4.5 bg-surface border border-border rounded-3xl glow-brand/5">
        
        {/* Left Search input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Search deals, contacts or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-alt border border-border rounded-xl py-2 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-text-muted outline-none focus:border-[#00d4aa] focus:bg-[#07080c] transition-all"
          />
        </div>

        {/* Filters and View Controllers Row */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto md:justify-end">
          
          {/* Active Workflow Pipeline Selector (Supports Sales, Support, Onboarding flows in the visual layout) */}
          <select 
            value={activePipeline?.id || ""}
            onChange={(e) => {
              const selected = pipelinesList.find(p => p.id === e.target.value);
              if (selected) {
                setActivePipeline(selected);
                showToast(`Switched pipeline schema to: ${selected.name}`, "info");
              }
            }}
            className="bg-surface-alt border border-[#00d4aa]/30 text-xs text-[#00d4aa] rounded-xl py-2 px-3 font-bold outline-none focus:border-[#00d4aa] transition-all cursor-pointer min-w-[185px]"
          >
            {pipelinesList.map(p => (
              <option key={p.id} value={p.id}>Pipeline: {p.name}</option>
            ))}
          </select>

          <select 
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="bg-surface-alt border border-border text-xs text-text-muted rounded-xl py-2 px-3 font-semibold outline-none focus:border-[#00d4aa] transition-all cursor-pointer min-w-[120px]"
          >
            <option value="all">Tags: All</option>
            <option value="Enterprise">Enterprise</option>
            <option value="SaaS">SaaS</option>
            <option value="High-Value">High-Value</option>
            <option value="B2B">B2B</option>
            <option value="Recruiting">Recruiting</option>
          </select>

          <select 
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            className="bg-surface-alt border border-border text-xs text-text-muted rounded-xl py-2 px-3 font-semibold outline-none focus:border-[#00d4aa] transition-all cursor-pointer min-w-[130px]"
          >
            <option value="all">Agent: All</option>
            <option value="Sarah Mitchell">Sarah Mitchell</option>
            <option value="James Ochieng">James Ochieng</option>
            <option value="User Pro">User Pro</option>
          </select>

          <div className="w-[1px] h-6 bg-border mx-1.5 hidden lg:block" />

          {/* Action triggers */}
          <button 
            onClick={checkForDuplicates}
            className="px-3 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Locate contact conflicts"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            De-Duplicate Leads
          </button>

          <button 
            onClick={() => setShowTeamActivityWidget(!showTeamActivityWidget)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showTeamActivityWidget 
                ? "border-emerald-500/30 bg-emerald-500/20 text-[#10b981]" 
                : "border-border bg-surface-alt text-text-muted hover:text-white hover:border-border-subtle"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Activity Chart
          </button>

          {viewType === "kanban" && (
            <button 
              onClick={() => setSwimlaneMode(!swimlaneMode)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                swimlaneMode 
                  ? "border-[#00d4aa]/30 bg-[#00d4aa]/20 text-[#00d4aa]" 
                  : "border-border bg-surface-alt text-text-muted hover:text-white hover:border-border-subtle"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              {swimlaneMode ? "Swimlanes ON" : "Swimlanes OFF"}
            </button>
          )}

          <div className="flex items-center bg-surface-alt p-1 rounded-xl border border-border">
            <button
              onClick={() => toggleViewPreference("kanban")}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold cursor-pointer ${
                viewType === "kanban" ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => toggleViewPreference("list")}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold cursor-pointer ${
                viewType === "list" ? "bg-white/10 text-white" : "text-text-muted hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Grid
            </button>
          </div>

          <button 
            onClick={handlePopulateDemoData}
            className="px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Generate 6 premium, realistic pipeline deals automatically for testing"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Seed Demo Deals
          </button>

          <button 
            onClick={() => {
              // Pre-select all available leads that don't have deals.
              const leadsWithDeals = deals.map(d => d.leadId);
              const eligible = initialLeads.filter(l => !leadsWithDeals.includes(l.id)).map(l => l.id);
              setSelectedLeadsForBulk(eligible);
              setShowBulkImportModal(true);
            }}
            className="px-3 py-2 rounded-xl border border-[#00d4aa]/30 bg-[#00d4aa]/10 hover:bg-[#00d4aa] hover:text-slate-950 text-[#00d4aa] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Convert multiple raw system leads info to live Kanban deal stages at once"
          >
            <Users className="w-3.5 h-3.5" />
            Bulk Convert Leads
          </button>

          <button 
            onClick={() => {
              setNewDealStage(activePipeline?.stages[0].id || "");
              setShowAddDealModal(true);
            }}
            className="px-4 py-2 bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_4px_16px_rgba(0,212,170,0.2)] ml-1"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            Create Deal
          </button>
        </div>
      </div>

      {/* 3. Interactive Team Activity Chart Panel */}
      <AnimatePresence>
        {showTeamActivityWidget && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface border border-border rounded-3xl p-5 space-y-4 overflow-hidden relative"
          >
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-[#00d4aa]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-white">Representative Journey Staging Velocity</h3>
              </div>
              <span className="text-[10px] text-text-muted bg-surface-alt border border-border px-2.5 py-0.5 rounded-md font-mono font-bold">
                Total moves: {chartData.reduce((sum, d) => sum + d.moves, 0)} (Last 30d)
              </span>
            </div>

            {chartData.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted italic bg-surface-alt/40 rounded-2xl border border-dashed border-border/80">
                No pipeline advancements logged by workspace team over the last month. Promote deals between columns to record logs!
              </div>
            ) : (
              <div className="h-44 w-full pr-4 text-xs font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barFlowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "var(--border)", borderRadius: "12px", color: "white", fontSize: "11px" }}
                      itemStyle={{ color: "#00d4aa", fontSize: "11px" }}
                      labelStyle={{ color: "white", fontSize: "11px", fontWeight: "bold" }}
                    />
                    <Bar dataKey="moves" fill="url(#barFlowGradient)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Kanban Pipeline Segment vs List Grid switcher */}
      {viewType === "kanban" ? (
        swimlaneMode ? (
          /* SWIMLANE ROW GRID (BETTER CATEGORIZED VIEW) */
          <div className="space-y-6 text-left">
            {(() => {
              const swimlanes = [
                { key: "hot", label: "Hot Close Priorities", colorClass: "text-rose-400", bgClass: "bg-surface-alt/70 border border-border/80 shadow-[0_4px_16px_rgba(244,63,94,0.03)]", icon: "🔥" },
                { key: "warm", label: "Active Nurturing Plays", colorClass: "text-amber-400", bgClass: "bg-surface-alt/70 border border-border/80 shadow-[0_4px_16px_rgba(245,158,11,0.03)]", icon: "⚡" },
                { key: "cold", label: "Cold & Static Accounts", colorClass: "text-slate-400", bgClass: "bg-surface-alt/30 border border-border/40", icon: "❄️" }
              ];

              return (
                <div className="space-y-8 w-full">
                  {swimlanes.map((lane) => {
                    const laneDeals = filteredDeals.filter(d => {
                      if (lane.key === "hot") return d.status === "hot";
                      if (lane.key === "warm") return d.status === "warm";
                      return d.status === "cold" || d.status === "lost" || !d.status;
                    });

                    const totalValue = laneDeals.reduce((sum, d) => sum + d.value, 0);

                    return (
                      <div key={lane.key} className={`rounded-3xl p-5 ${lane.bgClass} space-y-4`}>
                        {/* Swimlane Column Header block */}
                        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base select-none">{lane.icon}</span>
                            <h3 className={`text-xs font-extrabold font-mono tracking-widest uppercase ${lane.colorClass}`}>
                              {lane.label}
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface/80 text-text-muted border border-border font-bold font-mono">
                              {laneDeals.length} Deals
                            </span>
                          </div>
                          <span className="text-xs text-emerald-400 font-mono font-bold">
                            Total volume: ${totalValue.toLocaleString()}
                          </span>
                        </div>

                        {/* Staged Columns layout inside row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-2">
                          {activePipeline?.stages.map((stage) => {
                            const stageLaneDeals = laneDeals.filter(d => d.stage === stage.id);
                            const cumulativeStageValue = stageLaneDeals.reduce((sum, d) => sum + d.value, 0);
                            const isOver = dragOverStageId === stage.id;

                            return (
                              <div 
                                key={stage.id}
                                onDragOver={(e) => handleDragOver(e, stage.id)}
                                onDragLeave={() => setDragOverStageId(null)}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => handleDrop(e, stage.id)}
                                className={`flex flex-col rounded-2xl min-h-[160px] relative transition-all duration-200 p-3.5 ${
                                  isOver 
                                    ? "bg-[#00d4aa]/5 border-2 border-dashed border-[#00d4aa]/75 scale-[1.01] shadow-[inset_0_0_12px_rgba(0,212,170,0.15)]" 
                                    : "bg-surface/50 border border-border/60 hover:bg-surface/80"
                                }`}
                              >
                                {/* Stage segment name inside Lane */}
                                <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-3">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider truncate" title={stage.name}>
                                      {stage.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {stageLaneDeals.length > 2 && (
                                      <span className="text-[7.5px] px-1 py-0.2 rounded bg-rose-500/10 border border-rose-500/35 text-rose-400 font-extrabold font-mono" title="Stage Overloaded (Cap: 2)">
                                        ⚠️ WIP
                                      </span>
                                    )}
                                    <span className="text-[9px] font-mono font-bold text-[#00d4aa]">
                                      ${cumulativeStageValue.toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {/* Items Container */}
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 select-none flex-1">
                                  {stageLaneDeals.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-2 border border-dashed border-border/40 rounded-xl bg-surface-alt/10">
                                      <span className="text-[8px] text-text-muted font-bold font-mono uppercase tracking-wider">Empty</span>
                                    </div>
                                  ) : (
                                    stageLaneDeals.map((deal) => {
                                      const associatedLead = initialLeads.find(l => l.id === deal.leadId);
                                      const daysInfo = getDaysInStage(deal, stage);
                                      const isSlaBreached = stage.slaDays > 0 && daysInfo.days > stage.slaDays;
                                      const isGhosted = daysInfo.days >= 4;
                                      const isDraggingThis = draggingDealId === deal.id;
                                      
                                      // Left indicator tag color based on deal health status
                                      const leftBorderColor = 
                                        deal.status === "hot" ? "border-l-[3.5px] border-l-[#00d4aa]" :
                                        deal.status === "warm" ? "border-l-[3.5px] border-l-amber-500" :
                                        deal.status === "cold" ? "border-l-[3.5px] border-l-blue-500" :
                                        "border-l-[3.5px] border-l-slate-600";

                                      return (
                                        <div
                                          key={deal.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, deal.id)}
                                          onDragEnd={handleDragEnd}
                                          onClick={() => selectActiveDeal(deal)}
                                          className={`group relative p-3 rounded-xl border cursor-grab active:cursor-grabbing text-left space-y-2 transition-all duration-200 select-none ${leftBorderColor} ${
                                            selectedDeal?.id === deal.id 
                                              ? "border-[#00d4aa] bg-[#0c0d12] shadow-[0_4px_20px_rgba(0,212,170,0.15)] ring-1 ring-[#00d4aa]/30" 
                                              : "border-border bg-[#090a0f] hover:border-text-muted hover:bg-surface-alt/75 hover:translate-y-[-1.5px]"
                                          } ${isDraggingThis ? "opacity-35 border-dashed border-slate-500 scale-95" : ""}`}
                                        >
                                          {isSlaBreached && (
                                            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg p-1.5 flex items-center gap-1 text-[8px] leading-tight font-extrabold font-mono">
                                              <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                              <span>SLA BREACH ({daysInfo.days}d)</span>
                                            </div>
                                          )}

                                          {isGhosted && (
                                            <div className="bg-amber-500/10 border border-amber-500/25 text-[#f59e0b] rounded-lg p-1 text-[7.5px] font-bold font-mono tracking-wide flex items-center justify-center gap-1">
                                              <span className="animate-pulse">⚠️</span>
                                              <span>Ghosting Risk (no timeline activity)</span>
                                            </div>
                                          )}

                                          <div className="flex items-start justify-between gap-1">
                                            <h5 className="text-[10.5px] font-bold text-white group-hover:text-[#00d4aa] transition-colors truncate tracking-tight leading-snug" title={deal.title}>
                                              {deal.title}
                                            </h5>
                                            <button 
                                              onClick={(e) => handleDeleteDeal(deal.id, e)}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-500 text-text-muted transition-all rounded shadow-sm"
                                              title="Delete deal"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>

                                          {/* Custom Lead Organization Info Box with letter avatar */}
                                          <div className="flex items-center gap-1.5 min-w-0 bg-[#0f111a] p-1.5 rounded-lg border border-border/40">
                                            <div className="w-4.5 h-4.5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono text-[8.5px] uppercase font-bold shrink-0 border border-border">
                                              {associatedLead?.company ? associatedLead.company[0] : (associatedLead?.name ? associatedLead.name[0] : "L")}
                                            </div>
                                            <div className="truncate text-left leading-tight">
                                              <span className="font-extrabold text-[#edf2f7] block truncate text-[9px]">{associatedLead?.name || "Unassigned Lead"}</span>
                                              <span className="text-[7.5px] text-text-muted block truncate font-mono">@{associatedLead?.company || "N/A"}</span>
                                            </div>
                                          </div>

                                          {/* AI Copilot Suggestion Pill */}
                                          <div className="bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/12 rounded-lg p-1.5 space-y-0.5 text-left text-[8px] text-blue-350 transition-colors">
                                            <div className="flex items-center gap-1 font-mono uppercase tracking-wider font-extrabold text-blue-400">
                                              <Sparkles className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                                              <span>AI Smart Step:</span>
                                            </div>
                                            <p className="font-medium text-slate-300 leading-snug line-clamp-2">{getAiNextBestAction(deal)}</p>
                                          </div>

                                          {/* Footer: Value and Custom Rating Indicator */}
                                          <div className="flex items-center justify-between border-t border-border/30 pt-1.5 text-[9px] font-mono">
                                            <span className="font-extrabold text-emerald-400">${deal.value.toLocaleString()}</span>
                                            <div className="flex items-center gap-1.5">
                                              {/* Rating Gauge */}
                                              <div className="flex items-center gap-1 scale-[0.95] origin-right">
                                                <div className="w-6 h-1 bg-slate-800 rounded-full overflow-hidden shrink-0">
                                                  <div className="h-full bg-[#00d4aa]" style={{ width: `${associatedLead?.score || 85}%` }} />
                                                </div>
                                                <span className="text-[7.5px] font-bold text-slate-400 font-mono">
                                                  {associatedLead?.score || 85}%
                                                </span>
                                              </div>
                                              {getHealthBadge(deal.status)}
                                            </div>
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
          /* STANDARD VERTICAL COLUMNS KANBAN VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 overflow-x-auto pb-4">
            {activePipeline?.stages.map((stage) => {
              const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
              const cumulativeValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

              return (
                <div 
                  key={stage.id}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={() => setDragOverStageId(null)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`flex flex-col rounded-3xl min-h-[500px] h-[520px] transition-all duration-300 p-4 ${
                    dragOverStageId === stage.id 
                      ? "bg-[#00d4aa]/5 border-2 border-dashed border-[#00d4aa]/70 scale-[1.015] shadow-[0_8px_32px_rgba(0,212,170,0.06)] ring-2 ring-[#00d4aa]/15" 
                      : "bg-surface border border-border"
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                      <h4 className="text-xs font-extrabold text-white truncate uppercase tracking-widest font-mono" title={stage.name}>
                        {stage.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 shink-0">
                      {stageDeals.length > 3 && (
                        <span className="text-[8px] px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/40 text-rose-400 font-bold font-mono tracking-tight animate-pulse" title="Stage Work-In-Progress Threshold Exceeded (Cap: 3)">
                          ⚠️ WIP
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold ${stageDeals.length > 3 ? "border-rose-500/50 text-rose-400 bg-rose-500/5" : "bg-surface-alt border border-border text-white"}`}>
                        {stageDeals.length}
                      </span>
                    </div>
                  </div>

                  {/* Summary Metric pill */}
                  <div className="text-[10px] text-text-muted font-mono mb-4 flex items-center justify-between px-2 py-1 bg-surface-alt/70 border border-border/70 rounded-xl">
                    <span>Prob: {stage.probability}%</span>
                    <strong className="text-emerald-400">${cumulativeValue.toLocaleString()}</strong>
                  </div>

                  {/* Column Cards wrapper */}
                  <div className={`flex-1 space-y-3 overflow-y-auto pr-1 text-left custom-scrollbar ${dragOverStageId === stage.id ? "bg-[#00d4aa]/2" : ""}`}>
                    {stageDeals.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-border/40 rounded-2xl bg-surface-alt/10">
                        <Briefcase className="w-6 h-6 text-slate-700 mb-1.5" />
                        <span className="text-[9px] text-text-muted font-mono">Stage Empty</span>
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">SLA: {stage.slaDays} days</span>
                      </div>
                    ) : (
                      stageDeals.map((deal) => {
                        const associatedLead = initialLeads.find(l => l.id === deal.leadId);
                        const daysInfo = getDaysInStage(deal, stage);
                        const isSlaBreached = stage.slaDays > 0 && daysInfo.days > stage.slaDays;
                        const isGhosted = daysInfo.days >= 4;
                        const isDraggingThis = draggingDealId === deal.id;

                        // Left indicator tag color based on deal health status
                        const leftBorderColor = 
                          deal.status === "hot" ? "border-l-[4px] border-l-[#00d4aa]" :
                          deal.status === "warm" ? "border-l-[4px] border-l-amber-500" :
                          deal.status === "cold" ? "border-l-[4px] border-l-blue-500" :
                          "border-l-[4px] border-l-slate-600";

                        return (
                          <div
                            key={deal.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, deal.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => selectActiveDeal(deal)}
                            className={`group relative p-3.5 rounded-2xl border transition-all duration-250 cursor-grab active:cursor-grabbing text-left space-y-3 select-none ${leftBorderColor} ${
                              selectedDeal?.id === deal.id 
                                ? "border-[#00d4aa] bg-[#0c0d12] shadow-[0_4px_24px_rgba(0,212,170,0.18)] ring-1 ring-[#00d4aa]/30" 
                                : "border-border bg-[#090a0f] hover:border-text-muted hover:bg-surface-alt/80 hover:translate-y-[-1.5px]"
                            } ${isDraggingThis ? "opacity-35 border-dashed border-slate-500 scale-95" : ""}`}
                          >
                            {isSlaBreached && (
                              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-405 rounded-xl p-2 flex items-center gap-1 text-[9px] leading-tight font-black font-mono">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>SLA OVERDUE ({daysInfo.days}d / max {stage.slaDays}d)</span>
                              </div>
                            )}

                            {isGhosted && (
                              <div className="bg-amber-500/10 border border-amber-500/25 text-[#f59e0b] rounded-lg p-1 text-[8px] font-bold font-mono tracking-wide flex items-center justify-center gap-1">
                                <span className="animate-pulse">⚠️</span>
                                <span>Ghosting Risk (no timeline activity)</span>
                              </div>
                            )}

                            <div className="flex items-start justify-between gap-1.5">
                              <h5 className="text-[11px] font-extrabold text-white group-hover:text-[#00d4aa] transition-colors leading-snug line-clamp-2" title={deal.title}>
                                {deal.title}
                              </h5>
                              <button 
                                onClick={(e) => handleDeleteDeal(deal.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 text-text-muted transition-all rounded-md"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Custom Lead Organization Info Box with letter avatar */}
                            <div className="flex items-center gap-2 min-w-0 bg-[#0f111a] p-2 rounded-xl border border-border/40">
                              <div className="w-5.5 h-5.5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-mono text-[9px] uppercase font-bold shrink-0 border border-border/50">
                                {associatedLead?.company ? associatedLead.company[0] : (associatedLead?.name ? associatedLead.name[0] : "L")}
                              </div>
                              <div className="truncate text-left leading-tight">
                                <span className="font-extrabold text-[#edf2f7] block truncate text-[9.5px]">{associatedLead?.name || "Unassigned Lead"}</span>
                                <span className="text-[8px] text-text-muted block truncate font-mono">@{associatedLead?.company || "N/A"}</span>
                              </div>
                            </div>

                            {/* AI Copilot Suggestion Pill */}
                            <div className="bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/12 rounded-lg p-2.5 space-y-0.5 text-left text-[8.5px] text-blue-350 transition-colors">
                              <div className="flex items-center gap-1 font-mono uppercase tracking-wider font-extrabold text-blue-400">
                                <Sparkles className="w-3 h-3 text-blue-400 shrink-0" />
                                <span>AI Next Best Action:</span>
                              </div>
                              <p className="font-medium text-slate-200 leading-relaxed">{getAiNextBestAction(deal)}</p>
                            </div>

                            {/* Base Attributes */}
                            <div className="flex items-center justify-between border-t border-border/20 pt-2.5 text-[10px] font-mono">
                              <span className="font-extrabold text-[#00d4aa]">${deal.value.toLocaleString()}</span>
                              <div className="flex items-center gap-1.5">
                                {/* Probability Close Gauge */}
                                <div className="flex items-center gap-1">
                                  <div className="w-8 h-1 bg-slate-800 rounded-full overflow-hidden shrink-0">
                                    <div className="h-full bg-[#00d4aa]" style={{ width: `${associatedLead?.score || 85}%` }} />
                                  </div>
                                  <span className="text-[8.5px] font-mono text-slate-400 font-bold">
                                    {associatedLead?.score || 85}%
                                  </span>
                                </div>
                                {getHealthBadge(deal.status)}
                              </div>
                            </div>

                            {/* Actionable Tags snippet */}
                            {deal.tags && deal.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/10">
                                {deal.tags.slice(0, 2).map((t, idx) => (
                                  <span key={idx} className="text-[8px] bg-surface font-mono font-bold text-[#00d4aa] px-1.5 py-0.5 rounded border border-border">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Card footer metrics */}
                            <div className="flex items-center justify-between text-[8px] text-text-muted uppercase tracking-wider font-mono pt-1">
                              <span>Duration: {daysInfo.days}d</span>
                              <span className="text-slate-400 truncate max-w-[80px]">{deal.assignedAgent || "No Operator"}</span>
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
        /* LIST GRID VIEW FALLBACK WITH BULK SUPPORT */
        <div className="overflow-x-auto bg-surface border border-border shadow-2xl rounded-3xl text-left select-none">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border text-[9px] uppercase font-bold text-text-muted tracking-widest bg-surface-alt/50">
                <th className="py-4 px-6 text-left">Deal Title Item</th>
                <th className="py-4 px-6 text-left">Contact Associate</th>
                <th className="py-4 px-6 text-left">Pipeline Phase</th>
                <th className="py-4 px-6 text-right">Value Volume</th>
                <th className="py-4 px-6 text-left">Assigned Agent</th>
                <th className="py-4 px-6 text-center">AI Closing Badge</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs text-text">
              {filteredDeals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted italic bg-surface-alt/10 font-mono">
                    No active Deal pipelines filtered. Combine tags or refine criteria values above.
                  </td>
                </tr>
              ) : (
                filteredDeals.map((deal) => {
                  const lead = initialLeads.find(l => l.id === deal.leadId);
                  const stage = activePipeline?.stages.find(s => s.id === deal.stage);

                  return (
                    <tr 
                      key={deal.id}
                      onClick={() => selectActiveDeal(deal)}
                      className="hover:bg-surface-alt/70 transition-colors cursor-pointer border-b border-border/30"
                    >
                      <td className="py-3.5 px-6 font-bold text-white">{deal.title}</td>
                      <td className="py-3.5 px-6">
                        <div className="font-extrabold text-white">{lead?.name || "Unassigned"}</div>
                        <div className="text-[10px] text-text-muted mt-0.5">@{lead?.company || "N/A"}</div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${stage?.color}15`, color: stage?.color, border: `1px solid ${stage?.color}30` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color }} />
                          {stage?.name || deal.stage}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-bold text-emerald-400">
                        ${deal.value.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 text-text-muted font-medium">{deal.assignedAgent || "None"}</td>
                      <td className="py-3.5 px-6 text-center">{getHealthBadge(deal.status)}</td>
                      <td className="py-3.5 px-6 text-center" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleDeleteDeal(deal.id, e)}
                          className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl text-xs font-bold transition-all"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Dynamic Detail Collapsible Side Drawer Panel */}
      <AnimatePresence>
        {selectedDeal && (
          <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end">
            {/* Backdrop click closer */}
            <div className="absolute inset-0" onClick={() => setSelectedDeal(null)} />

            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full sm:max-w-2xl bg-[#0b0c10]/95 backdrop-blur-md border-l border-border/80 shadow-[-10px_0_40px_rgba(0,0,0,0.6)] flex flex-col h-full z-10"
            >
              {/* Sidebar Drawer Header */}
              <div className="p-6 border-b border-border/60 flex items-center justify-between bg-surface-alt/70">
                <div className="space-y-1 text-left">
                  <span className="px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/25 rounded-md">
                    Journey Record File
                  </span>
                  <h3 className="text-base font-extrabold text-white truncate max-w-sm mt-1">{selectedDeal.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedDeal(null)}
                  className="p-1.5 bg-surface-alt border border-border hover:bg-border text-text-muted hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body content (scrolls) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-surface text-left">
                
                {/* 1. AI CLAUDE PROGRESSION ANALYTICS */}
                <div className="bg-gradient-to-br from-blue-500/5 to-[#00d4aa]/5 border border-[#00d4aa]/30 rounded-3xl p-5 space-y-4 relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#00d4aa]/3 rounded-full filter blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#00d4aa] animate-pulse" />
                      <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">Claude Closed-Loop Predictor</div>
                    </div>

                    <button
                      onClick={handleRefreshAiReport}
                      disabled={isRefreshingAi}
                      className="px-2.5 py-1.5 bg-surface border border-border hover:border-border-subtle text-text hover:text-white rounded-xl text-[10px] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingAi ? "animate-spin text-[#00d4aa]" : ""}`} />
                      {isRefreshingAi ? "Analyzing..." : "Regenerate Intelligence"}
                    </button>
                  </div>

                  {aiReport ? (
                    <div className="space-y-4 text-left">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Prob widget gauge */}
                        <div className="bg-surface-alt border border-border rounded-2xl p-4 text-center space-y-1">
                          <div className="text-[9px] uppercase font-bold text-text-muted tracking-wide font-mono">Closing Probability</div>
                          <div className="text-3xl font-extrabold text-[#00d4aa] font-mono">{aiReport.close_probability}%</div>
                          <div className="text-[8.5px] text-text-muted mt-1 font-mono">Est: {aiReport.estimated_close_date || "N/A"}</div>
                        </div>

                        {/* Health Status card widget */}
                        <div className="bg-surface-alt border border-border rounded-2xl p-4 text-center space-y-1 flex flex-col justify-between">
                          <div className="text-[9px] uppercase font-bold text-text-muted tracking-wide font-mono font-bold">Deal Health Gauge</div>
                          <div className="flex justify-center my-1.5">{getHealthBadge(aiReport.health_status)}</div>
                          <div className="text-[8px] text-text-muted mt-1 uppercase tracking-widest font-mono">Model: Claude 3.5 Sonnet</div>
                        </div>
                      </div>

                      {/* Summary text */}
                      <div className="bg-surface-alt border border-border/80 rounded-2xl p-4 text-xs leading-relaxed text-slate-300">
                        <strong className="text-white block mb-1 text-[10px] font-mono uppercase tracking-widest text-brand-alt">Executive Analysis:</strong>
                        {aiReport.analysis_summary}
                      </div>

                      {/* Risk factors list */}
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1 font-mono">
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          Identified Negotiation Hazards
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-text-muted">
                          {aiReport.key_risks?.map((risk: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                              <span className="text-rose-400 select-none font-bold font-mono">0{idx+1}.</span>
                              <span className="text-slate-300">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Next steps list */}
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1 font-mono">
                          <CheckCircle className="w-4 h-4 text-[#00d4aa]" />
                          Fulfillment Action Blueprint
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-text-muted">
                          {aiReport.recommended_next_steps?.map((step: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 bg-[#00d4aa]/5 p-2 rounded-lg border border-[#00d4aa]/10">
                              <span className="text-[#00d4aa] select-none font-bold font-mono">→</span>
                              <span className="text-slate-300 font-semibold">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* AI email outreach body */}
                      <div className="bg-surface-alt border border-border rounded-2xl p-4.5 space-y-2.5 text-left">
                        <div className="text-[9px] font-mono uppercase font-bold text-[#00d4aa] flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            Rendered AI Personal Pitch Copy
                          </div>
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-line p-3 bg-[#07080b] border border-border rounded-xl">
                          {aiReport.ideal_outreach_message}
                        </div>
                      </div>

                      {/* History Log comparative elements */}
                      {aiHistory.length > 0 && (
                        <div className="border-t border-border/30 pt-4">
                          <div className="text-[9px] uppercase font-bold text-text-muted mb-2 tracking-widest flex items-center gap-1">
                            <History className="w-3.5 h-3.5 text-brand" />
                            Probability Run History Audit
                          </div>
                          <div className="flex items-center gap-2">
                            {aiHistory.map((hist, idx) => (
                              <div key={idx} className="bg-surface-alt border border-border rounded-xl px-2.5 py-1 text-center font-mono">
                                <span className="text-[7.5px] text-text-muted block">{hist.date}</span>
                                <span className="text-xs text-blue-450 font-bold">{hist.score}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-surface-alt/50 border border-dashed border-border rounded-2xl text-center">
                      <Sparkles className="w-8 h-8 text-border mb-2.5" />
                      <p className="text-xs font-extrabold text-white">No Analysis Compiled</p>
                      <p className="text-[10px] text-text-muted mt-1 max-w-sm">
                        Engage background Claude Sonnet models to identify pipeline risks and generate custom, high-converting copy triggers.
                      </p>
                      <button
                        onClick={handleRefreshAiReport}
                        disabled={isRefreshingAi}
                        className="mt-4 px-3.5 py-2 bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAi ? "animate-spin text-slate-950" : ""}`} />
                        Launch AI Analyzer
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. CHRONOLOGICAL CHECKLIST followups */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#00d4aa] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#00d4aa]" />
                    Staging Checklist & Tasks ({dealTasks.filter(t => t.completed).length}/{dealTasks.length})
                  </h4>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    <input 
                      type="text"
                      placeholder="Schedule new follow-up action step..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full bg-surface-alt border border-border text-white placeholder:text-text-muted rounded-xl py-2 px-3 text-xs outline-none focus:border-brand"
                    />
                    <input 
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-brand w-full sm:w-auto"
                    />
                    <button 
                      onClick={handleAddTask}
                      className="px-4 py-2 bg-surface-alt border border-border hover:bg-border text-white text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto"
                    >
                      Schedule Task
                    </button>
                  </div>

                  <div className="space-y-2">
                    {dealTasks.length === 0 ? (
                      <p className="text-[10px] italic text-text-muted text-center font-mono py-2 bg-surface-alt/20 rounded-xl border border-border/30">
                        No scheduling tasks recorded. Track SLA checkpoints here.
                      </p>
                    ) : (
                      dealTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-3.5 bg-surface-alt border border-border/80 rounded-2xl">
                          <div className="flex items-center gap-2.5">
                            <input 
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleToggleTask(task)}
                              className="w-4 h-4 rounded text-[#00d4aa] border-border bg-[#090a0f] focus:ring-brand focus:ring-offset-0 focus:ring-1"
                            />
                            <span className={`text-xs ${task.completed ? "line-through text-text-muted opacity-60" : "text-white font-medium"}`}>
                              {task.title}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#00d4aa] bg-[#00d4aa]/5 px-2 py-0.5 rounded border border-[#00d4aa]/15 animate-fade-in">
                            <Calendar className="w-3 h-3" />
                            <span>By {new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. ACTIVITY LOGS PATHWAY */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-mono uppercase font-bold tracking-widest text-[#00d4aa] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-brand-alt" />
                    Interaction Timeline Logs
                  </h4>

                  <div className="space-y-2">
                    <textarea
                      placeholder="Log manual notes, communication outcome triggers, or call summaries..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full bg-surface-alt border border-border text-white placeholder:text-text-muted rounded-2xl p-3 text-xs outline-none focus:border-brand h-20 resize-none select-text"
                    />
                    <div className="flex justify-end">
                      <button 
                        onClick={handleAddNote}
                        className="px-4 py-2 bg-[#00d4aa] hover:bg-[#00d4aa]/90 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Append Note Log
                      </button>
                    </div>
                  </div>

                  <div className="relative border-l border-border pl-4 space-y-6">
                    {dealActivities.length === 0 ? (
                      <p className="text-[10px] italic text-text-muted text-center font-mono py-2">Timeline inactive. Move stages to generate activity metrics.</p>
                    ) : (
                      dealActivities.map((act) => (
                        <div key={act.id} className="relative space-y-1 text-left">
                          <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-surface bg-[#00d4aa]" />
                          
                          <div className="text-[11px] font-extrabold text-white flex items-center justify-between">
                            <span>{act.title}</span>
                            <span className="text-[8px] text-text-muted font-mono">{new Date(act.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[10px] text-text-muted leading-relaxed select-text">{act.description}</p>
                          <div className="text-[8px] text-text-muted italic flex items-center gap-1.5 pt-0.5 font-mono select-none">
                            <User className="w-3 h-3 opacity-60 text-brand" />
                            Broker Agent: {act.agentName}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. CREATE DEAL MODAL */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 backdrop-blur-sm select-text">
          <div className="bg-surface border border-border rounded-3xl max-w-md w-full p-6 text-left space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#00d4aa]" />
                Initialize Journey Deal
              </h3>
              <button onClick={() => setShowAddDealModal(false)} className="text-text-muted hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Deal / Opportunity Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Acme Enterprise Automation Upgrade"
                  value={newDealTitle}
                  onChange={(e) => setNewDealTitle(e.target.value)}
                  className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Lead Target Assgined</label>
                  <select 
                    value={newDealLeadId}
                    onChange={(e) => setNewDealLeadId(e.target.value)}
                    className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa]"
                  >
                    <option value="">Select Target...</option>
                    {initialLeads.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Deal Value ($ USD)</label>
                  <input 
                    type="number"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(Number(e.target.value))}
                    className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Start Pipeline Stage</label>
                  <select 
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value)}
                    className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa]"
                  >
                    {activePipeline?.stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Responsible Broker Agent</label>
                  <select 
                    value={newDealAgent}
                    onChange={(e) => setNewDealAgent(e.target.value)}
                    className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa]"
                  >
                    <option value="Sarah Mitchell">Sarah Mitchell</option>
                    <option value="James Ochieng">James Ochieng</option>
                    <option value="User Pro">User Pro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Tags Context (comma separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. Enterprise, High-Value, SaaS"
                  value={newDealTags}
                  onChange={(e) => setNewDealTags(e.target.value)}
                  className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40 text-xs font-bold">
              <button 
                onClick={() => setShowAddDealModal(false)}
                className="px-4.5 py-2 hover:bg-surface-alt border border-border text-text-muted hover:text-white rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateDeal}
                className="px-4.5 py-2 bg-[#00d4aa] text-slate-950 hover:bg-[#00d4aa]/90 rounded-xl transition-all cursor-pointer"
              >
                Create Target Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DEDUPLICATION MATCHES MODAL */}
      {showMergeModal && duplicateConflicts && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 backdrop-blur-sm select-text">
          <div className="bg-surface border border-border rounded-3xl max-w-2xl w-full p-6 text-left space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                CRM Contact Integrity & Deduplication Gateway
              </h3>
              <button onClick={() => setShowMergeModal(false)} className="text-text-muted hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 p-4.5 rounded-2xl leading-relaxed">
              We identified dual duplicates conflict records on work email or phone context pairings:
              <span className="font-mono block pt-1.5 font-extrabold text-white text-[11px]">Conflict Identifier Key: {duplicateConflicts.leadA.email}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Card Lead A */}
              <div className="border border-border p-4.5 rounded-2xl bg-surface-alt text-left space-y-3">
                <div className="font-bold text-brand border-b border-border/30 pb-1.5 font-mono uppercase text-[9px] tracking-widest">Duplicate Target Alpha [A]</div>
                <div>
                  <span className="text-text-muted uppercase text-[8px] tracking-wider block font-mono">Full name</span> 
                  <span className="text-white font-bold">{duplicateConflicts.leadA.name}</span>
                </div>
                <div>
                  <span className="text-text-muted uppercase text-[8px] tracking-wider block font-mono">Role Title</span> 
                  <span className="text-white font-medium">{duplicateConflicts.leadA.role}</span>
                </div>
                <div>
                  <span className="text-text-muted uppercase text-[8px] tracking-wider block font-mono">Contact Phone</span> 
                  <span className="text-white font-mono">{duplicateConflicts.leadA.phone || "Empty"}</span>
                </div>
                <div>
                  <span className="text-text-muted uppercase text-[8px] tracking-wider block font-mono">Enrichment score</span> 
                  <span className="text-white font-bold text-emerald-400">{duplicateConflicts.leadA.score}%</span>
                </div>
              </div>

              {/* Card Lead B */}
              <div className="border border-border p-4.5 rounded-2xl bg-surface-alt text-left space-y-3">
                <div className="font-bold text-blue-400 border-b border-border/30 pb-1.5 font-mono uppercase text-[9px] tracking-widest">Duplicate Target Beta [B]</div>
                <div>
                  <span className="text-text-muted uppercase text-[8px] tracking-wider block font-mono">Full name</span> 
                  <span className="text-white font-bold">{duplicateConflicts.leadB.name}</span>
                </div>
                <div>
                  <span className="text-text-muted uppercase text-[8px] tracking-wider block font-mono">Role Title</span> 
                  <span className="text-white font-medium">{duplicateConflicts.leadB.role}</span>
                </div>
                <div>
                  <span className="text-text-muted uppercase text-[8px] tracking-wider block font-mono">Contact Phone</span> 
                  <span className="text-white font-mono">{duplicateConflicts.leadB.phone || "Empty"}</span>
                </div>
                <div>
                  <span className="text-text-muted uppercase text-[8px] tracking-wider block font-mono">Enrichment score</span> 
                  <span className="text-white font-bold text-blue-400">{duplicateConflicts.leadB.score}%</span>
                </div>
              </div>
            </div>

            {/* Selection row block */}
            <div className="space-y-3">
              <div className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#00d4aa]">Field-Level Value Retainer Scheme:</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  onClick={() => handleResolveMerge(duplicateConflicts.leadA.id, duplicateConflicts.leadB.id, {
                    role: duplicateConflicts.leadA.role || duplicateConflicts.leadB.role,
                    phone: duplicateConflicts.leadA.phone || duplicateConflicts.leadB.phone,
                    score: duplicateConflicts.leadA.score || duplicateConflicts.leadB.score
                  })}
                  className="p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl text-left transition-all"
                >
                  <span className="font-extrabold text-[#10b981] block mb-1">Prioritize Record Alpha [A]</span>
                  <span className="text-[10px] text-text-muted leading-relaxed block">Merges duplicates together but preserves Alpha values if overlapping fields conflict.</span>
                </button>

                <button
                  onClick={() => handleResolveMerge(duplicateConflicts.leadA.id, duplicateConflicts.leadB.id, {
                    role: duplicateConflicts.leadB.role || duplicateConflicts.leadA.role,
                    phone: duplicateConflicts.leadB.phone || duplicateConflicts.leadA.phone,
                    score: duplicateConflicts.leadB.score || duplicateConflicts.leadA.score
                  })}
                  className="p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-2xl text-left transition-all"
                >
                  <span className="font-extrabold text-blue-450 block mb-1">Prioritize Record Beta [B]</span>
                  <span className="text-[10px] text-text-muted leading-relaxed block">Merges duplicates together but preserves Beta values if overlapping fields conflict.</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40 text-xs">
              <button 
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 hover:bg-surface-alt border border-border text-text-muted hover:text-white rounded-xl transition-all font-bold cursor-pointer"
              >
                Keep Separately
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. BULK LEAD CONVERSION MODAL */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 backdrop-blur-sm select-text">
          <div className="bg-[#0b0c10] border border-border rounded-3xl max-w-4xl w-full p-6 text-left space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3 shrink-0">
              <div className="space-y-1">
                <span className="px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase tracking-widest text-[#00d4aa] bg-[#00d4aa]/10 border border-[#00d4aa]/25 rounded-md">
                  Active Batch Deploy
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#00d4aa]" />
                  Convert Multiple Leads to Active Kanban Deals
                </h3>
              </div>
              <button 
                onClick={() => setShowBulkImportModal(false)} 
                className="text-text-muted hover:text-white cursor-pointer p-1.5 hover:bg-surface-alt rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1 py-1 custom-scrollbar">
              {/* Left Wing: Lead Selector List with check boxes */}
              <div className="space-y-4 flex flex-col h-full min-h-[250px]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#00d4aa]">
                    1. Select Candidates ({selectedLeadsForBulk.length} chosen)
                  </span>
                  
                  {/* Select All / Deselect All */}
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const leadsWithDeals = deals.map(d => d.leadId);
                        const eligible = initialLeads.filter(l => !leadsWithDeals.includes(l.id));
                        setSelectedLeadsForBulk(eligible.map(l => l.id));
                      }}
                      className="text-[#00d4aa] hover:underline font-bold bg-transparent border-0 cursor-pointer"
                    >
                      Select All Available
                    </button>
                    <span className="text-border">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedLeadsForBulk([])}
                      className="text-text-muted hover:text-white font-bold bg-transparent border-0 cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Candidate Scroller List */}
                <div className="border border-border rounded-2xl bg-surface-alt/40 p-1 divide-y divide-border/45 overflow-y-auto flex-1 max-h-[350px]">
                  {(() => {
                    const leadsWithDeals = deals.map(d => d.leadId);
                    const eligibleLeads = initialLeads.filter(l => !leadsWithDeals.includes(l.id));
                    
                    if (eligibleLeads.length === 0) {
                      return (
                        <div className="py-12 px-4 text-center space-y-2">
                          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                          <p className="text-xs text-text-muted italic">All existing system leads have already been converted to active CRM deal segments!</p>
                        </div>
                      );
                    }
                    
                    return eligibleLeads.map((lead) => {
                      const isChecked = selectedLeadsForBulk.includes(lead.id);
                      return (
                        <div 
                          key={lead.id} 
                          onClick={() => {
                            if (isChecked) {
                              setSelectedLeadsForBulk(prev => prev.filter(id => id !== lead.id));
                            } else {
                              setSelectedLeadsForBulk(prev => [...prev, lead.id]);
                            }
                          }}
                          className={`flex items-start gap-3 p-3 hover:bg-[#0f1118] transition-all cursor-pointer rounded-xl ${isChecked ? 'bg-emerald-500/5' : ''}`}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Click handled by parent item click
                            className="w-4 h-4 rounded mt-0.5 text-[#00d4aa] border-border bg-[#090a0f]"
                          />
                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-1.5 justify-between">
                              <span className="text-xs font-bold text-white truncate">{lead.name}</span>
                              <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded-sm font-bold ${lead.score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/10 text-text-muted'}`}>
                                Score: {lead.score}%
                              </span>
                            </div>
                            <p className="text-[10px] text-text-muted truncate">@{lead.company || "No Org Info"}</p>
                            {lead.email && <p className="text-[9px] text-slate-500 truncate mt-0.5">{lead.email}</p>}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Right Wing: Batch Conversion Form Parameters */}
              <div className="space-y-4 flex flex-col justify-between h-full bg-[#0f111a]/45 border border-border rounded-2xl p-4.5">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#00d4aa] block mb-2">
                    2. Customize Journey parameters
                  </span>

                  <div className="space-y-4 text-xs">
                    {/* Est Value */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Deal Opportunity Value ($ USD per Lead)</label>
                      <input 
                        type="number"
                        value={bulkDealValue}
                        onChange={(e) => setBulkDealValue(Number(e.target.value))}
                        className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa]"
                        placeholder="e.g. 35000"
                      />
                      <p className="text-[8.5px] text-text-muted mt-0.5">Each chosen prospect will be created with reference to this baseline deal value.</p>
                    </div>

                    {/* Stage & Agent Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Starting Pipeline Stage</label>
                        <select 
                          value={bulkStage}
                          onChange={(e) => setBulkStage(e.target.value)}
                          className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa] cursor-pointer"
                        >
                          {activePipeline?.stages.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Responsible Agent</label>
                        <select 
                          value={bulkAgent}
                          onChange={(e) => setBulkAgent(e.target.value)}
                          className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa] cursor-pointer"
                        >
                          <option value="Sarah Mitchell">Sarah Mitchell</option>
                          <option value="James Ochieng">James Ochieng</option>
                          <option value="User Pro">User Pro</option>
                        </select>
                      </div>
                    </div>

                    {/* Status & Comm Tag */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Opportunity Health status</label>
                        <select 
                          value={bulkStatus}
                          onChange={(e) => setBulkStatus(e.target.value as any)}
                          className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa] cursor-pointer"
                        >
                          <option value="hot">🔥 Hot Close</option>
                          <option value="warm">⚡ Warm Play</option>
                          <option value="cold">❄️ Cold Strobe</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono tracking-widest text-text-muted uppercase">Comma Separated Tags</label>
                        <input 
                          type="text"
                          value={bulkTags}
                          onChange={(e) => setBulkTags(e.target.value)}
                          className="w-full bg-surface-alt border border-border text-white rounded-xl py-2 px-3 text-xs outline-none focus:border-[#00d4aa]"
                          placeholder="Enterprise, High-Value"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/25 mt-4 text-[10px] text-text-muted leading-relaxed select-text">
                  Upon batch confirmation, the Zyntra SDR pipeline engines initialize automatic timeline logging arrays and follow-up activities to preserve SLA response milestones.
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40 text-xs font-bold shrink-0">
              <button 
                onClick={() => setShowBulkImportModal(false)}
                className="px-4.5 py-2.5 hover:bg-surface-alt border border-border text-text-muted hover:text-white rounded-xl transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkImportLeads}
                disabled={isBulkImporting || selectedLeadsForBulk.length === 0}
                className="px-5 py-2.5 bg-[#00d4aa] text-slate-950 hover:bg-[#00d4aa]/90 disabled:opacity-40 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-[0_4px_16px_rgba(0,212,170,0.2)] border-0"
              >
                {isBulkImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    Converting {selectedLeadsForBulk.length} Leads...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-slate-950" />
                    Convert & Import {selectedLeadsForBulk.length} Prospects
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
