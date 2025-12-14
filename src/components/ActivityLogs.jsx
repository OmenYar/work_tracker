import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, LogIn, LogOut, Plus, Edit, Trash2, RefreshCw, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import ExportDropdown from '@/components/ExportDropdown';

const ActivityLogs = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState({
        action: 'all',
        table: 'all',
        dateFrom: '',
        dateTo: '',
        search: '',
    });
    const [pagination, setPagination] = useState({
        page: 0,
        pageSize: 50,
        total: 0,
    });

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            // First, fetch logs
            let query = supabase
                .from('activity_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(pagination.page * pagination.pageSize, (pagination.page + 1) * pagination.pageSize - 1);

            // Apply filters
            if (filter.action && filter.action !== 'all') {
                query = query.eq('action', filter.action);
            }
            if (filter.table && filter.table !== 'all') {
                query = query.eq('table_name', filter.table);
            }
            if (filter.dateFrom) {
                query = query.gte('created_at', filter.dateFrom);
            }
            if (filter.dateTo) {
                query = query.lte('created_at', `${filter.dateTo}T23:59:59`);
            }
            if (filter.search) {
                query = query.or(`description.ilike.%${filter.search}%,record_id.ilike.%${filter.search}%`);
            }

            const { data, error, count } = await query;

            if (error) {
                console.error('Error fetching logs:', error);
                throw error;
            }

            console.log('Logs fetched:', data?.length, 'Total:', count);

            // Fetch profile names for each unique user_id
            if (data && data.length > 0) {
                const userIds = [...new Set(data.map(log => log.user_id).filter(Boolean))];

                if (userIds.length > 0) {
                    const { data: profiles, error: profileError } = await supabase
                        .from('profiles')
                        .select('id, name, email')
                        .in('id', userIds);

                    if (!profileError && profiles) {
                        const profileMap = profiles.reduce((acc, p) => {
                            acc[p.id] = p;
                            return acc;
                        }, {});

                        // Attach profile to each log
                        data.forEach(log => {
                            log.profiles = profileMap[log.user_id] || null;
                        });
                    }
                }
            }

            setLogs(data || []);
            setPagination(prev => ({ ...prev, total: count || 0 }));
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filter]);

    const getActionIcon = (action) => {
        switch (action) {
            case 'login': return <LogIn className="w-4 h-4 text-green-500" />;
            case 'logout': return <LogOut className="w-4 h-4 text-gray-500" />;
            case 'insert': return <Plus className="w-4 h-4 text-blue-500" />;
            case 'update': return <Edit className="w-4 h-4 text-yellow-500" />;
            case 'delete': return <Trash2 className="w-4 h-4 text-red-500" />;
            default: return null;
        }
    };

    const getActionBadge = (action) => {
        const styles = {
            login: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            logout: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
            insert: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            update: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
        return styles[action] || 'bg-gray-100 text-gray-800';
    };

    const totalPages = Math.ceil(pagination.total / pagination.pageSize);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <h2 className="text-2xl font-bold">Activity Logs</h2>
                <div className="flex-1" />
                <div className="flex gap-2">
                    <ExportDropdown
                        data={logs}
                        filename="activity-logs"
                        title="Activity Logs"
                    />
                    <Button variant="outline" size="sm" onClick={fetchLogs}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg border">
                <Select value={filter.action} onValueChange={(v) => setFilter(f => ({ ...f, action: v }))}>
                    <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="login">Login</SelectItem>
                        <SelectItem value="logout">Logout</SelectItem>
                        <SelectItem value="insert">Insert</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filter.table} onValueChange={(v) => setFilter(f => ({ ...f, table: v }))}>
                    <SelectTrigger>
                        <SelectValue placeholder="Table" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tables</SelectItem>
                        <SelectItem value="auth">Auth</SelectItem>
                        <SelectItem value="work_trackers">Work Trackers</SelectItem>
                        <SelectItem value="pic_data">PIC Data</SelectItem>
                        <SelectItem value="car_data">Car Data</SelectItem>
                        <SelectItem value="cctv_data">CCTV Data</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input
                        type="date"
                        value={filter.dateFrom}
                        onChange={(e) => setFilter(f => ({ ...f, dateFrom: e.target.value }))}
                        placeholder="From"
                    />
                </div>

                <Input
                    type="date"
                    value={filter.dateTo}
                    onChange={(e) => setFilter(f => ({ ...f, dateTo: e.target.value }))}
                    placeholder="To"
                />

                <Input
                    placeholder="Search..."
                    value={filter.search}
                    onChange={(e) => setFilter(f => ({ ...f, search: e.target.value }))}
                />
            </div>

            {/* Stats */}
            <div className="text-sm text-muted-foreground">
                Showing {logs.length} of {pagination.total} logs
            </div>

            {/* Logs Table */}
            <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">User</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Table</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        No activity logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                                            <div className="font-mono text-xs">
                                                {format(new Date(log.created_at), 'yyyy-MM-dd')}
                                            </div>
                                            <div className="font-mono text-xs text-muted-foreground">
                                                {format(new Date(log.created_at), 'HH:mm:ss')}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-medium">{log.profiles?.name || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">{log.profiles?.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                                                {getActionIcon(log.action)}
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="inline-flex px-2 py-1 bg-muted rounded text-xs font-mono">
                                                {log.table_name || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm max-w-md">
                                            <div className="truncate" title={log.description}>
                                                {log.description}
                                            </div>
                                            {log.record_id && (
                                                <div className="text-xs text-muted-foreground font-mono truncate">
                                                    ID: {log.record_id}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Page {pagination.page + 1} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                            disabled={pagination.page === 0}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                            disabled={pagination.page >= totalPages - 1}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLogs;
