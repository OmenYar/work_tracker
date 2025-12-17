import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Trophy, TrendingUp, TrendingDown, Target, Clock, CheckCircle,
    Award, Star, Medal, ChevronUp, ChevronDown, Minus, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// SLA Configuration
const SLA_CONFIG = {
    maxAgingDays: 14, // Max days for BAST processing
    targetCompletionRate: 90, // %
    targetBastApprovalRate: 85, // %
};

const PerformanceMonitoring = ({ workTrackers = [], picData = [] }) => {
    const [timeRange, setTimeRange] = useState('month');
    const [sortBy, setSortBy] = useState('score');

    // Calculate SLA metrics
    const slaMetrics = useMemo(() => {
        const totalJobs = workTrackers.length;
        const completedJobs = workTrackers.filter(t => t.status_pekerjaan === 'Close').length;
        const bastApproved = workTrackers.filter(t =>
            t.status_bast === 'Approve' || t.status_bast === 'BAST Approve Date'
        ).length;

        // Jobs within SLA (aging <= maxAgingDays)
        const withinSla = workTrackers.filter(t => {
            if (!t.aging_days) return true; // No aging = within SLA
            return Number(t.aging_days) <= SLA_CONFIG.maxAgingDays;
        }).length;

        // Calculate rates
        const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
        const bastApprovalRate = completedJobs > 0 ? (bastApproved / completedJobs) * 100 : 0;
        const slaComplianceRate = totalJobs > 0 ? (withinSla / totalJobs) * 100 : 0;

        // Calculate breaches
        const slaBreaches = totalJobs - withinSla;
        const avgAgingDays = workTrackers.filter(t => t.aging_days).length > 0
            ? workTrackers.filter(t => t.aging_days).reduce((sum, t) => sum + Number(t.aging_days), 0) / workTrackers.filter(t => t.aging_days).length
            : 0;

        return {
            totalJobs,
            completedJobs,
            bastApproved,
            withinSla,
            slaBreaches,
            completionRate: Math.round(completionRate),
            bastApprovalRate: Math.round(bastApprovalRate),
            slaComplianceRate: Math.round(slaComplianceRate),
            avgAgingDays: Math.round(avgAgingDays),
            targetCompletionRate: SLA_CONFIG.targetCompletionRate,
            targetBastApprovalRate: SLA_CONFIG.targetBastApprovalRate,
        };
    }, [workTrackers]);

    // Regional performance
    const regionalPerformance = useMemo(() => {
        const regionals = ['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'];

        return regionals.map(regional => {
            const regionalData = workTrackers.filter(t => t.regional === regional);
            const total = regionalData.length;
            const completed = regionalData.filter(t => t.status_pekerjaan === 'Close').length;
            const withinSla = regionalData.filter(t => !t.aging_days || Number(t.aging_days) <= SLA_CONFIG.maxAgingDays).length;
            const bastApproved = regionalData.filter(t =>
                t.status_bast === 'Approve' || t.status_bast === 'BAST Approve Date'
            ).length;

            const completionRate = total > 0 ? (completed / total) * 100 : 0;
            const slaRate = total > 0 ? (withinSla / total) * 100 : 0;
            const bastRate = completed > 0 ? (bastApproved / completed) * 100 : 0;

            // Calculate overall score (weighted average)
            const score = Math.round((completionRate * 0.4) + (slaRate * 0.35) + (bastRate * 0.25));

            return {
                name: regional,
                shortName: regional.replace('Jabo Outer ', 'JO '),
                total,
                completed,
                completionRate: Math.round(completionRate),
                slaRate: Math.round(slaRate),
                bastRate: Math.round(bastRate),
                score,
            };
        }).sort((a, b) => sortBy === 'score' ? b.score - a.score : b.total - a.total);
    }, [workTrackers, sortBy]);

    // PIC Leaderboard
    const picLeaderboard = useMemo(() => {
        // Get unique PICs from work trackers
        const picStats = {};

        workTrackers.forEach(tracker => {
            // Assuming there's a pic_id or pic_name field
            const picId = tracker.pic_id || tracker.regional; // Fallback to regional if no PIC
            if (!picStats[picId]) {
                picStats[picId] = {
                    id: picId,
                    name: picData.find(p => p.id === picId)?.nama_pic || picId,
                    regional: tracker.regional,
                    total: 0,
                    completed: 0,
                    withinSla: 0,
                    bastApproved: 0,
                };
            }

            picStats[picId].total++;
            if (tracker.status_pekerjaan === 'Close') {
                picStats[picId].completed++;
            }
            if (!tracker.aging_days || Number(tracker.aging_days) <= SLA_CONFIG.maxAgingDays) {
                picStats[picId].withinSla++;
            }
            if (tracker.status_bast === 'Approve' || tracker.status_bast === 'BAST Approve Date') {
                picStats[picId].bastApproved++;
            }
        });

        return Object.values(picStats)
            .map(pic => ({
                ...pic,
                completionRate: pic.total > 0 ? Math.round((pic.completed / pic.total) * 100) : 0,
                slaRate: pic.total > 0 ? Math.round((pic.withinSla / pic.total) * 100) : 0,
                score: pic.total > 0
                    ? Math.round(((pic.completed / pic.total) * 40) + ((pic.withinSla / pic.total) * 35) + ((pic.bastApproved / Math.max(pic.completed, 1)) * 25))
                    : 0,
            }))
            .filter(pic => pic.total >= 3) // Only show PICs with at least 3 jobs
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
    }, [workTrackers, picData]);

    // Radar chart data for regional comparison
    const radarData = useMemo(() => {
        return [
            {
                metric: 'Completion',
                ...Object.fromEntries(regionalPerformance.map(r => [r.shortName, r.completionRate])),
            },
            {
                metric: 'SLA',
                ...Object.fromEntries(regionalPerformance.map(r => [r.shortName, r.slaRate])),
            },
            {
                metric: 'BAST',
                ...Object.fromEntries(regionalPerformance.map(r => [r.shortName, r.bastRate])),
            },
        ];
    }, [regionalPerformance]);

    // Get rank icon
    const getRankIcon = (rank) => {
        switch (rank) {
            case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
            case 2: return <Medal className="w-5 h-5 text-gray-400" />;
            case 3: return <Award className="w-5 h-5 text-amber-600" />;
            default: return <span className="w-5 text-center font-medium text-muted-foreground">{rank}</span>;
        }
    };

    // Get trend icon
    const getTrendIcon = (current, target) => {
        if (current >= target) return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (current >= target * 0.8) return <Minus className="w-4 h-4 text-yellow-500" />;
        return <TrendingDown className="w-4 h-4 text-red-500" />;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 className="w-6 h-6" />
                        Performance Monitoring
                    </h2>
                    <p className="text-muted-foreground">SLA tracking, scores, dan leaderboard</p>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Periode" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="week">7 Hari Terakhir</SelectItem>
                        <SelectItem value="month">30 Hari Terakhir</SelectItem>
                        <SelectItem value="quarter">3 Bulan Terakhir</SelectItem>
                        <SelectItem value="year">1 Tahun</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* SLA Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                SLA Compliance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <p className="text-3xl font-bold">{slaMetrics.slaComplianceRate}%</p>
                                {getTrendIcon(slaMetrics.slaComplianceRate, 90)}
                            </div>
                            <Progress value={slaMetrics.slaComplianceRate} className="mt-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                                {slaMetrics.withinSla} of {slaMetrics.totalJobs} within SLA
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Completion Rate
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <p className="text-3xl font-bold">{slaMetrics.completionRate}%</p>
                                {getTrendIcon(slaMetrics.completionRate, slaMetrics.targetCompletionRate)}
                            </div>
                            <Progress value={slaMetrics.completionRate} className="mt-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                                Target: {slaMetrics.targetCompletionRate}%
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Avg Processing Time
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <p className="text-3xl font-bold">{slaMetrics.avgAgingDays}</p>
                                {getTrendIcon(SLA_CONFIG.maxAgingDays - slaMetrics.avgAgingDays, 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                days (SLA: ≤{SLA_CONFIG.maxAgingDays} days)
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className={slaMetrics.slaBreaches > 0 ? 'border-red-500/50' : ''}>
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <TrendingDown className="w-4 h-4" />
                                SLA Breaches
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className={`text-3xl font-bold ${slaMetrics.slaBreaches > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {slaMetrics.slaBreaches}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                jobs exceeded SLA limit
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Regional Performance Bar Chart */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Regional Performance</CardTitle>
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="score">By Score</SelectItem>
                                        <SelectItem value="total">By Volume</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <CardDescription>Score = Completion (40%) + SLA (35%) + BAST (25%)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={regionalPerformance} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis type="number" domain={[0, 100]} />
                                        <YAxis dataKey="shortName" type="category" width={50} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="completionRate" name="Completion %" fill="#3b82f6" />
                                        <Bar dataKey="slaRate" name="SLA %" fill="#22c55e" />
                                        <Bar dataKey="bastRate" name="BAST %" fill="#f59e0b" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Radar Chart */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Regional Comparison</CardTitle>
                            <CardDescription>Multi-dimensional performance view</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="metric" />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                        {regionalPerformance.map((r, idx) => (
                                            <Radar
                                                key={r.shortName}
                                                name={r.shortName}
                                                dataKey={r.shortName}
                                                stroke={['#3b82f6', '#22c55e', '#f59e0b'][idx]}
                                                fill={['#3b82f6', '#22c55e', '#f59e0b'][idx]}
                                                fillOpacity={0.2}
                                            />
                                        ))}
                                        <Legend />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Leaderboard */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Top Performers Leaderboard
                        </CardTitle>
                        <CardDescription>Ranked by overall performance score (min. 3 jobs)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {picLeaderboard.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                                Not enough data to generate leaderboard
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {picLeaderboard.map((pic, index) => (
                                    <motion.div
                                        key={pic.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`flex items-center gap-4 p-3 rounded-lg ${index < 3 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : 'bg-muted/30'
                                            }`}
                                    >
                                        <div className="w-8 flex justify-center">
                                            {getRankIcon(index + 1)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{pic.name}</p>
                                            <p className="text-xs text-muted-foreground">{pic.regional}</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="text-center">
                                                <p className="font-semibold">{pic.total}</p>
                                                <p className="text-xs text-muted-foreground">Jobs</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-semibold text-green-600">{pic.completionRate}%</p>
                                                <p className="text-xs text-muted-foreground">Done</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-semibold text-blue-600">{pic.slaRate}%</p>
                                                <p className="text-xs text-muted-foreground">SLA</p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={`ml-2 ${pic.score >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/50' :
                                                    pic.score >= 60 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/50' :
                                                        'bg-red-500/10 text-red-600 border-red-500/50'
                                                    }`}
                                            >
                                                <Star className="w-3 h-3 mr-1" />
                                                {pic.score}
                                            </Badge>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Target vs Actual */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Card>
                    <CardHeader>
                        <CardTitle>Target vs Actual</CardTitle>
                        <CardDescription>Performance against set targets</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Completion Rate</span>
                                    <span className={slaMetrics.completionRate >= slaMetrics.targetCompletionRate ? 'text-green-500' : 'text-red-500'}>
                                        {slaMetrics.completionRate}% / {slaMetrics.targetCompletionRate}%
                                    </span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden relative">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-primary/30"
                                        style={{ width: `${slaMetrics.targetCompletionRate}%` }}
                                    />
                                    <div
                                        className={`absolute top-0 left-0 h-full ${slaMetrics.completionRate >= slaMetrics.targetCompletionRate ? 'bg-green-500' : 'bg-red-500'}`}
                                        style={{ width: `${slaMetrics.completionRate}%` }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>BAST Approval</span>
                                    <span className={slaMetrics.bastApprovalRate >= slaMetrics.targetBastApprovalRate ? 'text-green-500' : 'text-red-500'}>
                                        {slaMetrics.bastApprovalRate}% / {slaMetrics.targetBastApprovalRate}%
                                    </span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden relative">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-primary/30"
                                        style={{ width: `${slaMetrics.targetBastApprovalRate}%` }}
                                    />
                                    <div
                                        className={`absolute top-0 left-0 h-full ${slaMetrics.bastApprovalRate >= slaMetrics.targetBastApprovalRate ? 'bg-green-500' : 'bg-red-500'}`}
                                        style={{ width: `${slaMetrics.bastApprovalRate}%` }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Avg Processing Time</span>
                                    <span className={slaMetrics.avgAgingDays <= SLA_CONFIG.maxAgingDays ? 'text-green-500' : 'text-red-500'}>
                                        {slaMetrics.avgAgingDays} / {SLA_CONFIG.maxAgingDays} days
                                    </span>
                                </div>
                                <div className="h-3 bg-muted rounded-full overflow-hidden relative">
                                    <div
                                        className={`absolute top-0 left-0 h-full ${slaMetrics.avgAgingDays <= SLA_CONFIG.maxAgingDays ? 'bg-green-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min((slaMetrics.avgAgingDays / (SLA_CONFIG.maxAgingDays * 1.5)) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Outstanding Work in Progress */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                <Card className="border-orange-500/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                            <Clock className="w-5 h-5" />
                            Outstanding Work in Progress
                        </CardTitle>
                        <CardDescription>
                            Pekerjaan dengan aging &gt;90 hari atau status On Hold yang memerlukan perhatian
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const outstandingWIP = workTrackers.filter(t =>
                                // Exclude if BAST already approved
                                t.status_bast !== 'Approve' &&
                                t.status_bast !== 'BAST Approve Date' &&
                                // Include if aging >90 days OR On Hold
                                ((t.aging_days && Number(t.aging_days) > 90) || t.status_pekerjaan === 'On Hold')
                            ).sort((a, b) => Number(b.aging_days || 0) - Number(a.aging_days || 0));

                            if (outstandingWIP.length === 0) {
                                return (
                                    <p className="text-center text-muted-foreground py-8">
                                        ✅ Tidak ada pekerjaan outstanding. Semua dalam kondisi baik!
                                    </p>
                                );
                            }

                            return (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="pb-3 font-medium">Site ID</th>
                                                <th className="pb-3 font-medium">Site Name</th>
                                                <th className="pb-3 font-medium hidden md:table-cell">Pekerjaan</th>
                                                <th className="pb-3 font-medium">Regional</th>
                                                <th className="pb-3 font-medium text-center">Status</th>
                                                <th className="pb-3 font-medium text-center">Aging</th>
                                                <th className="pb-3 font-medium hidden lg:table-cell">Remark</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {outstandingWIP.slice(0, 20).map((tracker, idx) => (
                                                <tr key={tracker.id} className="hover:bg-muted/50">
                                                    <td className="py-3 font-mono text-xs">{tracker.site_id_1 || '-'}</td>
                                                    <td className="py-3 max-w-[200px] truncate">{tracker.site_name || '-'}</td>
                                                    <td className="py-3 hidden md:table-cell max-w-[150px] truncate">{tracker.main_addwork || '-'}</td>
                                                    <td className="py-3">{tracker.regional || '-'}</td>
                                                    <td className="py-3 text-center">
                                                        <Badge variant={tracker.status_pekerjaan === 'On Hold' ? 'secondary' : 'outline'}
                                                            className={tracker.status_pekerjaan === 'On Hold' ? 'bg-yellow-500/20 text-yellow-600' : ''}>
                                                            {tracker.status_pekerjaan}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <span className={`font-semibold ${Number(tracker.aging_days) > 90 ? 'text-red-500' : ''}`}>
                                                            {tracker.aging_days || 0} hari
                                                        </span>
                                                    </td>
                                                    <td className="py-3 hidden lg:table-cell max-w-[200px] truncate text-muted-foreground">
                                                        {tracker.remark || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {outstandingWIP.length > 20 && (
                                        <p className="text-center text-sm text-muted-foreground mt-4">
                                            Menampilkan 20 dari {outstandingWIP.length} item
                                        </p>
                                    )}
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default PerformanceMonitoring;
