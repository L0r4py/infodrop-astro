// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
      // Désactiver l'injection automatique de base styles pour plus de contrôle
      applyBaseStyles: false,
    })
  ],

  // Configuration pour le déploiement
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),

  // Configuration pour les assets
  vite: {
    define: {
      // Variables d'environnement côté client si nécessaire
      __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    }
  },

  // Configuration du serveur de développement
  server: {
    port: 4321,
    host: true
  },

  // Gestion des erreurs 404
  redirects: {
    // Redirection automatique des anciennes routes si nécessaire
  },

  // Configuration de sécurité
  security: {
    checkOrigin: true
  },

  // Optimisations build
  build: {
    inlineStylesheets: 'auto',
    format: 'file'
  }
});