import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/lib/customSupabaseClient';

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { toast } = useToast();
    const { login, user } = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate('/admin');
        }
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { success, error } = await login(email, password);

            if (success) {
                toast({ title: "Success", description: "Logged in successfully." });
                navigate('/admin');
            } else {
                toast({
                    variant: "destructive",
                    title: "Login Failed",
                    description: error?.message || "Invalid credentials"
                });
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Login Handle Error:", err);
            setIsLoading(false);
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred during login."
            });
        }
    };

    // Test Connection on Mount
    React.useEffect(() => {
        const testConnection = async () => {
            console.log("Test: Checking network connectivity...");

            // 1. Try raw fetch to Supabase (Rest endpoint)
            const sbUrl = import.meta.env.VITE_SUPABASE_URL;
            console.log("Test: Pinging " + sbUrl);

            try {
                // Using a short timeout to fail fast
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

                const response = await fetch(`${sbUrl}/rest/v1/`, {
                    method: 'GET',
                    headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                console.log("Test: Fetch Status:", response.status);
                if (response.status === 200 || response.status === 404) {
                    console.log("Test: Network is OK (Server Responded)");
                    // toast({ title: "Network OK", description: "Connected to Supabase server." });
                } else {
                    console.warn("Test: Network OK but weird status:", response.status);
                }
            } catch (err) {
                console.error("Test: Fetch FAILED completely:", err);
                toast({ variant: "destructive", title: "Network Error", description: "Browser cannot reach Supabase. Check Firewall/VPN." });
            }
        };
        testConnection();
    }, []);

    return (
        <>
            <Helmet>
                <title>Portal Login</title>
            </Helmet>

            <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
                <div className="absolute top-4 right-4 z-10">
                    <ThemeToggle />
                </div>

                {/* Decorative background elements */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[100px]" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-[400px] relative z-10"
                >
                    <div className="bg-card rounded-2xl shadow-2xl border border-border p-8">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                                <Lock className="w-8 h-8 text-primary" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
                            <p className="text-muted-foreground mt-2">Please sign in to continue</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@company.com"
                                        className="pl-10"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            <p>Contact administrator for access</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default LoginPage;
