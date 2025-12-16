import React, { memo } from 'react';
import { LayoutDashboard, TableProperties, Contact, Car, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MobileBottomNav = memo(({ activeTab, setActiveTab }) => {
    // Main navigation items (show on bottom bar)
    const mainItems = [
        { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
        { id: 'tracker', label: 'Tracker', icon: TableProperties },
        { id: 'pic', label: 'PIC', icon: Contact },
        { id: 'car', label: 'Mobil', icon: Car },
    ];

    // More items (show in dropdown)
    const moreItems = [
        { id: 'cctv', label: 'CCTV' },
        { id: 'notes', label: 'Notes' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'calendar', label: 'Calendar' },
        { id: 'performance', label: 'Performance' },
        { id: 'logs', label: 'Activity Logs' },
        { id: 'users', label: 'Pengaturan User' },
    ];

    const isMoreActive = moreItems.some(item => item.id === activeTab);

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
                    <DropdownMenuContent align="end" className="w-48 mb-2">
                        {moreItems.map((item) => (
                            <DropdownMenuItem
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    activeTab === item.id && "bg-primary/10 text-primary"
                                )}
                            >
                                {item.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
});

MobileBottomNav.displayName = 'MobileBottomNav';

export default MobileBottomNav;
