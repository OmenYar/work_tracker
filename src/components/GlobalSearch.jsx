import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, X, FileText, Contact, Car, Camera, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GlobalSearch = ({
    workTrackers = [],
    picData = [],
    carData = [],
    cctvData = [],
    onNavigate,
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Keyboard shortcut to open search (Ctrl/Cmd + K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 100);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
                setQuery('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Search across all data
    const searchResults = useMemo(() => {
        if (!query || query.length < 2) return [];

        setIsSearching(true);
        const q = query.toLowerCase();
        const results = [];

        // Search work trackers
        workTrackers.forEach(item => {
            if (
                item.site_id_1?.toLowerCase().includes(q) ||
                item.site_name?.toLowerCase().includes(q) ||
                item.main_addwork?.toLowerCase().includes(q) ||
                item.remark?.toLowerCase().includes(q)
            ) {
                results.push({
                    type: 'tracker',
                    icon: FileText,
                    title: item.site_name || item.site_id_1,
                    subtitle: `${item.regional} • ${item.status_pekerjaan}`,
                    id: item.id,
                    data: item,
                });
            }
        });

        // Search PIC data
        picData.forEach(item => {
            if (
                item.nama_pic?.toLowerCase().includes(q) ||
                item.no_hp?.toLowerCase().includes(q) ||
                item.email?.toLowerCase().includes(q) ||
                item.area?.toLowerCase().includes(q)
            ) {
                results.push({
                    type: 'pic',
                    icon: Contact,
                    title: item.nama_pic,
                    subtitle: `${item.jabatan} • ${item.regional}`,
                    id: item.id,
                    data: item,
                });
            }
        });

        // Search car data
        carData.forEach(item => {
            if (
                item.no_polisi?.toLowerCase().includes(q) ||
                item.brand?.toLowerCase().includes(q) ||
                item.model?.toLowerCase().includes(q)
            ) {
                results.push({
                    type: 'car',
                    icon: Car,
                    title: item.no_polisi,
                    subtitle: `${item.brand} ${item.model}`,
                    id: item.id,
                    data: item,
                });
            }
        });

        // Search CCTV data
        cctvData.forEach(item => {
            if (
                item.site_id?.toLowerCase().includes(q) ||
                item.site_name?.toLowerCase().includes(q) ||
                item.ip_address?.toLowerCase().includes(q)
            ) {
                results.push({
                    type: 'cctv',
                    icon: Camera,
                    title: item.site_name || item.site_id,
                    subtitle: `${item.ip_address || 'No IP'} • ${item.status}`,
                    id: item.id,
                    data: item,
                });
            }
        });

        setIsSearching(false);
        return results.slice(0, 10); // Limit to 10 results
    }, [query, workTrackers, picData, carData, cctvData]);

    const handleSelect = (result) => {
        setIsOpen(false);
        setQuery('');
        if (onNavigate) {
            onNavigate(result.type, result.id, result.data);
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'tracker': return 'Data Tracker';
            case 'pic': return 'Data PIC';
            case 'car': return 'Data Mobil';
            case 'cctv': return 'Data CCTV';
            default: return type;
        }
    };

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            {/* Search Trigger Button */}
            <Button
                variant="outline"
                onClick={() => {
                    setIsOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className="gap-2 text-muted-foreground"
            >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search...</span>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                    ⌘K
                </kbd>
            </Button>

            {/* Search Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-card border rounded-xl shadow-2xl overflow-hidden mx-4">
                        {/* Search Input */}
                        <div className="flex items-center border-b px-4">
                            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search trackers, PIC, cars, CCTV..."
                                className="border-0 focus-visible:ring-0 text-base"
                            />
                            {query && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setQuery('')}
                                    className="h-6 w-6"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>

                        {/* Results */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            {isSearching ? (
                                <div className="flex items-center justify-center py-8 text-muted-foreground">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Searching...
                                </div>
                            ) : query.length < 2 ? (
                                <div className="p-4 text-center text-muted-foreground text-sm">
                                    Type at least 2 characters to search
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No results found for "{query}"</p>
                                </div>
                            ) : (
                                <div className="py-2">
                                    {searchResults.map((result, index) => (
                                        <button
                                            key={`${result.type}-${result.id}`}
                                            onClick={() => handleSelect(result)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                                result.type === 'tracker' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
                                                    result.type === 'pic' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' :
                                                        result.type === 'car' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' :
                                                            'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400'
                                            )}>
                                                <result.icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{result.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                    {getTypeLabel(result.type)}
                                                </span>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded border bg-background">↑↓</kbd>
                                    Navigate
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded border bg-background">↵</kbd>
                                    Select
                                </span>
                            </div>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 rounded border bg-background">esc</kbd>
                                Close
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
