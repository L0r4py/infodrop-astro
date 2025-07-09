// Fichier : /api/daily-purge.js (Version 24h glissantes)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('🧹 Démarrage de la purge des articles de plus de 24h');
    
    // Calcule la date et l'heure d'il y a exactement 24 heures
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    try {
        // Supprimer tous les articles dont l'heure est antérieure à "il y a 24h"
        const { data, error } = await supabase
            .from('actu')
            .delete()
            .lt('heure', twentyFourHoursAgo.toISOString()) // La logique a changé ici
            .select();

        if (error) throw error;

        const deletedCount = data ? data.length : 0;
        console.log(`✅ Purge terminée: ${deletedCount} articles de plus de 24h supprimés.`);

        // Log de succès
        await supabase.from('purge_logs').insert({
            executed_at: new Date().toISOString(),
            articles_deleted: deletedCount,
            status: 'success',
            error_message: '24h sliding window' // On peut ajouter une note
        });

        res.status(200).json({ success: true, deleted_count: deletedCount });

    } catch (error) {
        console.error('❌ Erreur lors de la purge:', error);

        // Log de l'erreur
        await supabase.from('purge_logs').insert({
            executed_at: new Date().toISOString(),
            status: 'error',
            error_message: error.message
        });

        res.status(500).json({ success: false, error: error.message });
    }
}