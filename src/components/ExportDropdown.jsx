import React from 'react';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Export Dropdown Component
 */
const ExportDropdown = ({
    data = [],
    filename = 'export',
    title = 'Data Export',
    showPrint = false,
    onPrint,
}) => {
    // Fields to exclude from export (UUIDs and system fields)
    const excludeKeys = ['id', 'created_at', 'updated_at', 'user_id', 'pic_id', 'site_id'];

    // Get ALL columns from data (exclude UUID and system fields)
    const getAllColumns = () => {
        if (!data || data.length === 0) return [];

        // Get all unique keys from all rows
        const allKeys = new Set();
        data.forEach(row => {
            Object.keys(row).forEach(key => allKeys.add(key));
        });

        return Array.from(allKeys)
            .filter(key => !excludeKeys.includes(key) && !key.endsWith('_id'))
            .map(key => ({
                key,
                header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            }));
    };

    // Format value for export
    const formatValue = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (typeof val === 'object') {
            if (val instanceof Date) return val.toLocaleDateString();
            if (Array.isArray(val)) return val.join(', ');
            return JSON.stringify(val);
        }
        return String(val);
    };

    // Export to Excel - FULL DATA (no UUID)
    const exportToExcel = () => {
        try {
            const cols = getAllColumns();

            if (cols.length === 0 || data.length === 0) {
                alert('No data to export');
                return;
            }

            // Transform data - include ALL columns except UUID
            const exportData = data.map((row, index) => {
                const obj = { 'No': index + 1 };
                cols.forEach(col => {
                    obj[col.header] = formatValue(row[col.key]);
                });
                return obj;
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Data');

            // Auto-size columns
            const colWidths = [{ wch: 5 }, ...cols.map(col => ({
                wch: Math.max(col.header.length + 2, 15)
            }))];
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
            console.log('✅ Excel exported successfully');
        } catch (error) {
            console.error('❌ Excel export error:', error);
            alert('Failed to export Excel: ' + error.message);
        }
    };

    // Export to PDF - FULL DATA (no UUID, no cutting)
    const exportToPDF = () => {
        try {
            const cols = getAllColumns();

            if (cols.length === 0 || data.length === 0) {
                alert('No data to export');
                return;
            }

            // Always use landscape for better table fit
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Title
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(title, 14, 15);

            // Metadata
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
            doc.text(`Total Records: ${data.length}`, 14, 27);
            doc.setTextColor(0);

            // Prepare table data with row numbers
            const headers = ['No', ...cols.map(col => col.header)];
            const rows = data.map((row, index) => [
                index + 1,
                ...cols.map(col => {
                    const val = formatValue(row[col.key]);
                    // Keep reasonable length
                    return val.length > 50 ? val.substring(0, 47) + '...' : val;
                })
            ]);

            // Calculate optimal column widths
            const tableWidth = pageWidth - 20;
            const numCols = headers.length;

            // Use autoTable with proper settings to prevent cutting
            autoTable(doc, {
                head: [headers],
                body: rows,
                startY: 32,
                theme: 'grid',
                styles: {
                    fontSize: 7,
                    cellPadding: 2,
                    overflow: 'linebreak',
                    cellWidth: 'wrap',
                    halign: 'left',
                    valign: 'middle',
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 7,
                    halign: 'center',
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250],
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' }, // No column
                },
                margin: { top: 32, left: 10, right: 10, bottom: 15 },
                tableWidth: 'auto',
                showHead: 'everyPage',
                // Prevent row splitting across pages
                rowPageBreak: 'auto',
                bodyStyles: {
                    minCellHeight: 8,
                },
                didDrawPage: function (data) {
                    // Footer with page number
                    const pageCount = doc.internal.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(
                        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
                        pageWidth - 30,
                        pageHeight - 8
                    );
                }
            });

            doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
            console.log('✅ PDF exported successfully');
        } catch (error) {
            console.error('❌ PDF export error:', error);
            alert('Failed to export PDF: ' + error.message);
        }
    };

    // Print handler
    const handlePrint = () => {
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Export">
                    <Download className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                    Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2 text-red-600" />
                    Export to PDF
                </DropdownMenuItem>
                {showPrint && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
                            <Printer className="w-4 h-4 mr-2 text-blue-600" />
                            Print Page
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ExportDropdown;
