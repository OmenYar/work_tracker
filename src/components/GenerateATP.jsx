import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileSpreadsheet,
    ChevronRight,
    ChevronLeft,
    Download,
    Search,
    Check,
    Building2,
    Zap,
    Camera,
    RefreshCw,
    Upload,
    X,
    MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/customSupabaseClient';
import { syncModuleToGoogleSheets } from '@/lib/googleSheetsSync';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Photo categories (Grouped for UI)
const PHOTO_GROUPS = [
    {
        title: '1. Picture of rectifier and module (before & after) (Required: 2 Photos)',
        items: [
            { id: 'rectifier_before', label: 'Before' },
            { id: 'rectifier_after', label: 'After' },
        ]
    },
    {
        title: '2. Picture of battery charge current limit and battery capacity setting (Required: 1 Photo)',
        items: [
            { id: 'battery', label: 'Battery' },
        ]
    },
    {
        title: '3. Picture of ACPDB box opened (Required: 1 Photo)',
        items: [
            { id: 'acpdb', label: 'ACPDB Box' },
        ]
    },
    {
        title: '4. Picture of voltage measurement RST - N (before & after) (Required: 3 Before & 3 After)',
        items: [
            { id: 'voltage_before_1', label: 'Before 1' },
            { id: 'voltage_before_2', label: 'Before 2' },
            { id: 'voltage_before_3', label: 'Before 3' },
            { id: 'voltage_after_1', label: 'After 1' },
            { id: 'voltage_after_2', label: 'After 2' },
            { id: 'voltage_after_3', label: 'After 3' },
        ]
    },
    {
        title: '5. Capture AC Current R-S-T (before & after) (Required: 3 Before & 3 After)',
        items: [
            { id: 'ac_current_before_1', label: 'Before 1' },
            { id: 'ac_current_before_2', label: 'Before 2' },
            { id: 'ac_current_before_3', label: 'Before 3' },
            { id: 'ac_current_after_1', label: 'After 1' },
            { id: 'ac_current_after_2', label: 'After 2' },
            { id: 'ac_current_after_3', label: 'After 3' },
        ]
    },
];

// Format date to dd-MMM-yy
const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = d.getDate().toString().padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
};

const GenerateATP = () => {
    // Wizard state - 4 steps
    const [currentStep, setCurrentStep] = useState(1);
    const STEPS = [
        { id: 1, name: 'Pilih Site', icon: Building2 },
        { id: 2, name: 'Project Info', icon: MapPin },
        { id: 3, name: 'Voltage Measurement', icon: Zap },
        { id: 4, name: 'Upload Foto', icon: Camera },
        { id: 5, name: 'Preview & Download', icon: Download },
    ];

    // Step 1: Site selection
    const [moduleData, setModuleData] = useState([]);
    const [isLoadingModules, setIsLoadingModules] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedArea, setSelectedArea] = useState('');

    // Step 2: Project Information
    const [projectInfo, setProjectInfo] = useState({
        project_name: '',
        site_name: '',
        site_id: '',
        area: '',
        region: '',
        longitude: '',
        latitude: '',
        installation_date: '',
        task_id_netgear: '',
        rectifier_capacity_amp: '',
        rectifier_capacity_volt: '',
        battery_50ah: '',
        battery_100ah: '',
        battery_150ah: '',
        sn_module: '',
    });

    // Step 3: Voltage Measurement
    const [voltageMeasurement, setVoltageMeasurement] = useState({
        ac_input_rs: '',
        ac_input_st: '',
        ac_input_tr: '',
        ac_input_rn: '',
        ac_input_sn: '',
        ac_input_tn: '',
        voltage_ng: '',
    });

    // Step 4: Photos
    const [photos, setPhotos] = useState({});

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGenerated, setIsGenerated] = useState(false);

    // Fetch module data - only rfs_status = 'Done' AND doc_atp = 'Open'
    const fetchModules = useCallback(async () => {
        setIsLoadingModules(true);
        try {
            let query = supabase
                .from('module_tracker')
                .select('*')
                .eq('rfs_status', 'Done')
                .eq('doc_atp', 'Open')
                .order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            setModuleData(data || []);
        } catch (err) {
            console.error('Fetch error:', err);
            setModuleData([]);
        } finally {
            setIsLoadingModules(false);
        }
    }, []);

    useEffect(() => {
        fetchModules();
    }, [fetchModules]);

    // Unique Areas for Filter
    const availableAreas = [...new Set(moduleData.map(m => m.area).filter(Boolean))].sort();

    // Filter modules based on search and area
    const filteredModules = moduleData.filter(m => {
        const matchesSearch = m.site_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.site_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesArea = selectedArea ? m.area === selectedArea : true;
        return matchesSearch && matchesArea;
    });

    // Select a module - auto-fill data
    const handleSelectModule = (mod) => {
        setSelectedModule(mod);
        setProjectInfo({
            project_name: mod.project_name || '',
            site_name: mod.site_name || '',
            site_id: mod.site_id || '',
            area: mod.area || '',
            region: mod.region || '',
            longitude: mod.longitude || '',
            latitude: mod.latitude || '',
            installation_date: mod.install_date || '',
            task_id_netgear: mod.task_id_netgear || '',
            rectifier_capacity_amp: '',
            rectifier_capacity_volt: '',
            battery_50ah: '',
            battery_100ah: '',
            battery_150ah: '',
            sn_module: mod.sn_module || '',
        });
    };

    // Handle photo upload
    const handlePhotoUpload = (categoryId, files) => {
        const file = files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotos(prev => ({
                    ...prev,
                    [categoryId]: {
                        file,
                        preview: reader.result,
                        name: file.name,
                        base64: reader.result.split(',')[1], // Extracted base64 for ExcelJS
                        extension: file.name.split('.').pop().toLowerCase()
                    }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    // Remove photo
    const removePhoto = (categoryId) => {
        setPhotos(prev => {
            const newPhotos = { ...prev };
            delete newPhotos[categoryId];
            return newPhotos;
        });
    };

    // Check if step can proceed
    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return selectedModule !== null;
            case 2:
                // All Project Info fields required
                return (
                    projectInfo.project_name &&
                    projectInfo.site_id &&
                    projectInfo.site_name &&
                    projectInfo.area &&
                    projectInfo.region &&
                    projectInfo.longitude &&
                    projectInfo.latitude &&
                    projectInfo.installation_date &&
                    projectInfo.task_id_netgear &&
                    projectInfo.rectifier_capacity_amp &&
                    projectInfo.sn_module
                );
            case 3:
                // All Voltage Measurement fields required
                return Object.values(voltageMeasurement).every(val => val !== '');
            case 4:
                // All Photos required (16 total)
                const requiredPhotoIds = [
                    'rectifier_before', 'rectifier_after',
                    'battery',
                    'acpdb',
                    'voltage_before_1', 'voltage_before_2', 'voltage_before_3',
                    'voltage_after_1', 'voltage_after_2', 'voltage_after_3',
                    'ac_current_before_1', 'ac_current_before_2', 'ac_current_before_3',
                    'ac_current_after_1', 'ac_current_after_2', 'ac_current_after_3'
                ];
                return requiredPhotoIds.every(id => photos[id]);
            default: return true;
        }
    };

    // Generate Excel using template with ExcelJS
    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // Fetch template
            const response = await fetch('/templates/atp_template.xlsx');
            if (!response.ok) throw new Error('Template not found');

            const templateBuffer = await response.arrayBuffer();

            // Load workbook with ExcelJS (preserves formatting)
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(templateBuffer);

            // Debug: log available worksheets
            console.log('Available worksheets:', workbook.worksheets.map(ws => ws.name));

            // Get worksheet - try multiple methods
            let worksheet = workbook.getWorksheet(1);
            if (!worksheet && workbook.worksheets.length > 0) {
                worksheet = workbook.worksheets[0];
            }

            if (!worksheet) {
                throw new Error('No worksheet found in template');
            }

            console.log('Using worksheet:', worksheet.name);

            // Cell mappings based on user specification:
            // Project name: row 5-6 G and row 8 I
            worksheet.getCell('G5').value = projectInfo.project_name;
            worksheet.getCell('G6').value = projectInfo.project_name;
            worksheet.getCell('I8').value = projectInfo.project_name;

            // Site name: row 10 I
            worksheet.getCell('I10').value = projectInfo.site_name;

            // Site ID: row 11 I
            worksheet.getCell('I11').value = projectInfo.site_id;

            // Area: row 12 I
            worksheet.getCell('I12').value = projectInfo.area;

            // Region: row 13 I
            worksheet.getCell('I13').value = projectInfo.region;

            // Longitude: row 14 I
            worksheet.getCell('I14').value = projectInfo.longitude;

            // Latitude: row 15 I
            worksheet.getCell('I15').value = projectInfo.latitude;

            // Installation date: row 6 X and row 16 I
            const formattedDate = formatDate(projectInfo.installation_date);
            worksheet.getCell('X6').value = formattedDate;
            worksheet.getCell('I16').value = formattedDate;

            // Task ID Netgear: row 17 I
            worksheet.getCell('I17').value = projectInfo.task_id_netgear;

            // Rectifier capacity: 23I (amp) / 23O (volt), also 70Z and 71Z
            worksheet.getCell('I23').value = projectInfo.rectifier_capacity_amp;
            worksheet.getCell('O23').value = projectInfo.rectifier_capacity_volt;
            worksheet.getCell('Z70').value = projectInfo.rectifier_capacity_amp;
            worksheet.getCell('Z71').value = projectInfo.rectifier_capacity_volt;

            // Battery capacity: 50Ah (I24), 100Ah (I25), 150Ah (I26)
            worksheet.getCell('I24').value = projectInfo.battery_50ah;
            worksheet.getCell('I25').value = projectInfo.battery_100ah;
            worksheet.getCell('I26').value = projectInfo.battery_150ah;

            // S/N Module: rows 54-65 column X (split by space)
            const snList = (projectInfo.sn_module || '').split(' ').filter(sn => sn.trim());
            snList.forEach((sn, index) => {
                if (index < 12) {
                    worksheet.getCell(`X${54 + index}`).value = sn.trim();
                }
            });

            // Voltage Measurement Mappings (Z40-Z46)
            worksheet.getCell('Z40').value = voltageMeasurement.ac_input_rs;
            worksheet.getCell('Z41').value = voltageMeasurement.ac_input_st;
            worksheet.getCell('Z42').value = voltageMeasurement.ac_input_tr;
            worksheet.getCell('Z43').value = voltageMeasurement.ac_input_rn;
            worksheet.getCell('Z44').value = voltageMeasurement.ac_input_sn;
            worksheet.getCell('Z45').value = voltageMeasurement.ac_input_tn;
            worksheet.getCell('Z46').value = voltageMeasurement.voltage_ng;

            // Photo Embedding with Exact Sizing
            // 1 inch = ~96 px
            // Battery/ACPDB: 2.73" x 1.71" -> 262 x 164 px
            // Rectifier: 1.41" x 1.43" -> 135 x 137 px  (plus top margin for text)
            // Grid Photos: 1.14" x 0.8" -> 109 x 77 px

            const photoPositions = {
                // Rectifier (83-90 D-H, J-O)
                // Col Indexes: D(3), H(7), J(9), O(14)
                // Move 'Before' to 3.2 (D offset)
                // Top margin for labels "Before"/"After" -> row offset 0.2
                'rectifier_before': {
                    tl: { col: 3.2, row: 82.2 },
                    ext: { width: 135, height: 137 }
                },
                'rectifier_after': {
                    tl: { col: 9.5, row: 82.2 },
                    ext: { width: 135, height: 137 }
                },

                // Battery (82-90 U-AD)
                'battery': {
                    tl: { col: 20.2, row: 81.2 },
                    ext: { width: 262, height: 164 }
                },

                // ACPDB Box (93-101 U-AD)
                'acpdb': {
                    tl: { col: 20.2, row: 92.2 },
                    ext: { width: 262, height: 164 }
                },

                // Voltage Grid (User Specified Ranges with Margin)
                // Cols: C-F (2-5), G-K (6-10), L-P (11-15)
                // Rows Before: 93-97 (92-96 index)
                // Rows After: 98-101 (97-100 index)

                // Using tl/br with 0.1 padding to creating spacing inside the range
                'voltage_before_1': { tl: { col: 2.1, row: 92.1 }, br: { col: 5.9, row: 96.9 } }, // C-F
                'voltage_before_2': { tl: { col: 6.1, row: 92.1 }, br: { col: 10.9, row: 96.9 } }, // G-K
                'voltage_before_3': { tl: { col: 11.1, row: 92.1 }, br: { col: 15.9, row: 96.9 } }, // L-P

                'voltage_after_1': { tl: { col: 2.1, row: 97.1 }, br: { col: 5.9, row: 100.9 } },
                'voltage_after_2': { tl: { col: 6.1, row: 97.1 }, br: { col: 10.9, row: 100.9 } },
                'voltage_after_3': { tl: { col: 11.1, row: 97.1 }, br: { col: 15.9, row: 100.9 } },

                // AC Current Grid (User Specified Ranges with Margin)
                // Rows Before: 104-108 (103-107 index)
                // Rows After: 109-112 (108-111 index)
                'ac_current_before_1': { tl: { col: 2.1, row: 103.1 }, br: { col: 5.9, row: 107.9 } },
                'ac_current_before_2': { tl: { col: 6.1, row: 103.1 }, br: { col: 10.9, row: 107.9 } },
                'ac_current_before_3': { tl: { col: 11.1, row: 103.1 }, br: { col: 15.9, row: 107.9 } },

                'ac_current_after_1': { tl: { col: 2.1, row: 108.1 }, br: { col: 5.9, row: 111.9 } },
                'ac_current_after_2': { tl: { col: 6.1, row: 108.1 }, br: { col: 10.9, row: 111.9 } },
                'ac_current_after_3': { tl: { col: 11.1, row: 108.1 }, br: { col: 15.9, row: 111.9 } },
            };

            for (const [key, photo] of Object.entries(photos)) {
                if (photo && photo.base64 && photoPositions[key]) {
                    const imageId = workbook.addImage({
                        base64: photo.base64,
                        extension: photo.extension || 'jpeg',
                    });

                    const pos = photoPositions[key];
                    const imageOpts = {
                        tl: pos.tl,
                        editAs: 'oneCell'
                    };

                    // Use br if defined (for range-based placement), otherwise use ext (for fixed size)
                    if (pos.br) {
                        imageOpts.br = pos.br;
                    } else {
                        imageOpts.ext = pos.ext;
                    }

                    worksheet.addImage(imageId, imageOpts);
                }
            }

            // Generate buffer and download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `ATP_${projectInfo.site_id}_${formatDate(new Date())}.xlsx`);

            // Update doc_atp status to 'Done' in database
            if (selectedModule?.id) {
                await supabase
                    .from('module_tracker')
                    .update({ doc_atp: 'Done' })
                    .eq('id', selectedModule.id);

                // Sync to Google Sheets
                await syncModuleToGoogleSheets({ doc_atp: 'Done' }, selectedModule.id, true);
            }

            setIsGenerated(true);
            alert('ATP berhasil di-generate! Status doc_atp telah diupdate menjadi Done.');

        } catch (error) {
            console.error('Generate error:', error);
            alert('Error generating ATP: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // Reset form
    const handleReset = () => {
        setCurrentStep(1);
        setIsGenerated(false);
        setSelectedModule(null);
        setProjectInfo({
            project_name: '', site_name: '', site_id: '', area: '', region: '',
            longitude: '', latitude: '', installation_date: '', task_id_netgear: '',
            rectifier_capacity_amp: '', rectifier_capacity_volt: '',
            battery_50ah: '', battery_100ah: '', battery_150ah: '', sn_module: '',
        });
        setVoltageMeasurement({
            ac_input_rs: '', ac_input_st: '', ac_input_tr: '',
            ac_input_rn: '', ac_input_sn: '', ac_input_tn: '', voltage_ng: '',
        });
        setPhotos({});
        fetchModules();
    };

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Pilih Site
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold">Pilih Site</h2>
                            <p className="text-muted-foreground text-sm">
                                Hanya menampilkan site dengan RFS Status = Done dan Doc ATP = Open
                            </p>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-4 mb-4">
                            <div className="flex-1">
                                <Label>Filter Area (Kab/Kota)</Label>
                                <Select value={selectedArea || 'all'} onValueChange={(v) => setSelectedArea(v === 'all' ? '' : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Semua Area" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Area</SelectItem>
                                        {availableAreas.map(area => (
                                            <SelectItem key={area} value={area}>{area}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex-1">
                                <Label>Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Cari Site ID / Name..."
                                        className="pl-10"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Site List */}
                        <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                            {isLoadingModules ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                                    <span>Loading...</span>
                                </div>
                            ) : filteredModules.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Tidak ada site yang tersedia
                                </div>
                            ) : (
                                filteredModules.map(mod => (
                                    <div
                                        key={mod.id}
                                        onClick={() => handleSelectModule(mod)}
                                        className={`p-4 border-b cursor-pointer transition-colors ${selectedModule?.id === mod.id
                                            ? 'bg-primary/10 border-l-4 border-l-primary'
                                            : 'hover:bg-muted/50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{mod.site_id}</p>
                                                <p className="text-sm text-muted-foreground">{mod.site_name}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    <MapPin className="w-3 h-3 inline mr-1" />
                                                    {mod.area} • {mod.region}
                                                </p>
                                            </div>
                                            {selectedModule?.id === mod.id && (
                                                <Check className="w-5 h-5 text-primary" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                );

            case 2: // Project Information
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold">Project Information</h2>
                            <p className="text-muted-foreground text-sm">Site: {selectedModule?.site_id}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Project Name *</Label>
                                <Input
                                    value={projectInfo.project_name}
                                    onChange={(e) => setProjectInfo(p => ({ ...p, project_name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Site ID *</Label>
                                <Input value={projectInfo.site_id} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label>Site Name *</Label>
                                <Input value={projectInfo.site_name} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label>Area (Kab/Kota) *</Label>
                                <Input value={projectInfo.area} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label>Region (Provinsi) *</Label>
                                <Input value={projectInfo.region} disabled className="bg-muted" />
                            </div>
                            <div className="space-y-2">
                                <Label>Longitude *</Label>
                                <Input
                                    value={projectInfo.longitude}
                                    onChange={(e) => setProjectInfo(p => ({ ...p, longitude: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Latitude *</Label>
                                <Input
                                    value={projectInfo.latitude}
                                    onChange={(e) => setProjectInfo(p => ({ ...p, latitude: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Installation Date *</Label>
                                <Input
                                    type="date"
                                    value={projectInfo.installation_date}
                                    onChange={(e) => setProjectInfo(p => ({ ...p, installation_date: e.target.value }))}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label>Task ID Netgear *</Label>
                                <Input
                                    value={projectInfo.task_id_netgear}
                                    onChange={(e) => setProjectInfo(p => ({ ...p, task_id_netgear: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Rectifier Capacity */}
                        <div className="border-t pt-4">
                            <Label className="text-base font-semibold">Rectifier Capacity *</Label>
                            <div className="flex items-center gap-2 mt-2">
                                <Input
                                    placeholder="Amp"
                                    value={projectInfo.rectifier_capacity_amp}
                                    onChange={(e) => setProjectInfo(p => ({ ...p, rectifier_capacity_amp: e.target.value }))}
                                    className="w-24"
                                />
                                <span>A /</span>
                                <Input
                                    placeholder="Volt"
                                    value={projectInfo.rectifier_capacity_volt}
                                    onChange={(e) => setProjectInfo(p => ({ ...p, rectifier_capacity_volt: e.target.value }))}
                                    className="w-24"
                                />
                                <span>V</span>
                            </div>
                        </div>

                        {/* Battery Capacity */}
                        <div className="border-t pt-4">
                            <Label className="text-base font-semibold">Battery Capacity * (Min 1)</Label>
                            <div className="flex items-center gap-4 mt-2 flex-wrap">
                                <div className="flex items-center gap-1">
                                    <Input
                                        placeholder="0"
                                        value={projectInfo.battery_50ah}
                                        onChange={(e) => setProjectInfo(p => ({ ...p, battery_50ah: e.target.value }))}
                                        className="w-16"
                                    />
                                    <span>x 50 Ah</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Input
                                        placeholder="0"
                                        value={projectInfo.battery_100ah}
                                        onChange={(e) => setProjectInfo(p => ({ ...p, battery_100ah: e.target.value }))}
                                        className="w-16"
                                    />
                                    <span>x 100 Ah</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Input
                                        placeholder="0"
                                        value={projectInfo.battery_150ah}
                                        onChange={(e) => setProjectInfo(p => ({ ...p, battery_150ah: e.target.value }))}
                                        className="w-16"
                                    />
                                    <span>x 150 Ah</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <Label>S/N Module (dari data) *</Label>
                            <Input
                                value={projectInfo.sn_module}
                                onChange={(e) => setProjectInfo(p => ({ ...p, sn_module: e.target.value }))}
                                className="mt-2"
                            />
                        </div>
                    </motion.div>
                );

            case 3: // Voltage Measurement
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold">Voltage Input Measurement</h2>
                            <p className="text-muted-foreground text-sm">Semua field wajib diisi</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="border p-2 text-left">No</th>
                                        <th className="border p-2 text-left">Description</th>
                                        <th className="border p-2 text-left">Specification</th>
                                        <th className="border p-2 text-left">Result *</th>
                                        <th className="border p-2 text-left">Unit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border p-2" rowSpan={6}>1</td>
                                        <td className="border p-2">AC Input R - S</td>
                                        <td className="border p-2 text-muted-foreground">350V ~ 410V</td>
                                        <td className="border p-2">
                                            <Input
                                                value={voltageMeasurement.ac_input_rs}
                                                onChange={(e) => setVoltageMeasurement(v => ({ ...v, ac_input_rs: e.target.value }))}
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="border p-2">Vac</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-2">AC Input S - T</td>
                                        <td className="border p-2 text-muted-foreground">350V ~ 410V</td>
                                        <td className="border p-2">
                                            <Input
                                                value={voltageMeasurement.ac_input_st}
                                                onChange={(e) => setVoltageMeasurement(v => ({ ...v, ac_input_st: e.target.value }))}
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="border p-2">Vac</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-2">AC Input T - R</td>
                                        <td className="border p-2 text-muted-foreground">350V ~ 410V</td>
                                        <td className="border p-2">
                                            <Input
                                                value={voltageMeasurement.ac_input_tr}
                                                onChange={(e) => setVoltageMeasurement(v => ({ ...v, ac_input_tr: e.target.value }))}
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="border p-2">Vac</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-2">AC Input R - N</td>
                                        <td className="border p-2 text-muted-foreground">90V ~ 242V</td>
                                        <td className="border p-2">
                                            <Input
                                                value={voltageMeasurement.ac_input_rn}
                                                onChange={(e) => setVoltageMeasurement(v => ({ ...v, ac_input_rn: e.target.value }))}
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="border p-2">Vac</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-2">AC Input S - N</td>
                                        <td className="border p-2 text-muted-foreground">90V ~ 242V</td>
                                        <td className="border p-2">
                                            <Input
                                                value={voltageMeasurement.ac_input_sn}
                                                onChange={(e) => setVoltageMeasurement(v => ({ ...v, ac_input_sn: e.target.value }))}
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="border p-2">Vac</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-2">AC Input T - N</td>
                                        <td className="border p-2 text-muted-foreground">90V ~ 242V</td>
                                        <td className="border p-2">
                                            <Input
                                                value={voltageMeasurement.ac_input_tn}
                                                onChange={(e) => setVoltageMeasurement(v => ({ ...v, ac_input_tn: e.target.value }))}
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="border p-2">Vac</td>
                                    </tr>
                                    <tr>
                                        <td className="border p-2">2</td>
                                        <td className="border p-2">Voltage N - G</td>
                                        <td className="border p-2 text-muted-foreground">0V ~ 5V</td>
                                        <td className="border p-2">
                                            <Input
                                                value={voltageMeasurement.voltage_ng}
                                                onChange={(e) => setVoltageMeasurement(v => ({ ...v, voltage_ng: e.target.value }))}
                                                className="h-8"
                                            />
                                        </td>
                                        <td className="border p-2">Vac</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                );

            case 4: // Upload Foto
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold">Upload Foto</h2>
                            <p className="text-muted-foreground text-sm">Upload foto evidence untuk ATP document (Wajib semua)</p>
                        </div>

                        <div className="space-y-6">
                            {PHOTO_GROUPS.map((group, groupIdx) => (
                                <div key={groupIdx} className="border rounded-lg p-4">
                                    <h3 className="font-semibold mb-3">{group.title}</h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                                        {group.items.map(item => (
                                            <div key={item.id} className="space-y-2">
                                                <Label className="text-xs">{item.label}</Label>
                                                {photos[item.id] ? (
                                                    <div className="relative group">
                                                        <img
                                                            src={photos[item.id].preview}
                                                            alt={item.label}
                                                            className="w-full h-24 object-cover rounded border"
                                                        />
                                                        <Button
                                                            size="icon"
                                                            variant="destructive"
                                                            className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => removePhoto(item.id)}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded cursor-pointer hover:bg-muted/50 transition-colors">
                                                        <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                                                        <span className="text-[10px] text-muted-foreground text-center">Upload</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handlePhotoUpload(item.id, e.target.files)}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );

            case 5: // Preview & Download
                return (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold">Preview & Download</h2>
                            <p className="text-muted-foreground text-sm">Review data dan download dokumen ATP</p>
                        </div>

                        <div className="grid gap-6">
                            <Card>
                                <CardContent className="pt-6">
                                    <h3 className="font-semibold mb-4 text-center">Summary Data</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Project Info</p>
                                            <p className="font-medium text-green-600 flex items-center gap-1">
                                                <Check className="w-4 h-4" /> Lengkap
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Voltage Measurement</p>
                                            <p className="font-medium text-green-600 flex items-center gap-1">
                                                <Check className="w-4 h-4" /> Lengkap
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Photos</p>
                                            <p className="font-medium text-green-600 flex items-center gap-1">
                                                <Check className="w-4 h-4" /> 16/16 Foto Uploaded
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Validation</p>
                                            <p className="font-medium text-green-600 flex items-center gap-1">
                                                <Check className="w-4 h-4" /> Ready to Generate
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex flex-col items-center gap-4 pt-4">
                                {/* Download Button */}
                                <Button
                                    size="lg"
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-full md:w-auto min-w-[250px] h-12 text-lg"
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-5 h-5 mr-2" />
                                            Download ATP Document
                                        </>
                                    )}
                                </Button>

                                {/* Reset / Generate Another Button - Only show after generation */}
                                {isGenerated && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <Button
                                            variant="outline"
                                            onClick={handleReset}
                                            className="min-w-[250px]"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Buat ATP Lainnya
                                        </Button>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                        <FileSpreadsheet className="w-6 h-6 text-cyan-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Generate ATP Document</h1>
                        <p className="text-muted-foreground text-sm">Acceptance Test Procedure - Module DPR2900</p>
                    </div>
                </div>
                <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset
                </Button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2">
                {STEPS.map((step, idx) => (
                    <React.Fragment key={step.id}>
                        <div
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${currentStep === step.id
                                ? 'bg-primary text-primary-foreground'
                                : currentStep > step.id
                                    ? 'bg-green-500/20 text-green-700'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                        >
                            <step.icon className="w-4 h-4" />
                            <span className="text-sm font-medium hidden sm:inline">{step.name}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Content */}
            <Card>
                <CardContent className="pt-6">
                    <AnimatePresence mode="wait">
                        {renderStepContent()}
                    </AnimatePresence>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
                <Button
                    variant="outline"
                    onClick={() => setCurrentStep(s => s - 1)}
                    disabled={currentStep === 1}
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                </Button>
                {currentStep < 5 && (
                    <Button
                        onClick={() => setCurrentStep(s => s + 1)}
                        disabled={!canProceed()}
                    >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default GenerateATP;
