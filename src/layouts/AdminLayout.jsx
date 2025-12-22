import React, { useState, useEffect } from 'react';
import { Outlet, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const AdminLayout = () => {
    const { logout } = useAuth();
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
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen">
                {/* Mobile Header - Fixed */}
                <header className="md:hidden sticky top-0 z-30 p-3 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex items-center justify-between shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Open menu</span>
                    </Button>
                    <h1 className="font-semibold text-base">WorkTracker</h1>
                    <ThemeToggle />
                </header>

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Outlet />
                </main>

                {/* Footer */}
                <footer className="shrink-0 border-t bg-card/50 py-3 px-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
                        <p>© 2024 WorkTracker. All rights reserved.</p>
                        <p>Version 1.0.0</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default AdminLayout;
