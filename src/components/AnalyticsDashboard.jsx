import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getYear, subYears, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
    TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle,
    Calendar, Target, Activity, Percent, BarChart3, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const REGIONAL_COLORS = {
    'Jabo Outer 1': '#3b82f6',
    'Jabo Outer 2': '#22c55e',
    'Jabo Outer 3': '#f59e0b',
    'Jabo Outer': '#8b5cf6',
};

const AnalyticsDashboard = ({ workTrackers = [], picData = [], carData = [], cctvData = [] }) => {
    const [timeRange, setTimeRange] = React.useState('month');
    const [selectedYear, setSelectedYear] = React.useState(getYear(new Date()));

    // Available years for selection (current year and up to 3 previous years)
    const availableYears = useMemo(() => {
        const currentYear = getYear(new Date());
        return [currentYear, currentYear - 1, currentYear - 2];
    }, []);

    // Year-over-Year comparison data
    const yoyData = useMemo(() => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const currentYear = selectedYear;
        const previousYear = selectedYear - 1;

        return monthNames.map((month, monthIndex) => {
            // Current year data
            const currentYearStart = new Date(currentYear, monthIndex, 1);
            const currentYearEnd = new Date(currentYear, monthIndex + 1, 0);

            const currentCreated = workTrackers.filter(t => {
                if (!t.created_at) return false;
                try {
                    const date = parseISO(t.created_at);
                    return isWithinInterval(date, { start: currentYearStart, end: currentYearEnd });
                } catch { return false; }
            }).length;

            const currentCompleted = workTrackers.filter(t => {
                if (!t.bast_approve_date) return false;
                try {
                    const date = parseISO(t.bast_approve_date);
                    return isWithinInterval(date, { start: currentYearStart, end: currentYearEnd });
                } catch { return false; }
            }).length;

            // Previous year data
            const prevYearStart = new Date(previousYear, monthIndex, 1);
            const prevYearEnd = new Date(previousYear, monthIndex + 1, 0);

            const prevCreated = workTrackers.filter(t => {
                if (!t.created_at) return false;
                try {
                    const date = parseISO(t.created_at);
                    return isWithinInterval(date, { start: prevYearStart, end: prevYearEnd });
                } catch { return false; }
            }).length;

            const prevCompleted = workTrackers.filter(t => {
                if (!t.bast_approve_date) return false;
                try {
                    const date = parseISO(t.bast_approve_date);
                    return isWithinInterval(date, { start: prevYearStart, end: prevYearEnd });
                } catch { return false; }
            }).length;

            // Calculate growth percentages
            const createdGrowth = prevCreated > 0
                ? Math.round(((currentCreated - prevCreated) / prevCreated) * 100)
                : currentCreated > 0 ? 100 : 0;
            const completedGrowth = prevCompleted > 0
                ? Math.round(((currentCompleted - prevCompleted) / prevCompleted) * 100)
                : currentCompleted > 0 ? 100 : 0;

            return {
                month,
                [`${currentYear}`]: currentCreated,
                [`${previousYear}`]: prevCreated,
                currentCompleted,
                prevCompleted,
                createdGrowth,
                completedGrowth,
            };
        });
    }, [workTrackers, selectedYear]);

    // YoY summary
    const yoySummary = useMemo(() => {
        const currentYear = selectedYear;
        const previousYear = selectedYear - 1;

        const totalCurrent = yoyData.reduce((sum, d) => sum + (d[`${currentYear}`] || 0), 0);
        const totalPrevious = yoyData.reduce((sum, d) => sum + (d[`${previousYear}`] || 0), 0);
        const totalCurrentCompleted = yoyData.reduce((sum, d) => sum + d.currentCompleted, 0);
        const totalPrevCompleted = yoyData.reduce((sum, d) => sum + d.prevCompleted, 0);

        const createdGrowth = totalPrevious > 0
            ? Math.round(((totalCurrent - totalPrevious) / totalPrevious) * 100)
            : 0;
        const completedGrowth = totalPrevCompleted > 0
            ? Math.round(((totalCurrentCompleted - totalPrevCompleted) / totalPrevCompleted) * 100)
            : 0;

        return {
            currentYear,
            previousYear,
            totalCurrent,
            totalPrevious,
            totalCurrentCompleted,
            totalPrevCompleted,
            createdGrowth,
            completedGrowth,
        };
    }, [yoyData, selectedYear]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totalJobs = workTrackers.length;
        const completedJobs = workTrackers.filter(t => t.status_pekerjaan === 'Close').length;
        const openJobs = workTrackers.filter(t => t.status_pekerjaan === 'Open').length;
        const onHoldJobs = workTrackers.filter(t => t.status_pekerjaan === 'On Hold').length;

        // Calculate average aging days for completed jobs with aging data
        const jobsWithAging = workTrackers.filter(t => t.aging_days !== null && t.aging_days !== undefined && t.aging_days !== '');
        const avgAgingDays = jobsWithAging.length > 0
            ? Math.round(jobsWithAging.reduce((sum, t) => sum + Number(t.aging_days), 0) / jobsWithAging.length)
            : 0;

        // Completion rate
        const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

        // BAST metrics
        const bastApproved = workTrackers.filter(t => t.status_bast === 'Approve' || t.status_bast === 'BAST Approve Date').length;
        const bastWaiting = workTrackers.filter(t => t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST').length;
        const bastNeedCreated = workTrackers.filter(t =>
            t.status_pekerjaan === 'Close' && !t.bast_submit_date
        ).length;

        // BAST approval rate
        const bastApprovalRate = completedJobs > 0 ? Math.round((bastApproved / completedJobs) * 100) : 0;

        return {
            totalJobs,
            completedJobs,
            openJobs,
            onHoldJobs,
            avgAgingDays,
            completionRate,
            bastApproved,
            bastWaiting,
            bastNeedCreated,
            bastApprovalRate,
        };
    }, [workTrackers]);

    // Monthly trend data
    const monthlyTrendData = useMemo(() => {
        const months = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const created = workTrackers.filter(t => {
                const createdAt = new Date(t.created_at);
                return createdAt >= monthStart && createdAt <= monthEnd;
            }).length;

            const completed = workTrackers.filter(t => {
                if (!t.bast_approve_date) return false;
                const approveDate = new Date(t.bast_approve_date);
                return approveDate >= monthStart && approveDate <= monthEnd;
            }).length;

            months.push({
                name: monthName,
                created,
                completed,
            });
        }

        return months;
    }, [workTrackers]);

    // Regional comparison data
    const regionalData = useMemo(() => {
        const regionals = ['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'];

        return regionals.map(regional => {
            const regionalTrackers = workTrackers.filter(t => t.regional === regional);
            const total = regionalTrackers.length;
            const completed = regionalTrackers.filter(t => t.status_pekerjaan === 'Close').length;
            const open = regionalTrackers.filter(t => t.status_pekerjaan === 'Open').length;
            const onHold = regionalTrackers.filter(t => t.status_pekerjaan === 'On Hold').length;
            const avgAging = regionalTrackers.filter(t => t.aging_days).length > 0
                ? Math.round(regionalTrackers.filter(t => t.aging_days).reduce((sum, t) => sum + Number(t.aging_days), 0) / regionalTrackers.filter(t => t.aging_days).length)
                : 0;

            return {
                name: regional.replace('Jabo Outer ', 'JO '),
                fullName: regional,
                total,
                completed,
                open,
                onHold,
                avgAging,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            };
        });
    }, [workTrackers]);

    // Status distribution for pie chart
    const statusDistribution = useMemo(() => {
        return [
            { name: 'Completed', value: kpis.completedJobs, color: '#22c55e' },
            { name: 'Open', value: kpis.openJobs, color: '#3b82f6' },
            { name: 'On Hold', value: kpis.onHoldJobs, color: '#f59e0b' },
        ].filter(item => item.value > 0);
    }, [kpis]);

    // Suspected distribution
    const suspectedDistribution = useMemo(() => {
        const suspectedCounts = {};
        workTrackers.forEach(t => {
            const suspected = t.suspected || 'Unknown';
            suspectedCounts[suspected] = (suspectedCounts[suspected] || 0) + 1;
        });

        return Object.entries(suspectedCounts).map(([name, value], idx) => ({
            name,
            value,
            color: COLORS[idx % COLORS.length],
        }));
    }, [workTrackers]);

    // Weekly summary
    const weeklySummary = useMemo(() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const thisWeekCreated = workTrackers.filter(t => new Date(t.created_at) >= oneWeekAgo).length;
        const lastWeekCreated = workTrackers.filter(t => {
            const date = new Date(t.created_at);
            return date >= twoWeeksAgo && date < oneWeekAgo;
        }).length;

        const thisWeekCompleted = workTrackers.filter(t => {
            if (!t.bast_approve_date) return false;
            return new Date(t.bast_approve_date) >= oneWeekAgo;
        }).length;

        const trend = lastWeekCreated > 0
            ? Math.round(((thisWeekCreated - lastWeekCreated) / lastWeekCreated) * 100)
            : 0;

        return {
            thisWeekCreated,
            lastWeekCreated,
            thisWeekCompleted,
            trend,
        };
    }, [workTrackers]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
                    <p className="text-muted-foreground">Overview performa dan statistik pekerjaan</p>
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

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Total Pekerjaan
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{kpis.totalJobs}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {weeklySummary.thisWeekCreated} minggu ini
                                {weeklySummary.trend !== 0 && (
                                    <span className={weeklySummary.trend > 0 ? 'text-green-500' : 'text-red-500'}>
                                        {' '}({weeklySummary.trend > 0 ? '+' : ''}{weeklySummary.trend}%)
                                    </span>
                                )}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Percent className="w-4 h-4" />
                                Completion Rate
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{kpis.completionRate}%</p>
                            <p className="text-xs text-muted-foreground mt-1">{kpis.completedJobs} dari {kpis.totalJobs} selesai</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Avg Aging Days
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{kpis.avgAgingDays}</p>
                            <p className="text-xs text-muted-foreground mt-1">hari rata-rata proses BAST</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                BAST Approval Rate
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{kpis.bastApprovalRate}%</p>
                            <p className="text-xs text-muted-foreground mt-1">{kpis.bastApproved} approved</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
                        <CardHeader className="pb-2">
                            <CardDescription className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Pending Actions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{kpis.bastWaiting + kpis.bastNeedCreated}</p>
                            <p className="text-xs text-muted-foreground mt-1">{kpis.bastWaiting} waiting, {kpis.bastNeedCreated} need BAST</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend Chart */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Tren Pekerjaan Bulanan
                            </CardTitle>
                            <CardDescription>Perbandingan pekerjaan dibuat vs selesai</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={monthlyTrendData}>
                                        <defs>
                                            <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="name" className="text-xs" />
                                        <YAxis className="text-xs" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="created" name="Dibuat" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCreated)" />
                                        <Area type="monotone" dataKey="completed" name="Selesai" stroke="#22c55e" fillOpacity={1} fill="url(#colorCompleted)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Regional Comparison */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Perbandingan Regional
                            </CardTitle>
                            <CardDescription>Status pekerjaan per regional</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={regionalData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis type="number" className="text-xs" />
                                        <YAxis dataKey="name" type="category" width={50} className="text-xs" />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Legend />
                                        <Bar dataKey="completed" name="Selesai" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="open" name="Open" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="onHold" name="On Hold" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Year-over-Year Comparison Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                <Card className="border-indigo-500/30">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                    Year-over-Year Comparison
                                </CardTitle>
                                <CardDescription>Perbandingan performa {yoySummary.currentYear} vs {yoySummary.previousYear}</CardDescription>
                            </div>
                            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(year => (
                                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* YoY Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-xs text-muted-foreground">Dibuat {yoySummary.currentYear}</p>
                                <p className="text-2xl font-bold text-blue-600">{yoySummary.totalCurrent}</p>
                                <div className="flex items-center gap-1 text-xs mt-1">
                                    {yoySummary.createdGrowth >= 0 ? (
                                        <ArrowUpRight className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <ArrowDownRight className="w-3 h-3 text-red-500" />
                                    )}
                                    <span className={yoySummary.createdGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {yoySummary.createdGrowth > 0 ? '+' : ''}{yoySummary.createdGrowth}%
                                    </span>
                                    <span className="text-muted-foreground">vs {yoySummary.previousYear}</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/20">
                                <p className="text-xs text-muted-foreground">Dibuat {yoySummary.previousYear}</p>
                                <p className="text-2xl font-bold text-gray-600">{yoySummary.totalPrevious}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                <p className="text-xs text-muted-foreground">Selesai {yoySummary.currentYear}</p>
                                <p className="text-2xl font-bold text-green-600">{yoySummary.totalCurrentCompleted}</p>
                                <div className="flex items-center gap-1 text-xs mt-1">
                                    {yoySummary.completedGrowth >= 0 ? (
                                        <ArrowUpRight className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <ArrowDownRight className="w-3 h-3 text-red-500" />
                                    )}
                                    <span className={yoySummary.completedGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        {yoySummary.completedGrowth > 0 ? '+' : ''}{yoySummary.completedGrowth}%
                                    </span>
                                    <span className="text-muted-foreground">vs {yoySummary.previousYear}</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/20">
                                <p className="text-xs text-muted-foreground">Selesai {yoySummary.previousYear}</p>
                                <p className="text-2xl font-bold text-gray-600">{yoySummary.totalPrevCompleted}</p>
                            </div>
                        </div>

                        {/* YoY Line Chart */}
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={yoyData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="month" className="text-xs" />
                                    <YAxis className="text-xs" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px'
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey={`${selectedYear}`}
                                        name={`${selectedYear}`}
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey={`${selectedYear - 1}`}
                                        name={`${selectedYear - 1}`}
                                        stroke="#94a3b8"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={{ fill: '#94a3b8', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Monthly Breakdown Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="py-2 text-left font-medium">Bulan</th>
                                        <th className="py-2 text-center font-medium">{selectedYear}</th>
                                        <th className="py-2 text-center font-medium">{selectedYear - 1}</th>
                                        <th className="py-2 text-center font-medium">Growth</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {yoyData.slice(0, new Date().getMonth() + 1).map((row) => (
                                        <tr key={row.month} className="border-b hover:bg-muted/50">
                                            <td className="py-2 font-medium">{row.month}</td>
                                            <td className="py-2 text-center text-blue-600 font-semibold">{row[`${selectedYear}`]}</td>
                                            <td className="py-2 text-center text-gray-500">{row[`${selectedYear - 1}`]}</td>
                                            <td className="py-2 text-center">
                                                <Badge
                                                    variant="outline"
                                                    className={row.createdGrowth >= 0
                                                        ? 'bg-green-500/10 text-green-600 border-green-500/50'
                                                        : 'bg-red-500/10 text-red-600 border-red-500/50'
                                                    }
                                                >
                                                    {row.createdGrowth > 0 ? '+' : ''}{row.createdGrowth}%
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Status Distribution Pie */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribusi Status</CardTitle>
                            <CardDescription>Status pekerjaan keseluruhan</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statusDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {statusDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Suspected Distribution Pie */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribusi Suspected</CardTitle>
                            <CardDescription>Kategori pekerjaan</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={suspectedDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {suspectedDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Regional Performance Table */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Performa Regional</CardTitle>
                            <CardDescription>Statistik per regional</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {regionalData.map((region, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium">{region.fullName}</span>
                                            <span className="text-sm text-muted-foreground">{region.completionRate}%</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                                                style={{ width: `${region.completionRate}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Avg Aging: {region.avgAging} hari</span>
                                            <span>Total: {region.total}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Data PIC</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total PIC</span>
                                    <span className="font-semibold">{picData.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Active</span>
                                    <span className="font-semibold text-green-600">{picData.filter(p => p.validasi === 'Active').length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Inactive</span>
                                    <span className="font-semibold text-red-600">{picData.filter(p => p.validasi !== 'Active').length}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Data Mobil</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Mobil</span>
                                    <span className="font-semibold">{carData.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Good Condition</span>
                                    <span className="font-semibold text-green-600">{carData.filter(c => c.condition === 'GOOD').length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Need Service</span>
                                    <span className="font-semibold text-red-600">{carData.filter(c => c.condition === 'NEED SERVICE').length}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Data CCTV</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total CCTV</span>
                                    <span className="font-semibold">{cctvData.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Online</span>
                                    <span className="font-semibold text-green-600">{cctvData.filter(c => c.status === 'online').length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Offline/Broken</span>
                                    <span className="font-semibold text-red-600">{cctvData.filter(c => c.status !== 'online').length}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
