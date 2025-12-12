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

const PicDataTable = ({ data, onEdit, onDelete, isReadOnly = false }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

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
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nama PIC</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Jabatan</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Regional</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Area</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Active</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Remark</th>
                            {!isReadOnly && <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((pic) => (
                            <tr key={pic.id} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="py-3 px-4 font-medium">{pic.nama_pic}</td>
                                <td className="py-3 px-4">{pic.jabatan}</td>
                                <td className="py-3 px-4">{pic.regional}</td>
                                <td className="py-3 px-4">{pic.area}</td>
                                <td className="py-3 px-4">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pic.validasi === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {pic.validasi === 'Active' ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate" title={pic.remark || ''}>{pic.remark || '-'}</td>
                                {!isReadOnly && (
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onEdit(pic)}
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
                                                        <AlertDialogTitle>Delete PIC Data?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => onDelete(pic.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
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