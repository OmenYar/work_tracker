import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';

// Service options with scores
const SERVICE_OPTIONS = [
    { id: 'elektrikal', label: 'Elektrikal', score: 1 },
    { id: 'rem', label: 'Rem', score: 2 },
    { id: 'ban_kaki', label: 'Ban & Kaki-kaki', score: 1.5 },
    { id: 'mesin', label: 'Mesin & Performa', score: 2 },
];

// Calculate priority based on total score
const calculatePriority = (selectedServices) => {
    const total = selectedServices.reduce((sum, serviceId) => {
        const service = SERVICE_OPTIONS.find(s => s.id === serviceId);
        return sum + (service?.score || 0);
    }, 0);

    if (total >= 4) return 'HIGH';
    if (total >= 2) return 'MEDIUM';
    return 'LOW';
};

// Helper to calculate document status from date
const getDocumentStatus = (expiryDate) => {
    if (!expiryDate) return 'N/A';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return `EXPIRED (${Math.abs(diffDays)} hari)`;
    } else if (diffDays <= 30) {
        return `SEGERA (${diffDays} hari)`;
    }
    return 'AKTIF';
};

const CarDataForm = ({ onSubmit, initialData, onCancel }) => {
    const [formData, setFormData] = useState({
        nomor_polisi: '',
        owner: '',
        project: '',
        province: '',
        area: '',
        kabupaten: '',
        model: '',
        brand: '',
        year_build: '',
        masa_berlaku_stnk: '',
        masa_berlaku_pajak: '',
        masa_berlaku_kir: '',
        status_stnk: 'AKTIF',
        status_pajak: 'AKTIF',
        status_kir: 'AKTIF',
        condition: '',
        status_mobil: 'AKTIF',
        priority: 'LOW',
        service_info: '',
        remark: '',
        date_service: '',
        nominal_service: '',
        plan_next_service: '',
        pic_id: '',
    });

    const [selectedServices, setSelectedServices] = useState([]);
    const [picList, setPicList] = useState([]);

    // Fetch PIC list from database - fetch ALL PICs
    useEffect(() => {
        const fetchPicList = async () => {
            try {
                const { data, error } = await supabase
                    .from('pic_data')
                    .select('id, nama_pic, validasi')
                    .order('nama_pic', { ascending: true });

                if (error) throw error;

                // Show all PICs (both active and inactive)
                setPicList(data || []);
            } catch (err) {
                console.error('Error fetching PIC list:', err);
            }
        };
        fetchPicList();
    }, [initialData]);

    useEffect(() => {
        if (initialData) {
            // Parse plan_next_service from comma-separated string
            const services = initialData.plan_next_service
                ? initialData.plan_next_service.split(',').map(s => s.trim()).filter(Boolean)
                : [];

            // Map label back to id
            const serviceIds = services.map(label => {
                const opt = SERVICE_OPTIONS.find(o => o.label === label);
                return opt?.id;
            }).filter(Boolean);

            setSelectedServices(serviceIds);

            setFormData({
                ...initialData,
                masa_berlaku_stnk: initialData.masa_berlaku_stnk || '',
                masa_berlaku_pajak: initialData.masa_berlaku_pajak || '',
                masa_berlaku_kir: initialData.masa_berlaku_kir || '',
                date_service: initialData.date_service || '',
                service_info: initialData.service_info || '',
                // Convert pic_id to string for Select component compatibility
                pic_id: initialData.pic_id ? String(initialData.pic_id) : '',
                priority: initialData.priority || calculatePriority(serviceIds),
            });
        }
    }, [initialData]);



    // Auto-update priority when services change
    useEffect(() => {
        const newPriority = calculatePriority(selectedServices);
        setFormData(prev => ({ ...prev, priority: newPriority }));
    }, [selectedServices]);

    // Auto-update document statuses when dates change
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            status_stnk: getDocumentStatus(prev.masa_berlaku_stnk),
            status_pajak: getDocumentStatus(prev.masa_berlaku_pajak),
            status_kir: getDocumentStatus(prev.masa_berlaku_kir),
        }));
    }, [formData.masa_berlaku_stnk, formData.masa_berlaku_pajak, formData.masa_berlaku_kir]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleServiceToggle = (serviceId) => {
        setSelectedServices(prev => {
            if (prev.includes(serviceId)) {
                return prev.filter(id => id !== serviceId);
            } else {
                return [...prev, serviceId];
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Convert selected services to comma-separated labels
        const serviceLabels = selectedServices.map(id => {
            const opt = SERVICE_OPTIONS.find(o => o.id === id);
            return opt?.label;
        }).filter(Boolean);

        const submitData = {
            ...formData,
            plan_next_service: serviceLabels.join(','),
            priority: calculatePriority(selectedServices),
        };

        onSubmit(submitData);
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'HIGH': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
            case 'MEDIUM': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
            case 'LOW': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Nomor Polisi</Label>
                    <Input name="nomor_polisi" value={formData.nomor_polisi} onChange={handleChange} required placeholder="B 1234 ABC" />
                </div>
                <div className="space-y-2">
                    <Label>Owner</Label>
                    <Input name="owner" value={formData.owner} onChange={handleChange} placeholder="PT CRI" />
                </div>
                <div className="space-y-2">
                    <Label>PIC Mobil</Label>
                    {picList.length > 0 ? (
                        <Select
                            key={`pic-select-${formData.pic_id || 'empty'}`}
                            value={formData.pic_id || '_none_'}
                            onValueChange={v => handleSelectChange('pic_id', v === '_none_' ? '' : v)}
                        >
                            <SelectTrigger>
                                <SelectValue>
                                    {formData.pic_id
                                        ? picList.find(p => String(p.id) === formData.pic_id)?.nama_pic || 'Pilih PIC'
                                        : '-- Tidak Ada --'
                                    }
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_none_">-- Tidak Ada --</SelectItem>
                                {picList.map(pic => (
                                    <SelectItem key={pic.id} value={String(pic.id)}>{pic.nama_pic}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="h-10 px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm">
                            Loading PIC...
                        </div>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>Project</Label>
                    <Input name="project" value={formData.project} onChange={handleChange} placeholder="MS OM PROTELINDO" />
                </div>
                <div className="space-y-2">
                    <Label>Province</Label>
                    <Input name="province" value={formData.province} onChange={handleChange} placeholder="JAWA BARAT" />
                </div>
                <div className="space-y-2">
                    <Label>Area</Label>
                    <Select value={formData.area} onValueChange={v => handleSelectChange('area', v)}>
                        <SelectTrigger><SelectValue placeholder="Pilih Area" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Jabo Outer 1">Jabo Outer 1</SelectItem>
                            <SelectItem value="Jabo Outer 2">Jabo Outer 2</SelectItem>
                            <SelectItem value="Jabo Outer 3">Jabo Outer 3</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Kabupaten</Label>
                    <Input name="kabupaten" value={formData.kabupaten} onChange={handleChange} placeholder="DEPOK" />
                </div>
                <div className="space-y-2">
                    <Label>Model</Label>
                    <Input name="model" value={formData.model} onChange={handleChange} placeholder="PICK UP" />
                </div>
                <div className="space-y-2">
                    <Label>Brand</Label>
                    <Input name="brand" value={formData.brand} onChange={handleChange} placeholder="Daihatsu" />
                </div>
                <div className="space-y-2">
                    <Label>Year Build</Label>
                    <Input name="year_build" type="number" value={formData.year_build} onChange={handleChange} placeholder="2018" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                <div className="space-y-2">
                    <Label>Masa Berlaku STNK</Label>
                    <Input name="masa_berlaku_stnk" type="date" value={formData.masa_berlaku_stnk} onChange={handleChange} />
                    <p className={`text-xs font-medium px-2 py-1 rounded ${formData.status_stnk?.includes('EXPIRED') ? 'text-red-600 bg-red-100' : formData.status_stnk?.includes('SEGERA') ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100'}`}>
                        Status: {formData.status_stnk}
                    </p>
                </div>
                <div className="space-y-2">
                    <Label>Masa Berlaku Pajak</Label>
                    <Input name="masa_berlaku_pajak" type="date" value={formData.masa_berlaku_pajak} onChange={handleChange} />
                    <p className={`text-xs font-medium px-2 py-1 rounded ${formData.status_pajak?.includes('EXPIRED') ? 'text-red-600 bg-red-100' : formData.status_pajak?.includes('SEGERA') ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100'}`}>
                        Status: {formData.status_pajak}
                    </p>
                </div>
                <div className="space-y-2">
                    <Label>Masa Berlaku KIR</Label>
                    <Input name="masa_berlaku_kir" type="date" value={formData.masa_berlaku_kir} onChange={handleChange} />
                    <p className={`text-xs font-medium px-2 py-1 rounded ${formData.status_kir?.includes('EXPIRED') ? 'text-red-600 bg-red-100' : formData.status_kir?.includes('SEGERA') ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100'}`}>
                        Status: {formData.status_kir}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                    <Label>Condition</Label>
                    <Select value={formData.condition} onValueChange={v => handleSelectChange('condition', v)}>
                        <SelectTrigger><SelectValue placeholder="Select Condition" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GOOD">GOOD</SelectItem>
                            <SelectItem value="NEED SERVICE">NEED SERVICE</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Status Mobil</Label>
                    <Select value={formData.status_mobil} onValueChange={v => handleSelectChange('status_mobil', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="AKTIF">AKTIF</SelectItem>
                            <SelectItem value="NON AKTIF">NON AKTIF</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Plan Next Service - Checkbox Group */}
            <div className="border-t pt-4 space-y-3">
                <Label className="text-base font-semibold">Plan Next Service</Label>
                <p className="text-sm text-muted-foreground">Pilih komponen yang perlu diservis (mempengaruhi Priority Service)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SERVICE_OPTIONS.map(service => (
                        <label
                            key={service.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedServices.includes(service.id)
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedServices.includes(service.id)}
                                onChange={() => handleServiceToggle(service.id)}
                                className="w-4 h-4 accent-primary"
                            />
                            <div>
                                <span className="font-medium">{service.label}</span>
                                <span className="text-xs text-muted-foreground ml-1">({service.score} poin)</span>
                            </div>
                        </label>
                    ))}
                </div>
                <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm font-medium">Priority Service:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getPriorityColor(formData.priority)}`}>
                        {formData.priority}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        (Total: {selectedServices.reduce((sum, id) => sum + (SERVICE_OPTIONS.find(s => s.id === id)?.score || 0), 0)} poin)
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                <div className="space-y-2">
                    <Label>Date Service</Label>
                    <Input name="date_service" type="date" value={formData.date_service} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>Nominal Service</Label>
                    <Input name="nominal_service" type="number" value={formData.nominal_service} onChange={handleChange} placeholder="0" />
                </div>
                <div className="space-y-2">
                    <Label>Service Info</Label>
                    <Input name="service_info" value={formData.service_info} onChange={handleChange} placeholder="e.g Tie Rod..." />
                </div>
            </div>
            <div className="space-y-2">
                <Label>Remark</Label>
                <Input name="remark" value={formData.remark} onChange={handleChange} placeholder="" />
            </div>

            <div className="flex gap-4 pt-4 justify-end">
                {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
                <Button type="submit">{initialData ? 'Update Mobil' : 'Save Mobil'}</Button>
            </div>
        </form>
    );
};

export default CarDataForm;

