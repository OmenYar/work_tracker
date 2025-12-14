import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';

const WorkTrackerForm = ({ onSubmit, initialData, onCancel }) => {
    const [siteMaster, setSiteMaster] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isManualInput, setIsManualInput] = useState(false);
    const [errors, setErrors] = useState({});
    const searchTimeoutRef = useRef(null);

    const [formData, setFormData] = useState({
        site_id_1: '',
        site_id_2: '',
        site_name: '',
        regional: '',
        suspected: '',
        customer: '',
        po_number: '',
        tt_number: '',
        main_addwork: '',
        status_pekerjaan: '',
        status_bast: '',
        bast_submit_date: '',
        bast_approve_date: '',
        aging_days: '',
        remark: '',
    });

    // Server-side search function
    const searchSites = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSiteMaster([]);
            return;
        }

        try {
            setIsSearching(true);
            const searchPattern = `%${query}%`;

            const { data, error } = await supabase
                .from('site_master')
                .select('site_id_1, site_id_2, site_name, regional')
                .or(`site_id_1.ilike.${searchPattern},site_id_2.ilike.${searchPattern},site_name.ilike.${searchPattern}`)
                .order('site_id_1', { ascending: true })
                .limit(50);

            if (error) throw error;
            setSiteMaster(data || []);
        } catch (err) {
            console.error('Error searching sites:', err);
            setSiteMaster([]);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Debounced search effect
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.length >= 2 && !isManualInput) {
            searchTimeoutRef.current = setTimeout(() => {
                searchSites(searchQuery);
            }, 300);
        } else {
            setSiteMaster([]);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, searchSites, isManualInput]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                bast_submit_date: initialData.bast_submit_date ? initialData.bast_submit_date.split('T')[0] : '',
                bast_approve_date: initialData.bast_approve_date ? initialData.bast_approve_date.split('T')[0] : '',
            });
            // If initialData has site_name, set search query
            if (initialData.site_name) {
                setSearchQuery(initialData.site_id_1 ? `${initialData.site_id_1} - ${initialData.site_name}` : initialData.site_name);
            }
        }
    }, [initialData]);

    // Auto-calculate aging days
    useEffect(() => {
        if (!formData.bast_submit_date) {
            setFormData(prev => ({ ...prev, aging_days: '' }));
            return;
        }

        const submitDate = new Date(formData.bast_submit_date);
        let diffTime;

        if (formData.bast_approve_date) {
            const approveDate = new Date(formData.bast_approve_date);
            diffTime = approveDate - submitDate;
        } else {
            const today = new Date();
            diffTime = today - submitDate;
        }

        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        setFormData(prev => ({ ...prev, aging_days: diffDays }));
    }, [formData.bast_submit_date, formData.bast_approve_date]);

    // Auto-calculate status_bast based on dates and status_pekerjaan
    useEffect(() => {
        let newStatusBast = '';

        if (formData.status_pekerjaan === 'Close') {
            if (formData.bast_submit_date && formData.bast_approve_date) {
                // Both dates filled = Approve
                newStatusBast = 'Approve';
            } else if (formData.bast_submit_date && !formData.bast_approve_date) {
                // Only submit date = Waiting Approve
                newStatusBast = 'Waiting Approve';
            } else if (!formData.bast_submit_date) {
                // No submit date = Need Created BAST
                newStatusBast = 'Need Created BAST';
            }
        } else if (formData.status_pekerjaan === 'Open' || formData.status_pekerjaan === 'On Hold') {
            // Not closed yet
            newStatusBast = '';
        }

        setFormData(prev => ({ ...prev, status_bast: newStatusBast }));
    }, [formData.status_pekerjaan, formData.bast_submit_date, formData.bast_approve_date]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when field is modified
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSiteSelect = (site) => {
        setFormData(prev => ({
            ...prev,
            site_id_1: site.site_id_1,
            site_id_2: site.site_id_2 || '',
            site_name: site.site_name || '',
            regional: site.regional || ''
        }));
        setSearchQuery(`${site.site_id_1} - ${site.site_name}`);
        setShowSuggestions(false);
        setIsManualInput(false);
    };

    // Enable manual input mode
    const handleUseManualInput = () => {
        setIsManualInput(true);
        setShowSuggestions(false);
        // Use search query as site_name if no site selected
        if (!formData.site_name && searchQuery) {
            setFormData(prev => ({
                ...prev,
                site_name: searchQuery,
                site_id_1: '',
                site_id_2: '',
                regional: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.site_name) {
            newErrors.site_name = 'Site Name wajib diisi';
        }
        if (!formData.suspected) {
            newErrors.suspected = 'Suspected wajib diisi';
        }
        if (!formData.main_addwork) {
            newErrors.main_addwork = 'Main Addwork wajib diisi';
        }
        if (!formData.status_pekerjaan) {
            newErrors.status_pekerjaan = 'Status Pekerjaan wajib diisi';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        onSubmit(formData);
        if (!initialData) {
            setFormData({
                site_id_1: '',
                site_id_2: '',
                site_name: '',
                regional: '',
                suspected: '',
                customer: '',
                po_number: '',
                tt_number: '',
                main_addwork: '',
                status_pekerjaan: '',
                status_bast: '',
                bast_submit_date: '',
                bast_approve_date: '',
                aging_days: '',
                remark: '',
            });
            setSearchQuery('');
            setIsManualInput(false);
        }
    };

    const getStatusBastColor = (status) => {
        switch (status) {
            case 'Approve': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
            case 'Waiting Approve': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
            case 'Need Created BAST': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
            default: return 'text-gray-500 bg-gray-100 dark:bg-gray-900/30';
        }
    };

    return (
        <form onSubmit={handleSubmit} className="py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Identifiers */}
                <div className="space-y-4">
                    {/* Search Site */}
                    <div className="space-y-2">
                        <Label htmlFor="site_search">
                            Search Site <span className="text-muted-foreground text-xs">(atau input manual)</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="site_search"
                                type="text"
                                placeholder="Ketik min. 2 karakter untuk mencari, atau input manual..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (!isManualInput) {
                                        setShowSuggestions(true);
                                    }
                                }}
                                onFocus={() => !isManualInput && setShowSuggestions(true)}
                                className="pr-10"
                            />
                            {isSearching && (
                                <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                            )}
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setShowSuggestions(false);
                                        setIsManualInput(false);
                                        setFormData(prev => ({
                                            ...prev,
                                            site_id_1: '',
                                            site_id_2: '',
                                            site_name: '',
                                            regional: ''
                                        }));
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    ✕
                                </button>
                            )}

                            {/* Suggestions Dropdown */}
                            {showSuggestions && searchQuery.length >= 2 && !isManualInput && (
                                <div className="suggestions-dropdown absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                                    {isSearching ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Mencari site...
                                        </div>
                                    ) : siteMaster.length > 0 ? (
                                        <>
                                            <div className="p-2 text-xs text-muted-foreground border-b bg-muted/50">
                                                Ditemukan {siteMaster.length} site {siteMaster.length === 50 && "(max 50)"}
                                            </div>
                                            {siteMaster.map((site) => (
                                                <button
                                                    key={site.site_id_1}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleSiteSelect(site);
                                                    }}
                                                    className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer border-b last:border-b-0 transition-colors"
                                                >
                                                    <div className="font-medium text-sm">{site.site_id_1}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {site.site_id_2} • {site.site_name}
                                                    </div>
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={handleUseManualInput}
                                                className="w-full text-left px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium"
                                            >
                                                📝 Input Manual: "{searchQuery}"
                                            </button>
                                        </>
                                    ) : (
                                        <div className="p-4 text-center">
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Site tidak ditemukan untuk "{searchQuery}"
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleUseManualInput}
                                            >
                                                📝 Gunakan Input Manual
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {isManualInput && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                ✓ Mode input manual aktif. Site Name dapat diisi langsung.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="site_id_1">Site ID 1</Label>
                        <Input
                            id="site_id_1"
                            name="site_id_1"
                            value={formData.site_id_1}
                            onChange={isManualInput ? handleChange : undefined}
                            readOnly={!isManualInput}
                            className={!isManualInput ? "bg-muted font-mono" : "font-mono"}
                            placeholder={isManualInput ? "Opsional" : "Auto-filled from search"}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="site_id_2">Site ID 2</Label>
                        <Input
                            id="site_id_2"
                            name="site_id_2"
                            value={formData.site_id_2}
                            onChange={isManualInput ? handleChange : undefined}
                            readOnly={!isManualInput}
                            className={!isManualInput ? "bg-muted" : ""}
                            placeholder={isManualInput ? "Opsional" : "Auto-filled"}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="site_name">
                            Site Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="site_name"
                            name="site_name"
                            value={formData.site_name}
                            onChange={isManualInput ? handleChange : undefined}
                            readOnly={!isManualInput}
                            className={`${!isManualInput ? "bg-muted" : ""} ${errors.site_name ? "border-red-500" : ""}`}
                            placeholder={isManualInput ? "Masukkan nama site manual" : "Auto-filled"}
                            required
                        />
                        {errors.site_name && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.site_name}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="regional">Regional</Label>
                        {isManualInput ? (
                            <Select value={formData.regional} onValueChange={(v) => handleSelectChange('regional', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Regional" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Jabo Outer 1">Jabo Outer 1</SelectItem>
                                    <SelectItem value="Jabo Outer 2">Jabo Outer 2</SelectItem>
                                    <SelectItem value="Jabo Outer 3">Jabo Outer 3</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                id="regional"
                                name="regional"
                                value={formData.regional}
                                readOnly
                                className="bg-muted"
                                placeholder="Auto-filled"
                            />
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="suspected">
                            Suspected <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={formData.suspected}
                            onValueChange={(value) => handleSelectChange('suspected', value)}
                        >
                            <SelectTrigger className={errors.suspected ? "border-red-500" : ""}>
                                <SelectValue placeholder="Select Suspected" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Reguler">Reguler</SelectItem>
                                <SelectItem value="Survey">Survey</SelectItem>
                                <SelectItem value="Delivery">Delivery</SelectItem>
                                <SelectItem value="Lumpsum">Lumpsum</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.suspected && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.suspected}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="customer">Customer</Label>
                        <Select
                            value={formData.customer}
                            onValueChange={(value) => handleSelectChange('customer', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Customer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="IBS">IBS</SelectItem>
                                <SelectItem value="PTI">PTI</SelectItem>
                                <SelectItem value="STP">STP</SelectItem>
                                <SelectItem value="iForte">iForte</SelectItem>
                                <SelectItem value="SIP">SIP</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Right Column: Work Details & Status */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="po_number">PO Number</Label>
                            <Input
                                id="po_number"
                                name="po_number"
                                value={formData.po_number}
                                onChange={handleChange}
                                placeholder="PO#"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tt_number">TT Number</Label>
                            <Input
                                id="tt_number"
                                name="tt_number"
                                value={formData.tt_number}
                                onChange={handleChange}
                                placeholder="TT#"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="main_addwork">
                            Main Addwork <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="main_addwork"
                            name="main_addwork"
                            value={formData.main_addwork}
                            onChange={handleChange}
                            placeholder="Enter Main Addwork"
                            className={errors.main_addwork ? "border-red-500" : ""}
                            required
                        />
                        {errors.main_addwork && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.main_addwork}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status_pekerjaan">
                                Status Pekerjaan <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={formData.status_pekerjaan}
                                onValueChange={(value) => handleSelectChange('status_pekerjaan', value)}
                            >
                                <SelectTrigger className={errors.status_pekerjaan ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="On Hold">On Hold</SelectItem>
                                    <SelectItem value="Close">Close</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.status_pekerjaan && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {errors.status_pekerjaan}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status_bast">Status BAST (Auto)</Label>
                            <div className={`h-10 px-3 py-2 rounded-md border text-sm font-medium flex items-center ${getStatusBastColor(formData.status_bast)}`}>
                                {formData.status_bast || '-'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Otomatis berdasarkan Status Pekerjaan & Tanggal BAST
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bast_submit_date">Submit Date</Label>
                            <Input
                                id="bast_submit_date"
                                name="bast_submit_date"
                                type="date"
                                value={formData.bast_submit_date}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bast_approve_date">Approve Date</Label>
                            <Input
                                id="bast_approve_date"
                                name="bast_approve_date"
                                type="date"
                                value={formData.bast_approve_date}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="aging_days">Aging Days (Auto)</Label>
                        <Input
                            id="aging_days"
                            name="aging_days"
                            type="number"
                            value={formData.aging_days}
                            readOnly
                            className="bg-muted font-mono"
                            placeholder="Auto"
                        />
                    </div>
                </div>

                {/* Full Width Remark */}
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="remark">Remark</Label>
                    <Input
                        id="remark"
                        name="remark"
                        value={formData.remark}
                        onChange={handleChange}
                        placeholder="Enter Remark/Notes"
                    />
                </div>
            </div>

            <div className="flex gap-4 pt-6 justify-end border-t mt-6">
                {onCancel && (
                    <Button type="button" onClick={onCancel} variant="outline" className="w-24">
                        Cancel
                    </Button>
                )}
                <Button type="submit" className="w-32">
                    {initialData ? 'Update Data' : 'Save Data'}
                </Button>
            </div>
        </form>
    );
};

export default WorkTrackerForm;