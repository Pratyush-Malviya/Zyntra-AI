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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Calendar Grid side */}
      <div className="lg:col-span-8 bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 glow-brand/5">
        
        {/* Navigation & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/40">
          <div>
            <h2 className="text-lg font-bold font-syne text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              {monthNames[month]} {year}
            </h2>
            <p className="text-[11px] text-text-muted mt-1 font-mono uppercase tracking-wider">
              Outbound Schedule & Campaign Cadences
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between">
            <button 
              onClick={setToday}
              className="px-3 py-1.5 bg-[#0c0d12] hover:bg-[#12131a] border border-border/60 hover:border-amber-500/30 text-xs font-bold rounded-lg transition-all text-slate-300"
            >
              Today
            </button>
            <div className="flex items-center gap-1 border border-border/60 rounded-lg p-0.5 bg-[#0c0d12]">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-[#12131a] rounded-md text-text-muted hover:text-white transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-[#12131a] rounded-md text-text-muted hover:text-white transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0c0d12]/50 border border-border/40 p-3 rounded-2xl">
          <span className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-text-muted tracking-wider px-2 border-r border-border/40 mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
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
              className={`px-3 py-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                filterType === btn.id 
                  ? btn.activeStyle 
                  : `border-transparent hover:border-border/40 ${btn.color}`
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="space-y-1">
          {/* Calendar Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted py-2 bg-[#07080c]/50 rounded-lg">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid Days */}
          <div className="grid grid-cols-7 gap-1.5 pt-1">
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
                  className={`min-h-[75px] md:min-h-[90px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected 
                      ? 'border-[#f59e0b] bg-amber-500/5 shadow-inner' 
                      : isToday 
                        ? 'border-brand/70 bg-brand/5 shadow'
                        : cell.isCurrentMonth
                          ? 'border-border/50 bg-[#07080c]/30 hover:bg-[#0c0d12]/50 hover:border-border/80'
                          : 'border-transparent opacity-30 bg-transparent hover:opacity-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isToday
                        ? 'bg-brand text-[#07080c] font-black'
                        : isSelected
                          ? 'text-[#f59e0b]'
                          : 'text-slate-400 group-hover:text-white'
                    }`}>
                      {cell.dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[7px] font-mono leading-none bg-brand/10 text-brand px-1 py-0.5 rounded border border-brand/20">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Micro list of events inside cell */}
                  {dayEvents.length > 0 && (
                    <div className="space-y-1 mt-1.5">
                      {dayEvents.slice(0, 3).map((event) => {
                        const styleMap = {
                          outreach: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                          followup: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                          campaign: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        };
                        return (
                          <div 
                            key={event.id}
                            className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded truncate border leading-none font-sans uppercase tracking-[0.02em] ${styleMap[event.type]}`}
                            title={event.title}
                          >
                            {event.type === 'campaign' ? '🎉 ' : event.type === 'followup' ? '⏱ ' : '✉ '}
                            {event.title.replace('Outreach Run: ', '').replace('Follow-up: ', '').replace('Launch: ', '')}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[7px] font-mono font-extrabold text-text-muted text-right pr-0.5">
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
        <div className="flex gap-4 pt-4 border-t border-border/40 text-[9px] font-mono uppercase tracking-wider text-text-muted justify-between">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-amber-500" />
            Click on any cellular coordinates day slot to review detailed outbound briefs.
          </span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Outreach Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Reminders & Follow-ups
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Campaigns Launched
            </span>
          </div>
        </div>

      </div>

      {/* Right Details Panel */}
      <div className="lg:col-span-4 bg-surface border border-border rounded-3xl p-6 md:p-8 space-y-6 flex flex-col justify-between glow-brand/5">
        <div className="space-y-6">
          <div className="pb-4 border-b border-border/40">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
              Focus Ledger
            </span>
            <h3 className="text-sm font-bold font-syne text-white mt-3">
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Choose a date'}
            </h3>
            <p className="text-[10px] text-text-muted mt-0.5">
              Sequence agenda itemization rosters for the active SDR slot.
            </p>
          </div>

          {/* Agenda Items list */}
          <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
            {selectedDateEvents.length === 0 ? (
              <div className="p-8 text-center bg-[#07080c]/30 rounded-2xl border border-border/40 space-y-2.5">
                <ShieldAlert className="w-6 h-6 text-text-muted mx-auto" />
                <p className="text-xs text-text-muted">No scheduled outbound items or reminder checkpoints on this date coordinates.</p>
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
                    className={`p-4 rounded-2xl border ${colorTheme.bg} space-y-3 relative overflow-hidden`}
                  >
                    {/* Color indicator vertical bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorTheme.indicator}`} />

                    <div className="flex items-start justify-between gap-2 pl-1.5">
                      <div className="space-y-1">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-text-muted">
                          {colorTheme.label}
                        </span>
                        <h4 className="text-xs font-bold text-white pr-2">
                          {event.title}
                        </h4>
                      </div>
                      <div className={`p-1.5 rounded-lg text-xs font-medium shrink-0 ${colorTheme.iconBg}`}>
                        {event.type === 'campaign' ? <Clock className="w-3.5 h-3.5" /> : event.type === 'followup' ? <AlertCircle className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    <p className="text-[11px] text-text-muted pl-1.5 leading-relaxed">
                      {event.details}
                    </p>

                    {/* Meta coordinates block */}
                    {event.lead && (
                      <div className="bg-[#07080c]/50 border border-border/40 p-2.5 rounded-xl text-[10px] space-y-1 ml-1.5 font-mono">
                        <div className="flex justify-between">
                          <span className="text-[#a1a1aa] font-semibold">Lead Company:</span>
                          <span className="text-white font-bold">{event.lead.company}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a1a1aa] font-semibold">Industry Focus:</span>
                          <span className="text-zinc-400 font-bold uppercase text-[9px]">{event.lead.industry || 'B2B Outbound'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a1a1aa] font-semibold">Contact Email:</span>
                          <span className="text-amber-400 hover:underline cursor-pointer">{event.lead.email || 'None Recorded'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a1a1aa] font-semibold">SLA Status:</span>
                          <span className={`px-1 rounded-sm uppercase text-[8px] font-bold ${
                            event.lead.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' :
                            event.lead.status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {event.lead.status || 'imported'}
                          </span>
                        </div>
                      </div>
                    )}

                    {event.campaign && (
                      <div className="bg-[#07080c]/50 border border-border/40 p-2.5 rounded-xl text-[10px] space-y-1 ml-1.5 font-mono">
                        <div className="flex justify-between">
                          <span className="text-[#a1a1aa] font-semibold">Target Size:</span>
                          <span className="text-white font-bold">{event.campaign.leadsCount} prospects</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a1a1aa] font-semibold">Approval State:</span>
                          <span className="text-purple-400 font-bold uppercase text-[8px]">{event.campaign.status}</span>
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
        <div className="pt-4 border-t border-border/40">
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-400/5 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
              <Target className="w-4 h-4 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#f59e0b]">Action Recommended</div>
              <p className="text-[11px] text-zinc-300 font-semibold leading-snug">
                {selectedDateEvents.filter(e => e.type === 'outreach').length} dispatches pending today coordinates.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
