// Fichier: /api/test-env.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({
            success: false,
            error: 'Variables d\'environnement manquantes !',
            url_found: !!supabaseUrl,
            key_found: !!serviceKey
        });
    }

    try {
        const supabase = createClient(supabaseUrl, serviceKey);
        const { error } = await supabase.auth.admin.listUsers({ perPage: 1 });
        if (error) throw error;
        res.status(200).json({ success: true, message: 'Connexion à Supabase OK !' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur connexion Supabase.', details: error.message });
    }
}