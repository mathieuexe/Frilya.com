import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { User, ShoppingBag, Store, MessageSquare, AlertTriangle, LifeBuoy, History, Save, Loader2, CreditCard, ArrowLeft, LogIn } from 'lucide-react';
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
  // const [disputes, setDisputes] = useState<any[]>([]);
  // const [tickets, setTickets] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Form states for info
  const [editForm, setEditForm] = useState<any>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

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
        // { data: disputesData },
        // { data: ticketsData },
        { data: logsData }
      ] = await Promise.all([
        supabase.from('orders').select('*, service:services(title)').eq('buyer_id', userId).order('created_at', { ascending: false }),
        supabase.from('orders').select('*, service:services(title)').eq('seller_id', userId).order('created_at', { ascending: false }),
        supabase.from('messages').select('*, sender:profiles!messages_sender_id_fkey(full_name), receiver:profiles!messages_receiver_id_fkey(full_name)').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }),
        // supabase.from('disputes').select('*, order:orders(id)').eq('opened_by', userId).order('created_at', { ascending: false }),
        // supabase.from('tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('connection_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      setOrders(ordersData || []);
      setSales(salesData || []);
      setMessages(messagesData || []);
      // setDisputes(disputesData || []);
      // setTickets(ticketsData || []);
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
      let avatarUrl = editForm.avatar_url;
      let bannerUrl = editForm.banner_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = publicUrlData.publicUrl;
      }

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${userId}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('banners').upload(fileName, bannerFile);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('banners').getPublicUrl(fileName);
        bannerUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
          bio: editForm.bio,
          balance: editForm.balance,
          is_seller: editForm.is_seller,
          role: editForm.role,
          avatar_url: avatarUrl,
          banner_url: bannerUrl
        })
        .eq('id', userId);
        
      if (error) throw error;

      // Envoyer un message de notification
      const messageContent = "Bonjour,\n\nUn administrateur a récemment mis à jour les informations de votre profil (Avatar, Bannière ou Biographie).\n\nSi vous n'êtes pas à l'origine de cette demande, veuillez nous contacter.\n\nCordialement,\nL'équipe Support Frilya";
      await supabase.rpc('send_support_message', {
        p_receiver_id: userId,
        p_content: messageContent
      });

      setProfile({ ...profile, ...editForm, avatar_url: avatarUrl, banner_url: bannerUrl });
      alert("Informations mises à jour avec succès.");
    } catch (err) {
      console.error("Erreur de sauvegarde", err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleImpersonate = async () => {
    if (!profile?.email) return;
    
    if (!confirm(`Voulez-vous vraiment vous connecter en tant que ${profile.full_name || profile.email} ? Vous serez redirigé.`)) {
      return;
    }

    setImpersonating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non autorisé");

      // Appeler notre fonction Vercel pour générer le Magic Link
      const res = await fetch('/api/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: profile.email,
          redirectTo: window.location.origin + '/tableau-de-bord'
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Erreur de connexion");
      }

      if (data.url) {
        // Rediriger vers l'URL générée qui va logguer l'admin en tant que l'utilisateur
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Erreur d'impersonation", err);
      alert(err.message || "Impossible de se connecter en tant que cet utilisateur.");
      setImpersonating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl w-full flex items-center justify-center shadow-sm border border-slate-200 h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-frilya-600" />
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
    <div className="bg-white rounded-3xl w-full flex flex-col shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-200 h-[calc(100vh-8rem)]">
      
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2.5 text-slate-500 hover:text-frilya-600 hover:bg-white rounded-xl transition-colors shadow-sm border border-slate-200 bg-white mr-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
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
          <div className="text-right hidden md:block">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Solde Actuel</div>
            <div className="text-xl font-bold text-frilya-600 flex items-center gap-1">
              <CreditCard className="w-4 h-4" />
              {profile?.balance || 0} €
            </div>
          </div>
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
                <div className="md:col-span-2 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                    {avatarFile ? (
                      <img src={URL.createObjectURL(avatarFile)} alt="Nouvel avatar" className="w-full h-full object-cover" />
                    ) : editForm.avatar_url ? (
                      <img src={editForm.avatar_url} alt="Avatar actuel" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Aucun</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avatar</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => setAvatarFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Bannière</label>
                  {editForm.banner_url && !bannerFile && (
                    <div className="h-20 w-full rounded-xl overflow-hidden mb-2 border border-slate-200">
                      <img src={editForm.banner_url} alt="Bannière actuelle" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {bannerFile && (
                    <div className="h-20 w-full rounded-xl overflow-hidden mb-2 border border-slate-200">
                      <img src={URL.createObjectURL(bannerFile)} alt="Nouvelle bannière" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setBannerFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                </div>

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
              
              <div className="pt-4 border-t mt-4 flex items-center justify-between">
                <button onClick={handleSaveInfo} disabled={saving} className="flex items-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Sauvegarder les modifications
                </button>
                <button 
                  onClick={handleImpersonate} 
                  disabled={impersonating} 
                  className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                  title="Se connecter au compte de cet utilisateur"
                >
                  {impersonating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  Se connecter en tant que...
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
  );
}
