import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, TrendingUp, CheckCircle, Clock, PauseCircle, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const ModuleSummary = ({ moduleData = [] }) => {
    const stats = useMemo(() => {
        const total = moduleData.length;

        // RFS Status counts
        const done = moduleData.filter(m => m.rfs_status === 'Done').length;
        const open = moduleData.filter(m => !m.rfs_status || m.rfs_status === 'Open').length;
        const hold = moduleData.filter(m => m.rfs_status === 'Hold').length;

        // Count with ATP Doc
        const withAtp = moduleData.filter(m => m.doc_atp === 'Done').length;

        const progress = total > 0 ? Math.round((done / total) * 100) : 0;

        // Group by area (kab/kota) for progress
        const byArea = moduleData.reduce((acc, m) => {
            const area = m.area || 'Unknown';
            if (!acc[area]) acc[area] = { total: 0, done: 0 };
            acc[area].total++;
            if (m.rfs_status === 'Done') acc[area].done++;
            return acc;
        }, {});

        return { total, done, open, hold, withAtp, progress, byArea };
    }, [moduleData]);

    const cards = [
        { title: 'Total Site', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-500/10', icon: Package },
        { title: 'Done', value: stats.done, color: 'text-green-600', bg: 'bg-green-500/10', icon: CheckCircle },
        { title: 'Open', value: stats.open, color: 'text-yellow-600', bg: 'bg-yellow-500/10', icon: Clock },
        { title: 'Hold', value: stats.hold, color: 'text-orange-600', bg: 'bg-orange-500/10', icon: PauseCircle, alert: stats.hold > 0 },
        { title: 'ATP Done', value: stats.withAtp, color: 'text-cyan-600', bg: 'bg-cyan-500/10', icon: FileSpreadsheet },
        { title: 'Progress', value: `${stats.progress}%`, color: 'text-emerald-600', bg: 'bg-emerald-500/10', icon: TrendingUp },
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
                                className={`relative p-3 rounded-lg ${card.bg} ${card.alert ? 'ring-2 ring-orange-500/50' : ''}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">{card.title}</p>
                                        <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                                    </div>
                                    <card.icon className={`w-4 h-4 ${card.color} opacity-50`} />
                                </div>
                                {card.alert && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">RFS Progress</span>
                            <span className="font-medium">{stats.done}/{stats.total} ({stats.progress}%)</span>
                        </div>
                        <Progress value={stats.progress} className="h-2" />
                    </div>

                    {/* Progress by Area (Kab/Kota) */}
                    {Object.keys(stats.byArea).length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-3">Progress per Kab/Kota</p>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                {Object.entries(stats.byArea)
                                    .sort((a, b) => b[1].total - a[1].total)
                                    .slice(0, 10)
                                    .map(([area, data]) => {
                                        const percent = Math.round((data.done / data.total) * 100);
                                        return (
                                            <div key={area} className="flex items-center gap-3">
                                                <span className="text-xs w-[120px] truncate">{area}</span>
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
