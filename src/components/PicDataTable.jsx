import React, { useState, useCallback } from 'react';
import { Edit, Trash2, MoreHorizontal, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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

// Options for dropdowns
const JABATAN_OPTIONS = [
    { value: 'PM', label: 'PM' },
    { value: 'CM', label: 'CM' },
    { value: 'PM/CM', label: 'PM/CM' },
    { value: 'CM+MBP', label: 'CM+MBP' },
    { value: 'VERTI & TII', label: 'VERTI & TII' },
    { value: 'Expert Genset', label: 'Expert Genset' },
    { value: 'MBP', label: 'MBP' },
];

const REGIONAL_OPTIONS = [
    { value: 'Jabo Outer 1', label: 'Jabo Outer 1' },
    { value: 'Jabo Outer 2', label: 'Jabo Outer 2' },
    { value: 'Jabo Outer 3', label: 'Jabo Outer 3' },
];

const VALIDASI_OPTIONS = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
];

const PicDataTable = ({
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

    // Inline edit state
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Calculate pagination
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
            // Find old value for logging
            const currentRecord = data.find(p => p.id === editingCell.id);
            const oldValue = currentRecord?.[editingCell.field];

            const updateData = {
                [editingCell.field]: editValue
            };

            const { data: result, error } = await supabase
                .from('pic_data')
                .update(updateData)
                .eq('id', editingCell.id)
                .select();

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            // Log the inline edit
            await logInlineEdit('pic_data', editingCell.id, editingCell.field, oldValue, editValue);

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

    // Render editable text cell
    const renderTextCell = (pic, field, value, placeholder = '') => {
        const isEditing = editingCell?.id === pic.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSaving}
                        className="h-7 w-[120px] text-xs"
                        autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={saveEdit} disabled={isSaving} className="h-6 w-6 text-green-600">
                        <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEdit} disabled={isSaving} className="h-6 w-6 text-red-600">
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            );
        }

        return (
            <span
                onClick={() => !isReadOnly && startEdit(pic.id, field, value)}
                className={cn(
                    "text-sm",
                    !isReadOnly && "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1"
                )}
                title={!isReadOnly ? "Click to edit" : undefined}
            >
                {value || '-'}
            </span>
        );
    };

    // Render editable select cell
    const renderSelectCell = (pic, field, value, options, badgeColors = null) => {
        const isEditing = editingCell?.id === pic.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Select value={editValue} onValueChange={setEditValue} disabled={isSaving}>
                        <SelectTrigger className="h-7 w-[130px] text-xs">
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
                    <Button size="icon" variant="ghost" onClick={saveEdit} disabled={isSaving} className="h-6 w-6 text-green-600">
                        <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEdit} disabled={isSaving} className="h-6 w-6 text-red-600">
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            );
        }

        if (badgeColors) {
            return (
                <span
                    onClick={() => !isReadOnly && startEdit(pic.id, field, value)}
                    className={cn(
                        "inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none",
                        badgeColors,
                        !isReadOnly && "cursor-pointer hover:opacity-80"
                    )}
                    title={!isReadOnly ? "Click to edit" : undefined}
                >
                    {value || '-'}
                </span>
            );
        }

        return (
            <span
                onClick={() => !isReadOnly && startEdit(pic.id, field, value)}
                className={cn(
                    "text-sm",
                    !isReadOnly && "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1"
                )}
                title={!isReadOnly ? "Click to edit" : undefined}
            >
                {value || '-'}
            </span>
        );
    };

    // Selection handlers
    const handleSelectAll = useCallback((checked) => {
        if (!onSelectionChange) return;
        if (checked) {
            const allIds = data.map(pic => pic.id);
            onSelectionChange(allIds);
        } else {
            onSelectionChange([]);
        }
    }, [data, onSelectionChange]);

    const handleSelectRow = useCallback((id, checked) => {
        if (!onSelectionChange) return;
        if (checked) {
            onSelectionChange([...selectedIds, id]);
        } else {
            onSelectionChange(selectedIds.filter(i => i !== id));
        }
    }, [selectedIds, onSelectionChange]);

    const isAllSelected = data.length > 0 && selectedIds.length === data.length;
    const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < data.length;

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
                                <th className="py-3 px-4 w-12">
                                    <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all"
                                        className={isPartiallySelected ? 'data-[state=checked]:bg-primary/50' : ''}
                                    />
                                </th>
                            )}
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">No</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nama PIC</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Jabatan</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Regional</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Area</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">No HP</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                            {!isReadOnly && <th className="text-right py-3 px-4 font-medium text-muted-foreground w-12">Act</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((pic, index) => (
                            <tr key={pic.id} className={cn(
                                "border-b hover:bg-muted/50 transition-colors",
                                selectedIds.includes(pic.id) && "bg-primary/5"
                            )}>
                                {enableSelection && (
                                    <td className="py-3 px-4">
                                        <Checkbox
                                            checked={selectedIds.includes(pic.id)}
                                            onCheckedChange={(checked) => handleSelectRow(pic.id, checked)}
                                            aria-label={`Select ${pic.nama_pic}`}
                                        />
                                    </td>
                                )}
                                <td className="py-3 px-4 text-muted-foreground">{startIndex + index + 1}</td>
                                <td className="py-3 px-4 font-medium">
                                    {renderTextCell(pic, 'nama_pic', pic.nama_pic)}
                                </td>
                                <td className="py-3 px-4">
                                    {renderSelectCell(pic, 'jabatan', pic.jabatan, JABATAN_OPTIONS)}
                                </td>
                                <td className="py-3 px-4">
                                    {renderSelectCell(pic, 'regional', pic.regional, REGIONAL_OPTIONS)}
                                </td>
                                <td className="py-3 px-4">
                                    {renderTextCell(pic, 'area', pic.area)}
                                </td>
                                <td className="py-3 px-4">
                                    {renderTextCell(pic, 'no_hp', pic.no_hp)}
                                </td>
                                <td className="py-3 px-4">
                                    {renderTextCell(pic, 'email', pic.email)}
                                </td>
                                <td className="py-3 px-4">
                                    {renderSelectCell(
                                        pic,
                                        'validasi',
                                        pic.validasi,
                                        VALIDASI_OPTIONS,
                                        pic.validasi === 'Active'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                    )}
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
                                                <DropdownMenuItem onClick={() => onEdit(pic)}>
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
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the PIC record.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => onDelete(pic.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

export default PicDataTable;