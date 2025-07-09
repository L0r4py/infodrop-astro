# 📰 INFODROP v4.0.0-beta

**Le Club privé de l'actu centralisée** - Version Astro

Agrégation d'actualités en temps réel, multi-sources francophones, avec système d'authentification et de parrainage.

## 🚀 Fonctionnalités

- ✅ **Authentification sécurisée** avec Magic Link (Supabase Auth)
- ✅ **Système de parrainage** avec codes d'invitation
- ✅ **Flux d'actualités 24H** avec mise à jour automatique toutes les 30s
- ✅ **Filtres par orientation politique** et catégories
- ✅ **Score de diversité** des lectures
- ✅ **Interface admin** pour ajouter/modifier/supprimer des articles
- ✅ **Temps réel** avec compteur d'utilisateurs connectés
- ✅ **Progressive Web App** (PWA) compatible mobile
- ✅ **Bandeau contextuel** avec météo, crypto, phase lunaire...

## 🛠️ Stack Technique

- **Frontend**: [Astro](https://astro.build/) + [Alpine.js](https://alpinejs.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: API Routes Astro + [Supabase](https://supabase.com/)
- **Base de données**: PostgreSQL (Supabase)
- **Authentification**: Supabase Auth (Magic Link)
- **Déploiement**: [Vercel](https://vercel.com/)
- **Language**: TypeScript + JavaScript

## 📦 Installation

### Prérequis

- Node.js 20+ 
- npm ou yarn
- Compte Supabase
- Compte Vercel (pour le déploiement)

### 1. Cloner le projet

```bash
git clone https://github.com/votre-org/infodrop-astro.git
cd infodrop-astro
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration des variables d'environnement

Créer un fichier `.env` à la racine :

```env
# === SUPABASE ===
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_clé_publique_supabase
SUPABASE_SERVICE_KEY=votre_clé_service_supabase

# === ADMINISTRATION ===
ADMIN_EMAILS=admin@example.com,admin2@example.com

# === PAIEMENTS ===
STRIPE_LINK=https://buy.stripe.com/votre_lien_stripe

# === CRON (pour scripts automatisés) ===
CRON_SECRET=votre_secret_cron_unique
```

### 4. Configuration Supabase

#### 4.1 Créer les tables

```sql
-- Table des actualités
CREATE TABLE actu (
  id BIGSERIAL PRIMARY KEY,
  resume TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  heure TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL,
  orientation TEXT,
  tags TEXT[],
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des codes d'invitation
CREATE TABLE invitation_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  owner_email TEXT,
  used_by_email TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Index pour les performances
CREATE INDEX idx_actu_heure ON actu(heure DESC);
CREATE INDEX idx_actu_orientation ON actu(orientation);
CREATE INDEX idx_actu_tags ON actu USING GIN(tags);
CREATE INDEX idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX idx_invitation_codes_owner ON invitation_codes(owner_email);
```

#### 4.2 Configurer les politiques RLS (Row Level Security)

```sql
-- Activer RLS
ALTER TABLE actu ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour actu (tous les utilisateurs authentifiés)
CREATE POLICY "Lecture autorisée pour utilisateurs authentifiés" ON actu
  FOR SELECT USING (auth.role() = 'authenticated');

-- Politique d'insertion pour actu (admins seulement)
CREATE POLICY "Insertion autorisée pour admins" ON actu
  FOR INSERT WITH CHECK (
    auth.email() = ANY(ARRAY['admin@example.com', 'admin2@example.com'])
  );

-- Politique de mise à jour pour actu (admins seulement)
CREATE POLICY "Mise à jour autorisée pour admins" ON actu
  FOR UPDATE USING (
    auth.email() = ANY(ARRAY['admin@example.com', 'admin2@example.com'])
  );

-- Politique de suppression pour actu (admins seulement)
CREATE POLICY "Suppression autorisée pour admins" ON actu
  FOR DELETE USING (
    auth.email() = ANY(ARRAY['admin@example.com', 'admin2@example.com'])
  );

-- Politiques pour invitation_codes
CREATE POLICY "Lecture codes invitation" ON invitation_codes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Insertion codes invitation" ON invitation_codes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Mise à jour codes invitation" ON invitation_codes
  FOR UPDATE USING (auth.role() = 'authenticated');
```

#### 4.3 Configurer l'authentification

1. Dans le dashboard Supabase, aller dans **Authentication** > **Settings**
2. Configurer l'URL du site : `https://votre-domaine.com`
3. Activer les Magic Links
4. Personnaliser les templates d'email si nécessaire

### 5. Développement local

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:4321`

## 🚢 Déploiement

### Déploiement sur Vercel

1. **Connecter le repository GitHub à Vercel**

2. **Configurer les variables d'environnement** dans le dashboard Vercel :
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY` 
   - `SUPABASE_SERVICE_KEY`
   - `ADMIN_EMAILS`
   - `STRIPE_LINK`
   - `CRON_SECRET`

3. **Déployer automatiquement** via GitHub push

### Configuration des domaines personnalisés

1. Dans Vercel, aller dans **Settings** > **Domains**
2. Ajouter votre domaine personnalisé
3. Configurer les DNS selon les instructions Vercel
4. Mettre à jour l'URL dans Supabase Auth

## 🔧 Utilisation

### Premier utilisateur admin

1. Déployer l'application
2. S'assurer que votre email est dans `ADMIN_EMAILS`
3. Aller sur votre site et se connecter avec cet email
4. Générer des codes d'invitation pour les autres utilisateurs

### Gestion des utilisateurs

- **Admins** : Peuvent ajouter/modifier/supprimer des articles et générer des codes d'invitation
- **Utilisateurs** : Peuvent lire les articles et recevoir un code de parrainage
- **Nouveaux utilisateurs** : Doivent avoir un code d'invitation valide

### Système de parrainage

1. Les utilisateurs existants reçoivent automatiquement un code à partager
2. Quand quelqu'un utilise ce code, il devient leur "filleul"
3. Les relations parrain/filleul sont affichées dans l'interface

## 📱 Fonctionnalités avancées

### Score de diversité

Le système analyse les lectures de l'utilisateur sur 24h et calcule un score basé sur :
- La variété des orientations politiques lues (50% du score)
- La diversité des sources consultées (50% du score)

### Filtres intelligents

- **Orientations politiques** : De l'extrême-gauche à l'extrême-droite
- **Catégories** : Tags automatiques et manuels
- **État actif** : Seules les orientations/catégories avec du contenu sont cliquables

### Temps réel

- Mise à jour automatique des articles toutes les 30 secondes
- Compteur d'utilisateurs connectés en temps réel
- Notifications de nouveaux articles

## 🎯 Scripts de maintenance

### Purge automatique (24h)

Les articles de plus de 24h sont automatiquement supprimés via un script cron.

### Parseur RSS (toutes les 10 minutes)

Un script récupère automatiquement les nouveaux articles depuis ~60 sources configurées.

## 🐛 Debugging

### Logs utiles

Les logs importants sont préfixés par des emojis :
- `🚀` : Initialisation
- `✅` : Succès
- `❌` : Erreurs
- `🔄` : Opérations en cours
- `📧` : Authentification
- `📰` : Articles
- `🎁` : Codes d'invitation

### Problèmes courants

1. **Erreur "Configuration Supabase incomplète"**
   - Vérifier les variables d'environnement
   - S'assurer que les clés Supabase sont correctes

2. **"Code d'invitation invalide"**
   - Vérifier que le code existe dans la table `invitation_codes`
   - S'assurer qu'il n'est pas déjà utilisé (`is_used = false`)

3. **Problèmes d'authentification**
   - Vérifier l'URL configurée dans Supabase Auth
   - Contrôler les politiques RLS

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/ma-feature`)
3. Commit les changements (`git commit -am 'Ajout de ma feature'`)
4. Push vers la branche (`git push origin feature/ma-feature`)
5. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👥 Équipe

- **Émile Marclin** - Développement initial
- **L0r4.py** - Architecture et refactorisation Astro

## 🆘 Support

Pour toute question ou problème :

- 🐛 **Issues GitHub** : [Créer une issue](https://github.com/votre-org/infodrop-astro/issues)
- 🐦 **Twitter** : [@LOR4_14](https://x.com/LOR4_14)
- 📧 **Email** : contact@infodrop.live

---

**INFODROP v4.0.0-beta** - *Le Club privé de l'actu centralisée*