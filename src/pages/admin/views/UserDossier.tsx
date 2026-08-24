import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  User, ShoppingBag, Store, MessageSquare, AlertTriangle, LifeBuoy, History, 
  Save, Loader2, CreditCard, ArrowLeft, LogIn, Star, Edit, Trash2, Plus, 
  ExternalLink, Download, Mail, CheckCircle, Clock, ShieldAlert, Camera, MapPin, Monitor, Lock, Eye, X, Ticket, Activity
} from 'lucide-react';
import catAvatar from '../../../assets/cat.png';
import verifiedIcon from '../../../assets/verified.png';
import secureIcon from '../../../assets/secure.png';
import { generateInvoiceBase64, downloadInvoice } from '../../../lib/invoice';
import type { InvoiceData } from '../../../lib/invoice';
import { formatOrderId, formatInvoiceId } from '../../../lib/formatUtils';

interface UserDossierProps {
  userId: string;
  onClose: () => void;
}

type Tab = 'info' | 'orders' | 'sales' | 'messages' | 'disputes' | 'tickets' | 'logs' | 'reviews' | 'emails';

import ImageCropper from '../../../components/ImageCropper';
import { SUPPORT_ACCOUNT_ID } from '../../../lib/constants';

import googleLogo from '../../../assets/google-logo-icon-gsuite-hd-701751694791470gzbayltphh.png';

export default function UserDossier({ userId, onClose }: UserDossierProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userServices, setUserServices] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [sendingDuplicateId, setSendingDuplicateId] = useState<string | null>(null);

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

  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [cropState, setCropState] = useState<{ url: string, type: 'avatar' | 'banner' } | null>(null);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'sales') {
      setLoadingOrders(true);
      setTimeout(() => setLoadingOrders(false), 500); // Simulate loading
    }
  }, [activeTab]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profileData) {
        setProfile(profileData);
        setEditForm(profileData);
      }

      const [
        { data: ordersData },
        { data: salesData },
        { data: messagesRawData },
        { data: reviewsData },
        { data: servicesData },
        { data: logsData },
        { data: emailsData },
        { data: ticketsData }
      ] = await Promise.all([
        supabase.from('orders').select('*, service:services(title), buyer:profiles!orders_buyer_id_fkey(full_name, email), seller:profiles!orders_seller_id_fkey(full_name, email)').eq('buyer_id', userId).order('created_at', { ascending: false }),
        supabase.from('orders').select('*, service:services(title), buyer:profiles!orders_buyer_id_fkey(full_name, email), seller:profiles!orders_seller_id_fkey(full_name, email)').eq('seller_id', userId).order('created_at', { ascending: false }),
        supabase.from('messages').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, buyer:profiles!reviews_buyer_id_fkey(id, full_name, avatar_url), service:services(id, title)').or(`seller_id.eq.${userId},buyer_id.eq.${userId}`).order('created_at', { ascending: false }),
        supabase.from('services').select('id, title').eq('seller_id', userId).eq('status', 'active'),
        supabase.from('connection_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('email_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('report_tickets').select('*').eq('reporter_id', userId).order('created_at', { ascending: false })
      ]);

      let finalMessages = [];
      if (messagesRawData && messagesRawData.length > 0) {
        const userIds = new Set<string>();
        messagesRawData.forEach((m: any) => {
          userIds.add(m.sender_id);
          userIds.add(m.receiver_id);
        });
        
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', Array.from(userIds));
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
      setLogs(logsData || []);
      setEmailLogs(emailsData || []);
      setTickets(ticketsData || []);

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

      const messageContent = "Bonjour,\n\nUn administrateur a récemment mis à jour les informations de votre profil.\n\nSi vous n'êtes pas à l'origine de cette demande, veuillez nous contacter.\n\nCordialement,\nL'équipe Support Frilya";
      await supabase.rpc('send_support_message', {
        p_receiver_id: userId,
        p_content: messageContent
      });

      setProfile({ ...profile, ...editForm, avatar_url: avatarUrl, banner_url: bannerUrl });
      alert("Informations mises à jour avec succès.");
      setAvatarFile(null);
      setBannerFile(null);
    } catch (err) {
      console.error("Erreur de sauvegarde", err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleImpersonate = async () => {
    if (!profile?.email) return;
    if (!confirm(`Voulez-vous vraiment vous connecter en tant que ${profile.full_name || profile.email} ? Vous serez redirigé.`)) return;

    setImpersonating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non autorisé");

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
      if (!res.ok) throw new Error(data.error || "Erreur de connexion");

      if (data.url) {
        // Save current admin session to be able to return
        sessionStorage.setItem('admin_recovery_session', JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          email: profile.email
        }));
        
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

  const handleDownloadDuplicate = async (order: any) => {
    try {
      const data: InvoiceData = {
        order,
        serviceTitle: order.service?.title || 'Service',
        sellerName: order.seller?.full_name || 'Vendeur',
        buyerName: order.buyer?.full_name || 'Acheteur',
        buyerEmail: order.buyer?.email,
        isDuplicate: true
      };
      await downloadInvoice(data);
    } catch (err) {
      console.error('Erreur download duplicata:', err);
      alert('Erreur lors de la génération du duplicata.');
    }
  };

  const handleSendDuplicateEmail = async (order: any) => {
    if (!order.seller?.email) {
      alert("Le vendeur n'a pas d'adresse e-mail renseignée.");
      return;
    }
    setSendingDuplicateId(order.id);
    try {
      const data: InvoiceData = {
        order,
        serviceTitle: order.service?.title || 'Service',
        sellerName: order.seller?.full_name || 'Vendeur',
        buyerName: order.buyer?.full_name || 'Acheteur',
        buyerEmail: order.buyer?.email,
        isDuplicate: true
      };
      
      const base64Pdf = await generateInvoiceBase64(data);
      const invoiceRef = formatInvoiceId(order.id);

      const emailHtml = `
        <p>Bonjour ${order.seller.full_name},</p>
        <p>Suite à votre demande, veuillez trouver ci-joint un duplicata de votre facture <strong>${invoiceRef}</strong>.</p>
        <p>Vous souhaitant bonne réception,</p>
        <p>L’équipe d’assistance Frilya</p>
      `;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [order.seller.email],
          subject: `Duplicata de votre facture ${invoiceRef}`,
          html: emailHtml,
          attachments: [{ filename: `${invoiceRef}_DUPLICATA.pdf`, content: base64Pdf }]
        })
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("text/html") !== -1) {
        throw new Error("L'API d'email n'est pas disponible en local sans Vercel CLI. Veuillez tester sur la version déployée (Vercel) ou utiliser 'vercel dev'.");
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error?.message || 'Erreur API email');
      }
      
      alert('Le duplicata a été envoyé par e-mail avec succès.');
    } catch (err: any) {
      console.error('Erreur envoi email duplicata:', err);
      alert(err.message || "Une erreur est survenue lors de l'envoi de l'e-mail.");
    } finally {
      setSendingDuplicateId(null);
    }
  };

  const handleResetAction = async (action: 'temp_password' | 'reset_link') => {
    if (!confirm(`Voulez-vous vraiment effectuer cette action (${action === 'temp_password' ? 'Générer mot de passe temporaire' : 'Lien de réinitialisation'}) ?`)) return;
    
    setResetLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non autorisé");

      const res = await fetch('/api/admin-reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: userId,
          email: profile.email,
          pseudo: profile.full_name || 'Utilisateur',
          action: action
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'action");

      if (action === 'temp_password' && data.tempPassword) {
        // Appeler la nouvelle fonction de lib/email.ts
        const { sendAdminTempPasswordEmail } = await import('../../../lib/email');
        await sendAdminTempPasswordEmail(profile.email, profile.full_name || 'Utilisateur', data.tempPassword);
        alert(`Nouveau mot de passe généré (${data.tempPassword}) et envoyé par email !`);
      } else if (action === 'reset_link' && data.resetLink) {
        const { sendAdminResetLinkEmail } = await import('../../../lib/email');
        await sendAdminResetLinkEmail(profile.email, profile.full_name || 'Utilisateur', data.resetLink);
        alert("Lien de réinitialisation généré et envoyé par email !");
      }
      
      // Rafraîchir l'historique des emails
      fetchUserData();
    } catch (err: any) {
      console.error("Erreur réinitialisation:", err);
      alert(err.message || "Erreur lors de la réinitialisation");
    } finally {
      setResetLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente', in_progress: 'En cours', delivered: 'Livrée',
      completed: 'Terminée', cancelled: 'Annulée', refunded: 'Remboursée'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen w-full flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-frilya-600" />
      </div>
    );
  }

  const tabs = [
    { id: 'info', name: 'Vue d\'ensemble', icon: User },
    { id: 'orders', name: 'Achats', icon: ShoppingBag },
    { id: 'sales', name: 'Ventes', icon: Store, hidden: !profile?.is_seller },
    { id: 'messages', name: 'Messages', icon: MessageSquare },
    { id: 'reviews', name: 'Avis', icon: Star },
    { id: 'disputes', name: 'Litiges', icon: AlertTriangle },
    { id: 'tickets', name: 'Support', icon: LifeBuoy },
    { id: 'emails', name: 'Historique des e-mails', icon: Mail },
    { id: 'logs', name: 'Journal', icon: History }
  ].filter(t => !t.hidden);

  const stats = {
    totalSpent: orders.reduce((sum, o) => sum + (o.amount || 0), 0),
    totalEarned: sales.reduce((sum, o) => sum + ((o.amount || 0) - (o.platform_fee || 0)), 0),
    avgRating: reviews.filter(r => r.seller_id === userId).reduce((sum, r, _, arr) => sum + r.rating / arr.length, 0) || 0,
    joinDate: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '-'
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Les admins gardent le bypass pour les GIFs animés
      if (profile?.role === 'admin' && file.type === 'image/gif') {
        if (type === 'avatar') setAvatarFile(file);
        else setBannerFile(file);
        e.target.value = '';
        return;
      }

      const url = URL.createObjectURL(file);
      setCropState({ url, type });
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    if (!cropState) return;
    const file = new File([croppedBlob], `cropped_${cropState.type}.jpg`, { type: 'image/jpeg' });
    if (cropState.type === 'avatar') setAvatarFile(file);
    else setBannerFile(file);
    URL.revokeObjectURL(cropState.url);
    setCropState(null);
  };

  const handleCropCancel = () => {
    if (cropState) {
      URL.revokeObjectURL(cropState.url);
      setCropState(null);
    }
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button onClick={onClose} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-fit">
          <ArrowLeft className="w-4 h-4" />
          Retour à la liste
        </button>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleImpersonate} 
            disabled={impersonating}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {impersonating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Se connecter
          </button>
          <button 
            onClick={handleSaveInfo} 
            disabled={saving} 
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </div>

      {/* Profil Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Banner Area */}
        <div className="h-32 md:h-48 w-full bg-slate-100 relative group border-b border-slate-200">
          {bannerFile ? (
            <img src={URL.createObjectURL(bannerFile)} className="w-full h-full object-cover" />
          ) : (
            profile?.banner_url ? (
              <img src={profile.banner_url} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-50 to-indigo-50" />
            )
          )}
          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center text-white">
            <Camera className="w-6 h-6 mr-2" />
            <span className="font-semibold">Modifier la bannière</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'banner')} />
          </label>
        </div>
        
        <div className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6 relative">
          <div className="relative shrink-0 group -mt-16 md:-mt-20">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-white bg-slate-100 overflow-hidden relative shadow-md">
              {avatarFile ? (
                <img src={URL.createObjectURL(avatarFile)} className="w-full h-full object-cover" />
              ) : (
                <img src={profile?.avatar_url || catAvatar} className="w-full h-full object-cover" />
              )}
              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center text-white">
                 <Camera className="w-5 h-5" />
                 <input type="file" accept="image/*" className="hidden" onChange={e => handleFileSelect(e, 'avatar')} />
              </label>
            </div>
            {profile?.is_verified && (
              <div className="absolute bottom-0 -right-2 bg-white rounded-full p-0.5 shadow-sm border border-slate-100 flex items-center justify-center">
                <img src={verifiedIcon} alt="Vérifié" className="w-4 h-4" />
              </div>
            )}
            {profile?.role === 'admin' && (
              <div className="absolute bottom-0 right-6 bg-white rounded-full p-0.5 shadow-sm border border-slate-100 flex items-center justify-center group cursor-pointer z-10">
                <img src={secureIcon} alt="Officiel" className="w-4 h-4" />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 text-center font-normal">
                  Ce compte est certifié car il s'agit d'un compte officiel de l'équipe Frilya.
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 mt-2 md:mt-0">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {profile?.full_name || 'Utilisateur inconnu'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
               <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {profile?.email}</span>
               <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-400" /> Inscrit en {stats.joinDate}</span>
               <span className="flex items-center gap-1.5" title="Dernière connexion">
                 <Activity className="w-4 h-4 text-slate-400" />
                 {(profile?.last_seen || profile?.created_at) ? new Date(profile.last_seen || profile.created_at).toLocaleString('fr-FR', {
                   day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                 }) : 'Inconnu'}
               </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
               {profile?.auth_provider === 'google' && (
                 <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white text-slate-700 border border-slate-200 flex items-center gap-1.5 shadow-sm">
                   <img src={googleLogo} alt="Google" className="w-3.5 h-3.5 object-contain" />
                   Login via google
                 </span>
               )}
               {profile?.is_seller && <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1"><Store className="w-3 h-3"/> Vendeur</span>}
               {profile?.role === 'admin' && <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Admin</span>}
               {profile?.is_beta && <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-900 text-white border border-slate-700 flex items-center gap-1">β Bêta</span>}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
             <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Solde Actuel</div>
            <div className="text-xl font-black text-slate-900">{profile?.balance || 0} €</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
             <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Achats ({orders.length})</div>
            <div className="text-xl font-black text-slate-900">{stats.totalSpent.toFixed(2)} €</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
             <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Ventes Net ({sales.length})</div>
            <div className="text-xl font-black text-slate-900">{stats.totalEarned.toFixed(2)} €</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
             <Star className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Note Moyenne</div>
            <div className="text-xl font-black text-slate-900 flex items-center gap-1.5">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'} <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap border ${
              activeTab === tab.id 
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-slate-300' : 'text-slate-400'}`} />
            {tab.name}
          </button>
        ))}
      </div>

        {/* Content Area */}
        <div className="animate-in slide-in-from-bottom-4 duration-300">
          
          {cropState && (
            <ImageCropper
              image={cropState.url}
              aspect={cropState.type === 'avatar' ? 1 : 16 / 5}
              shape={cropState.type === 'avatar' ? 'round' : 'rect'}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
            />
          )}

          {/* TAB: INFO */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Informations Générales */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <h3 className="font-semibold text-slate-800">Informations Générales</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom Complet</label>
                      <input type="text" value={editForm.full_name || ''} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Solde du compte (€)</label>
                      <input type="number" value={editForm.balance || 0} onChange={e => setEditForm({...editForm, balance: Number(e.target.value)})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Biographie</label>
                      <textarea value={editForm.bio || ''} onChange={e => setEditForm({...editForm, bio: e.target.value})} rows={3} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow resize-none" placeholder="Description de l'utilisateur..." />
                    </div>
                  </div>
                </div>

                {/* Informations Bancaires */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <h3 className="font-semibold text-slate-800">Coordonnées Bancaires</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Bénéficiaire</label>
                      <input type="text" value={editForm.beneficiary_name || ''} readOnly className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 outline-none cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Banque</label>
                      <input type="text" value={editForm.bank_name || ''} readOnly className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 outline-none cursor-not-allowed" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">IBAN</label>
                      <input type="text" value={editForm.iban || ''} readOnly className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-mono outline-none cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">BIC</label>
                      <input type="text" value={editForm.bic || ''} readOnly className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-mono outline-none cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut du RIB</label>
                      <div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm flex items-center">
                        {editForm.rib_status === 'approved' ? (
                          <span className="text-emerald-600 font-medium flex items-center gap-1.5"><CheckCircle className="w-4 h-4"/> Validé</span>
                        ) : editForm.rib_status === 'pending' ? (
                          <span className="text-amber-600 font-medium flex items-center gap-1.5"><Clock className="w-4 h-4"/> En attente</span>
                        ) : editForm.rib_status === 'rejected' ? (
                          <span className="text-red-600 font-medium flex items-center gap-1.5"><AlertTriangle className="w-4 h-4"/> Refusé</span>
                        ) : (
                          <span className="text-slate-400">Aucun RIB soumis</span>
                        )}
                      </div>
                    </div>
                    {editForm.rib_file_url && (
                      <div className="md:col-span-2 pt-2">
                        <a href={editForm.rib_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm">
                          <ExternalLink className="w-4 h-4" />
                          Consulter le document RIB
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Settings & Status */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                    <h3 className="font-semibold text-slate-800">Paramètres du Compte</h3>
                  </div>
                  <div className="p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Rôle d'accès
                        {editForm.role === 'admin' && <img src={secureIcon} alt="Officiel" className="w-4 h-4" />}
                      </label>
                      <select value={editForm.role || ''} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow">
                        <option value="acheteur">Utilisateur Standard</option>
                        <option value="admin">Administrateur (Badge Officiel)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut Vendeur</label>
                      <select value={editForm.is_seller ? 'true' : 'false'} onChange={e => setEditForm({...editForm, is_seller: e.target.value === 'true'})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow">
                        <option value="false">Non (Acheteur uniquement)</option>
                        <option value="true">Oui (Vendeur activé)</option>
                      </select>
                    </div>

                    <div className="pt-5 border-t border-slate-100 space-y-3">
                      <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={editForm.is_verified || false} 
                          onChange={e => setEditForm({...editForm, is_verified: e.target.checked})}
                          className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-slate-800 text-sm flex items-center gap-1.5">
                            Badge Authentique (Vérifié)
                            <img src={verifiedIcon} alt="Vérifié" className="w-4 h-4" />
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">Affiche le badge de certification authentique à côté du pseudo</div>
                        </div>
                      </label>

                      <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={editForm.is_beta || false} 
                          onChange={e => setEditForm({...editForm, is_beta: e.target.checked})}
                          className="mt-0.5 w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                        />
                        <div>
                          <div className="font-medium text-slate-800 text-sm flex items-center gap-1.5">
                            Bêta-testeur
                            <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">BÊTA</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">Accès prioritaire aux nouveautés</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Section Sécurité / Mot de passe */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                    <h3 className="font-semibold text-slate-800">Sécurité</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-sm text-slate-600 mb-3">Pour des raisons de sécurité, les mots de passe sont cryptés et invisibles. Vous pouvez toutefois forcer une réinitialisation :</p>
                      
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => handleResetAction('reset_link')}
                          disabled={resetLoading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                          {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                          Envoyer un lien de réinitialisation
                        </button>
                        
                        <button
                          onClick={() => handleResetAction('temp_password')}
                          disabled={resetLoading}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-frilya-900 hover:bg-frilya-800 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                          {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                          Générer un mot de passe temporaire
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ORDERS & SALES */}
          {(activeTab === 'orders' || activeTab === 'sales') && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                  {activeTab === 'orders' ? <ShoppingBag className="w-5 h-5 text-slate-500"/> : <Store className="w-5 h-5 text-slate-500"/>}
                  {activeTab === 'orders' ? 'Historique des Achats' : 'Historique des Ventes'}
                </h3>
                <span className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                  {(activeTab === 'orders' ? orders : sales).length} transactions
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {loadingOrders ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-frilya-600 mb-4" />
                    <p className="text-sm font-medium text-slate-500">Chargement des transactions...</p>
                  </div>
                ) : (activeTab === 'orders' ? orders : sales).length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      {activeTab === 'orders' ? <ShoppingBag className="w-8 h-8 text-slate-300" /> : <Store className="w-8 h-8 text-slate-300" />}
                    </div>
                    <p className="text-slate-500 font-medium">Aucune transaction trouvée.</p>
                  </div>
                ) : (
                  (activeTab === 'orders' ? orders : sales).map(order => (
                    <div key={order.id} className="p-6 hover:bg-slate-50/80 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-start gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 shadow-sm">
                            {activeTab === 'orders' ? <ShoppingBag className="w-6 h-6 text-slate-400" /> : <Store className="w-6 h-6 text-slate-400" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="font-mono text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md font-medium">
                                {formatOrderId(order.id)}
                              </span>
                              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-700 shadow-sm">
                                {getStatusLabel(order.status)}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-lg mb-1">{order.service?.title || 'Service supprimé ou inconnu'}</h4>
                            <div className="text-sm text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-2">
                              <span className="flex items-center gap-1.5">
                                <User className="w-4 h-4 text-slate-400" />
                                {activeTab === 'orders' ? 'Vendeur : ' : 'Acheteur : '}
                                <strong className="text-slate-700">
                                  {activeTab === 'orders' ? order.seller?.full_name : order.buyer?.full_name}
                                </strong>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-slate-400" />
                                {new Date(order.created_at).toLocaleDateString('fr-FR', {
                                  day: '2-digit', month: '2-digit', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col lg:items-end gap-4 bg-slate-50 lg:bg-transparent p-4 lg:p-0 rounded-xl border border-slate-100 lg:border-none">
                          <div className={`text-2xl font-black ${activeTab === 'sales' ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {Number(activeTab === 'sales' ? order.amount - (order.platform_fee || 0) : order.amount).toFixed(2).replace('.', ',')} €
                          </div>
                          <div className="flex items-center gap-2 w-full lg:w-auto">
                            <button
                              onClick={() => handleDownloadDuplicate(order)}
                              className="flex-1 lg:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors shadow-sm"
                            >
                              <Download className="w-4 h-4" />
                              PDF
                            </button>
                            <button
                              onClick={() => handleSendDuplicateEmail(order)}
                              disabled={sendingDuplicateId === order.id}
                              className="flex-1 lg:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                              {sendingDuplicateId === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Mail className="w-4 h-4" />
                              )}
                              Envoyer
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: MESSAGES */}
          {activeTab === 'messages' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {(() => {
                const userMessages = messages.filter(m => m.sender_id !== SUPPORT_ACCOUNT_ID && m.receiver_id !== SUPPORT_ACCOUNT_ID);
                return userMessages.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Aucun message utilisateur trouvé.</p>
                  </div>
                ) : userMessages.map(m => (
                <div key={m.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                      <div className="text-sm">
                        <span className="font-bold text-slate-900">{m.sender?.full_name || 'Inconnu'}</span>
                        <span className="text-slate-400 mx-2">&rarr;</span>
                        <span className="font-bold text-slate-900">{m.receiver?.full_name || 'Inconnu'}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(m.created_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    <div className="text-sm text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                </div>
              ));
              })()}
            </div>
          )}

          {/* TAB: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-8 max-w-5xl mx-auto">
              {profile?.is_seller && (
                <div className="flex justify-end">
                  <button 
                    onClick={() => setShowAddReview(!showAddReview)}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Rédiger un avis (en tant que Support)
                  </button>
                </div>
              )}

              {showAddReview && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6 animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-frilya-50 text-frilya-600 flex items-center justify-center">
                      <Star className="w-5 h-5" />
                    </div>
                    <h3 className="font-black text-xl text-slate-900">Publier un nouvel avis</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service concerné</label>
                      <select 
                        value={newReview.service_id} 
                        onChange={e => setNewReview({...newReview, service_id: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-4 focus:ring-frilya-600/10 transition-all font-medium"
                      >
                        <option value="">Sélectionner un service de cet utilisateur...</option>
                        {userServices.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                        <span>Note attribuée</span>
                        <span className="text-frilya-600 font-black">{newReview.rating} / 5</span>
                      </label>
                      <input 
                        type="range" min="1" max="5" 
                        value={newReview.rating} 
                        onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})}
                        className="w-full accent-frilya-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Commentaire</label>
                      <textarea 
                        value={newReview.comment} 
                        onChange={e => setNewReview({...newReview, comment: e.target.value})}
                        rows={4} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-4 focus:ring-frilya-600/10 transition-all resize-none" 
                        placeholder="Rédigez l'avis ici..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-4">
                    <button onClick={() => setShowAddReview(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
                    <button onClick={handleAddReview} className="px-6 py-2.5 text-sm font-bold bg-frilya-600 hover:bg-frilya-500 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Publier l'avis
                    </button>
                  </div>
                </div>
              )}

              {reviews.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
                  <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Aucun avis trouvé pour cet utilisateur.</p>
                </div>
              ) : reviews.map(r => (
                <div key={r.id} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${r.seller_id === userId ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                  {editingReview?.id === r.id ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                        <h4 className="font-bold text-lg text-slate-900">Modifier l'avis</h4>
                        <div className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">ID: {r.id.slice(0,8)}...</div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                          <span>Note</span>
                          <span className="text-frilya-600 font-black">{editingReview.rating} / 5</span>
                        </label>
                        <input 
                          type="range" min="1" max="5" 
                          value={editingReview.rating} 
                          onChange={e => setEditingReview({...editingReview, rating: Number(e.target.value)})}
                          className="w-full accent-frilya-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Commentaire</label>
                        <textarea 
                          value={editingReview.comment} 
                          onChange={e => setEditingReview({...editingReview, comment: e.target.value})}
                          rows={4} 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-frilya-600 focus:ring-4 focus:ring-frilya-600/10 transition-all resize-none" 
                        />
                      </div>
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => setEditingReview(null)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
                        <button onClick={handleUpdateReview} className="px-6 py-2.5 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-colors flex items-center gap-2">
                          <Save className="w-4 h-4" /> Enregistrer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <img src={r.buyer?.avatar_url || catAvatar} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                          <div>
                            <div className="font-bold text-slate-900 text-lg">{r.buyer?.full_name || 'Utilisateur inconnu'}</div>
                            <div className="text-xs font-medium text-slate-500 flex items-center gap-2 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(r.created_at).toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'})}
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{r.service?.title}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                          <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100/50 shadow-sm">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="font-black text-amber-700 text-sm">{r.rating}.0</span>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <button onClick={() => setEditingReview(r)} className="p-2 text-slate-400 hover:text-frilya-600 hover:bg-white rounded-lg transition-all shadow-sm" title="Modifier">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteReview(r.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm" title="Supprimer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-100 leading-relaxed">"{r.comment}"</p>
                      <div className="mt-4 flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${r.seller_id === userId ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {r.seller_id === userId ? 'Avis reçu' : 'Avis laissé'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB: LOGS */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <History className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-lg text-slate-900">Journal des connexions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Date & Heure</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Action</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Adresse IP</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Appareil & Navigateur</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Localisation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-slate-500 font-medium">Aucun journal d'activité enregistré</td></tr> : logs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">
                          {new Date(l.created_at).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold">
                            {l.connection_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500 bg-slate-50/50">{l.ip_address}</td>
                        <td className="px-6 py-4 text-xs text-slate-700 flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-slate-400" />
                          {l.device_type} • {l.browser}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {l.city || 'Inconnue'} {l.isp ? `(${l.isp})` : ''}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: EMAILS */}
          {activeTab === 'emails' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-500" />
                <h3 className="font-bold text-lg text-slate-900">Historique des e-mails</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Date & Heure</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Objet</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Destinataire</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {emailLogs.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-slate-500 font-medium">Aucun e-mail enregistré pour cet utilisateur.</td></tr> : emailLogs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-xs font-medium text-slate-600">
                          {new Date(l.created_at).toLocaleString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                          {l.subject}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{l.email_to}</td>
                        <td className="px-6 py-4">
                          {l.status === 'sent' ? (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold border border-emerald-100 flex items-center gap-1.5 w-fit">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Envoyé
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs font-bold border border-red-100 flex items-center gap-1.5 w-fit" title={l.error_message}>
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Erreur
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedEmail(l)}
                            className="p-2 text-slate-400 hover:text-frilya-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Voir l'e-mail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: TICKETS */}
          {activeTab === 'tickets' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              
              {/* Tickets de signalement / Support */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-indigo-500" />
                  Tickets
                </h3>
                {tickets.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                    <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Aucun ticket trouvé pour cet utilisateur.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map(t => (
                      <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                              <Ticket className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{t.title}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-full">#{t.ticket_number}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(t.created_at).toLocaleString('fr-FR')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              t.status === 'nouveau' ? 'bg-blue-100 text-blue-700' :
                              t.status === 'en_attente' ? 'bg-amber-100 text-amber-700' :
                              t.status === 'en_cours' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {t.status === 'nouveau' ? 'Nouveau' :
                               t.status === 'en_attente' ? 'En attente' :
                               t.status === 'en_cours' ? 'En cours' : 'Résolu'}
                            </span>
                          </div>
                        </div>
                        {t.description && (
                          <div className="mt-2 text-sm text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                            {t.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Messages Support */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-indigo-500" />
                  Messages Support
                </h3>
                {(() => {
                  const supportMessages = messages.filter(m => m.sender_id === SUPPORT_ACCOUNT_ID || m.receiver_id === SUPPORT_ACCOUNT_ID);
                  return supportMessages.length === 0 ? (
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                      <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">Aucun message de support trouvé pour cet utilisateur.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {supportMessages.map(m => (
                        <div key={m.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex gap-4">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                            {m.sender_id === SUPPORT_ACCOUNT_ID ? (
                              <LifeBuoy className="w-5 h-5 text-indigo-500" />
                            ) : (
                              <MessageSquare className="w-5 h-5 text-indigo-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-3">
                              <div className="text-sm">
                                <span className="font-bold text-slate-900">{m.sender?.full_name || (m.sender_id === SUPPORT_ACCOUNT_ID ? 'Support Frilya' : 'Inconnu')}</span>
                                <span className="text-slate-400 mx-2">&rarr;</span>
                                <span className="font-bold text-slate-900">{m.receiver?.full_name || (m.receiver_id === SUPPORT_ACCOUNT_ID ? 'Support Frilya' : 'Inconnu')}</span>
                              </div>
                              <div className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(m.created_at).toLocaleString('fr-FR')}
                              </div>
                            </div>
                            <div className={`text-sm p-4 rounded-2xl border leading-relaxed whitespace-pre-wrap ${m.sender_id === SUPPORT_ACCOUNT_ID ? 'bg-indigo-50/50 border-indigo-100 text-indigo-900' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                              {m.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB: DISPUTES */}
          {activeTab === 'disputes' && (
            <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center shadow-sm">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Module en développement</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                L'affichage détaillé des litiges sera disponible prochainement dans cette vue centralisée.
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Email Preview Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900">{selectedEmail.subject}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>À : {selectedEmail.email_to}</span>
                  <span>•</span>
                  <span>{new Date(selectedEmail.created_at).toLocaleString('fr-FR')}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedEmail(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-100">
              <div 
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"
                dangerouslySetInnerHTML={{ __html: selectedEmail.content }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
