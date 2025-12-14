import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        // Create admin client
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const { userId, email, password } = await req.json();

        if (!userId) {
            throw new Error('User ID is required');
        }

        const updates: { email?: string; password?: string } = {};

        if (email) {
            updates.email = email;
        }

        if (password && password.length >= 6) {
            updates.password = password;
        }

        if (Object.keys(updates).length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: 'No updates to apply' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Update user in auth
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            updates
        );

        if (error) {
            throw error;
        }

        // If email was updated, also update the profile
        if (email) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ email })
                .eq('id', userId);

            if (profileError) {
                console.error('Profile update error:', profileError);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'User updated successfully',
                user: { id: data.user?.id, email: data.user?.email }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error updating user:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
