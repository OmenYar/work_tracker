import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Edit, Trash2, MoreHorizontal, Plus, Check, X
} from 'lucide-react';
import ExportDropdown from '@/components/ExportDropdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { supabase } from '@/lib/customSupabaseClient';
import { deleteModuleFromGoogleSheets } from '@/lib/googleSheetsSync';
import { cn } from '@/lib/utils';

// Filter options
const RFS_STATUS_OPTIONS = [
    { value: 'Open', label: 'Open' },
    { value: 'Done', label: 'Done' },
    { value: 'Hold', label: 'Hold' },
];
const DOC_ATP_OPTIONS = [
    { value: 'Open', label: 'Open' },
    { value: 'Done', label: 'Done' },
];

const ModuleDataTable = ({
    moduleData = [],
    onRefresh,
    enableSelection = false,
    selectedIds = [],
    onSelectionChange,
}) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [rfsFilter, setRfsFilter] = useState('all');
    const [atpFilter, setAtpFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
    const [editingCell, setEditingCell] = useState(null); // { id, field }
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Filter data
    const filteredData = useMemo(() => {
        return moduleData.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.site_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRfs = rfsFilter === 'all' || item.rfs_status === rfsFilter;
            const matchesAtp = atpFilter === 'all' || item.doc_atp === atpFilter;
            return matchesSearch && matchesRfs && matchesAtp;
        });
    }, [moduleData, searchTerm, rfsFilter, atpFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const startIndex = (currentPage - 1) * itemsPerPage;

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, rfsFilter, atpFilter, itemsPerPage]);

    // Selection handlers
    const handleSelectAll = (checked) => {
        if (checked) {
            onSelectionChange?.(moduleData.map(item => item.id));
        } else {
            onSelectionChange?.([]);
        }
    };

    const handleSelectRow = (id, checked) => {
        if (checked) {
            onSelectionChange?.([...selectedIds, id]);
        } else {
            onSelectionChange?.(selectedIds.filter(selectedId => selectedId !== id));
        }
    };

    const isAllSelected = moduleData.length > 0 && selectedIds.length === moduleData.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < moduleData.length;

    // Inline edit handlers
    const startEdit = useCallback((id, field, value) => {
        setEditingCell({ id, field });
        setEditValue(value || '');
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingCell(null);
        setEditValue('');
    }, []);

    const saveEdit = useCallback(async () => {
        if (!editingCell) return;

        setIsSaving(true);
        try {
            // Handle date field conversion
            let valueToSave = editValue;
            if (editingCell.field === 'install_date' && !editValue) {
                valueToSave = null;
            }

            const { error } = await supabase
                .from('module_tracker')
                .update({ [editingCell.field]: valueToSave, updated_at: new Date().toISOString() })
                .eq('id', editingCell.id);

            if (error) throw error;

            toast({ title: 'Updated', description: 'Field updated successfully' });
            cancelEdit();
            onRefresh?.();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }, [editingCell, editValue, onRefresh, toast, cancelEdit]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    }, [saveEdit, cancelEdit]);

    const handleDelete = useCallback(async () => {
        try {
            const recordId = deleteDialog.item.id;

            const { error } = await supabase
                .from('module_tracker')
                .delete()
                .eq('id', recordId);

            if (error) throw error;

            // Sync delete to Google Sheets
            await deleteModuleFromGoogleSheets(recordId);

            toast({ title: 'Berhasil', description: 'Data berhasil dihapus' });
            setDeleteDialog({ open: false, item: null });
            onRefresh?.();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    }, [deleteDialog.item, toast, onRefresh]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID');
    };

    // Status badge helper
    const getStatusBadge = (status) => {
        const colorMap = {
            'Done': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'Open': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            'Hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        };
        return colorMap[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    };

    // ATP Doc badge
    const getAtpBadge = (status) => {
        const colorMap = {
            'Done': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'Open': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        };
        return colorMap[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    };

    const handleItemsPerPageChange = (newSize) => {
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };

    // Render editable status cell (dropdown with confirm/cancel)
    const renderStatusCell = (item, field, value, options, badgeColors) => {
        const isEditing = editingCell?.id === item.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Select
                        value={editValue}
                        onValueChange={setEditValue}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="h-6 w-[85px] text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={saveEdit}
                        disabled={isSaving}
                        className="h-5 w-5 text-green-600"
                    >
                        <Check className="h-3 w-3" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="h-5 w-5 text-red-600"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            );
        }

        return (
            <span
                onClick={() => startEdit(item.id, field, value)}
                className={cn(
                    "inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap",
                    badgeColors,
                    "cursor-pointer hover:opacity-80 transition-opacity"
                )}
                title="Click to edit"
            >
                {value || 'Open'}
            </span>
        );
    };

    // Render editable text cell (input with confirm/cancel)
    const renderTextCell = (item, field, value, placeholder = 'Click to add...') => {
        const isEditing = editingCell?.id === item.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSaving}
                        className="h-6 w-[120px] text-xs font-mono"
                        placeholder={placeholder}
                        autoFocus
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={saveEdit}
                        disabled={isSaving}
                        className="h-5 w-5 text-green-600"
                    >
                        <Check className="h-3 w-3" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="h-5 w-5 text-red-600"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            );
        }

        return (
            <span
                onClick={() => startEdit(item.id, field, value)}
                className={cn(
                    "text-xs font-mono max-w-[120px] truncate block",
                    value ? "text-foreground" : "text-muted-foreground italic font-sans",
                    "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1"
                )}
                title={value || "Click to add"}
            >
                {value || placeholder}
            </span>
        );
    };

    // Render editable date cell (date input with confirm/cancel)
    const renderDateCell = (item, field, value) => {
        const isEditing = editingCell?.id === item.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Input
                        type="date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSaving}
                        className="h-6 w-[130px] text-xs"
                        autoFocus
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={saveEdit}
                        disabled={isSaving}
                        className="h-5 w-5 text-green-600"
                    >
                        <Check className="h-3 w-3" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="h-5 w-5 text-red-600"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            );
        }

        return (
            <span
                onClick={() => startEdit(item.id, field, value || '')}
                className={cn(
                    "text-xs",
                    value ? "text-foreground" : "text-muted-foreground italic",
                    "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1"
                )}
                title="Click to edit"
            >
                {value ? formatDate(value) : 'Set date...'}
            </span>
        );
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <Card>
                <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search Site ID / Name / Area..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={rfsFilter} onValueChange={setRfsFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="RFS Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All RFS</SelectItem>
                                {RFS_STATUS_OPTIONS.map(s => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={atpFilter} onValueChange={setAtpFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="ATP Doc" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All ATP</SelectItem>
                                {DOC_ATP_OPTIONS.map(s => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <ExportDropdown
                            data={filteredData}
                            filename="module_dpr2900"
                            title="Data Module DPR2900"
                        />
                        <Button size="icon" onClick={() => navigate('/admin/input-module')} title="Add New">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    {enableSelection && (
                                        <th className="py-3 px-3 w-10">
                                            <Checkbox
                                                checked={isAllSelected}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                                className={isIndeterminate ? 'data-[state=checked]:bg-primary/50' : ''}
                                            />
                                        </th>
                                    )}
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground w-10">No</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Site ID</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Site Name</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Area</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Project</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">RFS Status</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Install Date</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">SN Module</th>
                                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">ATP Doc</th>
                                    <th className="text-right py-3 px-3 font-medium text-muted-foreground w-12">Act</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={enableSelection ? 11 : 10} className="text-center py-8 text-muted-foreground">
                                            No data found
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((item, index) => (
                                        <tr key={item.id} className={`border-b hover:bg-muted/50 transition-colors ${selectedIds.includes(item.id) ? 'bg-primary/5' : ''}`}>
                                            {enableSelection && (
                                                <td className="py-2 px-3">
                                                    <Checkbox
                                                        checked={selectedIds.includes(item.id)}
                                                        onCheckedChange={(checked) => handleSelectRow(item.id, checked)}
                                                        aria-label={`Select ${item.site_id}`}
                                                    />
                                                </td>
                                            )}
                                            <td className="py-2 px-3 text-muted-foreground text-xs">{startIndex + index + 1}</td>
                                            <td className="py-2 px-3 font-medium font-mono text-xs">{item.site_id}</td>
                                            <td className="py-2 px-3 max-w-[150px] truncate text-xs">{item.site_name}</td>
                                            <td className="py-2 px-3 text-xs">{item.area || '-'}</td>
                                            <td className="py-2 px-3 max-w-[120px] truncate text-xs">{item.project_name || '-'}</td>

                                            {/* Inline editable RFS Status */}
                                            <td className="py-2 px-3">
                                                {renderStatusCell(item, 'rfs_status', item.rfs_status, RFS_STATUS_OPTIONS, getStatusBadge(item.rfs_status))}
                                            </td>

                                            {/* Inline editable Install Date */}
                                            <td className="py-2 px-3">
                                                {renderDateCell(item, 'install_date', item.install_date)}
                                            </td>

                                            {/* Inline editable SN Module */}
                                            <td className="py-2 px-3">
                                                {renderTextCell(item, 'sn_module', item.sn_module, 'Add SN...')}
                                            </td>

                                            {/* Inline editable ATP Doc */}
                                            <td className="py-2 px-3">
                                                {renderStatusCell(item, 'doc_atp', item.doc_atp, DOC_ATP_OPTIONS, getAtpBadge(item.doc_atp))}
                                            </td>

                                            <td className="py-2 px-3 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => navigate(`/admin/edit-module/${item.id}`)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit Full
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteDialog({ open: true, item })}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredData.length}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        className="m-4"
                    />
                </CardContent>
            </Card>

            {/* Delete Dialog */}
            <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, item: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Data Module</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus data untuk site {deleteDialog.item?.site_id}?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialog({ open: false, item: null })}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ModuleDataTable;
