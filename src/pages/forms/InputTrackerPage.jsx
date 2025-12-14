import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import WorkTrackerForm from '@/components/WorkTrackerForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { syncTrackerToGoogleSheets } from '@/lib/googleSheetsSync';
import { logInsert, logUpdate } from '@/lib/activityLogger';

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

            const payload = {
                ...formData,
                bast_submit_date: formData.bast_submit_date || null,
                bast_approve_date: formData.bast_approve_date || null,
                aging_days: formData.aging_days !== '' && formData.aging_days !== null && formData.aging_days !== undefined
                    ? Number(formData.aging_days)
                    : null,
            };

            let error;
            let savedRecordId = id;

            if (id) {
                ({ error } = await supabase.from('work_trackers').update(payload).eq('id', id));
            } else {
                const { data: insertedData, error: insertError } = await supabase
                    .from('work_trackers')
                    .insert([payload])
                    .select('id')
                    .single();

                error = insertError;
                savedRecordId = insertedData?.id;
            }

            if (error) throw error;

            // Log activity
            if (id) {
                logUpdate('work_trackers', savedRecordId, `Updated tracker: ${payload.site_name || payload.site_id_1}`);
            } else {
                logInsert('work_trackers', savedRecordId, `Created tracker: ${payload.site_name || payload.site_id_1}`);
            }

            // Sync to Google Sheets (non-blocking)
            syncTrackerToGoogleSheets(payload, savedRecordId, !!id)
                .then((syncResult) => {
                    if (syncResult.success) {
                        console.log('✅ Tracker synced to Google Sheets');
                    } else {
                        console.warn('⚠️ Google Sheets sync failed:', syncResult.error);
                    }
                })
                .catch((syncError) => {
                    console.error('❌ Google Sheets sync error:', syncError);
                });

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

