/**
 * Activity Logger Utility
 * 
 * Utility untuk mencatat aktivitas pengguna ke tabel activity_logs
 */

import { supabase } from './customSupabaseClient';

/**
 * Log an activity to the database
 * 
 * @param {Object} options
 * @param {string} options.action - Type of action (login, logout, insert, update, delete, inline_edit, bulk_update, etc.)
 * @param {string} [options.tableName] - Name of the affected table
 * @param {string} [options.recordId] - ID of the affected record
 * @param {string} [options.description] - Human readable description
 * @param {Object} [options.metadata] - Additional metadata (will be stored as JSON)
 */
export async function logActivity({ action, tableName = null, recordId = null, description = '', metadata = null }) {
    try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn('⚠️ Cannot log activity: No user logged in');
            return { success: false, error: 'No user logged in' };
        }

        const { error } = await supabase.from('activity_logs').insert([{
            user_id: user.id,
            action,
            table_name: tableName,
            record_id: recordId,
            description,
            metadata,
        }]);

        if (error) {
            console.error('❌ Error logging activity:', error);
            return { success: false, error: error.message };
        }

        console.log('📝 Activity logged:', action, tableName || '', description);
        return { success: true };
    } catch (err) {
        console.error('❌ Error logging activity:', err);
        return { success: false, error: err.message };
    }
}

// Convenience functions for common actions
export const logLogin = () => logActivity({
    action: 'login',
    tableName: 'auth',
    description: 'User logged in',
});

export const logLogout = () => logActivity({
    action: 'logout',
    tableName: 'auth',
    description: 'User logged out',
});

export const logInsert = (tableName, recordId, description, metadata = null) => logActivity({
    action: 'insert',
    tableName,
    recordId,
    description,
    metadata,
});

export const logUpdate = (tableName, recordId, description, metadata = null) => logActivity({
    action: 'update',
    tableName,
    recordId,
    description,
    metadata,
});

export const logDelete = (tableName, recordId, description, metadata = null) => logActivity({
    action: 'delete',
    tableName,
    recordId,
    description,
    metadata,
});

/**
 * Log an inline edit action
 * @param {string} tableName - Table being edited
 * @param {string} recordId - ID of the record
 * @param {string} field - Field that was edited
 * @param {any} oldValue - Previous value
 * @param {any} newValue - New value
 */
export const logInlineEdit = (tableName, recordId, field, oldValue, newValue) => logActivity({
    action: 'inline_edit',
    tableName,
    recordId,
    description: `Updated ${field} from "${oldValue || 'empty'}" to "${newValue}"`,
    metadata: {
        field,
        old_value: oldValue,
        new_value: newValue,
    },
});

/**
 * Log a bulk operation
 * @param {string} operation - Type of bulk operation (update, delete, export)
 * @param {string} tableName - Table affected
 * @param {string[]} recordIds - IDs of affected records
 * @param {Object} details - Additional details
 */
export const logBulkOperation = (operation, tableName, recordIds, details = {}) => logActivity({
    action: `bulk_${operation}`,
    tableName,
    recordId: recordIds.length > 5 ? `${recordIds.length} records` : recordIds.join(', '),
    description: `Bulk ${operation} on ${recordIds.length} record(s)`,
    metadata: {
        operation,
        affected_count: recordIds.length,
        record_ids: recordIds,
        ...details,
    },
});

/**
 * Log data export
 * @param {string} tableName - Table exported
 * @param {string} format - Export format (pdf, excel, csv)
 * @param {number} count - Number of records exported
 */
export const logExport = (tableName, format, count) => logActivity({
    action: 'export',
    tableName,
    description: `Exported ${count} records as ${format.toUpperCase()}`,
    metadata: {
        format,
        record_count: count,
    },
});
