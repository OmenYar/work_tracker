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
 * @param {'login'|'logout'|'insert'|'update'|'delete'} options.action - Type of action
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

export const logInsert = (tableName, recordId, description) => logActivity({
    action: 'insert',
    tableName,
    recordId,
    description,
});

export const logUpdate = (tableName, recordId, description) => logActivity({
    action: 'update',
    tableName,
    recordId,
    description,
});

export const logDelete = (tableName, recordId, description) => logActivity({
    action: 'delete',
    tableName,
    recordId,
    description,
});
