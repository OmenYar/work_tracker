import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import * as XLSX from 'xlsx';

// Column mapping from Excel to database (case-insensitive, multiple variants)
const COLUMN_MAPPING = {
    'site_id': ['SITE ID', 'Site ID', 'site_id', 'SITE_ID', 'SiteID'],
    'site_name': ['SITE NAME', 'Site Name', 'site_name', 'SITE_NAME', 'SiteName'],
    'provinsi': ['PROVINSI', 'Provinsi', 'provinsi', 'Province'],
    'kab_kota': ['KAB/KOTA', 'Kab/Kota', 'kab_kota', 'KABKOTA', 'Kabupaten'],
    'mitra': ['MITRA', 'Mitra', 'mitra', 'Vendor'],
    'module_qty': ['MODULE QTY', 'Module Qty', 'module_qty', 'ModuleQty', 'Qty'],
    'plan_week': ['WEEK', 'Week', 'week', 'Plan Week'],
    'hw_plan': ['HW Plan', 'HW PLAN', 'hw_plan', 'HWPlan'],
    'rfs_status': ['RFS STATUS', 'RFS Status', 'rfs_status', 'Status'],
    'rfs_date': ['RFS Date', 'RFS DATE', 'rfs_date', 'RFSDate'],
    'install_qty': ['Install Qty', 'INSTALL QTY', 'install_qty', 'InstallQty'],
    'gap': ['GAP', 'Gap', 'gap'],
    'priority': ['PRIORITY', 'Priority', 'priority'],
    'tower_provider': ['TOWER PROVIDER', 'Tower Provider', 'tower_provider'],
};

const ModuleExcelImport = ({ open, onClose, onSuccess }) => {
    const { toast } = useToast();
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importResult, setImportResult] = useState(null);
    const [errorMessages, setErrorMessages] = useState([]);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
            toast({ title: 'Error', description: 'Please select an Excel file (.xlsx or .xls)', variant: 'destructive' });
            return;
        }

        setFile(selectedFile);
        setErrorMessages([]);
        parseExcel(selectedFile);
    };

    const parseExcel = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                setTotalRows(jsonData.length);
                setPreviewData(jsonData.slice(0, 5)); // Show first 5 rows as preview
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to parse Excel file', variant: 'destructive' });
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Find matching column from Excel headers
    const findColumn = (row, dbCol) => {
        const variants = COLUMN_MAPPING[dbCol] || [];
        for (const variant of variants) {
            if (row[variant] !== undefined) {
                return row[variant];
            }
        }
        return null;
    };

    const mapRowToDatabase = (row) => {
        const mapped = {};

        Object.keys(COLUMN_MAPPING).forEach(dbCol => {
            let value = findColumn(row, dbCol);

            // Handle date conversion
            if (dbCol === 'rfs_date' && value) {
                if (typeof value === 'number') {
                    // Excel serial date
                    const date = new Date((value - 25569) * 86400 * 1000);
                    value = date.toISOString().split('T')[0];
                } else if (typeof value === 'string' && value.length > 0) {
                    // Try to parse string date
                    const parsed = new Date(value);
                    if (!isNaN(parsed.getTime())) {
                        value = parsed.toISOString().split('T')[0];
                    } else {
                        value = null;
                    }
                } else {
                    value = null;
                }
            }

            // Handle number conversion
            if (['module_qty', 'install_qty', 'gap'].includes(dbCol)) {
                value = parseInt(value) || 0;
            }

            // Only add non-null values
            if (value !== null && value !== undefined && value !== '') {
                mapped[dbCol] = value;
            }
        });

        // Set default values - case insensitive check
        if (mapped.site_id) {
            const rfsLower = String(mapped.rfs_status || '').toLowerCase();
            mapped.install_status = rfsLower === 'done' ? 'Done' : 'Pending';
        }

        return mapped;
    };

    const handleImport = async () => {
        if (!file) return;

        setIsImporting(true);
        setImportProgress(0);
        setImportResult(null);
        setErrorMessages([]);

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                // Map and filter valid data (must have site_id)
                const mappedData = jsonData
                    .map(row => mapRowToDatabase(row))
                    .filter(row => row.site_id);

                const batchSize = 50;
                let successCount = 0;
                let errorCount = 0;
                const errors = [];

                for (let i = 0; i < mappedData.length; i += batchSize) {
                    const batch = mappedData.slice(i, i + batchSize);

                    // Use insert instead of upsert
                    const { error } = await supabase
                        .from('module_tracker')
                        .insert(batch);

                    if (error) {
                        errorCount += batch.length;
                        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
                        console.error('Import error:', error);
                    } else {
                        successCount += batch.length;
                    }

                    setImportProgress(Math.round(((i + batch.length) / mappedData.length) * 100));
                }

                setImportResult({ success: successCount, error: errorCount });
                setErrorMessages(errors.slice(0, 3)); // Show max 3 errors
                setIsImporting(false);

                if (successCount > 0) {
                    toast({
                        title: 'Import Berhasil',
                        description: `${successCount} data berhasil diimport`
                    });
                    onSuccess?.();
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreviewData([]);
        setTotalRows(0);
        setImportProgress(0);
        setImportResult(null);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        Import Data Module dari Excel
                    </DialogTitle>
                    <DialogDescription>
                        Upload file Excel dengan data module DPR2900. Kolom yang akan diimport:
                        Site ID, Site Name, Provinsi, Kab/Kota, Mitra, Module Qty, Week, RFS Status, RFS Date.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* File Upload */}
                    {!file && (
                        <div
                            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Click to select Excel file (.xlsx, .xls)
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>
                    )}

                    {/* File Selected */}
                    {file && !importResult && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4" />
                                        {file.name}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setFile(null); setPreviewData([]); }}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </CardTitle>
                                <CardDescription>
                                    Total: {totalRows} rows
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground mb-2">Preview (5 rows pertama):</p>
                                <div className="overflow-x-auto max-h-[200px] text-xs">
                                    <table className="w-full border">
                                        <thead>
                                            <tr className="bg-muted">
                                                {previewData[0] && Object.keys(previewData[0]).slice(0, 6).map(key => (
                                                    <th key={key} className="border px-2 py-1 text-left">{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewData.map((row, i) => (
                                                <tr key={i}>
                                                    {Object.values(row).slice(0, 6).map((val, j) => (
                                                        <td key={j} className="border px-2 py-1 truncate max-w-[150px]">
                                                            {String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Import Progress */}
                    {isImporting && (
                        <div className="space-y-2">
                            <Progress value={importProgress} />
                            <p className="text-sm text-center text-muted-foreground">
                                Importing... {importProgress}%
                            </p>
                        </div>
                    )}

                    {/* Import Result */}
                    {importResult && (
                        <Card className={importResult.error > 0 ? 'border-yellow-500' : 'border-green-500'}>
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-3">
                                    {importResult.error === 0 ? (
                                        <Check className="w-8 h-8 text-green-600" />
                                    ) : (
                                        <AlertCircle className="w-8 h-8 text-yellow-600" />
                                    )}
                                    <div>
                                        <p className="font-medium">Import Selesai</p>
                                        <p className="text-sm text-muted-foreground">
                                            ✅ Berhasil: {importResult.success} |
                                            ❌ Gagal: {importResult.error}
                                        </p>
                                    </div>
                                </div>
                                {errorMessages.length > 0 && (
                                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                                        <p className="font-medium mb-1">Error details:</p>
                                        {errorMessages.map((msg, i) => (
                                            <p key={i}>{msg}</p>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        {importResult ? 'Tutup' : 'Batal'}
                    </Button>
                    {file && !importResult && (
                        <Button onClick={handleImport} disabled={isImporting}>
                            {isImporting ? 'Importing...' : `Import ${totalRows} Data`}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ModuleExcelImport;
