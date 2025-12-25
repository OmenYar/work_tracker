import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileSpreadsheet, FileText, Download, Eye, Save, FolderOpen, Trash2,
    ChevronDown, ChevronUp, Filter, Columns, Calendar, RefreshCw, X, Check, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

// Field definitions for each module
const MODULE_FIELDS = {
    tracker: {
        label: 'Tracker BAST',
        fields: [
            { key: 'site_id_1', label: 'Site ID', type: 'text' },
            { key: 'site_name', label: 'Site Name', type: 'text' },
            { key: 'regional', label: 'Regional', type: 'text' },
            { key: 'suspected', label: 'Suspected', type: 'text' },
            { key: 'customer', label: 'Customer', type: 'text' },
            { key: 'status_pekerjaan', label: 'Status Pekerjaan', type: 'text' },
            { key: 'status_bast', label: 'Status BAST', type: 'text' },
            { key: 'main_addwork', label: 'Main Addwork', type: 'text' },
            { key: 'tt_number', label: 'TT Number', type: 'text' },
            { key: 'po_number', label: 'PO Number', type: 'text' },
            { key: 'bast_submit_date', label: 'Submit Date', type: 'date' },
            { key: 'bast_approve_date', label: 'Approve Date', type: 'date' },
            { key: 'aging_days', label: 'Aging Days', type: 'number' },
            { key: 'created_at', label: 'Created At', type: 'date' },
        ]
    },
    pic: {
        label: 'Data PIC',
        fields: [
            { key: 'nama_pic', label: 'Nama PIC', type: 'text' },
            { key: 'jabatan', label: 'Jabatan', type: 'text' },
            { key: 'regional', label: 'Regional', type: 'text' },
            { key: 'nik_karyawan', label: 'NIK Karyawan', type: 'text' },
            { key: 'nik_ktp', label: 'NIK KTP', type: 'text' },
            { key: 'no_hp', label: 'No. HP', type: 'text' },
            { key: 'validasi', label: 'Status Aktif', type: 'text' },
            { key: 'status_transisi', label: 'Status Transisi', type: 'text' },
            { key: 'tgl_join', label: 'Tanggal Join', type: 'date' },
            { key: 'tgl_berakhir', label: 'Tanggal Berakhir', type: 'date' },
            { key: 'area', label: 'Area', type: 'text' },
            { key: 'created_at', label: 'Created At', type: 'date' },
        ]
    },
    car: {
        label: 'Data Mobil',
        fields: [
            { key: 'nomor_polisi', label: 'Nomor Polisi', type: 'text' },
            { key: 'merk_mobil', label: 'Merk Mobil', type: 'text' },
            { key: 'model', label: 'Model', type: 'text' },
            { key: 'tahun', label: 'Tahun', type: 'text' },
            { key: 'area', label: 'Regional/Area', type: 'text' },
            { key: 'condition', label: 'Kondisi', type: 'text' },
            { key: 'service_score', label: 'Service Score', type: 'number' },
            { key: 'created_at', label: 'Created At', type: 'date' },
        ]
    },
    cctv: {
        label: 'Data CCTV',
        fields: [
            { key: 'site_id_display', label: 'Site ID', type: 'text' },
            { key: 'site_name', label: 'Site Name', type: 'text' },
            { key: 'regional', label: 'Regional', type: 'text' },
            { key: 'status', label: 'Status', type: 'text' },
            { key: 'cctv_category', label: 'Kategori CCTV', type: 'text' },
            { key: 'created_at', label: 'Created At', type: 'date' },
        ]
    },
    module: {
        label: 'Module DPR2900',
        fields: [
            { key: 'site_id', label: 'Site ID', type: 'text' },
            { key: 'site_name', label: 'Site Name', type: 'text' },
            { key: 'regional', label: 'Regional', type: 'text' },
            { key: 'rfs_status', label: 'RFS Status', type: 'text' },
            { key: 'rfs_date', label: 'RFS Date', type: 'date' },
            { key: 'module_qty', label: 'Module Qty', type: 'number' },
            { key: 'created_at', label: 'Created At', type: 'date' },
        ]
    },
    smartlock: {
        label: 'SmartLock',
        fields: [
            { key: 'site_id', label: 'Site ID', type: 'text' },
            { key: 'site_name', label: 'Site Name', type: 'text' },
            { key: 'regional', label: 'Regional', type: 'text' },
            { key: 'lock_status', label: 'Lock Status', type: 'text' },
            { key: 'installation_date', label: 'Installation Date', type: 'date' },
            { key: 'created_at', label: 'Created At', type: 'date' },
        ]
    }
};

// Regional options
const REGIONAL_OPTIONS = ['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'];

// DB table mapping
const DB_TABLES = {
    tracker: 'work_trackers',
    pic: 'pic_data',
    car: 'car_data',
    cctv: 'cctv_data',
    module: 'module_tracker',
    smartlock: 'smartlock_data'
};

const ReportBuilder = ({ onClose }) => {
    const { toast } = useToast();
    const { user } = useAuth();

    // State
    const [selectedModule, setSelectedModule] = useState('tracker');
    const [selectedFields, setSelectedFields] = useState([]);
    const [filters, setFilters] = useState({
        dateFrom: '',
        dateTo: '',
        regional: 'all',
        status: 'all'
    });
    const [previewData, setPreviewData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [showFieldPicker, setShowFieldPicker] = useState(true);
    const [showFilters, setShowFilters] = useState(true);

    // Saved templates state
    const [savedTemplates, setSavedTemplates] = useState([]);
    const [templateName, setTemplateName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

    // Get current module config
    const currentModule = MODULE_FIELDS[selectedModule];

    // Toggle field selection
    const toggleField = useCallback((fieldKey) => {
        setSelectedFields(prev =>
            prev.includes(fieldKey)
                ? prev.filter(f => f !== fieldKey)
                : [...prev, fieldKey]
        );
    }, []);

    // Select all fields
    const selectAllFields = useCallback(() => {
        setSelectedFields(currentModule.fields.map(f => f.key));
    }, [currentModule]);

    // Clear all fields
    const clearAllFields = useCallback(() => {
        setSelectedFields([]);
    }, []);

    // Format value for display
    const formatValue = useCallback((value, type) => {
        if (value === null || value === undefined) return '-';
        if (type === 'date' && value) {
            try {
                return format(new Date(value), 'dd MMM yyyy', { locale: idLocale });
            } catch {
                return value;
            }
        }
        return String(value);
    }, []);

    // Fetch preview data
    const fetchPreviewData = useCallback(async () => {
        if (selectedFields.length === 0) {
            toast({
                title: "Pilih Field",
                description: "Pilih minimal satu field untuk preview",
                variant: "destructive"
            });
            return;
        }

        setIsPreviewing(true);
        setIsLoading(true);

        try {
            const tableName = DB_TABLES[selectedModule];
            let query = supabase.from(tableName).select(selectedFields.join(','));

            // Apply filters
            if (filters.regional && filters.regional !== 'all') {
                query = query.eq('regional', filters.regional);
            }
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo + 'T23:59:59');
            }

            // Limit for preview
            query = query.limit(100);

            const { data, error } = await query;

            if (error) throw error;

            setPreviewData(data || []);
            toast({
                title: "Preview Ready",
                description: `Menampilkan ${data?.length || 0} data`
            });
        } catch (error) {
            console.error('Error fetching preview:', error);
            toast({
                title: "Error",
                description: "Gagal mengambil data preview",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [selectedModule, selectedFields, filters, toast]);

    // Export to Excel
    const exportToExcel = useCallback(async () => {
        if (selectedFields.length === 0) {
            toast({
                title: "Pilih Field",
                description: "Pilih minimal satu field untuk export",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const tableName = DB_TABLES[selectedModule];
            let query = supabase.from(tableName).select(selectedFields.join(','));

            if (filters.regional && filters.regional !== 'all') {
                query = query.eq('regional', filters.regional);
            }
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo + 'T23:59:59');
            }

            const { data, error } = await query;

            if (error) throw error;

            // Create header mapping
            const headers = selectedFields.map(key => {
                const field = currentModule.fields.find(f => f.key === key);
                return field?.label || key;
            });

            // Format data for Excel
            const excelData = (data || []).map(row => {
                const formatted = {};
                selectedFields.forEach((key, idx) => {
                    const field = currentModule.fields.find(f => f.key === key);
                    formatted[headers[idx]] = formatValue(row[key], field?.type);
                });
                return formatted;
            });

            // Create workbook
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, currentModule.label);

            // Download
            const fileName = `Report_${currentModule.label}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast({
                title: "Export Berhasil",
                description: `File ${fileName} telah didownload`
            });
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            toast({
                title: "Error",
                description: "Gagal export ke Excel",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [selectedModule, selectedFields, filters, currentModule, formatValue, toast]);

    // Export to PDF
    const exportToPDF = useCallback(async () => {
        if (selectedFields.length === 0) {
            toast({
                title: "Pilih Field",
                description: "Pilih minimal satu field untuk export",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const tableName = DB_TABLES[selectedModule];
            let query = supabase.from(tableName).select(selectedFields.join(','));

            if (filters.regional && filters.regional !== 'all') {
                query = query.eq('regional', filters.regional);
            }
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo + 'T23:59:59');
            }

            const { data, error } = await query;

            if (error) throw error;

            // Create PDF
            const doc = new jsPDF('l', 'mm', 'a4');

            // Title
            doc.setFontSize(16);
            doc.text(`Report ${currentModule.label}`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: idLocale })}`, 14, 22);

            // Headers
            const headers = selectedFields.map(key => {
                const field = currentModule.fields.find(f => f.key === key);
                return field?.label || key;
            });

            // Table data
            const tableData = (data || []).map(row =>
                selectedFields.map(key => {
                    const field = currentModule.fields.find(f => f.key === key);
                    return formatValue(row[key], field?.type);
                })
            );

            // Generate table
            autoTable(doc, {
                head: [headers],
                body: tableData,
                startY: 28,
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [139, 92, 246], textColor: 255 },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });

            // Download
            const fileName = `Report_${currentModule.label}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
            doc.save(fileName);

            toast({
                title: "Export Berhasil",
                description: `File ${fileName} telah didownload`
            });
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            toast({
                title: "Error",
                description: "Gagal export ke PDF",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [selectedModule, selectedFields, filters, currentModule, formatValue, toast]);

    // Save template
    const saveTemplate = useCallback(async () => {
        if (!templateName.trim()) {
            toast({
                title: "Nama Template",
                description: "Masukkan nama template",
                variant: "destructive"
            });
            return;
        }

        if (selectedFields.length === 0) {
            toast({
                title: "Pilih Field",
                description: "Pilih minimal satu field untuk disimpan",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await supabase.from('report_templates').insert({
                user_id: user?.id,
                name: templateName.trim(),
                module: selectedModule,
                selected_fields: selectedFields,
                filters: filters
            });

            if (error) throw error;

            toast({
                title: "Template Disimpan",
                description: `Template "${templateName}" berhasil disimpan`
            });
            setTemplateName('');
            setShowSaveDialog(false);
        } catch (error) {
            console.error('Error saving template:', error);
            toast({
                title: "Error",
                description: error.message || "Gagal menyimpan template",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }, [templateName, selectedModule, selectedFields, filters, user, toast]);

    // Load templates
    const loadTemplates = useCallback(async () => {
        setIsLoadingTemplates(true);

        try {
            const { data, error } = await supabase
                .from('report_templates')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setSavedTemplates(data || []);
        } catch (error) {
            console.error('Error loading templates:', error);
            toast({
                title: "Error",
                description: "Gagal memuat template",
                variant: "destructive"
            });
        } finally {
            setIsLoadingTemplates(false);
        }
    }, [user, toast]);

    // Apply template
    const applyTemplate = useCallback((template) => {
        setSelectedModule(template.module);
        setSelectedFields(template.selected_fields || []);
        setFilters(template.filters || {
            dateFrom: '',
            dateTo: '',
            regional: 'all',
            status: 'all'
        });
        setShowLoadDialog(false);
        toast({
            title: "Template Diterapkan",
            description: `Template "${template.name}" telah diterapkan`
        });
    }, [toast]);

    // Delete template
    const deleteTemplate = useCallback(async (templateId, templateName) => {
        try {
            const { error } = await supabase
                .from('report_templates')
                .delete()
                .eq('id', templateId);

            if (error) throw error;

            setSavedTemplates(prev => prev.filter(t => t.id !== templateId));
            toast({
                title: "Template Dihapus",
                description: `Template "${templateName}" telah dihapus`
            });
        } catch (error) {
            console.error('Error deleting template:', error);
            toast({
                title: "Error",
                description: "Gagal menghapus template",
                variant: "destructive"
            });
        }
    }, [toast]);

    // Get selected field labels for display
    const selectedFieldLabels = useMemo(() => {
        return selectedFields.map(key => {
            const field = currentModule.fields.find(f => f.key === key);
            return field?.label || key;
        });
    }, [selectedFields, currentModule]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Report Builder
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Buat laporan custom dengan memilih field dan filter yang diinginkan
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Load Template Button */}
                    <Dialog open={showLoadDialog} onOpenChange={(open) => {
                        setShowLoadDialog(open);
                        if (open) loadTemplates();
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <FolderOpen className="h-4 w-4 mr-2" />
                                Load Template
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Load Template</DialogTitle>
                                <DialogDescription>
                                    Pilih template yang tersimpan untuk diterapkan
                                </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                                {isLoadingTemplates ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : savedTemplates.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        Belum ada template tersimpan
                                    </p>
                                ) : (
                                    savedTemplates.map(template => (
                                        <div
                                            key={template.id}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex-1 cursor-pointer" onClick={() => applyTemplate(template)}>
                                                <p className="font-medium">{template.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {MODULE_FIELDS[template.module]?.label} • {template.selected_fields?.length || 0} fields
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => deleteTemplate(template.id, template.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Save Template Button */}
                    <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Save className="h-4 w-4 mr-2" />
                                Save Template
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Save Template</DialogTitle>
                                <DialogDescription>
                                    Simpan konfigurasi report ini sebagai template
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="templateName">Nama Template</Label>
                                    <Input
                                        id="templateName"
                                        placeholder="Contoh: Laporan Bulanan Regional 1"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                    />
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <p><strong>Module:</strong> {currentModule.label}</p>
                                    <p><strong>Fields:</strong> {selectedFields.length} dipilih</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                                    Batal
                                </Button>
                                <Button onClick={saveTemplate} disabled={isLoading}>
                                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Module Selector */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Columns className="h-4 w-4" />
                        Pilih Module
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {Object.entries(MODULE_FIELDS).map(([key, config]) => (
                            <Button
                                key={key}
                                variant={selectedModule === key ? "default" : "outline"}
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                    setSelectedModule(key);
                                    setSelectedFields([]);
                                    setPreviewData([]);
                                }}
                            >
                                {config.label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Field Picker */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Columns className="h-4 w-4" />
                                Pilih Field ({selectedFields.length}/{currentModule.fields.length})
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowFieldPicker(!showFieldPicker)}
                            >
                                {showFieldPicker ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    <AnimatePresence>
                        {showFieldPicker && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CardContent className="pt-0">
                                    <div className="flex gap-2 mb-4">
                                        <Button variant="outline" size="sm" onClick={selectAllFields}>
                                            <Check className="h-3 w-3 mr-1" />
                                            Pilih Semua
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={clearAllFields}>
                                            <X className="h-3 w-3 mr-1" />
                                            Hapus Semua
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                                        {currentModule.fields.map(field => (
                                            <div
                                                key={field.key}
                                                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <Checkbox
                                                    id={field.key}
                                                    checked={selectedFields.includes(field.key)}
                                                    onCheckedChange={() => toggleField(field.key)}
                                                />
                                                <Label
                                                    htmlFor={field.key}
                                                    className="text-sm cursor-pointer flex-1"
                                                >
                                                    {field.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>

                {/* Filters */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                Filter Data
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CardContent className="pt-0 space-y-4">
                                    {/* Date Range */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Dari Tanggal
                                            </Label>
                                            <Input
                                                type="date"
                                                value={filters.dateFrom}
                                                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Sampai Tanggal
                                            </Label>
                                            <Input
                                                type="date"
                                                value={filters.dateTo}
                                                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {/* Regional Filter */}
                                    <div className="space-y-2">
                                        <Label>Regional</Label>
                                        <Select
                                            value={filters.regional}
                                            onValueChange={(value) => setFilters(prev => ({ ...prev, regional: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Semua Regional" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Semua Regional</SelectItem>
                                                {REGIONAL_OPTIONS.map(reg => (
                                                    <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Clear Filters */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => setFilters({
                                            dateFrom: '',
                                            dateTo: '',
                                            regional: 'all',
                                            status: 'all'
                                        })}
                                    >
                                        <RefreshCw className="h-3 w-3 mr-2" />
                                        Reset Filter
                                    </Button>
                                </CardContent>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
                <Button onClick={fetchPreviewData} disabled={isLoading || selectedFields.length === 0}>
                    {isLoading && !isPreviewing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Eye className="h-4 w-4 mr-2" />
                    )}
                    Preview Data
                </Button>
                <Button variant="outline" onClick={exportToExcel} disabled={isLoading || selectedFields.length === 0}>
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                    Export Excel
                </Button>
                <Button variant="outline" onClick={exportToPDF} disabled={isLoading || selectedFields.length === 0}>
                    <FileText className="h-4 w-4 mr-2 text-red-600" />
                    Export PDF
                </Button>
            </div>

            {/* Preview Table */}
            {isPreviewing && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Preview Data ({previewData.length} rows)
                        </CardTitle>
                        <CardDescription>
                            Menampilkan maksimal 100 data. Export untuk mendapatkan semua data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-auto max-h-[400px]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background">
                                    <TableRow>
                                        {selectedFieldLabels.map((label, idx) => (
                                            <TableHead key={idx} className="whitespace-nowrap">
                                                {label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={selectedFields.length} className="text-center py-8 text-muted-foreground">
                                                Tidak ada data
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        previewData.map((row, rowIdx) => (
                                            <TableRow key={rowIdx}>
                                                {selectedFields.map((key, colIdx) => {
                                                    const field = currentModule.fields.find(f => f.key === key);
                                                    return (
                                                        <TableCell key={colIdx} className="whitespace-nowrap">
                                                            {formatValue(row[key], field?.type)}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ReportBuilder;
