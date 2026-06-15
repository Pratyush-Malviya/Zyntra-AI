import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, Clock, User, 
  Mail, Phone, Target, AlertCircle, CheckCircle2, Filter, Info, ShieldAlert
} from 'lucide-react';

interface SdrCalendarViewProps {
  leads: any[];
  campaigns: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'outreach' | 'followup' | 'campaign';
  date: Date;
  status: string;
  details: string;
  lead?: any;
  campaign?: any;
}

export function SdrCalendarView({ leads = [], campaigns = [], showToast }: SdrCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 5, 2)); // Dynamic center based on 2026-06-02
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2026, 5, 2));
  const [filterType, setFilterType] = useState<'all' | 'outreach' | 'followup' | 'campaign'>('all');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month Names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Derive All Calendar Events from Leads and Campaigns
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    
    // Process Leads
    leads.forEach((lead, index) => {
      let leadCreatedDate = new Date(2026, 5, 2); // default June 2, 2026
      if (lead.createdAt) {
        if (typeof lead.createdAt.toDate === 'function') {
          leadCreatedDate = lead.createdAt.toDate();
        } else {
          const d = new Date(lead.createdAt);
          if (!isNaN(d.getTime())) leadCreatedDate = d;
        }
      } else {
        // Distribute fallback dates to make calendar look live and nicely populated
        const dayOffset = ((index * 7) % 27) - 10; // offset from -10 to +16 days from June 2
        const d = new Date(2026, 5, 2);
        d.setDate(d.getDate() + dayOffset);
        leadCreatedDate = d;
      }

      const status = lead.status || 'pending';

      if (status === 'sent') {
        // Follow-up 3 days later
        const followupDate = new Date(leadCreatedDate);
        followupDate.setDate(leadCreatedDate.getDate() + 3);
        events.push({
          id: `followup-${lead.id || index}`,
          title: `Follow-up: ${lead.name}`,
          type: 'followup',
          date: followupDate,
          status: 'sent',
          details: `Schedule follow-up touchpoint with ${lead.name} (${lead.role} of ${lead.company}). Direct outreach has been completed.`,
          lead
        });
      } else if (status === 'failed') {
        // Bounce retry reminder 5 days later
        const retryDate = new Date(leadCreatedDate);
        retryDate.setDate(leadCreatedDate.getDate() + 5);
        events.push({
          id: `retry-${lead.id || index}`,
          title: `Bounce Recovery: ${lead.name}`,
          type: 'followup',
          date: retryDate,
          status: 'failed',
          details: `Check alternate contact channels for ${lead.name} (${lead.company}) as initial outreach bounced.`,
          lead
        });
      } else {
        // Scheduled outreach
        events.push({
          id: `outreach-${lead.id || index}`,
          title: `Outreach Run: ${lead.name}`,
          type: 'outreach',
          date: leadCreatedDate,
          status: status,
          details: `Deliver sequence copy to ${lead.name} (${lead.role}) at ${lead.company}. Current score: ${lead.score || 70} points.`,
          lead
        });
      }
    });

    // Process Campaigns
    campaigns.forEach((campaign, index) => {
      let campDate = new Date(2026, 5, 2);
      if (campaign.createdAt) {
        if (typeof campaign.createdAt.toDate === 'function') {
          campDate = campaign.createdAt.toDate();
        } else {
          const d = new Date(campaign.createdAt);
          if (!isNaN(d.getTime())) campDate = d;
        }
      } else {
        // Distribute campaign launches
        const dayOffset = ((index * 13) % 25) - 8;
        const d = new Date(2026, 5, 2);
        d.setDate(d.getDate() + dayOffset);
        campDate = d;
      }

      events.push({
        id: `campaign-${campaign.id || index}`,
        title: `Launch: ${campaign.name}`,
        type: 'campaign',
        date: campDate,
        status: campaign.status || 'draft',
        details: `Official outbound launch window for "${campaign.name}" campaign targeting ${campaign.leadsCount || 0} qualified prospects.`,
        campaign
      });
    });

    return events;
  }, [leads, campaigns]);

  // Calendar generation logic
  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  const firstDayIndex = useMemo(() => {
    return new Date(year, month, 1).getDay();
  }, [year, month]);

  const prevMonthDays = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  const calendarGrid = useMemo(() => {
    const grid = [];
    
    // Previous Month's trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const d = new Date(year, month - 1, dayNum);
      grid.push({ dayNum, date: d, isCurrentMonth: false });
    }

    // Current Month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      grid.push({ dayNum: i, date: d, isCurrentMonth: true });
    }

    // Next Month's leading days to fill remaining slots (total slots must fit in grid of 35 or 42)
    const remainingCount = 42 - grid.length;
    for (let i = 1; i <= remainingCount; i++) {
      const d = new Date(year, month + 1, i);
      grid.push({ dayNum: i, date: d, isCurrentMonth: false });
    }

    return grid;
  }, [year, month, daysInMonth, firstDayIndex, prevMonthDays]);

  // Helper to filter events by current selected date & filterType
  const getEventsForDate = (date: Date) => {
    return allEvents.filter(event => {
      const isSameDay = event.date.getDate() === date.getDate() &&
                       event.date.getMonth() === date.getMonth() &&
                       event.date.getFullYear() === date.getFullYear();
      if (!isSameDay) return false;
      if (filterType === 'all') return true;
      return event.type === filterType;
    });
  };

  // Switch month helper handles correctly
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const setToday = () => {
    const today = new Date(2026, 5, 2); // Force to June 2, 2026 baseline
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Selected date events details
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return allEvents.filter(event => {
      return event.date.getDate() === selectedDate.getDate() &&
             event.date.getMonth() === selectedDate.getMonth() &&
             event.date.getFullYear() === selectedDate.getFullYear();
    });
  }, [selectedDate, allEvents]);

  // Count events globally by type
  const counts = useMemo(() => {
    return {
      outreach: allEvents.filter(e => e.type === 'outreach').length,
      followup: allEvents.filter(e => e.type === 'followup').length,
      campaign: allEvents.filter(e => e.type === 'campaign').length,
    };
  }, [allEvents]);

  return (
    <div >
      {/* Calendar Grid side */}
      <div >
        
        {/* Navigation & Controls */}
        <div >
          <div>
            <h2 >
              <Calendar  />
              {monthNames[month]} {year}
            </h2>
            <p >
              Outbound Schedule & Campaign Cadences
            </p>
          </div>

          <div >
            <button 
              onClick={setToday}
              
            >
              Today
            </button>
            <div >
              <button 
                onClick={handlePrevMonth}
                
              >
                <ChevronLeft  />
              </button>
              <button 
                onClick={handleNextMonth}
                
              >
                <ChevronRight  />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div >
          <span >
            <Filter  />
            Filter By:
          </span>
          {[
            { id: 'all', label: 'All Items', color: 'border-border/60 text-slate-300', activeStyle: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            { id: 'outreach', label: `Outreach (${counts.outreach})`, color: 'text-blue-400', activeStyle: 'bg-blue-500/15 border-blue-500/20' },
            { id: 'followup', label: `Follow-up Reminders (${counts.followup})`, color: 'text-yellow-400', activeStyle: 'bg-yellow-500/15 border-yellow-500/20' },
            { id: 'campaign', label: `Launch Milestones (${counts.campaign})`, color: 'text-purple-400', activeStyle: 'bg-purple-500/15 border-purple-500/20' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => {
                setFilterType(btn.id as any);
                showToast(`Filter loaded: ${btn.label}`, 'info');
              }}
              
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Calendar Grid */}
        <div >
          {/* Calendar Week Header */}
          <div >
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid Days */}
          <div >
            {calendarGrid.map((cell, idx) => {
              const dayEvents = getEventsForDate(cell.date);
              const isSelected = selectedDate && 
                                 selectedDate.getDate() === cell.date.getDate() &&
                                 selectedDate.getMonth() === cell.date.getMonth() &&
                                 selectedDate.getFullYear() === cell.date.getFullYear();
              
              const isToday = cell.date.getDate() === 2 && 
                              cell.date.getMonth() === 5 && 
                              cell.date.getFullYear() === 2026; // June 2, 2026 is dynamic baseline

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(cell.date)}
                  
                >
                  <div >
                    <span >
                      {cell.dayNum}
                    </span>
                    {isToday && (
                      <span >
                        Today
                      </span>
                    )}
                  </div>

                  {/* Micro list of events inside cell */}
                  {dayEvents.length > 0 && (
                    <div >
                      {dayEvents.slice(0, 3).map((event) => {
                        const styleMap = {
                          outreach: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                          followup: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                          campaign: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        };
                        return (
                          <div 
                            key={event.id}
                            
                            title={event.title}
                          >
                            {event.type === 'campaign' ? '🎉 ' : event.type === 'followup' ? '⏱ ' : '✉ '}
                            {event.title.replace('Outreach Run: ', '').replace('Follow-up: ', '').replace('Launch: ', '')}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div >
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div >
          <span >
            <Info  />
            Click on any cellular coordinates day slot to review detailed outbound briefs.
          </span>
          <div >
            <span >
              <span  /> Outreach Scheduled
            </span>
            <span >
              <span  /> Reminders & Follow-ups
            </span>
            <span >
              <span  /> Campaigns Launched
            </span>
          </div>
        </div>

      </div>

      {/* Right Details Panel */}
      <div >
        <div >
          <div >
            <span >
              Focus Ledger
            </span>
            <h3 >
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Choose a date'}
            </h3>
            <p >
              Sequence agenda itemization rosters for the active SDR slot.
            </p>
          </div>

          {/* Agenda Items list */}
          <div >
            {selectedDateEvents.length === 0 ? (
              <div >
                <ShieldAlert  />
                <p >No scheduled outbound items or reminder checkpoints on this date coordinates.</p>
              </div>
            ) : (
              selectedDateEvents.map(event => {
                const colorTheme = event.type === 'outreach' ? {
                  bg: 'bg-blue-500/5 border-blue-500/20',
                  iconBg: 'bg-blue-500/15 text-blue-400',
                  label: 'Outreach Dispatch',
                  indicator: 'bg-blue-500'
                } : event.type === 'followup' ? {
                  bg: 'bg-yellow-500/5 border-yellow-500/20',
                  iconBg: 'bg-yellow-500/15 text-yellow-400',
                  label: 'SDR Follow-up',
                  indicator: 'bg-yellow-500'
                } : {
                  bg: 'bg-purple-500/5 border-purple-500/20',
                  iconBg: 'bg-purple-500/15 text-purple-400',
                  label: 'Campaign Milestones',
                  indicator: 'bg-purple-500'
                };

                return (
                  <div 
                    key={event.id}
                    
                  >
                    {/* Color indicator vertical bar */}
                    <div  />

                    <div >
                      <div >
                        <span >
                          {colorTheme.label}
                        </span>
                        <h4 >
                          {event.title}
                        </h4>
                      </div>
                      <div >
                        {event.type === 'campaign' ? <Clock  /> : event.type === 'followup' ? <AlertCircle  /> : <User  />}
                      </div>
                    </div>

                    <p >
                      {event.details}
                    </p>

                    {/* Meta coordinates block */}
                    {event.lead && (
                      <div >
                        <div >
                          <span >Lead Company:</span>
                          <span >{event.lead.company}</span>
                        </div>
                        <div >
                          <span >Industry Focus:</span>
                          <span >{event.lead.industry || 'B2B Outbound'}</span>
                        </div>
                        <div >
                          <span >Contact Email:</span>
                          <span >{event.lead.email || 'None Recorded'}</span>
                        </div>
                        <div >
                          <span >SLA Status:</span>
                          <span >
                            {event.lead.status || 'imported'}
                          </span>
                        </div>
                      </div>
                    )}

                    {event.campaign && (
                      <div >
                        <div >
                          <span >Target Size:</span>
                          <span >{event.campaign.leadsCount} prospects</span>
                        </div>
                        <div >
                          <span >Approval State:</span>
                          <span >{event.campaign.status}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action summaries widgets */}
        <div >
          <div >
            <div >
              <Target  />
            </div>
            <div >
              <div >Action Recommended</div>
              <p >
                {selectedDateEvents.filter(e => e.type === 'outreach').length} dispatches pending today coordinates.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
