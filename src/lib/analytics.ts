import posthog from 'posthog-js';

/**
 * Couche analytique Frilya (PostHog).
 *
 * Configuration via variables d'environnement Vite :
 *   VITE_POSTHOG_KEY   clé publique du projet (phc_xxx) — sans elle, tout est désactivé
 *   VITE_POSTHOG_HOST  https://eu.i.posthog.com (défaut, UE) ou https://us.i.posthog.com
 *
 * Toutes les fonctions sont sans effet si la clé n'est pas fournie : l'application
 * fonctionne à l'identique sans PostHog configuré.
 */

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://eu.i.posthog.com';

let ready = false;

export const analyticsEnabled = () => Boolean(KEY);

export function initAnalytics() {
  if (ready || !KEY) return;

  posthog.init(KEY, {
    api_host: HOST,
    // On envoie les pages vues nous-mêmes (SPA : le routeur ne recharge pas la page)
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only',
    // Enregistrement de session désactivé par défaut (RGPD) : à activer côté PostHog si besoin
    disable_session_recording: true
  });

  ready = true;
}

const capture = (event: string, properties?: Record<string, any>) => {
  if (!ready) return;
  posthog.capture(event, properties);
};

/** Page vue : appelé à chaque changement d'URL par le routeur */
export function trackPageview(pathname: string, extra?: Record<string, any>) {
  if (!ready) return;
  posthog.capture('$pageview', {
    $current_url: window.location.href,
    pathname,
    page_section: pageSection(pathname),
    ...extra
  });
}

/** Regroupement des URLs en grandes zones fonctionnelles, utile pour l'analyse */
export function pageSection(pathname: string) {
  if (pathname === '/') return 'accueil';
  if (pathname.startsWith('/service')) return 'fiche_service';
  if (pathname.startsWith('/recherche')) return 'recherche';
  if (pathname.startsWith('/profil')) return 'profil_vendeur';
  if (pathname.startsWith('/paiement')) return 'paiement';
  if (pathname.startsWith('/tableau-de-bord/vendeur')) return 'espace_vendeur';
  if (pathname.startsWith('/tableau-de-bord')) return 'espace_acheteur';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/faq')) return 'aide';
  if (pathname.startsWith('/signaler-probleme')) return 'support';
  if (pathname.startsWith('/connexion') || pathname.startsWith('/inscription')) return 'authentification';
  if (pathname.startsWith('/beta')) return 'beta';
  return 'autre';
}

/** Associe les événements à un utilisateur connecté */
export function identifyUser(userId: string, profile?: Record<string, any> | null) {
  if (!ready) return;
  posthog.identify(userId, {
    role: profile?.role,
    is_seller: profile?.is_seller,
    is_beta: profile?.is_beta,
    is_verified: profile?.is_verified,
    signup_date: profile?.created_at
  });
}

export function resetUser() {
  if (!ready) return;
  posthog.reset();
}

// ---------------------------------------------------------------------------
// Événements métier
// ---------------------------------------------------------------------------

export const trackServiceViewed = (service: any) => capture('service_viewed', {
  service_id: service?.id,
  service_title: service?.title,
  service_slug: service?.slug,
  seller_id: service?.seller_id,
  seller_name: service?.profiles?.full_name,
  category_id: service?.category_id,
  sub_category: service?.sub_category,
  price: Number(service?.price_basic) || 0
});

export const trackSearch = (query: string, filters: Record<string, any>, resultsCount: number) =>
  capture('service_search', { query, results_count: resultsCount, has_results: resultsCount > 0, ...filters });

export const trackSellerProfileViewed = (profile: any, servicesCount: number) =>
  capture('seller_profile_viewed', {
    seller_id: profile?.id,
    seller_name: profile?.full_name,
    is_verified: profile?.is_verified,
    services_count: servicesCount
  });

export const trackCheckoutStarted = (service: any, pkg: any, total: number) =>
  capture('checkout_started', {
    service_id: service?.id,
    service_title: service?.title,
    seller_id: service?.seller_id,
    package_type: pkg?.package_type,
    package_name: pkg?.name,
    net_price: Number(pkg?.price ?? service?.price_basic) || 0,
    total_price: total
  });

export const trackOrderCreated = (service: any, amount: number, platformFee: number) =>
  capture('order_created', {
    service_id: service?.id,
    service_title: service?.title,
    seller_id: service?.seller_id,
    amount,
    platform_fee: platformFee
  });

export const trackSignup = (role: string) => capture('signup_completed', { role });
export const trackLogin = () => capture('login');

export const trackServicePublished = (serviceId: string | null, price: number) =>
  capture('service_published', { service_id: serviceId, price });

export const trackMessageSent = (context: 'user' | 'support') => capture('message_sent', { context });

export const trackTicketCreated = (category: string) => capture('support_ticket_created', { category });

export const trackBetaApplication = () => capture('beta_application_submitted');
