import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import CCTVDataForm from '@/components/CCTVDataForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const InputCCTVPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const { toast } = useToast();
    const [initialData, setInitialData] = useState(null);
    const [isLoading, setIsLoading] = useState(!!id);

    // Get the return URL from state or default to /admin?tab=cctv
    const returnUrl = location.state?.returnUrl || '/admin?tab=cctv';

    useEffect(() => {
        if (id) {
            const fetchData = async () => {
                try {
                    const { data, error } = await supabase
                        .from('cctv_data')
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (error) throw error;
                    setInitialData(data);
                } catch (error) {
                    console.error('Error fetching CCTV:', error);
                    toast({ variant: "destructive", title: "Error", description: "Failed to load CCTV data." });
                    navigate(returnUrl);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [id, navigate, toast, returnUrl]);

    const handleCCTVSubmit = async (formData) => {
        try {
            const { id: _, ...data } = formData;
            const payload = {
                ...data,
                install_date: data.install_date || null,
            };

            let error;
            if (id) {
                ({ error } = await supabase.from('cctv_data').update(payload).eq('id', id));
            } else {
                ({ error } = await supabase.from('cctv_data').insert([payload]));
            }

            if (error) throw error;
            toast({ title: "Success", description: id ? "CCTV Data updated." : "New CCTV Data saved." });
            navigate(returnUrl);
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-full p-10">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(returnUrl)}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{id ? 'Edit Data CCTV' : 'Input Data CCTV'}</h1>
                        <p className="text-muted-foreground">{id ? 'Update CCTV details.' : 'Register a new CCTV.'}</p>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-sm border p-6 md:p-8">
                    <CCTVDataForm
                        onSubmit={handleCCTVSubmit}
                        initialData={initialData}
                        onCancel={() => navigate(returnUrl)}
                    />
                </div>
            </div>
        </div>
    );
};

export default InputCCTVPage;
