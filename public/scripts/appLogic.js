// ====================================================================
// 🏗️ APPLICATION PRINCIPALE - LOGIQUE COMPLÈTE AVEC FLUX D'ACTUALITÉS
// Porte toute la fonctionnalité de l'index.html original vers Astro
// ====================================================================

// Constantes pour les orientations politiques
const ORIENTATION_DATA = {
    'extrême-gauche': { class: 'bg-[#FF0000] text-white', color: '#FF0000' },
    'gauche': { class: 'bg-[#D42A2A] text-white', color: '#D42A2A' },
    'centre-gauche': { class: 'bg-[#AA5555] text-white', color: '#AA5555' },
    'centre': { class: 'bg-[#808080] text-white', color: '#808080' },
    'centre-droit': { class: 'bg-[#5555AA] text-white', color: '#5555AA' },
    'droite': { class: 'bg-[#2A2AD4] text-white', color: '#2A2AD4' },
    'extrême-droite': { class: 'bg-[#0000FF] text-white', color: '#0000FF' },
    'gouvernement': { class: 'bg-blue-800 text-blue-100', color: '#1e40af' },
    'neutre': { class: 'bg-green-700 text-green-100', color: '#16a34a' }
};

// Variables globales (seront initialisées par initializeSupabase)
let supabase = null;
let ADMIN_EMAILS = [];
let STRIPE_LINK = '';

// Cette fonction sera importée et utilisée dans les pages Astro
function infodropApp() {
    return {
        // ============================================================
        // 📊 ÉTAT DE L'APPLICATION
        // ============================================================

        // === INTERFACE UTILISATEUR ===
        copied: false,
        sessionLoaded: false,
        user: null,
        email: '',
        loading: false,
        message: '',
        messageType: '',
        inviteCode: '',

        // === ADMINISTRATION ===
        isAdmin: false,
        showAdminPanel: false,
        addingNews: false,
        newNews: {
            resume: '',
            source: '',
            url: '',
            orientation: '',
            tagsText: ''
        },
        lastGeneratedCode: null,

        // === SYSTÈME D'INVITATIONS ===
        userInviteData: {
            code: null,
            is_used: false,
            parrainEmail: null,
            filleulEmail: null
        },

        // === DONNÉES DES ACTUALITÉS ===
        newsList: [],
        filteredNews: [],
        loadingNews: true,
        updateInterval: null,
        latestNewsTimestamp: null,

        // === SYSTÈME DE FILTRES ===
        showFilters: false,
        activeFilter: 'all',
        allTags: [],
        allOrientations: [],
        allOtherTags: [],
        activeOrientations: [],
        activeTags: [],

        // === STATS ET TEMPS RÉEL ===
        stats: {
            total_articles: 0,
            total_sources: 0
        },
        connectedUsers: 0,
        socialBoost: 11,
        realtimeChannel: null,

        // === SYSTÈME DE LECTURES ET DIVERSITÉ ===
        readArticles: {},
        totalReadCount: 0,
        diversityScore: null,
        readOrientations: [],
        showDiversityChecker: true,
        diversityData: {},

        // === ÉDITION D'ARTICLES (ADMIN) ===
        showEditPanel: false,
        editingNews: {
            id: null,
            resume: '',
            source: '',
            url: '',
            orientation: '',
            tags: [],
            tagsText: ''
        },

        // ============================================================
        // 🚀 INITIALISATION
        // ============================================================
        async init() {
            console.log('🚀 Initialisation complète de l\'application...');

            // Vérifier que initializeSupabase est disponible
            if (typeof window.initializeSupabase !== 'function') {
                console.error('❌ main.js non chargé !');
                this.sessionLoaded = true;
                return;
            }

            // Initialiser Supabase
            const supabaseReady = await window.initializeSupabase();
            if (!supabaseReady) {
                console.error('❌ Impossible d\'initialiser Supabase');
                this.sessionLoaded = true;
                return;
            }

            // Récupérer les variables globales
            supabase = window.supabase;
            ADMIN_EMAILS = window.ADMIN_EMAILS || [];
            STRIPE_LINK = window.STRIPE_LINK || '';

            // Charger les données de diversité depuis localStorage
            this.diversityData = JSON.parse(localStorage.getItem('infodrop_diversity') || '{}');

            // Gestion des événements d'authentification
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('🔄 Auth state change:', event);

                this.user = session?.user || null;
                this.sessionLoaded = true;

                if (event === 'SIGNED_IN') {
                    console.log('✅ Utilisateur connecté:', this.user.email);
                    this.isAdmin = ADMIN_EMAILS.includes(this.user.email);

                    // Charger les données utilisateur
                    await this.loadUserInviteData();

                    // Charger les données de lecture
                    const userReadData = localStorage.getItem('infodrop_read_' + this.user.id) || '{}';
                    this.readArticles = JSON.parse(userReadData);
                    this.updateTotalReadCount();
                    this.calculateDiversityScore();

                    // Démarrer le chargement des données
                    await this.loadData(true);
                    this.startAutoUpdate();
                    this.setupRealtime(session);

                    // Vérifier les célébrations en attente
                    this.checkPendingCelebrations();
                }

                if (event === 'SIGNED_OUT') {
                    console.log('🚪 Utilisateur déconnecté');
                    this.stopAutoUpdate();
                    if (this.realtimeChannel) {
                        supabase.removeChannel(this.realtimeChannel);
                        this.realtimeChannel = null;
                    }
                    this.userInviteData = {
                        code: null,
                        is_used: false,
                        parrainEmail: null,
                        filleulEmail: null
                    };
                }
            });

            // Nettoyage des anciennes données de diversité
            this.cleanOldDiversityData();

            // Gestion des célébrations au retour sur la page
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.checkPendingCelebrations();
                }
            });
        },

        // ============================================================
        // 🔐 AUTHENTIFICATION ET INVITATIONS
        // ============================================================

        async login() {
            if (this.loading) return;

            this.loading = true;
            this.message = '';
            this.messageType = '';

            try {
                console.log('🔄 Tentative de connexion pour:', this.email);

                // Vérifier si l'email existe déjà
                const checkRes = await fetch('/api/check-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: this.email.toLowerCase() })
                });

                if (!checkRes.ok) {
                    const err = await checkRes.json();
                    throw new Error(err.error || 'Erreur de communication.');
                }

                const { exists } = await checkRes.json();
                console.log('📧 Email existe:', exists);

                // Si l'utilisateur n'existe pas, code d'invitation requis
                if (!exists) {
                    if (!this.inviteCode) {
                        this.message = "Code d'invitation requis pour les nouveaux utilisateurs.";
                        this.messageType = 'error';
                        return;
                    }

                    // Valider le code d'invitation
                    const validateRes = await fetch('/api/validate-invite', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            code: this.inviteCode,
                            email: this.email.toLowerCase()
                        })
                    });

                    const validationResult = await validateRes.json();
                    if (!validationResult.success) {
                        this.message = validationResult.error;
                        this.messageType = 'error';
                        return;
                    }

                    console.log('✅ Code d\'invitation validé');
                }

                // Envoyer le magic link
                const { error: otpError } = await supabase.auth.signInWithOtp({
                    email: this.email.toLowerCase(),
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                });

                if (otpError) throw otpError;

                this.message = 'Vérifiez vos emails ! Un lien de connexion a été envoyé.';
                this.messageType = 'success';

            } catch (error) {
                console.error('❌ Erreur login:', error);
                this.message = error.message || 'Une erreur est survenue.';
                this.messageType = 'error';
            } finally {
                this.loading = false;
            }
        },

        async logout() {
            console.log('🚪 Déconnexion...');
            if (this.realtimeChannel) await this.realtimeChannel.untrack();
            await supabase.auth.signOut();
        },

        // === SYSTÈME DE PARRAINAGE ===
        async loadUserInviteData() {
            if (!this.user || !this.user.email) {
                console.log('❌ Pas d\'utilisateur pour charger les données d\'invitation');
                return;
            }

            console.log('🔄 Chargement des données d\'invitation pour:', this.user.email);

            try {
                if (this.isAdmin) {
                    console.log('👑 Utilisateur admin détecté');

                    const { data: adminCode, error: adminError } = await supabase
                        .from('invitation_codes')
                        .select('*')
                        .ilike('owner_email', this.user.email.toLowerCase())
                        .maybeSingle();

                    if (adminError && adminError.code !== 'PGRST116') {
                        console.error('❌ Erreur requête admin:', adminError);
                        return;
                    }

                    if (adminCode) {
                        this.userInviteData.code = adminCode.code;
                        this.userInviteData.is_used = adminCode.is_used || false;
                        if (adminCode.is_used && adminCode.used_by_email) {
                            this.userInviteData.filleulEmail = adminCode.used_by_email;
                        }
                    }

                    this.userInviteData.parrainEmail = null;
                    return;
                }

                // Pour utilisateurs normaux - récupérer son propre code
                const { data: ownCode, error: ownCodeError } = await supabase
                    .from('invitation_codes')
                    .select('*')
                    .ilike('owner_email', this.user.email.toLowerCase())
                    .maybeSingle();

                if (ownCodeError && ownCodeError.code !== 'PGRST116') {
                    console.error('❌ Erreur récupération code proprio:', ownCodeError);
                } else if (ownCode) {
                    this.userInviteData.code = ownCode.code;
                    this.userInviteData.is_used = ownCode.is_used || false;
                    if (ownCode.is_used && ownCode.used_by_email) {
                        this.userInviteData.filleulEmail = ownCode.used_by_email;
                    }
                }

                // Récupérer son parrain
                const { data: usedCode, error: usedCodeError } = await supabase
                    .from('invitation_codes')
                    .select('owner_email')
                    .ilike('used_by_email', this.user.email.toLowerCase())
                    .maybeSingle();

                if (usedCodeError && usedCodeError.code !== 'PGRST116') {
                    console.error('❌ Erreur récupération parrain:', usedCodeError);
                } else if (usedCode) {
                    this.userInviteData.parrainEmail = usedCode.owner_email;
                }

                console.log('✅ Données d\'invitation chargées:', this.userInviteData);

            } catch (error) {
                console.error('❌ Erreur générale loadUserInviteData:', error);
                this.userInviteData = {
                    code: null,
                    is_used: false,
                    parrainEmail: null,
                    filleulEmail: null
                };
            }
        },

        async generateInviteCode() {
            if (!this.isAdmin) return;

            try {
                console.log('🎁 Génération code d\'invitation...');

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    throw new Error("Session introuvable");
                }

                const response = await fetch('/api/generate-invite', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Erreur lors de la génération');
                }

                this.lastGeneratedCode = result.code;
                this.copyInviteMessage(result.code);
                console.log('✅ Code généré et copié:', result.code);

            } catch (error) {
                console.error('❌ Erreur génération code:', error);
                alert('Erreur lors de la génération du code: ' + error.message);
            }
        },

        // ============================================================
        // 📰 GESTION DES ACTUALITÉS
        // ============================================================

        async loadData(isInitial = false) {
            if (isInitial) this.loadingNews = true;
            await this.loadStats();
            await this.loadNews(this.activeFilter, true);
            if (isInitial) this.loadingNews = false;
        },

        async loadNews(filter = null, isNewFilter = false) {
            if (isNewFilter) {
                this.loadingNews = true;
                this.newsList = [];
            }

            try {
                let query = supabase
                    .from('actu')
                    .select('id, resume, url, heure, source, orientation, tags, added_by')
                    .order('heure', { ascending: false });

                if (filter && filter !== 'all') {
                    query = query.or(`orientation.eq.${filter},tags.cs.{${filter}}`);
                }

                if (!isNewFilter && this.latestNewsTimestamp) {
                    query = query.gt('heure', this.latestNewsTimestamp);
                } else {
                    query = query.limit(100);
                }

                const { data: newArticles, error } = await query;
                if (error) throw error;

                if (newArticles && newArticles.length > 0) {
                    if (isNewFilter || !this.latestNewsTimestamp) {
                        this.newsList = newArticles;
                    } else {
                        this.newsList = [...newArticles, ...this.newsList];
                    }
                    this.latestNewsTimestamp = this.newsList[0].heure;
                }

                this.updateTagsList();

            } catch (e) {
                console.error('Erreur dans loadNews:', e);
            } finally {
                if (isNewFilter) {
                    this.loadingNews = false;
                }
            }
        },

        async loadStats() {
            try {
                const response = await fetch('/api/stats', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    throw new Error(`Erreur API stats: ${response.status}`);
                }

                const data = await response.json();

                this.stats = {
                    total_articles: data.total_articles,
                    total_sources: data.total_sources
                };

                this.activeOrientations = data.active_orientations || [];
                this.activeTags = data.active_tags || [];

                console.log('✅ Stats chargées:', this.stats);

            } catch (e) {
                console.error('❌ Erreur stats:', e);
            }
        },

        // === GESTION DES FILTRES ===
        toggleFilter(filter) {
            if (this.activeFilter === filter) {
                this.activeFilter = 'all';
            } else {
                this.activeFilter = filter;
            }
            this.loadNews(this.activeFilter, true);
        },

        updateTagsList() {
            const pol = ['extrême-gauche', 'gauche', 'centre-gauche', 'centre', 'centre-droit', 'droite', 'extrême-droite', 'gouvernement', 'neutre', '🧨INFODROP'];
            this.allOrientations = pol;
            this.allOtherTags = this.activeTags.filter(tag => !pol.includes(tag));
        },

        hasArticlesForOrientation(o) {
            return this.activeOrientations.includes(o);
        },

        hasArticlesForTag(t) {
            return this.activeTags.includes(t);
        },

        getEmptyFilterMessage() {
            if (this.allOrientations.includes(this.activeFilter))
                return `Aucun média d'orientation "${this.activeFilter.replace('-', ' ')}" n'a publié ces dernières 24h.`;
            return `Aucun article avec le tag "${this.activeFilter}" ces dernières 24h.`;
        },

        // ============================================================
        // 👑 ADMINISTRATION
        // ============================================================

        async addManualNews() {
            this.addingNews = true;
            try {
                console.log('🔄 Début ajout article...');

                if (!this.newNews.resume || !this.newNews.resume.trim()) {
                    throw new Error('Le résumé est obligatoire');
                }

                if (!this.newNews.url || !this.newNews.url.trim()) {
                    throw new Error('L\'URL est obligatoire');
                }

                // Préparation des tags
                let tags = ['🧨INFODROP'];

                if (this.newNews.tagsText && this.newNews.tagsText.trim()) {
                    const additionalTags = this.newNews.tagsText
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0)
                        .filter(tag => tag !== '🧨INFODROP');

                    tags = tags.concat(additionalTags);
                }

                // Objet final pour la DB
                const articleData = {
                    resume: this.newNews.resume.trim(),
                    source: '🧨INFODROP',
                    url: this.newNews.url.trim(),
                    heure: new Date().toISOString(),
                    tags: tags,
                    added_by: this.user.email
                };

                if (this.newNews.orientation && this.newNews.orientation.trim()) {
                    articleData.orientation = this.newNews.orientation.trim();
                }

                console.log('📤 Données finales pour Supabase:', articleData);

                const { data, error } = await supabase
                    .from('actu')
                    .insert(articleData)
                    .select('*');

                if (error) {
                    console.error('❌ Erreur Supabase complète:', error);
                    if (error.code === '23505') {
                        throw new Error('Cette URL existe déjà dans la base de données');
                    } else if (error.code === '23502') {
                        throw new Error('Un champ obligatoire est manquant');
                    } else {
                        throw new Error(`Erreur DB: ${error.message}`);
                    }
                }

                console.log('✅ Article créé avec succès:', data);

                // Nettoyage du formulaire
                this.newNews = {
                    resume: '',
                    source: '',
                    url: '',
                    orientation: '',
                    tagsText: ''
                };

                this.showAdminPanel = false;
                await this.loadData();

                console.log('✅ Processus terminé avec succès');
                alert('✅ Article ajouté avec succès !');

            } catch (error) {
                console.error('❌ Erreur dans addManualNews:', error);
                alert('Erreur lors de l\'ajout de l\'article: ' + error.message);
            } finally {
                this.addingNews = false;
            }
        },

        openEditPanel(news) {
            this.editingNews = {
                ...JSON.parse(JSON.stringify(news)),
                tagsText: (news.tags || []).join(', ')
            };
            this.showEditPanel = true;
        },

        async updateNews() {
            const { id, resume, source, url, orientation, tagsText } = this.editingNews;
            const tags = tagsText ? tagsText.split(',').map(t => t.trim()).filter(Boolean) : [];
            try {
                await supabase.from('actu').update({ resume, source, url, orientation, tags }).eq('id', id);
                const index = this.newsList.findIndex(n => n.id === id);
                if (index !== -1) {
                    this.newsList[index] = { ...this.newsList[index], resume, source, url, orientation, tags };
                }
                this.showEditPanel = false;
                this.updateTagsList();
            } catch (e) {
                alert("La mise à jour a échoué.");
            }
        },

        async deleteNews(id) {
            if (!confirm("Supprimer ?")) return;
            this.newsList = this.newsList.filter(n => n.id !== id);
            try {
                await supabase.from('actu').delete().eq('id', id);
                if (this.isAdmin) this.loadStats();
            } catch (e) {
                alert("La suppression a échoué.");
                this.loadNews();
            }
        },

        // ============================================================
        // 📚 SYSTÈME DE LECTURES ET DIVERSITÉ
        // ============================================================

        markAsRead(id) {
            if (!this.readArticles[id]) {
                this.readArticles[id] = new Date().toISOString();
                localStorage.setItem('infodrop_read_' + this.user.id, JSON.stringify(this.readArticles));
                this.updateTotalReadCount();
                const article = this.newsList.find(n => n.id === id);
                if (article) this.addToDiversityData(article);
                if (this.totalReadCount % 20 === 0 && this.totalReadCount > 0) {
                    this.celebrateArticles(this.totalReadCount);
                }
            }
        },

        updateTotalReadCount() {
            this.totalReadCount = Object.keys(this.readArticles).length;
        },

        cleanOldDiversityData() {
            const expiry = Date.now() - 24 * 60 * 60 * 1000;
            Object.keys(this.diversityData).forEach(t => {
                if (new Date(t).getTime() < expiry) delete this.diversityData[t];
            });
            localStorage.setItem('infodrop_diversity', JSON.stringify(this.diversityData));
        },

        addToDiversityData(article) {
            let o = article.orientation || 'neutre';
            if (article.tags?.includes('🧨INFODROP')) o = '🧨INFODROP';
            this.diversityData[new Date().toISOString()] = {
                orientation: o,
                source: article.source
            };
            localStorage.setItem('infodrop_diversity', JSON.stringify(this.diversityData));
            this.calculateDiversityScore();
        },

        calculateDiversityScore() {
            this.cleanOldDiversityData();
            const reads = Object.values(this.diversityData);
            if (reads.length === 0) {
                this.diversityScore = null;
                this.readOrientations = [];
                return;
            }
            const oSet = new Set(reads.map(r => r.orientation).filter(Boolean));
            const sSet = new Set(reads.map(r => r.source));
            const spec = ['extrême-gauche', 'gauche', 'centre-gauche', 'centre', 'centre-droit', 'droite', 'extrême-droite', 'neutre', '🧨INFODROP'];
            this.readOrientations = [...oSet].filter(o => o !== 'gouvernement').sort((a, b) => spec.indexOf(a) - spec.indexOf(b));
            this.diversityScore = Math.round(((this.readOrientations.length / 9) * 50) + (Math.min((sSet.size / 5) * 50, 50)));
            this.showDiversityChecker = this.diversityScore < 100;
        },

        getDiversityMessage() {
            if (this.diversityScore < 30) return "🔴 Bulle de filtre ! Explorez d'autres horizons";
            if (this.diversityScore < 50) return "🟡 Bon début ! Continuez à diversifier";
            if (this.diversityScore < 70) return "🟠 Bien ! Quelques perspectives en plus ?";
            if (this.diversityScore < 85) return "🟢 Très bien ! Vous êtes sur la bonne voie";
            return "🏆 Champion de la diversité !";
        },

        getDiversityTip() {
            const missing = ['extrême-gauche', 'gauche', 'centre-gauche', 'centre', 'centre-droit', 'droite', 'extrême-droite', 'neutre', '🧨INFODROP']
                .filter(orientation => !this.readOrientations.includes(orientation));

            if (missing.length === 0) return "🎉 Toutes les orientations explorées !";
            if (missing.length > 6) return "💡 Essayez de lire des perspectives variées";

            const suggestion = missing[Math.floor(Math.random() * missing.length)];
            return `💡 Essayez de lire du "${suggestion.replace('-', ' ')}"`;
        },

        // === CÉLÉBRATIONS ===
        celebrateArticles(count) {
            if (document.hidden) {
                localStorage.setItem(`infodrop_celebration_pending_${count}`, 'true');
                return;
            }
            this.showCelebration(count);
        },

        showCelebration(count = 100) {
            const cont = document.createElement('div');
            cont.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:auto;z-index:9999;background:rgba(0,0,0,0.8);cursor:pointer;';

            this.startConfettiLoop(cont);

            const msg = document.createElement('div');
            msg.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-6 rounded-2xl shadow-2xl z-50 text-center animate-bounce';
            const isSpecial = count === 100 || count % 100 === 0;
            const emoji = isSpecial ? '🏆' : '🎉';
            const title = isSpecial ? 'Incroyable !' : 'Bravo !';

            msg.innerHTML = `
                <h2 class="text-3xl font-bold mb-2">${emoji} ${title} ${emoji}</h2>
                <p class="text-lg mb-2">${count} articles lus !</p>
                <p class="text-sm opacity-80">Cliquez pour continuer</p>
            `;

            cont.appendChild(msg);
            document.body.appendChild(cont);

            const closeAnimation = () => {
                cont.remove();
                this.stopConfettiLoop();
                localStorage.removeItem(`infodrop_celebration_pending_${count}`);
            };

            cont.addEventListener('click', closeAnimation);
            msg.addEventListener('click', closeAnimation);
        },

        checkPendingCelebrations() {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('infodrop_celebration_pending_')) {
                    const count = parseInt(key.split('_')[3]);
                    setTimeout(() => this.showCelebration(count), 1000);
                    break;
                }
            }
        },

        startConfettiLoop(container) {
            this.confettiInterval = setInterval(() => {
                this.createConfettiBatch(container);
            }, 1000);
        },

        stopConfettiLoop() {
            if (this.confettiInterval) {
                clearInterval(this.confettiInterval);
                this.confettiInterval = null;
            }
        },

        createConfettiBatch(container) {
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F9CA24', '#6C5CE7'];
            for (let i = 0; i < 10; i++) {
                const conf = document.createElement('div');
                conf.style.cssText = `position:absolute;width:10px;height:10px;background:${colors[i % 5]};left:${Math.random() * 100}%;top:-10px;opacity:${Math.random() + .5};transform:rotate(${Math.random() * 360}deg);animation:confetti-fall ${3 + Math.random() * 2}s linear forwards;pointer-events:none;`;
                container.appendChild(conf);

                setTimeout(() => conf.remove(), 5000);
            }
        },

        // ============================================================
        // ⏱️ TEMPS RÉEL ET AUTO-UPDATE
        // ============================================================

        setupRealtime(session) {
            this.realtimeChannel = supabase.channel('infodrop-online-users', {
                config: { presence: { key: session.user.id } }
            });
            this.realtimeChannel.on('presence', { event: 'sync' }, () => {
                this.connectedUsers = Object.keys(this.realtimeChannel.presenceState()).length;
            }).subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await this.realtimeChannel.track({ online_at: new Date().toISOString() });
                }
            });
        },

        startAutoUpdate() {
            if (this.updateInterval) clearInterval(this.updateInterval);
            this.updateInterval = setInterval(() => {
                this.loadNews(this.activeFilter, false);
            }, 30000);
        },

        stopAutoUpdate() {
            if (this.updateInterval) clearInterval(this.updateInterval);
        },

        // ============================================================
        // 🔧 UTILITAIRES ET HELPERS
        // ============================================================

        copyInviteMessage(code) {
            const message = `Vous avez été invité à rejoindre le club privé INFODROP !
Accédez à l'actu essentielle sur : https://infodrop.live
Utilisez ce code lors de votre inscription : ${code}`;

            navigator.clipboard.writeText(message);
            this.copied = true;
            setTimeout(() => this.copied = false, 1500);
            console.log('📋 Message d\'invitation copié');
        },

        formatTime(t) {
            return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        },

        // === HELPERS POUR LES ORIENTATIONS ===
        getOrientationDisplayName(orientation) {
            if (!orientation) return '';
            if (orientation === 'gouvernement') return '🇫🇷 Gouvernement';
            if (orientation === '🧨INFODROP') return orientation;

            return orientation
                .replace('-', ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        },

        getOrientationColor(o) {
            return ORIENTATION_DATA[o]?.color || '#808080';
        },

        getOrientationClass(o) {
            return ORIENTATION_DATA[o]?.class || 'bg-gray-700 text-gray-200';
        }
    };
}

// Export pour utilisation dans les pages Astro
window.infodropApp = infodropApp;