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
  onImportComplete: (importedRows: any[], summary: any) => void;
  existingLeads: Lead[];
  showToast: (msg: string, type: "success" | "error" | "info") => void;
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
  showToast
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
  const [finalImportedLeads, setFinalImportedLeads] = useState<any[]>([]);
  
  // Progress & Stream Execution
  const [progress, setProgress] = useState(0);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  // Zyntra AI Advanced Smart alignment & clutter corrections states
  const [isAiAligning, setIsAiAligning] = useState(false);
  const [aiClutterReport, setAiClutterReport] = useState("");
  const [aiRunSuccess, setAiRunSuccess] = useState(false);
  const [aiCleanedRows, setAiCleanedRows] = useState<any[] | null>(null);

  const triggerAiAlignment = async (headers: string[], rows: any[]) => {
    setIsAiAligning(true);
    setAiRunSuccess(false);
    setAiClutterReport("");
    setAiCleanedRows(null);

    try {
      const response = await fetch("/api/import/ai-align", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, rows })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMapping(result.mapping);
          setAiCleanedRows(result.cleanedRows);
          setAiClutterReport(result.clutterReport);
          setAiRunSuccess(true);
          showToast("Zyntra AI mapped columns and auto-corrected data clutter successfully!", "success");
        } else {
          showToast("AI mapping complete with standard defaults.", "info");
        }
      } else {
        showToast("AI data alignment offline. Utilizing fallback heuristics.", "info");
      }
    } catch (err) {
      console.error("AI Alignment failed", err);
      showToast("Triggered heuristic rule-based alignment fallback.", "info");
    } finally {
      setIsAiAligning(false);
    }
  };

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

    // Trigger neural alignment and clutter cleaning on file load
    triggerAiAlignment(headers, allRows);
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

    const sourceRows = (aiCleanedRows && aiCleanedRows.length === rawRows.length) ? aiCleanedRows : null;

    rawRows.forEach((row, i) => {
      // Maps row headers to CRM field keys
      const mappedRow: any = {};
      
      if (sourceRows) {
        // AI already aligned and cleaned standard fields
        const cleanedRow = sourceRows[i];
        CRM_FIELDS.forEach(field => {
          mappedRow[field.key] = cleanedRow[field.key] !== undefined ? cleanedRow[field.key] : "";
        });
      } else {
        CRM_FIELDS.forEach(field => {
          const matchingHeader = Object.keys(mapping).find(hdr => mapping[hdr] === field.key);
          mappedRow[field.key] = matchingHeader ? row[matchingHeader] : "";
        });
      }

      // Map dynamic custom fields
      customFields.forEach(cust => {
        const matchingHeader = Object.keys(mapping).find(hdr => mapping[hdr] === cust);
        mappedRow[cust] = matchingHeader ? row[matchingHeader] : "";
      });

      // --- Client-side Automated Self-Healing of Clutter Data ---
      const allRowValues: string[] = Object.values(row)
        .map(v => v !== null && v !== undefined ? String(v).trim() : "")
        .filter(v => v !== "");

      let emailVal = (mappedRow.email || "").toString().trim();
      let phoneVal = (mappedRow.phone || "").toString().trim();
      let nameVal = (mappedRow.name || "").toString().trim();
      let companyVal = (mappedRow.company || "").toString().trim();
      let roleVal = (mappedRow.role || "").toString().trim();
      const scoreVal = parseFloat(mappedRow.score);

      const isValidEmail = (v: string) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
      const isValidPhone = (v: string) => typeof v === "string" && /^[+\d\s\-\(\)\.]{7,25}$/.test(v.trim()) && !v.includes("@");

      // Case 1: Swapped email and phone exactly
      if (isValidPhone(emailVal) && isValidEmail(phoneVal)) {
        const temp = emailVal;
        emailVal = phoneVal;
        phoneVal = temp;
      }

      // Case 2: Email is invalid/empty, search other cells for a valid email
      if (!isValidEmail(emailVal)) {
        const foundEmail = allRowValues.find(v => isValidEmail(v));
        if (foundEmail) {
          emailVal = foundEmail;
        }
      }

      // Case 3: Phone is invalid/empty, search other cells for a valid phone
      if (!phoneVal || !isValidPhone(phoneVal)) {
        const foundPhone = allRowValues.find(v => isValidPhone(v) && v !== emailVal);
        if (foundPhone) {
          phoneVal = foundPhone;
        }
      }

      // Case 4: Name is empty or is an email/phone, search cells for a non-numeric, non-email string
      if (!nameVal || isValidEmail(nameVal) || isValidPhone(nameVal)) {
        const foundName = allRowValues.find(v => {
          return v.length > 2 && v.length < 50 && !v.includes("@") && !/^\d+$/.test(v) && v !== companyVal && v !== roleVal;
        });
        if (foundName) {
          nameVal = foundName;
        }
      }

      // Safeguards
      if (!nameVal || nameVal === "Unnamed Target") {
        nameVal = "Unknown Lead";
      }
      if (!isValidEmail(emailVal)) {
        emailVal = "no-email@unmapped.io";
      }

      // Update mapped row with healed values
      mappedRow.name = nameVal;
      mappedRow.email = emailVal;
      mappedRow.phone = phoneVal;

      // Save mapped data
      tempMapped.push(mappedRow);

      // Step 5: Bulk Validation Check
      if (!nameVal || !emailVal || emailVal === "no-email@unmapped.io") {
        errors.push({
          row: i + 1,
          name: nameVal || "Unnamed Target",
          field: !nameVal ? "Full Name" : "Work Email",
          reason: "Required field is empty or missing content."
        });
      }

      if (emailVal && emailVal !== "no-email@unmapped.io" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
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
      const duplicateMatch = existingLeads.some(ex => 
        (emailVal !== "" && ex.email.toLowerCase().trim() === emailVal.toLowerCase()) || 
        (phoneVal !== "" && companyVal !== "" && ex.phone === phoneVal && ex.company.toLowerCase().trim() === companyVal.toLowerCase())
      );

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
    // Determine rows to import first
    const finalRowsToImport = mappedRows.filter((_, idx) => {
      const email = (mappedRows[idx].email || "").toString().trim().toLowerCase();
      const phone = (mappedRows[idx].phone || "").toString().trim();
      const company = (mappedRows[idx].company || "").toString().trim().toLowerCase();
      
      const isDupe = existingLeads.some(ex => 
        (email !== "" && ex.email.toLowerCase().trim() === email) ||
        (phone !== "" && company !== "" && ex.phone === phone && ex.company.toLowerCase().trim() === company)
      );
      
      return !isDupe; // Automatically filter conflicts to prevent dirtying outreach
    });

    setFinalImportedLeads(finalRowsToImport);
    setIsImporting(true);
    setStep(4);
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
            onImportComplete(finalRowsToImport, sumData);
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
    <div >
      <div 
        id="crm-field-mapping-panel" 
        
      >
        {/* Header bar */}
        <div >
          <div >
            <div >
              <FileSpreadsheet  />
            </div>
            <div>
              <h3 >AI Schema-Aware Lead Importer</h3>
              <p >Directly import leads catalog and auto-build campaign pipeline</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            
          >
            &times;
          </button>
        </div>

        {/* Wizard progress rail */}
        <div >
          {[
            { nr: 1, name: "Upload Data" },
            { nr: 2, name: "Resolve Properties" },
            { nr: 3, name: "Preview & Validate" },
            { nr: 4, name: "Complete Sync" }
          ].map((st) => {
            const active = step === st.nr || (st.nr === 4 && step === 4);
            const finished = step > st.nr;
            return (
              <div key={st.nr} >
                <span >
                  {finished ? "✓" : st.nr}
                </span>
                <span >
                  {st.name}
                </span>
                {st.nr < 4 && <ChevronRight  />}
              </div>
            );
          })}
        </div>

        {/* Dynamic Wizard Steps */}
        <div >
          
          {/* STEP 1: Drag and Drop upload (Task 2 Step 1) */}
          {step === 1 && (
            <div >
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                
              >
                <div >
                  <Upload  />
                </div>
                <div >
                  <p >Drag & Drop Leads Spreadsheet here</p>
                  <p >Accepts standard .csv or MS Excel .xlsx file formats</p>
                </div>
                
                <label >
                  Browse Files
                  <input 
                    type="file" 
                    onChange={handleFileUpload} 
                    accept=".csv, .xlsx, .xls" 
                     
                  />
                </label>
              </div>

              {savedTemplates.length > 0 && (
                <div >
                  <h4 >
                    <Database  />
                    Available Directory Mapping Presets
                  </h4>
                  <div >
                    {savedTemplates.map((tmpl) => (
                      <div 
                        key={tmpl.id} 
                        
                      >
                        <div >
                          <span >{tmpl.name}</span>
                          <span >Created: {new Date(tmpl.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => handleApplyTemplate(tmpl)}
                          
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
            <div >
              {/* AI Auto-Map & Clean Clutter Banner */}
              <div id="ai-import-autoclean-banner" >
                <div >
                  <div >
                    <Database  />
                  </div>
                  <div >
                    <h4 >
                      Zyntra AI Intelligent Clean & Auto-Map
                      {isAiAligning && <span >CLEANSING ACTIVE</span>}
                      {aiRunSuccess && <span >Healed & Column-Mapped</span>}
                    </h4>
                    <p >
                      Advanced neural alignment analyzes incoming cells, auto-matches target fields, and automatically repairs cluttered data (e.g., swapped phone numbers in email column and email addresses in phone column).
                    </p>
                    {aiClutterReport && (
                      <div >
                        <strong>AI Alignment Report:</strong> {aiClutterReport}
                      </div>
                    )}
                  </div>
                </div>

                <div >
                  <button
                    onClick={() => triggerAiAlignment(fileHeaders, rawRows)}
                    disabled={isAiAligning}
                    
                  >
                    {isAiAligning ? (
                      <>
                        <Loader2  />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Database  />
                        Inspect & De-Clutter rows
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div >
                <span >
                  <CheckCircle2  />
                  Auto-Detected {fileHeaders.length} Columns from '{fileName}'. Mapping suggested below.
                </span>
                <span >{rawRows.length} total rows parsed</span>
              </div>

              <div >
                
                {/* Left side: CSV Field Match table */}
                <div >
                  <h4 >
                    Establish Mappings (Spreadsheet → CRM Properties)
                  </h4>
                  
                  <div >
                    <div >
                      <span>Source Column</span>
                      <span>Target CRM Field Mapping</span>
                    </div>

                    {fileHeaders.map((header) => {
                      const currentMappedKey = mapping[header];
                      return (
                        <div key={header} >
                          <span  title={header}>
                            {header}
                          </span>
                          
                          <select
                            value={currentMappedKey}
                            onChange={(e) => setMapping({ ...mapping, [header]: e.target.value })}
                            
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
                <div >
                  {/* Dynamic field creator (Task 2 Step 3 option) */}
                  <div >
                    <div >
                      <h4 >Custom Target Properties</h4>
                      <p >
                        Need dynamic custom CRM filters that are not prebuilt? Provision custom fields right now!
                      </p>
                    </div>

                    {customFields.length > 0 && (
                      <div >
                        {customFields.map(cf => (
                          <span key={cf} >
                            {cf}
                          </span>
                        ))}
                      </div>
                    )}

                    {!showCustomFieldInput ? (
                      <button
                        onClick={() => setShowCustomFieldInput(true)}
                        
                      >
                        <Plus  />
                        Create CRM custom field...
                      </button>
                    ) : (
                      <div >
                        <input
                          type="text"
                          placeholder="e.g. Sales_Territory, LinkedIn_Inbound"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                          
                        />
                        <div >
                          <button
                            onClick={handleCreateCustomField}
                            
                          >
                            Provision Field
                          </button>
                          <button
                            onClick={() => setShowCustomFieldInput(false)}
                            
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reusable template checklist (Task 2 named reusable templates) */}
                  <div >
                    <div >
                      <h4 >Save as Reusable Template</h4>
                      <p >Save mappings to avoid reproducing these steps on similar lists later.</p>
                    </div>

                    <label >
                      <input
                        type="checkbox"
                        checked={saveAsTemplate}
                        onChange={(e) => setSaveAsTemplate(e.target.checked)}
                        
                      />
                      <span >Save mapping as Named Template Preset</span>
                    </label>

                    {saveAsTemplate && (
                      <input
                        type="text"
                        placeholder="e.g. Apollo CSV Mappings, Inbound_SDR_List_Preset"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        
                      />
                    )}
                  </div>
                </div>
              </div>

              <div >
                <button
                  onClick={() => setStep(1)}
                  
                >
                  Back Upload
                </button>
                <button
                  onClick={processValidationAndDuplicates}
                  
                >
                  Run Validation & Conflicts
                  <ArrowRight  />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview, Validation, and Duplicates check (Task 2 Steps 4 & 5) */}
          {step === 3 && (
            <div >
              
              {/* Conflicts and validations summary cards */}
              <div >
                {/* Outbound Warnings */}
                <div >
                  <h4 >
                    <AlertTriangle  />
                    Bulk Format & Mismatch Validation Results ({validationErrors.length} Flags)
                  </h4>
                  <p >
                    {validationErrors.length === 0 
                    ? "✓ Excellent! All parsed lead work emails, names, and intent score numeric values align correctly."
                    : "Some rows hold incomplete emails, empty required names, or numeric type contradictions:"}
                  </p>
                  {validationErrors.length > 0 && (
                    <div >
                      {validationErrors.slice(0, 10).map((err, i) => (
                        <div key={i} >
                          <span >Row {err.row}:</span>
                          <span >[{err.field}]</span>
                          <span >{err.reason}</span>
                        </div>
                      ))}
                      {validationErrors.length > 10 && (
                        <div >
                          + {validationErrors.length - 10} additional format warnings logged.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Duplication conflicts */}
                <div >
                  <h4 >
                    <Database  />
                    Duplicate Record Conflicts Isolator ({duplicateConflicts.length} Matches)
                  </h4>
                  <p >
                    {duplicateConflicts.length === 0 
                    ? "✓ No conflicts! No email or phone/company duplicates were detected inside active CRM databases."
                    : "Duplicate matches found based on matching emails or phone-company combinations:"}
                  </p>
                  {duplicateConflicts.length > 0 && (
                    <div >
                      {duplicateConflicts.slice(0, 10).map((dup, i) => (
                        <div key={i} >
                          <span >Row {dup.row}:</span>
                          <span >{dup.name}</span>
                          <span >({dup.email || dup.phone}) exists in pipeline</span>
                        </div>
                      ))}
                      {duplicateConflicts.length > 10 && (
                        <div >
                          + {duplicateConflicts.length - 10} further duplicates isolated for safe skipping.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mapped values preview (Task 2 Step 4 - First 10 rows preview) */}
              <div >
                <h4 >
                  Import Preview (First 10 Data Rows with suggested CRM Field Alignment)
                </h4>

                <div >
                  <table >
                    <thead>
                      <tr >
                        <th >Row No.</th>
                        <th >Full Name *</th>
                        <th >Work Email *</th>
                        <th >Direct Phone</th>
                        <th >Company</th>
                        <th >Job Title</th>
                        <th >Intent Score</th>
                        {customFields.map(cf => (
                          <th key={cf} >{cf}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody >
                      {mappedRows.slice(0, 10).map((row, i) => {
                        const hasErrors = validationErrors.some(err => err.row === i + 1);
                        const isDupe = duplicateConflicts.some(err => err.row === i + 1);
                        
                        return (
                          <tr 
                            key={i} 
                            
                          >
                            <td >
                              {i + 1}
                              {isDupe && <span >[Dupe]</span>}
                              {hasErrors && <span >[Error]</span>}
                            </td>
                            <td >
                              {row.name || "Missing!"}
                            </td>
                            <td >
                              {row.email || "Missing!"}
                            </td>
                            <td >{row.phone || "—"}</td>
                            <td >{row.company || "—"}</td>
                            <td >{row.role || "—"}</td>
                            <td >{row.score || "60"}</td>
                            {customFields.map(cf => (
                              <td key={cf} >{row[cf] || "—"}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div >
                <button
                  onClick={() => setStep(2)}
                  
                >
                  Adjust Properties Mapping
                </button>
                <div >
                  {duplicateConflicts.length > 0 && (
                    <div >
                      ⚠ Conflicts will be safely filtered in background.
                    </div>
                  )}
                  <button
                    onClick={handleConfirmImport}
                    
                  >
                    <Play  />
                    Confirm Bulk Sync
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* STEP 4: Live progress stream and log readout (Task 2 Step 6) */}
          {step === 4 && (
            <div >
              <div >
                <h4 >
                  {isImporting ? (
                    <>
                      <Loader2  />
                      Streaming Transactions Thread
                    </>
                  ) : (
                    <>
                      <CheckCircle2  />
                      Prospect Importation Completed Successfully
                    </>
                  )}
                </h4>
                <span >{progress}%</span>
              </div>

              {/* Progress Bar */}
              <div >
                <div 
                  
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Import Logs live terminal feed (Task 2 Step 6 terminal) */}
              <div >
                {importLogs.map((log, i) => (
                  <div 
                    key={i} 
                    
                  >
                    <span >[{new Date().toLocaleTimeString()}]</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>

              {/* Summary metadata statistics inside panel */}
              {importSummary && (
                <div >
                  <div>
                    <span >Import Transaction ID</span>
                    <span >{importSummary.import_id}</span>
                  </div>
                  <div>
                    <span >Total Scanned Rows</span>
                    <span >{importSummary.total_rows}</span>
                  </div>
                  <div>
                    <span >Success Enrolled</span>
                    <span >{importSummary.success_count} profiles</span>
                  </div>
                  <div>
                    <span >Duplicates Skipped</span>
                    <span >{importSummary.failed_count} skipped_logs</span>
                  </div>
                </div>
              )}

              {/* Successfully Uploaded Prospects List (Visible when completed) */}
              {importSummary && finalImportedLeads.length > 0 && (
                <div >
                  <div >
                    <div >
                      <span  />
                      Uploaded Lead Database List ({finalImportedLeads.length})
                    </div>
                    <span >Targeted B2B Directory Rows Saved</span>
                  </div>

                  <div >
                    <table >
                      <thead>
                        <tr >
                          <th >#</th>
                          <th >Lead Name</th>
                          <th >Work Email</th>
                          <th >Phone Number</th>
                          <th >Company & Role</th>
                          <th >Score</th>
                        </tr>
                      </thead>
                      <tbody >
                        {finalImportedLeads.map((row, idx) => (
                          <tr key={idx} >
                            <td >{idx + 1}</td>
                            <td >{row.name || "—"}</td>
                            <td >{row.email || "—"}</td>
                            <td >{row.phone || "—"}</td>
                            <td >
                              <span >{row.company || "—"}</span>
                              {row.role && <span >{row.role}</span>}
                            </td>
                            <td >{row.score || 60}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!isImporting && (
                <div >
                  <button
                    onClick={onClose}
                    
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
