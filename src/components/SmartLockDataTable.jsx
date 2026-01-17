import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ChevronLeft, ChevronRight, Search, Plus, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ExportDropdown from '@/components/ExportDropdown';
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
} from '@/components/ui/alert-dialog';

const SmartLockDataTable = ({
    data,
    onRefresh,
    enableSelection = false,
    selectedIds = [],
    onSelectionChange
}) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filterRegion, setFilterRegion] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterAging, setFilterAging] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [deleteId, setDeleteId] = useState(null);

    const statusColors = {
        'INSTALLED': 'bg-green-500/20 text-green-700',
        'NEED INSTALL': 'bg-blue-500/20 text-blue-700',
        'NEED INSTALL NORMAL': 'bg-blue-500/20 text-blue-700',
        'NEED RELOCATED': 'bg-amber-500/20 text-amber-700',
        'NEED SEND TO PTI': 'bg-purple-500/20 text-purple-700',
        'LOST BMG': 'bg-red-500/20 text-red-700',
        'DONE BA LOST BMG': 'bg-red-500/20 text-red-700',
        'LOST PTI': 'bg-red-500/20 text-red-700',
        'RETURNED TO PTI': 'bg-gray-500/20 text-gray-700'
    };

    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchSearch = search === '' ||
                item.site_id_2?.toLowerCase().includes(search.toLowerCase()) ||
                item.site_id_pti?.toLowerCase().includes(search.toLowerCase()) ||
                item.site_name?.toLowerCase().includes(search.toLowerCase()) ||
                item.sn_id_wm_lock?.toLowerCase().includes(search.toLowerCase());

            const matchRegion = filterRegion === 'all' || item.pti_reg === filterRegion;
            const matchStatus = filterStatus === 'all' || item.status_new === filterStatus;
            const matchPriority = filterPriority === 'all' || item.priority === filterPriority;
            const matchAging = filterAging === 'all' || item.aging_last_access === filterAging;

            return matchSearch && matchRegion && matchStatus && matchPriority && matchAging;
        });
    }, [data, search, filterRegion, filterStatus, filterPriority, filterAging]);

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const { error } = await supabase
                .from('smartlock_data')
                .delete()
                .eq('id', deleteId);
            if (error) throw error;
            onRefresh?.();
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error deleting data');
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <Card>
                <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search Site ID, Site Name, SN..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="pl-10"
                            />
                        </div>
                        <Select value={filterRegion} onValueChange={(v) => { setFilterRegion(v); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Region" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Regions</SelectItem>
                                <SelectItem value="Jabo Outer 1">Jabo Outer 1</SelectItem>
                                <SelectItem value="Jabo Outer 2">Jabo Outer 2</SelectItem>
                                <SelectItem value="Jabo Outer 3">Jabo Outer 3</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="INSTALLED">INSTALLED</SelectItem>
                                <SelectItem value="NEED INSTALL">NEED INSTALL</SelectItem>
                                <SelectItem value="NEED INSTALL NORMAL">NEED INSTALL NORMAL</SelectItem>
                                <SelectItem value="NEED RELOCATED">NEED RELOCATED</SelectItem>
                                <SelectItem value="NEED SEND TO PTI">NEED SEND TO PTI</SelectItem>
                                <SelectItem value="LOST BMG">LOST BMG</SelectItem>
                                <SelectItem value="LOST PTI">LOST PTI</SelectItem>
                                <SelectItem value="RETURNED TO PTI">RETURNED TO PTI</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priority</SelectItem>
                                <SelectItem value="Issue Long Aging">Issue Long Aging</SelectItem>
                                <SelectItem value="Normal">Normal</SelectItem>
                            </SelectContent>
                        </Select>
                        <ExportDropdown
                            data={filteredData}
                            filename="smartlock_data"
                            title="SmartLock Data"
                        />
                        <Button size="icon" onClick={() => navigate('/admin/input-smartlock')} title="Add New">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="rounded-md border-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    {enableSelection && (
                                        <TableHead className="w-10">
                                            <Checkbox
                                                checked={isAllSelected}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all"
                                                className={isIndeterminate ? 'data-[state=checked]:bg-primary/50' : ''}
                                            />
                                        </TableHead>
                                    )}
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Site ID 2</TableHead>
                                    <TableHead>Site ID PTI</TableHead>
                                    <TableHead>Site Name</TableHead>
                                    <TableHead>SN WM Lock</TableHead>
                                    <TableHead>PTI Regional</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Aging</TableHead>
                                    <TableHead className="text-right w-12">Act</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={enableSelection ? 11 : 10} className="text-center py-8 text-muted-foreground">
                                            No data found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map((item, idx) => (
                                        <TableRow key={item.id} className={`hover:bg-muted/30 ${selectedIds.includes(item.id) ? 'bg-primary/5' : ''}`}>
                                            {enableSelection && (
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedIds.includes(item.id)}
                                                        onCheckedChange={(checked) => handleSelectRow(item.id, checked)}
                                                        aria-label={`Select ${item.site_id_2}`}
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell className="text-muted-foreground text-xs">
                                                {(currentPage - 1) * pageSize + idx + 1}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{item.site_id_2}</TableCell>
                                            <TableCell className="font-mono text-xs">{item.site_id_pti}</TableCell>
                                            <TableCell className="max-w-[200px] truncate text-xs">{item.site_name}</TableCell>
                                            <TableCell className="font-mono text-xs">{item.sn_id_wm_lock}</TableCell>
                                            <TableCell className="text-xs">{item.pti_reg}</TableCell>
                                            <TableCell>
                                                <Badge className={`text-[11px] ${statusColors[item.status_new] || 'bg-gray-500/20'}`}>
                                                    {item.status_new}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {item.priority === 'Issue Long Aging' && (
                                                    <Badge className="text-[11px] bg-orange-500/20 text-orange-700">
                                                        {item.priority}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">{item.aging_last_access}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => navigate(`/admin/edit-smartlock/${item.id}`)}>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteId(item.id)}
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
                            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
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
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm">Page {currentPage} of {totalPages || 1}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete SmartLock Data</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this data? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default SmartLockDataTable;
