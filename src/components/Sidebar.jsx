import React, { useState, useCallback, memo } from 'react';
import { LayoutDashboard, TableProperties, Users, LogOut, Contact, Car, StickyNote, Camera, History, FileText, X, PanelLeftClose, PanelLeft, BarChart3, CalendarDays, Trophy, Package, Lock, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = memo(({ activeTab, setActiveTab, onLogout, isOpen, setIsOpen }) => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'Administrator';
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Menu items grouped by category
    const menuGroups = [
        {
            label: 'Overview',
            items: [
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
                { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-purple-500' },
                { id: 'performance', label: 'Performance', icon: Trophy, color: 'text-yellow-500' },
                { id: 'calendar', label: 'Calendar', icon: CalendarDays, color: 'text-green-500' },
            ]
        },
        {
            label: 'Data Management',
            items: [
                { id: 'tracker', label: 'Tracker BAST', icon: TableProperties, color: 'text-cyan-500' },
                { id: 'pic', label: 'Data PIC', icon: Contact, color: 'text-orange-500' },
                { id: 'car', label: 'Data Mobil', icon: Car, color: 'text-red-500' },
                { id: 'cctv', label: 'Data CCTV', icon: Camera, color: 'text-pink-500' },
                { id: 'module', label: 'Module DPR2900', icon: Package, color: 'text-indigo-500' },
                { id: 'smartlock', label: 'SmartLock WM', icon: Lock, color: 'text-emerald-500' },
            ]
        },
        {
            label: 'Tools',
            items: [
                { id: 'notes', label: 'Notes', icon: StickyNote, color: 'text-amber-500' },
                { id: 'reports', label: 'Report Builder', icon: FileSpreadsheet, color: 'text-emerald-500' },
                ...(isAdmin ? [
                    { id: 'logs', label: 'Activity Logs', icon: History, color: 'text-slate-500' },
                    { id: 'generate-bast', label: 'Generate BAST', icon: FileText, color: 'text-teal-500' },
                    { id: 'users', label: 'Pengaturan User', icon: Users, color: 'text-violet-500' },
                ] : []),
                // Generate ATP accessible for Admin, AM, and SPV (Jabo)
                ...((isAdmin || profile?.role === 'AM' || profile?.role?.includes('Jabo')) ? [
                    { id: 'generate-atp', label: 'Generate ATP', icon: FileSpreadsheet, color: 'text-cyan-500' },
                ] : []),
            ]
        },
    ];

    const handleMenuClick = useCallback((itemId) => {
        setActiveTab(itemId);
        // Close on mobile
        if (window.innerWidth < 768) {
            setIsOpen(false);
        }
    }, [setActiveTab, setIsOpen]);

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-all duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed md:sticky top-0 left-0 z-50 h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out shrink-0",
                    // Mobile: slide in/out
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                    // Width
                    isCollapsed ? "w-[70px]" : "w-64"
                )}
            >
                {/* Header - Enhanced with gradient */}
                <div className={cn(
                    "h-16 px-4 border-b border-border flex items-center shrink-0 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent",
                    isCollapsed ? "justify-center" : "justify-between"
                )}>
                    {!isCollapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                                <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
                            </div>
                            <h2 className="text-lg font-bold tracking-tight">Admin Panel</h2>
                        </div>
                    )}

                    {/* Mobile Close Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close sidebar"
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    {/* Desktop Collapse Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:flex shrink-0 hover:bg-primary/10 transition-colors"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </Button>
                </div>

                {/* User Profile - Enhanced with Logout */}
                <div className="px-3 py-4 border-b border-border shrink-0">
                    {!isCollapsed ? (
                        <div className="px-3 py-3 bg-gradient-to-r from-muted/80 to-muted/30 rounded-xl border border-border/50 hover:border-border transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Signed in as</p>
                                    <p className="font-semibold text-sm truncate mt-0.5">{profile?.name || 'User'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{profile?.role || 'Guest'}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    onClick={onLogout}
                                    title="Logout"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2" title={profile?.name}>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/20 hover:border-primary/40 transition-colors cursor-default">
                                {profile?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={onLogout}
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Menu Items - Grouped with Dividers */}
                <nav className="flex-1 py-4 px-3 overflow-y-auto">
                    {menuGroups.map((group, groupIdx) => (
                        <div key={group.label}>
                            {/* Group Label */}
                            {!isCollapsed && (
                                <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {group.label}
                                </p>
                            )}
                            {/* Divider for collapsed mode */}
                            {isCollapsed && groupIdx > 0 && (
                                <div className="my-2 mx-2 border-t border-border" />
                            )}
                            {/* Menu Items */}
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;

                                    return (
                                        <Button
                                            key={item.id}
                                            variant={isActive ? "secondary" : "ghost"}
                                            className={cn(
                                                "w-full h-11 transition-all duration-200 group relative overflow-hidden",
                                                isCollapsed ? "justify-center px-2" : "justify-start px-3",
                                                isActive
                                                    ? "bg-primary/10 text-primary hover:bg-primary/15 shadow-sm border border-primary/20"
                                                    : "hover:bg-muted/80 hover:translate-x-1"
                                            )}
                                            onClick={() => handleMenuClick(item.id)}
                                            title={isCollapsed ? item.label : undefined}
                                            aria-current={isActive ? "page" : undefined}
                                        >
                                            {/* Icon Container */}
                                            <div className={cn(
                                                "flex items-center justify-center rounded-lg transition-all duration-200",
                                                isCollapsed ? "w-8 h-8" : "w-7 h-7 mr-3",
                                                isActive
                                                    ? "bg-primary/20"
                                                    : "bg-muted/50 group-hover:bg-muted"
                                            )}>
                                                <Icon className={cn(
                                                    "h-4 w-4 shrink-0 transition-transform duration-200",
                                                    isActive ? item.color : "text-muted-foreground group-hover:text-foreground",
                                                    !isActive && "group-hover:scale-110"
                                                )} />
                                            </div>
                                            {!isCollapsed && (
                                                <span className="truncate text-sm">{item.label}</span>
                                            )}
                                            {/* Active indicator */}
                                            {isActive && !isCollapsed && (
                                                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                            {/* Divider after group (except last) */}
                            {!isCollapsed && groupIdx < menuGroups.length - 1 && (
                                <div className="my-3 mx-3 border-t border-border" />
                            )}
                        </div>
                    ))}
                </nav>
            </aside>
        </>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;