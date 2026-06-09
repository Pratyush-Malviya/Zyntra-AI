import React, { useState, useEffect } from 'react';
import { FileText, Upload, Trash2, Search, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface KbFile {
  id: string;
  file_name: string;
  file_type: string;
  summary: string;
  uploaded_at: string;
  status: 'processing' | 'ready' | 'failed';
}

interface KbSummary {
  summary_text: string;
  key_products: string[];
  key_services: string[];
  usp: string[];
  tone?: string;
}

export function KnowledgeBasePanel({ showToast, orgId }: { showToast: (msg: string, type?: string) => void; orgId?: string }) {
  const [files, setFiles] = useState<KbFile[]>([]);
  const [summary, setSummary] = useState<KbSummary | null>(null);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');

  useEffect(() => {
    fetchKb();
  }, []);

  const fetchKb = async () => {
    try {
      const res = await fetch('/api/kb');
      const data = await res.json();
      setFiles(data.files || []);
      setSummary(data.summary || null);
    } catch { setFiles([]); }
  };

  const uploadFile = async () => {
    if (!fileName || !fileContent) return;
    setUploading(true);
    try {
      const res = await fetch('/api/kb/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: fileName, file_type: 'text', content: fileContent }),
      });
      if (res.ok) {
        showToast('File uploaded', 'success');
        setFileName('');
        setFileContent('');
        fetchKb();
      }
    } catch { showToast('Upload failed', 'error'); }
    setUploading(false);
  };

  const deleteFile = async (id: string) => {
    try {
      await fetch(`/api/kb/files/${id}`, { method: 'DELETE' });
      showToast('File deleted', 'success');
      fetchKb();
    } catch { showToast('Delete failed', 'error'); }
  };

  const filteredFiles = files.filter(f => f.file_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Knowledge Base</h2>
          <p className="text-sm text-text-muted">Company context for AI outreach generation</p>
        </div>
      </div>

      {summary && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <h3 className="font-semibold text-text-primary text-sm mb-2">Organization Context</h3>
          <p className="text-sm text-text-muted mb-3">{summary.summary_text}</p>
          <div className="flex flex-wrap gap-4 text-xs">
            {summary.key_products?.length > 0 && <div><span className="text-text-muted">Products:</span> <span className="text-text-primary">{summary.key_products.join(', ')}</span></div>}
            {summary.key_services?.length > 0 && <div><span className="text-text-muted">Services:</span> <span className="text-text-primary">{summary.key_services.join(', ')}</span></div>}
            {summary.usp?.length > 0 && <div><span className="text-text-muted">USP:</span> <span className="text-text-primary">{summary.usp.join(', ')}</span></div>}
            {summary.tone && <div><span className="text-text-muted">Tone:</span> <span className="text-text-primary">{summary.tone}</span></div>}
          </div>
        </div>
      )}

      <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2"><Upload className="w-4 h-4" /> Upload Document</h3>
        <input value={fileName} onChange={e => setFileName(e.target.value)} placeholder="Document name" className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm" />
        <textarea value={fileContent} onChange={e => setFileContent(e.target.value)} placeholder="Paste document content here..." rows={4} className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary text-sm resize-none" />
        <button onClick={uploadFile} disabled={uploading || !fileName || !fileContent} className="px-4 py-2 bg-brand text-white rounded-lg text-sm hover:bg-brand-hover disabled:opacity-50 flex items-center gap-2">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm" />
      </div>

      <div className="grid gap-2">
        {filteredFiles.map(file => (
          <div key={file.id} className="bg-bg-secondary rounded-xl border border-border p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-brand shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{file.file_name}</p>
                <p className="text-xs text-text-muted">{new Date(file.uploaded_at).toLocaleDateString()} {file.file_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {file.status === 'processing' && <span className="flex items-center gap-1 text-xs text-yellow-400"><Loader2 className="w-3 h-3 animate-spin" /> Processing</span>}
              {file.status === 'ready' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              {file.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-400" />}
              <button onClick={() => deleteFile(file.id)} className="p-1 rounded hover:bg-red-500/10 text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {filteredFiles.length === 0 && <p className="text-center text-sm text-text-muted py-8">{search ? 'No matching documents' : 'No documents uploaded yet'}</p>}
      </div>
    </div>
  );
}
