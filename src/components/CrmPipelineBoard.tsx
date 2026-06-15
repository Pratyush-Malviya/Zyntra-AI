import React, { useState, useEffect } from "react";
import { 
  Kanban, List, Plus, Search, Filter, RefreshCw, Sparkles, AlertCircle, 
  MapPin, Clock, Calendar, Briefcase, User, UserCheck, Tag, Trash2, 
  CheckCircle, ChevronRight, Activity, FileText, Check, MoreVertical, 
  ArrowRight, ShieldAlert, BarChart3, Mail, Phone, Users, History, TrendingUp, X, Flag, Layers
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";
import { generateCrmHelp } from "../services/geminiService";

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

  // Omnichannel AI Log Panel States
  const [logType, setLogType] = useState<"note" | "call" | "email">("note");
  const [emailSubject, setEmailSubject] = useState("");
  const [isAnalyzingCrmHelp, setIsAnalyzingCrmHelp] = useState(false);
  const [aiCallAnalysisResult, setAiCallAnalysisResult] = useState<any | null>(null);
  const [aiEmailAnalysisResult, setAiEmailAnalysisResult] = useState<any | null>(null);

  // New Deal AI Pricing & Estimator States
  const [isEstimatingDeal, setIsEstimatingDeal] = useState(false);
  const [aiDealStrategyResult, setAiDealStrategyResult] = useState<string | null>(null);

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

  // Trigger AI analysis on raw call transcripts or summaries
  const handleAnalyzeCallNotes = async () => {
    if (!selectedDeal || !newNoteText.trim()) {
      showToast("Please enter call notes first.", "error");
      return;
    }
    setIsAnalyzingCrmHelp(true);
    setAiCallAnalysisResult(null);
    try {
      const associatedLead = initialLeads.find(l => l.id === selectedDeal.leadId);
      const leadContext = {
        name: associatedLead?.name,
        role: associatedLead?.role,
        company: associatedLead?.company,
        industry: associatedLead?.industry,
        country: associatedLead?.country,
        employees: (associatedLead as any)?.employees,
        website: (associatedLead as any)?.website
      };

      const result = await generateCrmHelp("call_notes_assist", {
        callNotes: newNoteText,
        leadContext
      });

      setAiCallAnalysisResult(result);
      showToast("AI Call Analysis completed. Dynamic action suggestions retrieved.", "success");
    } catch (err: any) {
      showToast("Failed to analyze call notes via Gemini.", "error");
    } finally {
      setIsAnalyzingCrmHelp(false);
    }
  };

  // Trigger AI professional rewrite of email outreach drafts
  const handleImproveEmailDraft = async () => {
    if (!selectedDeal || !newNoteText.trim()) {
      showToast("Please enter email draft text first.", "error");
      return;
    }
    setIsAnalyzingCrmHelp(true);
    setAiEmailAnalysisResult(null);
    try {
      const associatedLead = initialLeads.find(l => l.id === selectedDeal.leadId);
      const leadContext = {
        name: associatedLead?.name,
        role: associatedLead?.role,
        company: associatedLead?.company,
        industry: associatedLead?.industry
      };

      const result = await generateCrmHelp("email_draft_assist", {
        emailBody: newNoteText,
        leadContext
      });

      setAiEmailAnalysisResult(result);
      if (result?.improved_subject) {
        setEmailSubject(result.improved_subject);
      }
      showToast("AI Email rephrase completed successfully.", "success");
    } catch (err: any) {
      showToast("Failed to improve email draft via Gemini.", "error");
    } finally {
      setIsAnalyzingCrmHelp(false);
    }
  };

  // Log Note, Call, or Email to Journey timelines and auto-add any accepted tasks
  const handlePublishOmnichannelLog = async () => {
    if (!selectedDeal) return;
    
    let contentToPublish = newNoteText;
    let title = "Internal Note logged";
    let typeKeyword = "note_added";

    if (logType === "call") {
      typeKeyword = "call_logged";
      title = "📞 Call Recap & Summary Logged";
      if (aiCallAnalysisResult?.summary) {
        const bullets = aiCallAnalysisResult.key_points ? aiCallAnalysisResult.key_points.map((p: string) => `• ${p}`).join("\n") : "";
        contentToPublish = `[AI Summary]: ${aiCallAnalysisResult.summary}\n\n[Sentiment]: ${aiCallAnalysisResult.sentiment || 'N/A'}\n\n[Key Points]:\n${bullets}\n\n[Raw Call Transcript]:\n${newNoteText}`;
      } else {
        contentToPublish = `[Call Transcript]:\n${newNoteText}`;
      }
    } else if (logType === "email") {
      typeKeyword = "email_sent";
      title = emailSubject ? `✉️ Email Outreach: ${emailSubject}` : "✉️ Outbound Email Outreach";
      if (aiEmailAnalysisResult?.improved_body) {
        contentToPublish = `[AI Processed Email Outreach]:\n${aiEmailAnalysisResult.improved_body}\n\n[Draft Concept Rephrased]:\n${newNoteText}`;
      } else {
        contentToPublish = `[Outreach Email Body]:\n${newNoteText}`;
      }
    }

    if (!newNoteText.trim() && !aiCallAnalysisResult && !aiEmailAnalysisResult) {
      showToast("Please enter valid log context first.", "error");
      return;
    }

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: selectedDeal.id,
          type: typeKeyword,
          title: title,
          description: contentToPublish,
          agentName: selectedDeal.assignedAgent || "Workspace Team"
        })
      });

      if (res.ok) {
        if (logType === "call" && aiCallAnalysisResult?.extracted_tasks?.length) {
          for (const task of aiCallAnalysisResult.extracted_tasks) {
            await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dealId: selectedDeal.id,
                title: task.title,
                dueDate: task.dueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
                completed: false,
                assignedAgent: selectedDeal.assignedAgent || "Workspace Team"
              })
            });
          }
          const tRes = await fetch("/api/tasks");
          if (tRes.ok) {
            const allTasks = await tRes.json();
            setDealTasks(allTasks.filter((t: any) => t.dealId === selectedDeal.id));
          }
        }

        showToast(`${logType.toUpperCase()} recap successfully added to journey timeline.`, "success");
        setNewNoteText("");
        setEmailSubject("");
        setAiCallAnalysisResult(null);
        setAiEmailAnalysisResult(null);
        
        const actRes = await fetch("/api/activities");
        if (actRes.ok) {
          const allActs = await actRes.json();
          setDealActivities(allActs.filter(a => a.dealId === selectedDeal.id));
        }

        if (onLeadsUpdated) {
          onLeadsUpdated();
        }
      } else {
        showToast("Failed to post journey activity log.", "error");
      }
    } catch (err) {
      showToast("Error processing timeline entry publish.", "error");
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
        setAiDealStrategyResult(null);
        setShowAddDealModal(false);
        refreshDbState();
      } else {
        showToast("Failed provisioning lead journey deal.", "error");
      }
    } catch (err) {
      showToast("Cannot write new Deal path.", "error");
    }
  };

  // Auto-estimate value, tags, and account plans using Gemini
  const handleEstimateDealValue = async () => {
    if (!newDealLeadId) {
      showToast("Please associate a target Lead record first to estimate parameters.", "error");
      return;
    }
    setIsEstimatingDeal(true);
    setAiDealStrategyResult(null);
    try {
      const associatedLead = initialLeads.find(l => l.id === newDealLeadId);
      const leadContext = {
        name: associatedLead?.name,
        role: associatedLead?.role,
        company: associatedLead?.company,
        industry: associatedLead?.industry,
        country: associatedLead?.country,
        employees: (associatedLead as any)?.employees,
        website: (associatedLead as any)?.website
      };

      const result = await generateCrmHelp("lead_deal_score", { leadContext });
      if (result) {
        if (result.recommended_deal_value) {
          setNewDealValue(result.recommended_deal_value);
        }
        if (result.suggested_tags && Array.isArray(result.suggested_tags)) {
          setNewDealTags(result.suggested_tags.join(", "));
        }
        if (result.closing_strategy) {
          setAiDealStrategyResult(result.closing_strategy);
        }
        showToast("Gemini dynamic deal insights & tags applied.", "success");
      }
    } catch (err: any) {
      showToast("Could not estimate deal details from lead context.", "error");
    } finally {
      setIsEstimatingDeal(false);
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
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 transition-all text-[8px] font-mono tracking-wider font-extrabold uppercase shrink-0 cursor-pointer shadow-xs leading-none"
          title="Synced. Click to re-sync."
        >
          <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
          <span>Synced</span>
        </button>
      );
    } else if (status === "Syncing") {
      return (
        <div
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-mono tracking-wider font-extrabold uppercase shrink-0 animate-pulse cursor-wait leading-none"
          title="Integrating payload in background..."
        >
          <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400 shrink-0" />
          <span>Syncing</span>
        </div>
      );
    } else {
      return (
        <button
          onClick={triggerSync}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-all text-[8px] font-mono tracking-wider font-extrabold uppercase shrink-0 cursor-pointer shadow-xs leading-none"
          title="Sync failed. Click to rebuild and retry."
        >
          <span className="w-1 h-1 rounded-full bg-rose-400 animate-ping shrink-0" />
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
    <div id="crm-field-mapping-panel" className="bg-surface border border-border rounded-3xl p-6 shadow-sm space-y-6 text-text">
      {/* Upper header section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-border pb-6">
        <div>
          <h2 className="text-xl font-bold font-sans flex items-center gap-2 tracking-tight text-text">
            <TrendingUp className="w-5 h-5 text-brand" />
            Lead & Deal Journey Builder
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Configure isolated pipeline stages with probability indexes, configure assignment parameters, and deploy Claude Sonnet Always-on Close intelligence.
          </p>
        </div>

        {/* View Layout, Merge triggers, pipelines configuring row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Pipeline Dropdown Selector */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[#090a0f] border border-border rounded-xl">
            <span className="hidden sm:inline text-[9px] font-extrabold uppercase tracking-widest text-text-muted px-2">
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
              className="bg-surface border border-border/80 rounded-lg text-[10px] font-semibold text-white px-2.5 py-1 focus:border-brand-alt outline-none transition-colors cursor-pointer"
            >
              {pipelinesList.map(p => (
                <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Deduplication check */}
          <button 
            onClick={checkForDuplicates}
            className="px-3.5 py-1.5 rounded-xl border border-rose-200/50 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            De-Duplicate Leads Tool
          </button>

          {/* New Deal */}
          <button 
            onClick={() => setShowAddDealModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-brand hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Deal
          </button>

          {/* Team Activity Widget Toggle */}
          <button 
            onClick={() => setShowTeamActivityWidget(!showTeamActivityWidget)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              showTeamActivityWidget 
                ? "border-emerald-500/35 bg-emerald-500/10 text-brand-alt" 
                : "border-border bg-surface text-text-muted hover:text-text hover:border-border-subtle"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-brand-alt" />
            Team Activity
          </button>

          {/* Swimlane Toggle Button */}
          {viewType === "kanban" && (
            <button 
              onClick={() => setSwimlaneMode(!swimlaneMode)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                swimlaneMode 
                  ? "border-amber-500/35 bg-amber-500/10 text-amber-500 font-bold" 
                  : "border-border bg-surface text-text-muted hover:text-text hover:border-border-subtle"
              }`}
              title="Toggle horizontal swimlanes categorized by Lead Priority"
            >
              <Layers className="w-4 h-4 text-amber-500" />
              <span>Swimlanes {swimlaneMode ? "ON" : "OFF"}</span>
            </button>
          )}

          {/* Toggle switcher layout state */}
          <div className="flex items-center bg-surface-alt p-1 rounded-xl border border-border">
            <button
              onClick={() => toggleViewPreference("kanban")}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs cursor-pointer ${
                viewType === "kanban" ? "bg-surface text-text shadow-xs font-bold" : "text-text-muted hover:text-text"
              }`}
              title="Kanban Board Staging"
            >
              <Kanban className="w-4 h-4 text-text-muted" />
              Board
            </button>
            <button
              onClick={() => toggleViewPreference("list")}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs cursor-pointer ${
                viewType === "list" ? "bg-surface text-text shadow-xs font-bold" : "text-text-muted hover:text-text"
              }`}
              title="List View"
            >
              <List className="w-4 h-4 text-text-muted" />
              List View
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Advanced searching queries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface p-4 border border-border rounded-2xl shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/65" />
          <input 
            type="text"
            placeholder="Search deals, contacts or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-alt border border-border rounded-xl py-2 pl-10 pr-4 text-xs select-text text-text placeholder:text-text-muted/65 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
          />
        </div>

        {/* Tag Selection filter */}
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-brand-alt" />
          <select 
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="grow bg-surface-alt border border-border text-text rounded-xl py-2 px-3 text-xs outline-none focus:border-brand transition-all appearance-none cursor-pointer"
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
            className="grow bg-surface-alt border border-border text-text rounded-xl py-2 px-3 text-xs outline-none focus:border-brand transition-all appearance-none cursor-pointer"
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
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-brand" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text">Team Activity Metrics (Deals Moved in Last 30 Days)</h3>
            </div>
            <span className="text-[10px] text-text-muted bg-surface-alt border border-border px-2.5 py-0.5 rounded-full font-mono font-bold">
              Total movements: {chartData.reduce((sum, d) => sum + d.moves, 0)}
            </span>
          </div>

          {chartData.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted italic bg-surface-alt rounded-xl border border-dashed border-border">
              No deal movements logged by team agents over the last 30 days. Promote a deal between stages to record activity!
            </div>
          ) : (
            <div className="h-44 w-full pr-4 text-xs">
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
          <div className="space-y-6 w-full text-left">
            {(() => {
              const swimlanes = [
                { key: "high", label: "High Lead Priority", colorClass: "text-rose-600 dark:text-rose-400", bgClass: "bg-rose-500/10 border-rose-500/20", icon: "🔥" },
                { key: "medium", label: "Medium Lead Priority", colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10 border-amber-500/20", icon: "⚡" },
                { key: "low", label: "Low / No Lead Priority", colorClass: "text-text-muted", bgClass: "bg-surface-alt border-border", icon: "❄️" }
              ];

              return (
                <div className="space-y-6 w-full">
                  {swimlanes.map((lane) => {
                    const laneDeals = filteredDeals.filter(d => {
                      if (lane.key === "high") return d.priority === "high" || d.priority === "urgent";
                      if (lane.key === "medium") return d.priority === "medium";
                      return d.priority === "low" || d.priority === "none" || !d.priority;
                    });

                    const totalValue = laneDeals.reduce((sum, d) => sum + d.value, 0);

                    return (
                      <div key={lane.key} className="space-y-3 bg-surface border border-border rounded-2xl p-4.5 shadow-xs">
                        {/* Swimlane Header */}
                        <div className="flex items-center justify-between border-b border-border pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{lane.icon}</span>
                            <h3 className={`text-xs font-bold font-sans uppercase tracking-wider ${lane.colorClass}`}>
                              {lane.label}
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-alt text-text border border-border font-bold font-mono">
                              {laneDeals.length} Deals
                            </span>
                          </div>
                          <span className="text-[11px] text-brand-alt font-mono font-bold">
                            Cumulative: ${totalValue.toLocaleString()}
                          </span>
                        </div>

                        {/* Horizontal Stages Grid */}
                        <div className="flex lg:grid lg:grid-cols-5 gap-4 overflow-x-auto pb-4 scrollbar-thin w-full">
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
                                className={`flex flex-col bg-surface-alt/75 border p-3 rounded-xl min-w-[245px] lg:min-w-0 lg:w-auto shrink-0 min-h-[180px] ${pulsingColumnId === stage.id ? "border-brand shadow-md" : "border-border"}`}
                              >
                                {/* Stage name Inside Swimlane */}
                                <motion.div 
                                  animate={pulsingColumnId === stage.id ? { y: [0, -3, 0], opacity: [1, 0.7, 1] } : {}}
                                  transition={{ duration: 0.8 }}
                                  className="flex items-center justify-between border-b border-border/60 pb-1.5 mb-2.5"
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                                    <span className="text-[10px] font-bold text-text truncate uppercase" title={stage.name}>
                                      {stage.name}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-bold font-mono text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                    ${cumulativeStageValue.toLocaleString()}
                                  </span>
                                </motion.div>

                                {/* Render stage lane deals */}
                                <div className="flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin max-h-[250px]">
                                  {stageLaneDeals.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-3 border border-dashed border-border rounded-lg bg-surface/45">
                                      <span className="text-[8px] text-text-muted uppercase">No Matches</span>
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
                                          className={`journey-deal-card-component group relative bg-surface border transition-all duration-300 rounded-xl p-3 cursor-grab active:cursor-grabbing text-left space-y-2 select-none ${
                                            selectedDeal?.id === deal.id 
                                              ? "border-brand shadow-sm bg-brand/5" 
                                              : "border-border hover:border-border-subtle hover:shadow-xs"
                                          }`}
                                        >
                                          {/* SLA Breach visual warning alert */}
                                          {isSlaBreached && (
                                            <div className="bg-rose-500/10 border border-rose-500/25 text-rose-500 rounded-lg p-1.5 flex items-start gap-1 text-[9px] leading-tight font-bold">
                                              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-rose-500" />
                                              <span>SLA Overdue ({daysInfo.days}d / max {stage.slaDays}d)</span>
                                            </div>
                                          )}

                                          <div className="flex items-start justify-between gap-1.5">
                                            <h5 className="text-[10px] font-bold text-text truncate group-hover:text-brand transition-colors" title={deal.title}>
                                              {deal.title}
                                            </h5>
                                            <button 
                                              onClick={(e) => handleDeleteDeal(deal.id, e)}
                                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-600 text-text-muted transition-all rounded-md"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>

                                          <div className="flex items-center justify-between gap-1.5 text-[9px] text-text-muted font-medium w-full">
                                            <div className="line-clamp-1 min-w-0">
                                              {associatedLead?.name || "Unassigned Lead"}
                                              <span className="text-[8px] opacity-75 ml-1">@{associatedLead?.company || "N/A"}</span>
                                            </div>
                                            {getSyncStatusBadge(deal)}
                                          </div>
                                          <div className="hidden">
                                            {associatedLead?.name || "Unassigned Lead"}
                                            <span className="text-[8px] opacity-75 ml-1">@{associatedLead?.company || "N/A"}</span>
                                          </div>

                                          <div className="flex items-center justify-between border-t border-border pt-1.5 text-[9px]">
                                            <span className="font-bold text-brand-alt">${deal.value.toLocaleString()}</span>
                                            <div className="flex items-center gap-1">
                                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 text-[8px] font-mono font-bold text-brand bg-brand/10 border border-brand/20 rounded">
                                                {associatedLead?.score || 80}%
                                              </span>
                                              {getHealthBadge(deal.status)}
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-between text-[8px] text-text-muted uppercase tracking-wider font-mono pt-1">
                                            <span>Duration: {daysInfo.days}d / max {stage.slaDays}d</span>
                                            <span className="text-text-muted truncate max-w-[70px]">{deal.assignedAgent || "No Operator"}</span>
                                          </div>

                                          {/* Quick Summary Note */}
                                          <div 
                                            className="mt-2 pt-1.5 border-t border-border/40 text-[10px]"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {editingNoteId === deal.id ? (
                                              <div className="space-y-1.5">
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
                                                  className="w-full bg-surface-alt border border-border rounded-lg p-1.5 text-[10px] text-text placeholder:text-text-muted focus:border-brandOutline outline-none resize-none h-12"
                                                />
                                                <div className="flex items-center justify-end gap-1">
                                                  <button
                                                    onClick={() => setEditingNoteId(null)}
                                                    className="px-1.5 py-0.5 rounded bg-surface-alt hover:bg-neutral-200 dark:hover:bg-neutral-800 text-text-muted text-[8px] border border-border cursor-pointer font-bold"
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    onClick={() => handleSaveSummaryNote(deal.id, noteDraftText)}
                                                    className="px-1.5 py-0.5 rounded bg-brand hover:brightness-110 text-white text-[8px] cursor-pointer font-bold inline-flex items-center gap-0.5"
                                                  >
                                                    <Check className="w-2.5 h-2.5" /> Save
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div 
                                                onClick={() => {
                                                  setEditingNoteId(deal.id);
                                                  setNoteDraftText(deal.summaryNote || "");
                                                }}
                                                className="group/note flex items-start justify-between gap-1 p-1 rounded bg-surface-alt hover:bg-brand/5 border border-transparent hover:border-brand/10 transition-all cursor-pointer"
                                                title="Click to edit summary note"
                                              >
                                                <div className="flex items-start gap-1 min-w-0 flex-1">
                                                  <FileText className="w-3 h-3 text-text-muted/60 mt-0.5 shrink-0" />
                                                  {deal.summaryNote ? (
                                                    <p className="text-[9px] text-text-muted leading-tight line-clamp-2 italic font-medium">
                                                      "{deal.summaryNote}"
                                                    </p>
                                                  ) : (
                                                    <span className="text-[9px] text-text-muted/40 italic">
                                                      Add summary note...
                                                    </span>
                                                  )}
                                                </div>
                                                <span className="opacity-0 group-hover/note:opacity-100 text-[7.5px] font-bold text-brand uppercase shrink-0 transition-opacity">
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
          <div className="space-y-4 w-full">
            {/* Mobile Stage Selector Tabs */}
            <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none w-full border-b border-border/85">
              {activePipeline?.stages.map((stage) => {
                const isSelected = mobileActiveStageId === stage.id;
                const count = filteredDeals.filter(d => d.stage === stage.id).length;
                return (
                  <button
                    key={stage.id}
                    onClick={() => setMobileActiveStageId(stage.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected 
                        ? "border-brand bg-brand/10 text-brand shadow-xs font-extrabold" 
                        : "border-border bg-surface text-text-muted hover:text-text hover:border-border-subtle"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <span>{stage.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono ${isSelected ? 'bg-brand/20 text-brand font-black' : 'bg-surface-alt text-text-muted border border-border'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin w-full items-start">
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
                    className={`flex flex-col bg-surface-alt/40 border rounded-2xl min-w-[300px] max-w-[325px] shrink-0 h-[640px] shadow-sm select-none transition-all ${
                      pulsingColumnId === stage.id ? "border-brand shadow-lg" : "border-border/90"
                    } ${
                      isMobileHidden ? "hidden md:flex" : "flex w-full max-w-full md:max-w-[325px]"
                    }`}
                  >
                  {/* Dynamic Colored Stage Header */}
                  <motion.div 
                    animate={pulsingColumnId === stage.id ? { opacity: [1, 0.4, 1] } : {}}
                    transition={{ duration: 0.8 }}
                    className={`flex items-center justify-between text-white font-bold text-xs px-4 py-3 rounded-t-2xl shadow-xs transition-all ${theme.headerBg} ${pulsingColumnId === stage.id ? "animate-pulse" : ""}`}
                    style={theme.headerStyle}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="text-xs font-black truncate uppercase tracking-widest" title={stage.name}>
                        {stage.name}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Active items counter box */}
                      <span className={`px-2 py-0.5 rounded-md text-xs font-black ${theme.chipBg}`}>
                        {stageDeals.length}
                      </span>
                      {/* Direct Column Delete button for admins */}
                      {isAuthorizedToManageColumns && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePipelineColumn(stage.id);
                          }}
                          className="text-white hover:text-red-100 opacity-60 hover:opacity-100 p-0.5 rounded-md hover:bg-black/10 transition-all cursor-pointer inline-flex items-center"
                          title="Delete Segment Stage Column"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>

                  <div className="p-3 flex-1 flex flex-col min-h-0 bg-surface rounded-b-2xl border-t border-border">
                    <div className="text-[10px] text-text-muted font-mono mb-2 flex items-center justify-between px-2.5 bg-surface-alt border border-border py-1 rounded-lg">
                      <span>Prob: {stage.probability}%</span>
                      <span className="text-brand-alt font-extrabold font-sans">${cumulativeValue.toLocaleString()}</span>
                    </div>

                    {/* Cards rendering */}
                    <div className="flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin text-left min-h-0">
                      {stageDeals.length === 0 ? (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-xl bg-surface-alt/50">
                          <Briefcase className="w-5 h-5 text-text-muted opacity-50 mb-1" />
                          <span className="text-[10px] text-text-muted font-semibold">Stage Empty</span>
                          <span className="text-[8px] text-text-muted font-medium uppercase mt-0.5">SLA limit: {stage.slaDays} days</span>
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
                              className={`journey-deal-card-component group relative transition-all duration-300 rounded-xl p-3 border cursor-grab active:cursor-grabbing text-left space-y-2 select-none ${
                                deal.completed 
                                  ? "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/35 shadow-xs" 
                                  : selectedDeal?.id === deal.id 
                                    ? "border-brand bg-brand/5 shadow-xs" 
                                    : "border-border hover:border-border-subtle hover:shadow-xs bg-surface shadow-xs"
                              }`}
                            >
                              {/* SLA Breach visual warning alert */}
                              {isSlaBreached && (
                                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg p-2 flex items-start gap-1 text-[10px] leading-tight font-bold">
                                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-500" />
                                  <span>SLA Overdue ({daysInfo.days}d / Limit {stage.slaDays}d)</span>
                                </div>
                              )}

                              {/* Row 1: Checkbox + Title + Flag */}
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                  <input 
                                    type="checkbox" 
                                    checked={!!deal.completed} 
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      updateDealProperty(deal.id, { completed: !deal.completed });
                                    }}
                                    className="w-4 h-4 text-brand rounded border-border-subtle focus:ring-brand cursor-pointer mt-0.5 shrink-0"
                                  />
                                  <h5 className={`text-[12px] font-extrabold text-text tracking-tight leading-tight group-hover:text-brand transition-colors truncate ${deal.completed ? "line-through text-text-muted font-normal" : ""}`} title={deal.title}>
                                    {deal.title}
                                  </h5>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Flag setter dropdown */}
                                  <div className="relative">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePriorityMenuId(activePriorityMenuId === deal.id ? null : deal.id);
                                      }}
                                      className={`p-1 hover:bg-black/5 rounded-lg transition-all ${
                                        deal.priority === "urgent" ? "text-rose-500" :
                                        deal.priority === "high" ? "text-orange-500" :
                                        deal.priority === "medium" ? "text-yellow-500" :
                                        deal.priority === "low" ? "text-blue-500" :
                                        "text-text-muted hover:text-text"
                                      }`}
                                      title="Set Priority Flag"
                                    >
                                      <Flag className={`w-3.5 h-3.5 ${deal.priority && deal.priority !== "none" ? "fill-custom fill-current" : ""}`} />
                                    </button>
                                    {activePriorityMenuId === deal.id && (
                                      <div 
                                        className="absolute right-0 top-6 z-50 bg-surface border border-border rounded-xl shadow-xl p-1.5 min-w-[130px] space-y-1 text-text text-[11px]" 
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <div className="text-[9px] uppercase font-bold text-text-muted px-2 py-0.5 select-none border-b border-border pb-1 mb-1">Set Priority</div>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateDealProperty(deal.id, { priority: "urgent" });
                                          }} 
                                          className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-surface-alt text-rose-500 font-bold rounded-lg"
                                        >
                                          🚩 Urgent
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateDealProperty(deal.id, { priority: "high" });
                                          }} 
                                          className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-surface-alt text-orange-500 font-bold rounded-lg"
                                        >
                                          🚩 High
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateDealProperty(deal.id, { priority: "medium" });
                                          }} 
                                          className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-surface-alt text-yellow-500 font-bold rounded-lg"
                                        >
                                          🚩 Medium
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateDealProperty(deal.id, { priority: "low" });
                                          }} 
                                          className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-surface-alt text-blue-500 font-bold rounded-lg"
                                        >
                                          🚩 Low
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateDealProperty(deal.id, { priority: "none" });
                                          }} 
                                          className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-surface-alt text-text-muted font-normal rounded-lg border-t border-border mt-1 pt-1"
                                        >
                                          🏳️ None
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <button 
                                    onClick={(e) => handleDeleteDeal(deal.id, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 hover:bg-black/5 text-text-muted transition-all rounded-lg"
                                    title="Delete Deal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Row 2: Assigned Agent / Contact name */}
                              <div className={`text-[10px] font-medium leading-tight ${deal.completed ? "text-text-muted/60" : "text-text-muted"}`}>
                                Operator: <span className="font-bold text-text">{deal.assignedAgent || "No Operator Assigned"}</span>
                              </div>

                              {/* Row 3: Meta details check */}
                              <div className="text-[10.5px] font-bold text-text-muted flex items-center justify-between gap-1 flex-wrap w-full">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="truncate">{associatedLead?.name || "Unassigned"}</span>
                                  {associatedLead?.company && (
                                    <span className="text-[9px] bg-surface-alt border border-border rounded px-1.5 text-text-muted font-semibold font-mono">
                                      @{associatedLead.company}
                                    </span>
                                  )}
                                </div>
                                {getSyncStatusBadge(deal)}
                              </div>
                              <div className="hidden">
                                <span className="truncate">{associatedLead?.name || "Unassigned"}</span>
                                {associatedLead?.company && (
                                  <span className="text-[9px] bg-surface-alt border border-border rounded px-1.5 text-text-muted font-semibold font-mono">
                                    @{associatedLead.company}
                                  </span>
                                )}
                              </div>

                              {/* Cost value & AI close score tags block */}
                              <div className="flex items-center justify-between border-t border-border pt-2 text-[10px]">
                                <span className="font-black text-brand-alt">${deal.value.toLocaleString()}</span>
                                
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
                                    <span key={idx} className="text-[8px] bg-surface-alt font-bold text-text-muted px-1.5 py-0.5 rounded border border-border">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Stage Duration tracking */}
                              <div className="flex items-center justify-between text-[8px] text-text-muted uppercase tracking-widest font-mono pt-1">
                                <span>In Stage: {daysInfo.days}d</span>
                                {stage.slaDays > 0 && <span>Max: {stage.slaDays}d</span>}
                              </div>

                              {/* Summary Note Field */}
                              <div 
                                className="mt-2.5 pt-2 border-t border-border/60 text-[11px]"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {editingNoteId === deal.id ? (
                                  <div className="space-y-1.5">
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
                                      className="w-full bg-surface-alt border border-border rounded-lg p-2 text-[10.5px] text-text placeholder:text-text-muted focus:border-brandOutline focus:ring-1 focus:ring-brand outline-none resize-none h-12"
                                    />
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => setEditingNoteId(null)}
                                        className="px-2 py-1 rounded-md bg-surface-alt hover:bg-neutral-200 dark:hover:bg-neutral-800 text-text-muted text-[9px] font-bold border border-border cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSaveSummaryNote(deal.id, noteDraftText)}
                                        className="px-2 py-1 rounded-md bg-brand hover:brightness-110 text-white text-[9px] font-bold cursor-pointer inline-flex items-center gap-0.5"
                                      >
                                        <Check className="w-3 h-3" /> Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => {
                                      setEditingNoteId(deal.id);
                                      setNoteDraftText(deal.summaryNote || "");
                                    }}
                                    className="group/note flex items-start justify-between gap-1.5 p-1.5 rounded-lg bg-surface-alt hover:bg-brand/5 border border-transparent hover:border-brand/20 transition-all cursor-pointer"
                                    title="Click to edit summary note"
                                  >
                                    <div className="flex items-start gap-1 min-w-0 flex-1">
                                      <FileText className="w-3 h-3 text-text-muted/60 mt-0.5 shrink-0" />
                                      {deal.summaryNote ? (
                                        <p className="text-[10px] text-text-muted leading-tight line-clamp-2 italic font-medium">
                                          "{deal.summaryNote}"
                                        </p>
                                      ) : (
                                        <span className="text-[9.5px] text-text-muted/40 italic font-medium">
                                          Add summary note...
                                        </span>
                                      )}
                                    </div>
                                    <span className="opacity-0 group-hover/note:opacity-100 text-[8px] font-bold text-brand uppercase tracking-wider shrink-0 transition-opacity">
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
                className="hidden md:flex flex-col bg-surface-alt/45 border-2 border-dashed border-border hover:bg-surface-alt hover:border-border-subtle p-6 rounded-2xl min-w-[300px] shrink-0 h-[640px] justify-center items-center cursor-pointer transition-all gap-3.5 group shadow-xs"
              >
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-text border border-border shadow-md group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-brand" />
                </div>
                <div className="text-center">
                  <h5 className="text-xs font-black text-text uppercase tracking-wider font-sans">Add Column</h5>
                  <p className="text-[10px] text-text-muted mt-1 font-medium">Create a new customizable stage segment</p>
                </div>
              </button>
            )}
          </div>
          </div>
        )
      ) : (
        /* List view fallback with clean bulk support, pagination grids */
        <div id="journey-list-view-container" className="space-y-3.5 text-left w-full">
          {filteredDeals.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted italic bg-surface-alt/30 border border-border border-dashed rounded-2xl w-full">
              No active journey deals found in this pipeline segment.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 w-full">
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
                    className={`journey-deal-card-component border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group transition-all duration-300 cursor-pointer ${
                      isSelected 
                        ? "bg-brand/10 border-brand shadow-[0_0_15px_rgba(var(--brand-rgb),0.12)] scale-[1.01] border-l-4 border-l-brand" 
                        : "bg-surface border-border hover:border-brand/35 hover:shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Active check indicators */}
                      <div className="shrink-0 flex items-center pr-0.5">
                        <input 
                          type="checkbox" 
                          checked={deal.completed || false} 
                          onChange={(e) => { 
                            e.stopPropagation(); 
                            updateDealProperty(deal.id, { completed: !deal.completed }); 
                          }} 
                          className="w-4.5 h-4.5 text-brand rounded border-border-subtle focus:ring-brand cursor-pointer bg-surface"
                        />
                      </div>

                      {/* Initials avatar matching lead index design */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white shadow-xs shrink-0 bg-gradient-to-br from-brand to-brand-alt select-none">
                        {(lead?.name || deal.title || "?")[0].toUpperCase()}
                      </div>

                      {/* Main identity metadata details column */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[13px] font-black tracking-tight ${deal.completed ? "line-through text-text-muted/60 font-normal" : "text-text group-hover:text-brand transition-colors"}`}>
                            {deal.title}
                          </span>
                          {deal.priority && deal.priority !== "none" && (
                            <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-surface-alt border border-border/80 shadow-3xs ${priorityColor}`}>
                              {priorityEmoji}
                            </span>
                          )}
                          {isSlaOverdue && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[8px] font-extrabold border border-rose-500/20 shadow-xs animate-pulse whitespace-nowrap">
                              <AlertCircle className="w-2.5 h-2.5" />
                              SLA Breach
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px]">
                          <span className="font-bold text-text-muted flex items-center gap-1">
                            <span>Lead:</span>
                            <span className="text-text hover:underline">{lead?.name || "Unassigned Lead"}</span>
                          </span>
                          {lead?.company && (
                            <span className="text-[10px] text-text-muted select-none">
                              <span className="bg-surface-alt border border-border/70 rounded px-1.5 py-0.2 font-mono font-semibold">
                                @{lead.company}
                              </span>
                            </span>
                          )}
                          {lead?.score && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-mono font-bold text-brand bg-brand/10 border border-brand/25 rounded-md">
                              <Sparkles className="w-2.5 h-2.5 text-brand" />
                              {lead.score}%
                            </span>
                          )}
                          {getSyncStatusBadge(deal)}
                        </div>
                      </div>
                    </div>

                    {/* Secondary layout tags columns */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-x-6 gap-y-3 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                      
                      {/* Operator assignments & SLA statuses */}
                      <div className="flex flex-col text-left md:text-right gap-0.5">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${stage?.color}15`, color: stage?.color, border: `1px solid ${stage?.color}25` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color }} />
                            {stage?.name || deal.stage}
                          </span>
                        </div>
                        <div className="text-[10px] text-text-muted font-bold flex items-center gap-1 md:justify-end mt-0.5">
                          <span>Operator:</span>
                          <span className="text-text font-black">{deal.assignedAgent || "Unassigned"}</span>
                        </div>
                        <div className="text-[9px] text-text-muted/80 font-mono">
                          Duration: {daysInfo.days}d {stage?.slaDays ? `/ max ${stage.slaDays}d` : ""}
                        </div>
                      </div>

                      {/* Deal Health & Dollar Volume highlight */}
                      <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-1">
                        <span className="text-sm font-black font-sans text-brand-alt">
                          ${deal.value.toLocaleString()}
                        </span>
                        <div>
                          {getHealthBadge(deal.status)}
                        </div>
                      </div>

                      {/* Quick delete actions */}
                      <div className="shrink-0 pl-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => handleDeleteDeal(deal.id, e)}
                          className="p-1 px-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-xs"
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

          {/* Tabs bar selector */}
          <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 py-2 gap-4 shrink-0 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setDrawerTab("ai")}
              className={`pb-2 pt-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                drawerTab === "ai" 
                  ? "border-indigo-600 text-indigo-700 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              ✨ AI Intelligence
            </button>
            <button
              onClick={() => setDrawerTab("account")}
              className={`pb-2 pt-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                drawerTab === "account" 
                  ? "border-indigo-600 text-indigo-700 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              🏢 Account & Buying Committee
            </button>
            <button
              onClick={() => setDrawerTab("tasks")}
              className={`pb-2 pt-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer shrink-0 ${
                drawerTab === "tasks" 
                  ? "border-indigo-600 text-indigo-700 font-bold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              ✅ Actions & Logs
            </button>
          </div>

          {/* Drawer Body content (scrolls) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin bg-white animate-fade-in">
            
            {drawerTab === "ai" && (
              <div className="space-y-6">
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
              </div>
            )}

            {drawerTab === "account" && (
              <div className="space-y-6">
                {/* Account details */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5 space-y-4 text-slate-800">
                  <h4 className="text-xs uppercase font-bold tracking-widest text-slate-550 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    Corporate Account Hierarchy Context
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Parent Company Group</label>
                      <input 
                        type="text"
                        value={parentCompany}
                        onChange={(e) => setParentCompany(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Business Unit / Department</label>
                      <input 
                        type="text"
                        value={businessUnit}
                        onChange={(e) => setBusinessUnit(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 font-semibold text-slate-700 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Org tree builder preview */}
                <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-xs text-slate-800">
                  <h4 className="text-xs uppercase font-bold tracking-widest text-slate-600 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Interactive Company Org Hierarchy Map
                  </h4>
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center">
                    {/* Root company node */}
                    <div className="bg-indigo-600 text-white rounded-xl py-2 px-4 shadow-sm border border-indigo-700 font-bold text-xs">
                      🏢 {parentCompany} (Parent Organization)
                    </div>
                    <div className="w-0.5 h-6 bg-slate-250" />
                    {/* Business unit node */}
                    <div className="bg-white border border-slate-250 text-slate-800 rounded-xl py-1.5 px-3 shadow-xs font-semibold text-[11px]">
                      📂 {businessUnit} (Subsidiary)
                    </div>
                    <div className="w-0.5 h-6 bg-slate-250" />
                    
                    {/* Horizontal connector line for children */}
                    <div className="w-full max-w-sm flex items-center pr-1.5 pl-1.5 select-none">
                      <div className="grow h-0.5 bg-slate-250" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-350" />
                      <div className="grow h-0.5 bg-slate-250" />
                    </div>
                    
                    {/* Buying committee members nodes */}
                    <div className="grid grid-cols-3 gap-2 w-full max-w-md pt-2">
                      {buyingCommittee.map((m, idx) => (
                        <div key={idx} className="bg-white border border-slate-250 rounded-xl p-2.5 shadow-xs text-center space-y-1">
                          <div className="text-[10px] font-bold text-slate-800 truncate">{m.name}</div>
                          <div className="text-[8.5px] text-slate-400 font-medium truncate">{m.role}</div>
                          <div className="pt-1 flex justify-center">
                            <span className="text-[7.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-stone-100 text-slate-700">
                              {m.seniority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Buying Committee list table / editor */}
                <div className="space-y-4 text-slate-800">
                  <h4 className="text-xs uppercase font-bold tracking-widest text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      Stakeholder Buying Committee Mapping
                    </span>
                    <span className="text-[8.5px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-500">{buyingCommittee.length} Stakeholders</span>
                  </h4>

                  {/* Add stakeholder form */}
                  <div className="bg-slate-50 border border-slate-150 border-dashed rounded-xl p-4 space-y-3">
                    <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Map New Stakeholder Card</div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <input 
                        type="text" 
                        placeholder="Stakeholder Name..." 
                        value={newCommitteeName}
                        onChange={e => setNewCommitteeName(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500"
                      />
                      <input 
                        type="text" 
                        placeholder="Corporate Role / Title..." 
                        value={newCommitteeRole}
                        onChange={e => setNewCommitteeRole(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-indigo-500"
                      />
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Influence Level</label>
                        <select
                          value={newCommitteeInfluence}
                          onChange={e => setNewCommitteeInfluence(e.target.value as any)}
                          className="bg-white border border-slate-200 text-slate-700 rounded-xl py-2 px-3 outline-none cursor-pointer"
                        >
                          <option value="high">🔥 High Influence</option>
                          <option value="medium">⚡ Medium Influence</option>
                          <option value="low">🌱 Low Influence</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase">Seniority Title</label>
                        <select
                          value={newCommitteeSeniority}
                          onChange={e => setNewCommitteeSeniority(e.target.value as any)}
                          className="bg-white border border-slate-200 text-slate-700 rounded-xl py-2 px-3 outline-none cursor-pointer"
                        >
                          <option value="C-Level">🏆 C-Level Exec</option>
                          <option value="VP">⭐ VP Senior</option>
                          <option value="Director">💼 Director</option>
                          <option value="Manager">🧑‍💼 Manager</option>
                          <option value="Contributor">💻 Contributor</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-1.5 border-t border-slate-200">
                      <div className="flex items-center gap-2 grow min-w-[150px]">
                        <span className="text-[9px] font-bold text-slate-400 uppercase whitespace-nowrap">Engagement: {newCommitteeEngagement}%</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={newCommitteeEngagement}
                          onChange={e => setNewCommitteeEngagement(Number(e.target.value))}
                          className="grow h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
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
                        className="px-3.5 py-1.5 text-[10px] bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg font-bold transition-all cursor-pointer"
                      >
                        + Map Lead Stakeholder
                      </button>
                    </div>
                  </div>

                  {/* Operational Committee Table view */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full border-collapse text-left text-xs text-slate-800">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400 font-mono">
                          <th className="py-2.5 px-3">Stakeholder</th>
                          <th className="py-2.5 px-3">Company Level</th>
                          <th className="py-2.5 px-3">Influence</th>
                          <th className="py-2.5 px-3">Engagement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {buyingCommittee.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800">{m.name}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{m.role}</div>
                            </td>
                            <td className="py-2.5 px-3 text-[10.5px] font-semibold text-slate-600">{m.seniority}</td>
                            <td className="py-2.5 px-3">
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                m.influence === 'high' ? 'bg-rose-50 text-rose-600 border border-rose-200/50' : m.influence === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-200/50' : 'bg-slate-50 text-slate-500 border border-slate-200/50'
                              }`}>
                                {m.influence}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-full rounded-full ${m.engagementScore >= 80 ? 'bg-emerald-500' : m.engagementScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${m.engagementScore}%` }} />
                                </div>
                                <span className="font-mono text-[9px] font-bold text-slate-500">{m.engagementScore}%</span>
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
              <div className="space-y-8 animate-fade-in">
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
            <div className="space-y-6 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-extrabold tracking-widest text-slate-600 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600 animate-pulse" />
                  Chronological Journey & Outreach
                </h4>
                <div className="text-[10px] bg-slate-100 py-0.5 px-2 text-slate-500 rounded-full font-mono">
                  {dealActivities.length} logs
                </div>
              </div>

              {/* Omnichannel Compose logger */}
              <div className="border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden shadow-xs">
                {/* Channel Selector Bar */}
                <div className="flex border-b border-slate-200 bg-white">
                  <button 
                    onClick={() => { setLogType("note"); setAiCallAnalysisResult(null); setAiEmailAnalysisResult(null); }}
                    className={`flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                      logType === "note" 
                        ? "border-blue-500 text-blue-600 bg-blue-50/20" 
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    📝 Note
                  </button>
                  <button 
                    onClick={() => { setLogType("call"); setAiCallAnalysisResult(null); setAiEmailAnalysisResult(null); }}
                    className={`flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                      logType === "call" 
                        ? "border-emerald-500 text-emerald-600 bg-emerald-50/20" 
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    📞 Call Log
                  </button>
                  <button 
                    onClick={() => { setLogType("email"); setAiCallAnalysisResult(null); setAiEmailAnalysisResult(null); }}
                    className={`flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border-b-2 ${
                      logType === "email" 
                        ? "border-amber-500 text-amber-600 bg-amber-50/20" 
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    ✉️ Email outreach
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Email-specific fields */}
                  {logType === "email" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-left">Email Subject Header</label>
                      <input 
                        type="text"
                        placeholder="e.g. Scaling GTM efficiency benchmarks at their company..."
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl py-2 px-3 text-xs outline-none focus:border-amber-400"
                      />
                    </div>
                  )}

                  {/* Main Inputs Area */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-left">
                        {logType === "note" && "Add General Persistent Memo"}
                        {logType === "call" && "Paste Call transcripts or raw verbal notes"}
                        {logType === "email" && "Draft Outreach email body concept or prompt"}
                      </label>
                      
                      {/* AI Assisted Trigger buttons */}
                      {logType === "call" && !isAnalyzingCrmHelp && (
                        <button 
                          onClick={handleAnalyzeCallNotes}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          ✨ AI Call Analyst
                        </button>
                      )}
                      {logType === "email" && !isAnalyzingCrmHelp && (
                        <button 
                          onClick={handleImproveEmailDraft}
                          className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          🪄 AI professional Drafter
                        </button>
                      )}
                    </div>

                    <textarea
                      placeholder={
                        logType === "note" 
                          ? "Write a strategic persistent workspace memo..." 
                          : logType === "call" 
                            ? "e.g. Had structured review call with Marcus. Agreed pricing is right, but must deliver proof of concept next Tuesday. Sarah is assigned SLA..." 
                            : "e.g. Hey Marcus, following up on our social chat regarding email warmups. Let me know if Tuesday is open..."
                      }
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl p-3 text-xs outline-none focus:border-indigo-400 h-24 resize-none select-text focus:ring-1 focus:ring-indigo-400 shadow-xs text-left"
                    />
                  </div>

                  {/* Loading states for AI processing */}
                  {isAnalyzingCrmHelp && (
                    <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3 animate-pulse text-left">
                      <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-indigo-800 block">Gemini AI GTM Intelligence Copilot</span>
                        <p className="text-[9px] text-indigo-600 leading-relaxed">Processing client interactions to enrich communications and extract SLA checklist actions...</p>
                      </div>
                    </div>
                  )}

                  {/* AI Call Logs Assist Outputs */}
                  {logType === "call" && aiCallAnalysisResult && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4.5 space-y-3.5 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-800">Gemini Call Log Analysis Results</span>
                        </div>
                        {/* Sentiment Pill */}
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          aiCallAnalysisResult.sentiment === "Positive" ? "bg-emerald-100 text-emerald-800" :
                          aiCallAnalysisResult.sentiment === "Neutral" ? "bg-slate-100 text-slate-800" :
                          "bg-rose-100 text-rose-800 animate-pulse"
                        }`}>
                          Sentiment: {aiCallAnalysisResult.sentiment || 'Neutral'}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="text-[11px] leading-relaxed text-slate-700 bg-white p-2.5 border border-slate-100 rounded-lg">
                          <strong className="text-emerald-800 text-[10px] block mb-1 uppercase tracking-wider">Executive Conversation Summary:</strong>
                          {aiCallAnalysisResult.summary}
                        </div>

                        {aiCallAnalysisResult.key_points && aiCallAnalysisResult.key_points.length > 0 && (
                          <div className="space-y-1">
                            <strong className="text-slate-500 text-[9px] uppercase tracking-wider font-mono">Discovered Focus Points:</strong>
                            <ul className="space-y-1">
                              {aiCallAnalysisResult.key_points.map((p: string, idx: number) => (
                                <li key={idx} className="text-[10px] text-slate-600 flex items-start gap-1.5">
                                  <span className="text-emerald-500 mt-0.5 select-none">•</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiCallAnalysisResult.risk_analysis && (
                          <p className="text-[10px] text-slate-500 leading-relaxed italic bg-yellow-50/20 p-2 border border-yellow-105/30 rounded-lg">
                            <span className="font-bold text-yellow-800 not-italic block uppercase text-[8px] tracking-wider mb-0.5">Identified Deal friction:</span>
                            {aiCallAnalysisResult.risk_analysis}
                          </p>
                        )}

                        {/* Extracted Auto action list */}
                        {aiCallAnalysisResult.extracted_tasks && aiCallAnalysisResult.extracted_tasks.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-emerald-100/50">
                            <span className="text-[9px] text-emerald-800 font-extrabold uppercase tracking-wider block">⚡ Auto-Scheduled followups (Created on log publish)</span>
                            <div className="space-y-1.5">
                              {aiCallAnalysisResult.extracted_tasks.map((t: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-white border border-emerald-100 px-2.5 py-1.5 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-[11px] font-medium text-slate-700">{t.title}</span>
                                  </div>
                                  <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">SLA: {t.dueDate}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Email Outreach Assist Outputs */}
                  {logType === "email" && aiEmailAnalysisResult && (
                    <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4.5 space-y-3.5 text-left animate-fade-in text-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-600 animate-spin-pulse" />
                          <span className="text-xs font-bold text-amber-800">Gemini B2B Outreach Rephrase</span>
                        </div>
                        <button 
                          onClick={() => {
                            if (aiEmailAnalysisResult.improved_body) {
                              setNewNoteText(aiEmailAnalysisResult.improved_body);
                            }
                            if (aiEmailAnalysisResult.improved_subject) {
                              setEmailSubject(aiEmailAnalysisResult.improved_subject);
                            }
                            showToast("Applied AI composition into raw log area.", "success");
                          }}
                          className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[9px] font-bold cursor-pointer"
                        >
                          Apply Draft
                        </button>
                      </div>

                      <div className="space-y-2 text-slate-700">
                        <div className="bg-white p-2 border border-slate-150 rounded-lg text-[10px]">
                          <span className="text-amber-750 text-[8px] uppercase tracking-wider font-extrabold block">Rephrased Subject Proposal:</span>
                          <span className="font-semibold block mt-0.5 text-slate-800">{aiEmailAnalysisResult.improved_subject}</span>
                        </div>

                        <div className="bg-white p-3 border border-slate-150 rounded-lg text-[10px] leading-relaxed whitespace-pre-wrap font-mono">
                          <span className="text-amber-750 text-[8px] uppercase tracking-wider font-extrabold block not-mono mb-2">Rephrased Email Body:</span>
                          {aiEmailAnalysisResult.improved_body}
                        </div>

                        {aiEmailAnalysisResult.reasoning && (
                          <div className="text-[9px] text-slate-400 italic">
                            Tactical reasoning: {aiEmailAnalysisResult.reasoning}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Log Action Button Row */}
                  <div className="flex justify-end pt-1 border-t border-slate-150">
                    <button 
                      onClick={handlePublishOmnichannelLog}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <span>Publish {logType.toUpperCase()} Record</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Chronological Communication Journals */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-left">CHRONOLOGICAL COMMUNICATION TIMELINE</span>
                
                <div className="relative border-l-2 border-slate-100 pl-5 pr-1 space-y-6 text-left">
                  {dealActivities.length === 0 ? (
                    <div className="text-center py-6 select-none">
                      <p className="text-[10px] italic text-slate-400 font-mono">Timeline empty. Publish communications logs or notes above to initiate history tracker.</p>
                    </div>
                  ) : (
                    dealActivities.map((act) => {
                      // Get custom icon styling based on log type!
                      let iconNode = <FileText className="w-3.5 h-3.5 text-slate-500" />;
                      let bulletBg = "bg-slate-100 border-slate-300";
                      let headerLabel = act.title;

                      if (act.type === "call_logged") {
                        iconNode = <Phone className="w-3.5 h-3.5 text-emerald-600" />;
                        bulletBg = "bg-emerald-50 border-emerald-200";
                      } else if (act.type === "email_sent") {
                        iconNode = <Mail className="w-3.5 h-3.5 text-amber-600" />;
                        bulletBg = "bg-amber-55/30 border-amber-200";
                      } else if (act.type === "stage_changed") {
                        iconNode = <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />;
                        bulletBg = "bg-indigo-50 border-indigo-200";
                      }

                      return (
                        <div key={act.id} className="relative space-y-1.5 group select-text">
                          {/* Rich Floating Timeline Anchor Icon */}
                          <div className={`absolute -left-[30px] top-0 w-8 h-8 rounded-full border-2 ${bulletBg} flex items-center justify-center shadow-xs bg-white group-hover:scale-105 transition-all`}>
                            {iconNode}
                          </div>
                          
                          <div className="pl-2 space-y-1">
                            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                              <span className="truncate max-w-[280px]">{headerLabel}</span>
                              <span className="text-[8px] text-slate-400 font-mono bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                                {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                            
                            <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap select-text bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 group-hover:bg-slate-50 transition-all font-sans">
                              {act.description}
                            </p>
                            
                            <div className="text-[8.5px] text-slate-400 italic flex items-center gap-1.5 pt-0.5 select-none font-mono pl-1">
                              <User className="w-3 h-3 opacity-60 text-slate-400" />
                              <span>Operator: <strong className="font-semibold text-slate-500">{act.agentName || "System Workspace"}</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            </div>
            )}

          </div>
        </div>
      )}

      {/* ADD CUSTOM PIPELINE COLUMN MODAL */}
      {showAddColumnModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-left space-y-6 animate-in fade-in-50 zoom-in-95 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Add Custom Pipeline Stage
              </h3>
              <button onClick={() => setShowAddColumnModal(false)} className="text-slate-450 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Stage/Column Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Beta tester, Qualified Lead..."
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 select-text transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Theme Color</label>
                <div className="flex flex-wrap gap-2 pt-1">
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
                      className={`w-6 h-6 rounded-full relative transition-transform ${newColumnColor === colorObj.hex ? "ring-2 ring-slate-800 scale-110" : "opacity-80 hover:opacity-100"}`}
                      style={{ backgroundColor: colorObj.hex }}
                      title={colorObj.label}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-400">Custom Hex:</span>
                  <input
                    type="text"
                    value={newColumnColor}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">SLA Days Limit</label>
                  <input 
                    type="number"
                    min="1"
                    value={newColumnSlaDays}
                    onChange={(e) => setNewColumnSlaDays(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Close Probability (%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={newColumnProbability}
                    onChange={(e) => setNewColumnProbability(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button 
                onClick={() => setShowAddColumnModal(false)}
                className="bg-white border border-slate-250 text-slate-500 hover:bg-slate-50 py-2.5 px-4 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddPipelineColumn}
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create Column
              </button>
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
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Associated Lead Target</label>
                    {newDealLeadId && (
                      <button 
                        onClick={handleEstimateDealValue}
                        disabled={isEstimatingDeal}
                        className="text-[9px] font-extrabold text-indigo-650 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        {isEstimatingDeal ? "AI..." : "AI Suggest?"}
                      </button>
                    )}
                  </div>
                  <select 
                    value={newDealLeadId}
                    onChange={(e) => setNewDealLeadId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 transition-all text-left"
                  >
                    <option value="">Select Target...</option>
                    {initialLeads.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Deal Value Volume ($)</label>
                  <input 
                    type="number"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-255 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pipeline Stage Target</label>
                  <select 
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 text-left"
                  >
                    {activePipeline?.stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Assigned Client Agent</label>
                  <select 
                    value={newDealAgent}
                    onChange={(e) => setNewDealAgent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none focus:border-blue-500 text-left"
                  >
                    <option value="Sarah Mitchell">Sarah Mitchell</option>
                    <option value="James Ochieng">James Ochieng</option>
                    <option value="User Pro">User Pro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tags Config (comma separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. Enterprise, High-Value, SaaS"
                  value={newDealTags}
                  onChange={(e) => setNewDealTags(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 text-slate-850 rounded-xl py-2 px-3 text-xs outline-none select-text focus:border-blue-500 transition-all text-left"
                />
              </div>

              {/* Running AI Estimate Loading Sentry */}
              {isEstimatingDeal && (
                <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center gap-2 animate-pulse text-left">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  <span className="text-[10px] font-bold text-indigo-800">Scoring lead parameters and mapping segment value via Gemini...</span>
                </div>
              )}

              {/* Strategy Output plan */}
              {aiDealStrategyResult && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-[10px] leading-relaxed text-slate-700 space-y-1 animate-fade-in text-left">
                  <span className="font-extrabold text-indigo-800 uppercase text-[8px] tracking-wider block">🎯 Recommended Account Close Tactics & Plan</span>
                  <p>{aiDealStrategyResult}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => { setShowAddDealModal(false); setAiDealStrategyResult(null); }}
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
