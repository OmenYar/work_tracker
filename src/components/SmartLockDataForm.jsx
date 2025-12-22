import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

const SmartLockDataForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        type_wm: 'WMSensehub',
        site_id_2: '',
        site_id_pti: '',
        site_name: '',
        sn_id_wm_lock: '',
        no_carton: '',
        batch_bmg: '',
        batch_pti: '',
        years: new Date().getFullYear(),
        pti_reg: '',
        reg_bmg: '',
        prov: '',
        city: '',
        dop: '',
        partners: '',
        pic: '',
        new_pic: '',
        priority: '',
        status_new: '',
        status_sistem: '',
        posisi_wm: '',
        date_install: '',
        week_install: '',
        last_access_date: '',
        month_last_access: '',
        aging_last_access: '',
        date_broken: '',
        month_broken: '',
        date_lost: '',
        gembok_last_pm: '',
        remark: '',
        feedback_long_aging: '',
        status_escalation: '',
        resi_pengembalian: '',
        tgl_diterima_pak_iman: '',
        month_delivered_pti_hq: '',
        status_pengembalian_wm: '',
        reason_lost: '',
        tt_no_tt: '',
        update_keberadaan_gembok: '',
        type_padlock_existing: '',
        remark_padlock_existing: ''
    });

    // Dropdown options
    const typeWmOptions = ['WMSensehub'];
    const ptiRegOptions = ['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'];
    const priorityOptions = ['Issue Long Aging', 'Normal'];
    const statusNewOptions = [
        'INSTALLED',
        'NEED INSTALL',
        'NEED INSTALL NORMAL',
        'NEED RELOCATED',
        'NEED SEND TO PTI',
        'LOST BMG',
        'DONE BA LOST BMG',
        'LOST PTI',
        'RETURNED TO PTI'
    ];
    const statusSistemOptions = ['Locked', 'Unlocked'];
    const posisiWmOptions = ['Ada di Site', 'Lost', 'Broken', 'Return to PTI'];
    const agingOptions = ['< 2 Month', '≤ 6 Month', '> 6 Month'];

    useEffect(() => {
        if (isEdit) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('smartlock_data')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setFormData({
                    ...data,
                    date_install: data.date_install || '',
                    last_access_date: data.last_access_date || '',
                    date_broken: data.date_broken || '',
                    date_lost: data.date_lost || '',
                    tgl_diterima_pak_iman: data.tgl_diterima_pak_iman || ''
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error loading data');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Prepare data - convert empty strings to null for date fields
            const dataToSave = {
                ...formData,
                date_install: formData.date_install || null,
                last_access_date: formData.last_access_date || null,
                date_broken: formData.date_broken || null,
                date_lost: formData.date_lost || null,
                tgl_diterima_pak_iman: formData.tgl_diterima_pak_iman || null,
                years: formData.years ? parseInt(formData.years) : null,
                week_install: formData.week_install ? parseInt(formData.week_install) : null
            };

            if (isEdit) {
                const { error } = await supabase
                    .from('smartlock_data')
                    .update(dataToSave)
                    .eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('smartlock_data')
                    .insert([dataToSave]);
                if (error) throw error;
            }

            alert(isEdit ? 'Data updated successfully!' : 'Data saved successfully!');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error saving data:', error);
            alert('Error saving data: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold">
                        {isEdit ? 'Edit SmartLock Data' : 'Input SmartLock Data'}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Site Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Site Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label>Type WM</Label>
                                <Select value={formData.type_wm} onValueChange={(v) => handleChange('type_wm', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                    <SelectContent>
                                        {typeWmOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Site ID 2 (SAP)</Label>
                                <Input
                                    value={formData.site_id_2}
                                    onChange={(e) => handleChange('site_id_2', e.target.value)}
                                    placeholder="BT-0002-T-S"
                                />
                            </div>
                            <div>
                                <Label>Site ID PTI</Label>
                                <Input
                                    value={formData.site_id_pti}
                                    onChange={(e) => handleChange('site_id_pti', e.target.value)}
                                    placeholder="JAW-BTN-0170-M-P"
                                />
                            </div>
                            <div className="md:col-span-2 lg:col-span-3">
                                <Label>Site Name</Label>
                                <Input
                                    value={formData.site_name}
                                    onChange={(e) => handleChange('site_name', e.target.value)}
                                    placeholder="Site Name"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Serial & Batch */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Serial & Batch</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label>SN ID WM Lock</Label>
                                <Input
                                    value={formData.sn_id_wm_lock}
                                    onChange={(e) => handleChange('sn_id_wm_lock', e.target.value)}
                                    placeholder="S1003573BD"
                                />
                            </div>
                            <div>
                                <Label>No Carton</Label>
                                <Input
                                    value={formData.no_carton}
                                    onChange={(e) => handleChange('no_carton', e.target.value)}
                                    placeholder="2408180005"
                                />
                            </div>
                            <div>
                                <Label>Batch BMG</Label>
                                <Input
                                    value={formData.batch_bmg}
                                    onChange={(e) => handleChange('batch_bmg', e.target.value)}
                                    placeholder="Batch 10"
                                />
                            </div>
                            <div>
                                <Label>Batch PTI</Label>
                                <Input
                                    value={formData.batch_pti}
                                    onChange={(e) => handleChange('batch_pti', e.target.value)}
                                    placeholder="Batch 10"
                                />
                            </div>
                            <div>
                                <Label>Years</Label>
                                <Input
                                    type="number"
                                    value={formData.years}
                                    onChange={(e) => handleChange('years', e.target.value)}
                                    placeholder="2024"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Location */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Location</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label>PTI Regional</Label>
                                <Select value={formData.pti_reg} onValueChange={(v) => handleChange('pti_reg', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Regional" /></SelectTrigger>
                                    <SelectContent>
                                        {ptiRegOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Region BMG</Label>
                                <Input
                                    value={formData.reg_bmg}
                                    onChange={(e) => handleChange('reg_bmg', e.target.value)}
                                    placeholder="Jabo Outer 1"
                                />
                            </div>
                            <div>
                                <Label>Province</Label>
                                <Input
                                    value={formData.prov}
                                    onChange={(e) => handleChange('prov', e.target.value)}
                                    placeholder="SERANG"
                                />
                            </div>
                            <div>
                                <Label>City</Label>
                                <Input
                                    value={formData.city}
                                    onChange={(e) => handleChange('city', e.target.value)}
                                    placeholder="Serang"
                                />
                            </div>
                            <div>
                                <Label>DOP</Label>
                                <Input
                                    value={formData.dop}
                                    onChange={(e) => handleChange('dop', e.target.value)}
                                    placeholder="BEKASI"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* PIC & Partners */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">PIC & Partners</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label>Partners</Label>
                                <Input
                                    value={formData.partners}
                                    onChange={(e) => handleChange('partners', e.target.value)}
                                    placeholder="KMMS JBO 1"
                                />
                            </div>
                            <div>
                                <Label>PIC</Label>
                                <Input
                                    value={formData.pic}
                                    onChange={(e) => handleChange('pic', e.target.value)}
                                    placeholder="PIC Name"
                                />
                            </div>
                            <div>
                                <Label>New PIC</Label>
                                <Input
                                    value={formData.new_pic}
                                    onChange={(e) => handleChange('new_pic', e.target.value)}
                                    placeholder="New PIC Name"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Status</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label>Priority</Label>
                                <Select value={formData.priority} onValueChange={(v) => handleChange('priority', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Priority" /></SelectTrigger>
                                    <SelectContent>
                                        {priorityOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Status New</Label>
                                <Select value={formData.status_new} onValueChange={(v) => handleChange('status_new', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                                    <SelectContent>
                                        {statusNewOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Status Sistem</Label>
                                <Select value={formData.status_sistem} onValueChange={(v) => handleChange('status_sistem', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                                    <SelectContent>
                                        {statusSistemOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Posisi WM</Label>
                                <Select value={formData.posisi_wm} onValueChange={(v) => handleChange('posisi_wm', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Position" /></SelectTrigger>
                                    <SelectContent>
                                        {posisiWmOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Dates */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Dates</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label>Date Install</Label>
                                <Input
                                    type="date"
                                    value={formData.date_install}
                                    onChange={(e) => handleChange('date_install', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Week Install</Label>
                                <Input
                                    type="number"
                                    value={formData.week_install}
                                    onChange={(e) => handleChange('week_install', e.target.value)}
                                    placeholder="24"
                                />
                            </div>
                            <div>
                                <Label>Last Access Date</Label>
                                <Input
                                    type="date"
                                    value={formData.last_access_date}
                                    onChange={(e) => handleChange('last_access_date', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Aging Last Access</Label>
                                <Select value={formData.aging_last_access} onValueChange={(v) => handleChange('aging_last_access', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select Aging" /></SelectTrigger>
                                    <SelectContent>
                                        {agingOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Date Broken</Label>
                                <Input
                                    type="date"
                                    value={formData.date_broken}
                                    onChange={(e) => handleChange('date_broken', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Date Lost</Label>
                                <Input
                                    type="date"
                                    value={formData.date_lost}
                                    onChange={(e) => handleChange('date_lost', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Remarks */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Remarks</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Remark</Label>
                                <Textarea
                                    value={formData.remark}
                                    onChange={(e) => handleChange('remark', e.target.value)}
                                    placeholder="Enter remarks..."
                                    rows={3}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Feedback Long Aging</Label>
                                    <Textarea
                                        value={formData.feedback_long_aging}
                                        onChange={(e) => handleChange('feedback_long_aging', e.target.value)}
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <Label>Status Escalation</Label>
                                    <Input
                                        value={formData.status_escalation}
                                        onChange={(e) => handleChange('status_escalation', e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Return Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Return Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label>Resi Pengembalian</Label>
                                <Input
                                    value={formData.resi_pengembalian}
                                    onChange={(e) => handleChange('resi_pengembalian', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Tgl Diterima Pak Iman</Label>
                                <Input
                                    type="date"
                                    value={formData.tgl_diterima_pak_iman}
                                    onChange={(e) => handleChange('tgl_diterima_pak_iman', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Status Pengembalian WM</Label>
                                <Input
                                    value={formData.status_pengembalian_wm}
                                    onChange={(e) => handleChange('status_pengembalian_wm', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Reason Lost</Label>
                                <Input
                                    value={formData.reason_lost}
                                    onChange={(e) => handleChange('reason_lost', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>TT / No TT</Label>
                                <Input
                                    value={formData.tt_no_tt}
                                    onChange={(e) => handleChange('tt_no_tt', e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Padlock Existing */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Padlock Existing</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Update Keberadaan Gembok</Label>
                                <Input
                                    value={formData.update_keberadaan_gembok}
                                    onChange={(e) => handleChange('update_keberadaan_gembok', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Type Padlock Existing</Label>
                                <Input
                                    value={formData.type_padlock_existing}
                                    onChange={(e) => handleChange('type_padlock_existing', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Label>Remark Padlock Existing</Label>
                                <Textarea
                                    value={formData.remark_padlock_existing}
                                    onChange={(e) => handleChange('remark_padlock_existing', e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {isEdit ? 'Update' : 'Save'}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SmartLockDataForm;
