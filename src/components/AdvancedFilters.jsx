import React, { useState, useEffect } from 'react';
import { Filter, X, Save, RotateCcw, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'work_tracker_filters';

// Load saved filters from localStorage
const loadSavedFilters = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
};

// Save filters to localStorage
const saveFilters = (filters) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
        console.error('Failed to save filters:', e);
    }
};

const AdvancedFilters = ({
    filters,
    onFiltersChange,
    filterConfig = {},
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState(filters);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Default filter configuration
    const config = {
        dateRange: filterConfig.dateRange ?? true,
        status: filterConfig.status ?? true,
        statusOptions: filterConfig.statusOptions ?? [
            { value: 'all', label: 'All Status' },
            { value: 'Open', label: 'Open' },
            { value: 'On Hold', label: 'On Hold' },
            { value: 'Close', label: 'Close' },
        ],
        regional: filterConfig.regional ?? true,
        regionalOptions: filterConfig.regionalOptions ?? [
            { value: 'all', label: 'All Regional' },
            { value: 'Jabo Outer 1', label: 'Jabo Outer 1' },
            { value: 'Jabo Outer 2', label: 'Jabo Outer 2' },
            { value: 'Jabo Outer 3', label: 'Jabo Outer 3' },
        ],
        multipleStatus: filterConfig.multipleStatus ?? false,
        customFilters: filterConfig.customFilters ?? [],
    };

    // Load saved filters on mount
    useEffect(() => {
        const saved = loadSavedFilters();
        if (saved) {
            setLocalFilters(prev => ({ ...prev, ...saved }));
            onFiltersChange?.({ ...filters, ...saved });
        }
    }, []);

    // Track changes
    useEffect(() => {
        const hasChanges = JSON.stringify(localFilters) !== JSON.stringify(filters);
        setHasUnsavedChanges(hasChanges);
    }, [localFilters, filters]);

    const handleApply = () => {
        onFiltersChange?.(localFilters);
        setIsOpen(false);
    };

    const handleSave = () => {
        saveFilters(localFilters);
        onFiltersChange?.(localFilters);
        setIsOpen(false);
    };

    const handleReset = () => {
        const defaultFilters = {
            search: '',
            status: 'all',
            regional: 'all',
            dateFrom: '',
            dateTo: '',
            statusList: [],
        };
        setLocalFilters(defaultFilters);
        onFiltersChange?.(defaultFilters);
        localStorage.removeItem(STORAGE_KEY);
    };

    // Count active filters
    const activeFiltersCount = Object.entries(localFilters).filter(([key, value]) => {
        if (key === 'search') return value !== '';
        if (key === 'status' || key === 'regional') return value !== 'all';
        if (key === 'dateFrom' || key === 'dateTo') return value !== '';
        if (key === 'statusList') return value?.length > 0;
        return false;
    }).length;

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline">Filters</span>
                        {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                                {activeFiltersCount}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Advanced Filters</h4>
                            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs gap-1">
                                <RotateCcw className="h-3 w-3" />
                                Reset
                            </Button>
                        </div>

                        {/* Date Range */}
                        {config.dateRange && (
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Date Range</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs">From</Label>
                                        <Input
                                            type="date"
                                            value={localFilters.dateFrom || ''}
                                            onChange={(e) => setLocalFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">To</Label>
                                        <Input
                                            type="date"
                                            value={localFilters.dateTo || ''}
                                            onChange={(e) => setLocalFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Filter */}
                        {config.status && !config.multipleStatus && (
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                                <Select
                                    value={localFilters.status || 'all'}
                                    onValueChange={(v) => setLocalFilters(prev => ({ ...prev, status: v }))}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {config.statusOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Multiple Status Select */}
                        {config.status && config.multipleStatus && (
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Status (Multiple)</Label>
                                <div className="space-y-1">
                                    {config.statusOptions.filter(o => o.value !== 'all').map(opt => (
                                        <div key={opt.value} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`status-${opt.value}`}
                                                checked={localFilters.statusList?.includes(opt.value)}
                                                onCheckedChange={(checked) => {
                                                    setLocalFilters(prev => ({
                                                        ...prev,
                                                        statusList: checked
                                                            ? [...(prev.statusList || []), opt.value]
                                                            : (prev.statusList || []).filter(s => s !== opt.value)
                                                    }));
                                                }}
                                            />
                                            <label htmlFor={`status-${opt.value}`} className="text-xs">{opt.label}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Regional Filter */}
                        {config.regional && (
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Regional</Label>
                                <Select
                                    value={localFilters.regional || 'all'}
                                    onValueChange={(v) => setLocalFilters(prev => ({ ...prev, regional: v }))}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {config.regionalOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Custom Filters */}
                        {config.customFilters.map(filter => (
                            <div key={filter.key} className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">{filter.label}</Label>
                                <Select
                                    value={localFilters[filter.key] || 'all'}
                                    onValueChange={(v) => setLocalFilters(prev => ({ ...prev, [filter.key]: v }))}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filter.options.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t">
                            <Button onClick={handleApply} className="flex-1 h-8 text-xs">
                                Apply Filters
                            </Button>
                            <Button onClick={handleSave} variant="outline" className="h-8 text-xs gap-1">
                                <Save className="h-3 w-3" />
                                Save
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
                <div className="hidden sm:flex items-center gap-1 flex-wrap">
                    {localFilters.status && localFilters.status !== 'all' && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                            Status: {localFilters.status}
                            <button onClick={() => {
                                const newFilters = { ...localFilters, status: 'all' };
                                setLocalFilters(newFilters);
                                onFiltersChange?.(newFilters);
                            }}>
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {localFilters.regional && localFilters.regional !== 'all' && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                            Regional: {localFilters.regional}
                            <button onClick={() => {
                                const newFilters = { ...localFilters, regional: 'all' };
                                setLocalFilters(newFilters);
                                onFiltersChange?.(newFilters);
                            }}>
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {(localFilters.dateFrom || localFilters.dateTo) && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                            <Calendar className="h-3 w-3" />
                            {localFilters.dateFrom || '...'} - {localFilters.dateTo || '...'}
                            <button onClick={() => {
                                const newFilters = { ...localFilters, dateFrom: '', dateTo: '' };
                                setLocalFilters(newFilters);
                                onFiltersChange?.(newFilters);
                            }}>
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdvancedFilters;
