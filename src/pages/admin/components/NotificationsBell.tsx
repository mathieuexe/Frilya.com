import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Inbox, AlertTriangle, Beaker, Scale, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAdminNotifications } from '../AdminNotificationsContext';
import NotificationBubble from './NotificationBubble';

export default function NotificationsBell({ dark = true }: { dark?: boolean }) {
  const navigate = useNavigate();
  const { counts, total, refresh } = useAdminNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const rows = [
    {
      key: 'support',
      label: 'Messages SAV non lus',
      hint: 'Messages privés reçus par Support Frilya',
      count: counts.support,
      icon: Inbox,
      path: '/admin/support',
      color: 'text-frilya-600 bg-frilya-50'
    },
    {
      key: 'tickets',
      label: 'Tickets en attente',
      hint: 'Nouveaux signalements et tickets en attente',
      count: counts.tickets,
      icon: AlertTriangle,
      path: '/admin/tickets',
      color: 'text-amber-600 bg-amber-50'
    },
    {
      key: 'beta',
      label: 'Demandes bêta en attente',
      hint: 'Candidatures à valider ou refuser',
      count: counts.beta,
      icon: Beaker,
      path: '/admin/beta',
      color: 'text-purple-600 bg-purple-50'
    },
    {
      key: 'disputes',
      label: 'Litiges ouverts',
      hint: 'Conflits en cours de traitement',
      count: counts.disputes,
      icon: Scale,
      path: '/admin/disputes',
      color: 'text-red-600 bg-red-50'
    }
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2.5 rounded-xl transition-colors ${
          dark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-500'
        }`}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1">
            <NotificationBubble count={total} pulse />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900 text-sm">À traiter</p>
              <p className="text-[11px] text-slate-500">{total === 0 ? 'Tout est à jour' : `${total} élément(s) en attente`}</p>
            </div>
            <button
              onClick={() => refresh()}
              className="p-2 rounded-lg hover:bg-white text-slate-400 hover:text-slate-700 transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto custom-scrollbar">
            {total === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-200" />
                <p className="text-sm font-medium">Aucune tâche en attente</p>
              </div>
            ) : (
              rows.filter(r => r.count > 0).map(row => (
                <button
                  key={row.key}
                  onClick={() => { setOpen(false); navigate(row.path); }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${row.color}`}>
                    <row.icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-slate-900">{row.label}</span>
                    <span className="block text-xs text-slate-500 truncate">{row.hint}</span>
                  </span>
                  <NotificationBubble count={row.count} />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
