import React, { useState, useCallback } from 'react';
import { Edit, Trash2, MoreHorizontal, Check, X, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { logInlineEdit } from '@/lib/activityLogger';
import { cn } from '@/lib/utils';

// Status options for inline edit
const STATUS_PEKERJAAN_OPTIONS = [
    { value: 'Open', label: 'Open' },
    { value: 'On Hold', label: 'On Hold' },
    { value: 'Close', label: 'Close' },
];

const STATUS_BAST_OPTIONS = [
    { value: 'Waiting Approve', label: 'Waiting Approve' },
    { value: 'Approve', label: 'Approve' },
    { value: 'Need Created BAST', label: 'Need Created' },
    { value: 'N/A', label: 'N/A' },
];

const WorkTrackerTable = ({
    data,
    onEdit,
    onDelete,
    onRefresh,
    isReadOnly = false,
    enableInlineEdit = true,
    enableSelection = false,
    selectedIds = [],
    onSelectionChange,
}) => {
    const { toast } = useToast();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Inline edit state
    const [editingCell, setEditingCell] = useState(null); // { id, field }
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Calculate pagination
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    // Selection helpers
    const isAllSelected = enableSelection && paginatedData.length > 0 &&
        paginatedData.every(item => selectedIds?.includes(item.id));
    const isSomeSelected = enableSelection &&
        paginatedData.some(item => selectedIds?.includes(item.id)) && !isAllSelected;

    // Reset to page 1 when data or items per page changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [data.length, itemsPerPage]);

    const handleItemsPerPageChange = (newSize) => {
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };

    // Selection handlers
    const handleSelectAll = useCallback(() => {
        if (!onSelectionChange) return;
        if (isAllSelected) {
            onSelectionChange(selectedIds.filter(id => !paginatedData.find(item => item.id === id)));
        } else {
            onSelectionChange([...new Set([...selectedIds, ...paginatedData.map(item => item.id)])]);
        }
    }, [isAllSelected, paginatedData, selectedIds, onSelectionChange]);

    const handleSelectRow = useCallback((id) => {
        if (!onSelectionChange) return;
        if (selectedIds?.includes(id)) {
            onSelectionChange(selectedIds.filter(i => i !== id));
        } else {
            onSelectionChange([...(selectedIds || []), id]);
        }
    }, [selectedIds, onSelectionChange]);

    // Inline edit handlers
    const startEdit = useCallback((id, field, value) => {
        if (!enableInlineEdit || isReadOnly) return;
        setEditingCell({ id, field });
        setEditValue(value || '');
    }, [enableInlineEdit, isReadOnly]);

    const cancelEdit = useCallback(() => {
        setEditingCell(null);
        setEditValue('');
    }, []);

    const saveEdit = useCallback(async () => {
        if (!editingCell) return;

        setIsSaving(true);
        try {
            // Find old value for logging
            const currentRecord = data.find(t => t.id === editingCell.id);
            const oldValue = currentRecord?.[editingCell.field];

            const updateData = {
                [editingCell.field]: editValue
            };

            const { data: result, error } = await supabase
                .from('work_trackers')
                .update(updateData)
                .eq('id', editingCell.id)
                .select();

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            // Log the inline edit
            await logInlineEdit('work_trackers', editingCell.id, editingCell.field, oldValue, editValue);

            toast({
                title: 'Updated',
                description: 'Field updated successfully',
            });

            if (onRefresh) onRefresh();
            cancelEdit();
        } catch (error) {
            console.error('Update error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update field',
                variant: 'destructive',
            });
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

    // Render editable status cell (dropdown)
    const renderStatusCell = (tracker, field, value, options, badgeColors) => {
        const isEditing = editingCell?.id === tracker.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Select
                        value={editValue}
                        onValueChange={setEditValue}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="h-6 w-[130px] text-xs">
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
                onClick={() => enableInlineEdit && !isReadOnly && startEdit(tracker.id, field, value)}
                className={cn(
                    "inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap",
                    badgeColors,
                    enableInlineEdit && !isReadOnly && "cursor-pointer hover:opacity-80 transition-opacity"
                )}
                title={enableInlineEdit && !isReadOnly ? "Click to edit" : undefined}
            >
                {value || '-'}
            </span>
        );
    };

    // Render editable text cell (input)
    const renderTextCell = (tracker, field, value, placeholder = 'Add remark...') => {
        const isEditing = editingCell?.id === tracker.id && editingCell?.field === field;

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
                onClick={() => enableInlineEdit && !isReadOnly && startEdit(tracker.id, field, value)}
                className={cn(
                    "text-sm max-w-[150px] truncate block",
                    value ? "text-foreground" : "text-muted-foreground italic",
                    enableInlineEdit && !isReadOnly && "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1"
                )}
                title={enableInlineEdit && !isReadOnly ? (value || "Click to add remark") : value}
            >
                {value || placeholder}
            </span>
        );
    };

    if (data.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No records found. Add your first record above.</p>
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
                                <th className="w-10 py-3 px-3">
                                    <button
                                        onClick={handleSelectAll}
                                        className="flex items-center justify-center"
                                    >
                                        {isAllSelected ? (
                                            <CheckSquare className="h-4 w-4 text-primary" />
                                        ) : isSomeSelected ? (
                                            <div className="h-4 w-4 border-2 border-primary bg-primary/50 rounded-sm" />
                                        ) : (
                                            <Square className="h-4 w-4" />
                                        )}
                                    </button>
                                </th>
                            )}
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground w-10">No</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Site ID</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Site Name</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Regional</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Main Addwork</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status Pekerjaan</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status BAST</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Aging</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Remark</th>
                            {!isReadOnly && <th className="text-right py-3 px-3 font-medium text-muted-foreground w-12">Act</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((tracker, index) => {
                            const isSelected = enableSelection && selectedIds?.includes(tracker.id);

                            return (
                                <tr
                                    key={tracker.id}
                                    className={cn(
                                        "border-b transition-colors",
                                        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                                    )}
                                >
                                    {enableSelection && (
                                        <td className="py-2 px-3">
                                            <button
                                                onClick={() => handleSelectRow(tracker.id)}
                                                className="flex items-center justify-center"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <Square className="h-4 w-4" />
                                                )}
                                            </button>
                                        </td>
                                    )}
                                    <td className="py-2 px-3 text-muted-foreground text-xs">{startIndex + index + 1}</td>
                                    <td className="py-2 px-3 text-xs">{tracker.site_id_1}</td>
                                    <td className="py-2 px-3 font-medium text-xs">{tracker.site_name}</td>
                                    <td className="py-2 px-3 text-xs">{tracker.regional}</td>
                                    <td className="py-2 px-3 text-xs">{tracker.main_addwork}</td>
                                    <td className="py-2 px-3">
                                        {renderStatusCell(
                                            tracker,
                                            'status_pekerjaan',
                                            tracker.status_pekerjaan,
                                            STATUS_PEKERJAAN_OPTIONS,
                                            tracker.status_pekerjaan === 'Open'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                : tracker.status_pekerjaan === 'On Hold'
                                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                                                    : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                        )}
                                    </td>
                                    <td className="py-2 px-3">
                                        <span className={cn(
                                            "inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap",
                                            tracker.status_bast === 'Waiting Approve' || tracker.status_bast === 'Waiting Approve BAST'
                                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                                : tracker.status_bast === 'Approve'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                        )}>
                                            {tracker.status_bast || '-'}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3 text-xs">
                                        {tracker.aging_days !== null && tracker.aging_days !== undefined && tracker.aging_days !== ''
                                            ? `${tracker.aging_days}d`
                                            : '-'}
                                    </td>
                                    <td className="py-2 px-3">
                                        {renderTextCell(tracker, 'remark', tracker.remark, 'Add remark...')}
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
                                                    <DropdownMenuItem onClick={() => onEdit(tracker)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
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
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete the tracker record.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => onDelete(tracker.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                            );
                        })}
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

export default WorkTrackerTable;
