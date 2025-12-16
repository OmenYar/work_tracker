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
import { cn } from '@/lib/utils';

// Status options for inline edit
const STATUS_OPTIONS = [
    { value: 'Open', label: 'Open' },
    { value: 'On Hold', label: 'On Hold' },
    { value: 'Close', label: 'Close' },
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
            const { error } = await supabase
                .from('work_trackers')
                .update({
                    [editingCell.field]: editValue,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingCell.id);

            if (error) throw error;

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
                description: 'Failed to update field',
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

    // Render editable status cell
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
                        <SelectTrigger className="h-7 w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
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
                        className="h-6 w-6 text-green-600"
                    >
                        <Check className="h-3 w-3" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={cancelEdit}
                        disabled={isSaving}
                        className="h-6 w-6 text-red-600"
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
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    badgeColors,
                    enableInlineEdit && !isReadOnly && "cursor-pointer hover:opacity-80"
                )}
                title={enableInlineEdit && !isReadOnly ? "Click to edit" : undefined}
            >
                {value || '-'}
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
                                <th className="w-12 py-3 px-4">
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
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">No</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Site ID</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Site Name</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Regional</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Main Addwork</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status Pekerjaan</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status BAST</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Aging</th>
                            {!isReadOnly && <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>}
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
                                        <td className="py-3 px-4">
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
                                    <td className="py-3 px-4 text-muted-foreground">{startIndex + index + 1}</td>
                                    <td className="py-3 px-4">{tracker.site_id_1}</td>
                                    <td className="py-3 px-4 font-medium">{tracker.site_name}</td>
                                    <td className="py-3 px-4">{tracker.regional}</td>
                                    <td className="py-3 px-4">{tracker.main_addwork}</td>
                                    <td className="py-3 px-4">
                                        {renderStatusCell(
                                            tracker,
                                            'status_pekerjaan',
                                            tracker.status_pekerjaan,
                                            STATUS_OPTIONS,
                                            tracker.status_pekerjaan === 'Open'
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                : tracker.status_pekerjaan === 'On Hold'
                                                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tracker.status_bast === 'Waiting Approve' || tracker.status_bast === 'Waiting Approve BAST'
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            } `}>
                                            {tracker.status_bast || '-'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        {tracker.aging_days !== null && tracker.aging_days !== undefined && tracker.aging_days !== ''
                                            ? `${tracker.aging_days} Days`
                                            : '-'}
                                    </td>
                                    {!isReadOnly && (
                                        <td className="py-3 px-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
