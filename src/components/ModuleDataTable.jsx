import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Package, Search, Filter, Upload, Edit, Trash2, Check, X,
    ChevronLeft, ChevronRight, Download, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const ModuleDataTable = ({
    moduleData = [],
    onRefresh,
    onImportClick,
    isLoading = false
}) => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

    // Filter data
    const filteredData = useMemo(() => {
        return moduleData.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.site_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.site_name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || item.rfs_status?.toLowerCase() === statusFilter.toLowerCase();
            return matchesSearch && matchesStatus;
        });
    }, [moduleData, searchTerm, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Handlers
    const handleEdit = (item) => {
        setEditingId(item.id);
        setEditForm({
            rfs_status: item.rfs_status || 'Open',
            rfs_date: item.rfs_date || '',
            pic_name: item.pic_name || '',
            teknisi: item.teknisi || '',
            notes: item.notes || '',
        });
    };

    const handleSaveEdit = async () => {
        try {
            const { error } = await supabase
                .from('module_tracker')
                .update(editForm)
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

    const getStatusBadge = (status) => {
        const statusLower = String(status || '').toLowerCase();
        if (statusLower === 'done') {
            return <Badge className="bg-green-500/20 text-green-700">✅ Done</Badge>;
        }
        return <Badge className="bg-yellow-500/20 text-yellow-700">⏳ Open</Badge>;
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
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="RFS Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="Done">Done</SelectItem>
                                <SelectItem value="Open">Open</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={onImportClick}>
                            <Upload className="w-4 h-4 mr-2" />
                            Import Excel
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
                                    <TableHead className="w-[120px]">Site ID</TableHead>
                                    <TableHead>Site Name</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead>RFS Status</TableHead>
                                    <TableHead>PIC</TableHead>
                                    <TableHead>RFS Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {isLoading ? 'Loading...' : 'No data found'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-mono text-sm">{item.site_id}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{item.site_name}</TableCell>
                                            <TableCell className="text-center">{item.module_qty}</TableCell>
                                            <TableCell>
                                                {editingId === item.id ? (
                                                    <Select
                                                        value={editForm.rfs_status}
                                                        onValueChange={(v) => setEditForm({ ...editForm, rfs_status: v })}
                                                    >
                                                        <SelectTrigger className="w-[100px] h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Open">Open</SelectItem>
                                                            <SelectItem value="Done">Done</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    getStatusBadge(item.rfs_status)
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {editingId === item.id ? (
                                                    <Input
                                                        value={editForm.pic_name}
                                                        onChange={(e) => setEditForm({ ...editForm, pic_name: e.target.value })}
                                                        className="h-8 w-[120px]"
                                                    />
                                                ) : (
                                                    item.pic_name || '-'
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
                                            <TableCell className="text-right">
                                                {editingId === item.id ? (
                                                    <div className="flex gap-1 justify-end">
                                                        <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                                                            <Check className="w-4 h-4 text-green-600" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                                            <X className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1 justify-end">
                                                        <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                                                            <Edit className="w-4 h-4" />
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
