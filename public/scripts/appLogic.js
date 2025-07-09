// ====================================================================
// 🏗️ APPLICATION PRINCIPALE - GESTION DE L'ÉTAT ET LOGIQUE MÉTIER
// Ce fichier contient la logique AlpineJS partagée par toutes les pages.
// ====================================================================

// On exporte la fonction pour pouvoir l'importer dans nos pages Astro
export function infodropApp() {
    // === CONSTANTES DES ORIENTATIONS POLITIQUES ===
    const ORIENTATION_DATA = {
        'extrême-gauche': { class: 'bg-[#FF0000] text-white' },
        'gauche': { class: 'bg-[#D42A2A] text-white' },
        'centre-gauche': { class: 'bg-[#AA5555] text-white' },
        'centre': { class: 'bg-[#808080] text-white' },
        'centre-droit': { class: 'bg-[#5555AA] text-white' },
        'droite': { class: 'bg-[#2A2AD4] text-white' },
        'extrême-droite': { class: 'bg-[#0000FF] text-white' },
        'gouvernement': { class: 'bg-blue-800 text-blue-100' },
        'neutre': { class: 'bg-green-700 text-green-100' }
    };

    return {
        // --- État de l'interface et de l'utilisateur ---
        copied: false,
        sessionLoaded: false,
        user: null, // Deviendra un objet si l'utilisateur est connecté
        email: '',
        loading: false,
        message: '',
        messageType: '',
        inviteCode: '',

        // --- Données des actualités et filtres ---
        newsList: [],
        loadingNews: true,

        // --- Données d'invitation ---
        userInviteData: { code: null, parrainEmail: null, filleulEmail: null },

        // --- Panneaux et Modales ---
        showAdminPanel: false,

        // ============================================================
        // 🚀 INITIALISATION DE L'APPLICATION
        // ============================================================
        init() {
            // Sur la page "À propos", nous n'avons pas besoin de charger les news,
            // mais on doit quand même vérifier si l'utilisateur est connecté pour afficher la carte de parrainage.
            console.log('🚀 Initialisation Alpine.js...');

            // On vérifie si la fonction `initializeSupabase` a bien été chargée depuis main.js
            if (typeof initializeSupabase !== 'function') {
                console.error("Erreur critique : main.js n'est pas chargé avant appLogic.js");
                return;
            }

            // On lance l'initialisation de Supabase
            initializeSupabase().then(isReady => {
                if (!isReady && !USE_MOCK_DATA) { // Si l'init a échoué ET qu'on n'est pas en mode simulation
                    this.sessionLoaded = true;
                    return;
                }

                // Gère les changements d'état de connexion (login, logout)
                supabase.auth.onAuthStateChange((event, session) => {
                    this.user = session?.user || null;
                    this.sessionLoaded = true;
                    if (event === 'SIGNED_IN') {
                        this.loadUserInviteData();
                    }
                    if (event === 'SIGNED_OUT') {
                        // Réinitialiser les données liées à l'utilisateur
                        this.userInviteData = { code: null, parrainEmail: null, filleulEmail: null };
                    }
                });
            });
        },

        // ============================================================
        // 🔐 AUTHENTIFICATION ET INVITATIONS
        // ============================================================
        async loadUserInviteData() {
            if (!this.user || !this.user.email) return;

            // En mode simulation, on peut mettre des fausses données pour tester l'affichage
            if (window.USE_MOCK_DATA) {
                console.log('Affichage de la carte de parrainage avec des données simulées.');
                this.userInviteData = {
                    code: 'MOCK-CODE-123',
                    parrainEmail: 'parrain-simule@email.com',
                    filleulEmail: null
                };
                return;
            }

            // ... (ici viendra la logique réelle d'appel à Supabase)
        },


        // ============================================================
        // 🔧 UTILITAIRES
        // ============================================================
        copyInviteMessage(code) {
            const message = `Vous avez été invité à rejoindre le club privé INFODROP !\nAccédez à l'actu essentielle sur : https://infodrop.live\nUtilisez ce code lors de votre inscription : ${code}`;
            navigator.clipboard.writeText(message);
            this.copied = true;
            setTimeout(() => this.copied = false, 2000);
        }
    };
}