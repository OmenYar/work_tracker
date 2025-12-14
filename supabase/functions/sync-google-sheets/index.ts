// Supabase Edge Function untuk sync data ke Google Sheets
// Menggunakan Google Sheets API v4

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to properly parse private key from environment
function parsePrivateKey(rawKey: string | undefined): string {
    if (!rawKey) {
        throw new Error('GOOGLE_PRIVATE_KEY is not set');
    }

    let key = rawKey;
    key = key.replace(/\\n/g, '\n');
    key = key.replace(/^["']|["']$/g, '');

    if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
        throw new Error('Invalid private key format: missing BEGIN marker');
    }
    if (!key.includes('-----END PRIVATE KEY-----')) {
        throw new Error('Invalid private key format: missing END marker');
    }

    return key;
}

// Google API Token Generator menggunakan Service Account
async function getGoogleAccessToken(): Promise<string> {
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const rawPrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY');

    if (!serviceAccountEmail) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL is not configured');
    }

    const privateKey = parsePrivateKey(rawPrivateKey);

    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
        iss: serviceAccountEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
    };

    const base64URLEncode = (obj: object): string => {
        const json = JSON.stringify(obj);
        const bytes = new TextEncoder().encode(json);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const headerEncoded = base64URLEncode(header);
    const claimEncoded = base64URLEncode(claim);
    const signatureInput = `${headerEncoded}.${claimEncoded}`;

    const keyData = privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/[\r\n\s]/g, '');

    let binaryKey: Uint8Array;
    try {
        const binaryString = atob(keyData);
        binaryKey = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            binaryKey[i] = binaryString.charCodeAt(i);
        }
    } catch (e) {
        throw new Error(`Failed to decode private key: ${e.message}`);
    }

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        encoder.encode(signatureInput)
    );

    const sigBytes = new Uint8Array(signature);
    let sigBinary = '';
    for (let i = 0; i < sigBytes.length; i++) {
        sigBinary += String.fromCharCode(sigBytes[i]);
    }
    const signatureEncoded = btoa(sigBinary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const jwt = `${signatureInput}.${signatureEncoded}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
        console.error('Token error:', tokenData);
        throw new Error('Failed to get Google access token');
    }

    return tokenData.access_token;
}

// Find row by UUID in column B (since column A is now row number)
async function findRowByUUID(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string,
    uuid: string
): Promise<number | null> {
    // Read column B which contains UUID
    const range = `${sheetName}!B:B`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();

    if (!data.values) return null;

    for (let i = 0; i < data.values.length; i++) {
        if (data.values[i][0] === uuid) {
            return i + 1; // Rows are 1-indexed
        }
    }

    return null;
}

// Get the next row number for new entries
async function getNextRowNumber(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string
): Promise<number> {
    const range = `${sheetName}!A:A`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();

    if (!data.values || data.values.length <= 1) {
        return 1; // Start from 1 if only header exists
    }

    // Find the highest number in column A (excluding header)
    let maxNum = 0;
    for (let i = 1; i < data.values.length; i++) {
        const num = parseInt(data.values[i][0], 10);
        if (!isNaN(num) && num > maxNum) {
            maxNum = num;
        }
    }

    return maxNum + 1;
}

// Delete row from Google Sheets
async function deleteRowFromSheets(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string,
    uuid: string
): Promise<void> {
    // First, find the row with this UUID
    const rowNumber = await findRowByUUID(accessToken, spreadsheetId, sheetName, uuid);

    if (!rowNumber) {
        console.log(`Row with UUID ${uuid} not found in spreadsheet, skipping delete`);
        return;
    }

    // Get the sheet ID (gid) first
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    const metadataResponse = await fetch(metadataUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const metadata = await metadataResponse.json();

    const sheet = metadata.sheets?.find((s: any) => s.properties?.title === sheetName);
    if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
    }
    const sheetId = sheet.properties.sheetId;

    // Delete the row using batchUpdate
    const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const deleteResponse = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'ROWS',
                        startIndex: rowNumber - 1, // 0-indexed
                        endIndex: rowNumber,
                    },
                },
            }],
        }),
    });

    if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        throw new Error(`Failed to delete row: ${JSON.stringify(error)}`);
    }

    console.log(`Deleted row ${rowNumber} from Google Sheets`);
}

// Update existing row in Google Sheets
async function updateRowInSheets(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string,
    rowData: string[],
    uuid: string
): Promise<boolean> {
    const rowNumber = await findRowByUUID(accessToken, spreadsheetId, sheetName, uuid);

    if (!rowNumber) {
        console.log(`Row with UUID ${uuid} not found, will append instead`);
        return false;
    }

    // Update the row (keep the same row number in column A)
    const range = `${sheetName}!A${rowNumber}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    // Get existing row number from column A
    const existingRange = `${sheetName}!A${rowNumber}`;
    const existingUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(existingRange)}`;
    const existingResponse = await fetch(existingUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const existingData = await existingResponse.json();
    const existingRowNum = existingData.values?.[0]?.[0] || rowNumber - 1;

    // Replace first element (row number) with existing number
    rowData[0] = String(existingRowNum);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowData] }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update row: ${JSON.stringify(error)}`);
    }

    console.log(`Updated row ${rowNumber} in Google Sheets`);
    return true;
}

// Append new row to Google Sheets
async function appendRowToSheets(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string,
    rowData: string[]
): Promise<void> {
    const range = `${sheetName}!A:A`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowData] }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to append row: ${JSON.stringify(error)}`);
    }

    console.log('Appended new row to Google Sheets');
}

// Main handler
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { action, table, data, recordId } = await req.json();

        // Validate required fields
        if (!action || !table) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing required fields: action, table' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID');
        if (!spreadsheetId) {
            throw new Error('GOOGLE_SPREADSHEET_ID not configured');
        }

        const accessToken = await getGoogleAccessToken();
        const uuid = recordId || data?.id || '';
        const now = new Date().toISOString();

        // Get sheet name and prepare row data based on table
        let sheetName = 'Sheet1';
        let rowData: string[] = [];

        switch (table) {
            case 'cctv_data':
                sheetName = 'CCTV Data';
                // Order: No | UUID | Site ID | Site Name | Regional | Branch | Merk CCTV | Model | Install Date | Status | Tenant Available | Category | Remarks | Updated At
                rowData = [
                    '', // Row number - will be filled
                    uuid,
                    data?.site_id_display || '',
                    data?.site_name || '',
                    data?.regional || '',
                    data?.branch || '',
                    data?.merk_cctv || '',
                    data?.model || '',
                    data?.install_date || '',
                    data?.status || '',
                    data?.tenant_available || '',
                    data?.cctv_category || '',
                    data?.remarks || '',
                    now,
                ];
                break;

            case 'pic_data':
                sheetName = 'PIC Data';
                // Order: No | UUID | Nama PIC | Jabatan | NIK Karyawan | NIK KTP | NPWP | Nama Penerima Penghasilan | Alamat | Status | Regional | Nama Bank | Nama Rekening | No Rekening | Area | Tgl Join | Validasi | Tgl Berakhir | Remark | Updated At
                rowData = [
                    '', // Row number
                    uuid,
                    data?.nama_pic || '',
                    data?.jabatan || '',
                    data?.nik_karyawan || '',
                    data?.nik_ktp || '',
                    data?.npwp || '',
                    data?.nama_penerima_penghasilan || '',
                    data?.alamat || '',
                    data?.status || '',
                    data?.regional || '',
                    data?.nama_bank || '',
                    data?.nama_rekening || '',
                    data?.no_rekening || '',
                    data?.area || '',
                    data?.tgl_join || '',
                    data?.validasi || '',
                    data?.tgl_berakhir || '',
                    data?.remark || '',
                    now,
                ];
                break;

            case 'work_trackers':
                sheetName = 'Work Tracker';
                // Order: No | UUID | Site ID 1 | Site ID 2 | Site Name | Regional | Customer | PO Number | TT Number | Suspected | Main Addwork | Status Pekerjaan | Status BAST | Submit Date | Approve Date | Aging Days | Remark | Updated At
                rowData = [
                    '', // Row number
                    uuid,
                    data?.site_id_1 || '',
                    data?.site_id_2 || '',
                    data?.site_name || '',
                    data?.regional || '',
                    data?.customer || '',
                    data?.po_number || '',
                    data?.tt_number || '',
                    data?.suspected || '',
                    data?.main_addwork || '',
                    data?.status_pekerjaan || '',
                    data?.status_bast || '',
                    data?.bast_submit_date || '',
                    data?.bast_approve_date || '',
                    data?.aging_days !== undefined && data?.aging_days !== null ? String(data.aging_days) : '',
                    data?.remark || '',
                    now,
                ];
                break;

            case 'car_data':
                sheetName = 'Car Data';
                // Order: No | UUID | Nomor Polisi | Owner | Project | Province | Area | Kabupaten | Model | Brand | Year | STNK Exp | Pajak Exp | KIR Exp | Condition | Status Mobil | Priority | Plan Next Service | Service Info | Date Service | Nominal Service | Remark | PIC Name | Updated At
                rowData = [
                    '', // Row number
                    uuid,
                    data?.nomor_polisi || '',
                    data?.owner || '',
                    data?.project || '',
                    data?.province || '',
                    data?.area || '',
                    data?.kabupaten || '',
                    data?.model || '',
                    data?.brand || '',
                    data?.year_build || '',
                    data?.masa_berlaku_stnk || '',
                    data?.masa_berlaku_pajak || '',
                    data?.masa_berlaku_kir || '',
                    data?.condition || '',
                    data?.status_mobil || '',
                    data?.priority || '',
                    data?.plan_next_service || '',
                    data?.service_info || '',
                    data?.date_service || '',
                    data?.nominal_service || '',
                    data?.remark || '',
                    data?.pic_name || '',  // PIC Name instead of ID
                    now,
                ];
                break;

            default:
                return new Response(
                    JSON.stringify({ success: false, error: `Unsupported table: ${table}` }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
        }

        // Handle delete action
        if (action === 'delete') {
            if (!uuid) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Missing recordId for delete action' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
            }

            await deleteRowFromSheets(accessToken, spreadsheetId, sheetName, uuid);

            return new Response(
                JSON.stringify({ success: true, message: `Successfully deleted from Google Sheets (${table})` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // For insert/update, data is required
        if (!data) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing data for insert/update action' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Handle insert/update
        if (action === 'update') {
            const updated = await updateRowInSheets(accessToken, spreadsheetId, sheetName, rowData, uuid);
            if (!updated) {
                // If row not found, append as new
                rowData[0] = String(await getNextRowNumber(accessToken, spreadsheetId, sheetName));
                await appendRowToSheets(accessToken, spreadsheetId, sheetName, rowData);
            }
        } else {
            // Insert
            rowData[0] = String(await getNextRowNumber(accessToken, spreadsheetId, sheetName));
            await appendRowToSheets(accessToken, spreadsheetId, sheetName, rowData);
        }

        return new Response(
            JSON.stringify({ success: true, message: `Successfully synced to Google Sheets (${action} - ${table})` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});

