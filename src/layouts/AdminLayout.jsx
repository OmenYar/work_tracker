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

    // Determine active tab based on URL path or query param
    // Priority:
    // 1. Path segment (e.g. /admin/tracker... -> 'tracker')
    // 2. Query param ?tab=...
    // 3. Default 'dashboard'

    // Logic:
    // If path is exactly '/admin', use query param or 'dashboard'.
    // If path starts with '/admin/tracker', activeTab = 'tracker'.
    // If path starts with '/admin/pic', activeTab = 'pic'.
    // If path starts with '/admin/car', activeTab = 'car'.
    // If path starts with '/admin/users', activeTab = 'users'.

    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/input-tracker') || path.includes('/edit-tracker')) return 'tracker';
        if (path.includes('/input-pic') || path.includes('/edit-pic')) return 'pic';
        if (path.includes('/input-car') || path.includes('/edit-car')) return 'car';

        // Fallback to query param if on root
        return searchParams.get('tab') || 'dashboard';
    };

    const activeTab = getActiveTab();

    const handleSetActiveTab = (tabId) => {
        // If clicking a tab, always go to root /admin with ?tab=ID
        // unless it's strictly the dashboard
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
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={handleSetActiveTab}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden p-4 border-b bg-card flex items-center justify-between shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="h-6 w-6" />
                    </Button>
                    <h1 className="font-semibold text-lg">WorkTracker</h1>
                    <ThemeToggle />
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
