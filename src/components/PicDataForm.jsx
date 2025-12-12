import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Dropdown options
const JABATAN_OPTIONS = ['PM', 'CM', 'PM/CM', 'CM+MBP', 'VERTI & TII', 'Expert Genset', 'MBP'];
const VALIDASI_OPTIONS = ['Active', 'Inactive'];
const REGIONAL_OPTIONS = ['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'];

const PicDataForm = ({ onSubmit, initialData, onCancel }) => {
    const [formData, setFormData] = useState({
        nama_pic: '',
        jabatan: '',
        nik_karyawan: '',
        nik_ktp: '',
        npwp: '',
        nama_penerima_penghasilan: '',
        alamat: '',
        status: '',
        regional: '',
        nama_bank: '',
        nama_rekening: '',
        no_rekening: '',
        area: '',
        tgl_join: '',
        tgl_berakhir: '',
        remark: '',
        validasi: '',
    });

    // Update formData when initialData changes (for edit mode)
    useEffect(() => {
        if (initialData) {
            setFormData({
                nama_pic: initialData.nama_pic || '',
                jabatan: initialData.jabatan || '',
                nik_karyawan: initialData.nik_karyawan || '',
                nik_ktp: initialData.nik_ktp || '',
                npwp: initialData.npwp || '',
                nama_penerima_penghasilan: initialData.nama_penerima_penghasilan || '',
                alamat: initialData.alamat || '',
                status: initialData.status || '',
                regional: initialData.regional || '',
                nama_bank: initialData.nama_bank || '',
                nama_rekening: initialData.nama_rekening || '',
                no_rekening: initialData.no_rekening || '',
                area: initialData.area || '',
                tgl_join: initialData.tgl_join || '',
                tgl_berakhir: initialData.tgl_berakhir || '',
                remark: initialData.remark || '',
                validasi: initialData.validasi || '',
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
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label>Nama PIC</Label>
                    <Input name="nama_pic" value={formData.nama_pic} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                    <Label>Jabatan</Label>
                    <Select value={formData.jabatan} onValueChange={(v) => handleSelectChange('jabatan', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Jabatan" />
                        </SelectTrigger>
                        <SelectContent>
                            {JABATAN_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Active (Validasi)</Label>
                    <Select value={formData.validasi} onValueChange={(v) => handleSelectChange('validasi', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Status" />
                        </SelectTrigger>
                        <SelectContent>
                            {VALIDASI_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Regional</Label>
                    <Select value={formData.regional} onValueChange={(v) => handleSelectChange('regional', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih Regional" />
                        </SelectTrigger>
                        <SelectContent>
                            {REGIONAL_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>NIK Karyawan</Label>
                    <Input name="nik_karyawan" value={formData.nik_karyawan} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>NIK KTP</Label>
                    <Input name="nik_ktp" value={formData.nik_ktp} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                    <Label>NPWP</Label>
                    <Input name="npwp" value={formData.npwp} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>Nama Penerima Penghasilan</Label>
                    <Input name="nama_penerima_penghasilan" value={formData.nama_penerima_penghasilan} onChange={handleChange} />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label>Alamat</Label>
                    <Input name="alamat" value={formData.alamat} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Input name="status" value={formData.status} onChange={handleChange} placeholder="Lajang/Kawin" />
                </div>
                <div className="space-y-2">
                    <Label>Nama Bank</Label>
                    <Input name="nama_bank" value={formData.nama_bank} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>Nama Rekening</Label>
                    <Input name="nama_rekening" value={formData.nama_rekening} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>No Rekening</Label>
                    <Input name="no_rekening" value={formData.no_rekening} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>Area</Label>
                    <Input name="area" value={formData.area} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>Tgl Join</Label>
                    <Input type="date" name="tgl_join" value={formData.tgl_join} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                    <Label>Tgl Berakhir</Label>
                    <Input type="date" name="tgl_berakhir" value={formData.tgl_berakhir} onChange={handleChange} />
                </div>
                <div className="space-y-2 md:col-span-3">
                    <Label>Remark</Label>
                    <Textarea
                        name="remark"
                        value={formData.remark}
                        onChange={handleChange}
                        placeholder="Catatan tambahan..."
                        rows={3}
                    />
                </div>
            </div>
            <div className="flex gap-4 pt-4">
                <Button type="submit">{initialData ? 'Update PIC' : 'Save PIC'}</Button>
                {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
            </div>
        </form>
    );
};

export default PicDataForm;