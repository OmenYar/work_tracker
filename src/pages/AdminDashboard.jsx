import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, Activity, AlertCircle, CheckCircle, Clock, Truck, Users as UsersIcon, Briefcase, PlayCircle, PauseCircle, XCircle, Camera, Wifi, WifiOff, FileText, MapPin, Lock, CheckCircle2, Package, RefreshCw, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/customSupabaseClient';
import { deleteCCTVFromGoogleSheets, deletePICFromGoogleSheets, deleteTrackerFromGoogleSheets, deleteCarFromGoogleSheets } from '@/lib/googleSheetsSync';
import { logDelete } from '@/lib/activityLogger';

// Components - Lazy loaded for code splitting
const WorkTrackerTable = React.lazy(() => import('@/components/WorkTrackerTable'));
const UserManagement = React.lazy(() => import('@/components/UserManagement'));
const PicDataTable = React.lazy(() => import('@/components/PicDataTable'));
const CarDataTable = React.lazy(() => import('@/components/CarDataTable'));
const CCTVDataTable = React.lazy(() => import('@/components/CCTVDataTable'));
const StickyNotes = React.lazy(() => import('@/components/StickyNotes'));
const ActivityLogs = React.lazy(() => import('@/components/ActivityLogs'));
const ExportDropdown = React.lazy(() => import('@/components/ExportDropdown'));
const DashboardExport = React.lazy(() => import('@/components/DashboardExport'));
const GenerateBAST = React.lazy(() => import('@/components/GenerateBAST'));
const GenerateATP = React.lazy(() => import('@/components/GenerateATP'));
const AnalyticsDashboard = React.lazy(() => import('@/components/AnalyticsDashboard'));
const CalendarView = React.lazy(() => import('@/components/CalendarView'));
const PerformanceMonitoring = React.lazy(() => import('@/components/PerformanceMonitoring'));
const BulkOperations = React.lazy(() => import('@/components/BulkOperations'));
const ReportBuilder = React.lazy(() => import('@/components/ReportBuilder'));

// Non-lazy (small components)
import { ThemeToggle } from '@/components/ThemeToggle';
import { TableSkeleton, DashboardSkeleton } from '@/components/ui/skeleton';
import NotificationCenter, { AlertSummary } from '@/components/NotificationCenter';
import GlobalSearch from '@/components/GlobalSearch';
import MobileBottomNav from '@/components/MobileBottomNav';
import AdvancedFilters from '@/components/AdvancedFilters';
import MeetingSummary from '@/components/MeetingSummary';

// Module Tracker components
const ModuleSummary = React.lazy(() => import('@/components/ModuleSummary'));
const ModuleDataTable = React.lazy(() => import('@/components/ModuleDataTable'));
const ModuleExcelImport = React.lazy(() => import('@/components/ModuleExcelImport'));

// SmartLock components
const SmartLockDataTable = React.lazy(() => import('@/components/SmartLockDataTable'));
const SmartLockSummary = React.lazy(() => import('@/components/SmartLockSummary'));

// Loading fallback for lazy components
const ComponentLoader = () => (
    <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
);

// Helper function to determine BAST status dynamically
// "Need Created BAST" = status_pekerjaan is 'Close' AND status_bast not 'Approve'/'Waiting Approve' AND dates are empty
const isNeedCreatedBast = (tracker) => {
    const isStatusClose = tracker.status_pekerjaan === 'Close';
    const isNotApprove = tracker.status_bast !== 'Approve' && tracker.status_bast !== 'BAST Approve Date';
    const isNotWaiting = tracker.status_bast !== 'Waiting Approve' && tracker.status_bast !== 'Waiting Approve BAST';
    const isDateEmpty = (!tracker.date_submit || tracker.date_submit === '') &&
        (!tracker.date_approve || tracker.date_approve === '');

    return isStatusClose && isNotApprove && isNotWaiting && isDateEmpty;
};

// Get computed BAST status for a tracker
const getBastStatus = (tracker) => {
    if (isNeedCreatedBast(tracker)) {
        return 'Need Created BAST';
    }
    return tracker.status_bast || '-';
};

const AdminDashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'dashboard';

    // Function to change active tab via URL params
    const setActiveTab = useCallback((tab) => {
        setSearchParams({ tab });
    }, [setSearchParams]);

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

    // Loading states for skeleton
    const [isLoadingTrackers, setIsLoadingTrackers] = useState(true);
    const [isLoadingPic, setIsLoadingPic] = useState(true);
    const [isLoadingCar, setIsLoadingCar] = useState(true);
    const [isLoadingCctv, setIsLoadingCctv] = useState(true);

    // Module Tracker states
    const [moduleData, setModuleData] = useState([]);
    const [isLoadingModule, setIsLoadingModule] = useState(true);
    const [isModuleImportOpen, setIsModuleImportOpen] = useState(false);

    // SmartLock states
    const [smartLockData, setSmartLockData] = useState([]);
    const [isLoadingSmartLock, setIsLoadingSmartLock] = useState(true);

    // Selection state for bulk operations
    const [selectedTrackerIds, setSelectedTrackerIds] = useState([]);
    const [selectedPicIds, setSelectedPicIds] = useState([]);
    const [selectedCctvIds, setSelectedCctvIds] = useState([]);
    const [selectedModuleIds, setSelectedModuleIds] = useState([]);
    const [selectedSmartLockIds, setSelectedSmartLockIds] = useState([]);
    const [selectedCarIds, setSelectedCarIds] = useState([]);

    // Tracker Filters - Initialize from URL params
    const [searchTerm, setSearchTerm] = useState(searchParams.get('trackerSearch') || '');
    const [regionalFilter, setRegionalFilter] = useState(searchParams.get('trackerRegional') || 'all');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('trackerStatus') || 'all');
    const [bastFilter, setBastFilter] = useState(searchParams.get('trackerBast') || 'all');
    const [suspectedFilter, setSuspectedFilter] = useState(searchParams.get('trackerSuspected') || 'all');

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
    const [dashRegion, setDashRegion] = useState(searchParams.get('dashRegion') || 'all');
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
    useEffect(() => {
        updateFilterParam('trackerSuspected', suspectedFilter);
    }, [suspectedFilter]);

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
        // Core criteria: Waiting BAST, Need Created BAST, On Hold, Open
        let result = workTrackers.filter(t =>
            t.status_bast === 'Waiting Approve' ||
            t.status_bast === 'Waiting Approve BAST' ||
            isNeedCreatedBast(t) ||
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
            } else if (dashBast === 'Need Created BAST') {
                result = result.filter(item => isNeedCreatedBast(item));
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
                item.pic_number_1?.includes(lower)
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
                item.merk_mobil?.toLowerCase().includes(lower) ||
                item.model?.toLowerCase().includes(lower)
            );
        }

        if (carPriorityFilter !== 'all') {
            // Logic for priority filter if needed later
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
                item.site_name?.toLowerCase().includes(lower) ||
                item.site_id_display?.toLowerCase().includes(lower)
            );
        }

        if (cctvStatusFilter !== 'all') {
            result = result.filter(item => item.status === cctvStatusFilter);
        }

        if (cctvRegionalFilter !== 'all') {
            result = result.filter(item => item.regional === cctvRegionalFilter);
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
            if (regionalFilter === 'Jabo Outer') {
                // 'Jabo Outer' includes all Jabo Outer 1, 2, 3 and 'Jabo Outer' itself
                result = result.filter(item =>
                    item.regional === 'Jabo Outer' ||
                    item.regional === 'Jabo Outer 1' ||
                    item.regional === 'Jabo Outer 2' ||
                    item.regional === 'Jabo Outer 3'
                );
            } else {
                result = result.filter(item => item.regional === regionalFilter);
            }
        }

        if (statusFilter !== 'all') {
            result = result.filter(item => item.status_pekerjaan === statusFilter);
        }

        if (bastFilter !== 'all') {
            if (bastFilter === 'Waiting Approve') {
                result = result.filter(item => item.status_bast === 'Waiting Approve' || item.status_bast === 'Waiting Approve BAST');
            } else if (bastFilter === 'Approve') {
                result = result.filter(item => item.status_bast === 'Approve' || item.status_bast === 'BAST Approve Date');
            } else if (bastFilter === 'Need Created BAST') {
                result = result.filter(item => isNeedCreatedBast(item));
            } else {
                result = result.filter(item => item.status_bast === bastFilter);
            }
        }

        if (suspectedFilter !== 'all') {
            result = result.filter(item => item.suspected === suspectedFilter);
        }

        setFilteredTrackers(result);
    }, [workTrackers, searchTerm, regionalFilter, statusFilter, bastFilter, suspectedFilter]);

    // PIC Tab Filtering Logic
    useEffect(() => {
        let result = picData;

        if (picSearchTerm) {
            const lower = picSearchTerm.toLowerCase();
            result = result.filter(item =>
                item.nama_pic?.toLowerCase().includes(lower) ||
                item.pic_number_1?.includes(lower)
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
    const isSPV = profile?.role?.toLowerCase().startsWith('spv') || profile?.role?.toLowerCase().includes('supervisor');
    // Robust Regional parsing: removes "spv", "supervisor" prefix and optional separator (- or :)
    const userRegional = isSPV ? profile.role.replace(/^(spv|supervisor)\s*[-:]?\s*/i, '').trim() : null;

    // Permission helpers - Admin and AM can manage everything, SPV can manage their regional data
    const canManageUsers = isAdmin; // Only Admin can manage users
    const canEditTracker = isAdmin || isAM || isSPV;
    const canEditPic = isAdmin || isAM || isSPV;
    const canEditCar = isAdmin || isAM || isSPV;
    const canEditCctv = isAdmin || isAM || isSPV;

    // Fetch Data
    useEffect(() => {
        if (profile) {
            fetchTrackers();
            fetchPicData();
            fetchCarData();
            fetchCctvData();
            fetchModuleData();
            fetchSmartLockData();
        }
    }, [profile]);

    // Supabase Realtime Subscriptions
    useEffect(() => {
        if (!profile) return;

        // Subscribe to work_tracker changes
        const trackerChannel = supabase
            .channel('work_tracker_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'work_tracker' },
                () => fetchTrackers()
            )
            .subscribe();

        // Subscribe to pic_data changes
        const picChannel = supabase
            .channel('pic_data_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'pic_data' },
                () => fetchPicData()
            )
            .subscribe();

        // Subscribe to car_data changes
        const carChannel = supabase
            .channel('car_data_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'car_data' },
                () => fetchCarData()
            )
            .subscribe();

        // Subscribe to cctv_data changes
        const cctvChannel = supabase
            .channel('cctv_data_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'cctv_data' },
                () => fetchCctvData()
            )
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            supabase.removeChannel(trackerChannel);
            supabase.removeChannel(picChannel);
            supabase.removeChannel(carChannel);
            supabase.removeChannel(cctvChannel);
        };
    }, [profile]);

    const fetchTrackers = async () => {
        setIsLoadingTrackers(true);
        try {
            let query = supabase.from('work_trackers').select('*').order('created_at', { ascending: false });

            // Filter for SPV - only show data from their regional
            if (isSPV && userRegional) {
                query = query.eq('regional', userRegional);
            }

            const { data, error } = await query;
            if (error) throw error;
            setWorkTrackers(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoadingTrackers(false);
        }
    };

    const fetchPicData = async () => {
        setIsLoadingPic(true);
        try {
            let query = supabase.from('pic_data').select('*').order('created_at', { ascending: false });

            // Filter for SPV - only show PIC from their regional
            if (isSPV && userRegional) {
                query = query.eq('regional', userRegional);
            }

            const { data, error } = await query;
            if (error) throw error;
            setPicData(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoadingPic(false);
        }
    };

    const fetchCarData = async () => {
        setIsLoadingCar(true);
        try {
            let query = supabase.from('car_data').select('*').order('created_at', { ascending: false });

            // Filter for SPV - using 'area' field for Car Data
            if (isSPV && userRegional) {
                query = query.eq('area', userRegional);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Fetch Car Error", error);
                return;
            }
            setCarData(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoadingCar(false);
        }
    };

    const fetchCctvData = async () => {
        setIsLoadingCctv(true);
        try {
            let query = supabase.from('cctv_data').select('*').order('created_at', { ascending: false });

            // Filter for SPV - only show CCTV from their regional
            if (isSPV && userRegional) {
                query = query.eq('regional', userRegional);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Fetch CCTV Error", error);
                return;
            }
            setCctvData(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoadingCctv(false);
        }
    };

    // Fetch Module Tracker data
    const fetchModuleData = async () => {
        setIsLoadingModule(true);
        try {
            const { data, error } = await supabase
                .from('module_tracker')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Fetch Module Error", error);
                return;
            }
            setModuleData(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoadingModule(false);
        }
    };

    // Fetch SmartLock data - parallel batches for faster loading
    const fetchSmartLockData = async () => {
        setIsLoadingSmartLock(true);
        try {
            // First, get count to determine total pages needed
            const { count, error: countError } = await supabase
                .from('smartlock_data')
                .select('*', { count: 'exact', head: true });

            if (countError) {
                console.error("Count Error", countError);
                return;
            }

            const totalRecords = count || 0;
            const pageSize = 1000;
            const totalPages = Math.ceil(totalRecords / pageSize);

            if (totalPages === 0) {
                setSmartLockData([]);
                return;
            }

            // Fetch all pages in parallel (max 4 concurrent)
            const batchSize = 4;
            let allData = [];

            for (let i = 0; i < totalPages; i += batchSize) {
                const promises = [];
                for (let j = i; j < Math.min(i + batchSize, totalPages); j++) {
                    const from = j * pageSize;
                    const to = from + pageSize - 1;
                    promises.push(
                        supabase
                            .from('smartlock_data')
                            .select('*')
                            .order('created_at', { ascending: false })
                            .range(from, to)
                    );
                }

                const results = await Promise.all(promises);
                results.forEach(({ data, error }) => {
                    if (!error && data) {
                        allData = [...allData, ...data];
                    }
                });
            }

            console.log(`Fetched ${allData.length} SmartLock records (parallel)`);
            setSmartLockData(allData);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoadingSmartLock(false);
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
        if (!isAdmin) {
            toast({ variant: "destructive", title: "Access Denied", description: "Only Administrators can delete records." });
            return;
        }
        try {
            const { error } = await supabase.from('work_trackers').delete().eq('id', id);
            if (error) throw error;

            // Log activity
            logDelete('work_trackers', id, 'Deleted work tracker record');

            // Sync delete to Google Sheets (non-blocking)
            deleteTrackerFromGoogleSheets(id)
                .then((syncResult) => {
                    if (syncResult.success) {
                        console.log('✅ Tracker deleted from Google Sheets');
                    } else {
                        console.warn('⚠️ Google Sheets delete sync failed:', syncResult.error);
                    }
                })
                .catch((syncError) => {
                    console.error('❌ Google Sheets delete sync error:', syncError);
                });

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
                tgl_efektif_transisi: data.tgl_efektif_transisi || null,
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
        if (!canEditPic) return;
        try {
            const { error } = await supabase.from('pic_data').delete().eq('id', id);
            if (error) throw error;

            // Log activity
            logDelete('pic_data', id, 'Deleted PIC record');

            // Sync delete to Google Sheets (non-blocking)
            deletePICFromGoogleSheets(id)
                .then((syncResult) => {
                    if (syncResult.success) {
                        console.log('✅ PIC deleted from Google Sheets');
                    } else {
                        console.warn('⚠️ Google Sheets delete sync failed:', syncResult.error);
                    }
                })
                .catch((syncError) => {
                    console.error('❌ Google Sheets delete sync error:', syncError);
                });

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
        if (!canEditCar) return;
        try {
            const { error } = await supabase.from('car_data').delete().eq('id', id);
            if (error) throw error;

            // Log activity
            logDelete('car_data', id, 'Deleted car record');

            // Sync delete to Google Sheets (non-blocking)
            deleteCarFromGoogleSheets(id)
                .then((syncResult) => {
                    if (syncResult.success) {
                        console.log('✅ Car deleted from Google Sheets');
                    } else {
                        console.warn('⚠️ Google Sheets delete sync failed:', syncResult.error);
                    }
                })
                .catch((syncError) => {
                    console.error('❌ Google Sheets delete sync error:', syncError);
                });

            fetchCarData();
            toast({ title: "Deleted", description: "Car deleted." });
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    // --- CCTV Handlers ---
    const handleCctvDelete = async (id) => {
        if (!canEditCctv) return;
        try {
            const { error } = await supabase.from('cctv_data').delete().eq('id', id);
            if (error) throw error;

            // Log activity
            logDelete('cctv_data', id, 'Deleted CCTV record');

            // Sync delete to Google Sheets (non-blocking)
            deleteCCTVFromGoogleSheets(id)
                .then((syncResult) => {
                    if (syncResult.success) {
                        console.log('✅ Deleted from Google Sheets');
                    } else {
                        console.warn('⚠️ Google Sheets delete sync failed:', syncResult.error);
                    }
                })
                .catch((syncError) => {
                    console.error('❌ Google Sheets delete sync error:', syncError);
                });

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
                const dWaiting = workTrackers.filter(t => t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST').length;
                const dNeedCreated = workTrackers.filter(t => isNeedCreatedBast(t)).length;
                const dProgress = workTrackers.filter(t => t.status_pekerjaan === 'Open').length;
                const dHold = workTrackers.filter(t => t.status_pekerjaan === 'On Hold').length;
                const dActivePic = picData.filter(p => p.validasi === 'Active').length;
                const dTotalCar = carData.length;
                const dActiveCctv = cctvData.filter(c => c.status === 'online').length;

                // Regional BAST Stats (For Admin/AM) - Waiting Approve
                const wJabo1 = workTrackers.filter(t => t.regional === 'Jabo Outer 1' && (t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST')).length;
                const wJabo2 = workTrackers.filter(t => t.regional === 'Jabo Outer 2' && (t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST')).length;
                const wJabo3 = workTrackers.filter(t => t.regional === 'Jabo Outer 3' && (t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST')).length;

                // Regional BAST Stats (For Admin/AM) - Need Created
                const nJabo1 = workTrackers.filter(t => t.regional === 'Jabo Outer 1' && isNeedCreatedBast(t)).length;
                const nJabo2 = workTrackers.filter(t => t.regional === 'Jabo Outer 2' && isNeedCreatedBast(t)).length;
                const nJabo3 = workTrackers.filter(t => t.regional === 'Jabo Outer 3' && isNeedCreatedBast(t)).length;

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
                    <div className="space-y-6" data-dashboard-content>
                        {/* Enhanced Dashboard Header */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/10">
                                    <Activity className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Overview</h2>
                                    <p className="text-sm text-muted-foreground">Ringkasan data dan statistik terkini</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {isSPV && userRegional && (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20">
                                        <MapPin className="w-3.5 h-3.5 mr-1.5" />
                                        {userRegional}
                                    </span>
                                )}
                                <DashboardExport
                                    title="Dashboard Report"
                                    stats={{
                                        'Waiting Approve BAST': dWaiting,
                                        'Open': dProgress,
                                        'On Hold': dHold,
                                        'PIC Aktif': dActivePic,
                                        'Total Mobil': dTotalCar,
                                        'CCTV Online': dActiveCctv,
                                    }}
                                    tableData={workTrackers.filter(t => t.status_pekerjaan !== 'Close').slice(0, 50)}
                                    tableColumns={[
                                        { key: 'site_name', header: 'Site Name' },
                                        { key: 'regional', header: 'Regional' },
                                        { key: 'status_pekerjaan', header: 'Status' },
                                        { key: 'status_bast', header: 'BAST' },
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Summary Card */}
                        <MeetingSummary workTrackers={workTrackers} picData={picData} carData={carData} cctvData={cctvData} />

                        {/* Charts Section - Enhanced with hover effects */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* PIC Aktif per Regional - Donut Chart */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group bg-card border rounded-xl p-6 shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all duration-300"
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 rounded-lg bg-purple-500/10">
                                        <UsersIcon className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold">PIC Aktif per Regional</h3>
                                </div>
                                <div className="h-[280px] min-w-0">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={200}>
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
                                        <div key={idx} className="text-center group/item cursor-default" title={item.name}>
                                            <p className="text-2xl font-bold transition-transform group-hover/item:scale-110" style={{ color: item.fill }}>{item.value}</p>
                                            <p className="text-xs text-muted-foreground">{item.name.replace('Jabo Outer ', 'JO ')}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* CCTV Status - Bar Chart */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="group bg-card border rounded-xl p-6 shadow-sm hover:shadow-md hover:border-green-500/30 transition-all duration-300"
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 rounded-lg bg-green-500/10">
                                        <Camera className="w-4 h-4 text-green-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold">Status CCTV</h3>
                                </div>
                                <div className="h-[280px] min-w-0">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={200}>
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
                                        <div key={idx} className="flex items-center gap-2 cursor-default group/item" title={`${item.name}: ${item.value}`}>
                                            <div className="w-3 h-3 rounded-full transition-transform group-hover/item:scale-125" style={{ backgroundColor: item.fill }}></div>
                                            <span className="text-sm">{item.name}: <span className="font-bold">{item.value}</span></span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>



                        {/* Active Jobs Table - Full Width - Enhanced */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                        >
                            <div className="p-6 border-b bg-gradient-to-r from-orange-500/5 to-transparent flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-orange-500/10">
                                        <Briefcase className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">Active Jobs</h3>
                                        <p className="text-xs text-muted-foreground">Waiting Approve BAST / On Hold / Open</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    {dashFilteredTrackers.length} records
                                </Badge>
                            </div>

                            {/* Dashboard Filters - Enhanced styling */}
                            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-muted/30 p-4 border-b">
                                <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto flex-1 flex-wrap">
                                    <Input
                                        placeholder="Search Site ID or Name..."
                                        className="w-full md:w-48 lg:w-64"
                                        value={dashSearch}
                                        onChange={e => setDashSearch(e.target.value)}
                                    />
                                    {!isSPV && (
                                        <Select value={dashRegion} onValueChange={setDashRegion}>
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
                                    )}
                                    <Select value={dashStatusPekerjaan} onValueChange={setDashStatusPekerjaan}>
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
                                    <Select value={dashBast} onValueChange={setDashBast}>
                                        <SelectTrigger className="w-full md:w-[150px]">
                                            <SelectValue placeholder="Status BAST" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All BAST Status</SelectItem>
                                            <SelectItem value="Need Created BAST">Need Created BAST</SelectItem>
                                            <SelectItem value="Waiting Approve">Waiting Approve</SelectItem>
                                            <SelectItem value="Approve">Approve</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {(dashSearch || dashRegion !== 'all' || dashBast !== 'all' || dashStatusPekerjaan !== 'all') && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setDashSearch('');
                                                setDashRegion('all');
                                                setDashBast('all');
                                                setDashStatusPekerjaan('all');
                                            }}
                                            className="px-3"
                                            title="Reset Filters"
                                        >
                                            Reset
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="px-4 pb-4">
                                <WorkTrackerTable
                                    data={dashFilteredTrackers}
                                    isReadOnly={true}
                                />
                            </div>
                        </motion.div>
                    </div>
                );
            case 'tracker':
                // Compute summary counts
                const total = workTrackers.length;
                const waitingBast = workTrackers.filter(t => t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST').length;
                const needCreatedBast = workTrackers.filter(t => isNeedCreatedBast(t)).length;
                const approvedBast = workTrackers.filter(t => t.status_bast === 'Approve' || t.status_bast === 'BAST Approve Date').length;
                const onProgress = workTrackers.filter(t => t.status_pekerjaan === 'Open').length;
                const onHold = workTrackers.filter(t => t.status_pekerjaan === 'On Hold').length;
                const closedWork = workTrackers.filter(t => t.status_pekerjaan === 'Close').length;

                // Waiting BAST per Regional
                const waitingJabo1 = workTrackers.filter(t => t.status_bast === 'Waiting Approve' && t.regional === 'Jabo Outer 1').length;
                const waitingJabo2 = workTrackers.filter(t => t.status_bast === 'Waiting Approve' && t.regional === 'Jabo Outer 2').length;
                const waitingJabo3 = workTrackers.filter(t => t.status_bast === 'Waiting Approve' && t.regional === 'Jabo Outer 3').length;

                // Summary for Reguler and Survey
                const regulerData = workTrackers.filter(t => t.suspected === 'Reguler');
                const surveyData = workTrackers.filter(t => t.suspected === 'Survey');

                const regulerOpen = regulerData.filter(t => t.status_pekerjaan === 'Open').length;
                const regulerBastApprove = regulerData.filter(t => t.status_bast === 'Approve' || t.status_bast === 'BAST Approve Date').length;
                const regulerWaitingApprove = regulerData.filter(t => t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST').length;

                const surveyOpen = surveyData.filter(t => t.status_pekerjaan === 'Open').length;
                const surveyBastApprove = surveyData.filter(t => t.status_bast === 'Approve' || t.status_bast === 'BAST Approve Date').length;
                const surveyWaitingApprove = surveyData.filter(t => t.status_bast === 'Waiting Approve' || t.status_bast === 'Waiting Approve BAST').length;

                // Percentage helper
                const pct = (val, t) => t > 0 ? ((val / t) * 100).toFixed(1) : '0.0';

                return (
                    <div className="space-y-6">
                        {/* Summary Card - Consistent Style */}
                        <Card className="border-2 border-primary/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center justify-between text-lg">
                                    <span className="flex items-center gap-2">
                                        <Briefcase className="w-5 h-5" />
                                        Work Tracker Summary
                                    </span>
                                    <span className="text-sm font-normal text-muted-foreground">
                                        Total: {total} pekerjaan
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0 }}
                                        className="p-3 rounded-lg bg-blue-500/10"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Total</p>
                                                <p className="text-xl font-bold text-blue-600">{total}</p>
                                                <p className="text-[9px] text-muted-foreground">100%</p>
                                            </div>
                                            <Briefcase className="w-4 h-4 text-blue-600 opacity-50" />
                                        </div>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.05 }}
                                        className="p-3 rounded-lg bg-green-500/10"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Open</p>
                                                <p className="text-xl font-bold text-green-600">{onProgress}</p>
                                                <p className="text-[9px] text-green-600">{pct(onProgress, total)}%</p>
                                            </div>
                                            <PlayCircle className="w-4 h-4 text-green-600 opacity-50" />
                                        </div>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 }}
                                        className={`relative p-3 rounded-lg bg-yellow-500/10 ${onHold > 0 ? 'ring-2 ring-yellow-500/50' : ''}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">On Hold</p>
                                                <p className="text-xl font-bold text-yellow-600">{onHold}</p>
                                                <p className="text-[9px] text-yellow-600">{pct(onHold, total)}%</p>
                                            </div>
                                            <PauseCircle className="w-4 h-4 text-yellow-600 opacity-50" />
                                        </div>
                                        {onHold > 0 && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                        )}
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.15 }}
                                        className="p-3 rounded-lg bg-emerald-500/10"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">BAST Approve</p>
                                                <p className="text-xl font-bold text-emerald-600">{approvedBast}</p>
                                                <p className="text-[9px] text-emerald-600">{pct(approvedBast, total)}%</p>
                                            </div>
                                            <CheckCircle className="w-4 h-4 text-emerald-600 opacity-50" />
                                        </div>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className={`relative p-3 rounded-lg bg-purple-500/10 ${needCreatedBast > 0 ? 'ring-2 ring-purple-500/50' : ''}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Need BAST</p>
                                                <p className="text-xl font-bold text-purple-600">{needCreatedBast}</p>
                                                <p className="text-[9px] text-purple-600">{pct(needCreatedBast, total)}%</p>
                                            </div>
                                            <FileText className="w-4 h-4 text-purple-600 opacity-50" />
                                        </div>
                                        {needCreatedBast > 0 && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                                        )}
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.25 }}
                                        className={`relative p-3 rounded-lg bg-amber-500/10 ${waitingBast > 0 ? 'ring-2 ring-amber-500/50' : ''}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Waiting BAST</p>
                                                <p className="text-xl font-bold text-amber-600">{waitingBast}</p>
                                                <p className="text-[9px] text-amber-600">{pct(waitingBast, total)}%</p>
                                            </div>
                                            <Clock className="w-4 h-4 text-amber-600 opacity-50" />
                                        </div>
                                        {waitingBast > 0 && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                                        )}
                                    </motion.div>
                                </div>

                                {/* Reguler & Survey Summary */}
                                {!isSPV && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-blue-600" />
                                            Summary per Jenis Pekerjaan
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Reguler Summary */}
                                            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-medium text-blue-700 dark:text-blue-400">Reguler</span>
                                                    <span className="text-sm text-muted-foreground">{regulerData.length} total</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="text-center p-2 rounded bg-green-500/10">
                                                        <p className="text-[10px] text-muted-foreground">Open</p>
                                                        <p className="text-lg font-bold text-green-600">{regulerOpen}</p>
                                                        <p className="text-[9px] text-green-600">{pct(regulerOpen, regulerData.length)}%</p>
                                                    </div>
                                                    <div className="text-center p-2 rounded bg-emerald-500/10">
                                                        <p className="text-[10px] text-muted-foreground">BAST Approve</p>
                                                        <p className="text-lg font-bold text-emerald-600">{regulerBastApprove}</p>
                                                        <p className="text-[9px] text-emerald-600">{pct(regulerBastApprove, regulerData.length)}%</p>
                                                    </div>
                                                    <div className="text-center p-2 rounded bg-amber-500/10">
                                                        <p className="text-[10px] text-muted-foreground">Waiting Approve</p>
                                                        <p className="text-lg font-bold text-amber-600">{regulerWaitingApprove}</p>
                                                        <p className="text-[9px] text-amber-600">{pct(regulerWaitingApprove, regulerData.length)}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Survey Summary */}
                                            <div className="p-4 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="font-medium text-cyan-700 dark:text-cyan-400">Survey</span>
                                                    <span className="text-sm text-muted-foreground">{surveyData.length} total</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="text-center p-2 rounded bg-emerald-500/10">
                                                        <p className="text-[10px] text-muted-foreground">BAST Approve</p>
                                                        <p className="text-lg font-bold text-emerald-600">{surveyBastApprove}</p>
                                                        <p className="text-[9px] text-emerald-600">{pct(surveyBastApprove, surveyData.length)}%</p>
                                                    </div>
                                                    <div className="text-center p-2 rounded bg-amber-500/10">
                                                        <p className="text-[10px] text-muted-foreground">Waiting Approve</p>
                                                        <p className="text-lg font-bold text-amber-600">{surveyWaitingApprove}</p>
                                                        <p className="text-[9px] text-amber-600">{pct(surveyWaitingApprove, surveyData.length)}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}


                            </CardContent>
                        </Card>

                        {/* Filters & Actions */}
                        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-card p-4 rounded-xl border shadow-sm">
                            <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto flex-1 flex-wrap">
                                <Input
                                    placeholder="Search Site ID or Name..."
                                    className="w-full md:w-48 lg:w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {!isSPV && (
                                    <Select value={regionalFilter} onValueChange={setRegionalFilter}>
                                        <SelectTrigger className="w-full md:w-[150px]">
                                            <SelectValue placeholder="Regional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Regional</SelectItem>
                                            <SelectItem value="Jabo Outer">Jabo Outer (All)</SelectItem>
                                            <SelectItem value="Jabo Outer 1">Jabo Outer 1</SelectItem>
                                            <SelectItem value="Jabo Outer 2">Jabo Outer 2</SelectItem>
                                            <SelectItem value="Jabo Outer 3">Jabo Outer 3</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
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
                                        <SelectItem value="Need Created BAST">Need Created BAST</SelectItem>
                                        <SelectItem value="Waiting Approve">Waiting Approve</SelectItem>
                                        <SelectItem value="Approve">Approve</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={suspectedFilter} onValueChange={setSuspectedFilter}>
                                    <SelectTrigger className="w-full md:w-[150px]">
                                        <SelectValue placeholder="Suspected" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Suspected</SelectItem>
                                        <SelectItem value="Reguler">Reguler</SelectItem>
                                        <SelectItem value="Survey">Survey</SelectItem>
                                        <SelectItem value="Delivery">Delivery</SelectItem>
                                        <SelectItem value="Lumpsum">Lumpsum</SelectItem>
                                    </SelectContent>
                                </Select>
                                {(searchTerm || regionalFilter !== 'all' || statusFilter !== 'all' || bastFilter !== 'all' || suspectedFilter !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setRegionalFilter('all');
                                            setStatusFilter('all');
                                            setBastFilter('all');
                                            setSuspectedFilter('all');
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
                                    <ExportDropdown
                                        data={filteredTrackers}
                                        filename="tracker-data"
                                        title="Work Tracker Data"
                                    />
                                    <Button
                                        onClick={() => navigate('/admin/input-tracker', { state: { returnUrl: getCurrentUrl() } })}
                                        size="icon"
                                        title="Input Data Tracker"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Bulk Operations */}
                        {selectedTrackerIds.length > 0 && (
                            <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {selectedTrackerIds.length} item(s) selected
                                    </span>
                                    <div className="flex gap-2">
                                        <Suspense fallback={<ComponentLoader />}>
                                            <BulkOperations
                                                selectedIds={selectedTrackerIds}
                                                tableName="work_trackers"
                                                onComplete={() => {
                                                    setSelectedTrackerIds([]);
                                                    fetchTrackers();
                                                }}
                                                data={filteredTrackers}
                                            />
                                        </Suspense>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedTrackerIds([])}
                                        >
                                            Clear Selection
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Table Content */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card shadow">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h2 className="text-lg font-semibold">
                                    Data Trackers <span className="text-sm font-normal text-muted-foreground ml-2">({filteredTrackers.length} records)</span>
                                </h2>
                            </div>
                            <div className="p-6">
                                {isLoadingTrackers ? (
                                    <TableSkeleton rows={10} columns={8} />
                                ) : (
                                    <WorkTrackerTable
                                        data={filteredTrackers}
                                        onEdit={(t) => navigate(`/admin/edit-tracker/${t.id}`, { state: { returnUrl: getCurrentUrl() } })}
                                        onDelete={handleTrackerDelete}
                                        onRefresh={fetchTrackers}
                                        isReadOnly={!canEditTracker}
                                        enableInlineEdit={canEditTracker}
                                        enableSelection={canEditTracker}
                                        selectedIds={selectedTrackerIds}
                                        onSelectionChange={setSelectedTrackerIds}
                                    />
                                )}
                            </div>
                        </motion.div>
                    </div>
                );
            case 'pic':
                const totalPic = picData.length;
                const activePic = picData.filter(p => p.validasi === 'Active').length;
                const inactivePic = picData.filter(p => p.validasi === 'Inactive').length;

                // Percentage helper for PIC
                const picPct = (val, t) => t > 0 ? ((val / t) * 100).toFixed(1) : '0.0';

                // Count per jabatan - only count Active PICs
                const jabatanCounts = picData.filter(p => p.validasi === 'Active').reduce((acc, p) => {
                    const jabatan = p.jabatan || 'Unknown';
                    acc[jabatan] = (acc[jabatan] || 0) + 1;
                    return acc;
                }, {});

                // Count per regional
                const regionalCounts = {
                    'Jabo Outer 1': picData.filter(p => p.regional === 'Jabo Outer 1' && p.validasi === 'Active').length,
                    'Jabo Outer 2': picData.filter(p => p.regional === 'Jabo Outer 2' && p.validasi === 'Active').length,
                    'Jabo Outer 3': picData.filter(p => p.regional === 'Jabo Outer 3' && p.validasi === 'Active').length,
                };

                return (
                    <div className="space-y-6">
                        {canEditPic ? (
                            <>
                                {/* Summary Card - Consistent Style */}
                                <Card className="border-2 border-primary/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center justify-between text-lg">
                                            <span className="flex items-center gap-2">
                                                <UsersIcon className="w-5 h-5" />
                                                Data PIC Summary
                                            </span>
                                            <span className="text-sm font-normal text-muted-foreground">
                                                Total: {totalPic} PIC
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                            {/* Total Card */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0 }}
                                                className="p-3 rounded-lg bg-blue-500/10"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">Total</p>
                                                        <p className="text-xl font-bold text-blue-600">{totalPic}</p>
                                                        <p className="text-[9px] text-muted-foreground">100%</p>
                                                    </div>
                                                    <UsersIcon className="w-4 h-4 text-blue-600 opacity-50" />
                                                </div>
                                            </motion.div>
                                            {/* Active Card */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.05 }}
                                                className="p-3 rounded-lg bg-green-500/10"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">Active</p>
                                                        <p className="text-xl font-bold text-green-600">{activePic}</p>
                                                        <p className="text-[9px] text-green-600">{picPct(activePic, totalPic)}%</p>
                                                    </div>
                                                    <CheckCircle className="w-4 h-4 text-green-600 opacity-50" />
                                                </div>
                                            </motion.div>
                                            {/* Regional Cards */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.1 }}
                                                className="p-3 rounded-lg bg-purple-500/10"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">JO 1 Aktif</p>
                                                        <p className="text-xl font-bold text-purple-600">{regionalCounts['Jabo Outer 1']}</p>
                                                        <p className="text-[9px] text-purple-600">{picPct(regionalCounts['Jabo Outer 1'], activePic)}%</p>
                                                    </div>
                                                    <MapPin className="w-4 h-4 text-purple-600 opacity-50" />
                                                </div>
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.15 }}
                                                className="p-3 rounded-lg bg-amber-500/10"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">JO 2 Aktif</p>
                                                        <p className="text-xl font-bold text-amber-600">{regionalCounts['Jabo Outer 2']}</p>
                                                        <p className="text-[9px] text-amber-600">{picPct(regionalCounts['Jabo Outer 2'], activePic)}%</p>
                                                    </div>
                                                    <MapPin className="w-4 h-4 text-amber-600 opacity-50" />
                                                </div>
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="p-3 rounded-lg bg-teal-500/10"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">JO 3 Aktif</p>
                                                        <p className="text-xl font-bold text-teal-600">{regionalCounts['Jabo Outer 3']}</p>
                                                        <p className="text-[9px] text-teal-600">{picPct(regionalCounts['Jabo Outer 3'], activePic)}%</p>
                                                    </div>
                                                    <MapPin className="w-4 h-4 text-teal-600 opacity-50" />
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* Jabatan Distribution - Full Width with Percentages */}
                                        <div className="mt-4 pt-4 border-t">
                                            <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                                <Briefcase className="w-4 h-4 text-indigo-600" />
                                                Distribusi Jabatan (Active PIC)
                                            </p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                                {Object.entries(jabatanCounts).sort((a, b) => b[1] - a[1]).map(([jabatan, count], idx) => {
                                                    // Calculate per regional for this jabatan
                                                    const jo1 = picData.filter(p => p.validasi === 'Active' && p.jabatan === jabatan && p.regional === 'Jabo Outer 1').length;
                                                    const jo2 = picData.filter(p => p.validasi === 'Active' && p.jabatan === jabatan && p.regional === 'Jabo Outer 2').length;
                                                    const jo3 = picData.filter(p => p.validasi === 'Active' && p.jabatan === jabatan && p.regional === 'Jabo Outer 3').length;

                                                    const colorClasses = [
                                                        'bg-indigo-500/10 text-indigo-600',
                                                        'bg-blue-500/10 text-blue-600',
                                                        'bg-cyan-500/10 text-cyan-600',
                                                        'bg-violet-500/10 text-violet-600',
                                                        'bg-fuchsia-500/10 text-fuchsia-600',
                                                        'bg-pink-500/10 text-pink-600',
                                                        'bg-rose-500/10 text-rose-600',
                                                    ];
                                                    const colorClass = colorClasses[idx % colorClasses.length];

                                                    return (
                                                        <motion.div
                                                            key={jabatan}
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: idx * 0.03 }}
                                                            className={`p-3 rounded-lg ${colorClass.split(' ')[0]}`}
                                                        >
                                                            <div className="flex flex-col">
                                                                <div className="flex items-baseline justify-between">
                                                                    <p className={`text-2xl font-bold ${colorClass.split(' ')[1]}`}>{count}</p>
                                                                    <p className={`text-[9px] ${colorClass.split(' ')[1]}`}>{picPct(count, activePic)}%</p>
                                                                </div>
                                                                <p className="text-xs font-medium text-muted-foreground truncate" title={jabatan}>{jabatan}</p>
                                                                <div className="mt-2 pt-2 border-t border-current/10 grid grid-cols-3 gap-1 text-[10px]">
                                                                    <div className="text-center">
                                                                        <p className="font-semibold">{jo1}</p>
                                                                        <p className="text-muted-foreground">JO1</p>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="font-semibold">{jo2}</p>
                                                                        <p className="text-muted-foreground">JO2</p>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="font-semibold">{jo3}</p>
                                                                        <p className="text-muted-foreground">JO3</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* MBP Requirements Planning 2026 */}
                                <Card className="border-2 border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center justify-between text-lg">
                                            <span className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
                                                <AlertCircle className="w-5 h-5" />
                                                📋 Transition Planning PIC MBP 2026
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {/* Dynamic Period based on current date */}
                                        {(() => {
                                            // Period Jan-Mar 2026 has been completed, now showing Apr-Dec 2026
                                            const periodLabel = 'Periode Apr - Des 2026';
                                            const targetCount = 7;
                                            const joTargets = { jo1: 3, jo2: 2, jo3: 2 };

                                            // Helper function for MBP jabatan matching
                                            const isMBP = (jabatan) => {
                                                if (!jabatan) return false;
                                                const j = jabatan.toLowerCase();
                                                return j.includes('mbp') || j.includes('expert genset');
                                            };

                                            return (
                                                <>
                                                    <div className="mb-6">
                                                        <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-500 mb-3">
                                                            {periodLabel} (Target: {targetCount} PIC MBP)
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            {/* JO 1 */}
                                                            <div className="p-4 rounded-lg bg-white/50 dark:bg-card border">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-sm font-medium">JO 1</span>
                                                                    <Badge variant="outline" className="text-amber-600">Target: {joTargets.jo1}</Badge>
                                                                </div>
                                                                {(() => {
                                                                    const jo1MBP = picData.filter(p =>
                                                                        p.validasi === 'Active' &&
                                                                        p.regional === 'Jabo Outer 1' &&
                                                                        isMBP(p.jabatan)
                                                                    ).length;
                                                                    const plannedLayoff = picData.filter(p =>
                                                                        p.validasi === 'Active' &&
                                                                        p.regional === 'Jabo Outer 1' &&
                                                                        p.status_transisi === 'Planned Layoff' &&
                                                                        isMBP(p.jabatan)
                                                                    ).length;
                                                                    const plannedReloc = picData.filter(p =>
                                                                        p.validasi === 'Active' &&
                                                                        p.regional === 'Jabo Outer 1' &&
                                                                        p.status_transisi === 'Planned Reloc' &&
                                                                        isMBP(p.jabatan)
                                                                    ).length;
                                                                    return (
                                                                        <>
                                                                            <p className="text-2xl font-bold text-blue-600">{jo1MBP} <span className="text-sm font-normal text-muted-foreground">saat ini</span></p>
                                                                            <div className="mt-2 space-y-1 text-xs">
                                                                                <p className="text-red-600">🔴 {plannedLayoff} planned layoff</p>
                                                                                <p className="text-amber-600">🟡 {plannedReloc} planned reloc</p>
                                                                            </div>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                            {/* JO 2 */}
                                                            <div className="p-4 rounded-lg bg-white/50 dark:bg-card border">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-sm font-medium">JO 2</span>
                                                                    <Badge variant="outline" className="text-amber-600">Target: {joTargets.jo2}</Badge>
                                                                </div>
                                                                {(() => {
                                                                    const jo2MBP = picData.filter(p =>
                                                                        p.validasi === 'Active' &&
                                                                        p.regional === 'Jabo Outer 2' &&
                                                                        isMBP(p.jabatan)
                                                                    ).length;
                                                                    const plannedLayoff = picData.filter(p =>
                                                                        p.validasi === 'Active' &&
                                                                        p.regional === 'Jabo Outer 2' &&
                                                                        p.status_transisi === 'Planned Layoff' &&
                                                                        isMBP(p.jabatan)
                                                                    ).length;
                                                                    const plannedReloc = picData.filter(p =>
                                                                        p.validasi === 'Active' &&
                                                                        p.regional === 'Jabo Outer 2' &&
                                                                        p.status_transisi === 'Planned Reloc' &&
                                                                        isMBP(p.jabatan)
                                                                    ).length;
                                                                    return (
                                                                        <>
                                                                            <p className="text-2xl font-bold text-blue-600">{jo2MBP} <span className="text-sm font-normal text-muted-foreground">saat ini</span></p>
                                                                            <div className="mt-2 space-y-1 text-xs">
                                                                                <p className="text-red-600">🔴 {plannedLayoff} planned layoff</p>
                                                                                <p className="text-amber-600">🟡 {plannedReloc} planned reloc</p>
                                                                            </div>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                            {/* JO 3 */}
                                                            <div className="p-4 rounded-lg bg-white/50 dark:bg-card border">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-sm font-medium">JO 3</span>
                                                                    <Badge variant="outline" className="text-amber-600">Target: {joTargets.jo3}</Badge>
                                                                </div>
                                                                {(() => {
                                                                    const jo3MBP = picData.filter(p =>
                                                                        p.validasi === 'Active' &&
                                                                        p.regional === 'Jabo Outer 3' &&
                                                                        isMBP(p.jabatan)
                                                                    ).length;
                                                                    const plannedLayoff = picData.filter(p =>
                                                                        p.validasi === 'Active' &&
                                                                        p.regional === 'Jabo Outer 3' &&
                                                                        p.status_transisi === 'Planned Layoff' &&
                                                                        isMBP(p.jabatan)
                                                                    ).length;
                                                                    const plannedReloc = picData.filter(p =>
                                                                        p.validasi === 'Active' &&
                                                                        p.regional === 'Jabo Outer 3' &&
                                                                        p.status_transisi === 'Planned Reloc' &&
                                                                        isMBP(p.jabatan)
                                                                    ).length;
                                                                    return (
                                                                        <>
                                                                            <p className="text-2xl font-bold text-blue-600">{jo3MBP} <span className="text-sm font-normal text-muted-foreground">saat ini</span></p>
                                                                            <div className="mt-2 space-y-1 text-xs">
                                                                                <p className="text-red-600">🔴 {plannedLayoff} planned layoff</p>
                                                                                <p className="text-amber-600">🟡 {plannedReloc} planned reloc</p>
                                                                            </div>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Summary Progress */}
                                                    <div className="mb-4 p-3 rounded-lg bg-white/70 dark:bg-card border">
                                                        {(() => {
                                                            const totalMBP = picData.filter(p =>
                                                                p.validasi === 'Active' &&
                                                                isMBP(p.jabatan)
                                                            ).length;
                                                            const plannedLayoff = picData.filter(p =>
                                                                p.validasi === 'Active' &&
                                                                p.status_transisi === 'Planned Layoff' &&
                                                                isMBP(p.jabatan)
                                                            ).length;
                                                            const plannedReloc = picData.filter(p =>
                                                                p.validasi === 'Active' &&
                                                                p.status_transisi === 'Planned Reloc' &&
                                                                isMBP(p.jabatan)
                                                            ).length;
                                                            const afterTransition = totalMBP - plannedLayoff - plannedReloc;
                                                            return (
                                                                <div className="flex flex-wrap gap-4 text-sm">
                                                                    <div>
                                                                        <span className="text-muted-foreground">Total MBP saat ini:</span>
                                                                        <span className="font-bold ml-1">{totalMBP}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-red-600">Planned Layoff:</span>
                                                                        <span className="font-bold ml-1">{plannedLayoff}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-amber-600">Planned Reloc:</span>
                                                                        <span className="font-bold ml-1">{plannedReloc}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-green-600">Setelah transisi:</span>
                                                                        <span className="font-bold ml-1">{afterTransition}</span>
                                                                        <Badge className={afterTransition <= targetCount ? 'ml-2 bg-green-500/20 text-green-700' : 'ml-2 bg-red-500/20 text-red-700'}>
                                                                            Target: {targetCount}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Planned Transitions List */}
                                                    {(() => {
                                                        // Filter only MBP jabatan PICs with planned transitions
                                                        const plannedTransitions = picData.filter(p =>
                                                            p.validasi === 'Active' &&
                                                            (p.status_transisi === 'Planned Layoff' || p.status_transisi === 'Planned Reloc') &&
                                                            isMBP(p.jabatan)
                                                        );
                                                        if (plannedTransitions.length === 0) return null;
                                                        return (
                                                            <div className="mt-4 pt-4 border-t">
                                                                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                                                                    <Clock className="w-4 h-4 text-amber-600" />
                                                                    PIC dengan Rencana Transisi ({plannedTransitions.length})
                                                                </p>
                                                                <div className="max-h-[200px] overflow-y-auto space-y-2">
                                                                    {plannedTransitions.map(p => (
                                                                        <div key={p.id} className="flex items-center justify-between p-2 bg-white/50 dark:bg-card rounded border text-sm">
                                                                            <div>
                                                                                <span className="font-medium">{p.nama_pic}</span>
                                                                                <span className="text-xs text-muted-foreground ml-2">({p.jabatan} - {p.regional})</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <Badge className={p.status_transisi === 'Planned Layoff' ? 'bg-red-500/20 text-red-700' : 'bg-amber-500/20 text-amber-700'}>
                                                                                    {p.status_transisi}
                                                                                </Badge>
                                                                                {p.tgl_efektif_transisi && (
                                                                                    <span className="text-xs text-muted-foreground">
                                                                                        📅 {new Date(p.tgl_efektif_transisi).toLocaleDateString('id-ID')}
                                                                                    </span>
                                                                                )}
                                                                                {p.proposed_jabatan && (
                                                                                    <span className="text-xs text-green-600">→ {p.proposed_jabatan}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>

                                {/* Filters & Actions */}
                                <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-card p-4 rounded-xl border shadow-sm">
                                    <div className="flex flex-col md:flex-row gap-2 w-full xl:w-auto flex-1 flex-wrap">
                                        <Input
                                            placeholder="Search Name or Area..."
                                            className="w-full md:w-48 lg:w-64"
                                            value={picSearchTerm}
                                            onChange={(e) => setPicSearchTerm(e.target.value)}
                                        />
                                        {!isSPV && (
                                            <Select value={picRegionalFilter} onValueChange={setPicRegionalFilter}>
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
                                        )}
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
                                        <ExportDropdown
                                            data={filteredPicData}
                                            filename="pic-data"
                                            title="PIC Data"
                                        />
                                        <Button
                                            onClick={() => navigate('/admin/input-pic', { state: { returnUrl: getCurrentUrl() } })}
                                            size="icon"
                                            title="Input New PIC"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Bulk Operations for PIC */}
                                {selectedPicIds.length > 0 && (
                                    <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                {selectedPicIds.length} item(s) selected
                                            </span>
                                            <div className="flex gap-2">
                                                <Suspense fallback={<ComponentLoader />}>
                                                    <BulkOperations
                                                        selectedIds={selectedPicIds}
                                                        tableName="pic_data"
                                                        type="pic"
                                                        onRefresh={fetchPicData}
                                                        onSelectionChange={setSelectedPicIds}
                                                        data={filteredPicData}
                                                        statusOptions={[
                                                            { value: 'Active', label: 'Active' },
                                                            { value: 'Inactive', label: 'Inactive' }
                                                        ]}
                                                    />
                                                </Suspense>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedPicIds([])}
                                                >
                                                    Clear Selection
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                            onRefresh={fetchPicData}
                                            isReadOnly={false}
                                            enableSelection={canEditPic}
                                            selectedIds={selectedPicIds}
                                            onSelectionChange={setSelectedPicIds}
                                        />
                                    </div>
                                </motion.div>
                            </>
                        ) : (
                            <div className="text-center py-10 bg-card rounded-xl border">
                                <p className="text-muted-foreground">You do not have permission to access PIC Data.</p>
                            </div>
                        )
                        }
                    </div >
                );
            case 'users':
                return canManageUsers ? <UserManagement /> : <div className="p-4">Access Denied</div>;
            case 'car':
                // Car Stats
                const cTotal = carData.length;
                const cActive = carData.filter(c => c.status_mobil === 'AKTIF').length;
                const cNeedService = carData.filter(c => c.status_mobil === 'AKTIF' && c.condition === 'NEED SERVICE').length;
                const cExpired = carData.filter(c => {
                    if (c.status_mobil !== 'AKTIF') return false;
                    const today = new Date();
                    const stnk = c.masa_berlaku_stnk ? new Date(c.masa_berlaku_stnk) < today : false;
                    const pajak = c.masa_berlaku_pajak ? new Date(c.masa_berlaku_pajak) < today : false;
                    const kir = c.masa_berlaku_kir ? new Date(c.masa_berlaku_kir) < today : false;
                    return stnk || pajak || kir;
                }).length;

                // Percentage helper
                const carPct = (val, base) => base > 0 ? ((val / base) * 100).toFixed(1) : '0.0';

                return (
                    <div className="space-y-6">
                        {canEditCar ? (
                            <>
                                {/* Car Summary Card - Consistent Style */}
                                <Card className="border-2 border-primary/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center justify-between text-lg">
                                            <span className="flex items-center gap-2">
                                                <Truck className="w-5 h-5" />
                                                Data Kendaraan Summary
                                            </span>
                                            <span className="text-sm font-normal text-muted-foreground">
                                                Total: {cTotal} unit
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-3">
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0 }}
                                                className="p-3 rounded-lg bg-green-500/10"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">Aktif</p>
                                                        <p className="text-xl font-bold text-green-600">{cActive}</p>
                                                        <p className="text-[10px] text-muted-foreground">{carPct(cActive, cTotal)}% dari total</p>
                                                    </div>
                                                    <CheckCircle className="w-4 h-4 text-green-600 opacity-50" />
                                                </div>
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.05 }}
                                                className={`relative p-3 rounded-lg bg-red-500/10 ${cNeedService > 0 ? 'ring-2 ring-red-500/50' : ''}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">Need Service</p>
                                                        <p className="text-xl font-bold text-red-600">{cNeedService}</p>
                                                        <p className="text-[10px] text-muted-foreground">{carPct(cNeedService, cActive)}% dari aktif</p>
                                                    </div>
                                                    <AlertCircle className="w-4 h-4 text-red-600 opacity-50" />
                                                </div>
                                                {cNeedService > 0 && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                )}
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.1 }}
                                                className={`relative p-3 rounded-lg bg-orange-500/10 ${cExpired > 0 ? 'ring-2 ring-orange-500/50' : ''}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">Dok. Expired</p>
                                                        <p className="text-xl font-bold text-orange-600">{cExpired}</p>
                                                        <p className="text-[10px] text-muted-foreground">{carPct(cExpired, cActive)}% dari aktif</p>
                                                    </div>
                                                    <Clock className="w-4 h-4 text-orange-600 opacity-50" />
                                                </div>
                                                {cExpired > 0 && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                                )}
                                            </motion.div>
                                        </div>

                                        {/* Kendaraan per Regional */}
                                        {!isSPV && (
                                            <div className="mt-4 pt-4 border-t">
                                                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                                    <Truck className="w-4 h-4 text-blue-600" />
                                                    Kendaraan per Regional
                                                </p>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'].map((reg, idx) => {
                                                        const activeCount = carData.filter(c => c.area === reg && c.status_mobil === 'AKTIF').length;
                                                        const needServiceCount = carData.filter(c => c.area === reg && c.status_mobil === 'AKTIF' && c.condition === 'NEED SERVICE').length;
                                                        return (
                                                            <div key={reg} className="p-3 rounded-lg bg-blue-500/10">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-xs text-muted-foreground">JO {idx + 1}</span>
                                                                    <span className="text-lg font-bold text-green-600">{activeCount}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-green-600">aktif</span>
                                                                    {needServiceCount > 0 && (
                                                                        <span className="text-red-600 font-medium">{needServiceCount} service</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Car Filters */}
                                <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
                                    <Input
                                        placeholder="Search Polisi, Brand, Model..."
                                        className="w-full md:w-64"
                                        value={carSearchTerm}
                                        onChange={e => setCarSearchTerm(e.target.value)}
                                    />
                                    {!isSPV && (
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
                                    )}
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
                                    {(carSearchTerm || carRegionalFilter !== 'all' || carFilterCondition !== 'all' || carPriorityFilter !== 'all') && (
                                        <Button variant="ghost" onClick={() => { setCarSearchTerm(''); setCarRegionalFilter('all'); setCarPriorityFilter('all'); setCarFilterCondition('all'); }}>
                                            Reset
                                        </Button>
                                    )}

                                    <div className="flex gap-2 ml-auto">
                                        <ExportDropdown
                                            data={filteredCarData}
                                            filename="car-data"
                                            title="Car Data"
                                        />
                                        <Button
                                            onClick={() => navigate('/admin/input-car', { state: { returnUrl: getCurrentUrl() } })}
                                            size="icon"
                                            title="Input Data Mobil"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card shadow">
                                    <div className="p-6 border-b">
                                        <h2 className="text-lg font-semibold">
                                            Data Mobil <span className="text-sm font-normal text-muted-foreground ml-2">({filteredCarData.length} records)</span>
                                        </h2>
                                    </div>

                                    {/* Bulk Operations for Car */}
                                    {selectedCarIds.length > 0 && (
                                        <div className="p-4 bg-primary/5 border-b border-primary/20">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">
                                                    {selectedCarIds.length} item(s) selected
                                                </span>
                                                <div className="flex gap-2">
                                                    <BulkOperations
                                                        selectedIds={selectedCarIds}
                                                        tableName="car_data"
                                                        type="car"
                                                        onRefresh={fetchCarData}
                                                        onSelectionChange={setSelectedCarIds}
                                                        data={filteredCarData}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedCarIds([])}
                                                    >
                                                        Clear Selection
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-6">
                                        <CarDataTable
                                            data={filteredCarData}
                                            onEdit={(c) => navigate(`/admin/edit-car/${c.id}`, { state: { returnUrl: getCurrentUrl() } })}
                                            onDelete={handleCarDelete}
                                            onRefresh={fetchCarData}
                                            isReadOnly={false}
                                            picData={picData}
                                            enableSelection={true}
                                            selectedIds={selectedCarIds}
                                            onSelectionChange={setSelectedCarIds}
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
                                {/* CCTV Summary Card - Consistent Style */}
                                <Card className="border-2 border-primary/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center justify-between text-lg">
                                            <span className="flex items-center gap-2">
                                                <Camera className="w-5 h-5" />
                                                CCTV Data Summary
                                            </span>
                                            <span className="text-sm font-normal text-muted-foreground">
                                                Total: {cctvTotal} unit
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0 }}
                                                className="p-3 rounded-lg bg-blue-500/10"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">Total</p>
                                                        <p className="text-xl font-bold text-blue-600">{cctvTotal}</p>
                                                        <p className="text-[9px] text-muted-foreground">100%</p>
                                                    </div>
                                                    <Camera className="w-4 h-4 text-blue-600 opacity-50" />
                                                </div>
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.05 }}
                                                className="p-3 rounded-lg bg-green-500/10"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">Online</p>
                                                        <p className="text-xl font-bold text-green-600">{cctvOnline}</p>
                                                        <p className="text-[9px] text-green-600">{cctvTotal > 0 ? ((cctvOnline / cctvTotal) * 100).toFixed(1) : 0}%</p>
                                                    </div>
                                                    <Wifi className="w-4 h-4 text-green-600 opacity-50" />
                                                </div>
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.1 }}
                                                className={`relative p-3 rounded-lg bg-yellow-500/10 ${cctvOffline > 0 ? 'ring-2 ring-yellow-500/50' : ''}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">Offline</p>
                                                        <p className="text-xl font-bold text-yellow-600">{cctvOffline}</p>
                                                        <p className="text-[9px] text-yellow-600">{cctvTotal > 0 ? ((cctvOffline / cctvTotal) * 100).toFixed(1) : 0}%</p>
                                                    </div>
                                                    <WifiOff className="w-4 h-4 text-yellow-600 opacity-50" />
                                                </div>
                                                {cctvOffline > 0 && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                                )}
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.15 }}
                                                className={`relative p-3 rounded-lg bg-red-500/10 ${cctvBroken > 0 ? 'ring-2 ring-red-500/50' : ''}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">Broken</p>
                                                        <p className="text-xl font-bold text-red-600">{cctvBroken}</p>
                                                        <p className="text-[9px] text-red-600">{cctvTotal > 0 ? ((cctvBroken / cctvTotal) * 100).toFixed(1) : 0}%</p>
                                                    </div>
                                                    <AlertCircle className="w-4 h-4 text-red-600 opacity-50" />
                                                </div>
                                                {cctvBroken > 0 && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                )}
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className={`relative p-3 rounded-lg bg-purple-500/10 ${cctvStolen > 0 ? 'ring-2 ring-purple-500/50' : ''}`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground">Stolen</p>
                                                        <p className="text-xl font-bold text-purple-600">{cctvStolen}</p>
                                                        <p className="text-[9px] text-purple-600">{cctvTotal > 0 ? ((cctvStolen / cctvTotal) * 100).toFixed(1) : 0}%</p>
                                                    </div>
                                                    <XCircle className="w-4 h-4 text-purple-600 opacity-50" />
                                                </div>
                                                {cctvStolen > 0 && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                                                )}
                                            </motion.div>
                                        </div>

                                        {/* CCTV per Regional */}
                                        {!isSPV && (
                                            <div className="mt-4 pt-4 border-t">
                                                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                                    <Camera className="w-4 h-4 text-blue-600" />
                                                    CCTV per Regional
                                                </p>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'].map((reg, idx) => {
                                                        const count = cctvData.filter(c => c.regional === reg).length;
                                                        const onlineCount = cctvData.filter(c => c.regional === reg && c.status === 'online').length;
                                                        const offlineCount = cctvData.filter(c => c.regional === reg && c.status === 'offline').length;
                                                        const brokenCount = cctvData.filter(c => c.regional === reg && c.status === 'broken').length;
                                                        const stolenCount = cctvData.filter(c => c.regional === reg && c.status === 'stolen').length;
                                                        const onlinePercent = count > 0 ? ((onlineCount / count) * 100).toFixed(1) : 0;
                                                        const offlinePercent = count > 0 ? ((offlineCount / count) * 100).toFixed(1) : 0;
                                                        return (
                                                            <div key={reg} className="p-3 rounded-lg bg-blue-500/10">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-xs text-muted-foreground">JO {idx + 1}</span>
                                                                    <span className="text-lg font-bold text-blue-600">{count}</span>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-green-600">{onlineCount} online</span>
                                                                        <span className="text-green-600/70">({onlinePercent}%)</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className="text-yellow-600">{offlineCount} offline</span>
                                                                        <span className="text-yellow-600/70">({offlinePercent}%)</span>
                                                                    </div>
                                                                    <div className="flex gap-2 text-xs">
                                                                        {brokenCount > 0 && (
                                                                            <span className="text-red-600 font-medium">{brokenCount} broken</span>
                                                                        )}
                                                                        {stolenCount > 0 && (
                                                                            <span className="text-purple-600 font-medium">{stolenCount} stolen</span>
                                                                        )}
                                                                        {brokenCount === 0 && stolenCount === 0 && offlineCount === 0 && (
                                                                            <span className="text-green-600">✓ All OK</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* CCTV Filters */}
                                <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
                                    <Input
                                        placeholder="Search Site ID, Name, Merk..."
                                        className="w-full md:w-64"
                                        value={cctvSearchTerm}
                                        onChange={e => setCctvSearchTerm(e.target.value)}
                                    />
                                    {!isSPV && (
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
                                    )}
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
                                        <ExportDropdown
                                            data={filteredCctvData}
                                            filename="cctv-data"
                                            title="CCTV Data"
                                        />
                                        <Button
                                            onClick={() => navigate('/admin/input-cctv', { state: { returnUrl: getCurrentUrl() } })}
                                            size="icon"
                                            title="Input Data CCTV"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Bulk Operations for CCTV */}
                                {selectedCctvIds.length > 0 && (
                                    <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                                {selectedCctvIds.length} item(s) selected
                                            </span>
                                            <div className="flex gap-2">
                                                <Suspense fallback={<ComponentLoader />}>
                                                    <BulkOperations
                                                        selectedIds={selectedCctvIds}
                                                        tableName="cctv_data"
                                                        type="cctv"
                                                        onRefresh={fetchCctvData}
                                                        onSelectionChange={setSelectedCctvIds}
                                                        data={filteredCctvData}
                                                        statusOptions={[
                                                            { value: 'online', label: 'Online' },
                                                            { value: 'offline', label: 'Offline' },
                                                            { value: 'broken', label: 'Broken' },
                                                            { value: 'stolen', label: 'Stolen' }
                                                        ]}
                                                    />
                                                </Suspense>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedCctvIds([])}
                                                >
                                                    Clear Selection
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

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
                                            onRefresh={fetchCctvData}
                                            isReadOnly={false}
                                            enableSelection={canEditCctv}
                                            selectedIds={selectedCctvIds}
                                            onSelectionChange={setSelectedCctvIds}
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
            case 'reports':
                return <ReportBuilder />;
            case 'analytics':
                return (
                    <AnalyticsDashboard
                        workTrackers={workTrackers}
                        picData={picData}
                        carData={carData}
                        cctvData={cctvData}
                    />
                );
            case 'calendar':
                return (
                    <CalendarView
                        workTrackers={workTrackers}
                        carData={carData}
                        cctvData={cctvData}
                    />
                );
            case 'logs':
                return isAdmin ? <ActivityLogs /> : <div className="p-4">Access Denied - Admin Only</div>;
            case 'performance':
                return (
                    <PerformanceMonitoring
                        workTrackers={workTrackers}
                        picData={picData}
                    />
                );
            case 'generate-bast':
                return isAdmin ? (
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <GenerateBAST />
                    </div>
                ) : <div className="p-4">Access Denied - Admin Only</div>;
            case 'generate-atp':
                return (isAdmin || profile?.role === 'AM' || profile?.role?.includes('Jabo')) ? (
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <GenerateATP />
                    </div>
                ) : <div className="p-4">Access Denied - Admin/AM/SPV Only</div>;
            case 'module':
                return (
                    <Suspense fallback={<ComponentLoader />}>
                        <div className="space-y-6">
                            <ModuleSummary moduleData={moduleData} />

                            {/* Bulk Operations for Module */}
                            {selectedModuleIds.length > 0 && (
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            {selectedModuleIds.length} item(s) selected
                                        </span>
                                        <div className="flex gap-2">
                                            <BulkOperations
                                                selectedIds={selectedModuleIds}
                                                tableName="module_tracker"
                                                type="module"
                                                onRefresh={fetchModuleData}
                                                onSelectionChange={setSelectedModuleIds}
                                                data={moduleData}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedModuleIds([])}
                                            >
                                                Clear Selection
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <ModuleDataTable
                                moduleData={moduleData}
                                onRefresh={fetchModuleData}
                                enableSelection={true}
                                selectedIds={selectedModuleIds}
                                onSelectionChange={setSelectedModuleIds}
                            />
                        </div>
                    </Suspense>
                );
            case 'smartlock':
                return (
                    <Suspense fallback={<ComponentLoader />}>
                        <div className="space-y-6">
                            {/* SmartLock Summary - Consistent with ModuleSummary design */}
                            <SmartLockSummary smartLockData={smartLockData} />

                            {/* Bulk Operations for SmartLock */}
                            {selectedSmartLockIds.length > 0 && (
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                            {selectedSmartLockIds.length} item(s) selected
                                        </span>
                                        <div className="flex gap-2">
                                            <BulkOperations
                                                selectedIds={selectedSmartLockIds}
                                                tableName="smartlock_data"
                                                type="smartlock"
                                                onRefresh={fetchSmartLockData}
                                                onSelectionChange={setSelectedSmartLockIds}
                                                data={smartLockData}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedSmartLockIds([])}
                                            >
                                                Clear Selection
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SmartLock Table */}
                            <SmartLockDataTable
                                data={smartLockData}
                                onRefresh={fetchSmartLockData}
                                enableSelection={true}
                                selectedIds={selectedSmartLockIds}
                                onSelectionChange={setSelectedSmartLockIds}
                            />
                        </div>
                    </Suspense>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <Helmet>
                <title>Admin Dashboard | WorkTracker</title>
            </Helmet>



            <Suspense fallback={<ComponentLoader />}>
                {renderContent()}
            </Suspense>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Add padding at bottom for mobile nav */}
            <div className="h-16 md:hidden" />
        </div>
    );
};

export default AdminDashboard;