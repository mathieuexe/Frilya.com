import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Package, Star, MessageSquare, Loader2, Truck, CheckCircle2, Clock, Wallet,
  CreditCard, FileText, ShieldCheck, AlertCircle, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { downloadInvoice } from '../../lib/invoice';

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingOrder, setReviewingOrder] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isBetaActive, setIsBetaActive] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    // Check Beta status
    const { data: settingsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'beta_mode_active')
      .single();
    if (settingsData?.value === 'true' || settingsData?.value === true) {
      setIsBetaActive(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUser(session.user);

      // On récupère les achats ET les ventes : la même page sert les deux espaces
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          services(id, title, slug, cover_image_url),
          profiles!seller_id(id, full_name, avatar_url),
          buyer:profiles!buyer_id(id, full_name, avatar_url),
          reviews(id, rating, comment)
        `)
        .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Erreur récupération commandes:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (order: any) => {
    if (!rating || !comment.trim()) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert([{
          order_id: order.id,
          service_id: order.service_id,
          seller_id: order.seller_id,
          buyer_id: currentUser.id,
          rating,
          comment
        }]);
      
      if (error) throw error;
      
      setReviewingOrder(null);
      setRating(5);
      setComment('');
      fetchOrders(); // Rafraîchir pour afficher l'avis
    } catch (err) {
      console.error('Erreur envoi avis:', err);
      alert("Impossible d'envoyer l'avis.");
    } finally {
      setSubmittingReview(false);
    }
  };

  /** Le vendeur déclare la livraison ; les fonds restent séquestrés */
  const markAsDelivered = async (order: any) => {
    setActionLoading(order.id);
    setActionError(null);
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'delivered', updated_at: new Date().toISOString() })
        .eq('id', order.id)
        .select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Mise à jour refusée : exécutez la migration checkout_and_wallet.sql.");
      }
      fetchOrders();
    } catch (err: any) {
      setActionError(err.message || 'Action impossible.');
    } finally {
      setActionLoading(null);
    }
  };

  /** L'acheteur valide : la RPC crédite le solde du vendeur (montant - commission) */
  const validateDelivery = async (order: any) => {
    if (!window.confirm('Valider la livraison ? Le vendeur sera payé, cette action est définitive.')) return;
    setActionLoading(order.id);
    setActionError(null);
    try {
      const { error } = await supabase.rpc('complete_order', { p_order_id: order.id });
      if (error) throw error;
      fetchOrders();
    } catch (err: any) {
      setActionError(err.message || 'Validation impossible.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">En attente</span>;
      case 'in_progress': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">En cours</span>;
      case 'delivered': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">Livrée</span>;
      case 'completed': return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Terminée</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Annulée</span>;
      case 'disputed': return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">En litige</span>;
      default: return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-frilya-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mes commandes</h1>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{actionError}</p>
        </div>
      )}
      
      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center">
          <Package className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Aucune commande</h2>
          <p className="text-slate-500 max-w-md">
            Vous n'avez pas encore passé de commande. Explorez nos services pour trouver le freelance idéal.
          </p>
          <Link to="/recherche" className="mt-6 px-6 py-3 bg-frilya-900 text-white font-bold rounded-xl hover:bg-frilya-800 transition-colors">
            Découvrir les services
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Image du service */}
                <div className="w-full md:w-48 h-32 bg-slate-100 rounded-2xl overflow-hidden shrink-0">
                  {order.services?.cover_image_url ? (
                    <img src={order.services.cover_image_url} alt={order.services.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400"><Package /></div>
                  )}
                </div>
                
                {/* Infos commande */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono text-slate-500 mb-1">
                            Réf: #{order.id.split('-')[0].toUpperCase()}
                          </span>
                          <h3 className="font-bold text-lg text-slate-900">
                            {order.services?.title || 'Service inconnu'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          order.seller_id === currentUser?.id ? 'bg-frilya-50 text-frilya-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {order.seller_id === currentUser?.id ? 'Vente' : 'Achat'}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">
                      {order.seller_id === currentUser?.id ? (
                        <>Commandé par <span className="font-bold text-slate-700">{order.buyer?.full_name || 'Acheteur'}</span></>
                      ) : (
                        <>Vendu par <span className="font-bold text-slate-700">{order.profiles?.full_name}</span></>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Commande du {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      {order.package_snapshot?.name && (
                        <span className="font-medium text-slate-600">{order.package_snapshot.name}</span>
                      )}
                      {order.delivery_due_at && ['in_progress', 'pending'].includes(order.status) && (
                        <span className="inline-flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          Livraison attendue le {new Date(order.delivery_due_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {order.payment_method && (
                        <span className="inline-flex items-center gap-1">
                          {order.payment_method === 'balance'
                            ? <><Wallet className="w-3.5 h-3.5" /> Payée par solde</>
                            : <><CreditCard className="w-3.5 h-3.5" /> Payée par carte</>}
                        </span>
                      )}
                    </div>

                    {/* Réponses de l'acheteur aux exigences : indispensables au vendeur */}
                    {Array.isArray(order.requirements_answers) && order.requirements_answers.length > 0 && (
                      <details className="mt-3 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                        <summary className="text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" /> Informations fournies par l'acheteur
                        </summary>
                        <div className="mt-3 space-y-2">
                          {order.requirements_answers.map((qa: any, i: number) => (
                            <div key={i}>
                              <p className="text-xs font-bold text-slate-700">{qa.question}</p>
                              <p className="text-xs text-slate-600 whitespace-pre-wrap">{qa.answer || '—'}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                  
                  <div className="mt-4 flex flex-wrap items-center gap-4 justify-between">
                    <span className="font-bold text-xl text-frilya-600">{order.amount} €</span>
                    
                    <div className="flex gap-2">
                      <Link
                        to={`/tableau-de-bord/messages?contact=${order.seller_id === currentUser?.id ? order.buyer_id : order.seller_id}`}
                        className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold text-sm transition-colors flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" /> Contacter
                      </Link>

                      {order.buyer_id === currentUser?.id && order.status !== 'pending' && order.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            downloadInvoice({
                              order,
                              serviceTitle: order.services?.title || 'Service',
                              sellerName: order.profiles?.full_name || 'Vendeur',
                              buyerName: order.buyer?.full_name || 'Acheteur',
                              buyerEmail: order.buyer?.email
                            });
                          }}
                          className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold text-sm transition-colors flex items-center gap-2"
                          title="Télécharger la facture"
                        >
                          <Download className="w-4 h-4" /> Facture
                        </button>
                      )}

                      {/* Vendeur : déclarer la livraison */}
                      {order.seller_id === currentUser?.id && order.status === 'in_progress' && (
                        <button
                          onClick={() => markAsDelivered(order)}
                          disabled={actionLoading === order.id}
                          className="px-4 py-2 bg-frilya-900 hover:bg-frilya-800 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                          Marquer comme livrée
                        </button>
                      )}

                      {/* Acheteur : libérer les fonds */}
                      {order.buyer_id === currentUser?.id && ['in_progress', 'delivered'].includes(order.status) && (
                        <button
                          onClick={() => validateDelivery(order)}
                          disabled={actionLoading === order.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Valider la livraison
                        </button>
                      )}

                      {order.status === 'in_progress' && order.buyer_id === currentUser?.id && (
                        <span className="px-3 py-2 text-xs text-slate-500 inline-flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Fonds séquestrés
                        </span>
                      )}
                      
                      {/* Avis conditionnel */}
                      {order.buyer_id === currentUser?.id && (order.status === 'delivered' || order.status === 'completed') && (
                        order.reviews && order.reviews.length > 0 ? (
                          <div className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500 fill-current" /> Avis publié ({order.reviews[0].rating}/5)
                          </div>
                        ) : isBetaActive ? (
                          <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl font-bold text-sm cursor-not-allowed flex items-center gap-2">
                            <Star className="w-4 h-4" /> Avis désactivés en Bêta
                          </button>
                        ) : (
                          <button 
                            onClick={() => setReviewingOrder(reviewingOrder === order.id ? null : order.id)}
                            className="px-4 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                          >
                            <Star className="w-4 h-4" /> Évaluer le vendeur
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulaire d'avis */}
              {reviewingOrder === order.id && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-4">Laissez votre avis sur cette commande</h4>
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star} 
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-xl transition-colors ${rating >= star ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:bg-slate-50'}`}
                      >
                        <Star className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Comment s'est passée votre collaboration ? Le service correspond-il à vos attentes ?"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none mb-4"
                    rows={3}
                  />
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => setReviewingOrder(null)}
                      className="px-6 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={() => submitReview(order)}
                      disabled={submittingReview || !comment.trim()}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                      {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier mon avis'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
