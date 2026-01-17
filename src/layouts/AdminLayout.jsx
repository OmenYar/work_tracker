import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Outlet, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

// Lazy load navbar components
const GlobalSearch = lazy(() => import('@/components/GlobalSearch'));
const NotificationCenter = lazy(() => import('@/components/NotificationCenter'));

const AdminLayout = () => {
    const { logout, profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location.pathname]);

    // Determine active tab based on URL path or query param
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/input-tracker') || path.includes('/edit-tracker')) return 'tracker';
        if (path.includes('/input-pic') || path.includes('/edit-pic')) return 'pic';
        if (path.includes('/input-car') || path.includes('/edit-car')) return 'car';
        if (path.includes('/input-cctv') || path.includes('/edit-cctv')) return 'cctv';
        if (path.includes('/input-smartlock') || path.includes('/edit-smartlock')) return 'smartlock';

        // Fallback to query param if on root
        return searchParams.get('tab') || 'dashboard';
    };

    const activeTab = getActiveTab();

    const handleSetActiveTab = (tabId) => {
        if (tabId === 'dashboard') {
            navigate('/admin?tab=dashboard');
        } else {
            navigate(`/admin?tab=${tabId}`);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground">
            {/* Sidebar - Fixed position */}
            <Sidebar
                activeTab={activeTab}
                setActiveTab={handleSetActiveTab}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen">
                {/* Fixed Desktop Header/Navbar */}
                <header className="hidden md:flex sticky top-0 z-30 h-16 px-6 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-semibold capitalize">{activeTab.replace('-', ' ')}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Suspense fallback={<div className="w-8 h-8" />}>
                            <GlobalSearch
                                workTrackers={[]}
                                picData={[]}
                                carData={[]}
                                cctvData={[]}
                                onNavigate={(type) => {
                                    handleSetActiveTab(type);
                                }}
                            />
                        </Suspense>
                        <Suspense fallback={<div className="w-8 h-8" />}>
                            <NotificationCenter
                                workTrackers={[]}
                                carData={[]}
                                cctvData={[]}
                            />
                        </Suspense>
                        <ThemeToggle />
                        <div className="w-px h-6 bg-border mx-1" />
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground hidden lg:block">
                                {profile?.name}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Logout"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Mobile Header - Fixed */}
                <header className="md:hidden sticky top-0 z-30 p-3 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex items-center justify-between shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                    <h1 className="font-semibold text-base capitalize">{activeTab.replace('-', ' ')}</h1>
                    <div className="flex items-center gap-1">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Outlet />
                </main>

                {/* Footer */}
                <footer className="shrink-0 border-t bg-card/50 py-3 px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
                        <p>© 2025 WorkTracker. All rights reserved.</p>
                        <p>Version 1.0.0</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AdminLayout;
