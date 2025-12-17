import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Briefcase, Clock, AlertTriangle, FileCheck, TrendingUp,
    Users, PauseCircle, CheckCircle2, Timer, Target, Car, Camera, Wifi
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Summary = ({ workTrackers = [], picData = [], carData = [], cctvData = [] }) => {
    const stats = useMemo(() => {
        const total = workTrackers.length;
        const open = workTrackers.filter(t => t.status_pekerjaan === 'Open').length;
        const onHold = workTrackers.filter(t => t.status_pekerjaan === 'On Hold').length;
        const close = workTrackers.filter(t => t.status_pekerjaan === 'Close').length;

        // BAST stats
        const bastApproved = workTrackers.filter(t =>
            t.status_bast === 'Approve' || t.status_bast === 'BAST Approve Date'
        ).length;
        const bastWaiting = workTrackers.filter(t => t.status_bast === 'Waiting Approve').length;
        const bastNeedCreate = workTrackers.filter(t =>
            t.status_pekerjaan === 'Close' &&
            !t.status_bast &&
            !t.date_submit &&
            !t.date_approve
        ).length;

        // Outstanding
        const outstandingWIP = workTrackers.filter(t =>
            (t.status_bast !== 'Approve' && t.status_bast !== 'BAST Approve Date') &&
            ((t.aging_days && Number(t.aging_days) > 90) || t.status_pekerjaan === 'On Hold')
        ).length;

        const outstandingBAST = workTrackers.filter(t =>
            t.status_bast === 'Waiting Approve' && t.aging_days && Number(t.aging_days) > 14
        ).length;

        // Completion rate
        const completionRate = total > 0 ? Math.round((close / total) * 100) : 0;

        // Active PIC
        const activePIC = picData.filter(p => p.validasi === 'Aktif' || p.validasi === 'Active').length;

        // Car stats
        const totalCars = carData.length;
        const activeCars = carData.filter(c => c.status === 'Aktif' || c.status === 'Active').length;

        // CCTV stats
        const totalCCTV = cctvData.length;
        const cctvOnline = cctvData.filter(c => c.status === 'Online' || c.status === 'online').length;

        return {
            total, open, onHold, close,
            bastApproved, bastWaiting, bastNeedCreate,
            outstandingWIP, outstandingBAST,
            completionRate, activePIC,
            totalCars, activeCars, totalCCTV, cctvOnline
        };
    }, [workTrackers, picData, carData, cctvData]);

    const cards = [
        {
            title: 'Total Pekerjaan',
            value: stats.total,
            icon: Briefcase,
            color: 'text-blue-600',
            bg: 'bg-blue-500/10'
        },
        {
            title: 'Open',
            value: stats.open,
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-500/10'
        },
        {
            title: 'On Hold',
            value: stats.onHold,
            icon: PauseCircle,
            color: 'text-yellow-600',
            bg: 'bg-yellow-500/10',
            alert: stats.onHold > 0
        },
        {
            title: 'Close',
            value: stats.close,
            subtitle: `${stats.completionRate}%`,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-500/10'
        },
        {
            title: 'BAST Approved',
            value: stats.bastApproved,
            icon: FileCheck,
            color: 'text-purple-600',
            bg: 'bg-purple-500/10'
        },
        {
            title: 'BAST Waiting',
            value: stats.bastWaiting,
            subtitle: 'Approve',
            icon: Timer,
            color: 'text-amber-600',
            bg: 'bg-amber-500/10',
            alert: stats.bastWaiting > 5
        },
        {
            title: 'Need BAST',
            value: stats.bastNeedCreate,
            subtitle: 'Create',
            icon: FileCheck,
            color: 'text-orange-600',
            bg: 'bg-orange-500/10',
            alert: stats.bastNeedCreate > 0
        },
        {
            title: 'Outstanding WIP',
            value: stats.outstandingWIP,
            subtitle: '>90 hari',
            icon: AlertTriangle,
            color: 'text-red-600',
            bg: 'bg-red-500/10',
            alert: stats.outstandingWIP > 0
        },
        {
            title: 'Outstanding BAST',
            value: stats.outstandingBAST,
            subtitle: '>14 hari',
            icon: Clock,
            color: 'text-red-600',
            bg: 'bg-red-500/10',
            alert: stats.outstandingBAST > 0
        },
        {
            title: 'PIC Aktif',
            value: stats.activePIC,
            subtitle: 'orang',
            icon: Users,
            color: 'text-teal-600',
            bg: 'bg-teal-500/10'
        },
        {
            title: 'Data Mobil',
            value: stats.totalCars,
            subtitle: 'unit',
            icon: Car,
            color: 'text-sky-600',
            bg: 'bg-sky-500/10'
        },
        {
            title: 'CCTV Online',
            value: stats.cctvOnline,
            subtitle: `/${stats.totalCCTV}`,
            icon: Wifi,
            color: 'text-cyan-600',
            bg: 'bg-cyan-500/10'
        },
    ];

    return (
        <Card className="border-2 border-primary/20">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                    <span>📊 Summary</span>
                    <span className="text-sm font-normal text-muted-foreground">
                        {new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {cards.map((card, idx) => (
                        <motion.div
                            key={card.title}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`relative p-2 rounded-lg ${card.bg} ${card.alert ? 'ring-2 ring-red-500/50' : ''}`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[10px] text-muted-foreground leading-tight">{card.title}</p>
                                    <p className={`text-xl font-bold ${card.color}`}>
                                        {card.value}
                                        {card.subtitle && (
                                            <span className="text-[10px] font-normal opacity-70">{card.subtitle}</span>
                                        )}
                                    </p>
                                </div>
                                <card.icon className={`w-3 h-3 ${card.color} opacity-50`} />
                            </div>
                            {card.alert && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default Summary;
