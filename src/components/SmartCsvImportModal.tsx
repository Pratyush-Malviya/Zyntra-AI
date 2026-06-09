import React, { useState } from "react";
import { Upload, FileSpreadsheet, AlertTriangle, ArrowRight, Check, Loader2, Play, X } from "lucide-react";
import * as XLSX from "xlsx";

interface Lead { id: string; name: string; company: string; email: string; phone: string; role: string; score: number; }

interface SmartCsvImportModalProps {
  onClose: () => void;
  onImportComplete: (importedRows: any[], summary: any) => void;
  existingLeads: Lead[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

const CRM_FIELDS = [
  { key: "name", label: "Full Name", required: true },
  { key: "email", label: "Work Email", required: true },
  { key: "phone", label: "Direct Phone", required: false },
  { key: "company", label: "Company Name", required: false },
  { key: "role", label: "Job Title", required: false },
  { key: "score", label: "ICP Score", required: false },
];

export const SmartCsvImportModal: React.FC<SmartCsvImportModalProps> = ({ onClose, onImportComplete, existingLeads, showToast }) => {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappedRows, setMappedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [duplicateConflicts, setDuplicateConflicts] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  const suggestMappings = (headers: string[]) => {
    const suggested: Record<string, string> = {};
    headers.forEach(h => {
      const lh = h.toLowerCase().trim();
      if (lh.includes("name") || lh === "fullname") suggested[h] = "name";
      else if (lh.includes("mail") || lh === "email") suggested[h] = "email";
      else if (lh.includes("phone") || lh === "mobile") suggested[h] = "phone";
      else if (lh.includes("company") || lh === "org") suggested[h] = "company";
      else if (lh.includes("role") || lh.includes("title")) suggested[h] = "role";
      else if (lh === "score" || lh.includes("icp")) suggested[h] = "score";
      else suggested[h] = "";
    });
    setMapping(suggested);
  };

  const handleFileData = (rows: any[], name: string) => {
    if (!rows || rows.length === 0) { showToast("No rows found.", "error"); return; }
    const headers = Object.keys(rows[0]);
    setFileHeaders(headers);
    setRawRows(rows);
    setFileName(name);
    suggestMappings(headers);
    setStep(2);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const wb = XLSX.read(data, { type: "binary" });
          const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          handleFileData(rows, file.name);
        } else {
          const text = data as string;
          const lines = text.split(/\r?\n/).filter(Boolean);
          if (lines.length < 2) { showToast("CSV must have headers + data.", "error"); return; }
          const headers = lines[0].split(",").map(h => h.replace(/^["']|["']$/g, "").trim());
          const rows = lines.slice(1).map(line => {
            const cells = line.split(",").map(c => c.replace(/^["']|["']$/g, "").trim());
            const obj: any = {};
            headers.forEach((h, i) => obj[h] = cells[i] || "");
            return obj;
          });
          handleFileData(rows, file.name);
        }
      } catch { showToast("Failed to parse file.", "error"); }
    };
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) reader.readAsBinaryString(file);
    else reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) { Object.defineProperty(file, "name", { value: file.name }); handleFileUpload({ target: { files: [file] } } as any); }
  };

  const processValidation = () => {
    const temp: any[] = [];
    const errors: any[] = [];
    const duplicates: any[] = [];

    rawRows.forEach((row, i) => {
      const mapped: any = {};
      CRM_FIELDS.forEach(f => {
        const header = Object.keys(mapping).find(h => mapping[h] === f.key);
        mapped[f.key] = header ? row[header] || "" : "";
      });

      const emailVal = (mapped.email || "").toString().trim();
      const nameVal = (mapped.name || "").toString().trim();

      if (!nameVal) errors.push({ row: i + 1, field: "Full Name", reason: "Required field missing." });
      if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal))
        errors.push({ row: i + 1, field: "Email", reason: emailVal ? `Invalid format: ${emailVal}` : "Required field missing." });

      const dup = existingLeads.some(ex => ex.email.toLowerCase() === emailVal.toLowerCase());
      if (dup) duplicates.push({ row: i + 1, name: nameVal, email: emailVal });

      temp.push(mapped);
    });

    setMappedRows(temp);
    setValidationErrors(errors);
    setDuplicateConflicts(duplicates);
    setStep(3);
  };

  const confirmImport = async () => {
    const rows = mappedRows.filter((_, i) => !duplicateConflicts.some(d => d.row === i + 1));
    setIsImporting(true);

    try {
      const res = await fetch("/api/import/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping, rows: rows, fileName }),
      });
      if (res.ok) {
        const summary = await res.json();
        setImportSummary(summary);
        showToast(`Imported ${summary.success_count} leads.`, "success");
        onImportComplete(rows, summary);
      } else showToast("Import failed.", "error");
    } catch { showToast("Network error.", "error"); }
    setIsImporting(false);
    setStep(4);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-surface border border-border rounded-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand" />
            <h3 className="text-sm font-bold">Import Leads</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div onDragOver={e => e.preventDefault()} onDrop={handleDrop}
              className="border-2 border-dashed border-border hover:border-brand/40 rounded-2xl p-10 text-center cursor-pointer transition-all">
              <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="font-bold">Drop CSV or Excel file here</p>
              <p className="text-xs text-text-muted mt-1">or click to browse</p>
              <label className="inline-block mt-3 px-4 py-2 bg-bg-primary border border-border rounded-lg text-sm cursor-pointer hover:border-brand">
                Browse Files
                <input type="file" onChange={handleFileUpload} accept=".csv, .xlsx, .xls" className="hidden" />
              </label>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-brand/5 border border-brand/20 rounded-xl p-3 text-sm">
                Detected {fileHeaders.length} columns from "{fileName}". Map source columns to CRM fields below.
              </div>
              <div className="space-y-2">
                {fileHeaders.map(header => (
                  <div key={header} className="flex items-center gap-3">
                    <span className="w-1/3 text-sm font-mono truncate">{header}</span>
                    <select value={mapping[header] || ""} onChange={e => setMapping({ ...mapping, [header]: e.target.value })}
                      className="flex-1 px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm">
                      <option value="">-- Skip --</option>
                      {CRM_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={processValidation} className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-bold flex items-center gap-1">
                  Validate & Preview <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-xl border text-sm ${validationErrors.length > 0 ? 'bg-red-500/5 border-red-500/20 text-red-400' : 'bg-green-500/5 border-green-500/20 text-green-400'}`}>
                  <p className="font-bold">{validationErrors.length} validation errors</p>
                </div>
                <div className={`p-3 rounded-xl border text-sm ${duplicateConflicts.length > 0 ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400' : 'bg-green-500/5 border-green-500/20 text-green-400'}`}>
                  <p className="font-bold">{duplicateConflicts.length} duplicates found</p>
                </div>
              </div>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-bg-secondary border-b border-border">
                    <tr className="text-xs text-text-muted">
                      <th className="text-left py-2 px-3">#</th>
                      {CRM_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                        <th key={f.key} className="text-left py-2 px-3">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-2 px-3 text-text-muted">{i + 1}</td>
                        {CRM_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                          <td key={f.key} className="py-2 px-3">{row[f.key] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setStep(2)} className="px-4 py-2 border border-border rounded-lg text-sm">Back</button>
                <button onClick={confirmImport} className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-bold flex items-center gap-1">
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Import {mappedRows.length - duplicateConflicts.length} leads
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center py-8 space-y-3">
              <Check className="w-12 h-12 text-green-400 mx-auto" />
              <p className="font-bold text-lg">Import Complete</p>
              {importSummary && (
                <p className="text-sm text-text-muted">{importSummary.success_count} leads imported, {importSummary.failed_count} skipped</p>
              )}
              <button onClick={onClose} className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-bold">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
