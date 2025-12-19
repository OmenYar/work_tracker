import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

// Status options
const RFS_STATUS_OPTIONS = ['Open', 'Closed', 'Hold', 'Waiting Permit'];
const REGIONAL_OPTIONS = ['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'];

const ModuleDataForm = ({ onSubmit, initialData, onCancel, picData = [] }) => {
    const [formData, setFormData] = useState({
        site_id: '',
        site_name: '',
        provinsi: '',
        kab_kota: '',
        module_qty: 1,
        rfs_status: 'Open',
        rfs_date: '',
        install_qty: 0,
        tower_provider: '',
        pic_name: '',
        notes: '',
        regional: '',
        plan_install: '',
    });

    // Get active PICs for dropdown
    const activePics = picData.filter(p => p.validasi === 'Active').sort((a, b) => a.nama_pic?.localeCompare(b.nama_pic));

    // Update formData when initialData changes (for edit mode)
    useEffect(() => {
        if (initialData) {
            setFormData({
                site_id: initialData.site_id || '',
                site_name: initialData.site_name || '',
                provinsi: initialData.provinsi || '',
                kab_kota: initialData.kab_kota || '',
                module_qty: initialData.module_qty || 1,
                rfs_status: initialData.rfs_status || 'Open',
                rfs_date: initialData.rfs_date || '',
                install_qty: initialData.install_qty || 0,
                tower_provider: initialData.tower_provider || '',
                pic_name: initialData.pic_name || '',
                notes: initialData.notes || '',
                regional: initialData.regional || '',
                plan_install: initialData.plan_install || '',
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value === 'none' ? '' : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.site_id || !formData.site_name) {
            alert('Site ID dan Site Name wajib diisi');
            return;
        }

        // Calculate gap
        const gap = (formData.module_qty || 0) - (formData.install_qty || 0);

        onSubmit({ ...formData, gap });
    };

    // Calculate gap for display
    const calculatedGap = (formData.module_qty || 0) - (formData.install_qty || 0);

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        {initialData ? 'Edit Data Module' : 'Input Data Module'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Site Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="site_id">Site ID *</Label>
                            <Input
                                id="site_id"
                                name="site_id"
                                value={formData.site_id}
                                onChange={handleChange}
                                placeholder="e.g. 11TGR0126"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="site_name">Site Name *</Label>
                            <Input
                                id="site_name"
                                name="site_name"
                                value={formData.site_name}
                                onChange={handleChange}
                                placeholder="e.g. STTANGERANG_EP"
                                required
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="provinsi">Provinsi</Label>
                            <Input
                                id="provinsi"
                                name="provinsi"
                                value={formData.provinsi}
                                onChange={handleChange}
                                placeholder="e.g. BANTEN"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="kab_kota">Kab/Kota</Label>
                            <Input
                                id="kab_kota"
                                name="kab_kota"
                                value={formData.kab_kota}
                                onChange={handleChange}
                                placeholder="e.g. TANGERANG"
                            />
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="module_qty">Module Qty</Label>
                            <Input
                                id="module_qty"
                                name="module_qty"
                                type="number"
                                min="0"
                                value={formData.module_qty}
                                onChange={handleNumberChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="install_qty">Install Qty</Label>
                            <Input
                                id="install_qty"
                                name="install_qty"
                                type="number"
                                min="0"
                                value={formData.install_qty}
                                onChange={handleNumberChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Gap (auto)</Label>
                            <Input
                                value={calculatedGap}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                    </div>

                    {/* Status & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rfs_status">RFS Status</Label>
                            <Select
                                value={formData.rfs_status || 'Open'}
                                onValueChange={(v) => handleSelectChange('rfs_status', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {RFS_STATUS_OPTIONS.map(status => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rfs_date">RFS Date</Label>
                            <Input
                                id="rfs_date"
                                name="rfs_date"
                                type="date"
                                value={formData.rfs_date}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* PIC & Regional */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="pic_name">PIC</Label>
                            <Select
                                value={formData.pic_name || 'none'}
                                onValueChange={(v) => handleSelectChange('pic_name', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select PIC" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">N/A</SelectItem>
                                    {activePics.map(p => (
                                        <SelectItem key={p.id} value={p.nama_pic}>{p.nama_pic}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="regional">Regional</Label>
                            <Select
                                value={formData.regional || 'none'}
                                onValueChange={(v) => handleSelectChange('regional', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Regional" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-</SelectItem>
                                    {REGIONAL_OPTIONS.map(r => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Tower & Plan */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="tower_provider">Tower Provider</Label>
                            <Input
                                id="tower_provider"
                                name="tower_provider"
                                value={formData.tower_provider}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plan_install">Plan Install</Label>
                            <Input
                                id="plan_install"
                                name="plan_install"
                                type="date"
                                value={formData.plan_install}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button type="submit" className="flex-1">
                            {initialData ? 'Update' : 'Simpan'}
                        </Button>
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Batal
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
};

export default ModuleDataForm;
