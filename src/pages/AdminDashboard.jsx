import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, Activity, AlertCircle, CheckCircle, Clock, Truck, Users as UsersIcon, Download, Briefcase, PlayCircle, PauseCircle, XCircle, Camera, Wifi, WifiOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { exportToCSV } from '@/lib/exportUtils';

// Components
import WorkTrackerTable from '@/components/WorkTrackerTable';
import UserManagement from '@/components/UserManagement';
import PicDataTable from '@/components/PicDataTable';
import CarDataTable from '@/components/CarDataTable';
import CCTVDataTable from '@/components/CCTVDataTable';
import StickyNotes from '@/components/StickyNotes';
import { ThemeToggle } from '@/components/ThemeToggle';

const AdminDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'dashboard';

    // const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Removed Sidebar state
    const [workTrackers, setWorkTrackers] = useState([]);
    const [filteredTrackers, setFilteredTrackers] = useState([]);
    const [picData, setPicData] = useState([]);
    const [filteredPicData, setFilteredPicData] = useState([]); // New state for filtered PIC
    const [carData, setCarData] = useState([]); // Car Data
    const [editingTracker, setEditingTracker] = useState(null);
    const [editingPic, setEditingPic] = useState(null);
    const [editingCar, setEditingCar] = useState(null); // Editing Car
    const [isFormOpen, setIsFormOpen] = useState(false); // Controls Dialog now
    const [isPicFormOpen, setIsPicFormOpen] = useState(false); // New state
    const [isCarFormOpen, setIsCarFormOpen] = useState(false); // Car Dialog

    // Tracker Filters - Initialize from URL params
    const [searchTerm, setSearchTerm] = useState(searchParams.get('trackerSearch') || '');
    const [regionalFilter, setRegionalFilter] = useState(searchParams.get('trackerRegional') || 'all');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('trackerStatus') || 'all');
    const [bastFilter, setBastFilter] = useState(searchParams.get('trackerBast') || 'all');

    // PIC Filters - Initialize from URL params
    const [picSearchTerm, setPicSearchTerm] = useState(searchParams.get('picSearch') || '');
    const [picRegionalFilter, setPicRegionalFilter] = useState(searchParams.get('picRegional') || 'all');
    const [picStatusFilter, setPicStatusFilter] = useState(searchParams.get('picStatus') || 'all');
    const [picJabatanFilter, setPicJabatanFilter] = useState(searchParams.get('picJabatan') || 'all');

    // Car Filters - Initialize from URL params
    const [carSearchTerm, setCarSearchTerm] = useState(searchParams.get('carSearch') || '');
    const [carPriorityFilter, setCarPriorityFilter] = useState(searchParams.get('carPriority') || 'all');
    const [carFilterCondition, setCarFilterCondition] = useState(searchParams.get('carCondition') || 'all');
    const [carRegionalFilter, setCarRegionalFilter] = useState(searchParams.get('carRegional') || 'all');
    const [filteredCarData, setFilteredCarData] = useState([]);

    // CCTV Data State
    const [cctvData, setCctvData] = useState([]);
    const [filteredCctvData, setFilteredCctvData] = useState([]);

    // CCTV Filters - Initialize from URL params
    const [cctvSearchTerm, setCctvSearchTerm] = useState(searchParams.get('cctvSearch') || '');
    const [cctvRegionalFilter, setCctvRegionalFilter] = useState(searchParams.get('cctvRegional') || 'all');
    const [cctvStatusFilter, setCctvStatusFilter] = useState(searchParams.get('cctvStatus') || 'all');
    const [cctvCategoryFilter, setCctvCategoryFilter] = useState(searchParams.get('cctvCategory') || 'all');

    // Dashboard specific filters - MOVED UP
    const [dashSearch, setDashSearch] = useState('');
    const [dashRegion, setDashRegion] = useState('all');
    const [dashBast, setDashBast] = useState('all');
    const [dashStatusPekerjaan, setDashStatusPekerjaan] = useState('all');
    const [dashFilteredTrackers, setDashFilteredTrackers] = useState([]);

    // Dashboard PIC Filters
    const [dashPicSearch, setDashPicSearch] = useState('');
    const [dashPicRegion, setDashPicRegion] = useState('all');
    const [dashPicStatus, setDashPicStatus] = useState('all');
    const [dashFilteredPic, setDashFilteredPic] = useState([]);

    const navigate = useNavigate();

    // Helper function to update URL params while preserving tab
    const updateFilterParam = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value && value !== 'all' && value !== '') {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams, { replace: true });
    };

    // Sync filter changes to URL
    useEffect(() => {
        updateFilterParam('trackerSearch', searchTerm);
    }, [searchTerm]);
    useEffect(() => {
        updateFilterParam('trackerRegional', regionalFilter);
    }, [regionalFilter]);
    useEffect(() => {
        updateFilterParam('trackerStatus', statusFilter);
    }, [statusFilter]);
    useEffect(() => {
        updateFilterParam('trackerBast', bastFilter);
    }, [bastFilter]);

    // PIC filter sync
    useEffect(() => {
        updateFilterParam('picSearch', picSearchTerm);
    }, [picSearchTerm]);
    useEffect(() => {
        updateFilterParam('picRegional', picRegionalFilter);
    }, [picRegionalFilter]);
    useEffect(() => {
        updateFilterParam('picStatus', picStatusFilter);
    }, [picStatusFilter]);
    useEffect(() => {
        updateFilterParam('picJabatan', picJabatanFilter);
    }, [picJabatanFilter]);

    // Car filter sync
    useEffect(() => {
        updateFilterParam('carSearch', carSearchTerm);
    }, [carSearchTerm]);
    useEffect(() => {
        updateFilterParam('carPriority', carPriorityFilter);
    }, [carPriorityFilter]);
    useEffect(() => {
        updateFilterParam('carCondition', carFilterCondition);
    }, [carFilterCondition]);
    useEffect(() => {
        updateFilterParam('carRegional', carRegionalFilter);
    }, [carRegionalFilter]);

    // CCTV filter sync
    useEffect(() => {
        updateFilterParam('cctvSearch', cctvSearchTerm);
    }, [cctvSearchTerm]);
    useEffect(() => {
        updateFilterParam('cctvRegional', cctvRegionalFilter);
    }, [cctvRegionalFilter]);
    useEffect(() => {
        updateFilterParam('cctvStatus', cctvStatusFilter);
    }, [cctvStatusFilter]);
    useEffect(() => {
        updateFilterParam('cctvCategory', cctvCategoryFilter);
    }, [cctvCategoryFilter]);

    // Helper to get current URL with all params (for returnUrl)
    const getCurrentUrl = () => {
        return `/admin?${searchParams.toString()}`;
    };


    useEffect(() => {
        // Core criteria: Waiting BAST, On Hold, Open
        let result = workTrackers.filter(t =>
            t.status_bast === 'Waiting Approve' ||
            t.status_bast === 'Waiting Approve BAST' ||
            t.status_pekerjaan === 'On Hold' ||
            t.status_pekerjaan === 'Open'
        );

        if (dashSearch) {
            const lower = dashSearch.toLowerCase();
            result = result.filter(item =>
                item.site_name?.toLowerCase().includes(lower) ||
                item.site_id_1?.toLowerCase().includes(lower)
            );
        }

        if (dashRegion !== 'all') {
            result = result.filter(item => item.regional === dashRegion);
        }

        if (dashBast !== 'all') {
            // Flexible check
            if (dashBast === 'Waiting Approve') {
                result = result.filter(item => item.status_bast === 'Waiting Approve' || item.status_bast === 'Waiting Approve BAST');
            } else if (dashBast === 'Approve') {
                result = result.filter(item => item.status_bast === 'Approve' || item.status_bast === 'BAST Approve Date');
            } else {
                result = result.filter(item => item.status_bast === dashBast);
            }
        }

        if (dashStatusPekerjaan !== 'all') {
            result = result.filter(item => item.status_pekerjaan === dashStatusPekerjaan);
        }

        setDashFilteredTrackers(result);
    }, [workTrackers, dashSearch, dashRegion, dashBast, dashStatusPekerjaan]);

    // Dashboard PIC Filtering Logic
    useEffect(() => {
        let result = picData;

        if (dashPicSearch) {
            const lower = dashPicSearch.toLowerCase();
            result = result.filter(item =>
                item.nama_pic?.toLowerCase().includes(lower) ||
                item.area?.toLowerCase().includes(lower)
            );
        }

        if (dashPicRegion !== 'all') {
            result = result.filter(item => item.regional === dashPicRegion);
        }

        if (dashPicStatus !== 'all') {
            result = result.filter(item => item.status === dashPicStatus);
        }

        setDashFilteredPic(result);
    }, [picData, dashPicSearch, dashPicRegion, dashPicStatus]);

    // Car Filtering Logic
    useEffect(() => {
        let result = carData;

        if (carSearchTerm) {
            const lower = carSearchTerm.toLowerCase();
            result = result.filter(item =>
                item.nomor_polisi?.toLowerCase().includes(lower) ||
                item.brand?.toLowerCase().includes(lower) ||
                item.model?.toLowerCase().includes(lower)
            );
        }

        if (carPriorityFilter !== 'all') {
            result = result.filter(item => item.priority === carPriorityFilter);
        }

        if (carFilterCondition !== 'all') {
            result = result.filter(item => item.condition === carFilterCondition);
        }

        if (carRegionalFilter !== 'all') {
            result = result.filter(item => item.area === carRegionalFilter || item.province?.includes(carRegionalFilter));
        }

        setFilteredCarData(result);
    }, [carData, carSearchTerm, carPriorityFilter, carFilterCondition, carRegionalFilter]);

    // CCTV Filtering Logic
    useEffect(() => {
        let result = cctvData;

        if (cctvSearchTerm) {
            const lower = cctvSearchTerm.toLowerCase();
            result = result.filter(item =>
                item.site_id_display?.toLowerCase().includes(lower) ||
                item.site_name?.toLowerCase().includes(lower) ||
                item.merk_cctv?.toLowerCase().includes(lower) ||
                item.branch?.toLowerCase().includes(lower)
            );
        }

        if (cctvRegionalFilter !== 'all') {
            result = result.filter(item => item.regional === cctvRegionalFilter);
        }

        if (cctvStatusFilter !== 'all') {
            result = result.filter(item => item.status === cctvStatusFilter);
        }

        if (cctvCategoryFilter !== 'all') {
            result = result.filter(item => item.cctv_category === cctvCategoryFilter);
        }

        setFilteredCctvData(result);
    }, [cctvData, cctvSearchTerm, cctvRegionalFilter, cctvStatusFilter, cctvCategoryFilter]);

    // Tracker Tab Filtering Logic
    useEffect(() => {
        let result = workTrackers;

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(item =>
                item.site_name?.toLowerCase().includes(lower) ||
                item.site_id_1?.toLowerCase().includes(lower)
            );
        }

        if (regionalFilter !== 'all') {
            result = result.filter(item => item.regional === regionalFilter);
        }

        if (statusFilter !== 'all') {
            result = result.filter(item => item.status_pekerjaan === statusFilter);
        }

        if (bastFilter !== 'all') {
            if (bastFilter === 'Waiting Approve') {
                result = result.filter(item => item.status_bast === 'Waiting Approve' || item.status_bast === 'Waiting Approve BAST');
            } else if (bastFilter === 'Approve') {
                result = result.filter(item => item.status_bast === 'Approve' || item.status_bast === 'BAST Approve Date');
            } else {
                result = result.filter(item => item.status_bast === bastFilter);
            }
        }

        setFilteredTrackers(result);
    }, [workTrackers, searchTerm, regionalFilter, statusFilter, bastFilter]);

    // PIC Tab Filtering Logic
    useEffect(() => {
        let result = picData;

        if (picSearchTerm) {
            const lower = picSearchTerm.toLowerCase();
            result = result.filter(item =>
                item.nama_pic?.toLowerCase().includes(lower) ||
                item.area?.toLowerCase().includes(lower)
            );
        }

        if (picRegionalFilter !== 'all') {
            result = result.filter(item => item.regional === picRegionalFilter);
        }

        if (picStatusFilter !== 'all') {
            result = result.filter(item => item.validasi === picStatusFilter);
        }

        if (picJabatanFilter !== 'all') {
            result = result.filter(item => item.jabatan === picJabatanFilter);
        }

        setFilteredPicData(result);
    }, [picData, picSearchTerm, picRegionalFilter, picStatusFilter, picJabatanFilter]);

    const { toast } = useToast();
    const { logout, profile } = useAuth();

    // Role Helpers
    const isAdmin = profile?.role === 'Administrator';
    const isAM = profile?.role === 'AM';
    const isSPV = profile?.role?.startsWith('SPV');
    const userRegional = isSPV ? profile.role.replace('SPV ', '') : null;

    const canManageUsers = isAdmin;
    const canEditTracker = isAdmin || isAM || isSPV;
    const canEditPic = isAdmin || isAM;
    const canEditCar = isAdmin || isAM;
    const canEditCctv = isAdmin || isAM;

    // Fetch Data
    useEffect(() => {
        if (profile) {
            fetchTrackers();
            fetchPicData();
            fetchCarData();
            fetchCctvData();
        }
    }, [profile]);

    const fetchTrackers = async () => {
        try {
            let query = supabase.from('work_trackers').select('*').order('created_at', { ascending: false });

            // Filter for SPV
            if (isSPV && userRegional) {
                query = query.eq('regional', userRegional);
            }

            const { data, error } = await query;
            if (error) throw error;
            setWorkTrackers(data || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchPicData = async () => {
        try {
            const { data, error } = await supabase.from('pic_data').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setPicData(data || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchCarData = async () => {
        try {
            const { data, error } = await supabase.from('car_data').select('*').order('created_at', { ascending: false });
            if (error) {
                // If table doesn't exist yet, we might get an error. Suppress or log.
                console.error("Fetch Car Error", error);
                return;
            }
            setCarData(data || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchCctvData = async () => {
        try {
            const { data, error } = await supabase.from('cctv_data').select('*').order('created_at', { ascending: false });
            if (error) {
                console.error("Fetch CCTV Error", error);
                return;
            }
            setCctvData(data || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // --- Tracker Handlers ---
    const handleTrackerSubmit = async (formData) => {
        if (!canEditTracker) return;
        try {
            // Exclude aging_days from payload cause it's generated
            const { id, aging_days, ...data } = formData;
            const payload = {
                ...data,
                bast_submit_date: data.bast_submit_date || null,
                bast_approve_date: data.bast_approve_date || null,
            };

            let error;
            if (editingTracker) {
                ({ error } = await supabase.from('work_trackers').update(payload).eq('id', editingTracker.id));
            } else {
                ({ error } = await supabase.from('work_trackers').insert([payload]));
            }

            if (error) throw error;
            toast({ title: "Success", description: "Data saved successfully." });
            setEditingTracker(null);
            fetchTrackers();
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handleTrackerDelete = async (id) => {
        if (!isAdmin) { // Only admin can delete typically, or AM? Assuming Admin only for safety
            toast({ variant: "destructive", title: "Access Denied", description: "Only Administrators can delete records." });
            return;
        }
        try {
            const { error } = await supabase.from('work_trackers').delete().eq('id', id);
            if (error) throw error;
            toast({ title: "Deleted", description: "Record deleted." });
            fetchTrackers();
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    // --- PIC Handlers ---
    const handlePicSubmit = async (formData) => {
        if (!canEditPic) return;
        try {
            const { id, ...data } = formData;
            const payload = {
                ...data,
                tgl_join: data.tgl_join || null,
                tgl_berakhir: data.tgl_berakhir || null,
            };

            let error;
            if (editingPic) {
                ({ error } = await supabase.from('pic_data').update(payload).eq('id', editingPic.id));
            } else {
                ({ error } = await supabase.from('pic_data').insert([payload]));
            }

            if (error) throw error;
            toast({ title: "Success", description: "PIC Data saved." });
            setEditingPic(null);
            setIsPicFormOpen(false); // Close dialog
            fetchPicData();
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handlePicDelete = async (id) => {
        if (!isAdmin) return;
        try {
            const { error } = await supabase.from('pic_data').delete().eq('id', id);
            if (error) throw error;
            fetchPicData();
            toast({ title: "Deleted", description: "PIC deleted." });
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    // --- Car Handlers ---
    const handleCarSubmit = async (formData) => {
        if (!canEditCar) return;
        try {
            const { id, ...data } = formData;
            const payload = {
                ...data,
                masa_berlaku_stnk: data.masa_berlaku_stnk || null,
                masa_berlaku_pajak: data.masa_berlaku_pajak || null,
                masa_berlaku_kir: data.masa_berlaku_kir || null,
                date_service: data.date_service || null,
            };

            let error;
            if (editingCar) {
                ({ error } = await supabase.from('car_data').update(payload).eq('id', editingCar.id));
            } else {
                ({ error } = await supabase.from('car_data').insert([payload]));
            }

            if (error) throw error;
            toast({ title: "Success", description: "Car Data saved." });
            setEditingCar(null);
            setIsCarFormOpen(false);
            fetchCarData();
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    const handleCarDelete = async (id) => {
        if (!isAdmin) return;
        try {
            const { error } = await supabase.from('car_data').delete().eq('id', id);
            if (error) throw error;
            fetchCarData();
            toast({ title: "Deleted", description: "Car deleted." });
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    // --- CCTV Handlers ---
    const handleCctvDelete = async (id) => {
        if (!isAdmin) return;
        try {
            const { error } = await supabase.from('cctv_data').delete().eq('id', id);
            if (error) throw error;
            fetchCctvData();
            toast({ title: "Deleted", description: "CCTV deleted." });
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };


    // Content Rendering
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                // Compute summary counts (Global)
                const dTotal = workTrackers.length;
                const dWaiting = workTrackers.filter(t => t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST').length;
                const dApproved = workTrackers.filter(t => t.status_bast === 'Approve' || t.status_bast === 'BAST Approve Date').length;
                const dProgress = workTrackers.filter(t => t.status_pekerjaan === 'Open').length;
                const dHold = workTrackers.filter(t => t.status_pekerjaan === 'On Hold').length;
                const dClose = workTrackers.filter(t => t.status_pekerjaan === 'Close').length;

                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold">Dashboard Overview</h2>

                        {/* Summary Stats with Icons */}
                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Total Job</p>
                                        <p className="text-2xl font-bold">{dTotal}</p>
                                    </div>
                                    <Briefcase className="w-8 h-8 text-muted-foreground opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-yellow-600">Waiting Approve BAST</p>
                                        <p className="text-2xl font-bold">{dWaiting}</p>
                                    </div>
                                    <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-green-600">Approve BAST</p>
                                        <p className="text-2xl font-bold">{dApproved}</p>
                                    </div>
                                    <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-blue-600">Open</p>
                                        <p className="text-2xl font-bold">{dProgress}</p>
                                    </div>
                                    <PlayCircle className="w-8 h-8 text-blue-600 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-orange-600">On Hold</p>
                                        <p className="text-2xl font-bold">{dHold}</p>
                                    </div>
                                    <PauseCircle className="w-8 h-8 text-orange-600 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-gray-600">Close</p>
                                        <p className="text-2xl font-bold">{dClose}</p>
                                    </div>
                                    <XCircle className="w-8 h-8 text-gray-600 opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* Regional Waiting Stats */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Waiting Approval BAST per Regional</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'].map(reg => {
                                    const count = workTrackers.filter(t =>
                                        t.regional === reg &&
                                        (t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST')
                                    ).length;
                                    return (
                                        <div key={reg} className="bg-card border rounded-lg p-4">
                                            <p className="text-sm font-medium text-muted-foreground">{reg}</p>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <p className="text-3xl font-bold">{count}</p>
                                                <p className="text-xs text-muted-foreground">menunggu approval BAST</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Active Jobs Table - Full Width */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold">Active Jobs (Waiting Approve BAST/On Hold/Open)</h3>
                            </div>

                            {/* Dashboard Filters - Added Status Pekerjaan */}
                            <div className="flex flex-wrap gap-2 bg-card p-3 rounded-lg border">
                                <Input
                                    placeholder="Search..."
                                    className="h-8 w-32 lg:w-40"
                                    value={dashSearch}
                                    onChange={e => setDashSearch(e.target.value)}
                                />
                                <Select value={dashRegion} onValueChange={setDashRegion}>
                                    <SelectTrigger className="h-8 w-[110px]">
                                        <SelectValue placeholder="Regional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Regional</SelectItem>
                                        <SelectItem value="Jabo Outer 1">Jabo Outer 1</SelectItem>
                                        <SelectItem value="Jabo Outer 2">Jabo Outer 2</SelectItem>
                                        <SelectItem value="Jabo Outer 3">Jabo Outer 3</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={dashBast} onValueChange={setDashBast}>
                                    <SelectTrigger className="h-8 w-[110px]">
                                        <SelectValue placeholder="BAST" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status BAST</SelectItem>
                                        <SelectItem value="Waiting Approve">Waiting</SelectItem>
                                        <SelectItem value="Approve">Approved</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={dashStatusPekerjaan} onValueChange={setDashStatusPekerjaan}>
                                    <SelectTrigger className="h-8 w-[110px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status Pekerjaan</SelectItem>
                                        <SelectItem value="Open">Open</SelectItem>
                                        <SelectItem value="On Hold">On Hold</SelectItem>
                                        <SelectItem value="Close">Close</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(dashSearch || dashRegion !== 'all' || dashBast !== 'all' || dashStatusPekerjaan !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => {
                                            setDashSearch('');
                                            setDashRegion('all');
                                            setDashBast('all');
                                            setDashStatusPekerjaan('all');
                                        }}
                                    >
                                        Reset
                                    </Button>
                                )}
                            </div>

                            <div className="rounded-xl border bg-card shadow">
                                <WorkTrackerTable
                                    data={dashFilteredTrackers}
                                    isReadOnly={true}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'tracker':
                // Compute summary counts
                const total = workTrackers.length;
                const waitingBast = workTrackers.filter(t => t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST').length;
                const approvedBast = workTrackers.filter(t => t.status_bast === 'Approve' || t.status_bast === 'BAST Approve Date').length;
                const onProgress = workTrackers.filter(t => t.status_pekerjaan === 'Open').length;
                const onHold = workTrackers.filter(t => t.status_pekerjaan === 'On Hold').length;

                return (
                    <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Total</p>
                                        <p className="text-2xl font-bold">{total}</p>
                                    </div>
                                    <Briefcase className="w-8 h-8 text-muted-foreground opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-yellow-600">Waiting BAST</p>
                                        <p className="text-2xl font-bold">{waitingBast}</p>
                                    </div>
                                    <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-green-600">Approve BAST</p>
                                        <p className="text-2xl font-bold">{approvedBast}</p>
                                    </div>
                                    <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-blue-600">Open</p>
                                        <p className="text-2xl font-bold">{onProgress}</p>
                                    </div>
                                    <PlayCircle className="w-8 h-8 text-blue-600 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-orange-600">On Hold</p>
                                        <p className="text-2xl font-bold">{onHold}</p>
                                    </div>
                                    <PauseCircle className="w-8 h-8 text-orange-600 opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* Filters & Actions */}
                        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-card p-4 rounded-xl border shadow-sm">
                            <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto flex-1 flex-wrap">
                                <Input
                                    placeholder="Search Site ID or Name..."
                                    className="w-full md:w-48 lg:w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
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
                                {(searchTerm || regionalFilter !== 'all' || statusFilter !== 'all' || bastFilter !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setRegionalFilter('all');
                                            setStatusFilter('all');
                                            setBastFilter('all');
                                        }}
                                        className="px-3"
                                        title="Reset Filters"
                                    >
                                        Reset
                                    </Button>
                                )}
                            </div>

                            {canEditTracker && (
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => exportToCSV(filteredTrackers, 'tracker-data.csv')}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Export CSV
                                    </Button>
                                    <Button onClick={() => navigate('/admin/input-tracker', { state: { returnUrl: getCurrentUrl() } })}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Input Data Tracker
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Table Content */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card shadow">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h2 className="text-lg font-semibold">
                                    Data Trackers <span className="text-sm font-normal text-muted-foreground ml-2">({filteredTrackers.length} records)</span>
                                </h2>
                            </div>
                            <div className="p-6">
                                <WorkTrackerTable
                                    data={filteredTrackers}
                                    onEdit={(t) => navigate(`/admin/edit-tracker/${t.id}`, { state: { returnUrl: getCurrentUrl() } })}
                                    onDelete={handleTrackerDelete}
                                    isReadOnly={!canEditTracker}
                                />
                            </div>
                        </motion.div>
                    </div>
                );
            case 'pic':
                const totalPic = picData.length;
                const activePic = picData.filter(p => p.validasi === 'Active').length;
                const inactivePic = picData.filter(p => p.validasi === 'Inactive').length;

                // Active PIC per regional
                const activePicJabo1 = picData.filter(p => p.validasi === 'Active' && p.regional === 'Jabo Outer 1').length;
                const activePicJabo2 = picData.filter(p => p.validasi === 'Active' && p.regional === 'Jabo Outer 2').length;
                const activePicJabo3 = picData.filter(p => p.validasi === 'Active' && p.regional === 'Jabo Outer 3').length;

                return (
                    <div className="space-y-6">
                        {canEditPic ? (
                            <>
                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold">Total PIC</p>
                                                <p className="text-2xl font-bold">{totalPic}</p>
                                            </div>
                                            <UsersIcon className="w-5 h-5 text-muted-foreground opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-green-600">Active PIC</p>
                                                <p className="text-2xl font-bold">{activePic}</p>
                                            </div>
                                            <CheckCircle className="w-5 h-5 text-green-600 opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-red-600">Inactive PIC</p>
                                                <p className="text-2xl font-bold">{inactivePic}</p>
                                            </div>
                                            <XCircle className="w-5 h-5 text-red-600 opacity-50" />
                                        </div>
                                    </div>
                                </div>

                                {/* Active PIC per Regional */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Active PIC per Regional</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-card border rounded-lg p-4">
                                            <p className="text-sm font-medium text-muted-foreground">Jabo Outer 1</p>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <p className="text-3xl font-bold">{activePicJabo1}</p>
                                                <p className="text-xs text-muted-foreground">PIC aktif</p>
                                            </div>
                                        </div>
                                        <div className="bg-card border rounded-lg p-4">
                                            <p className="text-sm font-medium text-muted-foreground">Jabo Outer 2</p>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <p className="text-3xl font-bold">{activePicJabo2}</p>
                                                <p className="text-xs text-muted-foreground">PIC aktif</p>
                                            </div>
                                        </div>
                                        <div className="bg-card border rounded-lg p-4">
                                            <p className="text-sm font-medium text-muted-foreground">Jabo Outer 3</p>
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <p className="text-3xl font-bold">{activePicJabo3}</p>
                                                <p className="text-xs text-muted-foreground">PIC aktif</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Filters & Actions */}
                                <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-card p-4 rounded-xl border shadow-sm">
                                    <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto flex-1 flex-wrap">
                                        <Input
                                            placeholder="Search Name or Area..."
                                            className="w-full md:w-48 lg:w-64"
                                            value={picSearchTerm}
                                            onChange={(e) => setPicSearchTerm(e.target.value)}
                                        />
                                        <Select value={picRegionalFilter} onValueChange={setPicRegionalFilter}>
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
                                        <Select value={picStatusFilter} onValueChange={setPicStatusFilter}>
                                            <SelectTrigger className="w-full md:w-[150px]">
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="Active">Active</SelectItem>
                                                <SelectItem value="Inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={picJabatanFilter} onValueChange={setPicJabatanFilter}>
                                            <SelectTrigger className="w-full md:w-[150px]">
                                                <SelectValue placeholder="Jabatan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Jabatan</SelectItem>
                                                <SelectItem value="PM">PM</SelectItem>
                                                <SelectItem value="CM">CM</SelectItem>
                                                <SelectItem value="PM/CM">PM/CM</SelectItem>
                                                <SelectItem value="CM+MBP">CM+MBP</SelectItem>
                                                <SelectItem value="VERTI & TII">VERTI & TII</SelectItem>
                                                <SelectItem value="Expert Genset">Expert Genset</SelectItem>
                                                <SelectItem value="MBP">MBP</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {(picSearchTerm || picRegionalFilter !== 'all' || picStatusFilter !== 'all' || picJabatanFilter !== 'all') && (
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    setPicSearchTerm('');
                                                    setPicRegionalFilter('all');
                                                    setPicStatusFilter('all');
                                                    setPicJabatanFilter('all');
                                                }}
                                                className="px-3"
                                                title="Reset Filters"
                                            >
                                                Reset
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => exportToCSV(filteredPicData, 'pic-data.csv')}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Export CSV
                                        </Button>
                                        <Button onClick={() => navigate('/admin/input-pic', { state: { returnUrl: getCurrentUrl() } })}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Input New PIC
                                        </Button>
                                    </div>
                                </div>

                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card shadow">
                                    <div className="p-6 border-b">
                                        <h2 className="text-lg font-semibold">
                                            PIC Records <span className="text-sm font-normal text-muted-foreground ml-2">({filteredPicData.length} records)</span>
                                        </h2>
                                    </div>
                                    <div className="p-6">
                                        <PicDataTable
                                            data={filteredPicData}
                                            onEdit={(p) => navigate(`/admin/edit-pic/${p.id}`, { state: { returnUrl: getCurrentUrl() } })}
                                            onDelete={handlePicDelete}
                                            isReadOnly={false}
                                        />
                                    </div>
                                </motion.div>
                            </>
                        ) : (
                            <div className="text-center py-10 bg-card rounded-xl border">
                                <p className="text-muted-foreground">You do not have permission to access PIC Data.</p>
                            </div>
                        )}
                    </div>
                );
            case 'users':
                return canManageUsers ? <UserManagement /> : <div className="p-4">Access Denied</div>;
            case 'car':
                // Car Stats
                const cTotal = carData.length;
                const cNeedService = carData.filter(c => c.condition === 'NEED SERVICE').length;
                const cExpired = carData.filter(c => {
                    const today = new Date();
                    // Check if ANY doc is expired
                    const stnk = c.masa_berlaku_stnk ? new Date(c.masa_berlaku_stnk) < today : false;
                    const pajak = c.masa_berlaku_pajak ? new Date(c.masa_berlaku_pajak) < today : false;
                    const kir = c.masa_berlaku_kir ? new Date(c.masa_berlaku_kir) < today : false;
                    return stnk || pajak || kir;
                }).length;
                const cActive = carData.filter(c => c.status_mobil === 'AKTIF').length;

                return (
                    <div className="space-y-6">
                        {canEditCar ? (
                            <>
                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold">Total Kendaraan</p>
                                                <p className="text-2xl font-bold">{cTotal}</p>
                                            </div>
                                            <Truck className="w-5 h-5 text-muted-foreground opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-red-600">Need Service</p>
                                                <p className="text-2xl font-bold">{cNeedService}</p>
                                            </div>
                                            <AlertCircle className="w-5 h-5 text-red-600 opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-orange-600">Dokumen Expired</p>
                                                <p className="text-2xl font-bold">{cExpired}</p>
                                            </div>
                                            <Clock className="w-5 h-5 text-orange-600 opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-green-600">Aktif</p>
                                                <p className="text-2xl font-bold">{cActive}</p>
                                            </div>
                                            <CheckCircle className="w-5 h-5 text-green-600 opacity-50" />
                                        </div>
                                    </div>
                                </div>

                                {/* Car Filters */}
                                <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
                                    <Input
                                        placeholder="Search Polisi, Brand, Model..."
                                        className="w-full md:w-64"
                                        value={carSearchTerm}
                                        onChange={e => setCarSearchTerm(e.target.value)}
                                    />
                                    <Select value={carPriorityFilter} onValueChange={setCarPriorityFilter}>
                                        <SelectTrigger className="w-full md:w-[150px]">
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Priority</SelectItem>
                                            <SelectItem value="HIGH">HIGH</SelectItem>
                                            <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                                            <SelectItem value="LOW">LOW</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={carFilterCondition} onValueChange={setCarFilterCondition}>
                                        <SelectTrigger className="w-full md:w-[180px]">
                                            <SelectValue placeholder="Condition" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Conditions</SelectItem>
                                            <SelectItem value="GOOD">GOOD</SelectItem>
                                            <SelectItem value="NEED SERVICE">Need Service</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={carRegionalFilter} onValueChange={setCarRegionalFilter}>
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
                                    {(carSearchTerm || carFilterCondition !== 'all' || carPriorityFilter !== 'all' || carRegionalFilter !== 'all') && (
                                        <Button variant="ghost" onClick={() => { setCarSearchTerm(''); setCarPriorityFilter('all'); setCarFilterCondition('all'); setCarRegionalFilter('all'); }}>
                                            Reset
                                        </Button>
                                    )}

                                    <div className="flex gap-2 ml-auto">
                                        <Button variant="outline" onClick={() => exportToCSV(filteredCarData, 'car-data.csv')}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Export CSV
                                        </Button>
                                        <Button onClick={() => navigate('/admin/input-car', { state: { returnUrl: getCurrentUrl() } })}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Input Data Mobil
                                        </Button>
                                    </div>
                                </div>

                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card shadow">
                                    <div className="p-6 border-b">
                                        <h2 className="text-lg font-semibold">
                                            Data Mobil <span className="text-sm font-normal text-muted-foreground ml-2">({filteredCarData.length} records)</span>
                                        </h2>
                                    </div>
                                    <div className="p-6">
                                        <CarDataTable
                                            data={filteredCarData}
                                            onEdit={(c) => navigate(`/admin/edit-car/${c.id}`, { state: { returnUrl: getCurrentUrl() } })}
                                            onDelete={handleCarDelete}
                                            isReadOnly={false}
                                            picData={picData}
                                        />
                                    </div>
                                </motion.div>
                            </>
                        ) : (
                            <div className="text-center py-10">Access Denied</div>
                        )
                        }
                    </div >
                );
            case 'cctv':
                // CCTV Stats
                const cctvTotal = cctvData.length;
                const cctvOnline = cctvData.filter(c => c.status === 'online').length;
                const cctvOffline = cctvData.filter(c => c.status === 'offline').length;
                const cctvBroken = cctvData.filter(c => c.status === 'broken').length;
                const cctvStolen = cctvData.filter(c => c.status === 'stolen').length;
                const cctvIOT = cctvData.filter(c => c.cctv_category === 'IOT').length;
                const cctvReguler = cctvData.filter(c => c.cctv_category === 'reguler').length;

                return (
                    <div className="space-y-6">
                        {canEditCctv ? (
                            <>
                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold">Total CCTV</p>
                                                <p className="text-2xl font-bold">{cctvTotal}</p>
                                            </div>
                                            <Camera className="w-5 h-5 text-muted-foreground opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-green-600">Online</p>
                                                <p className="text-2xl font-bold">{cctvOnline}</p>
                                            </div>
                                            <Wifi className="w-5 h-5 text-green-600 opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-yellow-600">Offline</p>
                                                <p className="text-2xl font-bold">{cctvOffline}</p>
                                            </div>
                                            <WifiOff className="w-5 h-5 text-yellow-600 opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-red-600">Broken</p>
                                                <p className="text-2xl font-bold">{cctvBroken}</p>
                                            </div>
                                            <AlertCircle className="w-5 h-5 text-red-600 opacity-50" />
                                        </div>
                                    </div>
                                    <div className="bg-card border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase font-bold text-purple-600">Stolen</p>
                                                <p className="text-2xl font-bold">{cctvStolen}</p>
                                            </div>
                                            <XCircle className="w-5 h-5 text-purple-600 opacity-50" />
                                        </div>
                                    </div>
                                </div>

                                {/* Category Stats */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">CCTV per Category</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'].map(reg => {
                                            const count = cctvData.filter(c => c.regional === reg).length;
                                            const onlineCount = cctvData.filter(c => c.regional === reg && c.status === 'online').length;
                                            return (
                                                <div key={reg} className="bg-card border rounded-lg p-4">
                                                    <p className="text-sm font-medium text-muted-foreground">{reg}</p>
                                                    <div className="flex items-baseline gap-2 mt-1">
                                                        <p className="text-3xl font-bold">{count}</p>
                                                        <p className="text-xs text-muted-foreground">total</p>
                                                        <span className="text-xs text-green-600 font-medium">({onlineCount} online)</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* CCTV Filters */}
                                <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
                                    <Input
                                        placeholder="Search Site ID, Name, Merk..."
                                        className="w-full md:w-64"
                                        value={cctvSearchTerm}
                                        onChange={e => setCctvSearchTerm(e.target.value)}
                                    />
                                    <Select value={cctvRegionalFilter} onValueChange={setCctvRegionalFilter}>
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
                                    <Select value={cctvStatusFilter} onValueChange={setCctvStatusFilter}>
                                        <SelectTrigger className="w-full md:w-[150px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="online">Online</SelectItem>
                                            <SelectItem value="offline">Offline</SelectItem>
                                            <SelectItem value="broken">Broken</SelectItem>
                                            <SelectItem value="stolen">Stolen</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={cctvCategoryFilter} onValueChange={setCctvCategoryFilter}>
                                        <SelectTrigger className="w-full md:w-[150px]">
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Category</SelectItem>
                                            <SelectItem value="reguler">Reguler</SelectItem>
                                            <SelectItem value="IOT">IOT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {(cctvSearchTerm || cctvRegionalFilter !== 'all' || cctvStatusFilter !== 'all' || cctvCategoryFilter !== 'all') && (
                                        <Button variant="ghost" onClick={() => { setCctvSearchTerm(''); setCctvRegionalFilter('all'); setCctvStatusFilter('all'); setCctvCategoryFilter('all'); }}>
                                            Reset
                                        </Button>
                                    )}

                                    <div className="flex gap-2 ml-auto">
                                        <Button variant="outline" onClick={() => exportToCSV(filteredCctvData, 'cctv-data.csv')}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Export CSV
                                        </Button>
                                        <Button onClick={() => navigate('/admin/input-cctv', { state: { returnUrl: getCurrentUrl() } })}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Input Data CCTV
                                        </Button>
                                    </div>
                                </div>

                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card shadow">
                                    <div className="p-6 border-b">
                                        <h2 className="text-lg font-semibold">
                                            Data CCTV <span className="text-sm font-normal text-muted-foreground ml-2">({filteredCctvData.length} records)</span>
                                        </h2>
                                    </div>
                                    <div className="p-6">
                                        <CCTVDataTable
                                            data={filteredCctvData}
                                            onEdit={(c) => navigate(`/admin/edit-cctv/${c.id}`, { state: { returnUrl: getCurrentUrl() } })}
                                            onDelete={handleCctvDelete}
                                            isReadOnly={false}
                                        />
                                    </div>
                                </motion.div>
                            </>
                        ) : (
                            <div className="text-center py-10">Access Denied</div>
                        )
                        }
                    </div >
                );
            case 'notes':
                return <StickyNotes />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <Helmet>
                <title>Admin Dashboard | WorkTracker</title>
            </Helmet>

            <div className="hidden md:flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight capitalize">{activeTab.replace('-', ' ')}</h1>
                    <p className="text-muted-foreground mt-1">
                        Selamat Datang, {profile?.name || 'User'} ({profile?.role}).
                    </p>
                </div>
                <ThemeToggle />
            </div>

            {renderContent()}
        </div>
    );
};

export default AdminDashboard;