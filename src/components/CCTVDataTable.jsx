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

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
};

const CCTVDataTable = ({ data, onEdit, onDelete, isReadOnly = false }) => {
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
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">No</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Site ID</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Site Name</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Regional</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Branch</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Merk CCTV</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Model</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Install Date</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tenant Available</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">CCTV Category</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Remarks</th>
                            {!isReadOnly && <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map((cctv, index) => (
                            <tr key={cctv.id} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="py-3 px-4 text-muted-foreground">{startIndex + index + 1}</td>
                                <td className="py-3 px-4 font-medium font-mono">{cctv.site_id_display || '-'}</td>
                                <td className="py-3 px-4">{cctv.site_name || '-'}</td>
                                <td className="py-3 px-4">
                                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        {cctv.regional || '-'}
                                    </span>
                                </td>
                                <td className="py-3 px-4">{cctv.branch || '-'}</td>
                                <td className="py-3 px-4">{cctv.merk_cctv || '-'}</td>
                                <td className="py-3 px-4">{cctv.model || '-'}</td>
                                <td className="py-3 px-4">{formatDate(cctv.install_date)}</td>
                                <td className="py-3 px-4">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(cctv.status)}`}>
                                        {cctv.status ? cctv.status.toUpperCase() : '-'}
                                    </span>
                                </td>
                                <td className="py-3 px-4">{cctv.tenant_available || '-'}</td>
                                <td className="py-3 px-4">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryBadge(cctv.cctv_category)}`}>
                                        {cctv.cctv_category || '-'}
                                    </span>
                                </td>
                                <td className="py-3 px-4 max-w-[200px] truncate" title={cctv.remarks}>
                                    {cctv.remarks || '-'}
                                </td>
                                {!isReadOnly && (
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onEdit(cctv)}
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

export default CCTVDataTable;
