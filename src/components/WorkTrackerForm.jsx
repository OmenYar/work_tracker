import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
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

        if (searchQuery.length >= 2) {
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
    }, [searchQuery, searchSites]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                // Ensure date fields are properly formatted for input type="date"
                bast_submit_date: initialData.bast_submit_date ? initialData.bast_submit_date.split('T')[0] : '',
                bast_approve_date: initialData.bast_approve_date ? initialData.bast_approve_date.split('T')[0] : '',
            });
        }
    }, [initialData]);

    // Auto-calculate aging days whenever bast_submit_date or bast_approve_date changes
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

        // Convert to days
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        setFormData(prev => ({
            ...prev,
            aging_days: diffDays
        }));
    }, [formData.bast_submit_date, formData.bast_approve_date]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSiteChange = (value) => {
        console.log("🔄 Site selected:", value);
        console.log("Available sites:", siteMaster.length);

        const selectedSite = siteMaster.find(s => s.site_id_1 === value);
        console.log("Found site:", selectedSite);

        if (selectedSite) {
            setFormData(prev => ({
                ...prev,
                site_id_1: selectedSite.site_id_1,
                site_id_2: selectedSite.site_id_2 || '',
                site_name: selectedSite.site_name || '',
                regional: selectedSite.regional || ''
            }));
            console.log("✅ Form updated with site data");
        } else {
            console.warn("⚠️ Site not found in siteMaster array");
        }
    };

    const handleSiteSelect = (site) => {
        console.log("🏢 Site selected from search:", site);
        console.log("Current formData before update:", formData);

        const newFormData = {
            ...formData,
            site_id_1: site.site_id_1,
            site_id_2: site.site_id_2 || '',
            site_name: site.site_name || '',
            regional: site.regional || ''
        };

        console.log("New formData to set:", newFormData);

        setFormData(newFormData);
        setSearchQuery(`${site.site_id_1} - ${site.site_name}`);
        setShowSuggestions(false);

        console.log("✅ Form data updated, suggestions closed");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("📤 Submitting form data:", formData);
        console.log("📤 Aging days value:", formData.aging_days, "Type:", typeof formData.aging_days);
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
        }
    };

    return (
        <form onSubmit={handleSubmit} className="py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Identifiers */}
                <div className="space-y-4">
                    {/* Search Site */}
                    <div className="space-y-2">
                        <Label htmlFor="site_search">Search Site</Label>
                        <div className="relative">
                            <Input
                                id="site_search"
                                type="text"
                                placeholder="Ketik min. 2 karakter untuk mencari site..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
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
                            {showSuggestions && searchQuery.length >= 2 && (
                                <div className="suggestions-dropdown absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                                    {isSearching ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Mencari site...
                                        </div>
                                    ) : siteMaster.length > 0 ? (
                                        <>
                                            <div className="p-2 text-xs text-muted-foreground border-b bg-muted/50">
                                                Ditemukan {siteMaster.length} site {siteMaster.length === 50 && "(max 50 ditampilkan)"}
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
                                        </>
                                    ) : (
                                        <div className="p-4 text-center text-sm text-muted-foreground">
                                            Site tidak ditemukan untuk "{searchQuery}"
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Hint text when search query is too short */}
                            {showSuggestions && searchQuery.length > 0 && searchQuery.length < 2 && (
                                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                                    <div className="p-3 text-sm text-muted-foreground text-center">
                                        Ketik min. 2 karakter untuk mencari
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="site_id_1">Site ID 1</Label>
                        <Input
                            id="site_id_1"
                            name="site_id_1"
                            value={formData.site_id_1}
                            readOnly
                            className="bg-muted font-mono"
                            placeholder="Auto-filled from search"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="site_id_2">Site ID 2</Label>
                        <Input
                            id="site_id_2"
                            name="site_id_2"
                            value={formData.site_id_2}
                            readOnly
                            className="bg-muted"
                            placeholder="Auto-filled"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="site_name">Site Name</Label>
                        <Input
                            id="site_name"
                            name="site_name"
                            value={formData.site_name}
                            readOnly
                            className="bg-muted"
                            placeholder="Auto-filled"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="regional">Regional</Label>
                        <Input
                            id="regional"
                            name="regional"
                            value={formData.regional}
                            readOnly
                            className="bg-muted"
                            placeholder="Auto-filled"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="suspected">Suspected</Label>
                        <Select
                            value={formData.suspected}
                            onValueChange={(value) => handleSelectChange('suspected', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select Suspected" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Reguler">Reguler</SelectItem>
                                <SelectItem value="Survey">Survey</SelectItem>
                                <SelectItem value="Delivery">Delivery</SelectItem>
                                <SelectItem value="Lumpsum">Lumpsum</SelectItem>
                            </SelectContent>
                        </Select>
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
                        <Label htmlFor="main_addwork">Main Addwork</Label>
                        <Input
                            id="main_addwork"
                            name="main_addwork"
                            value={formData.main_addwork}
                            onChange={handleChange}
                            placeholder="Enter Main Addwork"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="status_pekerjaan">Status Pekerjaan</Label>
                            <Select
                                value={formData.status_pekerjaan}
                                onValueChange={(value) => handleSelectChange('status_pekerjaan', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Open">Open</SelectItem>
                                    <SelectItem value="On Hold">On Hold</SelectItem>
                                    <SelectItem value="Close">Close</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status_bast">Status BAST</Label>
                            <Select
                                value={formData.status_bast}
                                onValueChange={(value) => handleSelectChange('status_bast', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status BAST" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Waiting Approve">Waiting Approve</SelectItem>
                                    <SelectItem value="Approve">Approve</SelectItem>
                                </SelectContent>
                            </Select>
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
                    <Button
                        type="button"
                        onClick={onCancel}
                        variant="outline"
                        className="w-24"
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    className="w-32"
                >
                    {initialData ? 'Update Data' : 'Save Data'}
                </Button>
            </div>
        </form>
    );
};

export default WorkTrackerForm;