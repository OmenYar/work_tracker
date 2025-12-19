import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Upload, Edit, Trash2, Check, X,
    ChevronLeft, ChevronRight, RefreshCw, Plus
} from 'lucide-react';
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
    onRefresh,
    onImportClick,
    isLoading = false
}) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [regionalFilter, setRegionalFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

    // Get active PICs for dropdown
    const activePics = useMemo(() =>
        picData.filter(p => p.validasi === 'Active').sort((a, b) => a.nama_pic?.localeCompare(b.nama_pic)),
        [picData]
    );

    // Filter data
    const filteredData = useMemo(() => {
        return moduleData.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.site_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.site_name?.toLowerCase().includes(searchTerm.toLowerCase());
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

    // Inline edit handlers
    const handleInlineEdit = (item) => {
        setEditingId(item.id);
        setEditForm({
            install_qty: item.install_qty || 0,
            pic_name: item.pic_name || '',
            rfs_date: item.rfs_date || '',
            rfs_status: item.rfs_status || 'Open',
        });
    };

    const handleSaveInlineEdit = async () => {
        try {
            const currentItem = moduleData.find(m => m.id === editingId);
            const moduleQty = currentItem?.module_qty || 0;
            const installQty = parseInt(editForm.install_qty) || 0;
            const gap = moduleQty - installQty;

            // Handle rfs_date - strictly convert empty/invalid to null
            let rfsDate = null;
            if (editForm.rfs_date && typeof editForm.rfs_date === 'string' && editForm.rfs_date.trim() !== '') {
                rfsDate = editForm.rfs_date.trim();
            }

            const updateData = {
                install_qty: installQty,
                pic_name: editForm.pic_name || null,
                rfs_status: editForm.rfs_status || 'Open',
                gap: gap,
            };

            // Only include rfs_date if it has a valid value, otherwise set to null explicitly
            updateData.rfs_date = rfsDate;

            const { error } = await supabase
                .from('module_tracker')
                .update(updateData)
                .eq('id', editingId);

            if (error) throw error;

            toast({ title: 'Berhasil', description: 'Data berhasil diupdate' });
            setEditingId(null);
            onRefresh?.();
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

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
                        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={onImportClick}>
                            <Upload className="w-4 h-4 mr-2" />
                            Import
                        </Button>
                        <Button size="sm" onClick={() => navigate('/admin/input-module')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add
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
                                    <TableHead className="text-center">Qty Install</TableHead>
                                    <TableHead>RFS Status</TableHead>
                                    <TableHead>PIC</TableHead>
                                    <TableHead>RFS Date</TableHead>
                                    <TableHead>Regional</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            {isLoading ? 'Loading...' : 'No data found'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((item, index) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-muted-foreground">{startIndex + index + 1}</TableCell>
                                            <TableCell className="font-mono text-sm">{item.site_id}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{item.site_name}</TableCell>
                                            <TableCell className="text-center">
                                                {editingId === item.id ? (
                                                    <Input
                                                        type="number"
                                                        value={editForm.install_qty}
                                                        onChange={(e) => setEditForm({ ...editForm, install_qty: e.target.value })}
                                                        className="h-8 w-[70px]"
                                                    />
                                                ) : (
                                                    item.install_qty || 0
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingId === item.id ? (
                                                    <Select
                                                        value={editForm.rfs_status}
                                                        onValueChange={(v) => setEditForm({ ...editForm, rfs_status: v })}
                                                    >
                                                        <SelectTrigger className="w-[130px] h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {RFS_STATUS_OPTIONS.map(s => (
                                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    getStatusBadge(item.rfs_status)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingId === item.id ? (
                                                    <Select
                                                        value={editForm.pic_name || 'none'}
                                                        onValueChange={(v) => setEditForm({ ...editForm, pic_name: v === 'none' ? '' : v })}
                                                    >
                                                        <SelectTrigger className="w-[130px] h-8">
                                                            <SelectValue placeholder="Select PIC" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">N/A</SelectItem>
                                                            {activePics.map(p => (
                                                                <SelectItem key={p.id} value={p.nama_pic}>{p.nama_pic}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    getPicDisplay(item.pic_name)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingId === item.id ? (
                                                    <Input
                                                        type="date"
                                                        value={editForm.rfs_date}
                                                        onChange={(e) => setEditForm({ ...editForm, rfs_date: e.target.value })}
                                                        className="h-8 w-[130px]"
                                                    />
                                                ) : (
                                                    item.rfs_date ? new Date(item.rfs_date).toLocaleDateString('id-ID') : '-'
                                                )}
                                            </TableCell>
                                            <TableCell>{item.regional || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                {editingId === item.id ? (
                                                    <div className="flex gap-1 justify-end">
                                                        <Button size="sm" variant="ghost" onClick={handleSaveInlineEdit}>
                                                            <Check className="w-4 h-4 text-green-600" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                                            <X className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1 justify-end">
                                                        <Button size="sm" variant="ghost" onClick={() => handleInlineEdit(item)} title="Quick Edit">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => navigate(`/admin/edit-module/${item.id}`)} title="Full Edit">
                                                            Edit
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setDeleteDialog({ open: true, item })}>
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                )}
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
