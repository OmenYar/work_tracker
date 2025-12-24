import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Edit, Trash2, MoreHorizontal,
    ChevronLeft, ChevronRight, Plus
} from 'lucide-react';
import ExportDropdown from '@/components/ExportDropdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { supabase } from '@/lib/customSupabaseClient';

const RFS_STATUS_OPTIONS = ['Open', 'Closed', 'Hold', 'Waiting Permit', 'Cancel'];
const REGIONAL_OPTIONS = [
    { value: 'Jabo Outer 1', label: 'Jabo Outer 1' },
    { value: 'Jabo Outer 2', label: 'Jabo Outer 2' },
    { value: 'Jabo Outer 3', label: 'Jabo Outer 3' },
];

const ModuleDataTable = ({
    moduleData = [],
    picData = [],
}) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [regionalFilter, setRegionalFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });



    // Filter data
    const filteredData = useMemo(() => {
        return moduleData.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.site_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.kab_kota?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || item.rfs_status === statusFilter;
            const matchesRegional = regionalFilter === 'all' || item.regional === regionalFilter;
            return matchesSearch && matchesStatus && matchesRegional;
        });
    }, [moduleData, searchTerm, statusFilter, regionalFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const startIndex = (currentPage - 1) * itemsPerPage;

    const handleDelete = async () => {
        try {
            const { error } = await supabase
                .from('module_tracker')
                .delete()
                .eq('id', deleteDialog.item.id);

            if (error) throw error;

            toast({ title: 'Berhasil', description: 'Data berhasil dihapus' });
            setDeleteDialog({ open: false, item: null });
            onRefresh?.();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    // Get PIC name with N/A fallback
    const getPicDisplay = (picName) => {
        if (!picName) return 'N/A';
        return picName;
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            'Closed': 'bg-green-500/20 text-green-700',
            'Open': 'bg-yellow-500/20 text-yellow-700',
            'Hold': 'bg-orange-500/20 text-orange-700',
            'Waiting Permit': 'bg-blue-500/20 text-blue-700',
            'Cancel': 'bg-red-500/20 text-red-700',
        };
        return <Badge className={statusColors[status] || 'bg-gray-500/20 text-gray-700'}>{status || 'Open'}</Badge>;
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
                                placeholder="Search Site ID / Name..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="RFS Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                {RFS_STATUS_OPTIONS.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={regionalFilter} onValueChange={setRegionalFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Regional" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Regional</SelectItem>
                                {REGIONAL_OPTIONS.map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">No</TableHead>
                                    <TableHead className="w-[120px]">Site ID</TableHead>
                                    <TableHead>Site Name</TableHead>
                                    <TableHead>Kab/Kota</TableHead>
                                    <TableHead>RFS Status</TableHead>
                                    <TableHead>PIC</TableHead>
                                    <TableHead>RFS Date</TableHead>
                                    <TableHead>Regional</TableHead>
                                    <TableHead className="text-right w-12">Act</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            No data found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-muted-foreground">{startIndex + index + 1}</TableCell>
                                            <TableCell className="font-mono text-sm">{item.site_id}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{item.site_name}</TableCell>
                                            <TableCell>{item.kab_kota || '-'}</TableCell>
                                            <TableCell>
                                                {getStatusBadge(item.rfs_status)}
                                            </TableCell>
                                            <TableCell>
                                                {getPicDisplay(item.pic_name)}
                                            </TableCell>
                                            <TableCell>
                                                {item.rfs_date ? new Date(item.rfs_date).toLocaleDateString('id-ID') : '-'}
                                            </TableCell>
                                            <TableCell>{item.regional || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Showing {paginatedData.length} of {filteredData.length}</span>
                            <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                                <SelectTrigger className="w-[70px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm">Page {currentPage} of {totalPages || 1}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
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
