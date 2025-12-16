import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { logLogin, logLogout } from '@/lib/activityLogger';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userProfile, setUserProfile] = useState(null);

    // Use ref to track if we're already initializing to prevent double-fetch
    const initializingRef = useRef(false);
    const loadingTimeoutRef = useRef(null);
    const profileLoadedRef = useRef(false);

    // Fetch profile helper with timeout
    const fetchProfile = async (userId) => {
        try {
            // 10 second timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
            );

            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error) {
                // If profile doesn't exist, that's okay
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error("Error fetching profile:", error.message);
                return null;
            }

            return data;
        } catch (err) {
            // Only log if not a timeout (which is normal during slow networks)
            if (err.message !== 'Profile fetch timeout') {
                console.error("Error fetching profile:", err.message);
            }
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;

        // Safety timeout - if loading takes more than 15 seconds, force stop
        loadingTimeoutRef.current = setTimeout(() => {
            if (mounted) {
                setIsLoading(false);
            }
        }, 15000);

        const initializeAuth = async () => {
            if (initializingRef.current) return;
            initializingRef.current = true;

            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (mounted) {
                    if (session?.user) {
                        setUser(session.user);
                        setIsAuthenticated(true);

                        const profile = await fetchProfile(session.user.id);
                        if (profile) {
                            setUserRole(profile.role);
                            setUserProfile(profile);
                            profileLoadedRef.current = true;
                        }
                    } else {
                        setUser(null);
                        setIsAuthenticated(false);
                        setUserRole(null);
                        setUserProfile(null);
                    }

                    setIsLoading(false);
                    if (loadingTimeoutRef.current) {
                        clearTimeout(loadingTimeoutRef.current);
                    }
                }
            } catch (err) {
                console.error("Auth initialization error:", err.message);
                if (mounted) {
                    setUser(null);
                    setIsAuthenticated(false);
                    setIsLoading(false);
                    if (loadingTimeoutRef.current) {
                        clearTimeout(loadingTimeoutRef.current);
                    }
                }
            } finally {
                initializingRef.current = false;
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            // Handle logout
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setIsAuthenticated(false);
                setUserRole(null);
                setUserProfile(null);
                profileLoadedRef.current = false;
                setIsLoading(false);
                return;
            }

            // Handle sign in and token refresh
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    setUser(session.user);
                    setIsAuthenticated(true);

                    // Only fetch profile if we don't have it yet
                    if (!profileLoadedRef.current) {
                        const profile = await fetchProfile(session.user.id);
                        if (profile) {
                            setUserRole(profile.role);
                            setUserProfile(profile);
                            profileLoadedRef.current = true;
                        }
                    }
                }
                setIsLoading(false);
            } else if (event === 'INITIAL_SESSION') {
                // Already handled in initializeAuth
                setIsLoading(false);
            } else if (!session?.user) {
                setUser(null);
                setIsAuthenticated(false);
                setUserRole(null);
                setUserProfile(null);
                profileLoadedRef.current = false;
                setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription?.unsubscribe();
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, []);

    const login = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error("Login Error:", error.message);
                return { success: false, error };
            }

            // Log login activity
            logLogin();

            return { success: true };
        } catch (err) {
            console.error("Login Exception:", err.message);
            return { success: false, error: err };
        }
    };

    const logout = async () => {
        if (!isAuthenticated) return;

        try {
            await logLogout();
            setIsLoading(true);
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Logout Error:", error.message);
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            isAuthenticated,
            isLoading,
            user,
            userRole,
            profile: userProfile,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
