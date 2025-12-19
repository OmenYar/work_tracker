import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

// Contexts
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Error Boundary
import ErrorBoundary from '@/components/ErrorBoundary';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const InputTrackerPage = lazy(() => import('@/pages/forms/InputTrackerPage'));
const InputPicPage = lazy(() => import('@/pages/forms/InputPicPage'));
const InputCarPage = lazy(() => import('@/pages/forms/InputCarPage'));
const InputCCTVPage = lazy(() => import('@/pages/forms/InputCCTVPage'));
const InputModulePage = lazy(() => import('@/pages/forms/InputModulePage'));

// Layout (keep synchronous for better UX)
import AdminLayout from '@/layouts/AdminLayout';

// Loading fallback component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
    </div>
);

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <PageLoader />;
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
                <AuthProvider>
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/login" element={<LoginPage />} />

                            {/* Admin Routes */}
                            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                                <Route index element={<AdminDashboard />} />
                                <Route path="input-tracker" element={<InputTrackerPage />} />
                                <Route path="edit-tracker/:id" element={<InputTrackerPage />} />
                                <Route path="input-pic" element={<InputPicPage />} />
                                <Route path="edit-pic/:id" element={<InputPicPage />} />
                                <Route path="input-car" element={<InputCarPage />} />
                                <Route path="edit-car/:id" element={<InputCarPage />} />
                                <Route path="input-cctv" element={<InputCCTVPage />} />
                                <Route path="edit-cctv/:id" element={<InputCCTVPage />} />
                                <Route path="input-module" element={<InputModulePage />} />
                                <Route path="edit-module/:id" element={<InputModulePage />} />
                            </Route>

                            {/* Redirect old routes */}
                            <Route path="/input-module" element={<Navigate to="/admin/input-module" replace />} />
                            <Route path="/edit-module/:id" element={<Navigate to="/admin/edit-module/:id" replace />} />
                        </Routes>
                    </Suspense>

                    <Toaster />
                </AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default App;
