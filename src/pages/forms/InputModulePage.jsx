import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModuleDataForm from '@/components/ModuleDataForm';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { syncModuleToGoogleSheets } from '@/lib/googleSheetsSync';
import { useAuth } from '@/contexts/AuthContext';

const InputModulePage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToast();
    const { profile } = useAuth(); // Get user profile
    const [moduleData, setModuleData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const isEditMode = Boolean(id);

    // Check Access
    useEffect(() => {
        const hasAccess = profile?.role === 'Administrator' || profile?.role === 'AM' || profile?.role?.includes('Jabo');
        if (!hasAccess) {
            toast({ title: 'Access Denied', description: 'Anda tidak memiliki hak akses halaman ini.', variant: 'destructive' });
            navigate('/admin');
        }
    }, [profile, navigate]);

    useEffect(() => {
        if (isEditMode) {
            fetchModuleData();
        }
    }, [id]);

    const fetchModuleData = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('module_tracker')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setModuleData(data);
        } catch (error) {
            toast({ title: 'Error', description: 'Gagal memuat data module', variant: 'destructive' });
            navigate('/admin?tab=module');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (formData) => {
        setIsLoading(true);
        try {
            // Sanitize date fields - convert empty strings to null
            const sanitizedData = { ...formData };
            const dateFields = ['install_date'];
            dateFields.forEach(field => {
                if (!sanitizedData[field] || (typeof sanitizedData[field] === 'string' && sanitizedData[field].trim() === '')) {
                    sanitizedData[field] = null;
                }
            });

            let recordId = id;

            if (isEditMode) {
                const { error } = await supabase
                    .from('module_tracker')
                    .update(sanitizedData)
                    .eq('id', id);

                if (error) throw error;

                // Sync to Google Sheets
                await syncModuleToGoogleSheets(sanitizedData, id, true);

                toast({ title: 'Berhasil', description: 'Data module berhasil diupdate' });
            } else {
                const { data: insertedData, error } = await supabase
                    .from('module_tracker')
                    .insert(sanitizedData)
                    .select()
                    .single();

                if (error) throw error;

                recordId = insertedData.id;

                // Sync to Google Sheets
                await syncModuleToGoogleSheets(sanitizedData, recordId, false);

                toast({ title: 'Berhasil', description: 'Data module berhasil ditambahkan' });
            }
            navigate('/admin?tab=module');
        } catch (error) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/admin?tab=module');
    };

    if (isEditMode && isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto py-6 px-4 max-w-3xl">
                <Button
                    variant="ghost"
                    className="mb-4"
                    onClick={() => navigate('/admin?tab=module')}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali ke Module
                </Button>

                <ModuleDataForm
                    onSubmit={handleSubmit}
                    initialData={moduleData}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
};

export default InputModulePage;
