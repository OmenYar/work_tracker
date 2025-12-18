import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const ModuleSummary = ({ moduleData = [] }) => {
    const stats = useMemo(() => {
        const total = moduleData.length;
        const done = moduleData.filter(m => m.install_status === 'Done' || m.rfs_status === 'Done').length;
        const pending = total - done;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;

        // Group by kab_kota
        const byKota = moduleData.reduce((acc, m) => {
            const kota = m.kab_kota || 'Unknown';
            if (!acc[kota]) acc[kota] = { total: 0, done: 0 };
            acc[kota].total++;
            if (m.install_status === 'Done' || m.rfs_status === 'Done') acc[kota].done++;
            return acc;
        }, {});

        // Group by mitra
        const byMitra = moduleData.reduce((acc, m) => {
            const mitra = m.mitra || 'Unknown';
            if (!acc[mitra]) acc[mitra] = { total: 0, done: 0 };
            acc[mitra].total++;
            if (m.install_status === 'Done' || m.rfs_status === 'Done') acc[mitra].done++;
            return acc;
        }, {});

        // Calculate gap
        const totalGap = moduleData.reduce((sum, m) => sum + (Number(m.gap) || 0), 0);
        const totalModuleQty = moduleData.reduce((sum, m) => sum + (Number(m.module_qty) || 0), 0);
        const totalInstallQty = moduleData.reduce((sum, m) => sum + (Number(m.install_qty) || 0), 0);

        return { total, done, pending, progress, byKota, byMitra, totalGap, totalModuleQty, totalInstallQty };
    }, [moduleData]);

    const cards = [
        { title: 'Total Module', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-500/10', icon: Package },
        { title: 'Done', value: stats.done, color: 'text-green-600', bg: 'bg-green-500/10', icon: CheckCircle },
        { title: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-500/10', icon: Clock, alert: stats.pending > 0 },
        { title: 'Progress', value: `${stats.progress}%`, color: 'text-purple-600', bg: 'bg-purple-500/10', icon: TrendingUp },
        { title: 'Total Qty', value: stats.totalModuleQty, color: 'text-teal-600', bg: 'bg-teal-500/10', icon: Package },
        { title: 'Gap', value: stats.totalGap, color: stats.totalGap < 0 ? 'text-red-600' : 'text-green-600', bg: stats.totalGap < 0 ? 'bg-red-500/10' : 'bg-green-500/10', icon: AlertTriangle },
    ];

    return (
        <div className="space-y-4">
            {/* Summary Card */}
            <Card className="border-2 border-primary/20">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Module DPR2900 Summary
                        </span>
                        <Badge variant="outline">{stats.total} Sites</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                        {cards.map((card, idx) => (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`relative p-3 rounded-lg ${card.bg} ${card.alert ? 'ring-2 ring-red-500/50' : ''}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">{card.title}</p>
                                        <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                                    </div>
                                    <card.icon className={`w-4 h-4 ${card.color} opacity-50`} />
                                </div>
                                {card.alert && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Overall Progress</span>
                            <span className="font-medium">{stats.done}/{stats.total} ({stats.progress}%)</span>
                        </div>
                        <Progress value={stats.progress} className="h-2" />
                    </div>

                    {/* Progress by Kota */}
                    {Object.keys(stats.byKota).length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-3">Progress per Kota</p>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                {Object.entries(stats.byKota)
                                    .sort((a, b) => b[1].total - a[1].total)
                                    .slice(0, 10)
                                    .map(([kota, data]) => {
                                        const percent = Math.round((data.done / data.total) * 100);
                                        return (
                                            <div key={kota} className="flex items-center gap-3">
                                                <span className="text-xs w-[120px] truncate">{kota}</span>
                                                <Progress value={percent} className="h-2 flex-1" />
                                                <span className="text-xs text-muted-foreground w-[80px] text-right">
                                                    {data.done}/{data.total} ({percent}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ModuleSummary;
