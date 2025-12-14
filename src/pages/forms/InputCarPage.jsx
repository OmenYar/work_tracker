import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import CarDataForm from '@/components/CarDataForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { syncCarToGoogleSheets } from '@/lib/googleSheetsSync';
import { logInsert, logUpdate } from '@/lib/activityLogger';

const InputCarPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const { toast } = useToast();
    const [initialData, setInitialData] = useState(null);
    const [isLoading, setIsLoading] = useState(!!id);

    // Get the return URL from state or default to /admin?tab=car
    const returnUrl = location.state?.returnUrl || '/admin?tab=car';

    useEffect(() => {
        if (id) {
            const fetchData = async () => {
                try {
                    const { data, error } = await supabase
                        .from('car_data')
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (error) throw error;
                    setInitialData(data);
                } catch (error) {
                    console.error('Error fetching car:', error);
                    toast({ variant: "destructive", title: "Error", description: "Failed to load car data." });
                    navigate(returnUrl);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [id, navigate, toast, returnUrl]);

    const handleCarSubmit = async (formData) => {
        try {
            const { id: _, ...data } = formData;
            const payload = {
                ...data,
                masa_berlaku_stnk: data.masa_berlaku_stnk || null,
                masa_berlaku_pajak: data.masa_berlaku_pajak || null,
                masa_berlaku_kir: data.masa_berlaku_kir || null,
                date_service: data.date_service || null,
            };

            let error;
            let savedRecordId = id;

            if (id) {
                ({ error } = await supabase.from('car_data').update(payload).eq('id', id));
            } else {
                const { data: insertedData, error: insertError } = await supabase
                    .from('car_data')
                    .insert([payload])
                    .select('id')
                    .single();

                error = insertError;
                savedRecordId = insertedData?.id;
            }

            if (error) throw error;

            // Log activity
            if (id) {
                logUpdate('car_data', savedRecordId, `Updated car: ${payload.nomor_polisi}`);
            } else {
                logInsert('car_data', savedRecordId, `Created car: ${payload.nomor_polisi}`);
            }

            // Fetch PIC name for Google Sheets sync
            let picName = '';
            if (payload.pic_id) {
                const { data: picData } = await supabase
                    .from('pic_data')
                    .select('nama_pic')
                    .eq('id', payload.pic_id)
                    .single();
                picName = picData?.nama_pic || '';
            }

            // Sync to Google Sheets (non-blocking) - include pic_name
            const syncPayload = {
                ...payload,
                pic_name: picName,
            };

            syncCarToGoogleSheets(syncPayload, savedRecordId, !!id)
                .then((syncResult) => {
                    if (syncResult.success) {
                        console.log('✅ Car synced to Google Sheets');
                    } else {
                        console.warn('⚠️ Google Sheets sync failed:', syncResult.error);
                    }
                })
                .catch((syncError) => {
                    console.error('❌ Google Sheets sync error:', syncError);
                });

            toast({ title: "Success", description: id ? "Car Data updated." : "New Car Data saved." });
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
                        <h1 className="text-3xl font-bold tracking-tight">{id ? 'Edit Data Mobil' : 'Input Data Mobil'}</h1>
                        <p className="text-muted-foreground">{id ? 'Update vehicle details.' : 'Register a new vehicle.'}</p>
                    </div>
                </div>

                <div className="bg-card rounded-xl shadow-sm border p-6 md:p-8">
                    <CarDataForm
                        onSubmit={handleCarSubmit}
                        initialData={initialData}
                        onCancel={() => navigate(returnUrl)}
                    />
                </div>
            </div>
        </div>
    );
};

export default InputCarPage;
