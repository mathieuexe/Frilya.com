import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { User, ShoppingBag, Store, MessageSquare, AlertTriangle, LifeBuoy, History, Save, Loader2, CreditCard, ArrowLeft, LogIn, Star, Edit, Trash2, Plus } from 'lucide-react';
import catAvatar from '../../../assets/cat.png';

interface UserDossierProps {
  userId: string;
  onClose: () => void;
}

type Tab = 'info' | 'orders' | 'sales' | 'messages' | 'disputes' | 'tickets' | 'logs' | 'reviews';

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
  const [reviews, setReviews] = useState<any[]>([]);
  const [userServices, setUserServices] = useState<any[]>([]);

  // Reviews forms
  const [showAddReview, setShowAddReview] = useState(false);
  const [newReview, setNewReview] = useState({ service_id: '', rating: 5, comment: '' });
  const [editingReview, setEditingReview] = useState<any>(null);

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
        { data: messagesRawData },
        { data: reviewsData },
        { data: servicesData },
        // { data: disputesData },
        // { data: ticketsData },
        { data: logsData }
      ] = await Promise.all([
        supabase.from('orders').select('*, service:services(title)').eq('buyer_id', userId).order('created_at', { ascending: false }),
        supabase.from('orders').select('*, service:services(title)').eq('seller_id', userId).order('created_at', { ascending: false }),
        supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, buyer:profiles!reviews_buyer_id_fkey(id, full_name, avatar_url), service:services(id, title)').or(`seller_id.eq.${userId},buyer_id.eq.${userId}`).order('created_at', { ascending: false }),
        supabase.from('services').select('id, title').eq('seller_id', userId).eq('status', 'active'),
        // supabase.from('disputes').select('*, order:orders(id)').eq('opened_by', userId).order('created_at', { ascending: false }),
        // supabase.from('tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('connection_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      ]);

      let finalMessages = [];
      if (messagesRawData && messagesRawData.length > 0) {
        const userIds = new Set<string>();
        messagesRawData.forEach((m: any) => {
          userIds.add(m.sender_id);
          userIds.add(m.receiver_id);
        });
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(userIds));
          
        const profileMap = new Map();
        profiles?.forEach(p => profileMap.set(p.id, p));
        
        finalMessages = messagesRawData.map((m: any) => ({
          ...m,
          sender: profileMap.get(m.sender_id),
          receiver: profileMap.get(m.receiver_id)
        }));
      }

      setOrders(ordersData || []);
      setSales(salesData || []);
      setMessages(finalMessages);
      setReviews(reviewsData || []);
      setUserServices(servicesData || []);
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
          banner_url: bannerUrl,
          is_beta: editForm.is_beta,
          is_verified: editForm.is_verified
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

  const handleAddReview = async () => {
    if (!newReview.service_id || !newReview.comment) {
      alert("Veuillez sélectionner un service et écrire un commentaire.");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non autorisé");
      
      const { error } = await supabase.from('reviews').insert([{
        service_id: newReview.service_id,
        seller_id: userId,
        buyer_id: session.user.id,
        rating: newReview.rating,
        comment: newReview.comment
      }]);
      
      if (error) throw error;
      
      alert("Avis ajouté avec succès !");
      setShowAddReview(false);
      setNewReview({ service_id: '', rating: 5, comment: '' });
      fetchUserData();
    } catch (err) {
      console.error("Erreur ajout avis:", err);
      alert("Erreur lors de l'ajout de l'avis.");
    }
  };

  const handleUpdateReview = async () => {
    if (!editingReview) return;
    try {
      const { error } = await supabase.from('reviews').update({
        rating: editingReview.rating,
        comment: editingReview.comment
      }).eq('id', editingReview.id);
      
      if (error) throw error;
      
      alert("Avis modifié avec succès !");
      setEditingReview(null);
      fetchUserData();
    } catch (err) {
      console.error("Erreur modification avis:", err);
      alert("Erreur lors de la modification de l'avis.");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet avis ?")) return;
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
      if (error) throw error;
      alert("Avis supprimé avec succès !");
      fetchUserData();
    } catch (err) {
      console.error("Erreur suppression avis:", err);
      alert("Erreur lors de la suppression de l'avis.");
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
    { id: 'reviews', name: 'Avis', icon: Star },
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

              <div className="mt-6">
                <h4 className="font-bold text-sm text-slate-900 mb-3 uppercase tracking-wider">Badges & Certifications</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={editForm.is_verified || false} 
                      onChange={e => setEditForm({...editForm, is_verified: e.target.checked})}
                      className="w-5 h-5 text-frilya-600 rounded border-slate-300 focus:ring-frilya-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1">
                        Compte Vérifié
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-7.9 7.9z"/>
                        </svg>
                      </div>
                      <div className="text-xs text-slate-500">Affiche le badge bleu certifié</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={editForm.is_beta || false} 
                      onChange={e => setEditForm({...editForm, is_beta: e.target.checked})}
                      className="w-5 h-5 text-frilya-600 rounded border-slate-300 focus:ring-frilya-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1">
                        Bêta-testeur
                        <div className="w-4 h-4 bg-frilya-900 text-white rounded-full flex items-center justify-center text-[8px] font-bold">β</div>
                      </div>
                      <div className="text-xs text-slate-500">Affiche le badge de participation à la Bêta</div>
                    </div>
                  </label>
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

          {/* TAB: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {profile?.is_seller && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowAddReview(!showAddReview)}
                    className="flex items-center gap-2 bg-frilya-900 hover:bg-frilya-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un avis (Support Frilya)
                  </button>
                </div>
              )}

              {showAddReview && (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4">
                  <h3 className="font-bold text-lg text-slate-900">Nouvel avis</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Service concerné</label>
                    <select 
                      value={newReview.service_id} 
                      onChange={e => setNewReview({...newReview, service_id: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-frilya-600"
                    >
                      <option value="">Sélectionner un service...</option>
                      {userServices.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Note ({newReview.rating}/5)</label>
                    <input 
                      type="range" min="1" max="5" 
                      value={newReview.rating} 
                      onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Commentaire</label>
                    <textarea 
                      value={newReview.comment} 
                      onChange={e => setNewReview({...newReview, comment: e.target.value})}
                      rows={3} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-frilya-600" 
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAddReview(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Annuler</button>
                    <button onClick={handleAddReview} className="px-4 py-2 text-sm font-bold bg-frilya-600 hover:bg-frilya-500 text-white rounded-lg">Ajouter</button>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? <p className="text-center text-slate-500 py-8">Aucun avis trouvé</p> : reviews.map(r => (
                <div key={r.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  {editingReview?.id === r.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Note ({editingReview.rating}/5)</label>
                        <input 
                          type="range" min="1" max="5" 
                          value={editingReview.rating} 
                          onChange={e => setEditingReview({...editingReview, rating: Number(e.target.value)})}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Commentaire</label>
                        <textarea 
                          value={editingReview.comment} 
                          onChange={e => setEditingReview({...editingReview, comment: e.target.value})}
                          rows={3} 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-frilya-600" 
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingReview(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Annuler</button>
                        <button onClick={handleUpdateReview} className="px-4 py-2 text-sm font-bold bg-frilya-600 hover:bg-frilya-500 text-white rounded-lg">Enregistrer</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <img src={r.buyer?.avatar_url || catAvatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
                          <div>
                            <div className="font-bold text-slate-900">{r.buyer?.full_name || 'Utilisateur inconnu'}</div>
                            <div className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()} • {r.service?.title}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-amber-700">{r.rating}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditingReview(r)} className="p-1.5 text-slate-400 hover:text-frilya-600 hover:bg-slate-50 rounded-lg transition-colors" title="Modifier">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteReview(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl">{r.comment}</p>
                      <div className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {r.seller_id === userId ? 'Avis reçu' : 'Avis laissé'}
                      </div>
                    </>
                  )}
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
