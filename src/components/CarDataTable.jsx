import React, { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const CarDataTable = ({ data, onEdit, onDelete, isReadOnly = false, picData = [] }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

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
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">No</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">No Polisi</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">PIC</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Area</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status STNK</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status Pajak</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status KIR</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Condition</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Priority</th>
                            {!isReadOnly && <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((car, index) => {
                            const stnkStatus = getDocumentStatus(car.masa_berlaku_stnk);
                            const pajakStatus = getDocumentStatus(car.masa_berlaku_pajak);
                            const kirStatus = getDocumentStatus(car.masa_berlaku_kir);
                            const picName = picData.find(p => p.id === car.pic_id)?.nama_pic || '-';

                            return (
                                <tr key={car.id} className="border-b hover:bg-muted/50 transition-colors">
                                    <td className="py-3 px-4 text-muted-foreground">{startIndex + index + 1}</td>
                                    <td className="py-3 px-4 font-medium font-mono">{car.nomor_polisi}</td>
                                    <td className="py-3 px-4">{picName}</td>
                                    <td className="py-3 px-4">{car.area || '-'}</td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(stnkStatus)}`}>
                                            {stnkStatus.text}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(pajakStatus)}`}>
                                            {pajakStatus.text}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(kirStatus)}`}>
                                            {kirStatus.text}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${car.condition === 'NEED SERVICE'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                            {car.condition || 'GOOD'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityBadge(car.priority)}`}>
                                            {car.priority || '-'}
                                        </span>
                                    </td>
                                    {!isReadOnly && (
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => onEdit(car)}
                                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
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
                                            </div>
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

