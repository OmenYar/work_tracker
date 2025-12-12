import React from 'react';
import { LayoutDashboard, TableProperties, Users, LogOut, Contact, ChevronLeft, ChevronRight, PanelLeft, Car, StickyNote, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = ({ activeTab, setActiveTab, onLogout, isOpen, setIsOpen }) => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'Administrator';

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tracker', label: 'Data Tracker', icon: TableProperties },
        { id: 'pic', label: 'Data PIC', icon: Contact },
        { id: 'car', label: 'Data Mobil', icon: Car },
        { id: 'cctv', label: 'Data CCTV', icon: Camera },
        { id: 'notes', label: 'Notes', icon: StickyNote },
        // Only show User Settings for Admins
        ...(isAdmin ? [{ id: 'users', label: 'Pengaturan User', icon: Users }] : []),
    ];

    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar Content */}
            <div
                className={cn(
                    "fixed md:static inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out",
                    isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:translate-x-0",
                    // Desktop collapse logic
                    "md:w-64",
                    isCollapsed && "md:w-20"
                )}
            >
                <div className={cn("p-6 border-b border-border flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
                    {!isCollapsed && <h2 className="text-xl font-bold tracking-tight">Admin Panel</h2>}
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(false)}>
                        <span className="sr-only">Close</span>
                        <Users className="h-5 w-5" />
                    </Button>
                    {/* Desktop Toggle */}
                    <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {isCollapsed ? <LayoutDashboard className="h-5 w-5 rotate-90" /> : <div className="h-5 w-5 border-2 border-current rounded-sm flex items-center justify-center"><div className="w-1 h-3 bg-current"></div></div>}
                        {/* Using simple icons for toggle visual */}
                    </Button>
                </div>

                <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                    {/* User Profile Summary */}
                    {!isCollapsed ? (
                        <div className="px-4 py-2 mb-4 bg-muted/50 rounded-lg">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Signed in as</p>
                            <p className="font-semibold truncate">{profile?.name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{profile?.role || 'Guest'}</p>
                        </div>
                    ) : (
                        <div className="mb-4 flex justify-center" title={profile?.name}>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                                {profile?.name?.[0] || 'U'}
                            </div>
                        </div>
                    )}

                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Button
                                key={item.id}
                                variant={activeTab === item.id ? "secondary" : "ghost"}
                                className={cn("w-full justify-start", isCollapsed && "justify-center px-2")}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    if (window.innerWidth < 768) setIsOpen(false);
                                }}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                                {!isCollapsed && item.label}
                            </Button>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-border">
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10", isCollapsed && "justify-center px-2")}
                        onClick={onLogout}
                        title={isCollapsed ? "Logout" : undefined}
                    >
                        <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                        {!isCollapsed && "Logout"}
                    </Button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;