import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Wifi, WifiOff, RefreshCw, CheckCircle2, XCircle, Loader2,
  ExternalLink, Copy, Terminal, Zap, Mail, Mic, Search, Webhook
} from 'lucide-react';

interface IntegrationStatusPanelProps {
  onNavigateToSettings?: () => void;
}

interface ServiceStatus {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  url: string | null;
  status: 'connected' | 'disconnected' | 'checking' | 'unknown';
  lastChecked?: string;
  dockerImage?: string;
  port?: number;
}

export default function IntegrationStatusPanel({ onNavigateToSettings }: IntegrationStatusPanelProps) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [checkingAll, setCheckingAll] = useState(false);

  useEffect(() => {
    initServices();
  }, []);

  const initServices = () => {
    setServices([
      {
        id: 'listmonk',
        name: 'Listmonk',
        description: 'Email delivery for outreach sequences',
        icon: <Mail className="w-4 h-4" />,
        url: localStorage.getItem('zy_listmonk_url'),
        status: 'unknown',
        dockerImage: 'listmonk/listmonk:latest',
        port: 9000,
      },
      {
        id: 'n8n',
        name: 'n8n Workflows',
        description: 'Automation workflows for CRM sync and lead routing',
        icon: <Webhook className="w-4 h-4" />,
        url: localStorage.getItem('zy_n8n_webhook_url'),
        status: 'unknown',
        dockerImage: 'n8nio/n8n:latest',
        port: 5678,
      },
      {
        id: 'whisper',
        name: 'Whisper.cpp',
        description: 'Local audio transcription for meeting intelligence',
        icon: <Mic className="w-4 h-4" />,
        url: localStorage.getItem('zy_whisper_url'),
        status: 'unknown',
        dockerImage: 'ghcr.io/ggerganov/whisper.cpp',
        port: 8178,
      },
      {
        id: 'meilisearch',
        name: 'Meilisearch',
        description: 'Full-text search for leads, meetings, and contacts',
        icon: <Search className="w-4 h-4" />,
        url: localStorage.getItem('zy_meilisearch_url'),
        status: 'unknown',
        dockerImage: 'getmeili/meilisearch:latest',
        port: 7700,
      },
    ]);
  };

  const checkService = async (serviceId: string) => {
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: 'checking' } : s));

    const service = services.find(s => s.id === serviceId);
    if (!service?.url) {
      setServices(prev => prev.map(s => s.id === serviceId ? { ...s, status: 'disconnected', lastChecked: new Date().toLocaleTimeString() } : s));
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      let healthUrl = service.url;
      if (serviceId === 'listmonk') healthUrl += '/api/health';
      else if (serviceId === 'n8n') healthUrl += '/healthz';
      else if (serviceId === 'whisper') healthUrl += '/health';
      else if (serviceId === 'meilisearch') healthUrl += '/health';

      const res = await fetch(healthUrl, { signal: controller.signal, mode: 'cors' });
      clearTimeout(timeout);

      setServices(prev => prev.map(s => s.id === serviceId ? {
        ...s,
        status: res.ok ? 'connected' : 'disconnected',
        lastChecked: new Date().toLocaleTimeString()
      } : s));
    } catch {
      setServices(prev => prev.map(s => s.id === serviceId ? {
        ...s,
        status: 'disconnected',
        lastChecked: new Date().toLocaleTimeString()
      } : s));
    }
  };

  const checkAll = async () => {
    setCheckingAll(true);
    for (const service of services) {
      await checkService(service.id);
    }
    setCheckingAll(false);
  };

  const DOCKER_COMPOSE = `version: '3.8'
services:
  listmonk:
    image: listmonk/listmonk:latest
    ports: ["9000:9000"]
    environment:
      - LISTMONK_app__address=0.0.0.0:9000

  n8n:
    image: n8nio/n8n:latest
    ports: ["5678:5678"]
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true

  whisper:
    image: ghcr.io/ggerganov/whisper.cpp:server
    ports: ["8178:8178"]
    command: ["--model", "base.en", "--host", "0.0.0.0"]

  meilisearch:
    image: getmeili/meilisearch:latest
    ports: ["7700:7700"]
    environment:
      - MEILI_MASTER_KEY=zyntra-local-key`;

  const [copied, setCopied] = useState(false);
  const copyCompose = () => {
    navigator.clipboard.writeText(DOCKER_COMPOSE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'connected':    return '#10b981';
      case 'disconnected': return '#ef4444';
      case 'checking':     return '#f59e0b';
      default:             return '#64748b';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'connected':    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'disconnected': return <XCircle className="w-4 h-4 text-danger" />;
      case 'checking':     return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
      default:             return <div className="w-4 h-4 rounded-full border-2 border-border" />;
    }
  };

  const connectedCount = services.filter(s => s.status === 'connected').length;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text">Integration Services</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {connectedCount}/{services.length} services connected
          </p>
        </div>
        <button
          onClick={checkAll}
          disabled={checkingAll}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-semibold text-text-secondary hover:text-text transition-all disabled:opacity-50"
        >
          {checkingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Test All
        </button>
      </div>

      {/* Services */}
      <div className="space-y-3">
        {services.map(service => (
          <div key={service.id} className="card p-4 flex items-center gap-4">
            {/* Icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: getStatusColor(service.status) + '15', color: getStatusColor(service.status) }}>
              {service.icon}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text">{service.name}</span>
                {service.url ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Configured
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-border text-text-secondary border border-border">
                    Not configured
                  </span>
                )}
              </div>
              <div className="text-xs text-text-secondary mt-0.5">{service.description}</div>
              {service.url && (
                <div className="text-[10px] font-mono text-text-secondary truncate mt-0.5">{service.url}</div>
              )}
              {service.lastChecked && (
                <div className="text-[10px] text-text-secondary mt-0.5">Checked at {service.lastChecked}</div>
              )}
            </div>

            {/* Status + test */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusIcon(service.status)}
              <button
                onClick={() => checkService(service.id)}
                className="px-2.5 py-1.5 rounded-xl bg-surface-elevated border border-border text-[11px] font-semibold text-text-secondary hover:text-text transition-all"
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Docker compose */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-bold text-text">Docker Compose</span>
          </div>
          <button
            onClick={copyCompose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-xs font-semibold text-text-secondary hover:text-text transition-all"
          >
            {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-text-secondary">Run all integration services locally with one command.</p>
        <div className="rounded-xl p-4 overflow-x-auto">
          <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed whitespace-pre">
            {DOCKER_COMPOSE}
          </pre>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs">
          <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-text-secondary">
            Save as <code className="font-mono text-primary">docker-compose.yml</code> and run{' '}
            <code className="font-mono text-primary">docker compose up -d</code>
          </span>
        </div>
      </div>
    </div>
  );
}
