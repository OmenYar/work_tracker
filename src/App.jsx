import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';

// Contexts
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import AdminDashboard from '@/pages/AdminDashboard';
import InputTrackerPage from '@/pages/forms/InputTrackerPage';
import InputPicPage from '@/pages/forms/InputPicPage';
import InputCarPage from '@/pages/forms/InputCarPage';
import InputCCTVPage from '@/pages/forms/InputCCTVPage';

// Layout
import AdminLayout from '@/layouts/AdminLayout';

// Error Boundary
import ErrorBoundary from '@/components/ErrorBoundary';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
                <AuthProvider>
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
                        </Route>
                    </Routes>

                    <Toaster />
                </AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default App;
