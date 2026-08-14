# Analytique Frilya — PostHog + onglet Statistique

## Principe : deux sources, deux rôles

| Question | Source | Pourquoi |
|---|---|---|
| Quelle annonce se vend le mieux ? Quel vendeur est le plus performant ? CA, panier moyen, commissions, notes | **Base Supabase** (`orders`, `services`, `reviews`, `profiles`) | Chiffres exacts, insensibles aux bloqueurs de publicité |
| Combien de visiteurs ? Quelles pages ? D'où viennent-ils ? Quel entonnoir de conversion ? | **PostHog** | Seule source des comportements de navigation, y compris visiteurs non connectés |

L'onglet `/admin/stats` fonctionne donc **même sans PostHog configuré** : la partie
ventes s'affiche normalement, la partie audience affiche un bandeau explicite.

## Mise en service

### 1. Créer le projet PostHog

Option assistée (recommandée si tu n'as pas encore de compte) — la commande est
interactive, lance-la toi-même :

```
npx -y @posthog/wizard@latest
```

Le code d'intégration est **déjà en place** dans le dépôt (`src/lib/analytics.ts`,
`src/main.tsx`, `src/App.tsx`). Si le wizard propose de réécrire ces fichiers,
refuse : il suffit de récupérer la clé du projet à l'étape suivante. Le wizard
reste utile pour créer le compte, le projet, et vérifier l'ingestion
(`npx -y @posthog/wizard@latest doctor`).

### 2. Variables d'environnement

Copier `.env.example` en `.env` (local) et renseigner les mêmes valeurs dans
Vercel → Settings → Environment Variables :

| Variable | Portée | Où la trouver |
|---|---|---|
| `VITE_POSTHOG_KEY` | navigateur (publique) | PostHog → Settings → Project → Project API Key (`phc_…`) |
| `VITE_POSTHOG_HOST` | navigateur | `https://eu.i.posthog.com` (UE) ou `https://us.i.posthog.com` |
| `POSTHOG_PERSONAL_API_KEY` | **serveur, secret** | PostHog → Settings → Personal API keys, scope `query:read` (`phx_…`) |
| `POSTHOG_PROJECT_ID` | serveur | identifiant numérique dans l'URL PostHog `/project/12345` |
| `POSTHOG_HOST` | serveur | `https://eu.posthog.com` ou `https://us.posthog.com` |

La clé personnelle donne accès à toutes les données du projet : elle ne doit
jamais être préfixée `VITE_` (ce préfixe l'exposerait dans le bundle navigateur).
`.env` est ignoré par git.

### 3. Vérifier

1. Déployer (l'onglet Statistique interroge `/api/posthog-query`, une fonction
   serverless : en `npm run dev` seule la partie ventes fonctionne).
2. Naviguer sur le site, ouvrir une fiche service, lancer une recherche.
3. PostHog → Activity : les événements doivent arriver.
4. `/admin/stats` : les blocs audience se remplissent.

## Ce qui est mesuré

### Automatique (PostHog)
Pages vues à chaque changement d'URL (SPA), référent, domaine référent, UTM,
pays/région (GeoIP), appareil, navigateur, système, autocapture des clics.

### Événements métier (`src/lib/analytics.ts`)

| Événement | Déclenché par | Propriétés utiles |
|---|---|---|
| `service_viewed` | ouverture d'une fiche service | `service_id`, `service_title`, `seller_id`, `seller_name`, `price`, `category_id` |
| `service_search` | recherche | `query`, `results_count`, `has_results`, `category` |
| `seller_profile_viewed` | page profil vendeur | `seller_id`, `seller_name`, `services_count` |
| `checkout_started` | clic sur payer | `service_id`, `package_type`, `net_price`, `total_price` |
| `order_created` | commande enregistrée | `service_id`, `seller_id`, `amount`, `platform_fee` |
| `signup_completed`, `login` | inscription / connexion | `role` |
| `service_published` | publication d'une annonce | `service_id`, `price` |
| `support_ticket_created` | signalement envoyé | `category` |
| `beta_application_submitted` | candidature bêta | — |

Les utilisateurs connectés sont identifiés (`posthog.identify`) avec leur rôle,
statut vendeur/bêta et date d'inscription : les comportements sont donc
segmentables par type de compte. `posthog.reset()` est appelé à la déconnexion.

## Vie privée / RGPD

- Enregistrement de session **désactivé** (`disable_session_recording: true`).
- `person_profiles: 'identified_only'` : pas de profil persistant pour les visiteurs anonymes.
- Aucun traçage si `VITE_POSTHOG_KEY` est absente (environnements de test).
- Hébergement UE par défaut.
- À prévoir côté produit : mention dans la politique de confidentialité et, selon
  ton analyse de conformité, une bannière de consentement conditionnant `initAnalytics()`.

## Ajouter un indicateur

1. Ajouter la requête HogQL dans la liste blanche `QUERIES` de `api/posthog-query.ts`
   (aucune requête libre n'est acceptée depuis le navigateur, par sécurité).
2. Ajouter son nom dans `POSTHOG_QUERIES` de `src/pages/admin/views/AnalyticsView.tsx`.
3. Afficher le résultat avec `<Panel>` + `<RankBars>` / `<DailyBars>` / `<StatTile>`
   (`src/pages/admin/components/charts/Charts.tsx`).

Chaque bloc affiche l'erreur PostHog exacte s'il échoue : une requête à corriger
se voit immédiatement dans l'interface.
