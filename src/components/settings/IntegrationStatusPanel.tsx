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
        icon: <Mail  />,
        url: localStorage.getItem('zy_listmonk_url'),
        status: 'unknown',
        dockerImage: 'listmonk/listmonk:latest',
        port: 9000,
      },
      {
        id: 'n8n',
        name: 'n8n Workflows',
        description: 'Automation workflows for CRM sync and lead routing',
        icon: <Webhook  />,
        url: localStorage.getItem('zy_n8n_webhook_url'),
        status: 'unknown',
        dockerImage: 'n8nio/n8n:latest',
        port: 5678,
      },
      {
        id: 'whisper',
        name: 'Whisper.cpp',
        description: 'Local audio transcription for meeting intelligence',
        icon: <Mic  />,
        url: localStorage.getItem('zy_whisper_url'),
        status: 'unknown',
        dockerImage: 'ghcr.io/ggerganov/whisper.cpp',
        port: 8178,
      },
      {
        id: 'meilisearch',
        name: 'Meilisearch',
        description: 'Full-text search for leads, meetings, and contacts',
        icon: <Search  />,
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
      case 'connected':    return <CheckCircle2  />;
      case 'disconnected': return <XCircle  />;
      case 'checking':     return <Loader2  />;
      default:             return <div  />;
    }
  };

  const connectedCount = services.filter(s => s.status === 'connected').length;

  return (
    <div >
      {/* Header row */}
      <div >
        <div>
          <h3 >Integration Services</h3>
          <p >
            {connectedCount}/{services.length} services connected
          </p>
        </div>
        <button
          onClick={checkAll}
          disabled={checkingAll}
          
        >
          {checkingAll ? <Loader2  /> : <RefreshCw  />}
          Test All
        </button>
      </div>

      {/* Services */}
      <div >
        {services.map(service => (
          <div key={service.id} >
            {/* Icon */}
            <div 
              style={{ background: getStatusColor(service.status) + '15', color: getStatusColor(service.status) }}>
              {service.icon}
            </div>

            {/* Info */}
            <div >
              <div >
                <span >{service.name}</span>
                {service.url ? (
                  <span >
                    Configured
                  </span>
                ) : (
                  <span >
                    Not configured
                  </span>
                )}
              </div>
              <div >{service.description}</div>
              {service.url && (
                <div >{service.url}</div>
              )}
              {service.lastChecked && (
                <div >Checked at {service.lastChecked}</div>
              )}
            </div>

            {/* Status + test */}
            <div >
              {getStatusIcon(service.status)}
              <button
                onClick={() => checkService(service.id)}
                
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Docker compose */}
      <div >
        <div >
          <div >
            <Terminal  />
            <span >Docker Compose</span>
          </div>
          <button
            onClick={copyCompose}
            
          >
            {copied ? <CheckCircle2  /> : <Copy  />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p >Run all integration services locally with one command.</p>
        <div >
          <pre >
            {DOCKER_COMPOSE}
          </pre>
        </div>
        <div >
          <Zap  />
          <span >
            Save as <code >docker-compose.yml</code> and run{' '}
            <code >docker compose up -d</code>
          </span>
        </div>
      </div>
    </div>
  );
}
