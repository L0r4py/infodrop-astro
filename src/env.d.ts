/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// Déclaration des variables d'environnement
interface ImportMetaEnv {
    readonly SUPABASE_URL: string;
    readonly SUPABASE_ANON_KEY: string;
    readonly SUPABASE_SERVICE_KEY: string;
    readonly ADMIN_EMAILS: string;
    readonly STRIPE_LINK: string;
    readonly CRON_SECRET: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Déclaration des types globaux pour Alpine.js
declare global {
    interface Window {
        Alpine: any;
        supabase: any;
        ADMIN_EMAILS: string[];
        STRIPE_LINK: string;
        initializeSupabase: () => Promise<boolean>;
        initTicker: (scope: any) => void;
        infodropApp: () => any;
    }
}

// Types pour Supabase
export interface Database {
    public: {
        Tables: {
            actu: {
                Row: {
                    id: number;
                    resume: string;
                    url: string;
                    heure: string;
                    source: string;
                    orientation?: string;
                    tags?: string[];
                    added_by?: string;
                    created_at?: string;
                };
                Insert: {
                    resume: string;
                    url: string;
                    heure: string;
                    source: string;
                    orientation?: string;
                    tags?: string[];
                    added_by?: string;
                };
                Update: {
                    resume?: string;
                    url?: string;
                    heure?: string;
                    source?: string;
                    orientation?: string;
                    tags?: string[];
                    added_by?: string;
                };
            };
            invitation_codes: {
                Row: {
                    id: number;
                    code: string;
                    owner_email?: string;
                    used_by_email?: string;
                    is_used: boolean;
                    created_at: string;
                    used_at?: string;
                };
                Insert: {
                    code: string;
                    owner_email?: string;
                    used_by_email?: string;
                    is_used?: boolean;
                    created_at?: string;
                    used_at?: string;
                };
                Update: {
                    code?: string;
                    owner_email?: string;
                    used_by_email?: string;
                    is_used?: boolean;
                    created_at?: string;
                    used_at?: string;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            get_global_stats_and_filters: {
                Args: Record<PropertyKey, never>;
                Returns: {
                    total_articles: number;
                    total_sources: number;
                    active_orientations: string[];
                    active_tags: string[];
                };
            };
        };
        Enums: {
            [_ in never]: never;
        };
    };
}

// Types pour l'application
export type NewsItem = Database['public']['Tables']['actu']['Row'];
export type InviteCode = Database['public']['Tables']['invitation_codes']['Row'];

export type OrientationPolitique =
    | 'extrême-gauche'
    | 'gauche'
    | 'centre-gauche'
    | 'centre'
    | 'centre-droit'
    | 'droite'
    | 'extrême-droite'
    | 'gouvernement'
    | 'neutre'
    | '🧨INFODROP';

export interface UserInviteData {
    code: string | null;
    is_used: boolean;
    parrainEmail: string | null;
    filleulEmail: string | null;
}

export interface AppStats {
    total_articles: number;
    total_sources: number;
}

export interface DiversityData {
    [timestamp: string]: {
        orientation: string;
        source: string;
    };
}

// Types pour les événements Alpine.js
export interface AlpineEvent extends Event {
    detail?: any;
}

export { };