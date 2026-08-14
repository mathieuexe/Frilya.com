import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { analyticsEnabled } from '../../../lib/analytics';
import {
  Loader2, RefreshCw, TrendingUp, Users, Eye, ShoppingBag, Euro, Globe,
  AlertTriangle, MousePointerClick, Store, Package, Star, Info
} from 'lucide-react';
import { StatTile, DailyBars, RankBars, Panel, SERIES_1, SERIES_2 } from '../components/charts/Charts';

const PERIODS = [
  { days: 7, label: '7 jours' },
  { days: 30, label: '30 jours' },
  { days: 90, label: '90 jours' }
];

const POSTHOG_QUERIES = [
  'traffic_daily', 'traffic_totals', 'top_pages', 'top_sections', 'top_referrers',
  'top_utm', 'top_countries', 'devices', 'top_services_viewed', 'top_sellers_viewed',
  'top_searches', 'funnel', 'events_breakdown'
];

type PhResult = { columns: string[]; rows: any[][] } | { error: string } | undefined;

export default function AnalyticsView() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Données métier (Supabase) — toujours disponibles
  const [orders, setOrders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [sellers, setSellers] = useState<Record<string, any>>({});
  const [reviews, setReviews] = useState<any[]>([]);
  const [newUsers, setNewUsers] = useState<any[]>([]);

  // Données comportementales (PostHog)
  const [ph, setPh] = useState<Record<string, PhResult>>({});
  const [phError, setPhError] = useState<string | null>(null);
  const [phConfigured, setPhConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    load();
  }, [days]);

  const load = async () => {
    setRefreshing(true);
    await Promise.all([loadBusiness(), loadPosthog()]);
    setLoading(false);
    setRefreshing(false);
  };

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }, [days]);

  const loadBusiness = async () => {
    try {
      const [ordersRes, servicesRes, profilesRes, reviewsRes, usersRes] = await Promise.all([
        supabase.from('orders').select('id, amount, platform_fee, status, created_at, service_id, seller_id, buyer_id').gte('created_at', since),
        supabase.from('services').select('id, title, seller_id, price_basic, status, created_at'),
        supabase.from('profiles').select('id, full_name, is_seller, created_at, is_verified'),
        supabase.from('reviews').select('rating, seller_id, service_id, created_at'),
        supabase.from('profiles').select('id, created_at, is_seller').gte('created_at', since)
      ]);

      setOrders(ordersRes.data || []);
      setServices(servicesRes.data || []);
      setReviews(reviewsRes.data || []);
      setNewUsers(usersRes.data || []);

      const map: Record<string, any> = {};
      profilesRes.data?.forEach(p => { map[p.id] = p; });
      setSellers(map);
    } catch (err) {
      console.error('Erreur chargement des données métier :', err);
    }
  };

  const loadPosthog = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/posthog-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ queries: POSTHOG_QUERIES, days })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setPhConfigured(!payload?.notConfigured);
        setPhError(payload?.details || payload?.error || `Erreur ${res.status}`);
        setPh({});
        return;
      }

      const payload = await res.json();
      setPhConfigured(true);
      setPhError(null);
      setPh(payload.results || {});
    } catch (err: any) {
      setPhConfigured(false);
      setPhError(err?.message || "L'API d'analyse n'est pas joignable (disponible uniquement en déploiement).");
    }
  };

  // ------------------------------------------------------------------
  // Agrégations métier
  // ------------------------------------------------------------------
  const paidOrders = orders.filter(o => o.status !== 'cancelled');

  const revenue = paidOrders.reduce((acc, o) => acc + Number(o.amount || 0), 0);
  const platformFees = paidOrders.reduce((acc, o) => acc + Number(o.platform_fee || 0), 0);
  const avgBasket = paidOrders.length > 0 ? revenue / paidOrders.length : 0;

  const serviceById = useMemo(() => {
    const m: Record<string, any> = {};
    services.forEach(s => { m[s.id] = s; });
    return m;
  }, [services]);

  /** Services qui se vendent le mieux (source de vérité : la base) */
  const bestSellingServices = useMemo(() => {
    const agg: Record<string, { title: string; orders: number; revenue: number }> = {};
    paidOrders.forEach(o => {
      if (!o.service_id) return;
      const title = serviceById[o.service_id]?.title || 'Service supprimé';
      if (!agg[o.service_id]) agg[o.service_id] = { title, orders: 0, revenue: 0 };
      agg[o.service_id].orders += 1;
      agg[o.service_id].revenue += Number(o.amount || 0);
    });
    return Object.entries(agg)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);
  }, [paidOrders, serviceById]);

  /** Vendeurs les plus performants */
  const topSellers = useMemo(() => {
    const agg: Record<string, { orders: number; revenue: number; ratings: number[] }> = {};

    paidOrders.forEach(o => {
      if (!o.seller_id) return;
      if (!agg[o.seller_id]) agg[o.seller_id] = { orders: 0, revenue: 0, ratings: [] };
      agg[o.seller_id].orders += 1;
      agg[o.seller_id].revenue += Number(o.amount || 0);
    });

    reviews.forEach(r => {
      if (!r.seller_id || !agg[r.seller_id]) return;
      agg[r.seller_id].ratings.push(r.rating);
    });

    return Object.entries(agg)
      .map(([id, v]) => ({
        id,
        name: sellers[id]?.full_name || 'Vendeur inconnu',
        orders: v.orders,
        revenue: v.revenue,
        rating: v.ratings.length > 0
          ? Math.round((v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length) * 10) / 10
          : null,
        servicesCount: services.filter(s => s.seller_id === id).length
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);
  }, [paidOrders, reviews, sellers, services]);

  // ------------------------------------------------------------------
  // Lecture des résultats PostHog
  // ------------------------------------------------------------------
  const phRows = (name: string): any[][] => {
    const r = ph[name];
    if (!r || 'error' in r) return [];
    return r.rows || [];
  };
  const phErr = (name: string): string | null => {
    const r = ph[name];
    if (r && 'error' in r) return r.error;
    return null;
  };

  const totals = phRows('traffic_totals')[0] || [];
  const [phPageviews, phVisitors, phSessions] = [totals[0] || 0, totals[1] || 0, totals[2] || 0];

  const dailyData = phRows('traffic_daily').map(row => ({
    label: new Date(row[0]).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    values: [Number(row[1]) || 0, Number(row[2]) || 0]
  }));

  /** Vues PostHog par service, croisées avec les commandes en base pour le taux de conversion */
  const serviceConversion = useMemo(() => {
    const views = phRows('top_services_viewed');
    if (views.length === 0) return [];

    const ordersByService: Record<string, number> = {};
    paidOrders.forEach(o => {
      if (o.service_id) ordersByService[o.service_id] = (ordersByService[o.service_id] || 0) + 1;
    });

    return views.map(row => {
      const title = row[0] || 'Sans titre';
      const serviceId = row[1];
      const viewCount = Number(row[3]) || 0;
      const orderCount = serviceId ? (ordersByService[serviceId] || 0) : 0;
      return {
        title,
        views: viewCount,
        orders: orderCount,
        rate: viewCount > 0 ? (orderCount / viewCount) * 100 : 0
      };
    }).slice(0, 12);
  }, [ph, paidOrders]);

  const funnelCounts = useMemo(() => {
    const rows = phRows('funnel');
    const byEvent: Record<string, number> = {};
    rows.forEach(r => { byEvent[r[0]] = Number(r[2]) || 0; });
    return byEvent;
  }, [ph]);

  const funnelSteps = [
    { key: '$pageview', label: 'Visiteurs (page vue)' },
    { key: 'service_search', label: 'Ont recherché' },
    { key: 'service_viewed', label: 'Ont vu une annonce' },
    { key: 'checkout_started', label: 'Ont lancé un paiement' },
    { key: 'order_created', label: 'Ont commandé' }
  ];

  if (loading) {
    return <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-frilya-600" /></div>;
  }

  return (
    <div className="space-y-6">

      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                days === p.days
                  ? 'bg-frilya-900 text-white border-frilya-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Rafraîchir
        </button>
      </div>

      {/* État de la configuration PostHog */}
      {(phConfigured === false || phError) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-bold">Mesure d'audience PostHog indisponible</p>
            <p className="mt-1">{phError}</p>
            <p className="mt-2 text-xs">
              Les indicateurs de ventes ci-dessous proviennent de la base Frilya et restent exacts.
              Pour l'audience : renseignez <code className="font-mono bg-amber-100 px-1 rounded">VITE_POSTHOG_KEY</code> (navigateur)
              puis <code className="font-mono bg-amber-100 px-1 rounded">POSTHOG_PERSONAL_API_KEY</code> et
              <code className="font-mono bg-amber-100 px-1 rounded"> POSTHOG_PROJECT_ID</code> (serveur).
              Voir <code className="font-mono bg-amber-100 px-1 rounded">docs/analytics-posthog.md</code>.
            </p>
          </div>
        </div>
      )}

      {!analyticsEnabled() && (
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600">
            Le traçage côté navigateur est désactivé sur cet environnement (clé <code className="font-mono">VITE_POSTHOG_KEY</code> absente) :
            aucune donnée d'audience n'est collectée depuis cette session.
          </p>
        </div>
      )}

      {/* ---------------- VENTES (base Frilya) ---------------- */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Ventes — données Frilya</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Chiffre d'affaires" value={`${revenue.toFixed(2)} €`} icon={Euro} hint={`${days} derniers jours`} />
          <StatTile label="Commandes" value={paidOrders.length} icon={ShoppingBag} hint={`${orders.length - paidOrders.length} annulée(s)`} />
          <StatTile label="Panier moyen" value={`${avgBasket.toFixed(2)} €`} icon={TrendingUp} />
          <StatTile label="Commissions" value={`${platformFees.toFixed(2)} €`} icon={Euro} accent="text-frilya-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Annonces qui se vendent le mieux" subtitle="Classement par chiffre d'affaires généré">
          <RankBars
            rows={bestSellingServices.map(s => ({
              label: s.title,
              sub: `${s.orders} commande(s)`,
              value: Math.round(s.revenue * 100) / 100
            }))}
            unit="€"
            emptyLabel="Aucune commande sur la période."
          />
        </Panel>

        <Panel title="Vendeurs les plus performants" subtitle="Chiffre d'affaires, commandes et note moyenne">
          {topSellers.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Aucune vente sur la période.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase text-slate-400 border-b border-slate-100">
                    <th className="text-left py-2 font-bold">Vendeur</th>
                    <th className="text-right py-2 font-bold">CA</th>
                    <th className="text-right py-2 font-bold">Cmd.</th>
                    <th className="text-right py-2 font-bold">Note</th>
                    <th className="text-right py-2 font-bold">Annonces</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topSellers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 pr-2">
                        <span className="font-medium text-slate-800 flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-slate-300" /> {s.name}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900 tabular-nums">{s.revenue.toFixed(2)} €</td>
                      <td className="py-2.5 text-right text-slate-600 tabular-nums">{s.orders}</td>
                      <td className="py-2.5 text-right text-slate-600 tabular-nums">
                        {s.rating ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500 fill-current" /> {s.rating}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 text-right text-slate-600 tabular-nums">{s.servicesCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* ---------------- AUDIENCE (PostHog) ---------------- */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Audience et comportements — PostHog</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Visiteurs uniques" value={Number(phVisitors).toLocaleString('fr-FR')} icon={Users} />
          <StatTile label="Pages vues" value={Number(phPageviews).toLocaleString('fr-FR')} icon={Eye} />
          <StatTile label="Sessions" value={Number(phSessions).toLocaleString('fr-FR')} icon={MousePointerClick} />
          <StatTile label="Nouveaux comptes" value={newUsers.length} icon={Users} hint="Source : base Frilya" />
        </div>
      </div>

      <Panel
        title="Trafic quotidien"
        subtitle="Pages vues et visiteurs uniques par jour"
        error={phErr('traffic_daily')}
      >
        <DailyBars
          data={dailyData}
          series={[
            { name: 'Pages vues', color: SERIES_1 },
            { name: 'Visiteurs uniques', color: SERIES_2 }
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Pages les plus consultées" subtitle="Par nombre de pages vues" error={phErr('top_pages')}>
          <RankBars rows={phRows('top_pages').map(r => ({
            label: r[0] || '/',
            sub: `${Number(r[2]).toLocaleString('fr-FR')} visiteur(s)`,
            value: Number(r[1]) || 0
          }))} />
        </Panel>

        <Panel title="Zones du site" subtitle="Regroupement fonctionnel des pages" error={phErr('top_sections')}>
          <RankBars rows={phRows('top_sections').map(r => ({
            label: String(r[0] || '').replace(/_/g, ' '),
            sub: `${Number(r[2]).toLocaleString('fr-FR')} visiteur(s)`,
            value: Number(r[1]) || 0
          }))} />
        </Panel>

        <Panel title="D'où viennent les visiteurs" subtitle="Domaines référents" error={phErr('top_referrers')}>
          <RankBars rows={phRows('top_referrers').map(r => ({
            label: r[0] || 'direct / inconnu',
            value: Number(r[2]) || 0
          }))} unit="visiteurs" />
        </Panel>

        <Panel title="Campagnes (UTM)" subtitle="Source, support et campagne" error={phErr('top_utm')}>
          <RankBars rows={phRows('top_utm').map(r => ({
            label: `${r[0]}`,
            sub: [r[1], r[2]].filter(x => x && x !== '—').join(' · '),
            value: Number(r[3]) || 0
          }))} unit="visiteurs" />
        </Panel>

        <Panel title="Pays" subtitle="Visiteurs uniques par pays" error={phErr('top_countries')}>
          <RankBars rows={phRows('top_countries').map(r => ({
            label: r[0] || 'Inconnu',
            value: Number(r[1]) || 0
          }))} unit="visiteurs" />
        </Panel>

        <Panel title="Appareils et navigateurs" error={phErr('devices')}>
          <RankBars rows={phRows('devices').map(r => ({
            label: `${r[0]}`,
            sub: String(r[1] || ''),
            value: Number(r[2]) || 0
          }))} unit="visiteurs" />
        </Panel>
      </div>

      {/* ---------------- CONVERSION ---------------- */}
      <Panel
        title="Entonnoir de conversion"
        subtitle={`Personnes distinctes ayant réalisé chaque action sur ${days} jours`}
        error={phErr('funnel')}
      >
        {Object.keys(funnelCounts).length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Aucun événement enregistré sur la période.</p>
        ) : (
          <div className="space-y-3">
            {funnelSteps.map((step, i) => {
              const value = funnelCounts[step.key] || 0;
              const base = funnelCounts[funnelSteps[0].key] || 0;
              const prev = i > 0 ? (funnelCounts[funnelSteps[i - 1].key] || 0) : 0;
              return (
                <div key={step.key}>
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-sm text-slate-700">
                      {step.label}
                      {i > 0 && prev > 0 && (
                        <span className="text-xs text-slate-400 ml-2">
                          {((value / prev) * 100).toFixed(1)} % de l'étape précédente
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      {value.toLocaleString('fr-FR')}
                      {base > 0 && <span className="text-xs text-slate-400 font-medium ml-2">{((value / base) * 100).toFixed(1)} %</span>}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${base > 0 ? Math.max((value / base) * 100, 1) : 0}%`, backgroundColor: SERIES_1 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title="Annonces : vues et taux de commande"
          subtitle="Vues PostHog croisées avec les commandes en base"
          error={phErr('top_services_viewed')}
        >
          {serviceConversion.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Aucune vue d'annonce enregistrée.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase text-slate-400 border-b border-slate-100">
                    <th className="text-left py-2 font-bold">Annonce</th>
                    <th className="text-right py-2 font-bold">Vues</th>
                    <th className="text-right py-2 font-bold">Cmd.</th>
                    <th className="text-right py-2 font-bold">Taux</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {serviceConversion.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="py-2.5 pr-2">
                        <span className="font-medium text-slate-800 flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-slate-300" />
                          <span className="truncate max-w-[220px]" title={s.title}>{s.title}</span>
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-600 tabular-nums">{s.views.toLocaleString('fr-FR')}</td>
                      <td className="py-2.5 text-right text-slate-600 tabular-nums">{s.orders}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900 tabular-nums">{s.rate.toFixed(1)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Vendeurs les plus consultés" subtitle="Vues d'annonces attribuées au vendeur" error={phErr('top_sellers_viewed')}>
          <RankBars rows={phRows('top_sellers_viewed').map(r => ({
            label: r[0] || 'Vendeur inconnu',
            sub: `${Number(r[3]).toLocaleString('fr-FR')} visiteur(s)`,
            value: Number(r[2]) || 0
          }))} unit="vues" />
        </Panel>

        <Panel title="Recherches des visiteurs" subtitle="Termes saisis et recherches sans résultat" error={phErr('top_searches')}>
          <RankBars rows={phRows('top_searches').map(r => ({
            label: r[0] || '(vide)',
            sub: Number(r[2]) > 0 ? `${r[2]} sans résultat` : undefined,
            value: Number(r[1]) || 0
          }))} emptyLabel="Aucune recherche enregistrée." />
        </Panel>

        <Panel title="Événements métier" subtitle="Volume par type d'action suivie" error={phErr('events_breakdown')}>
          <RankBars rows={phRows('events_breakdown').map(r => ({
            label: String(r[0] || '').replace(/_/g, ' '),
            sub: `${Number(r[2]).toLocaleString('fr-FR')} personne(s)`,
            value: Number(r[1]) || 0
          }))} emptyLabel="Aucun événement enregistré." />
        </Panel>
      </div>

      <p className="text-xs text-slate-400 flex items-start gap-2">
        <Globe className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Ventes, commandes, notes et comptes proviennent de la base Frilya (chiffres exacts).
        Audience, provenance, pages et entonnoir proviennent de PostHog (mesure côté navigateur,
        sensible aux bloqueurs de publicité et au refus des cookies).
      </p>
    </div>
  );
}
