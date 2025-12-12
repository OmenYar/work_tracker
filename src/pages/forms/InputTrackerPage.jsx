import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import WorkTrackerForm from '@/components/WorkTrackerForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const InputTrackerPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const { toast } = useToast();
    const [initialData, setInitialData] = useState(null);
    const [isLoading, setIsLoading] = useState(!!id);

    // Get the return URL from state or default to /admin?tab=tracker
    const returnUrl = location.state?.returnUrl || '/admin?tab=tracker';

    useEffect(() => {
        if (id) {
            const fetchData = async () => {
                try {
                    const { data, error } = await supabase
                        .from('work_trackers')
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (error) throw error;
                    setInitialData(data);
                } catch (error) {
                    console.error('Error fetching tracker:', error);
                    toast({ variant: "destructive", title: "Error", description: "Failed to load tracker data." });
                    navigate(returnUrl);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [id, navigate, toast, returnUrl]);

    const handleTrackerSubmit = async (formData) => {
        try {
            console.log("📥 Received form data in InputTrackerPage:", formData);
            console.log("📥 Aging days from form:", formData.aging_days, "Type:", typeof formData.aging_days);

            const payload = {
                ...formData,
                bast_submit_date: formData.bast_submit_date || null,
                bast_approve_date: formData.bast_approve_date || null,
                aging_days: formData.aging_days !== '' && formData.aging_days !== null && formData.aging_days !== undefined
                    ? Number(formData.aging_days)
                    : null,
            };

            console.log("💾 Payload to send to database:", payload);
            console.log("💾 Aging days in payload:", payload.aging_days, "Type:", typeof payload.aging_days);

            let error;
            if (id) {
                // Update
                ({ error } = await supabase.from('work_trackers').update(payload).eq('id', id));
            } else {
                // Insert
                ({ error } = await supabase.from('work_trackers').insert([payload]));
            }

            if (error) throw error;

            console.log("✅ Data saved successfully!");
            toast({ title: "Success", description: id ? "Tracker Data updated." : "New Tracker Data saved." });
            navigate(returnUrl);
        } catch (err) {
            console.error("❌ Error saving data:", err);
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
                        <h1 className="text-3xl font-bold tracking-tight">{id ? 'Edit Data Tracker' : 'Input Data Tracker'}</h1>
                        <p className="text-muted-foreground">{id ? 'Update existing tracker details.' : 'Create a new work tracker record.'}</p>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-sm border p-6 md:p-8">
                    <WorkTrackerForm
                        onSubmit={handleTrackerSubmit}
                        initialData={initialData}
                        onCancel={() => navigate(returnUrl)}
                    />
                </div>
            </div>
        </div>
    );
};

export default InputTrackerPage;

