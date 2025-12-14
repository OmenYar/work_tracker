/**
 * Google Sheets Sync Utility
 * 
 * Utility function untuk sync data ke Google Sheets melalui Supabase Edge Function.
 * Edge Function menghindari masalah CORS dan menjaga credentials tetap aman.
 */

import { supabase } from './customSupabaseClient';

/**
 * Sync data ke Google Sheets
 * 
 * @param {Object} options - Sync options
 * @param {'insert'|'update'|'delete'} options.action - Action type
 * @param {string} options.table - Nama tabel (e.g. 'cctv_data')
 * @param {Object} [options.data] - Data yang akan di-sync (not required for delete)
 * @param {string} [options.recordId] - ID record
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function syncToGoogleSheets({ action, table, data, recordId }) {
    try {
        // Get current session for auth header
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
            console.warn('⚠️ No auth session, skipping Google Sheets sync');
            return { success: false, error: 'No auth session' };
        }

        // Get Supabase URL from env
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        // Call Edge Function
        const response = await fetch(`${supabaseUrl}/functions/v1/sync-google-sheets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                action,
                table,
                data,
                recordId,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('❌ Google Sheets sync failed:', result.error);
            return { success: false, error: result.error };
        }

        console.log('✅ Google Sheets sync successful:', result.message);
        return { success: true };

    } catch (error) {
        console.error('❌ Google Sheets sync error:', error);
        // Don't throw - sync failure shouldn't break the main operation
        return { success: false, error: error.message };
    }
}

// ============================================
// CCTV Data Helpers
// ============================================

export async function syncCCTVToGoogleSheets(data, recordId, isUpdate = false) {
    return syncToGoogleSheets({
        action: isUpdate ? 'update' : 'insert',
        table: 'cctv_data',
        data,
        recordId,
    });
}

export async function deleteCCTVFromGoogleSheets(recordId) {
    return syncToGoogleSheets({
        action: 'delete',
        table: 'cctv_data',
        data: null,
        recordId,
    });
}

// ============================================
// PIC Data Helpers
// ============================================

export async function syncPICToGoogleSheets(data, recordId, isUpdate = false) {
    return syncToGoogleSheets({
        action: isUpdate ? 'update' : 'insert',
        table: 'pic_data',
        data,
        recordId,
    });
}

export async function deletePICFromGoogleSheets(recordId) {
    return syncToGoogleSheets({
        action: 'delete',
        table: 'pic_data',
        data: null,
        recordId,
    });
}

// ============================================
// Work Tracker Helpers
// ============================================

export async function syncTrackerToGoogleSheets(data, recordId, isUpdate = false) {
    return syncToGoogleSheets({
        action: isUpdate ? 'update' : 'insert',
        table: 'work_trackers',
        data,
        recordId,
    });
}

export async function deleteTrackerFromGoogleSheets(recordId) {
    return syncToGoogleSheets({
        action: 'delete',
        table: 'work_trackers',
        data: null,
        recordId,
    });
}

// ============================================
// Car Data Helpers
// ============================================

export async function syncCarToGoogleSheets(data, recordId, isUpdate = false) {
    return syncToGoogleSheets({
        action: isUpdate ? 'update' : 'insert',
        table: 'car_data',
        data,
        recordId,
    });
}

export async function deleteCarFromGoogleSheets(recordId) {
    return syncToGoogleSheets({
        action: 'delete',
        table: 'car_data',
        data: null,
        recordId,
    });
}
