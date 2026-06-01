import React, { useState, useEffect } from "react";
import { 
  Upload, FileSpreadsheet, AlertTriangle, ArrowRight, Check, CheckCircle2, 
  Settings, Loader2, Play, ChevronRight, Save, Plus, Database
} from "lucide-react";
import * as XLSX from "xlsx";

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  role: string;
  score: number;
}

interface SmartCsvImportModalProps {
  onClose: () => void;
  onImportComplete: (importedRows: any[], summary: any, campaignOption?: { type: 'existing' | 'new', id?: string, name?: string }) => void;
  existingLeads: Lead[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  campaigns?: any[];
}

const CRM_FIELDS = [
  { key: "name", label: "Full Name", required: true, type: "string" },
  { key: "email", label: "Work Email", required: true, type: "email" },
  { key: "phone", label: "Direct Phone", required: false, type: "string" },
  { key: "company", label: "Company Name", required: false, type: "string" },
  { key: "role", label: "Job Title", required: false, type: "string" },
  { key: "score", label: "ICP Seniority Score", required: false, type: "number" }
];

export const SmartCsvImportModal: React.FC<SmartCsvImportModalProps> = ({
  onClose,
  onImportComplete,
  existingLeads,
  showToast,
  campaigns = []
}) => {
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  
  // Mapping logic
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [showCustomFieldInput, setShowCustomFieldInput] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  
  // Reusable templates
  const [templateName, setTemplateName] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  
  // Preview and Validation
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [duplicateConflicts, setDuplicateConflicts] = useState<any[]>([]);
  const [mappedRows, setMappedRows] = useState<any[]>([]);
  
  // Progress & Stream Execution
  const [progress, setProgress] = useState(0);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  // Campaign Selection
  const [campaignOptionType, setCampaignOptionType] = useState<'existing' | 'new'>('existing');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaigns.length > 0 ? campaigns[0].id : "");
  const [newCampaignName, setNewCampaignName] = useState<string>("");

  // Fetch saved templates on mounting
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("/api/import/templates");
        if (res.ok) {
          const tmpls = await res.json();
          setSavedTemplates(tmpls);
        }
      } catch (err) {
        console.error("Failed to fetch templates", err);
      }
    };
    fetchTemplates();
  }, []);

  // Fuzzy match algorithm for suggestion (Task 2 Step 2)
  const suggestMappings = (headers: string[]) => {
    const suggested: Record<string, string> = {};
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());

    headers.forEach((header, idx) => {
      const lh = lowerHeaders[idx];
      
      if (lh.includes("name") || lh === "fullname" || lh === "lead_name" || lh === "person") {
        suggested[header] = "name";
      } else if (lh.includes("mail") || lh === "email" || lh === "work_email" || lh === "email_address") {
        suggested[header] = "email";
      } else if (lh.includes("phone") || lh === "mobile" || lh === "telephone" || lh === "cell") {
        suggested[header] = "phone";
      } else if (lh.includes("company") || lh === "org" || lh === "organization" || lh === "firm" || lh === "account") {
        suggested[header] = "company";
      } else if (lh.includes("role") || lh.includes("title") || lh === "position" || lh === "job") {
        suggested[header] = "role";
      } else if (lh === "score" || lh.includes("intent") || lh.includes("points") || lh.includes("icp")) {
        suggested[header] = "score";
      } else {
        suggested[header] = ""; // Keep unmapped initially
      }
    });

    setMapping(suggested);
  };

  // Helper parser for local drag/drop reading (Excel/XLSX and CSV)
  const handleFileData = (allRows: any[], name: string) => {
    if (!allRows || allRows.length === 0) {
      showToast("Uploaded file contains no rows.", "error");
      return;
    }
    
    // Header keys
    const headers = Object.keys(allRows[0]);
    setFileHeaders(headers);
    setRawRows(allRows);
    setFileName(name);
    
    // Run fuzzy mapping config suggestions (Task 2 Step 2)
    suggestMappings(headers);
    setStep(2);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(sheet);
          handleFileData(rows, file.name);
        } else {
          // Parse CSV text manually
          const csvText = data as string;
          const rows = parseCSVText(csvText);
          handleFileData(rows, file.name);
        }
      } catch (err: any) {
        showToast(`Invalid file type or corrupt structure: ${err.message}`, "error");
      }
    };

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      showToast("Please upload only .csv or .xlsx spreadsheets.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(sheet);
          handleFileData(rows, file.name);
        } else {
          const csvText = data as string;
          const rows = parseCSVText(csvText);
          handleFileData(rows, file.name);
        }
      } catch (err: any) {
        showToast(`Drag-and-drop parsing error: ${err.message}`, "error");
      }
    };

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  // Raw split CSV text logic helper
  const parseCSVText = (text: string): any[] => {
    const lines = text.split(/\r?\n/);
    if (!lines.length || lines[0].trim() === "") return [];

    const headers = splitCells(lines[0]);
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "") continue;
      const cells = splitCells(lines[i]);
      const obj: any = {};
      
      headers.forEach((h, index) => {
        const cleanHeader = h.replace(/^["']|["']$/g, "").trim();
        const cellValue = cells[index] !== undefined ? cells[index].replace(/^["']|["']$/g, "").trim() : "";
        obj[cleanHeader] = cellValue;
      });
      result.push(obj);
    }
    return result;
  };

  const splitCells = (line: string): string[] => {
    const cells: string[] = [];
    let insideQuote = false;
    let currentCell = "";
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if (char === "," && !insideQuote) {
        cells.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());
    return cells;
  };

  // Handle template selection
  const handleApplyTemplate = (tmpl: any) => {
    try {
      const templMap = JSON.parse(tmpl.mappingJSON);
      setMapping(templMap);
      showToast(`Applied mapping preset: ${tmpl.name}`, "success");
    } catch (err) {
      showToast("Template is corrupted or unreadable.", "error");
    }
  };

  // Add a dynamically custom created field (Task 2 Step 3 option)
  const handleCreateCustomField = () => {
    const cleanName = newFieldName.trim();
    if (!cleanName) return;

    if (customFields.includes(cleanName) || CRM_FIELDS.some(f => f.key === cleanName)) {
      showToast("This custom field key already exists.", "error");
      return;
    }

    setCustomFields(prev => [...prev, cleanName]);
    setNewFieldName("");
    setShowCustomFieldInput(false);
    showToast(`Dynamically created custom CRM field: ${cleanName}`, "success");
  };

  // Process Mapped values, check errors, check duplicate conflicts (Task 2 Steps 4 & 5)
  const processValidationAndDuplicates = () => {
    const tempMapped: any[] = [];
    const errors: any[] = [];
    const duplicates: any[] = [];

    rawRows.forEach((row, i) => {
      // Maps row headers to CRM field keys
      const mappedRow: any = {};
      
      // Default mapper fields
      CRM_FIELDS.forEach(field => {
        const matchingHeader = Object.keys(mapping).find(hdr => mapping[hdr] === field.key);
        mappedRow[field.key] = matchingHeader ? row[matchingHeader] : "";
      });

      // Map dynamic custom fields
      customFields.forEach(cust => {
        const matchingHeader = Object.keys(mapping).find(hdr => mapping[hdr] === cust);
        mappedRow[cust] = matchingHeader ? row[matchingHeader] : "";
      });

      // Save mapped data
      tempMapped.push(mappedRow);

      const emailVal = (mappedRow.email || "").toString().trim();
      const phoneVal = (mappedRow.phone || "").toString().trim();
      const companyVal = (mappedRow.company || "").toString().trim();
      const nameVal = (mappedRow.name || "").toString().trim();
      const scoreVal = parseFloat(mappedRow.score);

      // Step 5: Bulk Validation Check
      if (!nameVal || !emailVal) {
        errors.push({
          row: i + 1,
          name: nameVal || "Unnamed Target",
          field: !nameVal ? "Full Name" : "Work Email",
          reason: "Required field is empty or missing content."
        });
      }

      if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        errors.push({
          row: i + 1,
          name: nameVal || "Target Row",
          field: "Work Email",
          reason: `Invalid format '${emailVal}' (Missing '@' or domain extension).`
        });
      }

      if (mappedRow.score && isNaN(scoreVal)) {
         errors.push({
          row: i + 1,
          name: nameVal,
          field: "Seniority Score",
          reason: `Type mismatch. Mapped numeric CRM value but got string value '${mappedRow.score}'.`
         });
      }

      // Duplicate Check (Task 2 - Check email, phone, and company matching existing)
      const duplicateMatch = existingLeads.some(ex => {
        if (!ex) return false;
        const exEmail = String(ex.email || '').toLowerCase().trim();
        const exPhone = String(ex.phone || '').trim();
        const exCompany = String(ex.company || '').toLowerCase().trim();
        return (emailVal !== "" && exEmail === emailVal.toLowerCase()) || 
               (phoneVal !== "" && companyVal !== "" && exPhone === phoneVal && exCompany === companyVal.toLowerCase());
      });

      if (duplicateMatch) {
        duplicates.push({
          row: i + 1,
          name: nameVal,
          company: companyVal,
          email: emailVal,
          phone: phoneVal
        });
      }
    });

    setMappedRows(tempMapped);
    setValidationErrors(errors);
    setDuplicateConflicts(duplicates);
    setStep(3);
  };

  // Confirmation import and progress stream execution (Task 2 Step 6)
  const handleConfirmImport = async () => {
    setIsImporting(true);
    setProgress(5);
    setImportLogs(["[SYSTEM] Initializing secure transactional multi-row data import thread..."]);
    
    // Save template if chosen
    if (saveAsTemplate && templateName.trim()) {
      try {
        await fetch("/api/import/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: templateName, mapping })
        });
        setImportLogs(prev => [...prev, `[TEMPLATE] Reusable mapping preset "${templateName}" saved in CRM template directory.`]);
      } catch (err) {
        setImportLogs(prev => [...prev, `[WARNING] Failed to persist template configuration settings.`]);
      }
    }

    // Prepare actual rows (exclude duplicates or include, for safety we prompt but proceed, standard duplicate filter can skip duplicates)
    const finalRowsToImport = mappedRows.filter((_, idx) => {
      const email = (mappedRows[idx].email || "").toString().trim().toLowerCase();
      const phone = (mappedRows[idx].phone || "").toString().trim();
      const company = (mappedRows[idx].company || "").toString().trim().toLowerCase();
      
      const isDupe = existingLeads.some(ex => {
        if (!ex) return false;
        const exEmail = String(ex.email || '').toLowerCase().trim();
        const exPhone = String(ex.phone || '').trim();
        const exCompany = String(ex.company || '').toLowerCase().trim();
        return (email !== "" && exEmail === email) ||
               (phone !== "" && company !== "" && exPhone === phone && exCompany === company);
      });
      
      return !isDupe; // Automatically filter conflicts to prevent dirtying outreach
    });

    setImportLogs(prev => [
      ...prev,
      `[MAPPING] Provisioned CRM database properties mapping. File detected: ${fileName}`,
      `[VALIDATION] Ran structural schemas filter to isolate ${duplicateConflicts.length} duplicates.`,
      `[PIPELINE] Selected ${finalRowsToImport.length} verified prospect records to synchronize.`,
    ]);

    // Stream progress bars natively (Task 2 Step 6)
    let currentLine = 0;
    const batchSize = Math.max(1, Math.round(finalRowsToImport.length / 5));
    
    const interval = setInterval(async () => {
      if (currentLine >= finalRowsToImport.length) {
        clearInterval(interval);
        
        // Execute back-end call to save
        try {
          const res = await fetch("/api/import/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              templateName: saveAsTemplate ? templateName : "",
              mapping,
              rows: finalRowsToImport,
              fileName,
              workspaceId: "org-default"
            })
          });

          if (res.ok) {
            const sumData = await res.json();
            setImportSummary(sumData);
            setProgress(100);
            setImportLogs(prev => [
              ...prev,
              `[SUCCESS] CRM catalog updated completely! Mapped properties saved.`,
              `[FINISHED] Sync summary - Total: ${rawRows.length} | Imported: ${sumData.success_count} | Skipped Conflicts: ${sumData.failed_count}.`
            ]);
            showToast(`Merged ${sumData.success_count} leads cleanly. Resolved ${sumData.failed_count} duplicate conflicts.`, "success");
            onImportComplete(finalRowsToImport, sumData, { 
              type: campaignOptionType, 
              id: selectedCampaignId, 
              name: newCampaignName 
            });
          } else {
            setImportLogs(prev => [...prev, `[ERROR] Failed to save entries securely to CRM databases.`]);
            showToast("Server side bulk save failed.", "error");
          }
        } catch (err) {
          showToast("Network pipeline error syncing imported data.", "error");
        }
        
        setIsImporting(false);
        return;
      }

      // Stream lines updates
      const slice = finalRowsToImport.slice(currentLine, currentLine + batchSize);
      slice.forEach(lead => {
        setImportLogs(prev => [...prev, `[SYNC] Seeding data: Lead "${lead.name}" (${lead.company || "Self"}) - intent rating of ${lead.score || 60}.`]);
      });
      
      currentLine += batchSize;
      const progressPct = Math.min(95, Math.round((currentLine / finalRowsToImport.length) * 100));
      setProgress(progressPct);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05060b]/90 backdrop-blur-md">
      <div 
        id="crm-field-mapping-panel" 
        className="w-full max-w-4xl bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] glow-brand/10 text-xs"
      >
        {/* Header bar */}
        <div className="p-6 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">AI Schema-Aware Lead Importer</h3>
              <p className="text-[10px] text-text-muted">Directly import leads catalog and auto-build campaign pipeline</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-alt/80 border border-border flex items-center justify-center text-text-muted hover:text-white transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Wizard progress rail */}
        <div className="px-6 py-3.5 bg-[#090a0f] border-b border-border/50 flex items-center gap-1.5 md:gap-4 overflow-x-auto">
          {[
            { nr: 1, name: "Upload Data" },
            { nr: 2, name: "Resolve Properties" },
            { nr: 3, name: "Preview & Validate" },
            { nr: 4, name: "Complete Sync" }
          ].map((st) => {
            const active = step === st.nr || (st.nr === 4 && step === 4);
            const finished = step > st.nr;
            return (
              <div key={st.nr} className="flex items-center gap-2 shrink-0">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[9px] border transition-all ${
                  finished ? "bg-brand text-[#090a0f] border-brand" : active ? "border-brand text-brand" : "border-border text-text-muted"
                }`}>
                  {finished ? "✓" : st.nr}
                </span>
                <span className={`font-mono text-[9px] font-bold uppercase tracking-widest ${
                  active ? "text-brand" : finished ? "text-text" : "text-text-muted"
                }`}>
                  {st.name}
                </span>
                {st.nr < 4 && <ChevronRight className="w-3.5 h-3.5 opacity-40 text-text-muted hidden sm:block" />}
              </div>
            );
          })}
        </div>

        {/* Dynamic Wizard Steps */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar min-h-[40vh]">
          
          {/* STEP 1: Drag and Drop upload (Task 2 Step 1) */}
          {step === 1 && (
            <div className="space-y-6">
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border hover:border-brand/40 bg-[#090a0f]/40 hover:bg-[#090a0f]/85 rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-12 h-12 rounded-full bg-brand/10 group-hover:bg-brand/20 flex items-center justify-center text-brand transition-colors">
                  <Upload className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white">Drag & Drop Leads Spreadsheet here</p>
                  <p className="text-[10px] text-text-muted">Accepts standard .csv or MS Excel .xlsx file formats</p>
                </div>
                
                <label className="px-4 py-2 border border-border hover:bg-border bg-surface rounded-xl text-[10px] font-bold transition-all cursor-pointer mt-2">
                  Browse Files
                  <input 
                    type="file" 
                    onChange={handleFileUpload} 
                    accept=".csv, .xlsx, .xls" 
                    className="hidden" 
                  />
                </label>
              </div>

              {savedTemplates.length > 0 && (
                <div className="space-y-3 bg-[#090a0f]/30 border border-border p-5 rounded-2xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    Available Directory Mapping Presets
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
                    {savedTemplates.map((tmpl) => (
                      <div 
                        key={tmpl.id} 
                        className="p-3 bg-surface border border-border hover:border-brand/35 rounded-xl flex items-center justify-between group transition-all"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-text block truncate">{tmpl.name}</span>
                          <span className="text-[9px] text-text-muted font-mono">Created: {new Date(tmpl.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => handleApplyTemplate(tmpl)}
                          className="px-2.5 py-1 text-[9px] border border-border hover:bg-border hover:text-brand bg-surface rounded-lg font-bold transition-all shrink-0 cursor-pointer"
                        >
                          Select Preset
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Fuzzy Suggested Map or Custom field mapper (Task 2 Steps 2 & 3) */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-[11px] bg-brand/5 border border-brand/20 p-4 rounded-xl text-brand font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-brand" />
                  Auto-Detected {fileHeaders.length} Columns from '{fileName}'. Mapping suggested below.
                </span>
                <span className="text-text-muted font-mono">{rawRows.length} total rows parsed</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left side: CSV Field Match table */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Establish Mappings (Spreadsheet → CRM Properties)
                  </h4>
                  
                  <div className="bg-[#090a0f] border border-border rounded-2xl overflow-hidden divide-y divide-border/60">
                    <div className="grid grid-cols-2 p-3 bg-surface-alt font-bold text-[9px] uppercase text-text-muted">
                      <span>Source Column</span>
                      <span>Target CRM Field Mapping</span>
                    </div>

                    {fileHeaders.map((header) => {
                      const currentMappedKey = mapping[header];
                      return (
                        <div key={header} className="grid grid-cols-2 items-center p-3 gap-4">
                          <span className="font-mono text-[10px] font-semibold text-white truncate" title={header}>
                            {header}
                          </span>
                          
                          <select
                            value={currentMappedKey}
                            onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                            className="w-full px-2 py-1.5 bg-surface border border-border rounded-lg font-medium text-[10px] text-text hover:border-brand cursor-pointer focus:outline-none"
                          >
                            <option value="">-- Ignored / Skip Column --</option>
                            <option disabled>----------- Standard Fields -----------</option>
                            {CRM_FIELDS.map(f => (
                              <option key={f.key} value={f.key}>
                                {f.label} {f.required ? "*" : ""}
                              </option>
                            ))}
                            <option disabled>----------- Dynamic Custom Fields -----------</option>
                            {customFields.map(cf => (
                              <option key={cf} value={cf}>
                                [New Custom] {cf}
                              </option>
                            ))}
                            <option disabled>--------------------------------------</option>
                            <option value="NEW_FIELD">+ Create custom mapped CRM property...</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right side: dynamic field and preset naming section */}
                <div className="space-y-6">
                  {/* Dynamic field creator (Task 2 Step 3 option) */}
                  <div className="bg-[#090a0f]/40 border border-border p-5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#00d4aa]">Custom Target Properties</h4>
                      <p className="text-[10px] text-text-muted">
                        Need dynamic custom CRM filters that are not prebuilt? Provision custom fields right now!
                      </p>
                    </div>

                    {customFields.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {customFields.map(cf => (
                          <span key={cf} className="px-2 py-0.5 rounded bg-brand/10 border border-brand/20 text-brand text-[9px] font-mono font-semibold">
                            {cf}
                          </span>
                        ))}
                      </div>
                    )}

                    {!showCustomFieldInput ? (
                      <button
                        onClick={() => setShowCustomFieldInput(true)}
                        className="px-3 py-1.5 border border-border hover:bg-border rounded-xl text-[10px] font-bold flex items-center gap-1.5 cursor-pointer text-text"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create CRM custom field...
                      </button>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <input
                          type="text"
                          placeholder="e.g. Sales_Territory, LinkedIn_Inbound"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                          className="w-full px-3 py-2 bg-surface border border-border hover:border-brand rounded-xl font-mono text-[10px] text-text focus:outline-none focus:border-brand"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCreateCustomField}
                            className="px-3 py-1.5 bg-brand text-[#090a0f] rounded-lg text-[9px] font-bold cursor-pointer"
                          >
                            Provision Field
                          </button>
                          <button
                            onClick={() => setShowCustomFieldInput(false)}
                            className="px-3 py-1.5 border border-border text-text-muted hover:text-white rounded-lg text-[9px] font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reusable template checklist (Task 2 named reusable templates) */}
                  <div className="bg-[#090a0f]/40 border border-border p-5 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-text">Save as Reusable Template</h4>
                      <p className="text-[10px] text-text-muted">Save mappings to avoid reproducing these steps on similar lists later.</p>
                    </div>

                    <label className="flex items-center gap-2.5 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={saveAsTemplate}
                        onChange={(e) => setSaveAsTemplate(e.target.checked)}
                        className="rounded border-border text-brand focus:ring-opacity-0 h-4.5 w-4.5"
                      />
                      <span className="font-medium text-text">Save mapping as Named Template Preset</span>
                    </label>

                    {saveAsTemplate && (
                      <input
                        type="text"
                        placeholder="e.g. Apollo CSV Mappings, Inbound_SDR_List_Preset"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-xl font-bold text-[10px] focus:outline-none focus:border-brand"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-5">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-border hover:bg-border text-text-muted hover:text-text rounded-xl font-bold transition-all cursor-pointer"
                >
                  Back Upload
                </button>
                <button
                  onClick={processValidationAndDuplicates}
                  className="px-5 py-2 bg-brand text-[#090a0f] hover:bg-brand/90 hover:scale-[1.01] rounded-xl font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-brand/10 cursor-pointer"
                >
                  Run Validation & Conflicts
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview, Validation, and Duplicates check (Task 2 Steps 4 & 5) */}
          {step === 3 && (
            <div className="space-y-6">
              
              {/* Conflicts and validations summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Outbound Warnings */}
                <div className={`p-4 rounded-xl border text-[11px] ${
                  validationErrors.length > 0 
                  ? "bg-rose-500/5 border-rose-500/20 text-rose-400" 
                  : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                }`}>
                  <h4 className="font-bold flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Bulk Format & Mismatch Validation Results ({validationErrors.length} Flags)
                  </h4>
                  <p className="text-[10px] text-text-muted mb-2">
                    {validationErrors.length === 0 
                    ? "✓ Excellent! All parsed lead work emails, names, and intent score numeric values align correctly."
                    : "Some rows hold incomplete emails, empty required names, or numeric type contradictions:"}
                  </p>
                  {validationErrors.length > 0 && (
                    <div className="max-h-24 overflow-y-auto space-y-1 custom-scrollbar text-[9px] font-mono">
                      {validationErrors.slice(0, 10).map((err, i) => (
                        <div key={i} className="flex gap-1.5 p-1 bg-[#090a0f] border border-border rounded">
                          <span className="font-bold text-rose-500 shrink-0">Row {err.row}:</span>
                          <span className="text-white shrink-0">[{err.field}]</span>
                          <span className="text-text-muted truncate">{err.reason}</span>
                        </div>
                      ))}
                      {validationErrors.length > 10 && (
                        <div className="text-center text-[8px] text-text-muted italic pt-1">
                          + {validationErrors.length - 10} additional format warnings logged.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Duplication conflicts */}
                <div className={`p-4 rounded-xl border text-[11px] ${
                  duplicateConflicts.length > 0 
                  ? "bg-[#f59e0b]/5 border-[#f59e0b]/20 text-[#f59e0b]" 
                  : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                }`}>
                  <h4 className="font-bold flex items-center gap-1.5 mb-1.5">
                    <Database className="w-4 h-4 shrink-0" />
                    Duplicate Record Conflicts Isolator ({duplicateConflicts.length} Matches)
                  </h4>
                  <p className="text-[10px] text-text-muted mb-2">
                    {duplicateConflicts.length === 0 
                    ? "✓ No conflicts! No email or phone/company duplicates were detected inside active CRM databases."
                    : "Duplicate matches found based on matching emails or phone-company combinations:"}
                  </p>
                  {duplicateConflicts.length > 0 && (
                    <div className="max-h-24 overflow-y-auto space-y-1 custom-scrollbar text-[9px] font-mono">
                      {duplicateConflicts.slice(0, 10).map((dup, i) => (
                        <div key={i} className="flex gap-1.5 p-1 bg-[#090a0f] border border-border rounded">
                          <span className="font-bold text-[#f59e0b] shrink-0">Row {dup.row}:</span>
                          <span className="text-white shrink-0">{dup.name}</span>
                          <span className="text-text-muted truncate">({dup.email || dup.phone}) exists in pipeline</span>
                        </div>
                      ))}
                      {duplicateConflicts.length > 10 && (
                        <div className="text-center text-[8px] text-text-muted italic pt-1">
                          + {duplicateConflicts.length - 10} further duplicates isolated for safe skipping.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mapped values preview (Task 2 Step 4 - First 10 rows preview) */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Import Preview (First 10 Data Rows with suggested CRM Field Alignment)
                </h4>

                <div className="bg-[#090a0f] border border-border rounded-2xl overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-surface-alt border-b border-border text-[9px] font-bold uppercase tracking-widest text-text-muted">
                        <th className="py-2.5 px-3">Row No.</th>
                        <th className="py-2.5 px-3">Full Name *</th>
                        <th className="py-2.5 px-3">Work Email *</th>
                        <th className="py-2.5 px-3">Direct Phone</th>
                        <th className="py-2.5 px-3">Company</th>
                        <th className="py-2.5 px-3">Job Title</th>
                        <th className="py-2.5 px-3">Intent Score</th>
                        {customFields.map(cf => (
                          <th key={cf} className="py-2.5 px-3 text-[#00d4aa]">{cf}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {mappedRows.slice(0, 10).map((row, i) => {
                        const hasErrors = validationErrors.some(err => err.row === i + 1);
                        const isDupe = duplicateConflicts.some(err => err.row === i + 1);
                        
                        return (
                          <tr 
                            key={i} 
                            className={`hover:bg-surface-alt/70 transition-colors ${
                              isDupe ? "bg-[#f59e0b]/5" : hasErrors ? "bg-rose-500/5" : ""
                            }`}
                          >
                            <td className="py-3 px-3 font-mono text-[9px] font-bold text-text-muted">
                              {i + 1}
                              {isDupe && <span className="ml-1 text-[8px] text-[#f59e0b] font-bold">[Dupe]</span>}
                              {hasErrors && <span className="ml-1 text-[8px] text-rose-400 font-bold">[Error]</span>}
                            </td>
                            <td className={`py-3 px-3 font-semibold ${!row.name ? "text-rose-400 italic" : "text-white"}`}>
                              {row.name || "Missing!"}
                            </td>
                            <td className={`py-3 px-3 font-mono text-[10px] ${!row.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) ? "text-rose-400 font-bold" : "text-text-muted"}`}>
                              {row.email || "Missing!"}
                            </td>
                            <td className="py-3 px-3 text-text-muted font-mono">{row.phone || "—"}</td>
                            <td className="py-3 px-3 text-text-muted font-medium">{row.company || "—"}</td>
                            <td className="py-3 px-3 text-text-muted font-medium">{row.role || "—"}</td>
                            <td className="py-3 px-3 text-text-muted font-mono">{row.score || "60"}</td>
                            {customFields.map(cf => (
                              <td key={cf} className="py-3 px-3 text-[#00d4aa] font-medium italic">{row[cf] || "—"}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-5">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-border hover:bg-border text-text-muted hover:text-text rounded-xl font-bold transition-all cursor-pointer"
                >
                  Adjust Properties Mapping
                </button>
                <div className="flex gap-3">
                  {duplicateConflicts.length > 0 && (
                    <div className="text-[10px] text-text-muted flex items-center pr-2 font-medium italic">
                      ⚠ Conflicts will be safely filtered in background.
                    </div>
                  )}
                  <button
                    onClick={() => setStep(4)}
                    className="px-6 py-2.5 bg-[#00d4aa] text-[#090a0f] hover:scale-[1.01] rounded-xl font-extrabold flex items-center gap-2 transition-all shadow-md shadow-[#00d4aa]/15 cursor-pointer"
                  >
                    Continue to Campaign
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* STEP 4: Campaign Selection */}
          {step === 4 && (
            <div className="space-y-6">
              <h4 className="font-bold flex items-center gap-1.5 mb-1.5 text-white">
                Assign to Campaign
              </h4>
              <p className="text-[11px] text-text-muted mb-4">
                Choose an existing campaign to inject these leads into, or create a brand new campaign to target them separately.
              </p>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-4 bg-[#090a0f] border border-border rounded-xl cursor-pointer hover:border-brand transition-colors">
                  <input 
                    type="radio" 
                    name="campaignType" 
                    value="existing"
                    checked={campaignOptionType === 'existing'} 
                    onChange={() => setCampaignOptionType('existing')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-white block text-sm">Add to Existing Campaign</span>
                    <span className="text-[10px] text-text-muted block mt-1">Append new leads directly to an active workflow.</span>
                    {campaignOptionType === 'existing' && (
                      <div className="mt-3">
                        <select 
                          className="w-full bg-surface-alt border border-border rounded-lg p-2.5 text-xs focus:border-brand outline-none"
                          value={selectedCampaignId}
                          onChange={(e) => setSelectedCampaignId(e.target.value)}
                        >
                          <option value="" disabled>Select a campaign...</option>
                          {campaigns?.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-[#090a0f] border border-border rounded-xl cursor-pointer hover:border-brand transition-colors">
                  <input 
                    type="radio" 
                    name="campaignType" 
                    value="new"
                    checked={campaignOptionType === 'new'} 
                    onChange={() => setCampaignOptionType('new')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-white block text-sm">Create New Campaign</span>
                    <span className="text-[10px] text-text-muted block mt-1">Start a fresh outreach campaign for this specific list.</span>
                    {campaignOptionType === 'new' && (
                      <div className="mt-3">
                        <input 
                          type="text" 
                          placeholder="e.g. Q3 Healthcare Founders..."
                          className="w-full bg-surface-alt border border-border rounded-lg p-2.5 text-xs focus:border-brand outline-none"
                          value={newCampaignName}
                          onChange={(e) => setNewCampaignName(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-5">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 border border-border hover:bg-border text-text-muted hover:text-text rounded-xl font-bold transition-all cursor-pointer"
                >
                  Back to Validation
                </button>
                <button
                  onClick={() => {
                    if (campaignOptionType === 'existing' && !selectedCampaignId) {
                      showToast("Please select an existing campaign.", "error");
                      return;
                    }
                    if (campaignOptionType === 'new' && !newCampaignName.trim()) {
                      showToast("Please enter a new campaign name.", "error");
                      return;
                    }
                    setStep(5);
                    handleConfirmImport();
                  }}
                  className="px-6 py-2.5 bg-[#00d4aa] text-[#090a0f] hover:scale-[1.01] rounded-xl font-extrabold flex items-center gap-2 transition-all shadow-md shadow-[#00d4aa]/15 cursor-pointer"
                >
                  <Play className="w-4.5 h-4.5 fill-current" />
                  Confirm & Sync Data
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Live progress stream and log readout (Task 2 Step 6) */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand flex items-center gap-1.5">
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 text-brand animate-spin" />
                      Streaming Transactions Thread
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4.5 h-4.5 text-[#00d4aa]" />
                      Prospect Importation Completed Successfully
                    </>
                  )}
                </h4>
                <span className="font-mono text-xs font-bold text-brand">{progress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-[#090a0f] rounded-full overflow-hidden border border-border">
                <div 
                  className="h-full bg-gradient-to-r from-brand to-[#00d4aa] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Import Logs live terminal feed (Task 2 Step 6 terminal) */}
              <div className="bg-[#090a0f] border border-border/85 rounded-2xl p-5 h-56 overflow-y-auto font-mono text-[10px] text-text-muted space-y-1.5 custom-scrollbar">
                {importLogs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`flex items-start gap-1.5 ${
                      log.includes('[SUCCESS]') || log.includes('[FINISHED]') ? "text-brand font-bold" :
                      log.includes('[SYNC]') ? "text-text-muted" :
                      log.includes('[TEMPLATE]') ? "text-brand-alt" : ""
                    }`}
                  >
                    <span className="opacity-35 leading-none">[{new Date().toLocaleTimeString()}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>

              {/* Summary metadata statistics inside panel */}
              {importSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-surface border border-border rounded-2xl">
                  <div>
                    <span className="text-[9px] text-[#00d4aa] font-bold uppercase tracking-widest block">Import Transaction ID</span>
                    <span className="font-mono text-[10px] text-white select-all">{importSummary.import_id}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest block font-bold">Total Scanned Rows</span>
                    <span className="font-mono text-xs font-extrabold text-white">{importSummary.total_rows}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-brand font-bold uppercase tracking-widest block">Success Enrolled</span>
                    <span className="font-mono text-xs font-extrabold text-brand">{importSummary.success_count} profiles</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-rose-400 font-bold uppercase tracking-widest block">Duplicates Skipped</span>
                    <span className="font-mono text-xs font-extrabold text-rose-400">{importSummary.failed_count} skipped_logs</span>
                  </div>
                </div>
              )}

              {!isImporting && (
                <div className="flex justify-end pt-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-brand hover:scale-[1.01] text-[#090a0f] rounded-xl font-extrabold shadow-md shadow-brand/10 transition-all cursor-pointer"
                  >
                    Dismiss Wizard & Load Dashboard
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
