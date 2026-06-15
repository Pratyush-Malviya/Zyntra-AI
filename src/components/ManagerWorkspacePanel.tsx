import React, { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, Check, X, Edit, MessageSquare, Play, 
  Settings, Award, RefreshCw, BarChart2, CheckCircle2, ChevronRight, 
  HelpCircle, Volume2, ShieldAlert, Cpu, Layers, DollarSign, Calendar, Search, Eye, AlertCircle, FileText, Mail
} from 'lucide-react';
import { db, collection, getDocs, query, orderBy, auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleLocalFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error in Manager panel: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function ManagerWorkspacePanel({ 
  showToast,
  leads,
  campaigns
}: { 
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  leads: any[];
  campaigns: any[];
}) {
  const [activeTab, setActiveTab] = useState<'stats' | 'approvals' | 'coaching' | 'forecast' | 'audit'>('stats');

  // Generation log states
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'fallback'>('all');

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'generation_logs'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const fetchedLogs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(fetchedLogs);
    } catch (err: any) {
      console.error("Failed to load generation logs:", err);
      setLogs([]);
      showToast("Could not load generation logs list: " + err.message, "error");
      try {
        handleLocalFirestoreError(err, OperationType.LIST, 'generation_logs');
      } catch (innerErr) {
        // dynamic compliance propagation
      }
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchLogs();
    }
  }, [activeTab]);

  // Stats / Activity Logs
  const [activityFeed, setActivityFeed] = useState([
    { id: 1, rep: 'John M (SDR)', action: 'added 25 new discovered leads', time: '5 mins ago', target: 'Staffing Outbound' },
    { id: 2, rep: 'Sarah K (AE)', action: 'moved SeedCo Deal to Active Engagement', time: '20 mins ago', target: '$45K Pipeline' },
    { id: 3, rep: 'John M (SDR)', action: 'submitted "FinTech Outbound" for Sequence Review', time: '1 hr ago', target: 'FinTech CFOs' },
    { id: 4, rep: 'David J (SDR)', action: 'dispatched 15 outreach emails to Caret team', time: '2 hrs ago', target: 'Staffing Outbound' },
  ]);

  // Sequence Approvals DB
  const [approvalsQueue, setApprovalsQueue] = useState([
    { 
      id: 'ap1', 
      sdr: 'John Miller (SDR)', 
      campaign: 'FinTech Outbound for CFOs', 
      channel: 'Email',
      draft: 'Subject: Outbound Recruiting efficiency validation - {{company}} analytics\n\nHi {{name}},\n\nI noticed TERAWORK has scaled its staffing department by 20% this quarter. Building specialized engineering pipelines usually drains 18+ hours. We help teams automate search.\n\nWould you be open to a quick 15-minute sync next Tuesday at 3 PM?',
      feedback: ''
    },
    { 
      id: 'ap2', 
      sdr: 'Sarah Cole (AE)', 
      campaign: 'High-Growth Tech Series A Expansion', 
      channel: 'LinkedIn InMail',
      draft: 'Hi {{name}}, congrats on the funding! I read caret is scaling rapidly. Checked your team layout. We have automated search workflows designed specifically for recruiting managers.\n\nLets connect briefly?',
      feedback: ''
    }
  ]);

  // Conversation Intelligence Call DB
  const [selectedCallId, setSelectedCallId] = useState<string | null>('c1');
  const [calls] = useState([
    { 
      id: 'c1', 
      rep: 'John Miller (SDR)', 
      prospect: 'Femi Taiwo (CEO, TERAWORK)', 
      date: 'Today, 10:15 AM', 
      score: 88, 
      talkRatio: { rep: 44, prospect: 56 }, 
      fillerWords: 5,
      transcript: [
        { speaker: 'Rep', text: 'Hi Femi, John here from Zyntra. I noticed TERAWORK is growing rapidly.' },
        { speaker: 'Prospect', text: 'Yes, we are indeed scaling our B2B tech recruiting sector.' },
        { speaker: 'Rep', text: 'Excellent. Our AI pipelines can accelerate matching times by up to 40%. How are you managing engineering vetting currently?' },
        { speaker: 'Prospect', text: 'Honestly, pricing is our main criteria right now. Traditional agencies are too expensive for our series-A margins.' },
        { speaker: 'Rep', text: 'Our credits system ensures you only pay for verified, locked contacts. It reduces traditional agency margins by over 70%.' },
      ],
      objections: ['Pricing standard limits', 'Competitor reference ( agencies)'],
      coachingNotes: 'Great objection handling on agency margins. Consider detailing platform safety protocols on the next call.'
    },
    { 
      id: 'c2', 
      rep: 'David Joost (AE)', 
      prospect: 'Oluwaseyi Agunbiade (Director, Caret)', 
      date: 'Yesterday, 4:32 PM', 
      score: 72, 
      talkRatio: { rep: 61, prospect: 39 }, 
      fillerWords: 14,
      transcript: [
        { speaker: 'Rep', text: 'Hello Oluwaseyi. I wanted to walk you through our entire AI pipeline capability dashboard.' },
        { speaker: 'Prospect', text: 'Okay, but do you support integration with HubSpot and Salesforce? We have a high-density pipeline already.' },
        { speaker: 'Rep', text: 'Let me share my screen. We can set up custom sync parameters...' }
      ],
      objections: ['HubSpot & Salesforce Integrations'],
      coachingNotes: 'Talk ratio is active-heavy (61% Rep). Allow the prospect more space to speak and outline their active CRM layouts.'
    }
  ]);

  // Manual Forecast Override Logs
  const [pipelineTarget, setPipelineTarget] = useState(150000);
  const [pipelineCurrent, setPipelineCurrent] = useState(115000);
  const [overrideValue, setOverrideValue] = useState('135000');
  const [overrideComment, setOverrideComment] = useState('');
  const [overrideHistory, setOverrideHistory] = useState([
    { id: 1, date: 'May 28', user: 'You (Manager)', type: 'Rollup Change', before: '$115,000', after: '$130,000', rationale: 'Adjusted Staffing Outbound cohort probability values based on client executive response scores.' }
  ]);

  const handleApprove = (id: string, name: string) => {
    setApprovalsQueue(approvalsQueue.filter(ap => ap.id !== id));
    showToast(`Sequence draft for ${name} successfully approved & deployed!`, 'success');
  };

  const handleReject = (id: string, name: string) => {
    const draft = approvalsQueue.find(ap => ap.id === id);
    if (!draft?.feedback) {
      showToast('Please add suggestions/feedback before rejecting!', 'warning');
      return;
    }
    setApprovalsQueue(approvalsQueue.filter(ap => ap.id !== id));
    showToast(`Rejected & returned draft to SDR. suggestions logged.`, 'info');
  };

  const handleApplyOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideValue || !overrideComment) {
      showToast('Rationale comment and projection override value required.', 'error');
      return;
    }
    const val = parseFloat(overrideValue);
    setPipelineCurrent(val);
    const log = {
      id: overrideHistory.length + 1,
      date: 'Today',
      user: 'You (Manager)',
      type: 'Manual Override',
      before: `$${pipelineCurrent.toLocaleString()}`,
      after: `$${val.toLocaleString()}`,
      rationale: overrideComment
    };
    setOverrideHistory([log, ...overrideHistory]);
    setOverrideComment('');
    showToast('CRM forecast override records committed to audit log!', 'success');
  };

  const activeCall = calls.find(c => c.id === selectedCallId) || calls[0];

  return (
    <div >
      {/* Tab Select & Header */}
      <div >
        <div >
          <h1 >Manager Coaching & Analytics Workspace</h1>
          <p >Oversee pipeline metrics, approve sequences, and coach reps with AI intelligence.</p>
        </div>

        <div >
          {[
            { id: 'stats', label: 'Team Dashboard', icon: BarChart2 },
            { id: 'approvals', label: 'Sequence Approval Queue', icon: CheckCircle2 },
            { id: 'coaching', label: 'AI Call Coaching', icon: MessageSquare },
            { id: 'forecast', label: 'Forecast Overrides', icon: TrendingUp },
            { id: 'audit', label: 'AI Response Audit Logs', icon: Cpu },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              
            >
              <tab.icon  />
              {tab.label}
              {tab.id === 'approvals' && approvalsQueue.length > 0 && (
                <span >{approvalsQueue.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* STATS & TEAM FEED VIEW */}
      {activeTab === 'stats' && (
        <div >
          {/* Main KPI Boards */}
          <div >
            <div >
              <div >
                <div >184 / 300</div>
                <div >Team Outbound Dispatched</div>
                <div >61% Quota attainment</div>
              </div>
              <div >
                <div >18%</div>
                <div >Average Reply Interest Weight</div>
                <div >+4% from last month</div>
              </div>
              <div >
                <div >$135,000</div>
                <div >Active Forecast Value</div>
                <div >90% of Quota target</div>
              </div>
            </div>

            {/* Leaderboards */}
            <div >
              <h3 >SDR Outbound Leaderboard</h3>
              <div >
                {[
                  { rep: 'John Miller', dials: '85', emails: '140', score: '92%', booked: 7, color: 'bg-teal-400' },
                  { rep: 'David Joost', dials: '62', emails: '115', score: '84%', booked: 5, color: 'bg-[#4da6ff]' },
                  { rep: 'Alice Vance', dials: '40', emails: '90', score: '78%', booked: 3, color: 'bg-purple-400' },
                ].map((row, idx) => (
                  <div key={idx} >
                    <div >
                      <span >#{idx + 1}</span>
                      <div>
                        <div >{row.rep}</div>
                        <div >{row.dials} dials / {row.emails} sequences</div>
                      </div>
                    </div>
                    <div >
                      <div >
                        <div >{row.score}</div>
                        <div >Approval level</div>
                      </div>
                      <div >
                        <div >{row.booked}</div>
                        <div >Booked Ops</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div >
            <h3 >Rep Activity stream</h3>
            <div >
              {activityFeed.map(feed => (
                <div key={feed.id} >
                  <div >
                    <span >{feed.rep}</span>
                    <span >{feed.time}</span>
                  </div>
                  <div >{feed.action}</div>
                  <div >{feed.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEQUENCE APPROVALS QUEUE VIEW */}
      {activeTab === 'approvals' && (
        <div >
          <div >
            {approvalsQueue.length === 0 ? (
              <div >
                <div >
                  <Check  />
                </div>
                <h3 >Approvals Queue Clear</h3>
                <p >SDRs have no drafts pending review. Automated AI sequences are deployed seamlessly.</p>
              </div>
            ) : (
              <div >
                {approvalsQueue.map(ap => (
                  <div key={ap.id} >
                    <div >
                      <div>
                        <div >Submitted by {ap.sdr}</div>
                        <h3 >Campaign: {ap.campaign}</h3>
                      </div>
                      <span >
                        {ap.channel} OUTBOUND
                      </span>
                    </div>

                    <div >
                      <label >Active Copy Draft</label>
                      <textarea
                        value={ap.draft}
                        onChange={(e) => {
                          setApprovalsQueue(approvalsQueue.map(x => x.id === ap.id ? { ...x, draft: e.target.value } : x));
                        }}
                        rows={5}
                        
                      />
                    </div>

                    <div >
                      <div >
                        <label >Coaching Notes / Suggestions for Rejection</label>
                        <input
                          type="text"
                          value={ap.feedback}
                          onChange={(e) => {
                            setApprovalsQueue(approvalsQueue.map(x => x.id === ap.id ? { ...x, feedback: e.target.value } : x));
                          }}
                          placeholder="e.g. Include specific metrics. Reduce first sentence pitch length."
                          
                        />
                      </div>
                      <div >
                        <button
                          onClick={() => handleReject(ap.id, ap.campaign)}
                          
                        >
                          Reject Setup
                        </button>
                        <button
                          onClick={() => handleApprove(ap.id, ap.campaign)}
                          
                        >
                          <Check  /> Approve Out
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONVERSATION COACHING INTEL VIEW */}
      {activeTab === 'coaching' && (
        <div >
          <div >
            <h3 >Recorded Coaching Logs</h3>
            <div >
              {calls.map(c => {
                const isSelected = selectedCallId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCallId(c.id)}
                    
                  >
                    <div >
                      <span>{c.date}</span>
                      <span >AI Score: {c.score}</span>
                    </div>
                    <div >{c.prospect}</div>
                    <div >Rep: {c.rep}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div >
            <div >
              <div>
                <h3 >Call Details: {activeCall.prospect}</h3>
                <div >Dialed reps: {activeCall.rep}</div>
              </div>
              <div >
                <div >
                  <div >{activeCall.talkRatio.rep}% / {activeCall.talkRatio.prospect}%</div>
                  <div >Talk-Listen Ratio</div>
                </div>
                <div >
                  <div >{activeCall.fillerWords}</div>
                  <div >Filler Words (Uh, Like)</div>
                </div>
              </div>
            </div>

            {/* Transcript pane */}
            <div >
              {activeCall.transcript.map((line, idx) => (
                <div key={idx} >
                  <span >{line.speaker}:</span>
                  <span >{line.text}</span>
                </div>
              ))}
            </div>

            {/* Coach Objections Map */}
            <div >
              <div >
                <h4 >
                  <ShieldAlert  />
                  Objections Flagged
                </h4>
                <div >
                  {activeCall.objections.map((obj, idx) => (
                    <span key={idx} >
                      {obj.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div >
                <h4 >
                  <Cpu  />
                  AI Objections Battlecard Recommendation
                </h4>
                <p >
                  For pricing comparison objections, point out our credits calculator: "We are utility billed; agency fees are flat, billing you even for cold data."
                </p>
              </div>
            </div>

            <div >
              <div >Coaching Notes for Rep</div>
              <p >{activeCall.coachingNotes}</p>
            </div>
          </div>
        </div>
      )}

      {/* FORECAST & QUOTA MANAGEMENT VIEW */}
      {activeTab === 'forecast' && (
        <div >
          <div >
            <div >
              <div >
                <h3 >Manager Override Portal</h3>
                
                <form onSubmit={handleApplyOverride} >
                  <div >
                    <label >Team Target Quota ($)</label>
                    <input
                      type="number"
                      disabled
                      value={pipelineTarget}
                      
                    />
                  </div>
                  <div >
                    <label >Adjusted Forecast Commit ($)</label>
                    <input
                      type="number"
                      value={overrideValue}
                      onChange={e => setOverrideValue(e.target.value)}
                      
                    />
                  </div>
                  <div >
                    <label >Required Audit rationale (Mandatory)</label>
                    <textarea
                      value={overrideComment}
                      onChange={e => setOverrideComment(e.target.value)}
                      placeholder="Indicate why this override is necessary e.g., CFO validated higher probability size of Staffel deals"
                      
                    />
                  </div>
                  <button
                    type="submit"
                    
                  >
                    Commit Manual Forecast Override
                  </button>
                </form>
              </div>

              {/* Audit history */}
              <div >
                <h3 >Audit Trail & Overrides History</h3>
                <div >
                  {overrideHistory.map(hist => (
                    <div key={hist.id} >
                      <div >
                        <span >{hist.user}</span>
                        <span >{hist.date}</span>
                      </div>
                      <div >
                        <span >{hist.before}</span>
                        <span >&gt; {hist.after}</span>
                      </div>
                      <p >Rationale: {hist.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI GENERATION AUDIT LOGS VIEW */}
      {activeTab === 'audit' && (
        <div >
          <div >
            <div >
              <div >
                <h3 >
                  <Cpu  />
                  AI Response Generation & Audit Logs
                </h3>
                <p >
                  Audit precise AI-generated personalized outreach copy directly populated from live rest runs.
                </p>
              </div>
              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                
              >
                <RefreshCw  />
                {loadingLogs ? 'Refreshing...' : 'Refresh Logs'}
              </button>
            </div>

            {/* Filter controls */}
            <div >
              <div >
                <Search  />
                <input
                  type="text"
                  placeholder="Search by lead name, company name, or campaign..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  
                />
              </div>

              <div >
                <span >Status:</span>
                <div >
                  {(['all', 'success', 'fallback'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div >
              {/* Logs Table column */}
              <div >
                {loadingLogs ? (
                  <div >
                    <RefreshCw  />
                    <p >Querying Firestore 'generation_logs' collection...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div >
                    <AlertCircle  />
                    <p >No generation logs found in database. Start generating messages to record audit logs!</p>
                  </div>
                ) : (
                  (() => {
                    const filtered = logs.filter(log => {
                      const matchesSearch = 
                        (log.leadName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (log.leadCompany || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (log.campaignName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (log.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div >
                          <p >No logs matching search/filter terms.</p>
                        </div>
                      );
                    }

                    return (
                      <div >
                        {filtered.map((log) => {
                          const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                          const formattedDate = dateObj ? dateObj.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Unknown Date';
                          const isSelected = selectedLog?.id === log.id;

                          return (
                            <div 
                              key={log.id}
                              onClick={() => setSelectedLog(log)}
                              
                            >
                              <div >
                                <div >
                                  <span >
                                    {log.leadName}
                                  </span>
                                  <span >
                                    @{log.leadCompany}
                                  </span>
                                  <span >
                                    {log.campaignName || 'Internal'}
                                  </span>
                                </div>
                                <div >
                                  <span>Rep: <strong >{log.userName || 'System SDR'}</strong></span>
                                  <span>•</span>
                                  <span >{formattedDate}</span>
                                </div>
                              </div>

                              <div >
                                <span >
                                  {log.status === 'success' ? 'SUCCESS' : 'FALLBACK'}
                                </span>
                                <button >
                                  <Eye  />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Single log details audit preview panel */}
              {selectedLog ? (
                <div >
                  <div >
                    <div >
                      <div>
                        <span >
                          Audit Trail Details
                        </span>
                        <h4 >
                          {selectedLog.leadName}
                        </h4>
                        <p >
                          Generated on: {selectedLog.timestamp?.toDate ? selectedLog.timestamp.toDate().toLocaleString() : new Date(selectedLog.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button 
                        onClick={() => setSelectedLog(null)}
                        
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div >
                    {/* Channel selection output preview */}
                    {selectedLog.messages ? (
                      <div >
                        {/* Email */}
                        {(selectedLog.messages.email_subject || selectedLog.messages.email_body) && (
                          <div >
                            <span >
                              <Mail  />
                              Email Outreach Body
                            </span>
                            <div >
                              {selectedLog.messages.email_subject && (
                                <div >
                                  <strong >Subject:</strong> 
                                  <span >{selectedLog.messages.email_subject}</span>
                                </div>
                              )}
                              <p >
                                {selectedLog.messages.email_body}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* LinkedIn Request */}
                        {selectedLog.messages.linkedin_connect && (
                          <div >
                            <span >
                              <Layers  />
                              LinkedIn Connection Intro Note
                            </span>
                            <div >
                              {selectedLog.messages.linkedin_connect}
                            </div>
                          </div>
                        )}

                        {/* LinkedIn DM */}
                        {selectedLog.messages.linkedin_dm && (
                          <div >
                            <span >
                              <MessageSquare  />
                              LinkedIn DM Sequence Step
                            </span>
                            <div >
                              {selectedLog.messages.linkedin_dm}
                            </div>
                          </div>
                        )}

                        {/* WhatsApp message */}
                        {selectedLog.messages.whatsapp && (
                          <div >
                            <span >
                              <MessageSquare  />
                              WhatsApp Quick Intro
                            </span>
                            <div >
                              {selectedLog.messages.whatsapp}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div >
                        <p >No generated messages associated. Check status failure notes.</p>
                      </div>
                    )}

                    {/* Rationale Failures */}
                    {selectedLog.error && (
                      <div >
                        <div >
                          <ShieldAlert  />
                          Failure Traceback Logs
                        </div>
                        <p >
                          {selectedLog.error}
                        </p>
                      </div>
                    )}

                    {/* Compliance Checkbox */}
                    <div >
                      <div >
                        <FileText  />
                        Compliance Rationale
                      </div>
                      <p>
                        This audit trace complies with EU-GDPR and security logs constraints. Direct outreach is generated with organizational credentials.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div >
                  <Cpu  />
                  <p >
                    No log coordinates chosen. Select any generation entry on the left column to run the full copy audit.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
