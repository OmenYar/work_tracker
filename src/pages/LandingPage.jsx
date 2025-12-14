import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Briefcase, Clock, CheckCircle, PlayCircle, PauseCircle, XCircle, Users as UsersIcon, Truck, Camera } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/lib/customSupabaseClient';
import WorkTrackerTable from '@/components/WorkTrackerTable';

const LandingPage = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [picData, setPicData] = useState([]);
    const [cctvData, setCctvData] = useState([]);
    const [carData, setCarData] = useState([]);
    const [search, setSearch] = useState('');
    const [regionalFilter, setRegionalFilter] = useState('all');
    const [bastFilter, setBastFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const navigate = useNavigate();

    // Fetch all data
    useEffect(() => {
        const fetchAllData = async () => {
            // Fetch work trackers
            const { data: trackers, error: trackersError } = await supabase
                .from('work_trackers')
                .select('*')
                .order('created_at', { ascending: false });

            if (!trackersError && trackers) {
                setData(trackers);
                setFilteredData(trackers);
            }

            // Fetch PIC data
            const { data: pics, error: picsError } = await supabase
                .from('pic_data')
                .select('*');

            if (!picsError && pics) {
                setPicData(pics);
            }

            // Fetch CCTV data
            const { data: cctvs, error: cctvsError } = await supabase
                .from('cctv_data')
                .select('*');

            if (!cctvsError && cctvs) {
                setCctvData(cctvs);
            }

            // Fetch Car data
            const { data: cars, error: carsError } = await supabase
                .from('car_data')
                .select('*');

            if (!carsError && cars) {
                setCarData(cars);
            }
        };
        fetchAllData();
    }, []);

    // Apply filters
    useEffect(() => {
        let result = data;

        if (search) {
            const lower = search.toLowerCase();
            result = result.filter(item =>
                item.site_name?.toLowerCase().includes(lower) ||
                item.site_id_1?.toLowerCase().includes(lower)
            );
        }

        if (regionalFilter !== 'all') {
            result = result.filter(item => item.regional === regionalFilter);
        }

        if (bastFilter !== 'all') {
            if (bastFilter === 'Waiting Approve') {
                result = result.filter(item =>
                    item.status_bast === 'Waiting Approve' ||
                    item.status_bast === 'Waiting Approve BAST'
                );
            } else if (bastFilter === 'Approve') {
                result = result.filter(item =>
                    item.status_bast === 'Approve' ||
                    item.status_bast === 'BAST Approve Date'
                );
            }
        }

        if (statusFilter !== 'all') {
            result = result.filter(item => item.status_pekerjaan === statusFilter);
        }

        setFilteredData(result);
    }, [search, regionalFilter, bastFilter, statusFilter, data]);

    // Calculate stats
    const stats = {
        waiting: data.filter(t => t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST').length,
        open: data.filter(t => t.status_pekerjaan === 'Open').length,
        onHold: data.filter(t => t.status_pekerjaan === 'On Hold').length,
        activePic: picData.filter(p => p.validasi === 'Active').length,
        totalCar: carData.length,
        activeCctv: cctvData.filter(c => c.status === 'online').length,
    };

    // Chart colors
    const CHART_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b'];
    const CCTV_COLORS = {
        online: '#22c55e',
        offline: '#eab308',
        broken: '#ef4444',
        stolen: '#a855f7'
    };

    // Data for PIC per Regional chart
    const picPerRegionalData = [
        { name: 'Jabo Outer 1', value: picData.filter(p => p.validasi === 'Active' && p.regional === 'Jabo Outer 1').length, fill: CHART_COLORS[0] },
        { name: 'Jabo Outer 2', value: picData.filter(p => p.validasi === 'Active' && p.regional === 'Jabo Outer 2').length, fill: CHART_COLORS[1] },
        { name: 'Jabo Outer 3', value: picData.filter(p => p.validasi === 'Active' && p.regional === 'Jabo Outer 3').length, fill: CHART_COLORS[2] },
    ];

    // Data for CCTV Status chart
    const cctvStatusData = [
        { name: 'Online', value: cctvData.filter(c => c.status === 'online').length, fill: CCTV_COLORS.online },
        { name: 'Offline', value: cctvData.filter(c => c.status === 'offline').length, fill: CCTV_COLORS.offline },
        { name: 'Broken', value: cctvData.filter(c => c.status === 'broken').length, fill: CCTV_COLORS.broken },
        { name: 'Stolen', value: cctvData.filter(c => c.status === 'stolen').length, fill: CCTV_COLORS.stolen },
    ];

    return (
        <>
            <Helmet>
                <title>Work Tracker | Public Dashboard</title>
            </Helmet>

            <div className="min-h-screen bg-background text-foreground">
                {/* Navbar */}
                <nav className="border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
                    <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                        <div className="flex items-center gap-2 font-bold text-xl">
                            <div className="bg-primary text-primary-foreground w-8 h-8 rounded flex items-center justify-center">
                                W
                            </div>
                            Work Tracker
                        </div>
                        <div className="flex gap-2">
                            <ThemeToggle />
                            <Button onClick={() => navigate('/login')}>Login</Button>
                        </div>
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold">Work Tracker Data</h1>
                        <p className="text-muted-foreground">
                            Public view - Tracking <span className="font-bold text-primary">{filteredData.length}</span> of {data.length} jobs
                        </p>
                    </div>

                    {/* Count Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-card border rounded-xl p-4 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-yellow-600">Waiting Approve BAST</p>
                                    <p className="text-2xl font-bold">{stats.waiting}</p>
                                </div>
                                <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-card border rounded-xl p-4 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-blue-600">Open</p>
                                    <p className="text-2xl font-bold">{stats.open}</p>
                                </div>
                                <PlayCircle className="w-8 h-8 text-blue-600 opacity-50" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-card border rounded-xl p-4 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-orange-600">On Hold</p>
                                    <p className="text-2xl font-bold">{stats.onHold}</p>
                                </div>
                                <PauseCircle className="w-8 h-8 text-orange-600 opacity-50" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-card border rounded-xl p-4 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-purple-600">PIC Aktif</p>
                                    <p className="text-2xl font-bold">{stats.activePic}</p>
                                </div>
                                <UsersIcon className="w-8 h-8 text-purple-600 opacity-50" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-card border rounded-xl p-4 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-teal-600">Data Mobil</p>
                                    <p className="text-2xl font-bold">{stats.totalCar}</p>
                                </div>
                                <Truck className="w-8 h-8 text-teal-600 opacity-50" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-card border rounded-xl p-4 shadow-sm"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-green-600">CCTV Online</p>
                                    <p className="text-2xl font-bold">{stats.activeCctv}</p>
                                </div>
                                <Camera className="w-8 h-8 text-green-600 opacity-50" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Charts Section - PIC per Regional and CCTV Status */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* PIC Aktif per Regional - Donut Chart */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="bg-card border rounded-xl p-6 shadow-sm"
                        >
                            <h3 className="text-lg font-semibold mb-4">PIC Aktif per Regional</h3>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={picPerRegionalData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={3}
                                            dataKey="value"
                                            label={({ name, value }) => `${value}`}
                                            labelLine={false}
                                        >
                                            {picPerRegionalData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-6 mt-2">
                                {picPerRegionalData.map((item, idx) => (
                                    <div key={idx} className="text-center">
                                        <p className="text-2xl font-bold" style={{ color: item.fill }}>{item.value}</p>
                                        <p className="text-xs text-muted-foreground">{item.name}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* CCTV Status - Bar Chart */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="bg-card border rounded-xl p-6 shadow-sm"
                        >
                            <h3 className="text-lg font-semibold mb-4">Status CCTV</h3>
                            <div className="h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={cctvStatusData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                        <XAxis type="number" />
                                        <YAxis type="category" dataKey="name" width={70} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px'
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {cctvStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 mt-2 flex-wrap">
                                {cctvStatusData.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                                        <span className="text-sm">{item.name}: <span className="font-bold">{item.value}</span></span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Filters */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="rounded-xl border bg-card shadow"
                    >
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-lg font-semibold">
                                Data Trackers <span className="text-sm font-normal text-muted-foreground ml-2">({filteredData.length} records)</span>
                            </h3>
                        </div>

                        {/* Filters - Same style as Admin Dashboard */}
                        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-card p-4 border-b">
                            <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto flex-1 flex-wrap">
                                <Input
                                    placeholder="Search Site ID or Name..."
                                    className="w-full md:w-48 lg:w-64"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <Select value={regionalFilter} onValueChange={setRegionalFilter}>
                                    <SelectTrigger className="w-full md:w-[150px]">
                                        <SelectValue placeholder="Regional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Regionals</SelectItem>
                                        <SelectItem value="Jabo Outer 1">Jabo Outer 1</SelectItem>
                                        <SelectItem value="Jabo Outer 2">Jabo Outer 2</SelectItem>
                                        <SelectItem value="Jabo Outer 3">Jabo Outer 3</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full md:w-[150px]">
                                        <SelectValue placeholder="Status Work" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="Open">Open</SelectItem>
                                        <SelectItem value="On Hold">On Hold</SelectItem>
                                        <SelectItem value="Close">Close</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={bastFilter} onValueChange={setBastFilter}>
                                    <SelectTrigger className="w-full md:w-[150px]">
                                        <SelectValue placeholder="Status BAST" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All BAST Status</SelectItem>
                                        <SelectItem value="Waiting Approve">Waiting Approve</SelectItem>
                                        <SelectItem value="Approve">Approve</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(search || regionalFilter !== 'all' || bastFilter !== 'all' || statusFilter !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setSearch('');
                                            setRegionalFilter('all');
                                            setBastFilter('all');
                                            setStatusFilter('all');
                                        }}
                                        className="px-3"
                                        title="Reset Filters"
                                    >
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Data Table */}
                        <div className="p-6">
                            <WorkTrackerTable
                                data={filteredData}
                                isReadOnly={true}
                            />
                        </div>
                    </motion.div>
                </main>

                {/* Footer */}
                <footer className="border-t mt-12 py-6">
                    <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
                        <p>© 2025 Work Tracker. Public Dashboard - Read Only Access</p>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default LandingPage;