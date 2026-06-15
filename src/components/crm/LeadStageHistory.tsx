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
            
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div >
              <div>
                <h2 >Stage Audit Trail</h2>
                <p >{leadName}</p>
              </div>
              <button onClick={onClose} >
                <X  />
              </button>
            </div>

            {/* Content */}
            <div >
              {loading ? (
                <div >
                  <div ></div>
                </div>
              ) : history.length === 0 ? (
                <div >
                  No stage changes recorded for this lead.
                </div>
              ) : (
                <div >
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
                      <div key={entry.id || index} >
                        {/* Timeline node icon */}
                        <span >
                          {isSlaBreached ? (
                            <AlertCircle  />
                          ) : (
                            <Clock  />
                          )}
                        </span>

                        {/* Audit card */}
                        <div >
                          <div >
                            <span>By {entry.changedByName}</span>
                            <span>{dateStr}</span>
                          </div>

                          <div >
                            {entry.fromStage && (
                              <>
                                <span
                                  
                                  style={{ color: fromStage.color, backgroundColor: `${fromStage.color}15` }}
                                >
                                  {fromStage.label}
                                </span>
                                <ArrowRight  />
                              </>
                            )}
                            <span
                              
                              style={{ color: toStage.color, backgroundColor: `${toStage.color}15` }}
                            >
                              {toStage.label}
                            </span>
                          </div>

                          {/* SLA metrics */}
                          {daysSpent !== null && toStage.slaDays > 0 && (
                            <div >
                              <span >SLA Limit: {toStage.slaDays} days</span>
                              <span >
                                {isSlaBreached
                                  ? `Breached (${daysSpent} days)`
                                  : `Under Limit (${daysSpent} days)`}
                              </span>
                            </div>
                          )}

                          {entry.notes && (
                            <p >
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
