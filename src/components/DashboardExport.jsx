import React from 'react';
import { Download, Printer, FileSpreadsheet, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

/**
 * Dashboard Export Component - Captures entire dashboard including charts
 */
const DashboardExport = ({
    stats = {},
    tableData = [],
    tableColumns = [],
    title = 'Dashboard Report',
}) => {
    // Fields to exclude (UUIDs)
    const excludeKeys = ['id', 'created_at', 'updated_at', 'user_id', 'pic_id', 'site_id'];

    // Export stats to Excel (no UUID)
    const exportToExcel = () => {
        try {
            const wb = XLSX.utils.book_new();

            // Stats sheet
            if (Object.keys(stats).length > 0) {
                const statsData = Object.entries(stats).map(([key, value]) => ({
                    'Metric': key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    'Value': value
                }));
                const statsSheet = XLSX.utils.json_to_sheet(statsData);
                statsSheet['!cols'] = [{ wch: 25 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, statsSheet, 'Summary');
            }

            // Table data sheet (no UUID)
            if (tableData.length > 0) {
                const cols = tableColumns.length > 0
                    ? tableColumns.filter(c => !excludeKeys.includes(c.key) && !c.key.endsWith('_id'))
                    : Object.keys(tableData[0])
                        .filter(k => !excludeKeys.includes(k) && !k.endsWith('_id'))
                        .map(k => ({ key: k, header: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }));

                const exportData = tableData.map((row, index) => {
                    const obj = { 'No': index + 1 };
                    cols.forEach(col => {
                        const val = row[col.key];
                        obj[col.header] = val === null || val === undefined ? '' : String(val);
                    });
                    return obj;
                });

                const dataSheet = XLSX.utils.json_to_sheet(exportData);
                XLSX.utils.book_append_sheet(wb, dataSheet, 'Data');
            }

            XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
            console.log('✅ Excel exported successfully');
        } catch (error) {
            console.error('❌ Excel export error:', error);
            alert('Failed to export Excel: ' + error.message);
        }
    };

    // Export entire dashboard to PDF with visual capture
    const exportToPDF = async () => {
        try {
            // Find the dashboard content element
            const targetElement = document.querySelector('[data-dashboard-content]');

            if (!targetElement) {
                alert('Dashboard content not found');
                return;
            }

            // Show loading indicator
            const loadingToast = document.createElement('div');
            loadingToast.id = 'pdf-loading';
            loadingToast.innerHTML = `
                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                     background: rgba(0,0,0,0.85); color: white; padding: 24px 48px; border-radius: 12px; 
                     z-index: 99999; font-family: system-ui, sans-serif; text-align: center;">
                    <div style="margin-bottom: 12px;">📄 Generating PDF...</div>
                    <div style="font-size: 12px; opacity: 0.7;">Please wait, capturing dashboard</div>
                </div>
            `;
            document.body.appendChild(loadingToast);

            // Wait a bit for any animations to settle
            await new Promise(resolve => setTimeout(resolve, 500));

            // Capture the element with high quality
            const canvas = await html2canvas(targetElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: targetElement.scrollWidth,
                height: targetElement.scrollHeight,
                windowWidth: targetElement.scrollWidth,
                windowHeight: targetElement.scrollHeight,
            });

            // Remove loading indicator
            const loadingEl = document.getElementById('pdf-loading');
            if (loadingEl) loadingEl.remove();

            // Create PDF
            const imgWidth = 277; // A4 landscape width minus margins
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10;
            const contentHeight = pageHeight - 30; // Leave space for header and footer

            // Title
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(title, margin, 12);

            // Metadata
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 18);
            doc.setTextColor(0);

            // Add captured image with proper pagination
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const startY = 22;

            if (imgHeight <= contentHeight) {
                // Single page
                doc.addImage(imgData, 'JPEG', margin, startY, imgWidth, imgHeight);
            } else {
                // Multi-page: slice the image
                let yOffset = 0;
                let pageNum = 1;
                const sourceHeight = canvas.height;
                const sourceWidth = canvas.width;
                const sliceHeightPx = (contentHeight / imgHeight) * sourceHeight;

                while (yOffset < sourceHeight) {
                    if (pageNum > 1) {
                        doc.addPage();
                        // Re-add title on each page
                        doc.setFontSize(12);
                        doc.setFont('helvetica', 'bold');
                        doc.text(`${title} (continued)`, margin, 10);
                    }

                    // Calculate this slice
                    const remainingHeight = sourceHeight - yOffset;
                    const thisSliceHeight = Math.min(sliceHeightPx, remainingHeight);
                    const thisSliceHeightMm = (thisSliceHeight / sourceHeight) * imgHeight;

                    // Create slice canvas
                    const sliceCanvas = document.createElement('canvas');
                    sliceCanvas.width = sourceWidth;
                    sliceCanvas.height = thisSliceHeight;
                    const ctx = sliceCanvas.getContext('2d');
                    ctx.drawImage(
                        canvas,
                        0, yOffset, sourceWidth, thisSliceHeight,
                        0, 0, sourceWidth, thisSliceHeight
                    );

                    const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
                    const yPos = pageNum === 1 ? startY : 14;
                    doc.addImage(sliceData, 'JPEG', margin, yPos, imgWidth, thisSliceHeightMm);

                    yOffset += thisSliceHeight;
                    pageNum++;
                }
            }

            // Add page numbers to all pages
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth - 25, pageHeight - 5);
            }

            doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
            console.log('✅ PDF exported successfully');
        } catch (error) {
            console.error('❌ PDF export error:', error);
            // Remove loading if error
            const loadingEl = document.getElementById('pdf-loading');
            if (loadingEl) loadingEl.remove();
            alert('Failed to export PDF: ' + error.message);
        }
    };

    // Print handler
    const handlePrint = () => {
        window.print();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Export Dashboard">
                    <Download className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Export Dashboard</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                    Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                    <Image className="w-4 h-4 mr-2 text-red-600" />
                    Export to PDF (with Charts)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
                    <Printer className="w-4 h-4 mr-2 text-blue-600" />
                    Print Page
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default DashboardExport;
