// Fichier: /api/validate-invite.js (version corrigée)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { code, email } = req.body;
    if (!code || !email) {
        return res.status(400).json({ error: 'Un code et un email sont requis' });
    }
    const emailLC = email.toLowerCase(); // Force l'email en minuscules

    try {
        // --- Étape A : Vérifier le code d'invitation ---
        const { data: codeData, error: fetchError } = await supabase
            .from('invitation_codes')
            .select('*')
            .eq('code', code)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!codeData) {
            return res.status(400).json({ error: 'Ce code d\'invitation est invalide ou n\'existe pas.' });
        }

        if (codeData.is_used) {
            return res.status(400).json({ error: 'Ce code d\'invitation a déjà été utilisé.' });
        }

        // --- Étape B : Marquer le code comme "utilisé" ---
        const { error: updateError } = await supabase
            .from('invitation_codes')
            .update({ is_used: true, used_by_email: emailLC, used_at: new Date().toISOString() })
            .eq('id', codeData.id);
        if (updateError) throw updateError;

        // --- Étape C : Créer un nouveau code pour le nouvel utilisateur ---
        const { data: newCodeData, error: rpcError } = await supabase.rpc('generate_invitation_code');
        if (rpcError) throw rpcError;
        
        await supabase.from('invitation_codes').insert({
            code: newCodeData,
            owner_email: emailLC,
            parent_code_id: codeData.id,
            generation: codeData.generation + 1
        });
        
        // --- Étape D : Succès ---
        res.status(200).json({ success: true, message: 'Code validé avec succès.' });

    } catch (error) {
        console.error('Erreur inattendue dans validate-invite:', error.message);
        res.status(500).json({ error: 'Erreur serveur inattendue.' });
    }
}
