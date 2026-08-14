import { createClient } from '@supabase/supabase-js';

/**
 * Proxy d'interrogation PostHog réservé aux administrateurs.
 *
 * La clé personnelle PostHog (phx_...) donne accès à toutes les données du projet :
 * elle ne doit JAMAIS être exposée au navigateur. Ce endpoint la garde côté serveur,
 * vérifie que l'appelant est bien un administrateur Frilya, et n'exécute que des
 * requêtes HogQL prédéfinies (aucune requête libre venant du client).
 *
 * Variables d'environnement (Vercel) :
 *   POSTHOG_PERSONAL_API_KEY  clé personnelle (phx_...) avec le scope "query:read"
 *   POSTHOG_PROJECT_ID        identifiant numérique du projet PostHog
 *   POSTHOG_HOST              https://eu.posthog.com (défaut) ou https://us.posthog.com
 *   SUPABASE_SERVICE_ROLE_KEY pour vérifier le rôle admin de l'appelant
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bkrfulpstfhpnlrwocdt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const POSTHOG_HOST = (process.env.POSTHOG_HOST || 'https://eu.posthog.com').replace(/\/$/, '');
const POSTHOG_KEY = process.env.POSTHOG_PERSONAL_API_KEY as string;
const POSTHOG_PROJECT = process.env.POSTHOG_PROJECT_ID as string;

/**
 * Requêtes autorisées. `days` est injecté comme entier validé côté serveur.
 * Toutes filtrent sur timestamp >= now() - INTERVAL {days} DAY.
 */
const QUERIES: Record<string, (days: number) => string> = {
  // --- Trafic global, jour par jour
  traffic_daily: (d) => `
    SELECT toDate(timestamp) AS jour,
           count() AS pages_vues,
           uniq(person_id) AS visiteurs,
           uniq(properties.$session_id) AS sessions
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${d} DAY
    GROUP BY jour
    ORDER BY jour ASC`,

  // --- Totaux de la période
  traffic_totals: (d) => `
    SELECT count() AS pages_vues,
           uniq(person_id) AS visiteurs,
           uniq(properties.$session_id) AS sessions
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${d} DAY`,

  // --- Pages les plus consultées
  top_pages: (d) => `
    SELECT properties.pathname AS page,
           count() AS pages_vues,
           uniq(person_id) AS visiteurs
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${d} DAY
      AND properties.pathname IS NOT NULL
    GROUP BY page
    ORDER BY pages_vues DESC
    LIMIT 25`,

  // --- Grandes zones du site
  top_sections: (d) => `
    SELECT properties.page_section AS section,
           count() AS pages_vues,
           uniq(person_id) AS visiteurs
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${d} DAY
      AND properties.page_section IS NOT NULL
    GROUP BY section
    ORDER BY pages_vues DESC
    LIMIT 20`,

  // --- Provenance : domaines référents
  top_referrers: (d) => `
    SELECT coalesce(nullIf(properties.$referring_domain, ''), 'direct / inconnu') AS source,
           count() AS pages_vues,
           uniq(person_id) AS visiteurs
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${d} DAY
    GROUP BY source
    ORDER BY visiteurs DESC
    LIMIT 20`,

  // --- Provenance : campagnes UTM
  top_utm: (d) => `
    SELECT coalesce(nullIf(properties.utm_source, ''), 'aucune') AS utm_source,
           coalesce(nullIf(properties.utm_medium, ''), '—') AS utm_medium,
           coalesce(nullIf(properties.utm_campaign, ''), '—') AS utm_campaign,
           uniq(person_id) AS visiteurs
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${d} DAY
    GROUP BY utm_source, utm_medium, utm_campaign
    ORDER BY visiteurs DESC
    LIMIT 20`,

  // --- Géographie
  top_countries: (d) => `
    SELECT coalesce(nullIf(properties.$geoip_country_name, ''), 'Inconnu') AS pays,
           uniq(person_id) AS visiteurs,
           count() AS pages_vues
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${d} DAY
    GROUP BY pays
    ORDER BY visiteurs DESC
    LIMIT 20`,

  // --- Appareils et navigateurs
  devices: (d) => `
    SELECT coalesce(nullIf(properties.$device_type, ''), 'Inconnu') AS appareil,
           coalesce(nullIf(properties.$browser, ''), 'Inconnu') AS navigateur,
           uniq(person_id) AS visiteurs
    FROM events
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL ${d} DAY
    GROUP BY appareil, navigateur
    ORDER BY visiteurs DESC
    LIMIT 20`,

  // --- Services les plus consultés
  top_services_viewed: (d) => `
    SELECT properties.service_title AS service,
           properties.service_id AS service_id,
           properties.seller_name AS vendeur,
           count() AS vues,
           uniq(person_id) AS visiteurs_uniques
    FROM events
    WHERE event = 'service_viewed' AND timestamp >= now() - INTERVAL ${d} DAY
    GROUP BY service, service_id, vendeur
    ORDER BY vues DESC
    LIMIT 25`,

  // --- Vendeurs dont les fiches attirent le plus
  top_sellers_viewed: (d) => `
    SELECT properties.seller_name AS vendeur,
           properties.seller_id AS seller_id,
           count() AS vues_services,
           uniq(person_id) AS visiteurs_uniques
    FROM events
    WHERE event = 'service_viewed' AND timestamp >= now() - INTERVAL ${d} DAY
    GROUP BY vendeur, seller_id
    ORDER BY vues_services DESC
    LIMIT 25`,

  // --- Recherches effectuées
  top_searches: (d) => `
    SELECT lower(properties.query) AS recherche,
           count() AS occurrences,
           countIf(toFloat(properties.results_count) = 0) AS sans_resultat
    FROM events
    WHERE event = 'service_search' AND timestamp >= now() - INTERVAL ${d} DAY
      AND properties.query != ''
    GROUP BY recherche
    ORDER BY occurrences DESC
    LIMIT 25`,

  // --- Entonnoir de conversion (comptage par étape)
  funnel: (d) => `
    SELECT event,
           count() AS evenements,
           uniq(person_id) AS personnes
    FROM events
    WHERE timestamp >= now() - INTERVAL ${d} DAY
      AND event IN ('$pageview', 'service_search', 'service_viewed', 'checkout_started', 'order_created', 'signup_completed')
    GROUP BY event
    ORDER BY personnes DESC`,

  // --- Volume de tous les événements métier
  events_breakdown: (d) => `
    SELECT event, count() AS evenements, uniq(person_id) AS personnes
    FROM events
    WHERE timestamp >= now() - INTERVAL ${d} DAY
      AND event NOT LIKE '$%'
    GROUP BY event
    ORDER BY evenements DESC
    LIMIT 30`
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Authentification : administrateur Frilya uniquement
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // 2. Configuration PostHog
    if (!POSTHOG_KEY || !POSTHOG_PROJECT) {
      return res.status(503).json({
        error: 'PostHog non configuré',
        details: 'Renseignez POSTHOG_PERSONAL_API_KEY et POSTHOG_PROJECT_ID dans les variables d\'environnement.',
        notConfigured: true
      });
    }

    // 3. Requête : uniquement celles de la liste blanche
    const { queries, days } = req.body || {};
    const requested: string[] = Array.isArray(queries) ? queries : [];
    const period = Math.min(Math.max(parseInt(String(days ?? 30), 10) || 30, 1), 365);

    const unknown = requested.filter(q => !QUERIES[q]);
    if (requested.length === 0 || unknown.length > 0) {
      return res.status(400).json({ error: `Requête inconnue : ${unknown.join(', ') || 'aucune'}` });
    }

    // 4. Exécution en parallèle contre l'API PostHog
    const results: Record<string, any> = {};

    await Promise.all(requested.map(async (name) => {
      try {
        const response = await fetch(`${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT}/query/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${POSTHOG_KEY}`
          },
          body: JSON.stringify({
            query: { kind: 'HogQLQuery', query: QUERIES[name](period) }
          })
        });

        const payload = await response.json();

        if (!response.ok) {
          results[name] = { error: payload?.detail || payload?.error || `HTTP ${response.status}` };
          return;
        }

        results[name] = {
          columns: payload.columns || [],
          rows: payload.results || []
        };
      } catch (err: any) {
        results[name] = { error: err?.message || 'Erreur inconnue' };
      }
    }));

    return res.status(200).json({ days: period, results });
  } catch (error: any) {
    console.error('PostHog query error:', error);
    return res.status(500).json({ error: error.message });
  }
}
