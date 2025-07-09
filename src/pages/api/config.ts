// src/pages/api/config.json.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
    const adminEmails = (import.meta.env.ADMIN_EMAILS || '').split(',');
    const stripeLink = import.meta.env.STRIPE_LINK || '';

    if (!supabaseUrl || !supabaseAnonKey) {
        return new Response(
            JSON.stringify({ error: 'Bad server config' }),
            { status: 500 }
        );
    }

    return new Response(
        JSON.stringify({ supabaseUrl, supabaseAnonKey, adminEmails, stripeLink }),
        {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        },
    );
};
