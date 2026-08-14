import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Store, ShoppingBag, Package, Inbox, AlertTriangle, Beaker, Scale,
  ArrowRight, Loader2, CheckCircle2, TrendingUp, Clock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { SUPPORT_ACCOUNT_ID } from '../../../lib/constants';
import { useAdminNotifications } from '../AdminNotificationsContext';
import NotificationBubble from '../components/NotificationBubble';

type Stats = {
  buyers: number;
  sellers: number;
  services: number;
  orders: number;
  revenue: number;
  betaTesters: number;
};

export default function DashboardView() {
  const navigate = useNavigate();
  const { counts, total } = useAdminNotifications();

  const [stats, setStats] = useState<Stats>({
    buyers: 0, sellers: 0, services: 0, orders: 0, revenue: 0, betaTesters: 0
  });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [recentSupport, setRecentSupport] = useState<any[]>([]);
  const [recentBeta, setRecentBeta] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [buyers, sellers, services, orders, betaTesters, tickets, supportMsgs, betaApps] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_seller', false).neq('role', 'admin'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_seller', true),
        supabase.from('services').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('amount'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_beta', true),
        supabase.from('report_tickets').select('id, ticket_number, title, status, priority, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('messages').select('id, sender_id, content, created_at, is_read').eq('receiver_id', SUPPORT_ACCOUNT_ID).order('created_at', { ascending: false }).limit(5),
        supabase.from('beta_applications').select('id, pseudo, email, status, created_at').order('created_at', { ascending: false }).limit(5)
      ]);

      const revenue = (orders.data || []).reduce((acc: number, o: any) => acc + Number(o.amount || 0), 0);

      setStats({
        buyers: buyers.count || 0,
        sellers: sellers.count || 0,
        services: services.count || 0,
        orders: orders.data?.length || 0,
        revenue,
        betaTesters: betaTesters.count || 0
      });

      setRecentTickets(tickets.data || []);
      setRecentBeta(betaApps.data || []);

      // Noms des expéditeurs des derniers messages SAV
      const senderIds = [...new Set((supportMsgs.data || []).map(m => m.sender_id).filter(Boolean))];
      if (senderIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', senderIds);
        const map = new Map(profs?.map(p => [p.id, p]));
        setRecentSupport((supportMsgs.data || []).map(m => ({ ...m, sender: map.get(m.sender_id) })));
      } else {
        setRecentSupport(supportMsgs.data || []);
      }
    } catch (err) {
      console.error('Erreur chargement du tableau de bord :', err);
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { label: 'Acheteurs', value: stats.buyers, icon: Users, accent: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/25', path: '/admin/buyers' },
    { label: 'Vendeurs', value: stats.sellers, icon: Store, accent: 'from-frilya-600 to-frilya-500', shadow: 'shadow-frilya-600/25', path: '/admin/sellers' },
    { label: 'Services publiés', value: stats.services, icon: Package, accent: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-500/25', path: '/admin/services' },
    { label: 'Commandes', value: stats.orders, icon: ShoppingBag, accent: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/25', path: '/admin/orders' }
  ];

  const todo = [
    { key: 'support', label: 'Messages SAV non lus', count: counts.support, icon: Inbox, path: '/admin/support', tone: 'text-frilya-600 bg-frilya-50 border-frilya-100' },
    { key: 'tickets', label: 'Tickets à traiter', count: counts.tickets, icon: AlertTriangle, path: '/admin/tickets', tone: 'text-amber-600 bg-amber-50 border-amber-100' },
    { key: 'beta', label: 'Demandes bêta en attente', count: counts.beta, icon: Beaker, path: '/admin/beta', tone: 'text-purple-600 bg-purple-50 border-purple-100' },
    { key: 'disputes', label: 'Litiges ouverts', count: counts.disputes, icon: Scale, path: '/admin/disputes', tone: 'text-red-600 bg-red-50 border-red-100' }
  ];

  const relativeDate = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    return `il y a ${Math.floor(hours / 24)} j`;
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <button
            key={kpi.label}
            onClick={() => navigate(kpi.path)}
            className={`text-left bg-gradient-to-br ${kpi.accent} rounded-3xl p-5 text-white shadow-lg ${kpi.shadow} hover:scale-[1.02] transition-transform`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/80 text-xs font-bold uppercase tracking-wider mb-2">{kpi.label}</p>
                <h3 className="text-3xl font-bold leading-none">{kpi.value}</h3>
              </div>
              <span className="p-2.5 bg-white/20 rounded-2xl">
                <kpi.icon className="w-5 h-5" />
              </span>
            </div>
            <p className="mt-4 text-[11px] font-bold text-white/80 flex items-center gap-1">
              Consulter <ArrowRight className="w-3 h-3" />
            </p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* File d'attente */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">À traiter</h3>
              <p className="text-sm text-slate-500">
                {total === 0 ? 'Aucune action en attente, tout est à jour.' : `${total} élément(s) nécessitent votre attention.`}
              </p>
            </div>
            {total > 0 && <NotificationBubble count={total} pulse />}
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {todo.map(item => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm text-left ${
                  item.count > 0 ? item.tone : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}
              >
                <span className="w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center shrink-0 border border-white">
                  <item.icon className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-2xl font-bold leading-none">{item.count}</span>
                  <span className="block text-xs font-bold mt-1 truncate">{item.label}</span>
                </span>
                {item.count === 0 && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Indicateurs secondaires */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-900">Chiffres clés</h3>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Volume commandes</p>
            <p className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {stats.revenue.toFixed(2)} €
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </p>
            <p className="text-xs text-slate-500 mt-1">Cumul de {stats.orders} commande(s)</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Testeurs bêta actifs</p>
            <p className="text-2xl font-bold text-slate-900">{stats.betaTesters}</p>
            <button onClick={() => navigate('/admin/beta')} className="text-xs font-bold text-frilya-600 hover:underline mt-1">
              Gérer la bêta
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Comptes total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.buyers + stats.sellers}</p>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-frilya-600" /> Derniers messages SAV
            </h3>
            <button onClick={() => navigate('/admin/support')} className="text-xs font-bold text-frilya-600 hover:underline">
              Tout voir
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentSupport.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">Aucun message reçu.</p>
            ) : recentSupport.map(msg => (
              <button
                key={msg.id}
                onClick={() => navigate('/admin/support')}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex gap-3"
              >
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={`text-sm truncate ${msg.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                      {msg.sender?.full_name || 'Utilisateur'}
                    </span>
                    {!msg.is_read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                  </span>
                  <span className="block text-xs text-slate-500 truncate mt-0.5">{msg.content}</span>
                  <span className="block text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {relativeDate(msg.created_at)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Derniers tickets
            </h3>
            <button onClick={() => navigate('/admin/tickets')} className="text-xs font-bold text-frilya-600 hover:underline">
              Tout voir
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentTickets.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">Aucun ticket.</p>
            ) : recentTickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => navigate('/admin/tickets')}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">{ticket.ticket_number}</span>
                  <span className="text-[11px] text-slate-400">{relativeDate(ticket.created_at)}</span>
                </span>
                <span className="block text-sm font-bold text-slate-900 truncate mt-1">{ticket.title}</span>
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">
                  {ticket.status?.replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Beaker className="w-4 h-4 text-purple-500" /> Dernières demandes bêta
            </h3>
            <button onClick={() => navigate('/admin/beta')} className="text-xs font-bold text-frilya-600 hover:underline">
              Tout voir
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentBeta.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">Aucune demande.</p>
            ) : recentBeta.map(app => (
              <button
                key={app.id}
                onClick={() => navigate('/admin/beta')}
                className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 truncate">{app.pseudo}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{relativeDate(app.created_at)}</span>
                </span>
                <span className="block text-xs text-slate-500 truncate mt-0.5">{app.email}</span>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                  app.status === 'pending' ? 'bg-amber-100 text-amber-700'
                  : app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
                }`}>
                  {app.status === 'pending' ? 'En attente' : app.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
