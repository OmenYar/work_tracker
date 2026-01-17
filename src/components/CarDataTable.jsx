import React, { useState, useCallback } from 'react';
import { Edit, Trash2, MoreHorizontal, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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

// Helper to calculate document status from date
const getDocumentStatus = (expiryDate) => {
    if (!expiryDate) return { text: '-', color: 'gray' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: `Expired ${Math.abs(diffDays)} hari`, color: 'red' };
    } else if (diffDays <= 30) {
        return { text: `Sisa ${diffDays} hari`, color: 'yellow' };
    }
    return { text: 'Aktif', color: 'green' };
};

const getStatusBadge = (status) => {
    const colorMap = {
        red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };
    return colorMap[status.color] || colorMap.gray;
};

const getPriorityBadge = (priority) => {
    switch (priority) {
        case 'HIGH': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        default: return 'bg-gray-100 text-gray-600';
    }
};

const getStatusMobilBadge = (status) => {
    switch (status) {
        case 'AKTIF': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        case 'NON AKTIF': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        default: return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
};

const getStatusTakeoutBadge = (status) => {
    switch (status) {
        case 'Belum Dikembalikan': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
        case 'Proses Pengembalian': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'Sudah Dikembalikan': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
        default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
};

// Status options
const STATUS_MOBIL_OPTIONS = [
    { value: 'AKTIF', label: 'AKTIF' },
    { value: 'NON AKTIF', label: 'NON AKTIF' },
];

const CarDataTable = ({
    data,
    onEdit,
    onDelete,
    onRefresh,
    isReadOnly = false,
    picData = [],
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
            let updateData = { updated_at: new Date().toISOString() };

            // If editing PIC, also update the area based on PIC's regional
            if (editingCell.field === 'pic_id') {
                const selectedPic = picData.find(p => p.id === editValue);
                updateData.pic_id = editValue;
                if (selectedPic?.regional) {
                    updateData.area = selectedPic.regional;
                }
            } else {
                updateData[editingCell.field] = editValue;
            }

            const { error } = await supabase
                .from('car_data')
                .update(updateData)
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
    }, [editingCell, editValue, picData, onRefresh, toast, cancelEdit]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    }, [saveEdit, cancelEdit]);

    // Render editable status cell (dropdown with confirm/cancel)
    const renderStatusCell = (car, field, value, options, badgeColors) => {
        const isEditing = editingCell?.id === car.id && editingCell?.field === field;

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
                onClick={() => !isReadOnly && startEdit(car.id, field, value)}
                className={cn(
                    "inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap",
                    badgeColors,
                    !isReadOnly && "cursor-pointer hover:opacity-80 transition-opacity"
                )}
                title={!isReadOnly ? "Click to edit" : undefined}
            >
                {value || 'AKTIF'}
            </span>
        );
    };

    // Render editable text cell (input with confirm/cancel)
    const renderTextCell = (car, field, value, placeholder = 'Click to add...') => {
        const isEditing = editingCell?.id === car.id && editingCell?.field === field;

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSaving}
                        className="h-6 w-[120px] text-xs"
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
                onClick={() => !isReadOnly && startEdit(car.id, field, value)}
                className={cn(
                    "text-xs max-w-[120px] truncate block",
                    value ? "text-foreground" : "text-muted-foreground italic",
                    !isReadOnly && "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1"
                )}
                title={!isReadOnly ? (value || "Click to add") : value}
            >
                {value || placeholder}
            </span>
        );
    };

    // Render editable PIC cell (dropdown with confirm/cancel)
    const renderPicCell = (car, currentPicId) => {
        const isEditing = editingCell?.id === car.id && editingCell?.field === 'pic_id';
        const currentPicName = picData.find(p => p.id === currentPicId)?.nama_pic || '-';

        if (isEditing) {
            return (
                <div className="flex items-center gap-1">
                    <Select
                        value={editValue}
                        onValueChange={setEditValue}
                        disabled={isSaving}
                    >
                        <SelectTrigger className="h-6 w-[140px] text-xs">
                            <SelectValue placeholder="Select PIC" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {picData.filter(p => p.status === 'Active').map(pic => (
                                <SelectItem key={pic.id} value={pic.id} className="text-xs">
                                    {pic.nama_pic}
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
                onClick={() => !isReadOnly && startEdit(car.id, 'pic_id', currentPicId)}
                className={cn(
                    "text-xs",
                    currentPicName !== '-' ? "text-foreground" : "text-muted-foreground italic",
                    !isReadOnly && "cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -mx-1"
                )}
                title={!isReadOnly ? "Click to edit" : undefined}
            >
                {currentPicName}
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
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">No Polisi</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">PIC</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Area</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status STNK</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status Pajak</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status KIR</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Condition</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Priority</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status Mobil</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Takeout</th>
                            <th className="text-left py-3 px-3 font-medium text-muted-foreground">Remark</th>
                            {!isReadOnly && <th className="text-right py-3 px-3 font-medium text-muted-foreground w-12">Act</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((car, index) => {
                            const stnkStatus = getDocumentStatus(car.masa_berlaku_stnk);
                            const pajakStatus = getDocumentStatus(car.masa_berlaku_pajak);
                            const kirStatus = getDocumentStatus(car.masa_berlaku_kir);

                            return (
                                <tr key={car.id} className={cn(
                                    "border-b transition-colors",
                                    selectedIds.includes(car.id) ? "bg-primary/5" : "hover:bg-muted/50"
                                )}>
                                    {enableSelection && (
                                        <td className="py-2 px-3">
                                            <Checkbox
                                                checked={selectedIds.includes(car.id)}
                                                onCheckedChange={(checked) => handleSelectRow(car.id, checked)}
                                                aria-label={`Select ${car.nomor_polisi}`}
                                            />
                                        </td>
                                    )}
                                    <td className="py-2 px-3 text-muted-foreground text-xs">{startIndex + index + 1}</td>
                                    {/* Inline editable No Polisi */}
                                    <td className="py-2 px-3">
                                        {renderTextCell(car, 'nomor_polisi', car.nomor_polisi, 'No Polisi...')}
                                    </td>
                                    {/* Inline editable PIC */}
                                    <td className="py-2 px-3">
                                        {renderPicCell(car, car.pic_id)}
                                    </td>
                                    <td className="py-2 px-3 text-xs">{car.area || '-'}</td>
                                    <td className="py-2 px-3">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap ${getStatusBadge(stnkStatus)}`}>
                                            {stnkStatus.text}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap ${getStatusBadge(pajakStatus)}`}>
                                            {pajakStatus.text}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap ${getStatusBadge(kirStatus)}`}>
                                            {kirStatus.text}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap ${car.condition === 'NEED SERVICE'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                            {car.condition || 'GOOD'}
                                        </span>
                                    </td>
                                    <td className="py-2 px-3">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap ${getPriorityBadge(car.priority)}`}>
                                            {car.priority || '-'}
                                        </span>
                                    </td>
                                    {/* Inline editable Status Mobil */}
                                    <td className="py-2 px-3">
                                        {renderStatusCell(car, 'status_mobil', car.status_mobil, STATUS_MOBIL_OPTIONS, getStatusMobilBadge(car.status_mobil))}
                                    </td>
                                    {/* Status Takeout */}
                                    <td className="py-2 px-3">
                                        {(car.status_transisi_q1 === 'Take Out' || car.status_transisi_q2_q4 === 'Take Out') ? (
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold leading-none whitespace-nowrap ${getStatusTakeoutBadge(car.status_takeout)}`}>
                                                {car.status_takeout || 'Belum Diset'}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    {/* Inline editable Remark */}
                                    <td className="py-2 px-3 max-w-[150px]">
                                        {renderTextCell(car, 'remark', car.remark, 'Add remark...')}
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
                                                    <DropdownMenuItem onClick={() => onEdit(car)}>
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
                                                                <AlertDialogTitle>Delete Car Data?</AlertDialogTitle>
                                                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => onDelete(car.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

export default CarDataTable;
