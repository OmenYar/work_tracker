import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    ChevronRight,
    ChevronLeft,
    Download,
    Search,
    Check,
    Building2,
    Calendar,
    FileSignature,
    Hash,
    MapPin,
    Users,
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/customSupabaseClient';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

// Customer/Vendor options
const CUSTOMERS = [
    { id: 'kin', name: 'KIN', fullName: 'KIN Template', color: 'bg-blue-500' },
    { id: 'sip', name: 'SIP', fullName: 'SIP Template', color: 'bg-green-500' },
    { id: 'stp', name: 'STP', fullName: 'STP Template', color: 'bg-purple-500' },
    { id: 'ibst', name: 'IBST', fullName: 'IBST Template', color: 'bg-orange-500' },
    { id: 'pti', name: 'PTI', fullName: 'PTI Template', color: 'bg-red-500' },
];

// Regional options
const REGIONALS = [
    { id: 'jabo1', name: 'Jabo Outer 1', dbValue: 'Jabo Outer 1' },
    { id: 'jabo2', name: 'Jabo Outer 2', dbValue: 'Jabo Outer 2' },
    { id: 'jabo3', name: 'Jabo Outer 3', dbValue: 'Jabo Outer 3' },
];

// Format date to Indonesian format: "14 Desember 2024"
const formatDateIndonesian = (date) => {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date(date);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const GenerateBAST = () => {
    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Customer selection
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Step 2: Regional selection
    const [selectedRegional, setSelectedRegional] = useState(null);

    // Step 3: Site selection from tracker data
    const [trackerData, setTrackerData] = useState([]);
    const [isLoadingTrackers, setIsLoadingTrackers] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTracker, setSelectedTracker] = useState(null);

    // Form data for manual fields
    const [formData, setFormData] = useState({
        site_id: '',
        site_name: '',
        add_work: '',
        date_now: formatDateIndonesian(new Date()),
        tt_number: '',
        po_number: '',
    });

    // Step 4: Preview & Download
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);

    // Fetch trackers with "Need Created BAST" status when regional is selected
    useEffect(() => {
        if (selectedRegional) {
            fetchTrackers();
        }
    }, [selectedRegional]);

    const fetchTrackers = async () => {
        if (!selectedRegional) return;

        setIsLoadingTrackers(true);
        try {
            const regional = REGIONALS.find(r => r.id === selectedRegional);

            // Fetch trackers where:
            // - regional matches
            // - status_pekerjaan = 'Close'
            // - date_submit is null/empty
            // - date_approve is null/empty
            const { data, error } = await supabase
                .from('work_trackers')
                .select('*')
                .eq('regional', regional.dbValue)
                .eq('status_pekerjaan', 'Close')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Filter client-side for "Need Created BAST" criteria
            const needCreatedBast = (data || []).filter(tracker => {
                const isNotApprove = tracker.status_bast !== 'Approve' && tracker.status_bast !== 'BAST Approve Date';
                const isNotWaiting = tracker.status_bast !== 'Waiting Approve' && tracker.status_bast !== 'Waiting Approve BAST';
                const isDateEmpty = (!tracker.date_submit || tracker.date_submit === '') &&
                    (!tracker.date_approve || tracker.date_approve === '');

                return isNotApprove && isNotWaiting && isDateEmpty;
            });

            setTrackerData(needCreatedBast);
        } catch (err) {
            console.error('Fetch error:', err);
            setTrackerData([]);
        } finally {
            setIsLoadingTrackers(false);
        }
    };

    // Filter trackers based on search
    const filteredTrackers = trackerData.filter(tracker =>
        tracker.site_id_1?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tracker.site_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Select a tracker from the list
    const handleSelectTracker = (tracker) => {
        setSelectedTracker(tracker);
        setFormData({
            site_id: tracker.site_id_1 || '',
            site_name: tracker.site_name || '',
            add_work: tracker.main_addwork || '',
            date_now: formatDateIndonesian(new Date()),
            tt_number: tracker.tt_number || '',
            po_number: tracker.po_number || '',
        });
    };

    // Handle form input change
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Validate current step
    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return selectedCustomer !== null;
            case 2:
                return selectedRegional !== null;
            case 3:
                return formData.site_id && formData.site_name && formData.add_work;
            case 4:
                return true;
            default:
                return false;
        }
    };

    // Get template filename based on customer and regional
    const getTemplateFilename = () => {
        if (!selectedCustomer || !selectedRegional) return null;
        // Format: kin_jabo1.docx, sip_jabo2.docx, etc.
        return `${selectedCustomer}_${selectedRegional}.docx`;
    };

    // Download and process template
    const handleDownload = async () => {
        if (!selectedCustomer || !selectedRegional) return;

        setIsGenerating(true);
        setError(null);

        try {
            const templateFilename = getTemplateFilename();
            const templateUrl = `/templates/${templateFilename}`;

            // Fetch template from Supabase Storage
            const { data: templateBlob, error: downloadError } = await supabase
                .storage
                .from('templates')
                .download(templateFilename);

            if (downloadError) {
                console.error('Download error:', downloadError);
                throw new Error(`Gagal mengambil template ${templateFilename} dari server. Pastikan file template sudah ada.`);
            }

            const templateArrayBuffer = await templateBlob.arrayBuffer();
            const zip = new PizZip(templateArrayBuffer);
            const doc = new Docxtemplater(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '{', end: '}' }
            });

            // Replace placeholders
            doc.render({
                site_id: formData.site_id,
                site_name: formData.site_name,
                add_work: formData.add_work,
                date_now: formData.date_now,
                tt_number: formData.tt_number || '',
                po_number: formData.po_number || '',
            });

            // Generate output
            const output = doc.getZip().generate({
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });

            // Download file with requested name format
            const fileName = `Form BAST Site ${formData.site_id}_${formData.site_name}.docx`;
            saveAs(output, fileName);

        } catch (err) {
            console.error('Generate error:', err);
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Reset wizard
    const handleReset = () => {
        setCurrentStep(1);
        setSelectedCustomer(null);
        setSelectedRegional(null);
        setSelectedTracker(null);
        setSearchTerm('');
        setFormData({
            site_id: '',
            site_name: '',
            add_work: '',
            date_now: formatDateIndonesian(new Date()),
            tt_number: '',
            po_number: '',
        });
        setError(null);
    };

    // Render step content
    const renderStep4 = () => {
        const customer = CUSTOMERS.find(c => c.id === selectedCustomer);
        const regional = REGIONALS.find(r => r.id === selectedRegional); // Restored regional constant
        const templateFile = getTemplateFilename();

        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
            >
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Preview & Download</h2>
                    <p className="text-muted-foreground">Periksa data sebelum download</p>
                </div>

                <div className="max-w-2xl mx-auto">
                    {/* Preview Card */}
                    <div className="bg-card border rounded-xl shadow-lg overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 ${customer?.color} rounded-lg flex items-center justify-center`}>
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">BAST - {customer?.name}</h3>
                                    <p className="text-sm text-muted-foreground">{regional?.name}</p>
                                </div>
                            </div>
                        </div>

                        {/* Template Info */}
                        <div className="px-6 py-3 bg-muted/30 border-b">
                            <p className="text-xs text-muted-foreground">
                                Template: <code className="bg-muted px-2 py-0.5 rounded">{templateFile}</code>
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-medium">Site ID</p>
                                    <p className="font-semibold">{formData.site_id}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-medium">Site Name</p>
                                    <p className="font-semibold">{formData.site_name}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-medium">Add Work</p>
                                <p className="font-semibold">{formData.add_work}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-medium">Tanggal</p>
                                    <p className="font-semibold">{formData.date_now}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-medium">TT Number</p>
                                    <p className="font-semibold">{formData.tt_number || '-'}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-muted-foreground uppercase font-medium">PO Number</p>
                                <p className="font-semibold">{formData.po_number || '-'}</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-muted/30 p-6 border-t">
                            {error && (
                                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <Button
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="w-full"
                                size="lg"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5 mr-2" />
                                        Download BAST
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Generate Another */}
                    <div className="text-center mt-6">
                        <Button variant="ghost" onClick={handleReset}>
                            Generate BAST Lainnya
                        </Button>
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold mb-2">Pilih Customer</h2>
                            <p className="text-muted-foreground">Pilih customer/vendor untuk template BAST</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {CUSTOMERS.map((customer) => (
                                <motion.div
                                    key={customer.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedCustomer(customer.id)}
                                    className={`
                                        relative cursor-pointer rounded-xl border-2 p-6 text-center transition-all
                                        ${selectedCustomer === customer.id
                                            ? 'border-primary bg-primary/5 shadow-lg'
                                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                        }
                                    `}
                                >
                                    {selectedCustomer === customer.id && (
                                        <div className="absolute top-2 right-2">
                                            <Check className="w-5 h-5 text-primary" />
                                        </div>
                                    )}
                                    <div className={`w-12 h-12 ${customer.color} rounded-lg mx-auto mb-3 flex items-center justify-center`}>
                                        <FileText className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-bold text-lg">{customer.name}</h3>
                                    <p className="text-xs text-muted-foreground mt-1">{customer.fullName}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                );

            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold mb-2">Pilih Regional</h2>
                            <p className="text-muted-foreground">
                                Customer: <span className="font-semibold text-primary">{CUSTOMERS.find(c => c.id === selectedCustomer)?.name}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                            {REGIONALS.map((regional) => (
                                <motion.div
                                    key={regional.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedRegional(regional.id)}
                                    className={`
                                        relative cursor-pointer rounded-xl border-2 p-6 text-center transition-all
                                        ${selectedRegional === regional.id
                                            ? 'border-primary bg-primary/5 shadow-lg'
                                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                        }
                                    `}
                                >
                                    {selectedRegional === regional.id && (
                                        <div className="absolute top-2 right-2">
                                            <Check className="w-5 h-5 text-primary" />
                                        </div>
                                    )}
                                    <MapPin className={`w-10 h-10 mx-auto mb-3 ${selectedRegional === regional.id ? 'text-primary' : 'text-muted-foreground'
                                        }`} />
                                    <h3 className="font-bold text-lg">{regional.name}</h3>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                );

            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold mb-2">Pilih Site & Isi Form</h2>
                            <p className="text-muted-foreground">
                                <span className="font-semibold text-primary">{CUSTOMERS.find(c => c.id === selectedCustomer)?.name}</span>
                                {' - '}
                                <span className="font-semibold">{REGIONALS.find(r => r.id === selectedRegional)?.name}</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left: Site List from Tracker */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        Sites Need BAST ({filteredTrackers.length})
                                    </Label>
                                    <Button variant="ghost" size="sm" onClick={fetchTrackers} disabled={isLoadingTrackers}>
                                        <RefreshCw className={`w-4 h-4 ${isLoadingTrackers ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari Site ID atau Nama..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                                    {isLoadingTrackers ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading...
                                        </div>
                                    ) : filteredTrackers.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                                            Tidak ada site dengan status "Need Created BAST"
                                        </div>
                                    ) : (
                                        filteredTrackers.map((tracker) => (
                                            <div
                                                key={tracker.id}
                                                onClick={() => handleSelectTracker(tracker)}
                                                className={`
                                                    p-3 border-b last:border-b-0 cursor-pointer transition-colors
                                                    ${selectedTracker?.id === tracker.id
                                                        ? 'bg-primary/10 border-l-4 border-l-primary'
                                                        : 'hover:bg-muted/50'
                                                    }
                                                `}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium">{tracker.site_id_1}</p>
                                                        <p className="text-sm text-muted-foreground">{tracker.site_name}</p>
                                                    </div>
                                                    {selectedTracker?.id === tracker.id && (
                                                        <Check className="w-4 h-4 text-primary" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Add Work: {tracker.main_addwork || '-'}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right: Form */}
                            <div className="space-y-4">
                                <Label className="flex items-center gap-2">
                                    <FileSignature className="w-4 h-4" />
                                    Data BAST
                                </Label>

                                <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Site ID <span className="text-destructive">*</span></Label>
                                            <Input
                                                value={formData.site_id}
                                                onChange={(e) => handleInputChange('site_id', e.target.value)}
                                                placeholder="Site ID"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Site Name <span className="text-destructive">*</span></Label>
                                            <Input
                                                value={formData.site_name}
                                                onChange={(e) => handleInputChange('site_name', e.target.value)}
                                                placeholder="Site Name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Add Work <span className="text-destructive">*</span></Label>
                                        <Input
                                            value={formData.add_work}
                                            onChange={(e) => handleInputChange('add_work', e.target.value)}
                                            placeholder="Main Add Work"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Tanggal
                                        </Label>
                                        <Input
                                            value={formData.date_now}
                                            readOnly
                                            className="bg-muted"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Hash className="w-4 h-4" />
                                                TT Number <span className="text-xs text-muted-foreground">(opsional)</span>
                                            </Label>
                                            <Input
                                                value={formData.tt_number}
                                                onChange={(e) => handleInputChange('tt_number', e.target.value)}
                                                placeholder="TT Number"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2">
                                                <Hash className="w-4 h-4" />
                                                PO Number <span className="text-xs text-muted-foreground">(opsional)</span>
                                            </Label>
                                            <Input
                                                value={formData.po_number}
                                                onChange={(e) => handleInputChange('po_number', e.target.value)}
                                                placeholder="PO Number"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case 4:
                return renderStep4();

            default:
                return null;
        }
    };

    const stepLabels = ['Pilih Customer', 'Pilih Regional', 'Pilih Site & Form', 'Preview & Download'];

    return (
        <div className="space-y-8">
            {/* Stepper */}
            <div className="flex items-center justify-center">
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((step, index) => (
                        <React.Fragment key={step}>
                            <div className={`
                                flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all
                                ${currentStep >= step
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }
                            `}>
                                {currentStep > step ? <Check className="w-5 h-5" /> : step}
                            </div>
                            {index < 3 && (
                                <div className={`w-12 h-1 rounded ${currentStep > step ? 'bg-primary' : 'bg-muted'
                                    }`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Step Labels */}
            <div className="flex items-center justify-center gap-4 text-xs md:text-sm flex-wrap">
                {stepLabels.map((label, index) => (
                    <span
                        key={index}
                        className={currentStep >= index + 1 ? 'text-primary font-medium' : 'text-muted-foreground'}
                    >
                        {label}
                    </span>
                ))}
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
                {renderStepContent()}
            </AnimatePresence>

            {/* Navigation Buttons */}
            {currentStep < 4 && (
                <div className="flex justify-between max-w-2xl mx-auto">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentStep(prev => prev - 1)}
                        disabled={currentStep === 1}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </Button>

                    <Button
                        onClick={() => setCurrentStep(prev => prev + 1)}
                        disabled={!canProceed()}
                    >
                        Lanjut
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default GenerateBAST;
