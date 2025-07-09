// ══════════════════════════════════════════════════════════════════════
//  public/scripts/main.js
//  • initializeSupabase()  → récupère /api/config + client Supabase
//  • initTicker(scope)     → date, météo, phase lune, compteur 2026
//  • DEBUG switch          → mettre DEBUG = false pour désactiver logs
// ══════════════════════════════════════════════════════════════════════

/* ───── CONFIG DEBUG ───── */
const DEBUG = true;
const dlog = (...args) => DEBUG && console.log('[DEBUG]', ...args);

/* ───── Variables globales (exportées) ───── */
window.supabase = null;
window.ADMIN_EMAILS = [];
window.STRIPE_LINK = '';

/* ──────────────────────────────────────────────────────────────────────
   initializeSupabase  —  appel unique au chargement
   ─────────────────────────────────────────────────────────────────── */
window.initializeSupabase = async function initializeSupabase() {
    dlog('🔐 initializeSupabase() lancé');

    try {
        console.log('🔐 Récupération de la configuration sécurisée...');

        // Récupérer TOUTE la configuration depuis l'API sécurisée
        const response = await fetch('/api/config');

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.status}`);
        }

        const config = await response.json();

        // Vérifier que toutes les données sont présentes
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error('Configuration Supabase incomplète');
        }

        // Import dynamique du SDK Supabase v2
        dlog('📦 Import du SDK Supabase...');
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');

        // Initialiser Supabase avec les clés récupérées
        window.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

        // Mettre à jour TOUTES les constantes sécurisées
        window.ADMIN_EMAILS = config.adminEmails || [];
        window.STRIPE_LINK = config.stripeLink || '';

        console.log('✅ Configuration complète initialisée de manière sécurisée');
        console.log('📧 Admin emails récupérés:', window.ADMIN_EMAILS.length + ' email(s)');
        console.log('💳 Stripe link récupéré: ✓');

        return true;

    } catch (error) {
        console.error('❌ Erreur initialisation:', error);

        // Affichage d'erreur utilisateur plus informatif
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); color: white; display: flex; align-items: center; justify-content: center; z-index: 9999; font-family: Arial;">
                <div style="text-align: center; padding: 2rem;">
                    <h2>❌ Erreur de configuration</h2>
                    <p>Impossible de charger la configuration sécurisée.</p>
                    <p>Veuillez contacter l'administrateur.</p>
                    <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3B82F6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Recharger la page
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(errorDiv);

        return false;
    }
};

/* === LOG UTILS ================================================== */
const D = (msg, ...rest) => console.debug('[DEBUG]', msg, ...rest);

/* === CRYPTO (CoinGecko) ========================================= */
async function loadCrypto(scope) {
    try {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd';
        const res = await fetch(url, { cache: 'no-cache' });
        const json = await res.json();

        scope.btc = json.bitcoin.usd;
        scope.eth = json.ethereum.usd;
        D('🪙 Prix crypto USD ↻', scope.btc, scope.eth);
    } catch (err) {
        console.error('Crypto fetch error', err);
    }
    setTimeout(() => loadCrypto(scope), 14_400_000);   // 4 h
}

/* === MÉTÉO (Open-Meteo) ========================================== */
async function fetchWeather(scope) {
    try {
        /* géoloc */
        const coords = await new Promise((ok, ko) =>
            navigator.geolocation.getCurrentPosition(
                p => ok(p.coords),
                ko,
                { maximumAge: 60_000, timeout: 8_000 }
            )
        );
        D('📍 Géoloc OK', coords);

        /* API */
        const url = `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${coords.latitude}&longitude=${coords.longitude}` +
            `&current=temperature_2m,is_day,weather_code`;
        const res = await fetch(url, { cache: 'no-cache' });
        const { current } = await res.json();

        /* mapping météo (jour/nuit) */
        const map = {
            0: ['☀️ Ciel dégagé', '🌙 Ciel clair'],
            1: ['🌤️ Peu nuageux', '🌙☁️ Peu nuageux'],
            2: ['⛅ Partiellement nuageux', '☁️ Part. nuageux'],
            3: ['☁️ Couvert', '☁️ Couvert'],
            45: ['🌫️ Brouillard', '🌫️ Brouillard'],
            48: ['🌫️ Brouillard givrant', '🌫️ Brouillard givrant'],
            51: ['🌦️ Bruine faible', '🌦️ Bruine faible'],
            61: ['🌧️ Pluie faible', '🌧️ Pluie faible'],
            71: ['🌨️ Neige faible', '🌨️ Neige faible'],
            95: ['⛈️ Orage', '⛈️ Orage']
        };
        const arr = map[current.weather_code] || ['❓', '❓'];
        const idx = current.is_day ? 0 : 1;

        scope.temp = current.temperature_2m.toFixed(0);
        [scope.wIcon, scope.wText] = arr[idx].split(' ');
        scope.wIcon += '';                       // garde l'emoji
        scope.wText = arr[idx].split(' ').slice(1).join(' ');

        D('🌤️  Météo reçue', current);
    } catch (err) {
        console.error('fetchWeather error', err);
    }
    setTimeout(() => fetchWeather(scope), 3_600_000);   // 1 h
}

/* === PHASE LUNAIRE (emoji + libellé) ============================= */
function moonPhase(scope) {
    const phases = [
        '🌑 Nouvelle lune',
        '🌒 Premier croissant',
        '🌓 Premier quartier',
        '🌔 Gibbeuse croissante',
        '🌕 Pleine lune',
        '🌖 Gibbeuse décroissante',
        '🌗 Dernier quartier',
        '🌘 Dernier croissant'
    ];
    const now = Date.now() / 86_400_000;           // jours Unix
    const idx = Math.floor(((now + 4) % 29.53) / 3.69) % 8;
    scope.moon = phases[idx];
}

/* === initTicker ================================================== */
window.initTicker = function initTicker(scope) {
    /* 1 / processus asynchrones */
    loadCrypto(scope);
    fetchWeather(scope);

    /* 2 / date et compteurs */
    const now = new Date();
    const y0 = new Date(now.getFullYear(), 0, 0);
    const diff = now - y0 + (y0.getTimezoneOffset() - now.getTimezoneOffset()) * 6e4;
    scope.day = Math.floor(diff / 86_400_000) + 1;                     // jour 1-365
    scope.left = Math.ceil((new Date('2026-01-01') - now) / 86_400_000);

    scope.date = now.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    /* 3 / lune */
    moonPhase(scope);

    D('✔️ Ticker refresh', scope);
};