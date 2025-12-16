import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, Activity, AlertCircle, CheckCircle, Clock, Truck, Users as UsersIcon, Briefcase, PlayCircle, PauseCircle, XCircle, Camera, Wifi, WifiOff, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
const AnalyticsDashboard = React.lazy(() => import('@/components/AnalyticsDashboard'));
const CalendarView = React.lazy(() => import('@/components/CalendarView'));
const PerformanceMonitoring = React.lazy(() => import('@/components/PerformanceMonitoring'));
const EnhancedAuditTrail = React.lazy(() => import('@/components/EnhancedAuditTrail'));
const BulkOperations = React.lazy(() => import('@/components/BulkOperations'));

// Non-lazy (small components)
import { ThemeToggle } from '@/components/ThemeToggle';
import { TableSkeleton, DashboardSkeleton } from '@/components/ui/skeleton';
import NotificationCenter, { AlertSummary } from '@/components/NotificationCenter';

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

    // Selection state for bulk operations
    const [selectedTrackerIds, setSelectedTrackerIds] = useState([]);

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
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <h2 className="text-2xl font-bold">Dashboard Overview</h2>
                            <div className="flex items-center gap-2">
                                {isSPV && userRegional && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                                        Regional: {userRegional}
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

                        {/* Alert Summary */}
                        <AlertSummary workTrackers={workTrackers} carData={carData} />

                        {/* Summary Stats with Icons */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-purple-600">Need Created BAST</p>
                                        <p className="text-2xl font-bold">{dNeedCreated}</p>
                                    </div>
                                    <FileText className="w-8 h-8 text-purple-600 opacity-50" />
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
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-purple-600">PIC Aktif</p>
                                        <p className="text-2xl font-bold">{dActivePic}</p>
                                    </div>
                                    <UsersIcon className="w-8 h-8 text-purple-600 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-teal-600">Data Mobil</p>
                                        <p className="text-2xl font-bold">{dTotalCar}</p>
                                    </div>
                                    <Truck className="w-8 h-8 text-teal-600 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-card border rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-green-600">CCTV Online</p>
                                        <p className="text-2xl font-bold">{dActiveCctv}</p>
                                    </div>
                                    <Camera className="w-8 h-8 text-green-600 opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* Waiting BAST per Regional - Admin/AM Only */}
                        {!isSPV && (
                            <div className="bg-card border rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-yellow-600" />
                                    Waiting Approval BAST per Regional
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-muted/30 rounded-lg border flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground">Jabo Outer 1</span>
                                        <span className="text-2xl font-bold text-primary">{wJabo1}</span>
                                    </div>
                                    <div className="p-4 bg-muted/30 rounded-lg border flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground">Jabo Outer 2</span>
                                        <span className="text-2xl font-bold text-primary">{wJabo2}</span>
                                    </div>
                                    <div className="p-4 bg-muted/30 rounded-lg border flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground">Jabo Outer 3</span>
                                        <span className="text-2xl font-bold text-primary">{wJabo3}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Need Created BAST per Regional - Admin/AM Only */}
                        {!isSPV && (
                            <div className="bg-card border rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-purple-600" />
                                    Need Created BAST per Regional
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground">Jabo Outer 1</span>
                                        <span className="text-2xl font-bold text-purple-600">{nJabo1}</span>
                                    </div>
                                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground">Jabo Outer 2</span>
                                        <span className="text-2xl font-bold text-purple-600">{nJabo2}</span>
                                    </div>
                                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 flex justify-between items-center">
                                        <span className="font-medium text-muted-foreground">Jabo Outer 3</span>
                                        <span className="text-2xl font-bold text-purple-600">{nJabo3}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Charts Section - PIC per Regional and CCTV Status */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* PIC Aktif per Regional - Donut Chart */}
                            <div className="bg-card border rounded-xl p-6 shadow-sm">
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
                            </div>

                            {/* CCTV Status - Bar Chart */}
                            <div className="bg-card border rounded-xl p-6 shadow-sm">
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
                            </div>
                        </div>



                        {/* Active Jobs Table - Full Width */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card shadow overflow-hidden">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h3 className="text-lg font-semibold">
                                    Active Jobs (Waiting Approve BAST/On Hold/Open) <span className="text-sm font-normal text-muted-foreground ml-2">({dashFilteredTrackers.length} records)</span>
                                </h3>
                            </div>

                            {/* Dashboard Filters - Same style as Tracker Data */}
                            <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-card p-4 border-b">
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

                return (
                    <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                                        <p className="text-xs text-muted-foreground uppercase font-bold text-purple-600">Need Created</p>
                                        <p className="text-2xl font-bold">{needCreatedBast}</p>
                                    </div>
                                    <FileText className="w-8 h-8 text-purple-600 opacity-50" />
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
            case 'audit-trail':
                return isAdmin ? <EnhancedAuditTrail /> : <div className="p-4">Access Denied - Admin Only</div>;
            case 'generate-bast':
                return isAdmin ? (
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <GenerateBAST />
                    </div>
                ) : <div className="p-4">Access Denied - Admin Only</div>;
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
                <div className="flex items-center gap-2">
                    <NotificationCenter
                        workTrackers={workTrackers}
                        carData={carData}
                        cctvData={cctvData}
                    />
                    <ThemeToggle />
                </div>
            </div>

            <Suspense fallback={<ComponentLoader />}>
                {renderContent()}
            </Suspense>
        </div>
    );
};

export default AdminDashboard;