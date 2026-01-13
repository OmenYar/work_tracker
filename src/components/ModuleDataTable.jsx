import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Edit, Trash2, MoreHorizontal,
    Plus
} from 'lucide-react';
import ExportDropdown from '@/components/ExportDropdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { supabase } from '@/lib/customSupabaseClient';
import { deleteModuleFromGoogleSheets } from '@/lib/googleSheetsSync';

// Filter options
const RFS_STATUS_OPTIONS = ['Open', 'Done', 'Hold'];
const DOC_ATP_OPTIONS = ['Open', 'Done'];

const ModuleDataTable = ({
    moduleData = [],
    onRefresh,
}) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [rfsFilter, setRfsFilter] = useState('all');
    const [atpFilter, setAtpFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

    // Filter data
    const filteredData = useMemo(() => {
        return moduleData.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.site_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRfs = rfsFilter === 'all' || item.rfs_status === rfsFilter;
            const matchesAtp = atpFilter === 'all' || item.doc_atp === atpFilter;
            return matchesSearch && matchesRfs && matchesAtp;
        });
    }, [moduleData, searchTerm, rfsFilter, atpFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const startIndex = (currentPage - 1) * itemsPerPage;

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, rfsFilter, atpFilter, itemsPerPage]);

    const handleDelete = useCallback(async () => {
        try {
            const recordId = deleteDialog.item.id;

            const { error } = await supabase
                .from('module_tracker')
                .delete()
                .eq('id', recordId);

            if (error) throw error;

            // Sync delete to Google Sheets
            await deleteModuleFromGoogleSheets(recordId);

            toast({ title: 'Berhasil', description: 'Data berhasil dihapus' });
            setDeleteDialog({ open: false, item: null });
            onRefresh?.();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    }, [deleteDialog.item, toast, onRefresh]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID');
    };

    // Status badge helper
    const getStatusBadge = (status) => {
        const colorMap = {
            'Done': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'Open': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            'Hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        };
        return colorMap[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    };

    // ATP Doc badge
    const getAtpBadge = (status) => {
        const colorMap = {
            'Done': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            'Open': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        };
        return colorMap[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    };

    const handleItemsPerPageChange = (newSize) => {
        setItemsPerPage(newSize);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <Card>
                <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search Site ID / Name / Area..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={rfsFilter} onValueChange={setRfsFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="RFS Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All RFS</SelectItem>
                                {RFS_STATUS_OPTIONS.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={atpFilter} onValueChange={setAtpFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="ATP Doc" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All ATP</SelectItem>
                                {DOC_ATP_OPTIONS.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <ExportDropdown
                            data={filteredData}
                            filename="module_dpr2900"
                            title="Data Module DPR2900"
                        />
                        <Button size="icon" onClick={() => navigate('/admin/input-module')} title="Add New">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">No</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Site ID</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Site Name</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Area</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Project</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">RFS Status</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Install Date</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">SN Module</th>
                                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">ATP Doc</th>
                                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-8 text-muted-foreground">
                                            No data found
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((item, index) => (
                                        <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                                            <td className="py-3 px-4 text-muted-foreground">{startIndex + index + 1}</td>
                                            <td className="py-3 px-4 font-medium font-mono">{item.site_id}</td>
                                            <td className="py-3 px-4 max-w-[150px] truncate">{item.site_name}</td>
                                            <td className="py-3 px-4">{item.area || '-'}</td>
                                            <td className="py-3 px-4 max-w-[120px] truncate">{item.project_name || '-'}</td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(item.rfs_status)}`}>
                                                    {item.rfs_status || 'Open'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">{formatDate(item.install_date)}</td>
                                            <td className="py-3 px-4 font-mono text-xs">{item.sn_module || '-'}</td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getAtpBadge(item.doc_atp)}`}>
                                                    {item.doc_atp || 'Open'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => navigate(`/admin/edit-module/${item.id}`)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteDialog({ open: true, item })}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredData.length}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={handleItemsPerPageChange}
                        className="m-4"
                    />
                </CardContent>
            </Card>

            {/* Delete Dialog */}
            <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, item: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Data Module</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus data untuk site {deleteDialog.item?.site_id}?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialog({ open: false, item: null })}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ModuleDataTable;
