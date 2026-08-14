import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import {
  Loader2, Send, Search, Inbox, UserPlus, UserMinus, PauseCircle, CheckCircle2,
  RotateCcw, Lock, AlertTriangle, MailOpen, Clock, ExternalLink, PlayCircle
} from 'lucide-react';
import { SUPPORT_ACCOUNT_ID, SUPPORT_STATUS_LABELS, type SupportStatus } from '../../../lib/constants';
import { useAdminNotifications } from '../AdminNotificationsContext';
import catAvatar from '../../../assets/cat.png';
import supportAvatar from '../../../assets/support-avatar.png';

type Thread = {
  userId: string;
  profile: any;
  messages: any[];
  lastMessage: any;
  unread: number;
  status: SupportStatus;
  isClosed: boolean;
  assignedTo: string | null;
};

const STATUS_STYLES: Record<SupportStatus, string> = {
  nouveau: 'bg-frilya-100 text-frilya-700 border-frilya-200',
  en_cours: 'bg-amber-50 text-amber-700 border-amber-200',
  en_attente: 'bg-slate-100 text-slate-600 border-slate-200',
  cloture: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

const STATUS_PRIORITY: Record<SupportStatus, number> = {
  nouveau: 1,
  en_attente: 2,
  en_cours: 3,
  cloture: 4
};

export default function SupportInboxView() {
  const { refresh: refreshNotifications } = useAdminNotifications();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [statusRows, setStatusRows] = useState<Record<string, any>>({});
  const [admins, setAdmins] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | SupportStatus | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  /** false = la migration admin_support_inbox.sql n'a pas encore été jouée */
  const [schemaReady, setSchemaReady] = useState(true);

  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init();

    const channel = supabase
      .channel('admin_support_inbox')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_status' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setCurrentUser(session.user);

    // La colonne "status" n'existe qu'après la migration admin_support_inbox.sql
    const { error: schemaError } = await supabase.from('conversation_status').select('status').limit(1);
    setSchemaReady(!schemaError);

    await fetchData();
  };

  const fetchData = async () => {
    try {
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${SUPPORT_ACCOUNT_ID},receiver_id.eq.${SUPPORT_ACCOUNT_ID}`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(msgs || []);

      const userIds = new Set<string>();
      (msgs || []).forEach(m => {
        if (m.sender_id && m.sender_id !== SUPPORT_ACCOUNT_ID) userIds.add(m.sender_id);
        if (m.receiver_id && m.receiver_id !== SUPPORT_ACCOUNT_ID) userIds.add(m.receiver_id);
      });

      if (userIds.size > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email, role, slug, is_beta, is_verified')
          .in('id', Array.from(userIds));

        const map: Record<string, any> = {};
        profs?.forEach(p => { map[p.id] = p; });
        setProfiles(map);
      } else {
        setProfiles({});
      }

      const { data: statuses } = await supabase
        .from('conversation_status')
        .select('*')
        .or(`participant1_id.eq.${SUPPORT_ACCOUNT_ID},participant2_id.eq.${SUPPORT_ACCOUNT_ID}`);

      const statusMap: Record<string, any> = {};
      statuses?.forEach(row => {
        const other = row.participant1_id === SUPPORT_ACCOUNT_ID ? row.participant2_id : row.participant1_id;
        statusMap[other] = row;
      });
      setStatusRows(statusMap);

      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('role', 'admin');
      setAdmins(adminProfiles || []);
    } catch (err) {
      console.error('Erreur chargement boîte SAV :', err);
    } finally {
      setLoading(false);
    }
  };

  const threads: Thread[] = useMemo(() => {
    const grouped = new Map<string, any[]>();

    messages.forEach(m => {
      const other = m.sender_id === SUPPORT_ACCOUNT_ID ? m.receiver_id : m.sender_id;
      if (!other || other === SUPPORT_ACCOUNT_ID) return;
      if (!grouped.has(other)) grouped.set(other, []);
      grouped.get(other)!.push(m);
    });

    const list: Thread[] = Array.from(grouped.entries()).map(([userId, msgs]) => {
      const row = statusRows[userId];
      const isClosed = !!row?.is_closed;
      const unread = msgs.filter(m => m.receiver_id === SUPPORT_ACCOUNT_ID && !m.is_read).length;

      // Sans migration, le statut est déduit de l'état de la conversation
      const fallbackStatus: SupportStatus = isClosed ? 'cloture' : unread > 0 ? 'nouveau' : 'en_cours';
      const status = (row?.status as SupportStatus) || fallbackStatus;

      return {
        userId,
        profile: profiles[userId],
        messages: msgs,
        lastMessage: msgs[msgs.length - 1],
        unread,
        status: isClosed && !row?.status ? 'cloture' : status,
        isClosed,
        assignedTo: row?.assigned_to || null
      };
    });

    return list.sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 99;
      const pb = STATUS_PRIORITY[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      if (a.unread !== b.unread) return b.unread - a.unread;
      return new Date(b.lastMessage?.created_at || 0).getTime() - new Date(a.lastMessage?.created_at || 0).getTime();
    });
  }, [messages, profiles, statusRows]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return threads.filter(t => {
      const matchStatus =
        filterStatus === 'all' ? true :
        filterStatus === 'unread' ? t.unread > 0 :
        t.status === filterStatus;

      const matchSearch = !q ? true : (
        t.profile?.full_name?.toLowerCase().includes(q) ||
        t.profile?.email?.toLowerCase().includes(q) ||
        t.messages.some(m => m.content?.toLowerCase().includes(q))
      );

      return matchStatus && matchSearch;
    });
  }, [threads, filterStatus, searchQuery]);

  const selectedThread = threads.find(t => t.userId === selectedUserId) || null;

  // Marquer comme lus les messages de la conversation ouverte
  useEffect(() => {
    if (!selectedThread) return;

    const unreadIds = selectedThread.messages
      .filter(m => m.receiver_id === SUPPORT_ACCOUNT_ID && !m.is_read)
      .map(m => m.id);

    if (unreadIds.length === 0) return;

    supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .then(({ error }) => {
        if (error) {
          console.error('Impossible de marquer les messages comme lus :', error);
          return;
        }
        setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true } : m));
        refreshNotifications();
      });
  }, [selectedUserId, selectedThread?.unread]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [selectedUserId, selectedThread?.messages.length]);

  const pairFor = (userId: string) => (
    SUPPORT_ACCOUNT_ID < userId
      ? { participant1_id: SUPPORT_ACCOUNT_ID, participant2_id: userId }
      : { participant1_id: userId, participant2_id: SUPPORT_ACCOUNT_ID }
  );

  const upsertStatus = async (userId: string, patch: Record<string, any>) => {
    setBusyAction(true);
    try {
      const payload: Record<string, any> = {
        ...pairFor(userId),
        ...patch,
        updated_at: new Date().toISOString()
      };

      // Sans migration, on ne peut piloter que l'ouverture/fermeture
      if (!schemaReady) {
        delete payload.status;
        delete payload.assigned_to;
        delete payload.assigned_at;
      }

      const { error } = await supabase
        .from('conversation_status')
        .upsert(payload, { onConflict: 'participant1_id,participant2_id' });

      if (error) throw error;

      setStatusRows(prev => ({
        ...prev,
        [userId]: { ...(prev[userId] || pairFor(userId)), ...payload }
      }));
    } catch (err) {
      console.error('Erreur mise à jour de la demande SAV :', err);
      alert("Impossible de mettre à jour la demande. Vérifiez que la migration admin_support_inbox.sql a bien été exécutée.");
    } finally {
      setBusyAction(false);
    }
  };

  const changeStatus = (userId: string, status: SupportStatus) => {
    const patch: Record<string, any> = { status };
    if (status === 'cloture') patch.is_closed = true;
    else patch.is_closed = false;
    if (status === 'cloture') patch.closed_by = currentUser?.id || null;
    return upsertStatus(userId, patch);
  };

  const assignToMe = (userId: string) => upsertStatus(userId, {
    assigned_to: currentUser?.id || null,
    assigned_at: new Date().toISOString(),
    status: selectedThread?.status === 'nouveau' ? 'en_cours' : selectedThread?.status,
    is_closed: selectedThread?.isClosed || false
  });

  const unassign = (userId: string) => upsertStatus(userId, {
    assigned_to: null,
    assigned_at: null,
    is_closed: selectedThread?.isClosed || false
  });

  const handleSendReply = async () => {
    if (!reply.trim() || !selectedThread) return;
    setSending(true);

    try {
      const { error } = await supabase.rpc('send_support_message', {
        p_receiver_id: selectedThread.userId,
        p_content: reply.trim()
      });

      if (error) throw error;

      // Affichage immédiat (le temps réel confirmera ensuite)
      setMessages(prev => [...prev, {
        id: `local-${Date.now()}`,
        sender_id: SUPPORT_ACCOUNT_ID,
        receiver_id: selectedThread.userId,
        content: reply.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      }]);
      setReply('');

      // Une demande nouvelle passe automatiquement "en cours" dès la première réponse
      if (selectedThread.status === 'nouveau' || selectedThread.isClosed) {
        await upsertStatus(selectedThread.userId, { status: 'en_cours', is_closed: false });
      }

      fetchData();
    } catch (err) {
      console.error('Erreur envoi réponse SAV :', err);
      alert("Erreur lors de l'envoi de la réponse.");
    } finally {
      setSending(false);
    }
  };

  const adminName = (id: string | null) => {
    if (!id) return null;
    const admin = admins.find(a => a.id === id);
    return admin?.full_name || 'Administrateur';
  };

  const statusBadge = (status: SupportStatus) => (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_STYLES[status]}`}>
      {SUPPORT_STATUS_LABELS[status]}
    </span>
  );

  const formatDate = (date: string) => new Date(date).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });

  const totalUnread = threads.reduce((acc, t) => acc + t.unread, 0);

  const tabs: { key: 'all' | SupportStatus | 'unread'; label: string; count: number }[] = [
    { key: 'all', label: 'Toutes', count: threads.length },
    { key: 'unread', label: 'Non lues', count: threads.filter(t => t.unread > 0).length },
    { key: 'nouveau', label: 'Nouvelles', count: threads.filter(t => t.status === 'nouveau').length },
    { key: 'en_cours', label: 'En cours', count: threads.filter(t => t.status === 'en_cours').length },
    { key: 'en_attente', label: 'En attente', count: threads.filter(t => t.status === 'en_attente').length },
    { key: 'cloture', label: 'Clôturées', count: threads.filter(t => t.status === 'cloture').length }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support SAV — Messages privés</h1>
          <p className="text-slate-500 text-sm mt-1">
            Toutes les demandes envoyées en message privé au compte <span className="font-bold">Support Frilya</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
            <MailOpen className="w-5 h-5 text-frilya-600" />
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wide">Non lus</p>
              <p className="text-lg font-bold text-slate-900 leading-none">{totalUnread}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
            <Inbox className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wide">Demandes</p>
              <p className="text-lg font-bold text-slate-900 leading-none">{threads.length}</p>
            </div>
          </div>
        </div>
      </div>

      {!schemaReady && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Migration SQL requise</p>
            <p>
              Exécutez <code className="font-mono bg-amber-100 px-1 rounded">admin_support_inbox.sql</code> dans
              l'éditeur SQL Supabase pour activer l'assignation et les statuts (en cours, en attente, clôturé).
              En attendant, seules la clôture et la réouverture des conversations sont disponibles.
            </p>
          </div>
        </div>
      )}

      {/* Onglets de filtre */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors flex items-center gap-2 ${
              filterStatus === tab.key
                ? 'bg-frilya-900 text-white border-frilya-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {tab.label}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              filterStatus === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-330px)] min-h-[520px]">

        {/* Liste des demandes */}
        <div className="w-full lg:w-1/3 xl:w-[380px] bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un utilisateur, un message..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-frilya-600 focus:ring-1 focus:ring-frilya-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-frilya-600" /></div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-medium">Aucune demande dans cette catégorie</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredThreads.map(thread => (
                  <button
                    key={thread.userId}
                    onClick={() => setSelectedUserId(thread.userId)}
                    className={`w-full text-left p-4 transition-colors flex gap-3 ${
                      selectedUserId === thread.userId
                        ? 'bg-frilya-50 border-l-4 border-frilya-600'
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={thread.profile?.avatar_url || catAvatar}
                        alt={thread.profile?.full_name || 'Utilisateur'}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                      {thread.unread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {thread.unread}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${thread.unread > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {thread.profile?.full_name || 'Utilisateur supprimé'}
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {thread.lastMessage?.created_at && formatDate(thread.lastMessage.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-1">
                        {thread.lastMessage?.sender_id === SUPPORT_ACCOUNT_ID && (
                          <span className="text-slate-400">Vous : </span>
                        )}
                        {thread.lastMessage?.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {statusBadge(thread.status)}
                        {thread.assignedTo && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            {thread.assignedTo === currentUser?.id ? 'Assignée à moi' : adminName(thread.assignedTo)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {!selectedThread ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
              <Inbox className="w-16 h-16 mb-4 text-slate-200" />
              <p className="font-medium">Sélectionnez une demande pour la traiter</p>
            </div>
          ) : (
            <>
              {/* En-tête + actions */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/80 shrink-0 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedThread.profile?.avatar_url || catAvatar}
                      alt={selectedThread.profile?.full_name || 'Utilisateur'}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-slate-900">{selectedThread.profile?.full_name || 'Utilisateur supprimé'}</h2>
                        {statusBadge(selectedThread.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>{selectedThread.profile?.email || 'Email inconnu'}</span>
                        {selectedThread.profile?.slug && (
                          <Link
                            to={`/profil/${selectedThread.profile.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-frilya-600 hover:underline font-medium"
                          >
                            Profil <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500">
                    {selectedThread.assignedTo ? (
                      <p className="font-bold text-slate-700">
                        Assignée à {selectedThread.assignedTo === currentUser?.id ? 'vous' : adminName(selectedThread.assignedTo)}
                      </p>
                    ) : (
                      <p className="italic">Non assignée</p>
                    )}
                    <p className="flex items-center gap-1 justify-end mt-1">
                      <Clock className="w-3 h-3" />
                      {selectedThread.messages.length} message(s)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedThread.assignedTo === currentUser?.id ? (
                    <button
                      onClick={() => unassign(selectedThread.userId)}
                      disabled={busyAction || !schemaReady}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      <UserMinus className="w-4 h-4" /> Me désassigner
                    </button>
                  ) : (
                    <button
                      onClick={() => assignToMe(selectedThread.userId)}
                      disabled={busyAction || !schemaReady}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-frilya-600 text-white hover:bg-frilya-500 transition-colors disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" /> M'assigner la demande
                    </button>
                  )}

                  <button
                    onClick={() => changeStatus(selectedThread.userId, 'en_cours')}
                    disabled={busyAction || !schemaReady || selectedThread.status === 'en_cours'}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4" /> Prendre en charge
                  </button>

                  <button
                    onClick={() => changeStatus(selectedThread.userId, 'en_attente')}
                    disabled={busyAction || !schemaReady || selectedThread.status === 'en_attente'}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <PauseCircle className="w-4 h-4" /> Mettre en attente
                  </button>

                  {selectedThread.status === 'cloture' || selectedThread.isClosed ? (
                    <button
                      onClick={() => changeStatus(selectedThread.userId, 'en_cours')}
                      disabled={busyAction}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" /> Réouvrir
                    </button>
                  ) : (
                    <button
                      onClick={() => changeStatus(selectedThread.userId, 'cloture')}
                      disabled={busyAction}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Clôturer la demande
                    </button>
                  )}
                </div>
              </div>

              {/* Fil de discussion */}
              <div ref={threadRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 custom-scrollbar">
                {selectedThread.messages.map(msg => {
                  const fromSupport = msg.sender_id === SUPPORT_ACCOUNT_ID;
                  return (
                    <div key={msg.id} className={`flex gap-3 ${fromSupport ? 'flex-row-reverse' : ''}`}>
                      <img
                        src={fromSupport ? supportAvatar : (selectedThread.profile?.avatar_url || catAvatar)}
                        alt={fromSupport ? 'Support Frilya' : selectedThread.profile?.full_name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div className={`max-w-[75%] ${fromSupport ? 'items-end text-right' : ''}`}>
                        <div className={`rounded-2xl p-3.5 shadow-sm ${
                          fromSupport
                            ? 'bg-frilya-600 text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap text-left">{msg.content}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {fromSupport ? 'Support Frilya' : (selectedThread.profile?.full_name || 'Utilisateur')} • {formatDate(msg.created_at)}
                          {!fromSupport && !msg.is_read && (
                            <span className="ml-2 text-red-500 font-bold">Non lu</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Réponse */}
              <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                {selectedThread.status === 'cloture' ? (
                  <div className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Demande clôturée. L'utilisateur ne peut plus répondre.
                    </p>
                    <button
                      onClick={() => changeStatus(selectedThread.userId, 'en_cours')}
                      disabled={busyAction}
                      className="text-xs font-bold text-frilya-600 hover:underline"
                    >
                      Réouvrir pour répondre
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:border-frilya-600 focus-within:ring-1 focus-within:ring-frilya-600">
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value)}
                      placeholder="Répondre à l'utilisateur en tant que Support Frilya..."
                      className="w-full min-h-[90px] p-4 text-sm outline-none resize-none"
                    />
                    <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-4">
                      <p className="text-xs text-slate-500">
                        Réponse envoyée en tant que <span className="font-bold">Support Frilya</span>
                      </p>
                      <button
                        onClick={handleSendReply}
                        disabled={sending || !reply.trim()}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-frilya-900 text-white text-sm font-bold hover:bg-frilya-800 transition-colors disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Répondre
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
