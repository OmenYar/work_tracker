import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    History, User, Calendar, Search, Filter, ChevronDown, ChevronRight,
    RotateCcw, Eye, Edit, Trash2, Plus, X, RefreshCw, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { TableSkeleton } from '@/components/ui/skeleton';

const ACTION_ICONS = {
    CREATE: Plus,
    UPDATE: Edit,
    DELETE: Trash2,
    VIEW: Eye,
};

const ACTION_COLORS = {
    CREATE: 'bg-green-500/10 text-green-600 border-green-500/30',
    UPDATE: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    DELETE: 'bg-red-500/10 text-red-600 border-red-500/30',
    VIEW: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
};

const EnhancedAuditTrail = () => {
    const { toast } = useToast();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedLog, setExpandedLog] = useState(null);
    const [showRevertDialog, setShowRevertDialog] = useState(false);
    const [revertingLog, setRevertingLog] = useState(null);
    const [isReverting, setIsReverting] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');

    // Fetch audit logs
    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch audit logs',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Get unique users for filter
    const uniqueUsers = useMemo(() => {
        const users = [...new Set(logs.map(log => log.user_email || log.user_id))];
        return users.filter(Boolean);
    }, [logs]);

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            // Search filter
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                const matchesSearch =
                    (log.table_name || '').toLowerCase().includes(searchLower) ||
                    (log.user_email || '').toLowerCase().includes(searchLower) ||
                    (log.record_id || '').toLowerCase().includes(searchLower) ||
                    JSON.stringify(log.changes || {}).toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Action filter
            if (actionFilter !== 'all' && log.action !== actionFilter) {
                return false;
            }

            // User filter
            if (userFilter !== 'all' && (log.user_email || log.user_id) !== userFilter) {
                return false;
            }

            // Date filter
            if (dateFilter !== 'all') {
                const logDate = new Date(log.created_at);
                const now = new Date();

                switch (dateFilter) {
                    case 'today':
                        if (logDate.toDateString() !== now.toDateString()) return false;
                        break;
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        if (logDate < weekAgo) return false;
                        break;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        if (logDate < monthAgo) return false;
                        break;
                }
            }

            return true;
        });
    }, [logs, searchQuery, actionFilter, userFilter, dateFilter]);

    // Format date
    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    // Parse changes for display
    const parseChanges = (changes) => {
        if (!changes) return [];

        try {
            const parsed = typeof changes === 'string' ? JSON.parse(changes) : changes;

            // Handle before/after format
            if (parsed.before && parsed.after) {
                const changedFields = [];
                const allKeys = [...new Set([...Object.keys(parsed.before || {}), ...Object.keys(parsed.after || {})])];

                allKeys.forEach(key => {
                    if (JSON.stringify(parsed.before?.[key]) !== JSON.stringify(parsed.after?.[key])) {
                        changedFields.push({
                            field: key,
                            before: parsed.before?.[key],
                            after: parsed.after?.[key],
                        });
                    }
                });

                return changedFields;
            }

            // Handle flat object
            return Object.entries(parsed).map(([field, value]) => ({
                field,
                after: value,
            }));
        } catch {
            return [];
        }
    };

    // Handle revert
    const handleRevert = async () => {
        if (!revertingLog) return;

        setIsReverting(true);
        try {
            const changes = parseChanges(revertingLog.changes);

            if (revertingLog.action === 'UPDATE' && changes.length > 0) {
                // Revert to previous values
                const revertData = {};
                changes.forEach(change => {
                    if (change.before !== undefined) {
                        revertData[change.field] = change.before;
                    }
                });

                const { error } = await supabase
                    .from(revertingLog.table_name)
                    .update(revertData)
                    .eq('id', revertingLog.record_id);

                if (error) throw error;

                toast({
                    title: 'Revert Successful',
                    description: 'Changes have been reverted to previous values',
                });
            } else if (revertingLog.action === 'DELETE') {
                // Restore deleted record
                const originalData = revertingLog.changes?.before || revertingLog.changes;

                const { error } = await supabase
                    .from(revertingLog.table_name)
                    .insert(originalData);

                if (error) throw error;

                toast({
                    title: 'Record Restored',
                    description: 'Deleted record has been restored',
                });
            }

            setShowRevertDialog(false);
            setRevertingLog(null);
        } catch (error) {
            console.error('Revert error:', error);
            toast({
                title: 'Revert Failed',
                description: error.message || 'Failed to revert changes',
                variant: 'destructive',
            });
        } finally {
            setIsReverting(false);
        }
    };

    // Check if log is revertable
    const isRevertable = (log) => {
        return log.action === 'UPDATE' || log.action === 'DELETE';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <History className="w-6 h-6" />
                        Enhanced Audit Trail
                    </h2>
                    <p className="text-muted-foreground">Detailed change history with revert capability</p>
                </div>
                <Button variant="outline" onClick={fetchLogs} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search logs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                <SelectItem value="CREATE">Create</SelectItem>
                                <SelectItem value="UPDATE">Update</SelectItem>
                                <SelectItem value="DELETE">Delete</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={userFilter} onValueChange={setUserFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="User" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {uniqueUsers.map(user => (
                                    <SelectItem key={user} value={user}>{user}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Date" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">Last 7 Days</SelectItem>
                                <SelectItem value="month">Last 30 Days</SelectItem>
                            </SelectContent>
                        </Select>
                        {(searchQuery || actionFilter !== 'all' || userFilter !== 'all' || dateFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setActionFilter('all');
                                    setUserFilter('all');
                                    setDateFilter('all');
                                }}
                            >
                                <X className="w-4 h-4 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Results count */}
            <div className="text-sm text-muted-foreground">
                Showing {filteredLogs.length} of {logs.length} logs
            </div>

            {/* Logs List */}
            {loading ? (
                <TableSkeleton rows={10} columns={5} />
            ) : filteredLogs.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        No audit logs found matching your criteria
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {filteredLogs.map((log) => {
                        const ActionIcon = ACTION_ICONS[log.action] || History;
                        const isExpanded = expandedLog === log.id;
                        const changes = parseChanges(log.changes);
                        const { date, time } = formatDateTime(log.created_at);

                        return (
                            <motion.div
                                key={log.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="border rounded-lg bg-card overflow-hidden"
                            >
                                {/* Log Header */}
                                <button
                                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                                >
                                    <Badge
                                        variant="outline"
                                        className={`${ACTION_COLORS[log.action]} shrink-0`}
                                    >
                                        <ActionIcon className="w-3 h-3 mr-1" />
                                        {log.action}
                                    </Badge>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                            {log.table_name}
                                            {log.record_id && (
                                                <span className="text-muted-foreground font-mono text-xs ml-2">
                                                    #{log.record_id.slice(0, 8)}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {changes.length > 0 && (
                                                <span>{changes.length} field(s) changed</span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3.5 h-3.5" />
                                            <span className="max-w-[120px] truncate">{log.user_email || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{date} {time}</span>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded Details */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t bg-muted/30"
                                        >
                                            <div className="p-4 space-y-4">
                                                {/* Changes Detail */}
                                                {changes.length > 0 && (
                                                    <div>
                                                        <h4 className="font-medium mb-2">Changes</h4>
                                                        <div className="space-y-2">
                                                            {changes.map((change, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="flex items-start gap-4 p-3 bg-background rounded-lg text-sm"
                                                                >
                                                                    <span className="font-mono text-muted-foreground min-w-[120px]">
                                                                        {change.field}
                                                                    </span>
                                                                    {change.before !== undefined && (
                                                                        <>
                                                                            <span className="px-2 py-0.5 bg-red-500/10 text-red-600 rounded line-through">
                                                                                {JSON.stringify(change.before)}
                                                                            </span>
                                                                            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                                                        </>
                                                                    )}
                                                                    <span className="px-2 py-0.5 bg-green-500/10 text-green-600 rounded">
                                                                        {JSON.stringify(change.after)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                {isRevertable(log) && (
                                                    <div className="flex justify-end pt-2 border-t">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setRevertingLog(log);
                                                                setShowRevertDialog(true);
                                                            }}
                                                        >
                                                            <RotateCcw className="w-4 h-4 mr-2" />
                                                            Revert Changes
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Revert Confirmation Dialog */}
            <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <RotateCcw className="w-5 h-5" />
                            Revert Changes?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {revertingLog?.action === 'UPDATE'
                                ? 'This will restore the previous values for the changed fields.'
                                : 'This will restore the deleted record.'
                            }
                            This action will be logged in the audit trail.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isReverting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevert} disabled={isReverting}>
                            {isReverting ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RotateCcw className="w-4 h-4 mr-2" />
                            )}
                            Confirm Revert
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default EnhancedAuditTrail;
