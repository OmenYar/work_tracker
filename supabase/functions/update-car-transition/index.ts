// Supabase Edge Function: Update Car Transition Status
// Automatically updates car status_mobil to 'NON AKTIF' when:
// - status_transisi_q1 = 'Take Out' AND tgl_efektif_transisi <= today
// - OR status_transisi_q2_q4 = 'Take Out' AND tgl_efektif_transisi <= today
//
// This function should be called daily via cron job or external scheduler

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Create Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        console.log(`Running car transition check for date: ${today}`);

        // Find cars that need status update:
        // - Has Take Out status in Q1 or Q2-Q4
        // - Has effective transition date <= today
        // - Current status_mobil is still 'AKTIF'
        const { data: carsToUpdate, error: fetchError } = await supabase
            .from('car_data')
            .select('id, nomor_polisi, status_transisi_q1, status_transisi_q2_q4, tgl_efektif_transisi, status_mobil')
            .eq('status_mobil', 'AKTIF')
            .lte('tgl_efektif_transisi', today)
            .or('status_transisi_q1.eq.Take Out,status_transisi_q2_q4.eq.Take Out');

        if (fetchError) {
            console.error('Error fetching cars:', fetchError);
            throw fetchError;
        }

        if (!carsToUpdate || carsToUpdate.length === 0) {
            console.log('No cars need status update');
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No cars need status update',
                    updated: 0
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        console.log(`Found ${carsToUpdate.length} cars to update:`, carsToUpdate.map(c => c.nomor_polisi));

        // Update each car's status_mobil to 'NON AKTIF'
        const updateResults = [];
        for (const car of carsToUpdate) {
            const { error: updateError } = await supabase
                .from('car_data')
                .update({
                    status_mobil: 'NON AKTIF',
                    remark: `Auto-updated to NON AKTIF on ${today} due to transition plan`
                })
                .eq('id', car.id);

            if (updateError) {
                console.error(`Error updating car ${car.nomor_polisi}:`, updateError);
                updateResults.push({
                    nomor_polisi: car.nomor_polisi,
                    success: false,
                    error: updateError.message
                });
            } else {
                console.log(`Updated car ${car.nomor_polisi} to NON AKTIF`);
                updateResults.push({
                    nomor_polisi: car.nomor_polisi,
                    success: true
                });
            }
        }

        const successCount = updateResults.filter(r => r.success).length;
        const failCount = updateResults.filter(r => !r.success).length;

        return new Response(
            JSON.stringify({
                success: true,
                message: `Updated ${successCount} cars, ${failCount} failed`,
                updated: successCount,
                failed: failCount,
                details: updateResults
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Error in update-car-transition:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
