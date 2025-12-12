import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';

const CCTVDataForm = ({ onSubmit, initialData, onCancel }) => {
    const [formData, setFormData] = useState({
        site_id: '',
        site_id_display: '',
        site_name: '',
        regional: '',
        branch: '',
        merk_cctv: '',
        model: '',
        install_date: '',
        status: 'online',
        tenant_available: '',
        cctv_category: 'reguler',
        remarks: '',
    });

    const [siteList, setSiteList] = useState([]);
    const [isLoadingSites, setIsLoadingSites] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // Server-side search function with debounce
    const searchSites = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSiteList([]);
            return;
        }

        try {
            setIsSearching(true);
            const searchPattern = `%${query}%`;

            const { data, error } = await supabase
                .from('site_master')
                .select('id, site_id_1, site_name, regional')
                .or(`site_id_1.ilike.${searchPattern},site_name.ilike.${searchPattern}`)
                .order('site_id_1', { ascending: true })
                .limit(50);

            if (error) throw error;
            setSiteList(data || []);
        } catch (err) {
            console.error('Error searching sites:', err);
            setSiteList([]);
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
            setSiteList([]);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, searchSites]);

    // Load initial data for edit mode
    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                install_date: initialData.install_date || '',
                site_id: initialData.site_id ? String(initialData.site_id) : '',
            });
        }
    }, [initialData]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSiteSelect = (site) => {
        if (site) {
            setFormData(prev => ({
                ...prev,
                site_id: String(site.id),
                site_id_display: site.site_id_1,
                site_name: site.site_name,
                regional: site.regional || '',
            }));
            setSearchQuery('');
        } else {
            setFormData(prev => ({
                ...prev,
                site_id: '',
                site_id_display: '',
                site_name: '',
                regional: '',
            }));
        }
        setShowDropdown(false);
    };

    const handleClearSite = () => {
        setFormData(prev => ({
            ...prev,
            site_id: '',
            site_id_display: '',
            site_name: '',
            regional: '',
        }));
        setSearchQuery('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const submitData = {
            ...formData,
            site_id: formData.site_id || null,
        };

        onSubmit(submitData);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
            case 'offline': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
            case 'broken': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
            case 'stolen': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto py-2">
            {/* Site Search Field */}
            <div className="space-y-2">
                <Label>Cari Site *</Label>
                <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                        {isSearching ? (
                            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                        ) : (
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        )}
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Ketik min. 2 karakter untuk mencari site..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            className="pl-10 pr-10"
                        />
                        {(searchQuery || formData.site_id) && (
                            <button
                                type="button"
                                onClick={handleClearSite}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Dropdown List */}
                    {showDropdown && searchQuery.length >= 2 && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {isSearching ? (
                                <div className="p-3 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Mencari site...
                                </div>
                            ) : siteList.length === 0 ? (
                                <div className="p-3 text-sm text-muted-foreground text-center">
                                    Site tidak ditemukan untuk "{searchQuery}"
                                </div>
                            ) : (
                                <ul className="py-1">
                                    <li className="px-3 py-1 text-xs text-muted-foreground border-b bg-muted/50">
                                        Ditemukan {siteList.length} site {siteList.length === 50 && "(max 50 ditampilkan)"}
                                    </li>
                                    {siteList.map((site) => (
                                        <li
                                            key={site.id}
                                            onClick={() => handleSiteSelect(site)}
                                            className={cn(
                                                "px-3 py-2 cursor-pointer hover:bg-accent transition-colors",
                                                formData.site_id === String(site.id) && "bg-accent"
                                            )}
                                        >
                                            <div className="font-medium">{site.site_id_1}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {site.site_name} • {site.regional}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Hint text when search query is too short */}
                    {showDropdown && searchQuery.length > 0 && searchQuery.length < 2 && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                            <div className="p-3 text-sm text-muted-foreground text-center">
                                Ketik min. 2 karakter untuk mencari
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Auto-filled Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Site ID</Label>
                    <Input
                        name="site_id_display"
                        value={formData.site_id_display}
                        placeholder="Auto-filled"
                        disabled
                        className="bg-muted font-mono"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input
                        name="site_name"
                        value={formData.site_name}
                        placeholder="Auto-filled"
                        disabled
                        className="bg-muted"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Regional</Label>
                    <Input
                        name="regional"
                        value={formData.regional}
                        placeholder="Auto-filled"
                        disabled
                        className="bg-muted"
                    />
                </div>
            </div>

            {/* Other Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                    <Label>Branch</Label>
                    <Input
                        name="branch"
                        value={formData.branch}
                        onChange={handleChange}
                        placeholder="e.g. Jakarta Pusat"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Merk CCTV</Label>
                    <Input
                        name="merk_cctv"
                        value={formData.merk_cctv}
                        onChange={handleChange}
                        placeholder="e.g. Hikvision, Dahua"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                        name="model"
                        value={formData.model}
                        onChange={handleChange}
                        placeholder="e.g. DS-2CD2143G2-I"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Install Date</Label>
                    <Input
                        name="install_date"
                        type="date"
                        value={formData.install_date}
                        onChange={handleChange}
                    />
                </div>
            </div>

            {/* Status & Category Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                <div className="space-y-2">
                    <Label>Status *</Label>
                    <Select value={formData.status} onValueChange={v => handleSelectChange('status', v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="online">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Online
                                </span>
                            </SelectItem>
                            <SelectItem value="offline">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                    Offline
                                </span>
                            </SelectItem>
                            <SelectItem value="broken">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    Broken
                                </span>
                            </SelectItem>
                            <SelectItem value="stolen">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    Stolen
                                </span>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <div className={`text-xs font-medium px-2 py-1 rounded inline-block ${getStatusColor(formData.status)}`}>
                        Status: {formData.status.toUpperCase()}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>CCTV Category *</Label>
                    <Select value={formData.cctv_category} onValueChange={v => handleSelectChange('cctv_category', v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="reguler">Reguler</SelectItem>
                            <SelectItem value="IOT">IOT</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Tenant Available</Label>
                    <Input
                        name="tenant_available"
                        value={formData.tenant_available}
                        onChange={handleChange}
                        placeholder="e.g. Yes, No, Telkomsel"
                    />
                </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2 border-t pt-4">
                <Label>Remarks</Label>
                <Textarea
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    placeholder="Additional notes..."
                    rows={3}
                />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4 justify-end">
                {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
                <Button type="submit">{initialData ? 'Update CCTV' : 'Save CCTV'}</Button>
            </div>
        </form>
    );
};

export default CCTVDataForm;
