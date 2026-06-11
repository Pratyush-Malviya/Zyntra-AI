import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Globe, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

interface WebhookLog {
  id: string;
  configId: string;
  event: string;
  status: 'success' | 'failed';
  attempts: number;
  lastAttemptAt: string;
  responseStatus: number;
  responseBody: string;
}

const AVAILABLE_EVENTS = [
  'lead.created', 'lead.updated', 'lead.deleted',
  'deal.created', 'deal.stage_changed', 'deal.deleted',
  'campaign.created', 'campaign.completed',
  'crm.sync_failed', 'import.completed'
];

export function WebhooksPanel({ showToast, orgId }: { showToast: (msg: string, type?: string) => void; orgId?: string }) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWebhooks();
    fetchLogs();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } catch { setWebhooks([]); }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/webhooks/logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch { setLogs([]); }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  };

  const createWebhook = async () => {
    if (!url || selectedEvents.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, events: selectedEvents }),
      });
      if (res.ok) {
        showToast('Webhook created', 'success');
        setShowForm(false);
        setUrl('');
        setSelectedEvents([]);
        fetchWebhooks();
      }
    } catch { showToast('Failed to create webhook', 'error'); }
    setLoading(false);
  };

  const deleteWebhook = async (id: string) => {
    try {
      await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      showToast('Webhook deleted', 'success');
      fetchWebhooks();
    } catch { showToast('Failed to delete webhook', 'error'); }
  };

  const toggleWebhook = async (wh: WebhookConfig) => {
    try {
      await fetch(`/api/webhooks/${wh.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...wh, active: !wh.active }),
      });
      fetchWebhooks();
    } catch { showToast('Failed to update webhook', 'error'); }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Webhooks</h2>
          <p className="text-sm text-text-muted">Configure HTTP callbacks for CRM events</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Webhook
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-4">
          <h3 className="font-semibold text-text-primary">Create Webhook</h3>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://your-server.com/webhook" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm" />
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Trigger Events</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_EVENTS.map(event => (
                <button key={event} onClick={() => toggleEvent(event)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedEvents.includes(event) ? 'bg-brand text-white border-brand' : 'bg-bg-primary text-text-muted border-border hover:border-brand'}`}>{event}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createWebhook} disabled={loading || !url || selectedEvents.length === 0} className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {webhooks.map(wh => (
          <div key={wh.id} className="bg-bg-secondary rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Globe className="w-5 h-5 text-text-muted shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{wh.url}</p>
                  <p className="text-xs text-text-muted">Events: {wh.events.join(', ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleWebhook(wh)} className={`px-3 py-1 rounded-lg text-xs font-medium ${wh.active ? 'bg-green-500/20 text-green-400' : 'bg-bg-primary text-text-muted'}`}>{wh.active ? 'Active' : 'Paused'}</button>
                <button onClick={() => setShowLogs(showLogs === wh.id ? null : wh.id)} className="p-1.5 rounded-lg hover:bg-bg-primary text-text-muted"><RefreshCw className="w-4 h-4" /></button>
                <button onClick={() => deleteWebhook(wh.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {showLogs === wh.id && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {logs.filter(l => l.configId === wh.id).length === 0 && <p className="text-xs text-text-muted text-center py-2">No delivery logs yet</p>}
                {logs.filter(l => l.configId === wh.id).map(log => (
                  <div key={log.id} className="flex items-center gap-3 text-xs bg-bg-primary rounded-lg p-2">
                    {log.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    <span className="text-text-primary">{log.event}</span>
                    <span className="text-text-muted">HTTP {log.responseStatus}</span>
                    <span className="text-text-muted">{log.attempts} attempt(s)</span>
                    <Clock className="w-3 h-3 text-text-muted ml-auto" />
                    <span className="text-text-muted">{new Date(log.lastAttemptAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {webhooks.length === 0 && !showForm && (
          <div className="text-center py-12 text-text-muted">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No webhooks configured</p>
          </div>
        )}
      </div>
    </div>
  );
}
