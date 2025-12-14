import React, { useState, useCallback, memo } from 'react';
import { LayoutDashboard, TableProperties, Users, LogOut, Contact, Car, StickyNote, Camera, History, FileText, X, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = memo(({ activeTab, setActiveTab, onLogout, isOpen, setIsOpen }) => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'Administrator';
    const [isCollapsed, setIsCollapsed] = useState(false);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tracker', label: 'Data Tracker', icon: TableProperties },
        { id: 'pic', label: 'Data PIC', icon: Contact },
        { id: 'car', label: 'Data Mobil', icon: Car },
        { id: 'cctv', label: 'Data CCTV', icon: Camera },
        { id: 'notes', label: 'Notes', icon: StickyNote },
        // Only show User Settings and Logs for Admins
        ...(isAdmin ? [
            { id: 'logs', label: 'Activity Logs', icon: History },
            { id: 'generate-bast', label: 'Generate BAST', icon: FileText },
            { id: 'users', label: 'Pengaturan User', icon: Users },
        ] : []),
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
                    "fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300",
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
                {/* Header */}
                <div className={cn(
                    "h-16 px-4 border-b border-border flex items-center shrink-0",
                    isCollapsed ? "justify-center" : "justify-between"
                )}>
                    {!isCollapsed && (
                        <h2 className="text-lg font-bold tracking-tight truncate">Admin Panel</h2>
                    )}

                    {/* Mobile Close Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close sidebar"
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    {/* Desktop Collapse Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:flex shrink-0"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {isCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </Button>
                </div>

                {/* User Profile */}
                <div className="px-3 py-4 border-b border-border shrink-0">
                    {!isCollapsed ? (
                        <div className="px-3 py-2 bg-muted/50 rounded-lg">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Signed in as</p>
                            <p className="font-semibold text-sm truncate">{profile?.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{profile?.role || 'Guest'}</p>
                        </div>
                    ) : (
                        <div className="flex justify-center" title={profile?.name}>
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                {profile?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Menu Items - Scrollable */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <Button
                                key={item.id}
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full h-10 transition-colors",
                                    isCollapsed ? "justify-center px-2" : "justify-start px-3",
                                    isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                                )}
                                onClick={() => handleMenuClick(item.id)}
                                title={isCollapsed ? item.label : undefined}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <Icon className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-3")} />
                                {!isCollapsed && <span className="truncate">{item.label}</span>}
                            </Button>
                        );
                    })}
                </nav>

                {/* Logout Button */}
                <div className="p-3 border-t border-border shrink-0">
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full h-10 text-destructive hover:text-destructive hover:bg-destructive/10",
                            isCollapsed ? "justify-center px-2" : "justify-start px-3"
                        )}
                        onClick={onLogout}
                        title={isCollapsed ? "Logout" : undefined}
                    >
                        <LogOut className={cn("h-4 w-4 shrink-0", !isCollapsed && "mr-3")} />
                        {!isCollapsed && "Logout"}
                    </Button>
                </div>
            </aside>
        </>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;