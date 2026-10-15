'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function CSVImportExportPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [csvText, setCsvText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [fullRows, setFullRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'import_anyway'>('skip');

  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);

  const LEADFLOW_FIELDS = [
    { key: '', label: '-- Skip Column --' },
    { key: 'businessName', label: 'Business Name (Required)' },
    { key: 'contactName', label: 'Contact Person Name' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'email', label: 'Email Address' },
    { key: 'city', label: 'City' },
    { key: 'category', label: 'Business Category' },
    { key: 'websiteUrl', label: 'Website URL' },
    { key: 'source', label: 'Lead Source' },
    { key: 'dealValue', label: 'Expected Deal Value' },
    { key: 'address', label: 'Address' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleParsePreview = async () => {
    if (!csvText.trim()) {
      setError('Please paste or upload CSV content');
      return;
    }
    setError(null);
    setParsing(true);

    try {
      const res = await fetch('/api/csv/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse CSV');

      setHeaders(data.headers);
      setSampleRows(data.sampleRows);
      setFullRows(data.fullRows);
      setColumnMapping(data.detectedMapping || {});
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleExecuteImport = async () => {
    setError(null);
    setImporting(true);

    try {
      const res = await fetch('/api/csv/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: fullRows,
          columnMapping,
          duplicateStrategy,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setImportResult(data);
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadFailedRows = () => {
    if (!importResult?.errors?.length) return;
    const errorCsv =
      'Row,Business Name,Failure Reason\n' +
      importResult.errors.map((e: any) => `${e.row},"${e.businessName}","${e.reason}"`).join('\n');

    const blob = new Blob([errorCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed_import_rows_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            CSV Import & Export Engine
            <FileSpreadsheet className="w-5 h-5 text-gold-500" />
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Safely ingest business directories or export sanitized prospect datasets.
          </p>
        </div>

        <a href="/api/csv/export">
          <Button variant="outline" size="sm">
            <Download className="w-3.5 h-3.5" />
            <span>Export Clean CSV</span>
          </Button>
        </a>
      </div>

      {/* Guided Steps Indicator */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-charcoal-200 shadow-subtle flex items-center justify-between text-xs font-semibold">
        <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${step >= 1 ? 'text-gold-600 font-bold' : 'text-charcoal-400'}`}>
          <span className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-xs shrink-0">
            1
          </span>
          <span className="hidden sm:inline">Upload File</span>
        </div>
        <div className="flex-1 mx-1.5 sm:mx-3 h-px bg-charcoal-200 min-w-[6px]" />
        <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${step >= 2 ? 'text-gold-600 font-bold' : 'text-charcoal-400'}`}>
          <span className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-xs shrink-0">
            2
          </span>
          <span className="hidden sm:inline">Map Fields</span>
        </div>
        <div className="flex-1 mx-1.5 sm:mx-3 h-px bg-charcoal-200 min-w-[6px]" />
        <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${step >= 3 ? 'text-gold-600 font-bold' : 'text-charcoal-400'}`}>
          <span className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-xs shrink-0">
            3
          </span>
          <span className="hidden sm:inline">Duplicates</span>
        </div>
        <div className="flex-1 mx-1.5 sm:mx-3 h-px bg-charcoal-200 min-w-[6px]" />
        <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 ${step >= 4 ? 'text-gold-600 font-bold' : 'text-charcoal-400'}`}>
          <span className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-400/30 flex items-center justify-center text-xs shrink-0">
            4
          </span>
          <span className="hidden sm:inline">Results</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload / Paste */}
      {step === 1 && (
        <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-6">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900">Upload CSV File or Paste Raw Text</h3>
            <p className="text-xs text-charcoal-500 mt-0.5">
              UTF-8 encoded CSV files from business directories or outreach research.
            </p>
          </div>

          <div className="border-2 border-dashed border-charcoal-300 rounded-xl p-8 text-center hover:border-gold-500 transition-colors bg-charcoal-50/50">
            <Upload className="w-8 h-8 text-charcoal-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-charcoal-700">Choose a CSV file from your computer</p>
            <p className="text-[11px] text-charcoal-400 mt-1">UTF-8 format recommended</p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="mt-3 text-xs text-charcoal-600 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Or Paste CSV Raw Text Directly
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Business Name,Contact Person,Phone,Email,City,Category&#10;Naksh Interio,Rajesh Sharma,9876543210,rajesh@naksh.in,Meerut,Architecture"
              className="w-full text-xs font-mono border border-charcoal-300 rounded-lg p-3 text-charcoal-900 bg-charcoal-50/30"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="gold"
              size="md"
              onClick={handleParsePreview}
              isLoading={parsing}
              className="font-bold"
            >
              <span>Parse & Map Columns</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Map Fields */}
      {step === 2 && (
        <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-6">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900">Map CSV Columns to LeadFlow Fields</h3>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Confirm or adjust auto-detected field mappings before ingestion.
            </p>
          </div>

          <div className="space-y-3">
            {headers.map((header) => (
              <div
                key={header}
                className="p-3 rounded-lg border border-charcoal-200 bg-charcoal-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <span className="text-xs font-bold text-charcoal-900 font-mono">{header}</span>
                  <p className="text-[11px] text-charcoal-500">
                    Sample value: "{sampleRows[0]?.[header] || ''}"
                  </p>
                </div>

                <div className="w-full sm:w-64">
                  <select
                    value={columnMapping[header] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [header]: e.target.value,
                      }))
                    }
                    className="w-full text-xs border border-charcoal-300 rounded-lg p-2 bg-white text-charcoal-900"
                  >
                    {LEADFLOW_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-charcoal-100">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button variant="gold" size="sm" onClick={() => setStep(3)}>
              <span>Duplicate Handling</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Duplicate Settings */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-6">
          <div>
            <h3 className="text-sm font-bold text-charcoal-900">Configure Duplicate Resolution</h3>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Choose how to treat rows with matching phone numbers, emails, or business names.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-charcoal-200 hover:border-gold-500 cursor-pointer transition-colors">
              <input
                type="radio"
                name="duplicateStrategy"
                value="skip"
                checked={duplicateStrategy === 'skip'}
                onChange={() => setDuplicateStrategy('skip')}
                className="mt-0.5 text-gold-600 focus:ring-gold-500"
              />
              <div>
                <span className="text-xs font-bold text-charcoal-900 block">Skip Duplicates (Recommended)</span>
                <span className="text-[11px] text-charcoal-500">
                  Preserve existing lead details without modifying records or creating copies.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-charcoal-200 hover:border-gold-500 cursor-pointer transition-colors">
              <input
                type="radio"
                name="duplicateStrategy"
                value="update"
                checked={duplicateStrategy === 'update'}
                onChange={() => setDuplicateStrategy('update')}
                className="mt-0.5 text-gold-600 focus:ring-gold-500"
              />
              <div>
                <span className="text-xs font-bold text-charcoal-900 block">Update Existing Records</span>
                <span className="text-[11px] text-charcoal-500">
                  Update missing fields (website, city, category) on existing matching leads.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-charcoal-200 hover:border-gold-500 cursor-pointer transition-colors">
              <input
                type="radio"
                name="duplicateStrategy"
                value="import_anyway"
                checked={duplicateStrategy === 'import_anyway'}
                onChange={() => setDuplicateStrategy('import_anyway')}
                className="mt-0.5 text-gold-600 focus:ring-gold-500"
              />
              <div>
                <span className="text-xs font-bold text-charcoal-900 block">Import Anyway</span>
                <span className="text-[11px] text-charcoal-500">
                  Create new lead records regardless of possible phone or email matches.
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-between pt-4 border-t border-charcoal-100">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              variant="gold"
              size="md"
              onClick={handleExecuteImport}
              isLoading={importing}
              className="font-bold"
            >
              <span>Execute Ingestion ({fullRows.length} Rows)</span>
              <FileCheck className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result Summary */}
      {step === 4 && importResult && (
        <div className="bg-white p-6 rounded-xl border border-charcoal-200 shadow-subtle space-y-6">
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-charcoal-900">CSV Import Completed</h3>
            <p className="text-xs text-charcoal-500">
              Processed {importResult.totalRows} rows successfully.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-800">Imported</p>
              <p className="text-2xl font-bold text-emerald-700">{importResult.successCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-charcoal-50 border border-charcoal-200">
              <p className="text-xs font-semibold text-charcoal-700">Skipped (Duplicates)</p>
              <p className="text-2xl font-bold text-charcoal-900">{importResult.skippedCount}</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-xs font-semibold text-rose-800">Failed / Errors</p>
              <p className="text-2xl font-bold text-rose-700">{importResult.errorCount}</p>
            </div>
          </div>

          {importResult.errors?.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900">
                  {importResult.errors.length} Rows failed to import
                </span>
                <Button variant="outline" size="sm" onClick={handleDownloadFailedRows}>
                  <Download className="w-3.5 h-3.5" /> Download Error Report
                </Button>
              </div>
              <ul className="text-xs text-rose-800 space-y-1 list-disc list-inside">
                {importResult.errors.slice(0, 5).map((e: any, idx: number) => (
                  <li key={idx}>
                    Row {e.row}: {e.businessName} — {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-charcoal-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStep(1);
                setCsvText('');
                setImportResult(null);
              }}
            >
              Import Another File
            </Button>
            <Link href="/leads">
              <Button variant="gold" size="sm">
                View All Leads
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
