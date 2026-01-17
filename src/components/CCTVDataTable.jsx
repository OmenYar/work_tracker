import React, { useState, useCallback } from 'react';
import { Edit, Trash2, MoreHorizontal, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pagination } from '@/components/ui/pagination';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const getStatusBadge = (status) => {
    const statusMap = {
        online: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        offline: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        broken: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        stolen: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    return statusMap[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
};

const getCategoryBadge = (category) => {
    if (category === 'IOT') {
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
};

// Status options
const STATUS_OPTIONS = [
    { value: 'online', label: 'Online' },
    { value: 'offline', label: 'Offline' },
    { value: 'broken', label: 'Broken' },
    { value: 'stolen', label: 'Stolen' },
];

const CATEGORY_OPTIONS = [
    { value: 'reguler', label: 'Reguler' },
    { value: 'IOT', label: 'IOT' },
];

const CCTVDataTable = ({
    data,
    onEdit,
    onDelete,
    onRefresh,
    isReadOnly = false,
    enableSelection = false,
    selectedIds = [],
    onSelectionChange
}) => {
    const { toast } = useToast();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [editingCell, setEditingCell] = useState(null); // { id, field }
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    // Reset to page 1 when data or items per page changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [data.length, itemsPerPage]);

    const handleItemsPerPageChange = (newSize) => {
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };

    // Selection handlers
    const handleSelectAll = (checked) => {
        if (checked) {
            onSelectionChange?.(data.map(item => item.id));
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

    const isAllSelected = data.length > 0 && selectedIds.length === data.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;

    // Inline edit handlers
    const startEdit = useCallback((id, field, value) => {
        if (isReadOnly) return;
        setEditingCell({ id, field });
        setEditValue(value || '');
    }, [isReadOnly]);

    const cancelEdit = useCallback(() => {
        setEditingCell(null);
        setEditValue('');
    }, []);

    const saveEdit = useCallback(async () => {
        if (!editingCell) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('cctv_data')
                .update({ [editingCell.field]: editValue, updated_at: new Date().toISOString() })
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

    // Render editable status cell (dropdown with confirm/cancel)
    const renderStatusCell = (cctv, field, value, options, badgeColors) => {
        const isEditing = editingCell?.id === cctv.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Select
                        value={editValue}
                        onValueChange={setEditValue}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="h-6 w-[100px] text-xs">
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
                onClick={() => !isReadOnly && startEdit(cctv.id, field, value)}
                className={cn(
                    "inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap",
                    badgeColors,
                    !isReadOnly && "cursor-pointer hover:opacity-80 transition-opacity"
                )}
                title={!isReadOnly ? "Click to edit" : undefined}
            >
                {value ? value.toUpperCase() : '-'}
            </span>
        );
    };

    // Render editable text cell (input with confirm/cancel)
    const renderTextCell = (cctv, field, value, placeholder = 'Add remark...') => {
        const isEditing = editingCell?.id === cctv.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSaving}
                        className="h-6 w-[150px] text-xs"
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
                onClick={() => !isReadOnly && startEdit(cctv.id, field, value)}
                className={cn(
                    "text-xs max-w-[150px] truncate block",
                    value ? "text-foreground" : "text-muted-foreground italic",
                    !isReadOnly && "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1"
                )}
                title={!isReadOnly ? (value || "Click to add remark") : value}
            >
                {value || placeholder}
            </span>
        );
    };

    if (data.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No CCTV records found. Add your first record above.</p>
            </div>
        );
    }

    return (
        <div>
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
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Regional</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Category</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Remarks</th>
                            {!isReadOnly && <th className="text-right py-3 px-3 font-medium text-muted-foreground w-12">Act</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((cctv, index) => (
                            <tr key={cctv.id} className={`border-b hover:bg-muted/50 transition-colors ${selectedIds.includes(cctv.id) ? 'bg-primary/5' : ''}`}>
                                {enableSelection && (
                                    <td className="py-2 px-3">
                                        <Checkbox
                                            checked={selectedIds.includes(cctv.id)}
                                            onCheckedChange={(checked) => handleSelectRow(cctv.id, checked)}
                                            aria-label={`Select ${cctv.site_id_display}`}
                                        />
                                    </td>
                                )}
                                <td className="py-2 px-3 text-muted-foreground text-xs">{startIndex + index + 1}</td>
                                <td className="py-2 px-3 font-medium font-mono text-xs">{cctv.site_id_display || '-'}</td>
                                <td className="py-2 px-3 text-xs">{cctv.site_name || '-'}</td>
                                <td className="py-2 px-3">
                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        {cctv.regional || '-'}
                                    </span>
                                </td>
                                {/* Inline editable Status */}
                                <td className="py-2 px-3">
                                    {renderStatusCell(cctv, 'status', cctv.status, STATUS_OPTIONS, getStatusBadge(cctv.status))}
                                </td>
                                {/* Inline editable Category */}
                                <td className="py-2 px-3">
                                    {renderStatusCell(cctv, 'cctv_category', cctv.cctv_category, CATEGORY_OPTIONS, getCategoryBadge(cctv.cctv_category))}
                                </td>
                                {/* Inline editable Remarks */}
                                <td className="py-2 px-3 max-w-[200px]">
                                    {renderTextCell(cctv, 'remarks', cctv.remarks, 'Click to add...')}
                                </td>
                                {!isReadOnly && (
                                    <td className="py-2 px-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onEdit(cctv)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit Full
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete CCTV Data?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the CCTV record for {cctv.site_id_display || 'this site'}.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => onDelete(cctv.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={data.length}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                className="mt-4"
            />
        </div>
    );
};

export default CCTVDataTable;
