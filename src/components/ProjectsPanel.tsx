import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, Users, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  targetDate: string;
  owner: string;
  teamSize: number;
  progress: number;
  tags: string[];
  createdAt: string;
}

export function ProjectsPanel({ showToast }: { showToast: (msg: string, type?: string) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [form, setForm] = useState<Partial<Project>>({});

  useEffect(() => {
    const saved = localStorage.getItem('zyntra_projects');
    if (saved) setProjects(JSON.parse(saved));
  }, []);

  const save = (list: Project[]) => {
    setProjects(list);
    localStorage.setItem('zyntra_projects', JSON.stringify(list));
  };

  const handleSubmit = () => {
    if (!form.name) return;
    if (editing) {
      save(projects.map(p => p.id === editing ? { ...p, ...form } as Project : p));
      showToast('Project updated', 'success');
    } else {
      const newProject: Project = {
        id: Date.now().toString(),
        name: form.name || '',
        description: form.description || '',
        status: 'planning',
        priority: form.priority || 'medium',
        startDate: form.startDate || new Date().toISOString().split('T')[0],
        targetDate: form.targetDate || '',
        owner: form.owner || '',
        teamSize: form.teamSize || 1,
        progress: 0,
        tags: form.tags || [],
        createdAt: new Date().toISOString(),
      };
      save([...projects, newProject]);
      showToast('Project created', 'success');
    }
    setShowForm(false);
    setEditing(null);
    setForm({});
  };

  const updateProgress = (id: string, progress: number) => {
    save(projects.map(p => p.id === id ? { ...p, progress: Math.min(100, Math.max(0, progress)) } : p));
  };

  const deleteProject = (id: string) => {
    save(projects.filter(p => p.id !== id));
    showToast('Project deleted', 'success');
  };

  const statusColor = (s: Project['status']) => {
    switch (s) {
      case 'planning': return 'bg-blue-500/20 text-blue-400';
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'on_hold': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-gray-500/20 text-gray-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
    }
  };

  const filtered = projects
    .filter(p => filterStatus === 'all' || p.status === filterStatus)
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Projects</h2>
          <p className="text-sm text-text-muted">{projects.length} total · {projects.filter(p => p.status === 'active').length} active</p>
        </div>
        <button onClick={() => { setForm({}); setEditing(null); setShowForm(true); }} className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary">
          <option value="all">All</option>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {showForm && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3">
          <h3 className="font-semibold text-text-primary">{editing ? 'Edit Project' : 'New Project'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} placeholder="Project name *" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary md:col-span-2" />
            <input value={form.owner || ''} onChange={e => setForm({...form, owner: e.target.value})} placeholder="Owner" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <input value={form.targetDate || ''} onChange={e => setForm({...form, targetDate: e.target.value})} placeholder="Target date" type="date" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
            <select value={form.priority || 'medium'} onChange={e => setForm({...form, priority: e.target.value as Project['priority']})} className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary">
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input value={form.teamSize || 1} onChange={e => setForm({...form, teamSize: Number(e.target.value) || 1})} placeholder="Team size" type="number" min="1" className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary" />
          </div>
          <textarea value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" rows={2} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary resize-none" />
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!form.name} className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50">{editing ? 'Update' : 'Create'}</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-muted">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-bg-secondary rounded-xl border border-border p-4 hover:border-brand/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand" />
                  <p className="font-medium text-text-primary">{p.name}</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(p.status)}`}>{p.status.replace('_', ' ')}</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.owner || 'Unassigned'}</span>
                  {p.targetDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {new Date(p.targetDate).toLocaleDateString()}</span>}
                  <span>{p.teamSize} team member(s)</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-bg-primary rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                  <span className="text-xs text-text-muted w-10 text-right">{p.progress}%</span>
                  <input type="range" min="0" max="100" value={p.progress} onChange={e => updateProgress(p.id, Number(e.target.value))} className="w-24 accent-brand" />
                </div>
              </div>
              <button onClick={() => deleteProject(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 ml-2 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-text-muted py-12">No projects found</p>}
      </div>
    </div>
  );
}
