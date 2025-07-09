// Fichier : /api/parse-rss.js
// Version 24.0 - OPTI Promise.all + Timeout hard + Logs (Juillet 2025)

import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const parser = new Parser({
    timeout: 10000,
    headers: { 'User-Agent': 'INFODROP RSS Parser/1.0' }
});

// Ta liste de flux RSS complète et organisée
const RSS_FEEDS = [
    // === GENERALISTES ===
    { name: 'France Info', url: 'https://www.francetvinfo.fr/titres.rss', orientation: 'centre', tags: ['national'] },
    { name: 'Le Monde', url: 'https://www.lemonde.fr/rss/une.xml', orientation: 'centre-gauche', tags: ['national'] },
    { name: 'Libération', url: 'https://www.liberation.fr/arc/outboundfeeds/rss-all/?outputType=xml', orientation: 'gauche', tags: ['national'] },
    { name: 'Le Figaro', url: 'https://www.lefigaro.fr/rss/figaro_actualites.xml', orientation: 'droite', tags: ['national'] },
    { name: 'Le Parisien', url: 'https://feeds.leparisien.fr/leparisien/rss', orientation: 'centre-droit', tags: ['national'] },
    { name: 'Ouest France', url: 'https://www.ouest-france.fr/rss-en-continu.xml', orientation: 'centre', tags: ['regional'] },
    { name: 'Courrier International', url: 'https://www.courrierinternational.com/feed/all/rss.xml', orientation: 'centre-gauche', tags: ['traduction'] },
    { name: 'France Inter', url: 'https://www.radiofrance.fr/franceinter/rss', orientation: 'centre-gauche', tags: ['national'] },
    { name: "France24", url: 'https://www.france24.com/fr/france/rss', orientation: 'centre-gauche', tags: ['national'] },
    { name: "L'Obs", url: 'https://www.nouvelobs.com/rss.xml', orientation: 'centre-gauche', tags: ['national'] },
    { name: "France Info", url: 'https://www.francetvinfo.fr/titres.rss', orientation: 'centre', tags: ['national'] },
    { name: 'Euronews', url: 'https://fr.euronews.com/rss', orientation: 'centre', tags: ['international'] },

    // === RÉGIONALES ===
    { name: "La Depeche", url: 'https://www.ladepeche.fr/rss.xml', orientation: 'centre-gauche', tags: ['regional'] },
    { name: "Sud Ouest", url: 'https://www.sudouest.fr/rss.xml', orientation: 'centre-gauche', tags: ['regional'] },
    { name: "La Republique des Pyrenees", url: 'https://www.larepubliquedespyrenees.fr/rss.xml', orientation: 'centre-gauche', tags: ['regional'] },
    { name: 'La Semaine des Pyrénées', url: 'https://www.lasemainedespyrenees.fr/feed', orientation: 'centre', tags: ['regional'] },
    { name: 'Corse Net Infos', url: 'https://www.corsenetinfos.corsica/xml/syndication.rss', orientation: 'neutre', tags: ['Corse'] },

    // === LA PRESSE (Canada) ===
    { name: 'La Presse', url: 'https://www.lapresse.ca/actualites/rss', orientation: 'centre', tags: ['canada'] },
    { name: 'Radio-Canada', url: 'https://ici.radio-canada.ca/rss/4159', orientation: 'centre', tags: ['canada'] },
    { name: 'Le Devoir', url: 'https://www.ledevoir.com/rss/manchettes.xml', orientation: 'gauche', tags: ['canada'] },
    { name: 'Journal de Montréal', url: 'https://www.journaldemontreal.com/rss.xml', orientation: 'droite', tags: ['canada'] },

    // === SOURCES OFFICIELLES & PARLEMENTAIRES ===
    { name: 'Sénat (Textes)', url: 'https://www.senat.fr/rss/textes.xml', orientation: 'gouvernement', tags: ['officiel'] },
    { name: 'Sénat (Presse)', url: 'https://www.senat.fr/rss/presse.xml', orientation: 'gouvernement', tags: ['officiel'] },
    { name: 'Assemblée Nat. (Docs)', url: 'https://www2.assemblee-nationale.fr/feeds/detail/documents-parlementaires', orientation: 'gouvernement', tags: ['officiel'] },
    { name: 'Assemblée Nat. (CRs)', url: 'https://www2.assemblee-nationale.fr/feeds/detail/crs', orientation: 'gouvernement', tags: ['officiel'] },

    // === CULTURE / SCIENCES / SOCIÉTÉ ===
    { name: 'France Culture', url: 'https://www.radiofrance.fr/franceculture/rss', orientation: 'centre-gauche', tags: ['culture'] },
    { name: 'Futura Sciences', url: 'https://www.futura-sciences.com/rss/actualites.xml', orientation: 'centre', tags: ['sciences'] },
    { name: 'Sciences et Avenir', url: 'https://www.sciencesetavenir.fr/rss.xml', orientation: 'centre', tags: ['sciences'] },
    { name: 'Konbini', url: 'https://www.konbini.com/fr/feed/', orientation: 'centre', tags: ['pop', 'tendance'] },
    { name: 'Numerama', url: 'https://www.numerama.com/feed/', orientation: 'centre', tags: ['tech'] },
    { name: 'Zataz', url: 'https://www.zataz.com/feed/', orientation: 'neutre', tags: ['tech'] },
    { name: 'Reflets', url: 'https://reflets.info/feeds/public', orientation: 'gauche', tags: ['hacktivisme'] },
    { name: 'Journal du Geek', url: 'https://www.journaldugeek.com/feed/', orientation: 'neutre', tags: ['tech'] },


    // === ECO & CRYPTO ===
    { name: 'Journal du coin', url: 'https://journalducoin.com/feed/', orientation: 'neutre', tags: ['crypto'] },
    { name: 'Cryptoast', url: 'https://cryptoast.fr/feed/', orientation: 'neutre', tags: ['crypto'] },
    { name: 'Capital.fr', url: 'https://feed.prismamediadigital.com/v1/cap/rss', orientation: 'centre-droit', tags: ['économie'] },

    // === SPORT ===
    { name: "L'Équipe", url: "https://dwh.lequipe.fr/api/edito/rss?path=/Tous%20sports", orientation: "centre", tags: ["sport"] },

    // === DÉFENSE / MILITAIRE ===
    { name: 'Cyber.gouv.fr (ANSSI)', url: 'https://cyber.gouv.fr/actualites/feed', orientation: 'gouvernement', tags: ['cyber'] },
    { name: 'OPEX360', url: 'https://feeds.feedburner.com/ZoneMilitaire', orientation: 'droite', tags: ['militaire'] },

    // === INDÉPENDANTS ===
    { name: 'Reporterre', url: 'https://reporterre.net/spip.php?page=backend', orientation: 'gauche', tags: ['écologie'] },
    { name: 'Blast', url: 'https://api.blast-info.fr/rss.xml', orientation: 'gauche', tags: ['independant'] },
    { name: 'Arrêt sur Images', url: 'https://api.arretsurimages.net/api/public/rss/all-content', orientation: 'centre-gauche', tags: ['investigation'] },
    { name: 'Apar.tv', url: 'https://www.apar.tv/latest/rss/', orientation: 'centre-gauche', tags: ['pop'] },
    { name: 'Le Média en 4-4-2', url: 'https://lemediaen442.fr/feed/', orientation: 'centre-gauche', tags: ['independant'] },

    // === PRESSE D’OPINION & IDÉOLOGIQUE ===
    { name: "L'Humanité", url: 'https://www.humanite.fr/sections/politique/feed', orientation: 'gauche', tags: ['politique'] },
    { name: "L'Humanité", url: 'https://www.humanite.fr/sections/social-et-economie/feed', orientation: 'gauche', tags: ['économie'] },
    { name: "L'Humanité", url: 'https://www.humanite.fr/mot-cle/extreme-droite/feed', orientation: 'gauche', tags: ['opinion'] },
    { name: 'Politis', url: 'https://www.politis.fr/flux-rss-apps/', orientation: 'gauche', tags: ['opinion'] },
    { name: 'Regards', url: 'https://regards.fr/category/l-actu/feed/', orientation: 'gauche', tags: ['opinion'] },
    { name: 'La Croix', url: 'https://www.la-croix.com/feeds/rss/societe.xml', orientation: 'centre-droit', tags: ['société'] },
    { name: 'La Croix', url: 'https://www.la-croix.com/feeds/rss/politique.xml', orientation: 'centre-droit', tags: ['politique'] },
    { name: 'La Croix', url: 'https://www.la-croix.com/feeds/rss/culture.xml', orientation: 'centre-droit', tags: ['culture'] },
    { name: "L'Opinion", url: 'https://feeds.feedburner.com/lopinion', orientation: 'droite', tags: ['opinion'] },
    { name: 'Valeurs Actuelles', url: 'https://www.valeursactuelles.com/feed?post_type=post', orientation: 'extrême-droite', tags: ['opinion'] },
    { name: 'Causeur', url: 'https://www.causeur.fr/feed', orientation: 'extrême-droite', tags: ['opinion'] },
    { name: 'BFMTV', url: 'https://www.bfmtv.com/rss/news-24-7/', orientation: 'centre-droit', tags: ['tv'] },
    { name: 'BFMTV', url: 'https://www.bfmtv.com/rss/people/', orientation: 'centre-droit', tags: ['people'] },
    { name: 'BFMTV', url: 'https://www.bfmtv.com/rss/crypto/', orientation: 'centre-droit', tags: ['crypto'] },
    { name: 'RMC', url: 'https://rmc.bfmtv.com/rss/actualites/', orientation: 'centre', tags: ['radio', 'tv'] },
    { name: 'Révolution Permanente', url: 'https://www.revolutionpermanente.fr/spip.php?page=backend_portada', orientation: 'extrême-gauche', tags: ['opinion'] },
    { name: 'Cnews', url: 'https://www.cnews.fr/rss.xml', orientation: 'extrême-droite', tags: ['opinion'] },
    { name: 'Basta!', url: 'https://basta.media/spip.php?page=backend', orientation: 'extrême-gauche', tags: ['opinion'] },
    { name: 'Ballast', url: 'https://www.revue-ballast.fr/feed/', orientation: 'extrême-gauche', tags: ['opinion'] },

    // === PRESSE ÉTRANGÈRE ===
    { name: 'RTBF', url: 'https://rss.rtbf.be/article/rss/highlight_rtbf_info.xml?source=internal', orientation: 'centre-gauche', tags: ['belgique'] },

    // === ZAP ===
    { name: 'VU FranceTV', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqt99sKYNTxqlHtzV9weUYA', orientation: 'neutre', tags: ['zap'] },

    // === OUTRE-MER ===
    { name: 'Mayotte Hebdo', url: 'https://mayottehebdo.com/feed/', orientation: 'centre', tags: ['outre-mer'] },
    { name: "L'Info Kwezi", url: 'https://www.linfokwezi.fr/feed/', orientation: 'centre', tags: ['outre-mer'] },
    { name: 'France-Antilles', url: 'https://www.martinique.franceantilles.fr/actualite/rss.xml', orientation: 'centre', tags: ['outre-mer'] },
    { name: 'RCI.fm', url: 'https://rci.fm/martinique/fb/articles_rss_mq', orientation: 'centre', tags: ['outre-mer'] },
    { name: 'Tahiti Infos', url: 'https://www.tahiti-infos.com/xml/syndication.rss', orientation: 'centre', tags: ['outre-mer'] },
    { name: 'Outremers360', url: 'https://api.outremers360.com/rss/fil-info.xml', orientation: 'centre', tags: ['outre-mer'] },

    // === ALTERNATIF / INDÉPENDANT ===
    { name: 'Le Gossip', url: 'https://www.legossip.net/spip.php?page=backend', orientation: 'neutre', tags: ['people'] },
    { name: 'Public', url: 'https://www.public.fr/feed', orientation: 'neutre', tags: ['people'] },

    // --- ALTERNATIF / OPINION / GÉOPOLITIQUE ---
    { name: 'Réseau International', url: 'https://reseauinternational.net/feed/', orientation: 'extrême-droite', tags: ['alternatif'] },
    { name: 'Le Saker Francophone', url: 'https://lesakerfrancophone.fr/feed/', orientation: 'extrême-droite', tags: ['alternatif'] },
    { name: 'Geopolintel', url: 'https://geopolintel.fr/spip.php?page=backend', orientation: 'extrême-droite', tags: ['alternatif'] },
    { name: 'Nexus', url: 'https://nexus.fr/feed/', orientation: 'extrême-droite', tags: ['alternatif'] },
    { name: 'Enquête du Jour', url: 'https://enquetedujour.fr/feed/', orientation: 'extrême-droite', tags: ['alternatif'] },

    // --- EUROPÉEN / SCIENCE / COMMUNICATION ---
    { name: 'Le Grand Continent', url: 'https://legrandcontinent.eu/fr/feed/', orientation: 'centre-gauche', tags: ['europe'] },
    { name: 'The Conversation France', url: 'https://theconversation.com/fr/articles.atom', orientation: 'centre', tags: ['sciences'] },
    { name: 'Intelligence Online', url: 'https://feeds.feedburner.com/IntelligenceOnline-fr', orientation: 'centre', tags: ['tech'] },
    { name: 'CNRS Le Journal', url: 'https://lejournal.cnrs.fr/rss', orientation: 'neutre', tags: ['sciences'] }
];

function decodeHtmlEntities(str) {
    if (!str) return '';
    return str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&eacute;/g, 'é')
        .replace(/&egrave;/g, 'è')
        .replace(/&ecirc;/g, 'ê')
        .replace(/&rsquo;/g, "'")
        .replace(/&hellip;/g, '…')
        // 🇫🇷 FIX ENCODAGE GOUVERNEMENT
        .replace(/�/g, 'é')
        .replace(/ç/g, 'ç')
        .replace(/à/g, 'à')
        .replace(/è/g, 'è')
        .replace(/ê/g, 'ê')
        .replace(/ô/g, 'ô')
        .replace(/û/g, 'û')
        .replace(/â/g, 'â')
        .replace(/î/g, 'î')
        .replace(/ù/g, 'ù')
        .replace(/É/g, 'É')
        .replace(/À/g, 'À')
        .replace(/È/g, 'È');
}

const FILTER_RULES = { 'Le Parisien': ['météo', 'horoscope'] };
const GLOBAL_FILTER_KEYWORDS = [
    'horoscope', 'astrologie', 'loterie', 'programme tv', 'recette', 'mots croisés', 'sudoku'
];

function createSummary(text) {
    if (!text) return '';
    text = decodeHtmlEntities(text);
    const replacements = { '’': "'", '–': '-', '…': '...', '"': '"', '&': '&', '<': '<', '>': '>' };
    let cleanText = text.replace(/(&#?[a-z0-9]+;)/gi, (match) => replacements[match] || '');
    cleanText = cleanText.replace(/<[^>]*>/g, ' ').replace(/\s\s+/g, ' ').trim();
    if (cleanText.length > 180) {
        cleanText = cleanText.substring(0, 177) + '...';
    }
    return cleanText;
}

function shouldFilterArticle(title, source) {
    const lowerTitle = (title || '').toLowerCase();
    if (GLOBAL_FILTER_KEYWORDS.some(keyword => lowerTitle.includes(keyword))) return true;
    const sourceFilters = FILTER_RULES[source];
    if (sourceFilters && sourceFilters.some(keyword => lowerTitle.includes(keyword))) return true;
    return false;
}

// --- Fetch RSS avec timeout hard (5s) ---
function fetchRssWithTimeout(feed, timeout = 5000) {
    return new Promise((resolve) => {
        let finished = false;
        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                resolve({ feed, error: `Timeout after ${timeout}ms` });
            }
        }, timeout);

        parser.parseURL(feed.url)
            .then(feedData => {
                if (!finished) {
                    finished = true;
                    clearTimeout(timer);
                    resolve({ feed, feedData });
                }
            })
            .catch(e => {
                if (!finished) {
                    finished = true;
                    clearTimeout(timer);
                    resolve({ feed, error: e.message });
                }
            });
    });
}

export default async function handler(req, res) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const start = Date.now();
    console.log('🚀 [INFODROP] Parsing RSS - OPTI Promise.all + Timeout 5s');

    // Traite tout EN PARALLÈLE
    const results = await Promise.allSettled(
        RSS_FEEDS.map(feed => fetchRssWithTimeout(feed, 5000))
    );

    let articlesToInsert = [];
    let filteredCount = 0;
    let fluxOk = 0, fluxTimeout = 0, fluxError = 0;
    const now = new Date();

    for (const result of results) {
        if (result.status !== "fulfilled" || !result.value) {
            fluxError++;
            continue;
        }
        const { feed, feedData, error } = result.value;
        if (error) {
            if (error.includes("Timeout")) fluxTimeout++;
            else fluxError++;
            console.error(`❌ [RSS] ${feed.name}: ${error}`);
            continue;
        }
        if (!feedData?.items) continue;
        fluxOk++;

        for (const item of feedData.items) {
            if (shouldFilterArticle(item.title, feed.name)) {
                filteredCount++;
                continue;
            }

            let pubDate = item.isoDate ? new Date(item.isoDate) : new Date(now);
            if (pubDate > now) pubDate = new Date(now);

            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            if (pubDate >= twentyFourHoursAgo && item.link) {
                let titleToUse = item.title;
                if (feed.name === 'Konbini') {
                    titleToUse = decodeHtmlEntities(item.title);
                }
                articlesToInsert.push({
                    resume: createSummary(titleToUse || item.contentSnippet),
                    source: feed.name,
                    url: item.link,
                    heure: pubDate.toISOString(),
                    orientation: feed.orientation,
                    tags: feed.tags || null
                });
            }
        }
    }

    // Insertion en base
    let insertedCount = 0;
    if (articlesToInsert.length > 0) {
        const { data, error } = await supabase
            .from('actu')
            .upsert(articlesToInsert, { onConflict: 'url' })
            .select();

        if (error) {
            console.error('Erreur insertion Supabase:', error);
        } else {
            insertedCount = data ? data.length : 0;
        }
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);

    // Le nouveau message de log, beaucoup plus informatif
    console.log(`✅ [INFODROP] Parsing terminé en ${duration}s. Flux OK: ${fluxOk}, timeouts: ${fluxTimeout}, erreurs: ${fluxError}. ${articlesToInsert.length} articles trouvés, ${insertedCount} insérés, ${filteredCount} filtrés.`);

    // La nouvelle réponse JSON
    res.status(200).json({
        success: true,
        flux_ok: fluxOk,
        flux_timeout: fluxTimeout,
        flux_error: fluxError,
        articles_found: articlesToInsert.length,
        articles_inserted: insertedCount,
        articles_filtered: filteredCount,
        duration_seconds: duration
    });
}
