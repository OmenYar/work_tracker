import React, { memo } from 'react';
import { LayoutDashboard, TableProperties, Contact, Car, MoreHorizontal, LogOut, Camera, StickyNote, BarChart3, CalendarDays, Trophy, History, Users, FileText, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

const MobileBottomNav = memo(({ activeTab, setActiveTab }) => {
    const { logout, profile } = useAuth();
    const isAdmin = profile?.role === 'Administrator';

    // Main navigation items (show on bottom bar)
    const mainItems = [
        { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
        { id: 'tracker', label: 'Tracker', icon: TableProperties },
        { id: 'pic', label: 'PIC', icon: Contact },
        { id: 'car', label: 'Mobil', icon: Car },
    ];

    // More items (show in dropdown)
    const moreItems = [
        { id: 'cctv', label: 'CCTV', icon: Camera },
        { id: 'module', label: 'Module DPR2900', icon: Package },
        { id: 'notes', label: 'Notes', icon: StickyNote },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
        { id: 'performance', label: 'Performance', icon: Trophy },
        ...(isAdmin ? [
            { id: 'logs', label: 'Activity Logs', icon: History },
            { id: 'generate-bast', label: 'Generate BAST', icon: FileText },
            { id: 'users', label: 'Pengaturan User', icon: Users },
        ] : []),
    ];

    const isMoreActive = moreItems.some(item => item.id === activeTab);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t safe-area-pb">
            <div className="flex items-center justify-around h-16">
                {mainItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                            activeTab === item.id
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <item.icon className={cn(
                            "h-5 w-5 mb-1",
                            activeTab === item.id && "text-primary"
                        )} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                        {activeTab === item.id && (
                            <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-t-full" />
                        )}
                    </button>
                ))}

                {/* More Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                                isMoreActive
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MoreHorizontal className={cn(
                                "h-5 w-5 mb-1",
                                isMoreActive && "text-primary"
                            )} />
                            <span className="text-[10px] font-medium">More</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 mb-2">
                        {moreItems.map((item) => (
                            <DropdownMenuItem
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "gap-2",
                                    activeTab === item.id && "bg-primary/10 text-primary"
                                )}
                            >
                                {item.icon && <item.icon className="h-4 w-4" />}
                                {item.label}
                            </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator />

                        {/* Logout Button */}
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
});

MobileBottomNav.displayName = 'MobileBottomNav';

export default MobileBottomNav;
