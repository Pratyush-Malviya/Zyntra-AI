import React, { useState, useEffect } from "react";
import { Kanban, List, Plus, Search, X, ChevronRight, Trash2, Briefcase, Check, FileText } from "lucide-react";
import { motion } from "motion/react";

interface Lead {
  id: string; name: string; role: string; company: string; email: string; phone: string;
  status: "imported" | "generated" | "sent"; score: number;
}

interface Deal {
  id: string; leadId: string; title: string; value: number; stage: string; createdAt: string;
}

interface PipelineStage { id: string; name: string; color: string; probability: number; slaDays: number; statuses: string[]; }
interface Pipeline { id: string; name: string; stages: PipelineStage[]; }

interface CrmPipelineBoardProps {
  leads: Lead[];
  onLeadsUpdated?: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  profile?: any;
}

const STAGES: PipelineStage[] = [
  { id: 'lead', name: 'Lead', color: '#ff7043', probability: 10, slaDays: 14, statuses: ['imported'] },
  { id: 'prospect', name: 'Prospect', color: '#ffb300', probability: 25, slaDays: 14, statuses: ['generated'] },
  { id: 'active', name: 'Active', color: '#26a69a', probability: 50, slaDays: 10, statuses: [] },
  { id: 'negotiation', name: 'Negotiation', color: '#42a5f5', probability: 75, slaDays: 7, statuses: [] },
  { id: 'closed', name: 'Closed Won', color: '#66bb6a', probability: 100, slaDays: 0, statuses: ['sent'] },
];

export const CrmPipelineBoard: React.FC<CrmPipelineBoardProps> = ({ leads, showToast }) => {
  const [viewType, setViewType] = useState<"kanban" | "list">("kanban");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealValue, setNewDealValue] = useState(25000);
  const [newDealLeadId, setNewDealLeadId] = useState("");
  const [newDealStage, setNewDealStage] = useState(STAGES[0].id);
  const [noteDraftText, setNoteDraftText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [pulsingColumnId, setPulsingColumnId] = useState<string | null>(null);
  const [mobileActiveStageId, setMobileActiveStageId] = useState<string>(STAGES[0].id);

  const loadDeals = async () => {
    try {
      const res = await fetch("/api/deals");
      if (res.ok) setDeals(await res.json());
    } catch {}
  };

  useEffect(() => { loadDeals(); }, [leads]);

  const updateDeal = async (id: string, updates: any) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    try {
      await fetch(`/api/deals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    } catch {}
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("text/plain", dealId);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain");
    const dragged = deals.find(d => d.id === dealId);
    if (!dragged || dragged.stage === targetStageId) return;

    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: targetStageId } : d));
    setPulsingColumnId(targetStageId);
    setTimeout(() => setPulsingColumnId(null), 1200);

    try {
      const res = await fetch(`/api/deals/${dealId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: targetStageId }) });
      if (res.ok) { showToast("Deal moved!", "success"); loadDeals(); }
      else showToast("Failed to update deal.", "error");
    } catch { showToast("Network error.", "error"); }
  };

  const createDeal = async () => {
    if (!newDealTitle || !newDealLeadId) { showToast("Title and lead required.", "error"); return; }
    try {
      const res = await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newDealTitle, value: Number(newDealValue), leadId: newDealLeadId, stage: newDealStage }) });
      if (res.ok) { showToast("Deal created!", "success"); setShowAddDealModal(false); setNewDealTitle(""); loadDeals(); }
      else showToast("Failed to create deal.", "error");
    } catch { showToast("Network error.", "error"); }
  };

  const deleteDeal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this deal?")) return;
    try { await fetch(`/api/deals/${id}`, { method: "DELETE" }); setSelectedDeal(null); loadDeals(); showToast("Deal deleted.", "info"); }
    catch { showToast("Failed to delete.", "error"); }
  };

  const saveSummaryNote = async (dealId: string, text: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, summaryNote: text } : d));
    setEditingNoteId(null);
    try { await fetch(`/api/deals/${dealId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summaryNote: text }) }); }
    catch {}
  };

  const filteredDeals = deals.filter(d => {
    const lead = leads.find(l => l.id === d.leadId);
    const q = searchQuery.toLowerCase();
    return d.title.toLowerCase().includes(q) || (lead?.name || "").toLowerCase().includes(q) || (lead?.company || "").toLowerCase().includes(q);
  });

  return (
    <div className="bg-surface border border-border rounded-3xl p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <h2 className="text-xl font-bold">Pipeline Board</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddDealModal(true)} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-bold flex items-center gap-1.5"><Plus className="w-4 h-4" /> Deal</button>
          <div className="flex bg-bg-secondary p-1 rounded-xl border border-border">
            <button onClick={() => setViewType("kanban")} className={`p-1.5 rounded-lg text-xs ${viewType === "kanban" ? "bg-surface shadow-sm font-bold" : "text-text-muted"}`}><Kanban className="w-4 h-4" /></button>
            <button onClick={() => setViewType("list")} className={`p-1.5 rounded-lg text-xs ${viewType === "list" ? "bg-surface shadow-sm font-bold" : "text-text-muted"}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted/65" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search deals, contacts, companies..." className="w-full bg-bg-primary border border-border rounded-xl py-2 pl-10 pr-4 text-sm" />
      </div>

      {viewType === "kanban" ? (
        <div className="space-y-4">
          {/* Mobile stage tabs */}
          <div className="flex md:hidden gap-1.5 overflow-x-auto pb-2">
            {STAGES.map(s => (
              <button key={s.id} onClick={() => setMobileActiveStageId(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${mobileActiveStageId === s.id ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text-muted'}`}>
                {s.name} ({filteredDeals.filter(d => d.stage === s.id).length})
              </button>
            ))}
          </div>
          {/* Desktop columns */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map(stage => {
              const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
              const cumulativeValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
              const isMobileHidden = mobileActiveStageId !== stage.id;
              return (
                <motion.div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, stage.id)}
                  animate={pulsingColumnId === stage.id ? { scale: [1, 1.015, 1] } : {}}
                  className={`flex flex-col bg-bg-secondary/40 border rounded-2xl min-w-[280px] max-w-[300px] shrink-0 h-[500px] ${pulsingColumnId === stage.id ? 'border-brand' : 'border-border'} ${isMobileHidden ? 'hidden md:flex' : 'flex'}`}>
                  {/* Stage header */}
                  <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl" style={{ backgroundColor: stage.color }}>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">{stage.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold text-white bg-black/20">{stageDeals.length}</span>
                    </div>
                  </div>
                  {/* Cards */}
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    <div className="text-[10px] text-text-muted font-mono flex items-center justify-between px-2 py-1 bg-bg-primary border border-border rounded-lg">
                      <span>Prob: {stage.probability}%</span>
                      <span className="text-brand-alt font-bold">${cumulativeValue.toLocaleString()}</span>
                    </div>
                    {stageDeals.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-xl">
                        <Briefcase className="w-6 h-6 text-text-muted opacity-50 mb-1" />
                        <span className="text-xs text-text-muted">No deals</span>
                      </div>
                    ) : stageDeals.map(deal => {
                      const lead = leads.find(l => l.id === deal.leadId);
                      return (
                        <motion.div key={deal.id} layout draggable onDragStart={e => handleDragStart(e, deal.id)}
                          onClick={() => { setSelectedDeal(deal); setNoteDraftText(""); }}
                          className={`bg-surface border rounded-xl p-3 cursor-grab active:cursor-grabbing space-y-2 transition-all ${selectedDeal?.id === deal.id ? 'border-brand bg-brand/5' : 'border-border hover:border-text-muted'}`}>
                          <div className="flex items-start justify-between gap-1">
                            <h5 className="text-sm font-bold truncate">{deal.title}</h5>
                            <button onClick={e => deleteDeal(deal.id, e)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                          <div className="text-xs text-text-muted">{lead?.name || "Unassigned"} <span className="opacity-50">@{lead?.company || "N/A"}</span></div>
                          <div className="flex items-center justify-between border-t border-border pt-1.5">
                            <span className="text-sm font-bold text-brand-alt">${deal.value.toLocaleString()}</span>
                            <span className="text-xs font-bold text-brand">{lead?.score || 0}%</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {filteredDeals.length === 0 ? (
            <div className="py-12 text-center text-sm text-text-muted">No deals found.</div>
          ) : (
            filteredDeals.map(deal => {
              const lead = leads.find(l => l.id === deal.leadId);
              const stage = STAGES.find(s => s.id === deal.stage);
              return (
                <motion.div key={deal.id} layout onClick={() => setSelectedDeal(deal)}
                  className={`bg-surface border rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all hover:border-brand/30 ${selectedDeal?.id === deal.id ? 'border-brand bg-brand/5' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center font-bold text-brand">{deal.title[0]}</div>
                    <div>
                      <p className="font-medium">{deal.title}</p>
                      <p className="text-xs text-text-muted">{lead?.name || "Unassigned"} {lead?.company && <span>@{lead.company}</span>}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {stage && <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: stage.color + '20', color: stage.color }}>{stage.name}</span>}
                    <span className="font-bold text-brand-alt">${deal.value.toLocaleString()}</span>
                    <button onClick={e => deleteDeal(deal.id, e)} className="p-1 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Deal detail sidebar */}
      {selectedDeal && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-surface border-l border-border shadow-2xl flex flex-col">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Deal Detail</p>
              <h3 className="text-lg font-bold">{selectedDeal.title}</h3>
            </div>
            <button onClick={() => setSelectedDeal(null)} className="p-1.5 rounded-lg hover:bg-bg-secondary"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-text-muted">Value</p><p className="font-bold text-brand-alt">${selectedDeal.value.toLocaleString()}</p></div>
              <div><p className="text-xs text-text-muted">Stage</p><p className="font-bold">{STAGES.find(s => s.id === selectedDeal.stage)?.name || selectedDeal.stage}</p></div>
              <div><p className="text-xs text-text-muted">Lead</p><p className="font-bold">{leads.find(l => l.id === selectedDeal.leadId)?.name || "Unassigned"}</p></div>
              <div><p className="text-xs text-text-muted">Created</p><p className="font-bold">{selectedDeal.createdAt ? new Date(selectedDeal.createdAt).toLocaleDateString() : "N/A"}</p></div>
            </div>

            {/* Summary Note */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Notes</h4>
              {editingNoteId === selectedDeal.id ? (
                <div className="space-y-2">
                  <textarea autoFocus value={noteDraftText} onChange={e => setNoteDraftText(e.target.value)}
                    className="w-full bg-bg-primary border border-border rounded-lg p-2 text-sm h-20 resize-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingNoteId(null)} className="px-3 py-1 rounded-lg bg-bg-secondary text-sm">Cancel</button>
                    <button onClick={() => saveSummaryNote(selectedDeal.id, noteDraftText)} className="px-3 py-1 rounded-lg bg-brand text-white text-sm flex items-center gap-1"><Check className="w-3 h-3" /> Save</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => { setEditingNoteId(selectedDeal.id); setNoteDraftText((selectedDeal as any).summaryNote || ""); }}
                  className="p-3 rounded-lg bg-bg-secondary border border-border cursor-pointer hover:border-brand/30 transition-colors">
                  {(selectedDeal as any).summaryNote ? (
                    <p className="text-sm italic">{(selectedDeal as any).summaryNote}</p>
                  ) : (
                    <p className="text-sm text-text-muted italic flex items-center gap-1"><FileText className="w-4 h-4" /> Add note...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create deal modal */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold"><Plus className="w-4 h-4 inline" /> New Deal</h3>
              <button onClick={() => setShowAddDealModal(false)} className="p-1"><X className="w-4 h-4" /></button>
            </div>
            <input value={newDealTitle} onChange={e => setNewDealTitle(e.target.value)} placeholder="Deal title" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={newDealValue} onChange={e => setNewDealValue(Number(e.target.value))} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm" />
              <select value={newDealLeadId} onChange={e => setNewDealLeadId(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm">
                <option value="">Select lead...</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company})</option>)}
              </select>
            </div>
            <select value={newDealStage} onChange={e => setNewDealStage(e.target.value)} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm">
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddDealModal(false)} className="px-4 py-2 rounded-lg bg-bg-secondary text-sm">Cancel</button>
              <button onClick={createDeal} className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-bold">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
