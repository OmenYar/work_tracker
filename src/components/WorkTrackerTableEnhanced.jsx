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

// Status options
const STATUS_OPTIONS = [
    { value: 'Open', label: 'Open' },
    { value: 'On Hold', label: 'On Hold' },
    { value: 'Close', label: 'Close' },
];

const BAST_STATUS_OPTIONS = [
    { value: 'Waiting Approve', label: 'Waiting Approve' },
    { value: 'Approve', label: 'Approve' },
    { value: 'Need Created BAST', label: 'Need Created BAST' },
];

const WorkTrackerTableEnhanced = ({
    data,
    onEdit,
    onDelete,
    onRefresh,
    isReadOnly = false,
    enableSelection = false,
    enableInlineEdit = false,
}) => {
    const { toast } = useToast();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Selection state
    const [selectedIds, setSelectedIds] = useState([]);

    // Inline edit state
    const [editingCell, setEditingCell] = useState(null); // { id, field }
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Calculate pagination
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    const isAllSelected = paginatedData.length > 0 && paginatedData.every(item => selectedIds.includes(item.id));
    const isSomeSelected = paginatedData.some(item => selectedIds.includes(item.id)) && !isAllSelected;

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
        if (isAllSelected) {
            setSelectedIds(prev => prev.filter(id => !paginatedData.find(item => item.id === id)));
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...paginatedData.map(item => item.id)])]);
        }
    }, [isAllSelected, paginatedData]);

    const handleSelectRow = useCallback((id) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    }, []);

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

    // Render editable cell
    const renderEditableCell = (tracker, field, value, type = 'text', options = []) => {
        const isEditing = editingCell?.id === tracker.id && editingCell?.field === field;

        if (isEditing) {
            if (type === 'select') {
                return (
                    <div className="flex items-center gap-1">
                        <Select
                            value={editValue}
                            onValueChange={(val) => {
                                setEditValue(val);
                            }}
                            disabled={isSaving}
                        >
                            <SelectTrigger className="h-7 w-[130px]">
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
                <div className="flex items-center gap-1">
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSaving}
                        className="h-7 w-[120px]"
                        autoFocus
                    />
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

        // View mode - clickable to edit
        return (
            <span
                onClick={() => !isReadOnly && enableInlineEdit && startEdit(tracker.id, field, value)}
                className={cn(
                    !isReadOnly && enableInlineEdit && "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1"
                )}
                title={enableInlineEdit && !isReadOnly ? "Click to edit" : undefined}
            >
                {value || '-'}
            </span>
        );
    };

    // Render status badge with inline edit
    const renderStatusBadge = (tracker, field, value, options, badgeColors) => {
        const isEditing = editingCell?.id === tracker.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Select
                        value={editValue}
                        onValueChange={setEditValue}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="h-7 w-[140px]">
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
                onClick={() => !isReadOnly && enableInlineEdit && startEdit(tracker.id, field, value)}
                className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    badgeColors,
                    !isReadOnly && enableInlineEdit && "cursor-pointer hover:opacity-80"
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
            {/* Selection info bar */}
            {enableSelection && selectedIds.length > 0 && (
                <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">
                        {selectedIds.length} item(s) selected
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIds([])}
                    >
                        Clear Selection
                    </Button>
                </div>
            )}

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
                            const isSelected = selectedIds.includes(tracker.id);

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
                                    <td className="py-3 px-4">{renderEditableCell(tracker, 'site_id_1', tracker.site_id_1)}</td>
                                    <td className="py-3 px-4 font-medium">{renderEditableCell(tracker, 'site_name', tracker.site_name)}</td>
                                    <td className="py-3 px-4">{tracker.regional}</td>
                                    <td className="py-3 px-4">{renderEditableCell(tracker, 'main_addwork', tracker.main_addwork)}</td>
                                    <td className="py-3 px-4">
                                        {renderStatusBadge(
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
                                        {renderStatusBadge(
                                            tracker,
                                            'status_bast',
                                            tracker.status_bast,
                                            BAST_STATUS_OPTIONS,
                                            tracker.status_bast === 'Waiting Approve' || tracker.status_bast === 'Waiting Approve BAST'
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        )}
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

export default WorkTrackerTableEnhanced;
