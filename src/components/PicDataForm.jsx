import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Mail, MapPin, CreditCard, AlertTriangle, Calendar } from 'lucide-react';

// Dropdown options
const JABATAN_OPTIONS = ['PM', 'CM', 'PM/CM', 'CM+MBP', 'VERTI & TII', 'Expert Genset', 'MBP'];
const VALIDASI_OPTIONS = ['Active', 'Inactive'];
const REGIONAL_OPTIONS = ['Jabo Outer 1', 'Jabo Outer 2', 'Jabo Outer 3'];
const STATUS_TRANSISI_OPTIONS = ['Active', 'Planned Layoff', 'Planned Reloc', 'Laid Off', 'Relocated'];

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
        // New fields
        no_hp: '',
        email: '',
        alamat_domisili: '',
        no_bpjs: '',
        // Transition fields 2026
        status_transisi: 'Active',
        tgl_efektif_transisi: '',
        jabatan_sebelumnya: '',
        alasan_transisi: '',
        proposed_jabatan: '',
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
                // New fields
                no_hp: initialData.no_hp || '',
                email: initialData.email || '',
                alamat_domisili: initialData.alamat_domisili || '',
                no_bpjs: initialData.no_bpjs || '',
                // Transition fields 2026
                status_transisi: initialData.status_transisi || 'Active',
                tgl_efektif_transisi: initialData.tgl_efektif_transisi || '',
                jabatan_sebelumnya: initialData.jabatan_sebelumnya || '',
                alasan_transisi: initialData.alasan_transisi || '',
                proposed_jabatan: initialData.proposed_jabatan || '',
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
            {/* Personal Information Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
                    Informasi Pribadi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Nama PIC <span className="text-red-500">*</span></Label>
                        <Input name="nama_pic" value={formData.nama_pic} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Jabatan <span className="text-red-500">*</span></Label>
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
                        <Label>Active (Validasi) <span className="text-red-500">*</span></Label>
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
                        <Label>Regional <span className="text-red-500">*</span></Label>
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
                        <Label>Status Pernikahan</Label>
                        <Input name="status" value={formData.status} onChange={handleChange} placeholder="Lajang/Kawin" />
                    </div>
                    <div className="space-y-2">
                        <Label>Area</Label>
                        <Input name="area" value={formData.area} onChange={handleChange} />
                    </div>
                </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
                    Informasi Kontak
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            No. HP <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            name="no_hp"
                            value={formData.no_hp}
                            onChange={handleChange}
                            placeholder="08xxxxxxxxxx"
                            type="tel"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email
                        </Label>
                        <Input
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="email@example.com"
                            type="email"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2 lg:col-span-1">
                        <Label className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Alamat Domisili/Rumah
                        </Label>
                        <Input
                            name="alamat_domisili"
                            value={formData.alamat_domisili}
                            onChange={handleChange}
                            placeholder="Alamat tempat tinggal saat ini"
                        />
                    </div>
                </div>
            </div>

            {/* Identity Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
                    Data Identitas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>NIK Karyawan</Label>
                        <Input name="nik_karyawan" value={formData.nik_karyawan} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label>NIK KTP <span className="text-red-500">*</span></Label>
                        <Input name="nik_ktp" value={formData.nik_ktp} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label>NPWP</Label>
                        <Input name="npwp" value={formData.npwp} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            No. BPJS
                        </Label>
                        <Input
                            name="no_bpjs"
                            value={formData.no_bpjs}
                            onChange={handleChange}
                            placeholder="Nomor BPJS Kesehatan/Ketenagakerjaan"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Nama Penerima Penghasilan</Label>
                        <Input name="nama_penerima_penghasilan" value={formData.nama_penerima_penghasilan} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label>Alamat (KTP)</Label>
                        <Input name="alamat" value={formData.alamat} onChange={handleChange} placeholder="Alamat sesuai KTP" />
                    </div>
                </div>
            </div>

            {/* Bank Information Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
                    Informasi Bank
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                </div>
            </div>

            {/* Employment Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-2">
                    Informasi Kepegawaian
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Tgl Join</Label>
                        <Input type="date" name="tgl_join" value={formData.tgl_join} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label>Tgl Berakhir</Label>
                        <Input type="date" name="tgl_berakhir" value={formData.tgl_berakhir} onChange={handleChange} />
                    </div>
                    <div className="space-y-2 lg:col-span-1 md:col-span-2">
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
            </div>

            {/* Transition Planning 2026 Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider border-b border-amber-300 pb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Transition Planning 2026
                </h3>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Status Transisi</Label>
                            <Select value={formData.status_transisi} onValueChange={(v) => handleSelectChange('status_transisi', v)}>
                                <SelectTrigger className={formData.status_transisi === 'Planned Layoff' ? 'border-red-500' : formData.status_transisi === 'Planned Reloc' ? 'border-amber-500' : ''}>
                                    <SelectValue placeholder="Pilih Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_TRANSISI_OPTIONS.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Tgl Efektif Transisi
                            </Label>
                            <Input
                                type="date"
                                name="tgl_efektif_transisi"
                                value={formData.tgl_efektif_transisi}
                                onChange={handleChange}
                                disabled={formData.status_transisi === 'Active'}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Proposed Jabatan (Reloc)</Label>
                            <Select
                                value={formData.proposed_jabatan}
                                onValueChange={(v) => handleSelectChange('proposed_jabatan', v)}
                                disabled={formData.status_transisi !== 'Planned Reloc'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Jabatan Baru" />
                                </SelectTrigger>
                                <SelectContent>
                                    {JABATAN_OPTIONS.map(opt => (
                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Jabatan Sebelumnya</Label>
                            <Input
                                name="jabatan_sebelumnya"
                                value={formData.jabatan_sebelumnya}
                                onChange={handleChange}
                                placeholder="Auto-fill saat relokasi"
                                disabled
                            />
                        </div>
                    </div>
                    <div className="mt-4">
                        <Label>Alasan Transisi</Label>
                        <Textarea
                            name="alasan_transisi"
                            value={formData.alasan_transisi}
                            onChange={handleChange}
                            placeholder="Jelaskan alasan layoff/relokasi..."
                            rows={2}
                            disabled={formData.status_transisi === 'Active'}
                            className="mt-2"
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-4 pt-4 border-t">
                <Button type="submit">{initialData ? 'Update PIC' : 'Save PIC'}</Button>
                {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
            </div>
        </form>
    );
};

export default PicDataForm;