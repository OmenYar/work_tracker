import React, { useState } from 'react';
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const WorkTrackerTable = ({ data, onEdit, onDelete, isReadOnly = false }) => {
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
                        {paginatedData.map((tracker, index) => (
                            <tr key={tracker.id} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="py-3 px-4 text-muted-foreground">{startIndex + index + 1}</td>
                                <td className="py-3 px-4">{tracker.site_id_1}</td>
                                <td className="py-3 px-4 font-medium">{tracker.site_name}</td>
                                <td className="py-3 px-4">{tracker.regional}</td>
                                <td className="py-3 px-4">{tracker.main_addwork}</td>
                                <td className="py-3 px-4">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tracker.status_pekerjaan === 'Open'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                        : tracker.status_pekerjaan === 'On Hold'
                                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                        }`}>
                                        {tracker.status_pekerjaan || '-'}
                                    </span>
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

export default WorkTrackerTable;
