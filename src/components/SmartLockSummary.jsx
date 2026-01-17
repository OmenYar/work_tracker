import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, Package, RefreshCw, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const SmartLockSummary = ({ smartLockData = [] }) => {
    const stats = useMemo(() => {
        const total = smartLockData.length;
        const installed = smartLockData.filter(s => s.status_new === 'INSTALLED').length;
        const needInstall = smartLockData.filter(s => s.status_new?.includes('NEED INSTALL')).length;
        const needRelocated = smartLockData.filter(s => s.status_new === 'NEED RELOCATED').length;
        const lost = smartLockData.filter(s => s.status_new?.includes('LOST')).length;
        const longAging = smartLockData.filter(s => s.priority === 'Issue Long Aging').length;

        const progress = total > 0 ? Math.round((installed / total) * 100) : 0;

        // Group by region
        const byRegion = smartLockData.reduce((acc, s) => {
            const region = s.pti_reg || 'Unknown';
            if (!acc[region]) acc[region] = { total: 0, installed: 0 };
            acc[region].total++;
            if (s.status_new === 'INSTALLED') acc[region].installed++;
            return acc;
        }, {});

        return { total, installed, needInstall, needRelocated, lost, longAging, progress, byRegion };
    }, [smartLockData]);

    const pct = (val) => stats.total > 0 ? ((val / stats.total) * 100).toFixed(1) : '0.0';

    const cards = [
        { title: 'Total Site', value: stats.total, pct: '100%', color: 'text-blue-600', bg: 'bg-blue-500/10', icon: Lock },
        { title: 'Installed', value: stats.installed, pct: `${pct(stats.installed)}%`, color: 'text-green-600', bg: 'bg-green-500/10', icon: CheckCircle },
        { title: 'Need Install', value: stats.needInstall, pct: `${pct(stats.needInstall)}%`, color: 'text-amber-600', bg: 'bg-amber-500/10', icon: Package, alert: stats.needInstall > 0 },
        { title: 'Need Relocated', value: stats.needRelocated, pct: `${pct(stats.needRelocated)}%`, color: 'text-purple-600', bg: 'bg-purple-500/10', icon: RefreshCw },
        { title: 'Lost/Broken', value: stats.lost, pct: `${pct(stats.lost)}%`, color: 'text-red-600', bg: 'bg-red-500/10', icon: XCircle, alert: stats.lost > 0 },
        { title: 'Long Aging', value: stats.longAging, pct: `${pct(stats.longAging)}%`, color: 'text-orange-600', bg: 'bg-orange-500/10', icon: AlertTriangle, alert: stats.longAging > 0 },
    ];

    return (
        <div className="space-y-4">
            {/* Summary Card */}
            <Card className="border-2 border-primary/20">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-2">
                            <Lock className="w-5 h-5" />
                            SmartLock Summary
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
                                        {card.pct && <p className={`text-[9px] ${card.color}`}>{card.pct}</p>}
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
                            <span className="text-muted-foreground">Installation Progress</span>
                            <span className="font-medium">{stats.installed}/{stats.total} ({stats.progress}%)</span>
                        </div>
                        <Progress value={stats.progress} className="h-2" />
                    </div>

                    {/* Progress by Region */}
                    {Object.keys(stats.byRegion).length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-sm font-medium mb-3">Progress per Region</p>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto">
                                {Object.entries(stats.byRegion)
                                    .sort((a, b) => b[1].total - a[1].total)
                                    .slice(0, 10)
                                    .map(([region, data]) => {
                                        const percent = Math.round((data.installed / data.total) * 100);
                                        return (
                                            <div key={region} className="flex items-center gap-3">
                                                <span className="text-xs w-[120px] truncate">{region}</span>
                                                <Progress value={percent} className="h-2 flex-1" />
                                                <span className="text-xs text-muted-foreground w-[80px] text-right">
                                                    {data.installed}/{data.total} ({percent}%)
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

export default SmartLockSummary;
