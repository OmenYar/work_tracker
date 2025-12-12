import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

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
    const profileLoadedRef = useRef(false); // Track if profile is loaded

    // Fetch profile helper with timeout
    const fetchProfile = async (userId) => {
        try {
            console.log("📋 Fetching profile for user:", userId);

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );

            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error) {
                console.error("❌ Error fetching profile:", error);
                // If profile doesn't exist, that's okay - user might not have one yet
                if (error.code === 'PGRST116') {
                    console.warn("⚠️ No profile found for user - this might be expected");
                    return null;
                }
                return null;
            }

            console.log("✅ Profile fetched successfully:", data?.role);
            return data;
        } catch (err) {
            console.error("❌ Unexpected error fetching profile:", err);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;

        // Safety timeout - if loading takes more than 10 seconds, force stop
        loadingTimeoutRef.current = setTimeout(() => {
            console.warn("Auth initialization timeout - forcing isLoading to false");
            if (mounted) {
                setIsLoading(false);
            }
        }, 10000);

        const initializeAuth = async () => {
            if (initializingRef.current) {
                console.log("Already initializing, skipping...");
                return;
            }
            initializingRef.current = true;

            try {
                console.log("🔐 Initializing auth...");
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("Session error:", error);
                    throw error;
                }

                console.log("Session found:", !!session?.user, session?.user?.email);

                if (mounted) {
                    if (session?.user) {
                        setUser(session.user);
                        setIsAuthenticated(true);

                        console.log("Fetching profile for:", session.user.id);
                        const profile = await fetchProfile(session.user.id);
                        if (profile) {
                            console.log("Profile loaded:", profile.role);
                            setUserRole(profile.role);
                            setUserProfile(profile);
                            profileLoadedRef.current = true; // Mark as loaded
                        } else {
                            console.warn("No profile found for user");
                        }
                    } else {
                        console.log("No session found");
                        setUser(null);
                        setIsAuthenticated(false);
                        setUserRole(null);
                        setUserProfile(null);
                    }

                    console.log("✅ Auth initialization complete");
                    setIsLoading(false);
                    if (loadingTimeoutRef.current) {
                        clearTimeout(loadingTimeoutRef.current);
                    }
                }
            } catch (err) {
                console.error("❌ Auth initialization error:", err);
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

            console.log("🔄 Auth State Change:", event, session?.user?.email);

            // Handle logout
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setIsAuthenticated(false);
                setUserRole(null);
                setUserProfile(null);
                profileLoadedRef.current = false; // Reset on logout
                setIsLoading(false);
                return;
            }

            // Handle sign in and token refresh
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user) {
                    setUser(session.user);
                    setIsAuthenticated(true);

                    // Only fetch profile if we don't have it yet
                    // Use ref to avoid stale closure issues
                    if (!profileLoadedRef.current) {
                        console.log("🔄 Fetching profile due to auth state change...");
                        const profile = await fetchProfile(session.user.id);
                        if (profile) {
                            setUserRole(profile.role);
                            setUserProfile(profile);
                            profileLoadedRef.current = true;
                        }
                    } else {
                        console.log("✅ Profile already loaded, skipping fetch");
                    }
                }
                setIsLoading(false);
            } else if (event === 'INITIAL_SESSION') {
                // INITIAL_SESSION is fired after initialization
                // We already handled this in initializeAuth, so just ensure loading is false
                console.log("✅ Initial session confirmed");
                setIsLoading(false);
            } else if (!session?.user) {
                // Any other event without a user means logged out
                setUser(null);
                setIsAuthenticated(false);
                setUserRole(null);
                setUserProfile(null);
                profileLoadedRef.current = false; // Reset on logout
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
    }, []); // Empty dependency array - only run once

    const login = async (email, password) => {
        try {
            console.log("🔑 Attempting login for:", email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error("❌ Login Error:", error.message);
                return { success: false, error };
            }

            console.log("✅ Login successful, waiting for auth state change...");
            // onAuthStateChange will handle setting the user state
            return { success: true };
        } catch (err) {
            console.error("❌ Login Exception:", err);
            return { success: false, error: err };
        }
    };

    const logout = async () => {
        // Prevent double logout
        if (!isAuthenticated) {
            console.log("⚠️ Already logged out, skipping...");
            return;
        }

        try {
            console.log("🚪 Logging out...");
            setIsLoading(true);
            await supabase.auth.signOut();
            console.log("✅ Logout successful");
            // onAuthStateChange will handle clearing state
        } catch (error) {
            console.error("❌ Logout Error:", error);
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
