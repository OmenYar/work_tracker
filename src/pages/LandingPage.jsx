import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Briefcase, Clock, CheckCircle, PlayCircle, PauseCircle, XCircle } from 'lucide-react';
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
    const [search, setSearch] = useState('');
    const [regionalFilter, setRegionalFilter] = useState('all');
    const [bastFilter, setBastFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const navigate = useNavigate();

    // Fetch all work trackers
    useEffect(() => {
        const fetchData = async () => {
            const { data: result, error } = await supabase
                .from('work_trackers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching data:', error);
            } else if (result) {
                setData(result);
                setFilteredData(result);
            }
        };
        fetchData();
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
        total: data.length,
        waiting: data.filter(t => t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST').length,
        approved: data.filter(t => t.status_bast === 'Approve' || t.status_bast === 'BAST Approve Date').length,
        open: data.filter(t => t.status_pekerjaan === 'Open').length,
        onHold: data.filter(t => t.status_pekerjaan === 'On Hold').length,
        close: data.filter(t => t.status_pekerjaan === 'Close').length,
    };

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
                                    <p className="text-xs text-muted-foreground uppercase font-bold">Total Job</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                                <Briefcase className="w-8 h-8 text-muted-foreground opacity-50" />
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
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-yellow-600">Waiting Approve BAST</p>
                                    <p className="text-2xl font-bold">{stats.waiting}</p>
                                </div>
                                <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
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
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-green-600">Approve BAST</p>
                                    <p className="text-2xl font-bold">{stats.approved}</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
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
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-blue-600">Open</p>
                                    <p className="text-2xl font-bold">{stats.open}</p>
                                </div>
                                <PlayCircle className="w-8 h-8 text-blue-600 opacity-50" />
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
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-orange-600">On Hold</p>
                                    <p className="text-2xl font-bold">{stats.onHold}</p>
                                </div>
                                <PauseCircle className="w-8 h-8 text-orange-600 opacity-50" />
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
                                    <p className="text-xs text-muted-foreground uppercase font-bold text-gray-600">Close</p>
                                    <p className="text-2xl font-bold">{stats.close}</p>
                                </div>
                                <XCircle className="w-8 h-8 text-gray-600 opacity-50" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Filters */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="bg-card border rounded-xl p-4 shadow-sm"
                    >
                        <div className="flex flex-wrap gap-3">
                            <Input
                                placeholder="Search by Site ID or Site Name..."
                                className="w-full md:w-64"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <Select value={regionalFilter} onValueChange={setRegionalFilter}>
                                <SelectTrigger className="w-full md:w-[150px]">
                                    <SelectValue placeholder="Regional" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Regional</SelectItem>
                                    <SelectItem value="Jabo Outer 1">Jabo Outer 1</SelectItem>
                                    <SelectItem value="Jabo Outer 2">Jabo Outer 2</SelectItem>
                                    <SelectItem value="Jabo Outer 3">Jabo Outer 3</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={bastFilter} onValueChange={setBastFilter}>
                                <SelectTrigger className="w-full md:w-[150px]">
                                    <SelectValue placeholder="Status BAST" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status BAST</SelectItem>
                                    <SelectItem value="Waiting Approve">Waiting</SelectItem>
                                    <SelectItem value="Approve">Approved</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[150px]">
                                    <SelectValue placeholder="Status Job" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status Job</SelectItem>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="On Hold">On Hold</SelectItem>
                                    <SelectItem value="Close">Close</SelectItem>
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
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                    </motion.div>

                    {/* Data Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="bg-card border rounded-xl shadow-sm overflow-hidden"
                    >
                        <WorkTrackerTable
                            data={filteredData}
                            isReadOnly={true}
                        />
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