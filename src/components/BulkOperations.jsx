import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckSquare, Square, Trash2, Edit, Upload, Download, AlertTriangle,
    CheckCircle, X, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import * as XLSX from 'xlsx';

const BulkOperations = ({
    data = [],
    selectedIds = [],
    onSelectionChange,
    tableName = 'work_tracker',
    onRefresh,
    statusOptions = [],
    type = 'tracker' // 'tracker', 'car', 'cctv', 'pic'
}) => {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [bulkAction, setBulkAction] = useState('');
    const [importData, setImportData] = useState([]);
    const [importPreview, setImportPreview] = useState(false);

    const isAllSelected = data.length > 0 && selectedIds.length === data.length;
    const isSomeSelected = selectedIds.length > 0 && selectedIds.length < data.length;
    const hasSelection = selectedIds.length > 0;

    // Toggle select all
    const handleSelectAll = useCallback(() => {
        if (isAllSelected) {
            onSelectionChange([]);
        } else {
            onSelectionChange(data.map(item => item.id));
        }
    }, [data, isAllSelected, onSelectionChange]);

    // Toggle single selection
    const handleToggleSelect = useCallback((id) => {
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(i => i !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    }, [selectedIds, onSelectionChange]);

    // Bulk update status
    const handleBulkUpdateStatus = async (newStatus) => {
        if (!hasSelection || !newStatus) return;

        setIsProcessing(true);
        try {
            // For PIC, update 'validasi' field; for tracker, update 'status_pekerjaan'
            const updateField = type === 'pic' ? 'validasi' : (type === 'tracker' ? 'status_pekerjaan' : 'status');

            const { error } = await supabase
                .from(tableName)
                .update({ [updateField]: newStatus, updated_at: new Date().toISOString() })
                .in('id', selectedIds);

            if (error) throw error;

            toast({
                title: 'Bulk Update Successful',
                description: `${selectedIds.length} items updated to "${newStatus}"`,
            });

            onSelectionChange([]);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Bulk update error:', error);
            toast({
                title: 'Error',
                description: 'Failed to update items. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Bulk update jabatan (for PIC)
    const handleBulkUpdateJabatan = async (newJabatan) => {
        if (!hasSelection || !newJabatan || type !== 'pic') return;

        setIsProcessing(true);
        try {
            // Process in batches of 20 to avoid timeout
            const batchSize = 20;
            let successCount = 0;

            for (let i = 0; i < selectedIds.length; i += batchSize) {
                const batch = selectedIds.slice(i, i + batchSize);

                const { error } = await supabase
                    .from(tableName)
                    .update({ jabatan: newJabatan })
                    .in('id', batch);

                if (error) {
                    console.error('Batch update error:', error);
                    throw error;
                }

                successCount += batch.length;
            }

            toast({
                title: 'Bulk Update Successful',
                description: `${successCount} PIC jabatan updated to "${newJabatan}"`,
            });

            onSelectionChange([]);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Bulk update jabatan error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update jabatan. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Bulk update category (for CCTV)
    const handleBulkUpdateCategory = async (newCategory) => {
        if (!hasSelection || !newCategory || type !== 'cctv') return;

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from(tableName)
                .update({ cctv_category: newCategory, updated_at: new Date().toISOString() })
                .in('id', selectedIds);

            if (error) throw error;

            toast({
                title: 'Bulk Update Successful',
                description: `${selectedIds.length} CCTV category updated to "${newCategory}"`,
            });

            onSelectionChange([]);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Bulk update category error:', error);
            toast({
                title: 'Error',
                description: 'Failed to update category. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Bulk update RFS status (for Module)
    const handleBulkUpdateRfsStatus = async (newStatus) => {
        if (!hasSelection || !newStatus || type !== 'module') return;

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from(tableName)
                .update({ rfs_status: newStatus, updated_at: new Date().toISOString() })
                .in('id', selectedIds);

            if (error) throw error;

            toast({
                title: 'Bulk Update Successful',
                description: `${selectedIds.length} module RFS status updated to "${newStatus}"`,
            });

            onSelectionChange([]);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Bulk update RFS status error:', error);
            toast({
                title: 'Error',
                description: 'Failed to update RFS status. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Bulk update ATP Doc (for Module)
    const handleBulkUpdateAtpDoc = async (newStatus) => {
        if (!hasSelection || !newStatus || type !== 'module') return;

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from(tableName)
                .update({ doc_atp: newStatus, updated_at: new Date().toISOString() })
                .in('id', selectedIds);

            if (error) throw error;

            toast({
                title: 'Bulk Update Successful',
                description: `${selectedIds.length} module ATP Doc updated to "${newStatus}"`,
            });

            onSelectionChange([]);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Bulk update ATP Doc error:', error);
            toast({
                title: 'Error',
                description: 'Failed to update ATP Doc. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Bulk update SmartLock status
    const handleBulkUpdateSmartLockStatus = async (newStatus) => {
        if (!hasSelection || !newStatus || type !== 'smartlock') return;

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from(tableName)
                .update({ status_new: newStatus, updated_at: new Date().toISOString() })
                .in('id', selectedIds);

            if (error) throw error;

            toast({
                title: 'Bulk Update Successful',
                description: `${selectedIds.length} SmartLock status updated to "${newStatus}"`,
            });

            onSelectionChange([]);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Bulk update SmartLock status error:', error);
            toast({
                title: 'Error',
                description: 'Failed to update SmartLock status. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Bulk update Car status_mobil
    const handleBulkUpdateCarStatus = async (newStatus) => {
        if (!hasSelection || !newStatus || type !== 'car') return;

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from(tableName)
                .update({ status_mobil: newStatus, updated_at: new Date().toISOString() })
                .in('id', selectedIds);

            if (error) throw error;

            toast({
                title: 'Bulk Update Successful',
                description: `${selectedIds.length} car status updated to "${newStatus}"`,
            });

            onSelectionChange([]);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Bulk update car status error:', error);
            toast({
                title: 'Error',
                description: 'Failed to update car status. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Bulk approve BAST
    const handleBulkApproveBAST = async () => {
        if (!hasSelection || type !== 'tracker') return;

        setIsProcessing(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            const { error } = await supabase
                .from(tableName)
                .update({
                    status_bast: 'Approve',
                    bast_approve_date: today,
                    updated_at: new Date().toISOString()
                })
                .in('id', selectedIds);

            if (error) throw error;

            toast({
                title: 'BAST Approved',
                description: `${selectedIds.length} BAST documents approved`,
            });

            onSelectionChange([]);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Bulk BAST approve error:', error);
            toast({
                title: 'Error',
                description: 'Failed to approve BAST. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Bulk delete
    const handleBulkDelete = async () => {
        if (!hasSelection) return;

        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .in('id', selectedIds);

            if (error) throw error;

            toast({
                title: 'Bulk Delete Successful',
                description: `${selectedIds.length} items deleted`,
            });

            onSelectionChange([]);
            setShowDeleteDialog(false);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Bulk delete error:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete items. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle Excel import
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                setImportData(jsonData);
                setImportPreview(true);
            } catch (error) {
                console.error('Excel parse error:', error);
                toast({
                    title: 'Error',
                    description: 'Failed to read Excel file. Please check the format.',
                    variant: 'destructive',
                });
            }
        };
        reader.readAsBinaryString(file);
    };

    // Process import
    const handleImportConfirm = async () => {
        if (importData.length === 0) return;

        setIsProcessing(true);
        try {
            // Map Excel columns to database columns based on type
            const mappedData = importData.map(row => {
                const baseData = {
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };

                if (type === 'tracker') {
                    return {
                        ...baseData,
                        site_id_1: row['Site ID'] || row['site_id_1'] || '',
                        site_name: row['Site Name'] || row['site_name'] || '',
                        regional: row['Regional'] || row['regional'] || '',
                        main_addwork: row['Main Addwork'] || row['main_addwork'] || '',
                        status_pekerjaan: row['Status'] || row['status_pekerjaan'] || 'Open',
                        suspected: row['Suspected'] || row['suspected'] || 'Reguler',
                    };
                }
                // Add mappings for other types as needed
                return row;
            });

            const { error } = await supabase
                .from(tableName)
                .insert(mappedData);

            if (error) throw error;

            toast({
                title: 'Import Successful',
                description: `${importData.length} items imported`,
            });

            setShowImportDialog(false);
            setImportData([]);
            setImportPreview(false);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Import error:', error);
            toast({
                title: 'Import Error',
                description: error.message || 'Failed to import data',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // Export selected rows
    const handleExportSelected = () => {
        if (!hasSelection) return;

        const selectedData = data.filter(item => selectedIds.includes(item.id));
        const worksheet = XLSX.utils.json_to_sheet(selectedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Data');

        const filename = `${type}_selected_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);

        toast({
            title: 'Export Successful',
            description: `${selectedData.length} items exported`,
        });
    };

    if (!hasSelection && !showImportDialog) {
        return (
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="gap-2"
                >
                    <Square className="w-4 h-4" />
                    Select All
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImportDialog(true)}
                    className="gap-2"
                >
                    <Upload className="w-4 h-4" />
                    Import Excel
                </Button>
            </div>
        );
    }

    return (
        <>
            <AnimatePresence>
                {hasSelection && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-wrap items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg"
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSelectAll}
                            className="gap-2"
                        >
                            {isAllSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            {selectedIds.length} selected
                        </Button>

                        <div className="h-6 w-px bg-border" />

                        {type === 'tracker' && (
                            <>
                                <Select onValueChange={handleBulkUpdateStatus} disabled={isProcessing}>
                                    <SelectTrigger className="w-[150px] h-8">
                                        <SelectValue placeholder="Update Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Open">Open</SelectItem>
                                        <SelectItem value="On Hold">On Hold</SelectItem>
                                        <SelectItem value="Close">Close</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBulkApproveBAST}
                                    disabled={isProcessing}
                                    className="gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve BAST
                                </Button>
                            </>
                        )}

                        {type === 'pic' && (
                            <>
                                <Select onValueChange={handleBulkUpdateStatus} disabled={isProcessing}>
                                    <SelectTrigger className="w-[130px] h-8">
                                        <SelectValue placeholder="Update Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select onValueChange={handleBulkUpdateJabatan} disabled={isProcessing}>
                                    <SelectTrigger className="w-[150px] h-8">
                                        <SelectValue placeholder="Update Jabatan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PM">PM</SelectItem>
                                        <SelectItem value="CM">CM</SelectItem>
                                        <SelectItem value="PM/CM">PM/CM</SelectItem>
                                        <SelectItem value="CM+MBP">CM+MBP</SelectItem>
                                        <SelectItem value="VERTI & TII">VERTI & TII</SelectItem>
                                        <SelectItem value="Expert Genset">Expert Genset</SelectItem>
                                        <SelectItem value="MBP">MBP</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        )}

                        {type === 'cctv' && (
                            <>
                                <Select onValueChange={handleBulkUpdateStatus} disabled={isProcessing}>
                                    <SelectTrigger className="w-[130px] h-8">
                                        <SelectValue placeholder="Update Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="online">Online</SelectItem>
                                        <SelectItem value="offline">Offline</SelectItem>
                                        <SelectItem value="broken">Broken</SelectItem>
                                        <SelectItem value="stolen">Stolen</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select onValueChange={handleBulkUpdateCategory} disabled={isProcessing}>
                                    <SelectTrigger className="w-[150px] h-8">
                                        <SelectValue placeholder="Update Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="reguler">Reguler</SelectItem>
                                        <SelectItem value="IOT">IOT</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        )}

                        {type === 'module' && (
                            <>
                                <Select onValueChange={handleBulkUpdateRfsStatus} disabled={isProcessing}>
                                    <SelectTrigger className="w-[140px] h-8">
                                        <SelectValue placeholder="RFS Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Open">Open</SelectItem>
                                        <SelectItem value="Done">Done</SelectItem>
                                        <SelectItem value="Hold">Hold</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select onValueChange={handleBulkUpdateAtpDoc} disabled={isProcessing}>
                                    <SelectTrigger className="w-[130px] h-8">
                                        <SelectValue placeholder="ATP Doc" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Open">Open</SelectItem>
                                        <SelectItem value="Done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        )}

                        {type === 'smartlock' && (
                            <>
                                <Select onValueChange={handleBulkUpdateSmartLockStatus} disabled={isProcessing}>
                                    <SelectTrigger className="w-[180px] h-8">
                                        <SelectValue placeholder="Update Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INSTALLED">INSTALLED</SelectItem>
                                        <SelectItem value="NEED INSTALL">NEED INSTALL</SelectItem>
                                        <SelectItem value="NEED INSTALL NORMAL">NEED INSTALL NORMAL</SelectItem>
                                        <SelectItem value="NEED RELOCATED">NEED RELOCATED</SelectItem>
                                        <SelectItem value="NEED SEND TO PTI">NEED SEND TO PTI</SelectItem>
                                        <SelectItem value="LOST BMG">LOST BMG</SelectItem>
                                        <SelectItem value="LOST PTI">LOST PTI</SelectItem>
                                        <SelectItem value="RETURNED TO PTI">RETURNED TO PTI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        )}

                        {type === 'car' && (
                            <>
                                <Select onValueChange={handleBulkUpdateCarStatus} disabled={isProcessing}>
                                    <SelectTrigger className="w-[140px] h-8">
                                        <SelectValue placeholder="Update Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AKTIF">AKTIF</SelectItem>
                                        <SelectItem value="NON AKTIF">NON AKTIF</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportSelected}
                            disabled={isProcessing}
                            className="gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </Button>

                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowDeleteDialog(true)}
                            disabled={isProcessing}
                            className="gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectionChange([])}
                            className="ml-auto"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Delete {selectedIds.length} Items?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. All selected items will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={isProcessing}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isProcessing ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Import Dialog */}
            <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5" />
                            Import from Excel
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Upload an Excel file (.xlsx) to import data. Make sure column headers match the expected format.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="py-4">
                        {!importPreview ? (
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <Input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileUpload}
                                    className="max-w-xs mx-auto"
                                />
                                <p className="text-sm text-muted-foreground mt-2">
                                    Supported: .xlsx, .xls
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">
                                        {importData.length} rows found
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setImportPreview(false);
                                            setImportData([]);
                                        }}
                                    >
                                        Choose Different File
                                    </Button>
                                </div>
                                <div className="max-h-[300px] overflow-auto border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted sticky top-0">
                                            <tr>
                                                {importData[0] && Object.keys(importData[0]).slice(0, 5).map(key => (
                                                    <th key={key} className="text-left p-2 font-medium">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importData.slice(0, 5).map((row, idx) => (
                                                <tr key={idx} className="border-t">
                                                    {Object.values(row).slice(0, 5).map((val, i) => (
                                                        <td key={i} className="p-2 truncate max-w-[150px]">
                                                            {String(val)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {importData.length > 5 && (
                                    <p className="text-sm text-muted-foreground text-center">
                                        ... and {importData.length - 5} more rows
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleImportConfirm}
                            disabled={isProcessing || importData.length === 0}
                        >
                            {isProcessing ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4 mr-2" />
                            )}
                            Import {importData.length} Rows
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

// Selection checkbox for table rows
export const SelectionCheckbox = ({ checked, onChange, className }) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onChange(!checked);
        }}
        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked
            ? 'bg-primary border-primary text-primary-foreground'
            : 'border-input hover:border-primary'
            } ${className}`}
    >
        {checked && <CheckSquare className="w-3.5 h-3.5" />}
    </button>
);

export default BulkOperations;
