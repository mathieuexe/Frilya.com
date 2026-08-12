import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, User, ShoppingBag, Store, MessageSquare, AlertTriangle, LifeBuoy, History, Save, Loader2, CreditCard } from 'lucide-react';
import catAvatar from '../../../assets/cat.png';

interface UserDossierProps {
  userId: string;
  onClose: () => void;
}

type Tab = 'info' | 'orders' | 'sales' | 'messages' | 'disputes' | 'tickets' | 'logs';

export default function UserDossier({ userId, onClose }: UserDossierProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Form states for info
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profileData) {
        setProfile(profileData);
        setEditForm(profileData);
      }

      // Fetch other data in parallel
      const [
        { data: ordersData },
        { data: salesData },
        { data: messagesData },
        { data: disputesData },
        { data: ticketsData },
        { data: logsData }
      ] = await Promise.all([
        supabase.from('orders').select('*, service:services(title)').eq('buyer_id', userId).order('created_at', { ascending: false }),
        supabase.from('orders').select('*, service:services(title)').eq('seller_id', userId).order('created_at', { ascending: false }),
        supabase.from('messages').select('*, sender:profiles!messages_sender_id_fkey(full_name), receiver:profiles!messages_receiver_id_fkey(full_name)').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }),
        supabase.from('disputes').select('*, order:orders(id)').eq('opened_by', userId).order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('connection_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      setOrders(ordersData || []);
      setSales(salesData || []);
      setMessages(messagesData || []);
      setDisputes(disputesData || []);
      setTickets(ticketsData || []);
      setLogs(logsData || []);

    } catch (err) {
      console.error("Erreur de chargement du dossier", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          bio: editForm.bio,
          balance: editForm.balance,
          is_seller: editForm.is_seller,
          role: editForm.role
        })
        .eq('id', userId);
        
      if (error) throw error;
      setProfile({ ...profile, ...editForm });
      alert("Informations mises à jour avec succès.");
    } catch (err) {
      console.error("Erreur de sauvegarde", err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 flex items-center justify-center shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'info', name: 'Infos', icon: User },
    { id: 'orders', name: 'Commandes', icon: ShoppingBag },
    { id: 'sales', name: 'Ventes', icon: Store, hidden: !profile?.is_seller },
    { id: 'messages', name: 'Messages', icon: MessageSquare },
    { id: 'disputes', name: 'Litiges', icon: AlertTriangle },
    { id: 'tickets', name: 'SAV', icon: LifeBuoy },
    { id: 'logs', name: 'Connexions', icon: History }
  ].filter(t => !t.hidden);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6">
      <div className="bg-white rounded-3xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-4">
            <img src={profile?.avatar_url || catAvatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">{profile?.full_name || 'Utilisateur inconnu'}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{profile?.email}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${profile?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`}>
                  {profile?.role}
                </span>
                {profile?.is_seller && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Vendeur</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right mr-4 hidden md:block">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Solde Actuel</div>
              <div className="text-xl font-bold text-frilya-600 flex items-center gap-1">
                <CreditCard className="w-4 h-4" />
                {profile?.balance || 0} €
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-100 px-6 shrink-0 custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'border-frilya-600 text-frilya-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
          
          {/* TAB: INFO */}
          {activeTab === 'info' && (
            <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-slate-900 mb-4 border-b pb-2">Informations Personnelles</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nom Complet</label>
                  <input type="text" value={editForm.full_name || ''} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-frilya-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                  <input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-frilya-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rôle</label>
                  <select value={editForm.role || ''} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-frilya-600">
                    <option value="acheteur">Acheteur</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Est Vendeur ?</label>
                  <select value={editForm.is_seller ? 'true' : 'false'} onChange={e => setEditForm({...editForm, is_seller: e.target.value === 'true'})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-frilya-600">
                    <option value="false">Non</option>
                    <option value="true">Oui</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Solde (€)</label>
                  <input type="number" value={editForm.balance || 0} onChange={e => setEditForm({...editForm, balance: Number(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-frilya-600 focus:outline-none focus:border-frilya-600" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bio</label>
                  <textarea value={editForm.bio || ''} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows={3} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-frilya-600" />
                </div>
              </div>
              
              <div className="pt-4 border-t mt-4">
                <button onClick={handleSaveInfo} disabled={saving} className="flex items-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Sauvegarder les modifications
                </button>
              </div>
            </div>
          )}

          {/* TAB: ORDERS */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4 font-semibold">ID Commande</th>
                    <th className="p-4 font-semibold">Service</th>
                    <th className="p-4 font-semibold">Montant</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucune commande</td></tr> : orders.map(o => (
                    <tr key={o.id}>
                      <td className="p-4 font-mono text-xs">{o.id.split('-')[0]}...</td>
                      <td className="p-4">{o.service?.title || 'Service inconnu'}</td>
                      <td className="p-4 font-bold">{o.amount} €</td>
                      <td className="p-4">{new Date(o.created_at).toLocaleDateString()}</td>
                      <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: SALES */}
          {activeTab === 'sales' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4 font-semibold">ID Vente</th>
                    <th className="p-4 font-semibold">Service</th>
                    <th className="p-4 font-semibold">Montant (Net)</th>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucune vente</td></tr> : sales.map(s => (
                    <tr key={s.id}>
                      <td className="p-4 font-mono text-xs">{s.id.split('-')[0]}...</td>
                      <td className="p-4">{s.service?.title || 'Service inconnu'}</td>
                      <td className="p-4 font-bold text-green-600">{s.amount - s.platform_fee} €</td>
                      <td className="p-4">{new Date(s.created_at).toLocaleDateString()}</td>
                      <td className="p-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{s.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: MESSAGES */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              {messages.length === 0 ? <p className="text-center text-slate-500 py-8">Aucun message</p> : messages.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-bold text-slate-500">
                      De: <span className="text-slate-900">{m.sender?.full_name}</span> &rarr; À: <span className="text-slate-900">{m.receiver?.full_name}</span>
                    </div>
                    <div className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{m.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* TAB: LOGS */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Action</th>
                    <th className="p-4 font-semibold">IP</th>
                    <th className="p-4 font-semibold">Appareil / Navigateur</th>
                    <th className="p-4 font-semibold">Localisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucun log enregistré</td></tr> : logs.map(l => (
                    <tr key={l.id}>
                      <td className="p-4 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                      <td className="p-4 font-bold text-slate-700">{l.connection_type}</td>
                      <td className="p-4 font-mono text-xs">{l.ip_address}</td>
                      <td className="p-4 text-xs text-slate-600">{l.device_type} - {l.browser}</td>
                      <td className="p-4 text-xs text-slate-600">{l.city} ({l.isp})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB: TICKETS & DISPUTES */}
          {(activeTab === 'tickets' || activeTab === 'disputes') && (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-500">
              Module en cours de finalisation (données affichées si existantes dans la DB).
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
