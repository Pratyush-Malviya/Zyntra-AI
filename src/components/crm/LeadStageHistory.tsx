import React, { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, orderBy } from '../../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import type { LeadStageHistory as StageHistoryType, PipelineStage } from '../../services/firestoreSchema';
import { PIPELINE_STAGES } from '../../services/firestoreSchema';

interface LeadStageHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}

export default function LeadStageHistory({ isOpen, onClose, leadId, leadName }: LeadStageHistoryProps) {
  const [history, setHistory] = useState<StageHistoryType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId || !isOpen) return;

    setLoading(true);
    const q = query(
      collection(db, 'lead_stage_history'),
      where('leadId', '==', leadId),
      orderBy('changedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StageHistoryType[];
      setHistory(entries);
      setLoading(false);
    }, (error) => {
      console.error("Error loading stage history:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [leadId, isOpen]);

  const getStageConfig = (stageId: PipelineStage | null) => {
    if (!stageId) return { label: 'None', color: '#64748b', slaDays: 0 };
    return PIPELINE_STAGES.find(s => s.id === stageId) || { label: stageId, color: '#64748b', slaDays: 0 };
  };

  const calculateDuration = (entry: StageHistoryType, nextEntry?: StageHistoryType) => {
    if (!entry.changedAt) return null;
    const start = entry.changedAt.toDate ? entry.changedAt.toDate() : new Date(entry.changedAt);
    const end = nextEntry?.changedAt
      ? (nextEntry.changedAt.toDate ? nextEntry.changedAt.toDate() : new Date(nextEntry.changedAt))
      : new Date();

    const diffMs = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col shadow-2xl"
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-text">Stage Audit Trail</h2>
                <p className="text-xs text-text-secondary">{leadName}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-sm text-text-secondary">
                  No stage changes recorded for this lead.
                </div>
              ) : (
                <div className="relative border-l-2 border-border pl-6 ml-3 space-y-8">
                  {history.map((entry, index) => {
                    const fromStage = getStageConfig(entry.fromStage);
                    const toStage = getStageConfig(entry.toStage);
                    const nextEntry = index > 0 ? history[index - 1] : undefined;
                    const daysSpent = calculateDuration(entry, nextEntry);
                    const isSlaBreached = daysSpent !== null && toStage.slaDays > 0 && daysSpent > toStage.slaDays;
                    const dateStr = entry.changedAt?.toDate
                      ? entry.changedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Just now';

                    return (
                      <div key={entry.id || index} className="relative">
                        {/* Timeline node icon */}
                        <span className="absolute -left-[35px] top-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-surface border-2 border-border">
                          {isSlaBreached ? (
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-text-secondary" />
                          )}
                        </span>

                        {/* Audit card */}
                        <div className="bg-surface-elevated border border-border rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between text-2xs text-text-secondary">
                            <span>By {entry.changedByName}</span>
                            <span>{dateStr}</span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {entry.fromStage && (
                              <>
                                <span
                                  className="px-2 py-0.5 rounded-full text-3xs font-semibold"
                                  style={{ color: fromStage.color, backgroundColor: `${fromStage.color}15` }}
                                >
                                  {fromStage.label}
                                </span>
                                <ArrowRight className="w-3 h-3 text-text-secondary" />
                              </>
                            )}
                            <span
                              className="px-2 py-0.5 rounded-full text-3xs font-bold"
                              style={{ color: toStage.color, backgroundColor: `${toStage.color}15` }}
                            >
                              {toStage.label}
                            </span>
                          </div>

                          {/* SLA metrics */}
                          {daysSpent !== null && toStage.slaDays > 0 && (
                            <div className="flex items-center justify-between text-3xs border-t border-border/50 pt-2">
                              <span className="text-text-secondary">SLA Limit: {toStage.slaDays} days</span>
                              <span className={`font-semibold ${isSlaBreached ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isSlaBreached
                                  ? `Breached (${daysSpent} days)`
                                  : `Under Limit (${daysSpent} days)`}
                              </span>
                            </div>
                          )}

                          {entry.notes && (
                            <p className="text-xs text-text-secondary italic bg-surface/30 p-2 rounded-lg border border-border/30 mt-2">
                              "{entry.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
