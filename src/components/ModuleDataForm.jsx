import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin, Calendar, FileText } from 'lucide-react';

// RFS Status options
const RFS_STATUS_OPTIONS = ['Open', 'Done', 'Hold'];

// ATP Doc options
const DOC_ATP_OPTIONS = ['Open', 'Done'];

const ModuleDataForm = ({ onSubmit, initialData, onCancel }) => {
    const [formData, setFormData] = useState({
        site_id: '',
        site_name: '',
        area: '',
        region: '',
        longitude: '',
        latitude: '',
        project_name: '',
        rfs_status: 'Open',
        install_date: '',
        task_id_netgear: '',
        sn_module: '',
        doc_atp: '',
        remark: '',
    });

    // Update formData when initialData changes (for edit mode)
    useEffect(() => {
        if (initialData) {
            setFormData({
                site_id: initialData.site_id || '',
                site_name: initialData.site_name || '',
                area: initialData.area || '',
                region: initialData.region || '',
                longitude: initialData.longitude || '',
                latitude: initialData.latitude || '',
                project_name: initialData.project_name || '',
                rfs_status: initialData.rfs_status || 'Open',
                install_date: initialData.install_date || '',
                task_id_netgear: initialData.task_id_netgear || '',
                sn_module: initialData.sn_module || '',
                doc_atp: initialData.doc_atp || '',
                remark: initialData.remark || '',
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.site_id || !formData.site_name) {
            alert('Site ID dan Site Name wajib diisi');
            return;
        }

        onSubmit(formData);
    };

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
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                            <Package className="w-4 h-4" />
                            Site Information
                        </h3>
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
                    </div>

                    {/* Location */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            Location
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="area">Area (Kab/Kota)</Label>
                                <Input
                                    id="area"
                                    name="area"
                                    value={formData.area}
                                    onChange={handleChange}
                                    placeholder="e.g. TANGERANG"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="region">Region (Provinsi)</Label>
                                <Input
                                    id="region"
                                    name="region"
                                    value={formData.region}
                                    onChange={handleChange}
                                    placeholder="e.g. BANTEN"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="longitude">Longitude</Label>
                                <Input
                                    id="longitude"
                                    name="longitude"
                                    value={formData.longitude}
                                    onChange={handleChange}
                                    placeholder="e.g. 106.68852"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="latitude">Latitude</Label>
                                <Input
                                    id="latitude"
                                    name="latitude"
                                    value={formData.latitude}
                                    onChange={handleChange}
                                    placeholder="e.g. -6.92072"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Project Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                            <FileText className="w-4 h-4" />
                            Project Details
                        </h3>
                        <div className="space-y-2">
                            <Label htmlFor="project_name">Project Name</Label>
                            <Input
                                id="project_name"
                                name="project_name"
                                value={formData.project_name}
                                onChange={handleChange}
                                placeholder="e.g. CME_Hermes H2 Batch 2-RAN"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="task_id_netgear">Task ID Netgear</Label>
                            <Input
                                id="task_id_netgear"
                                name="task_id_netgear"
                                value={formData.task_id_netgear}
                                onChange={handleChange}
                                placeholder="e.g. TSK-MOS-20251031000807"
                            />
                        </div>
                    </div>

                    {/* Status & Date */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            Status & Date
                        </h3>
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
                                <Label htmlFor="install_date">Install Date</Label>
                                <Input
                                    id="install_date"
                                    name="install_date"
                                    type="date"
                                    value={formData.install_date}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Module Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                            <Package className="w-4 h-4" />
                            Module Details
                        </h3>
                        <div className="space-y-2">
                            <Label htmlFor="sn_module">Serial Number Module</Label>
                            <Input
                                id="sn_module"
                                name="sn_module"
                                value={formData.sn_module}
                                onChange={handleChange}
                                placeholder="SN Module"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="doc_atp">ATP Document Status</Label>
                            <Select
                                value={formData.doc_atp || 'Open'}
                                onValueChange={(v) => handleSelectChange('doc_atp', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOC_ATP_OPTIONS.map(status => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Remark */}
                    <div className="space-y-2">
                        <Label htmlFor="remark">Remark</Label>
                        <Textarea
                            id="remark"
                            name="remark"
                            value={formData.remark}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Additional notes..."
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
