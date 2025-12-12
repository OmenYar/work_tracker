import * as XLSX from 'xlsx';

/**
 * Export data to Excel file (.xlsx)
 */
export const exportToExcel = (data, filename = 'export') => {
    try {
        // Create a new workbook
        const wb = XLSX.utils.book_new();

        // Convert data to worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Auto-size columns
        const colWidths = [];
        if (data.length > 0) {
            Object.keys(data[0]).forEach((key, i) => {
                const maxLength = Math.max(
                    key.length,
                    ...data.map(row => String(row[key] || '').length)
                );
                colWidths[i] = { wch: Math.min(maxLength + 2, 50) };
            });
            ws['!cols'] = colWidths;
        }

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Data');

        // Generate Excel file and trigger download
        XLSX.writeFile(wb, `${filename}.xlsx`);

        console.log(`✅ Excel file exported: ${filename}.xlsx`);
    } catch (error) {
        console.error('❌ Error exporting to Excel:', error);
        throw error;
    }
};

/**
 * Legacy function name for backward compatibility
 */
export const exportToCSV = exportToExcel;
