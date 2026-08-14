import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SUPPORT_ACCOUNT_ID } from '../../lib/constants';

export type AdminCounts = {
  /** Tickets SAV non traités (nouveau + en attente) */
  tickets: number;
  /** Demandes d'accès bêta en attente de décision */
  beta: number;
  /** Messages privés reçus par "Support Frilya" et non lus */
  support: number;
  /** Litiges ouverts */
  disputes: number;
};

type AdminNotificationsValue = {
  counts: AdminCounts;
  total: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

const EMPTY_COUNTS: AdminCounts = { tickets: 0, beta: 0, support: 0, disputes: 0 };

const AdminNotificationsContext = createContext<AdminNotificationsValue>({
  counts: EMPTY_COUNTS,
  total: 0,
  loading: true,
  refresh: async () => {}
});

export function useAdminNotifications() {
  return useContext(AdminNotificationsContext);
}

export function AdminNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<AdminCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [ticketsRes, betaRes, supportRes, disputesRes] = await Promise.all([
        supabase
          .from('report_tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['nouveau', 'en_attente']),
        supabase
          .from('beta_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', SUPPORT_ACCOUNT_ID)
          .eq('is_read', false),
        supabase
          .from('disputes')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'reviewing'])
      ]);

      setCounts({
        tickets: ticketsRes.count || 0,
        beta: betaRes.count || 0,
        support: supportRes.count || 0,
        disputes: disputesRes.count || 0
      });
    } catch (err) {
      console.error('Erreur lors du calcul des notifications admin :', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Temps réel : on recalcule dès qu'une table surveillée bouge
    const channel = supabase
      .channel('admin_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'report_tickets' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'beta_applications' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disputes' }, () => refresh())
      .subscribe();

    // Filet de sécurité si le temps réel n'est pas activé sur une table
    const interval = setInterval(refresh, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [refresh]);

  const value = useMemo(() => ({
    counts,
    total: counts.tickets + counts.beta + counts.support + counts.disputes,
    loading,
    refresh
  }), [counts, loading, refresh]);

  return (
    <AdminNotificationsContext.Provider value={value}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}
