import React, { useState, useEffect } from 'react';
import { 
  List, Check, MapPin, User, Calendar, Briefcase, Zap, 
  MessageSquare, Mail, Phone, Clock, FileText, Sparkles, TrendingUp, HelpCircle,
  Plus, Minus, Edit2, CheckCircle2, Award, Flame, Target, Settings2, RefreshCw,
  Kanban, Layers, Search, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SdrCalendarView } from './SdrCalendarView';
import { db, collection, query, orderBy, onSnapshot, auth, doc, updateDoc } from '../firebase';

export function SdrWorkspacePanel({ 
  showToast,
  leads = [],
  campaigns = [],
  profile,
  user
}: { 
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  leads?: any[];
  campaigns?: any[];
  profile?: any;
  user?: any;
}) {
  const [activeTab, setActiveTab] = useState<'queue' | 'stats' | 'calendar' | 'leads_pipeline'>('queue');
  const [sdrViewType, setSdrViewType] = useState<'kanban' | 'list'>('kanban');
  const [sdrSearch, setSdrSearch] = useState('');
  const [sdrIndustryFilter, setSdrIndustryFilter] = useState('all');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [pulsingColumnId, setPulsingColumnId] = useState<string | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  const getLeadSdrStage = (lead: any) => {
    const status = lead.status;
    if (status === 'sent') return 'sent';
    if (status === 'failed') return 'failed';
    if (status === 'discovery_call') return 'discovery_call';
    return 'pending'; // default/imported
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    setUpdatingLeadId(leadId);
    try {
      const targetLead = (leads || []).find(l => l.id === leadId);
      if (!targetLead) return;

      // Update in Firestore
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, { status: newStatus });

      showToast(`Lead ${targetLead.name} status updated to ${newStatus === 'discovery_call' ? 'Discovery Call booked' : newStatus}`, 'success');

      // Automatically add deal in AE CRM pipeline
      if (newStatus === 'discovery_call') {
        try {
          const value = targetLead.score ? targetLead.score * 500 : 35000;
          const bodyPayload = {
            title: `${targetLead.company || targetLead.name} Outbound Opportunity`,
            value,
            stage: 'qualification',
            leadId: leadId
          };

          const response = await fetch('/api/deals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-org-id': profile?.orgId || 'org-default',
              'x-user-id': user?.uid || 'user-default',
              'x-user-role': 'manager'
            },
            body: JSON.stringify(bodyPayload)
          });

          if (response.ok) {
            showToast(`🚀 Automatically promoted opportunity to Account Executive Kanban!`, 'success');
          } else {
            console.error("Failed to REST POST sync the opportunity:", await response.text());
          }
        } catch (err) {
          console.error("REST sync failed:", err);
        }
      }
    } catch (err: any) {
      console.error("Firestore update failed:", err);
      showToast("Unable to transition lead stage: " + err.message, "error");
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleLeadDragStart = (e: any, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedLeadId(id);
  };

  const handleLeadDragOver = (e: any, colId: string) => {
    e.preventDefault();
  };

  const handleLeadDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (!id) return;

    setDraggedLeadId(null);
    setPulsingColumnId(targetStatus);
    setTimeout(() => setPulsingColumnId(null), 1200);

    const targetLead = (leads || []).find(l => l.id === id);
    if (!targetLead) return;

    const currentStage = getLeadSdrStage(targetLead);
    if (currentStage === targetStatus) return;

    // Convert 'pending' to 'pending', else use exact string
    const statusValue = targetStatus === 'pending' ? 'imported' : targetStatus;
    await handleUpdateLeadStatus(id, statusValue);
  };

  // Daily Tasks Queue Checklist database
  const [tasks, setTasks] = useState([
    { id: 1, type: 'email', name: 'Femi Taiwo', title: 'Co-founder/CEO, TERAWORK', reason: 'Prospect opened email draft 3x but has not replied.', status: 'unread', done: false },
    { id: 2, type: 'linkedin', name: 'Oluwaseyi Agunbiade', title: 'Director, Caret', reason: 'High intent firmographic match. Connect with a personalized intro note.', status: 'new', done: false },
    { id: 3, type: 'call', name: 'Omilade Olusegun', title: 'Creative Director, TERAWORK', reason: 'Prospect clicked the 20-minute demo CTA link.', status: 'important', done: false },
    { id: 4, type: 'email', name: 'Seyi Caret', title: 'Growth Lead, Caret', reason: 'Send follow-up details on pricing parameters.', status: 'unread', done: false }
  ]);

  // Daily Targets and Volume tracking
  const [callTarget, setCallTarget] = useState(50);
  const [emailTarget, setEmailTarget] = useState(100);
  const [callActual, setCallActual] = useState(18);
  const [emailActual, setEmailActual] = useState(42);

  // Daily Outreach Goal - AI-generated metrics state from 'generation_logs'
  const [aiTarget, setAiTarget] = useState(15);
  const [aiActual, setAiActual] = useState(0);
  const [loadingAiLogs, setLoadingAiLogs] = useState(false);

  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [tempCallTarget, setTempCallTarget] = useState('50');
  const [tempEmailTarget, setTempEmailTarget] = useState('100');
  const [tempAiTarget, setTempAiTarget] = useState('15');

  // Real-time listener for current day's AI-generated messages from 'generation_logs' collection
  useEffect(() => {
    let unsubscribe = () => {};
    setLoadingAiLogs(true);
    try {
      const q = query(collection(db, 'generation_logs'), orderBy('timestamp', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter logs generated today
        const todayLogs = fetchedLogs.filter((log: any) => {
          if (!log.timestamp) return false;
          let date: Date;
          if (typeof log.timestamp.toDate === 'function') {
            date = log.timestamp.toDate();
          } else if (log.timestamp instanceof Date) {
            date = log.timestamp;
          } else if (log.timestamp.seconds) {
            date = new Date(log.timestamp.seconds * 1000);
          } else {
            date = new Date(log.timestamp);
          }

          const today = new Date();
          return date.getDate() === today.getDate() &&
                 date.getMonth() === today.getMonth() &&
                 date.getFullYear() === today.getFullYear();
        });

        // Personal tracking matches user UID
        const currentUserLogs = auth.currentUser 
          ? todayLogs.filter((log: any) => log.userId === auth.currentUser?.uid)
          : todayLogs;

        setAiActual(currentUserLogs.length);
        setLoadingAiLogs(false);
      }, (error) => {
        console.error("Failed to query generation_logs collection in real-time:", error);
        setLoadingAiLogs(false);
      });
    } catch (err) {
      console.error("Firestore setup error on generation_logs stream query:", err);
      setLoadingAiLogs(false);
    }
    return () => unsubscribe();
  }, []);

  // Progress calculations
  const callPercentage = Math.min(100, Math.round((callActual / (callTarget || 1)) * 100));
  const emailPercentage = Math.min(100, Math.round((emailActual / (emailTarget || 1)) * 100));
  const aiPercentage = Math.min(100, Math.round((aiActual / (aiTarget || 1)) * 100));
  
  const isCallGoalMet = callActual >= callTarget;
  const isEmailGoalMet = emailActual >= emailTarget;
  const isAiGoalMet = aiActual >= aiTarget;
  const isAllGoalsMet = isCallGoalMet && isEmailGoalMet && isAiGoalMet;

  const aiRemaining = Math.max(0, aiTarget - aiActual);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    const task = tasks.find(t => t.id === id);
    if (task && !task.done) {
      showToast(`Action checked. Earned 15 prospecting points!`, 'success');
      // If task type is email, optionally increment actual email volume
      if (task.type === 'email') {
        setEmailActual(prev => {
          const next = prev + 1;
          if (next === emailTarget) {
            showToast(`🔥 Bravo! Daily email target of ${emailTarget} achieved!`, 'success');
          }
          return next;
        });
      } else if (task.type === 'call') {
        setCallActual(prev => {
          const next = prev + 1;
          if (next === callTarget) {
            showToast(`📞 Dynamic Focus met Call volumes standard of ${callTarget}!`, 'success');
          }
          return next;
        });
      }
    }
  };

  const handleSaveTargets = () => {
    const nextCall = Math.max(1, parseInt(tempCallTarget) || 50);
    const nextEmail = Math.max(1, parseInt(tempEmailTarget) || 100);
    const nextAi = Math.max(1, parseInt(tempAiTarget) || 15);
    setCallTarget(nextCall);
    setEmailTarget(nextEmail);
    setAiTarget(nextAi);
    setIsEditingTargets(false);
    showToast(`Targets recalibrated: Calls to ${nextCall}, Emails to ${nextEmail}, AI Messages to ${nextAi}`, 'success');
  };

  const incrementCalls = (amt: number) => {
    setCallActual(prev => {
      const next = Math.max(0, prev + amt);
      if (next >= callTarget && prev < callTarget) {
        showToast(`🎉 Milestone reached: Call target of ${callTarget} fulfilled!`, 'success');
      }
      return next;
    });
  };

  const incrementEmails = (amt: number) => {
    setEmailActual(prev => {
      const next = Math.max(0, prev + amt);
      if (next >= emailTarget && prev < emailTarget) {
        showToast(`📬 Milestone reached: Email campaign target of ${emailTarget} achieved!`, 'success');
      }
      return next;
    });
  };

  return (
    <div >
      {/* Header Tabs */}
      <div >
        <div >
          <h1 >Personal SDR Hub & Queue</h1>
          <p >Manage daily outbound interactions, review high-priority activities, and track personal metrics.</p>
        </div>

        <div >
          <button
            onClick={() => setActiveTab('queue')}
            
          >
            <List  />
            Daily Action Item Queue
            {tasks.filter(t => !t.done).length > 0 && (
              <span >
                {tasks.filter(t => !t.done).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            
          >
            <Calendar  />
            Outbound Calendar
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            
          >
            <TrendingUp  />
            Personal Outbound Metrics
          </button>
          <button
            onClick={() => setActiveTab('leads_pipeline')}
            
          >
            <Layers  />
            SDR Lead Pipeline
          </button>
        </div>
      </div>

      {/* DAILY ACTION QUEUE & GOAL TRACKER */}
      {activeTab === 'queue' && (
        <div >
          {/* Left Side: Tasks queue checklist */}
          <div >
            <div >
              <span >Queue List</span>
              <p >Check done status of target outbound prospects to auto-increment volume statistics.</p>
            </div>
            
            <div >
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  
                >
                  <div >
                    <button
                      onClick={() => toggleTask(task.id)}
                      
                    >
                      {task.done && <Check  />}
                    </button>
                    <div >
                      <div >
                        <span >
                          {task.name}
                        </span>
                        <span >{task.title}</span>
                      </div>
                      <div >
                        Reason: "{task.reason}"
                      </div>
                    </div>
                  </div>

                  <div >
                    <span >
                      {task.type} Campaign
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Daily Goal Tracker bento card */}
          <div >
            <div >
              <div >
                <div >
                  <div >
                    <Target  />
                  </div>
                  <div>
                    <h3 >Daily Goal Tracker</h3>
                    <p >Configure targets and record outbound volume</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setTempCallTarget(String(callTarget));
                    setTempEmailTarget(String(emailTarget));
                    setTempAiTarget(String(aiTarget));
                    setIsEditingTargets(!isEditingTargets);
                  }}
                  
                  title="Recalibrate Targets"
                >
                  <Settings2  />
                </button>
              </div>

              {/* Status Header Block */}
              {isAllGoalsMet ? (
                <div >
                  <div >
                    <Award  />
                  </div>
                  <div >
                    <div >All Goals Satisfied! ✅</div>
                    <p >Outbound campaign quotas matched. Perfect performance recorded.</p>
                  </div>
                </div>
              ) : (
                <div >
                  <div >
                    <div >
                      <Flame  />
                    </div>
                    <div>
                      <div >Daily Focus Active</div>
                      <p >Increment calls and dispatches to maintain streak.</p>
                    </div>
                  </div>
                  <div >
                    <span >{(isCallGoalMet ? 1 : 0) + (isEmailGoalMet ? 1 : 0) + (isAiGoalMet ? 1 : 0)} / 3</span>
                    <p >Goals Met</p>
                  </div>
                </div>
              )}

              {/* Adjust Target Forms */}
              {isEditingTargets && (
                <div >
                  <div >Configure Daily Benchmarks</div>
                  <div >
                    <div >
                      <label >Call Target</label>
                      <input 
                        type="number"
                        min="1"
                        value={tempCallTarget}
                        onChange={(e) => setTempCallTarget(e.target.value)}
                        
                      />
                    </div>
                    <div >
                      <label >Email Target</label>
                      <input 
                        type="number"
                        min="1"
                        value={tempEmailTarget}
                        onChange={(e) => setTempEmailTarget(e.target.value)}
                        
                      />
                    </div>
                    <div >
                      <label >AI Target</label>
                      <input 
                        type="number"
                        min="1"
                        value={tempAiTarget}
                        onChange={(e) => setTempAiTarget(e.target.value)}
                        
                      />
                    </div>
                  </div>
                  <div >
                    <button 
                      onClick={handleSaveTargets}
                      
                    >
                      Save Settings
                    </button>
                    <button 
                      onClick={() => setIsEditingTargets(false)}
                      
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Targets Progress Section */}
              <div >
                {/* 1. Calls Goal Progress */}
                <div >
                  <div >
                    <div >
                      <div >
                        <Phone  />
                      </div>
                      <span >Calls Handled</span>
                    </div>

                    <div >
                      <span >{callActual}</span>
                      <span >/ {callTarget}</span>
                      {isCallGoalMet && (
                        <CheckCircle2  />
                      )}
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div >
                    <div >
                      <div 
                        
                        style={{ width: `${callPercentage}%` }}
                      />
                    </div>
                    <div >
                      <span>Progress Status</span>
                      <span >{callPercentage}%</span>
                    </div>
                  </div>

                  {/* Increment / Decrement Controls */}
                  <div >
                    <button 
                      onClick={() => incrementCalls(1)}
                      
                    >
                      <Plus  />
                      +1 Call
                    </button>
                    <button 
                      onClick={() => incrementCalls(5)}
                      
                      title="Add 5 Calls"
                    >
                      +5
                    </button>
                    <button 
                      onClick={() => incrementCalls(-1)}
                      disabled={callActual <= 0}
                      
                      title="Decrease by 1"
                    >
                      <Minus  />
                    </button>
                  </div>
                </div>

                {/* 2. Emails Goal Progress */}
                <div >
                  <div >
                    <div >
                      <div >
                        <Mail  />
                      </div>
                      <span >Emails Sent</span>
                    </div>

                    <div >
                      <span >{emailActual}</span>
                      <span >/ {emailTarget}</span>
                      {isEmailGoalMet && (
                        <CheckCircle2  />
                      )}
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div >
                    <div >
                      <div 
                        
                        style={{ width: `${emailPercentage}%` }}
                      />
                    </div>
                    <div >
                      <span>Progress Status</span>
                      <span >{emailPercentage}%</span>
                    </div>
                  </div>

                  {/* Increment / Decrement Controls */}
                  <div >
                    <button 
                      onClick={() => incrementEmails(1)}
                      
                    >
                      <Plus  />
                      +1 Email
                    </button>
                    <button 
                      onClick={() => incrementEmails(5)}
                      
                      title="Add 5 Emails"
                    >
                      +5
                    </button>
                    <button 
                      onClick={() => incrementEmails(-1)}
                      disabled={emailActual <= 0}
                      
                      title="Decrease by 1"
                    >
                      <Minus  />
                    </button>
                  </div>
                </div>

                {/* 3. Daily Outreach Goal Progress (AI-Generated Messages from Firestore) */}
                <div >
                  <div >
                    <div >
                      <div >
                        <Sparkles  />
                      </div>
                      <span >AI Outreach Dispatches</span>
                    </div>

                    <div >
                      {loadingAiLogs ? (
                        <RefreshCw  />
                      ) : (
                        <span >{aiActual}</span>
                      )}
                      <span >/ {aiTarget}</span>
                      {isAiGoalMet && (
                        <CheckCircle2  />
                      )}
                    </div>
                  </div>

                  {/* Progress Line */}
                  <div >
                    <div >
                      <div 
                        
                        style={{ width: `${aiPercentage}%` }}
                      />
                    </div>
                    <div >
                      <span>{aiRemaining > 0 ? `${aiRemaining} messages left to meet daily outreach quota` : "🔥 Outbound quota complete!"}</span>
                      <span >{aiPercentage}%</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Metrics Sync status */}
            <div >
              <span >
                <span  />
                Live Hub Sync Active
              </span>
              <button 
                onClick={() => {
                  setCallActual(18);
                  setEmailActual(42);
                  showToast("Demonstration numbers re-seeded to baseline coordinates", "info");
                }}
                
              >
                <RefreshCw  />
                Reset Baseline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERSONAL OUTBOUND METRICS */}
      {activeTab === 'stats' && (
        <div >
          <div >
            <div >142</div>
            <div >Dials & Sequence Dispatches</div>
            <div >+15% from campaign average</div>
          </div>
          <div >
            <div >26.4%</div>
            <div >Personal Average Email Open rate</div>
            <div >Above company target (20%)</div>
          </div>
          <div >
            <div >12</div>
            <div >Meetings Booked this Month</div>
            <div >80% of personal quota</div>
          </div>
        </div>
      )}

      {/* OUTBOUND CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <SdrCalendarView 
          leads={leads}
          campaigns={campaigns}
          showToast={showToast}
        />
      )}

      {/* SDR LEAD PIPELINE VIEW */}
      {activeTab === 'leads_pipeline' && (
        <div >
          {/* Controls Bar */}
          <div >
            {/* Search/Filter Inputs */}
            <div >
              <div >
                <Search  />
                <input
                  type="text"
                  placeholder="Search lead or company..."
                  value={sdrSearch}
                  onChange={(e) => setSdrSearch(e.target.value)}
                  
                />
              </div>

              <select
                value={sdrIndustryFilter}
                onChange={(e) => setSdrIndustryFilter(e.target.value)}
                
              >
                <option value="all">All Industries</option>
                {Array.from(new Set((leads || []).map(l => l.industry).filter(Boolean))).map((ind: any) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* View Toggle button (Kanban or List) */}
            <div >
              <button
                onClick={() => setSdrViewType('kanban')}
                
              >
                <Kanban  />
                Kanban
              </button>
              <button
                onClick={() => setSdrViewType('list')}
                
              >
                <List  />
                List View
              </button>
            </div>
          </div>

          {/* Render Filters outcome count */}
          {leads && (
            <p >
              Active Selection &bull; {
                (leads || []).filter(lead => {
                  const matchSearch = lead.name?.toLowerCase().includes(sdrSearch.toLowerCase()) || 
                                      lead.company?.toLowerCase().includes(sdrSearch.toLowerCase());
                  const matchInd = sdrIndustryFilter === 'all' || lead.industry === sdrIndustryFilter;
                  return matchSearch && matchInd;
                }).length
              } outbound leads registered
            </p>
          )}

          {/* KANBAN VIEW CONFIG */}
          {sdrViewType === 'kanban' ? (
            <div >
              {[
                { id: 'pending', name: 'Prospect Pool', color: 'border-amber-500/30 text-amber-400 bg-amber-500/5' },
                { id: 'sent', name: 'Outreach Contacting', color: 'border-blue-500/30 text-blue-400 bg-blue-500/5' },
                { id: 'failed', name: 'Outreach Failed / Bounced', color: 'border-red-500/30 text-[#ef4444] bg-red-500/5' },
                { id: 'discovery_call', name: 'Discovery Call Booked', color: 'border-emerald-500/40 text-[#10b981] bg-emerald-500/5' }
              ].map(col => {
                const colLeads = (leads || []).filter(lead => {
                  const stage = getLeadSdrStage(lead);
                  if (stage !== col.id) return false;
                  
                  const matchSearch = lead.name?.toLowerCase().includes(sdrSearch.toLowerCase()) || 
                                      lead.company?.toLowerCase().includes(sdrSearch.toLowerCase());
                  const matchInd = sdrIndustryFilter === 'all' || lead.industry === sdrIndustryFilter;
                  return matchSearch && matchInd;
                });

                const isPulsing = pulsingColumnId === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => handleLeadDragOver(e, col.id)}
                    onDrop={(e) => handleLeadDrop(e, col.id)}
                    
                  >
                    {/* Column Header */}
                    <div >
                      <div >
                        <div  />
                        <span >
                          {col.name}
                        </span>
                      </div>
                      <span >
                        {colLeads.length}
                      </span>
                    </div>

                    {/* Column Body Container */}
                    <div >
                      <AnimatePresence mode="popLayout">
                        {colLeads.map(lead => (
                          <motion.div
                            key={lead.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            draggable
                            onDragStart={(e) => handleLeadDragStart(e as any, lead.id)}
                            
                          >
                            <div >
                              <h4 >{lead.name}</h4>
                              <span >
                                Score: {lead.score || 50}
                              </span>
                            </div>

                            <div >{lead.role} &bull; {lead.company}</div>

                            <div >
                              {lead.email && (
                                <div >
                                  <Mail  />
                                  <span >{lead.email}</span>
                                </div>
                              )}
                              {lead.phone && (
                                <div >
                                  <Phone  />
                                  <span>{lead.phone}</span>
                                </div>
                              )}
                              {lead.country && (
                                <div >
                                  <MapPin  />
                                  <span>{lead.country}</span>
                                </div>
                              )}
                            </div>

                            {/* Dropdown / Move stage quick selector to allow mobile / accessibility */}
                            <div >
                              <span >Move to:</span>
                              <select
                                value={col.id}
                                disabled={updatingLeadId === lead.id}
                                onChange={(e) => {
                                  const targetVal = e.target.value;
                                  const statusValue = targetVal === 'pending' ? 'imported' : targetVal;
                                  handleUpdateLeadStatus(lead.id, statusValue);
                                }}
                                
                              >
                                <option value="pending">Prospect Pool &bull; Cold</option>
                                <option value="sent">Campaign Contacting</option>
                                <option value="failed">Failed / Bounced</option>
                                <option value="discovery_call">🔥 Discovery Call Booked</option>
                              </select>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {colLeads.length === 0 && (
                        <div >
                          <p >Empty stage</p>
                          <p >Drag prospects here to promote them.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* LIST VIEW SYSTEM */
            <div >
              <div >
                <table >
                  <thead >
                    <tr>
                      <th >Contact Name</th>
                      <th >Job Role & Company</th>
                      <th >Industry / Country</th>
                      <th >AI Intent Score</th>
                      <th >Outbound Stage</th>
                      <th >Actions</th>
                    </tr>
                  </thead>
                  <tbody >
                    {(leads || [])
                      .filter(lead => {
                        const matchSearch = lead.name?.toLowerCase().includes(sdrSearch.toLowerCase()) || 
                                            lead.company?.toLowerCase().includes(sdrSearch.toLowerCase());
                        const matchInd = sdrIndustryFilter === 'all' || lead.industry === sdrIndustryFilter;
                        return matchSearch && matchInd;
                      })
                      .map(lead => {
                        const currentStage = getLeadSdrStage(lead);
                        return (
                          <tr key={lead.id} >
                            <td >
                              <div >{lead.name}</div>
                              <div >{lead.email}</div>
                            </td>
                            <td >
                              <div >{lead.role}</div>
                              <div >{lead.company}</div>
                            </td>
                            <td >
                              <div >{lead.industry || 'Enterprise Client'}</div>
                              <div >{lead.country || 'Global'}</div>
                            </td>
                            <td >
                              <span >
                                <Zap  />
                                {lead.score || 50}
                              </span>
                            </td>
                            <td >
                              <span >
                                {currentStage === 'pending' ? 'Prospect Pool' : 
                                 currentStage === 'sent' ? 'Contacting' : 
                                 currentStage === 'failed' ? 'Failed' : '🔥 Discovery Call'}
                              </span>
                            </td>
                            <td >
                              <select
                                value={currentStage}
                                disabled={updatingLeadId === lead.id}
                                onChange={(e) => {
                                  const targetVal = e.target.value;
                                  const statusValue = targetVal === 'pending' ? 'imported' : targetVal;
                                  handleUpdateLeadStatus(lead.id, statusValue);
                                }}
                                
                              >
                                <option value="pending">Prospect Pool &bull; Cold</option>
                                <option value="sent">Contacting</option>
                                <option value="failed">Failed / Bounced</option>
                                <option value="discovery_call">🔥 Discovery Call</option>
                              </select>
                            </td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
