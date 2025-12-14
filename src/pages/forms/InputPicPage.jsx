import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PicDataForm from '@/components/PicDataForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { syncPICToGoogleSheets } from '@/lib/googleSheetsSync';
import { logInsert, logUpdate } from '@/lib/activityLogger';

const InputPicPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const { toast } = useToast();
    const [initialData, setInitialData] = useState(null);
    const [isLoading, setIsLoading] = useState(!!id);

    // Get the return URL from state or default to /admin?tab=pic
    const returnUrl = location.state?.returnUrl || '/admin?tab=pic';

    useEffect(() => {
        if (id) {
            const fetchData = async () => {
                try {
                    const { data, error } = await supabase
                        .from('pic_data')
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (error) throw error;
                    setInitialData(data);
                } catch (error) {
                    console.error('Error fetching PIC:', error);
                    toast({ variant: "destructive", title: "Error", description: "Failed to load PIC data." });
                    navigate(returnUrl);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [id, navigate, toast, returnUrl]);

    const handlePicSubmit = async (formData) => {
        try {
            const { id: _, ...data } = formData;
            const payload = {
                ...data,
                tgl_join: data.tgl_join || null,
                tgl_berakhir: data.tgl_berakhir || null,
            };

            let error;
            let savedRecordId = id;

            if (id) {
                ({ error } = await supabase.from('pic_data').update(payload).eq('id', id));
            } else {
                const { data: insertedData, error: insertError } = await supabase
                    .from('pic_data')
                    .insert([payload])
                    .select('id')
                    .single();

                error = insertError;
                savedRecordId = insertedData?.id;
            }

            if (error) throw error;

            // Log activity
            if (id) {
                logUpdate('pic_data', savedRecordId, `Updated PIC: ${payload.nama_pic}`);
            } else {
                logInsert('pic_data', savedRecordId, `Created PIC: ${payload.nama_pic}`);
            }

            // Sync to Google Sheets (non-blocking)
            syncPICToGoogleSheets(payload, savedRecordId, !!id)
                .then((syncResult) => {
                    if (syncResult.success) {
                        console.log('✅ PIC synced to Google Sheets');
                    } else {
                        console.warn('⚠️ Google Sheets sync failed:', syncResult.error);
                    }
                })
                .catch((syncError) => {
                    console.error('❌ Google Sheets sync error:', syncError);
                });

            toast({ title: "Success", description: id ? "PIC Data updated." : "New PIC Data saved." });
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
                        <h1 className="text-3xl font-bold tracking-tight">{id ? 'Edit Data PIC' : 'Input Data PIC'}</h1>
                        <p className="text-muted-foreground">{id ? 'Update PIC details.' : 'Add a new Person In Charge.'}</p>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-sm border p-6 md:p-8">
                    <PicDataForm
                        onSubmit={handlePicSubmit}
                        initialData={initialData}
                        onCancel={() => navigate(returnUrl)}
                    />
                </div>
            </div>
        </div>
    );
};

export default InputPicPage;
