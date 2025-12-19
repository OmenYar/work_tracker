import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModuleDataForm from '@/components/ModuleDataForm';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const InputModulePage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToast();
    const [moduleData, setModuleData] = useState(null);
    const [picData, setPicData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const isEditMode = Boolean(id);

    useEffect(() => {
        fetchPicData();
        if (isEditMode) {
            fetchModuleData();
        }
    }, [id]);

    const fetchPicData = async () => {
        try {
            const { data, error } = await supabase
                .from('pic_data')
                .select('id, nama_pic, validasi')
                .order('nama_pic');

            if (error) throw error;
            setPicData(data || []);
        } catch (error) {
            console.error('Error fetching PIC data:', error);
        }
    };

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
            const dateFields = ['rfs_date', 'plan_install'];
            dateFields.forEach(field => {
                if (!sanitizedData[field] || (typeof sanitizedData[field] === 'string' && sanitizedData[field].trim() === '')) {
                    sanitizedData[field] = null;
                }
            });

            if (isEditMode) {
                const { error } = await supabase
                    .from('module_tracker')
                    .update(sanitizedData)
                    .eq('id', id);

                if (error) throw error;
                toast({ title: 'Berhasil', description: 'Data module berhasil diupdate' });
            } else {
                const { error } = await supabase
                    .from('module_tracker')
                    .insert(sanitizedData);

                if (error) throw error;
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
                    picData={picData}
                />
            </div>
        </div>
    );
};

export default InputModulePage;
